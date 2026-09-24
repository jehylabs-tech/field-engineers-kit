/**
 * Shaft Power, Torque & Parallel Key Sizing — DIN 6885-1 / ASME B17.1 screening.
 *
 *   T = P·9549/n            [N·m]     ·  T = HP·63025/n  [in·lbf]
 *   d_min = (16·T·SF/(π·τ_allow))^(1/3)
 *   τ_key = 2T/(d·b·L)  ≤  τ_allow = 0.577·Fy_key/SF
 *   σ_b   = 2T/(d·h₁·L) ≤  σ_allow = Fy_key/SF     (h₁ ≈ 0.5·h)
 *
 * Pure torsion + parallel key shear/bearing only — bending / Kt out of scope.
 */

import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  getShaftSteel,
  lookupAsmeB171SquareKey,
  lookupDin6885Key,
  normalizeShaftSteelId,
  type ShaftSteelId,
} from "@/lib/calculators/data/din6885ParallelKeys";

export type ShaftTorqueKeySizingInputs = {
  unitSystem: UnitSystem;
  /** Shaft / motor power — kW (metric) or HP (imperial). */
  shaftPower: number;
  /** Rotational speed — rpm. */
  rotationalSpeed: number;
  /** Shaft diameter — mm or in. */
  shaftDiameter: number;
  shaftMaterial: ShaftSteelId;
  keyMaterial: ShaftSteelId;
  /** Key width b — mm or in (manual override of DIN/ASME lookup). */
  keyWidth: number;
  /** Key height h — mm or in. */
  keyHeight: number;
  /** Key engagement length L — mm or in. */
  keyLength: number;
  /** Service / safety factor. */
  safetyFactor: number;
  /**
   * When true, b×h follow DIN 6885 (metric) or ASME B17.1 square (imperial)
   * from shaft diameter. Manual b/h still stored for URL round-trip.
   */
  autoKeySize: boolean;
};

export const DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS: ShaftTorqueKeySizingInputs =
  {
    unitSystem: "metric",
    shaftPower: 45,
    rotationalSpeed: 1750,
    shaftDiameter: 50,
    shaftMaterial: "S45C",
    keyMaterial: "S45C",
    keyWidth: 14,
    keyHeight: 9,
    keyLength: 50,
    safetyFactor: 2,
    autoKeySize: true,
  };

export const DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS_IMPERIAL: ShaftTorqueKeySizingInputs =
  {
    unitSystem: "imperial",
    shaftPower: 60,
    rotationalSpeed: 1750,
    shaftDiameter: 2,
    shaftMaterial: "AISI1045",
    keyMaterial: "AISI1045",
    keyWidth: 0.5,
    keyHeight: 0.5,
    keyLength: 2.5,
    safetyFactor: 2,
    autoKeySize: true,
  };

const MM_PER_IN = 25.4;
const KW_PER_HP = 0.745699872;
/** von Mises shear factor ≈ 1/√3. */
export const SHEAR_YIELD_FACTOR = 0.577;

const POWER_RANGE = { min: 0.1, max: 5000 };
const RPM_RANGE = { min: 10, max: 20000 };
const D_MM_RANGE = { min: 8, max: 500 };
const D_IN_RANGE = { min: 0.315, max: 20 };
const KEY_MM_RANGE = { min: 2, max: 100 };
const KEY_IN_RANGE = { min: 0.08, max: 4 };
const L_MM_RANGE = { min: 10, max: 500 };
const L_IN_RANGE = { min: 0.4, max: 20 };
const SF_RANGE = { min: 1, max: 5 };

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, finite(value)));
}

export function powerToKw(power: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial"
    ? finite(power) * KW_PER_HP
    : finite(power);
}

export function torqueNmFromPowerKw(powerKw: number, rpm: number): number {
  const n = Math.max(finite(rpm), 1e-9);
  return (finite(powerKw) * 9549) / n;
}

export function torqueInLbfFromHp(hp: number, rpm: number): number {
  const n = Math.max(finite(rpm), 1e-9);
  return (finite(hp) * 63025) / n;
}

/** Convert display length to mm. */
export function lengthToMm(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? finite(value) * MM_PER_IN : finite(value);
}

export function mmToDisplay(mm: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? mm / MM_PER_IN : mm;
}

export function resolveKeySizeMm(
  inputs: Pick<
    ShaftTorqueKeySizingInputs,
    "unitSystem" | "shaftDiameter" | "keyWidth" | "keyHeight" | "autoKeySize"
  >,
): { bMm: number; hMm: number; t1Mm: number; t2Mm: number; source: string } {
  const dMm = lengthToMm(inputs.shaftDiameter, inputs.unitSystem);
  if (inputs.autoKeySize) {
    if (inputs.unitSystem === "imperial") {
      const sq = lookupAsmeB171SquareKey(finite(inputs.shaftDiameter));
      const bMm = sq.bIn * MM_PER_IN;
      const hMm = sq.hIn * MM_PER_IN;
      return {
        bMm,
        hMm,
        t1Mm: 0.5 * hMm,
        t2Mm: 0.5 * hMm,
        source: "ASME B17.1 square key (screening)",
      };
    }
    const din = lookupDin6885Key(dMm);
    return {
      bMm: din.bMm,
      hMm: din.hMm,
      t1Mm: din.t1Mm,
      t2Mm: din.t2Mm,
      source: "DIN 6885-1",
    };
  }
  const bMm = lengthToMm(inputs.keyWidth, inputs.unitSystem);
  const hMm = lengthToMm(inputs.keyHeight, inputs.unitSystem);
  const din = lookupDin6885Key(dMm);
  return {
    bMm,
    hMm,
    t1Mm: din.t1Mm,
    t2Mm: din.t2Mm,
    source: "Manual override",
  };
}

export type ShaftTorqueKeySizingDetail = {
  torqueNm: number;
  torqueInLbf: number;
  dMm: number;
  bMm: number;
  hMm: number;
  h1Mm: number;
  t1Mm: number;
  t2Mm: number;
  LMm: number;
  fyShaftMPa: number;
  fyKeyMPa: number;
  sf: number;
  tauShaftMPa: number;
  tauShaftAllowMPa: number;
  tauKeyMPa: number;
  tauKeyAllowMPa: number;
  sigmaBearingMPa: number;
  sigmaBearingAllowMPa: number;
  LShearMinMm: number;
  LBearingMinMm: number;
  LMinMm: number;
  shearUnity: number;
  bearingUnity: number;
  governUnity: number;
  dMinMm: number;
  keySource: string;
  pass: boolean;
};

/**
 * Core physics in SI (N·m, mm, MPa). Display conversion happens in calculate*.
 */
export function computeShaftTorqueKeySizing(
  inputs: ShaftTorqueKeySizingInputs,
): ShaftTorqueKeySizingDetail {
  const unitSystem = inputs.unitSystem === "imperial" ? "imperial" : "metric";
  const power = clamp(inputs.shaftPower, POWER_RANGE.min, POWER_RANGE.max);
  const rpm = clamp(inputs.rotationalSpeed, RPM_RANGE.min, RPM_RANGE.max);
  const sf = clamp(inputs.safetyFactor, SF_RANGE.min, SF_RANGE.max);

  const dDisplay = clamp(
    inputs.shaftDiameter,
    unitSystem === "imperial" ? D_IN_RANGE.min : D_MM_RANGE.min,
    unitSystem === "imperial" ? D_IN_RANGE.max : D_MM_RANGE.max,
  );
  const LDisplay = clamp(
    inputs.keyLength,
    unitSystem === "imperial" ? L_IN_RANGE.min : L_MM_RANGE.min,
    unitSystem === "imperial" ? L_IN_RANGE.max : L_MM_RANGE.max,
  );

  const shaftMat = getShaftSteel(normalizeShaftSteelId(inputs.shaftMaterial));
  const keyMat = getShaftSteel(normalizeShaftSteelId(inputs.keyMaterial));

  const key = resolveKeySizeMm({
    unitSystem,
    shaftDiameter: dDisplay,
    keyWidth: clamp(
      inputs.keyWidth,
      unitSystem === "imperial" ? KEY_IN_RANGE.min : KEY_MM_RANGE.min,
      unitSystem === "imperial" ? KEY_IN_RANGE.max : KEY_MM_RANGE.max,
    ),
    keyHeight: clamp(
      inputs.keyHeight,
      unitSystem === "imperial" ? KEY_IN_RANGE.min : KEY_MM_RANGE.min,
      unitSystem === "imperial" ? KEY_IN_RANGE.max : KEY_MM_RANGE.max,
    ),
    autoKeySize: inputs.autoKeySize,
  });

  const dMm = lengthToMm(dDisplay, unitSystem);
  const LMm = lengthToMm(LDisplay, unitSystem);
  const { bMm, hMm, t1Mm, t2Mm } = key;
  /** Spec bearing depth: h₁ ≈ 0.5·h (not DIN t1 — used for schematic only). */
  const h1Mm = 0.5 * hMm;

  const powerKw = powerToKw(power, unitSystem);
  const torqueNm = torqueNmFromPowerKw(powerKw, rpm);
  const torqueInLbf =
    unitSystem === "imperial"
      ? torqueInLbfFromHp(power, rpm)
      : torqueNm * (8.850745791);

  const fyShaftMPa = shaftMat.fyMPa;
  const fyKeyMPa = keyMat.fyMPa;
  const tauShaftAllowMPa = (SHEAR_YIELD_FACTOR * fyShaftMPa) / sf;
  const tauKeyAllowMPa = (SHEAR_YIELD_FACTOR * fyKeyMPa) / sf;
  const sigmaBearingAllowMPa = fyKeyMPa / sf;

  const dSafe = Math.max(dMm, 1e-9);
  const bSafe = Math.max(bMm, 1e-9);
  const h1Safe = Math.max(h1Mm, 1e-9);
  const LSafe = Math.max(LMm, 1e-9);

  /** τ = 16·T/(π·d³) with T in N·mm → MPa when d in mm. */
  const tauShaftMPa =
    (16 * torqueNm * 1000) / (Math.PI * dSafe * dSafe * dSafe);
  const tauKeyMPa = (2 * torqueNm * 1000) / (dSafe * bSafe * LSafe);
  const sigmaBearingMPa = (2 * torqueNm * 1000) / (dSafe * h1Safe * LSafe);

  const LShearMinMm =
    (2 * torqueNm * sf * 1000) / (dSafe * bSafe * tauKeyAllowMPa);
  const LBearingMinMm =
    (2 * torqueNm * sf * 1000) /
    (dSafe * h1Safe * sigmaBearingAllowMPa);
  const LMinMm = Math.max(LShearMinMm, LBearingMinMm);

  const shearUnity = tauKeyMPa / Math.max(tauKeyAllowMPa, 1e-12);
  const bearingUnity =
    sigmaBearingMPa / Math.max(sigmaBearingAllowMPa, 1e-12);
  const governUnity = Math.max(shearUnity, bearingUnity);

  const dMinMm = Math.cbrt(
    (16 * torqueNm * sf * 1000) / (Math.PI * tauShaftAllowMPa),
  );

  const pass = governUnity <= 1 && LMm + 1e-9 >= LMinMm;

  return {
    torqueNm,
    torqueInLbf,
    dMm,
    bMm,
    hMm,
    h1Mm,
    t1Mm,
    t2Mm,
    LMm,
    fyShaftMPa,
    fyKeyMPa,
    sf,
    tauShaftMPa,
    tauShaftAllowMPa,
    tauKeyMPa,
    tauKeyAllowMPa,
    sigmaBearingMPa,
    sigmaBearingAllowMPa,
    LShearMinMm,
    LBearingMinMm,
    LMinMm,
    shearUnity,
    bearingUnity,
    governUnity,
    dMinMm,
    keySource: key.source,
    pass,
  };
}

function fmt(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 100) return value.toFixed(Math.min(digits, 1));
  if (abs >= 10) return value.toFixed(digits);
  return value.toFixed(Math.max(digits, 1));
}

function pct(unity: number): string {
  return `${fmt(unity * 100, 0)}%`;
}

export function calculateShaftTorqueKeySizing(
  inputs: ShaftTorqueKeySizingInputs,
): CalculatorOutput {
  const unitSystem = inputs.unitSystem === "imperial" ? "imperial" : "metric";
  const detail = computeShaftTorqueKeySizing(inputs);
  const imperial = unitSystem === "imperial";

  const Tdisp = imperial ? detail.torqueInLbf : detail.torqueNm;
  const Tunit = imperial ? "in·lbf" : "N·m";
  const LminDisp = mmToDisplay(detail.LMinMm, unitSystem);
  const LshearDisp = mmToDisplay(detail.LShearMinMm, unitSystem);
  const LbearDisp = mmToDisplay(detail.LBearingMinMm, unitSystem);
  const dDisp = mmToDisplay(detail.dMm, unitSystem);
  const bDisp = mmToDisplay(detail.bMm, unitSystem);
  const hDisp = mmToDisplay(detail.hMm, unitSystem);
  const lenUnit = imperial ? "in" : "mm";
  const stressUnit = imperial ? "psi" : "MPa";
  const stressFactor = imperial ? 145.0377 : 1;

  const statusLevel: StatusLevel = detail.pass ? "pass" : "fail";
  const statusLabel = detail.pass
    ? "Pass — key shear & bearing OK"
    : "Fail — increase L or enlarge key";

  const powerLabel = imperial
    ? `${fmt(inputs.shaftPower, 1)} HP`
    : `${fmt(inputs.shaftPower, 1)} kW`;

  const shaftMat = getShaftSteel(normalizeShaftSteelId(inputs.shaftMaterial));
  const keyMat = getShaftSteel(normalizeShaftSteelId(inputs.keyMaterial));

  const LBandLow = 0.9 * detail.dMm;
  const LBandHigh = 1.5 * detail.dMm;
  const LOutOfBand =
    detail.LMm + 1e-9 < LBandLow || detail.LMm - 1e-9 > LBandHigh;

  const callouts: CalculatorOutput["callouts"] = [
    {
      tone: "warn",
      title: "Pure torsion screening",
      body: "Evaluates shaft and parallel-key shear/bearing under pure torsion only. Significant overhang bending needs combined (von Mises) stress and keyseat Kt ≈ 2.0–3.0 fatigue review.",
    },
  ];
  if (LOutOfBand) {
    callouts.push({
      tone: "info",
      title: "Key length vs DIN 6885 band",
      body: `Engagement L is outside the typical 0.9·d–1.5·d band (${fmt(mmToDisplay(LBandLow, unitSystem), imperial ? 2 : 1)}–${fmt(mmToDisplay(LBandHigh, unitSystem), imperial ? 2 : 1)} ${lenUnit}). Confirm hub length / OEM chart.`,
    });
  }

  return {
    heroLabel: "Transmitted Torque",
    heroValue: `${fmt(Tdisp, 1)} ${Tunit}`,
    heroStatus: statusLabel,
    heroStatusLevel: statusLevel,
    heroBadges: [
      {
        label: "L_min",
        value: `${fmt(LminDisp, imperial ? 2 : 1)} ${lenUnit}`,
      },
      {
        label: "Key",
        value: `${fmt(bDisp, imperial ? 3 : 0)}×${fmt(hDisp, imperial ? 3 : 0)} ${lenUnit}`,
      },
    ],
    summary: [
      {
        label: "Min key length L_min",
        value: `${fmt(LminDisp, imperial ? 2 : 1)} ${lenUnit}`,
      },
      {
        label: "Key shear unity",
        value: pct(detail.shearUnity),
      },
      {
        label: "Key bearing unity",
        value: pct(detail.bearingUnity),
      },
    ],
    summaryStatus: {
      label: statusLabel,
      level: statusLevel,
    },
    rows: [
      {
        section: "Shaft",
        label: "Duty · τ_shaft",
        value: `${powerLabel} @ ${fmt(inputs.rotationalSpeed, 0)} rpm · ${fmt(detail.tauShaftMPa * stressFactor, imperial ? 0 : 1)} / ${fmt(detail.tauShaftAllowMPa * stressFactor, imperial ? 0 : 1)} ${stressUnit}`,
        warn: detail.tauShaftMPa > detail.tauShaftAllowMPa,
      },
      {
        section: "Key",
        label: "Shear τ_key",
        value: `${fmt(detail.tauKeyMPa * stressFactor, imperial ? 0 : 1)} / ${fmt(detail.tauKeyAllowMPa * stressFactor, imperial ? 0 : 1)} ${stressUnit} (${pct(detail.shearUnity)})`,
        warn: detail.shearUnity > 1,
        emphasis: true,
      },
      {
        section: "Key",
        label: "Bearing σ_b",
        value: `${fmt(detail.sigmaBearingMPa * stressFactor, imperial ? 0 : 1)} / ${fmt(detail.sigmaBearingAllowMPa * stressFactor, imperial ? 0 : 1)} ${stressUnit} (${pct(detail.bearingUnity)})`,
        warn: detail.bearingUnity > 1,
        emphasis: true,
      },
      {
        section: "Key length",
        label: "L_min (shear / bearing)",
        value: `${fmt(LminDisp, imperial ? 2 : 1)} ${lenUnit} (${fmt(LshearDisp, imperial ? 2 : 1)} / ${fmt(LbearDisp, imperial ? 2 : 1)}) · L = ${fmt(mmToDisplay(detail.LMm, unitSystem), imperial ? 2 : 1)} ${lenUnit}`,
        emphasis: true,
        warn: !detail.pass,
      },
    ],
    callouts,
    exportRows: [
      { label: "Unit system", value: unitSystem },
      { label: "Shaft power", value: powerLabel },
      {
        label: "Rotational speed",
        value: `${fmt(inputs.rotationalSpeed, 0)} rpm`,
      },
      {
        label: "Shaft diameter",
        value: `${fmt(dDisp, imperial ? 3 : 1)} ${lenUnit}`,
      },
      { label: "Shaft material", value: shaftMat.label },
      { label: "Key material", value: keyMat.label },
      {
        label: "Key size b × h",
        value: `${fmt(bDisp, imperial ? 3 : 0)} × ${fmt(hDisp, imperial ? 3 : 0)} ${lenUnit}`,
      },
      {
        label: "Key length L",
        value: `${fmt(mmToDisplay(detail.LMm, unitSystem), imperial ? 2 : 1)} ${lenUnit}`,
      },
      { label: "Safety factor", value: fmt(detail.sf, 2) },
      { label: `Torque T (${Tunit})`, value: fmt(Tdisp, 2) },
      {
        label: `τ_shaft (${stressUnit})`,
        value: fmt(detail.tauShaftMPa * stressFactor, 2),
      },
      {
        label: `τ_key (${stressUnit})`,
        value: fmt(detail.tauKeyMPa * stressFactor, 2),
      },
      {
        label: `σ_b,key (${stressUnit})`,
        value: fmt(detail.sigmaBearingMPa * stressFactor, 2),
      },
      {
        label: `L_min (${lenUnit})`,
        value: fmt(LminDisp, 3),
      },
      {
        label: `Min shaft dia pure torsion (${lenUnit})`,
        value: fmt(mmToDisplay(detail.dMinMm, unitSystem), 3),
      },
      { label: "Key shear unity", value: pct(detail.shearUnity) },
      { label: "Key bearing unity", value: pct(detail.bearingUnity) },
      { label: "Status", value: statusLabel },
      { label: "Key size source", value: detail.keySource },
    ],
  };
}

export const SHAFT_MATERIAL_OPTIONS: {
  value: ShaftSteelId;
  label: string;
}[] = [
  { value: "S45C", label: "S45C / AISI 1045" },
  { value: "SCM440", label: "SCM440 / AISI 4140" },
  { value: "SUS304", label: "SUS304 / SS304" },
  { value: "AISI1045", label: "AISI 1045" },
  { value: "AISI4140", label: "AISI 4140" },
];

export const KEY_MATERIAL_OPTIONS: {
  value: ShaftSteelId;
  label: string;
}[] = [
  { value: "S45C", label: "S45C / AISI 1045" },
  { value: "SUS304", label: "SUS304 / SS304" },
  { value: "AISI1045", label: "AISI 1045" },
];
