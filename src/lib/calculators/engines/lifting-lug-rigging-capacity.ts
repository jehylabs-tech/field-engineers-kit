/**
 * Lifting Lug & Rigging Capacity — ASME BTH-1 / AISC screening.
 *
 *   P_tension = W_design / (N · cos θ)
 *   P_shear   = P_tension · sin θ
 *   σ_b       = P_tension / (D_pin · t)     ≤ 1.25 Fy / Nd
 *   τ_tear    = P_tension / (2 · a · t)    ≤ 0.40 Fy / Nd
 *   a         = R_outer − 0.5 · D_hole
 *   Weld (both-face fillet at lug base):
 *     A_w = 2 · 0.707 · w · L
 *     S_w = (0.707 · w) · L² / 3
 *     τ_w = √[(P_t/A_w)² + (P_s·h/S_w)²] ≤ 0.30 F_EXX
 *
 * Nd = 2.0 (ASME BTH-1 Design Category B). Screening only — not a stamped
 * BTH-1 / B30.20 design package. Sling angle θ measured from vertical; θ > 60°
 * is out of scope (use a spreader).
 */

import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  getLugSteel,
  isLugSteelId,
  normalizeLugSteelId,
  type LugSteelId,
} from "@/lib/calculators/data/structuralSteelProperties";

export type LugCount = 1 | 2 | 4;
export type ElectrodeId = "E70XX" | "E80XX";

export type LiftingLugRiggingCapacityInputs = {
  unitSystem: UnitSystem;
  /** Total lift weight — kN (metric) or kips (imperial). */
  liftWeight: number;
  /** Dynamic impact factor (≥ 1). */
  impactFactor: number;
  lugCount: LugCount;
  /** Sling angle from vertical — degrees (0–60). */
  slingAngleDeg: number;
  /** Lug plate thickness — mm or in. */
  plateThickness: number;
  /** Outer radius / half-width to lug tip — mm or in. */
  outerRadius: number;
  /** Pin hole diameter — mm or in. */
  holeDiameter: number;
  /** Shackle pin diameter — mm or in. */
  pinDiameter: number;
  /** Hole center height above base weld — mm or in. */
  lugHeight: number;
  materialId: LugSteelId;
  /** Fillet weld leg size — mm or in. */
  weldSize: number;
  /** Fillet weld length along base (one face) — mm or in. */
  weldLength: number;
  electrodeId: ElectrodeId;
};

export const ND_CATEGORY_B = 2.0;

export const LUG_COUNT_OPTIONS: { value: LugCount; label: string }[] = [
  { value: 1, label: "1 lug" },
  { value: 2, label: "2 lugs" },
  { value: 4, label: "4 lugs" },
];

export const LUG_MATERIAL_OPTIONS: { value: LugSteelId; label: string }[] = [
  { value: "S275", label: "S275 (EN 10025)" },
  { value: "S355", label: "S355 (EN 10025)" },
  { value: "A36", label: "ASTM A36" },
  { value: "A572-50", label: "ASTM A572 Gr.50" },
  { value: "SA-516-70", label: "SA-516 Gr.70" },
];

export const ELECTRODE_OPTIONS: {
  value: ElectrodeId;
  label: string;
  fexxMPa: number;
  fexxKsi: number;
}[] = [
  {
    value: "E70XX",
    label: "E70XX · 485 MPa (70 ksi)",
    fexxMPa: 485,
    fexxKsi: 70,
  },
  {
    value: "E80XX",
    label: "E80XX · 550 MPa (80 ksi)",
    fexxMPa: 550,
    fexxKsi: 80,
  },
];

export function electrodeOptionLabel(
  id: ElectrodeId,
  unitSystem: UnitSystem,
): string {
  const row =
    ELECTRODE_OPTIONS.find((e) => e.value === id) ?? ELECTRODE_OPTIONS[0]!;
  return unitSystem === "imperial"
    ? `${row.value} · ${row.fexxKsi} ksi (${row.fexxMPa} MPa)`
    : `${row.value} · ${row.fexxMPa} MPa (${row.fexxKsi} ksi)`;
}

export const DEFAULT_LIFTING_LUG_INPUTS: LiftingLugRiggingCapacityInputs = {
  unitSystem: "metric",
  liftWeight: 150,
  impactFactor: 1.15,
  lugCount: 2,
  slingAngleDeg: 30,
  plateThickness: 25,
  outerRadius: 80,
  holeDiameter: 42,
  pinDiameter: 38,
  lugHeight: 150,
  materialId: "S355",
  weldSize: 12,
  weldLength: 160,
  electrodeId: "E70XX",
};

export const DEFAULT_LIFTING_LUG_INPUTS_IMPERIAL: LiftingLugRiggingCapacityInputs =
  {
    unitSystem: "imperial",
    liftWeight: 30,
    impactFactor: 1.15,
    lugCount: 2,
    slingAngleDeg: 0,
    plateThickness: 0.75,
    outerRadius: 3,
    holeDiameter: 1.375,
    pinDiameter: 1.25,
    lugHeight: 6,
    materialId: "A36",
    weldSize: 0.375,
    weldLength: 6,
    electrodeId: "E70XX",
  };

const MM_PER_IN = 25.4;
const KN_PER_KIP = 4.448221615;
const DEG = Math.PI / 180;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function electrodeFexxMPa(id: ElectrodeId): number {
  return ELECTRODE_OPTIONS.find((e) => e.value === id)?.fexxMPa ?? 485;
}

/** Length display → mm. */
export function lengthToMm(value: number, unitSystem: UnitSystem): number {
  const v = Math.max(0, finite(value));
  return unitSystem === "imperial" ? v * MM_PER_IN : v;
}

/** Force display → kN (lift weight field). */
export function forceToKn(value: number, unitSystem: UnitSystem): number {
  const v = Math.max(0, finite(value));
  return unitSystem === "imperial" ? v * KN_PER_KIP : v;
}

export function mmToLength(mm: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? mm / MM_PER_IN : mm;
}

export function knToForce(kn: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? kn / KN_PER_KIP : kn;
}

export function mpaToStress(mpa: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? mpa / 6.894757293 : mpa;
}

/**
 * Grade 80 bolt-type shackle WLL screening vs pin diameter (mm).
 * Interpolated catalog-style bands — confirm OEM chart before purchase.
 */
const GRADE80_PIN_WLL_T: Array<{ pinMm: number; wllTe: number }> = [
  { pinMm: 16, wllTe: 2 },
  { pinMm: 19, wllTe: 3.25 },
  { pinMm: 22, wllTe: 4.75 },
  { pinMm: 25, wllTe: 6.5 },
  { pinMm: 28, wllTe: 8.5 },
  { pinMm: 32, wllTe: 12 },
  { pinMm: 35, wllTe: 13.5 },
  { pinMm: 38, wllTe: 17 },
  { pinMm: 45, wllTe: 25 },
  { pinMm: 50, wllTe: 35 },
  { pinMm: 57, wllTe: 40 },
  { pinMm: 65, wllTe: 55 },
  { pinMm: 75, wllTe: 85 },
];

export function grade80ShackleWllKn(pinMm: number): number {
  const p = Math.max(8, finite(pinMm));
  const first = GRADE80_PIN_WLL_T[0]!;
  const last = GRADE80_PIN_WLL_T[GRADE80_PIN_WLL_T.length - 1]!;
  if (p <= first.pinMm) return first.wllTe * 9.80665;
  if (p >= last.pinMm) return last.wllTe * 9.80665;
  for (let i = 0; i < GRADE80_PIN_WLL_T.length - 1; i++) {
    const a = GRADE80_PIN_WLL_T[i]!;
    const b = GRADE80_PIN_WLL_T[i + 1]!;
    if (p >= a.pinMm && p <= b.pinMm) {
      const t = (p - a.pinMm) / (b.pinMm - a.pinMm);
      const te = a.wllTe + t * (b.wllTe - a.wllTe);
      return te * 9.80665;
    }
  }
  return last.wllTe * 9.80665;
}

export type LiftingLugComputed = {
  angleDeg: number;
  angleRad: number;
  wDesignKn: number;
  pTensionKn: number;
  pShearKn: number;
  edgeDistanceMm: number;
  fyMPa: number;
  fexxMPa: number;
  fbAllowMPa: number;
  fvAllowMPa: number;
  fwAllowMPa: number;
  sigmaBMPa: number;
  tauTearMPa: number;
  weldAreaMm2: number;
  weldSectionMm3: number;
  momentKnM: number;
  tauWeldMPa: number;
  bearingRatio: number;
  tearRatio: number;
  weldRatio: number;
  governingRatio: number;
  /** Max total lift weight (same IF / geometry) at unity — kN. */
  wSafeTotalKn: number;
  /** W_safe / N_lugs — kN. */
  wSafePerLugKn: number;
  shackleWllKn: number;
  pinClearanceMm: number;
  clearanceWarn: boolean;
  pinInterference: boolean;
  angleWarn: boolean;
  pass: boolean;
  invalid: boolean;
};

export function computeLiftingLugRiggingCapacity(
  inputs: LiftingLugRiggingCapacityInputs,
): LiftingLugComputed {
  const materialId = isLugSteelId(inputs.materialId)
    ? inputs.materialId
    : normalizeLugSteelId(String(inputs.materialId));
  const steel = getLugSteel(materialId);
  const fyMPa = steel.fyMPa;
  const fexxMPa = electrodeFexxMPa(inputs.electrodeId);

  const tMm = lengthToMm(inputs.plateThickness, inputs.unitSystem);
  const rMm = lengthToMm(inputs.outerRadius, inputs.unitSystem);
  const dHoleMm = lengthToMm(inputs.holeDiameter, inputs.unitSystem);
  const dPinMm = lengthToMm(inputs.pinDiameter, inputs.unitSystem);
  const hMm = lengthToMm(inputs.lugHeight, inputs.unitSystem);
  const wMm = lengthToMm(inputs.weldSize, inputs.unitSystem);
  const lMm = lengthToMm(inputs.weldLength, inputs.unitSystem);

  const wLiftKn = forceToKn(inputs.liftWeight, inputs.unitSystem);
  const impact = clamp(finite(inputs.impactFactor, 1.15), 1, 2);
  const nLugs = ([1, 2, 4].includes(inputs.lugCount)
    ? inputs.lugCount
    : 2) as LugCount;
  const angleDeg = clamp(finite(inputs.slingAngleDeg), 0, 90);
  const angleRad = angleDeg * DEG;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  const wDesignKn = wLiftKn * impact;
  const invalid =
    wLiftKn <= 0 ||
    tMm <= 0 ||
    dPinMm <= 0 ||
    dHoleMm <= 0 ||
    rMm <= 0 ||
    hMm <= 0 ||
    wMm <= 0 ||
    lMm <= 0 ||
    nLugs < 1 ||
    cosA <= 1e-6;

  const pTensionKn = invalid ? 0 : wDesignKn / (nLugs * cosA);
  const pShearKn = pTensionKn * sinA;

  const edgeDistanceMm = rMm - 0.5 * dHoleMm;
  const edgeOk = edgeDistanceMm > 0;

  // Forces in N, lengths in mm → stress in N/mm² = MPa
  const pTN = pTensionKn * 1000;
  const pSN = pShearKn * 1000;

  const sigmaBMPa =
    !invalid && dPinMm > 0 && tMm > 0 ? pTN / (dPinMm * tMm) : 0;
  const tauTearMPa =
    !invalid && edgeOk && tMm > 0
      ? pTN / (2 * edgeDistanceMm * tMm)
      : Number.POSITIVE_INFINITY;

  const throat = 0.707 * wMm;
  // Both-face fillets along base length L (standard pad-eye practice).
  const weldAreaMm2 = 2 * throat * lMm;
  const weldSectionMm3 = (throat * lMm * lMm) / 3;
  const momentNmm = pSN * hMm;
  const tauDirect = weldAreaMm2 > 0 ? pTN / weldAreaMm2 : 0;
  const tauBend = weldSectionMm3 > 0 ? momentNmm / weldSectionMm3 : 0;
  const tauWeldMPa = Math.sqrt(tauDirect * tauDirect + tauBend * tauBend);

  const fbAllowMPa = (1.25 * fyMPa) / ND_CATEGORY_B;
  const fvAllowMPa = (0.4 * fyMPa) / ND_CATEGORY_B;
  const fwAllowMPa = 0.3 * fexxMPa;

  const bearingRatio = fbAllowMPa > 0 ? sigmaBMPa / fbAllowMPa : 99;
  const tearRatio =
    fvAllowMPa > 0 && Number.isFinite(tauTearMPa)
      ? tauTearMPa / fvAllowMPa
      : 99;
  const weldRatio = fwAllowMPa > 0 ? tauWeldMPa / fwAllowMPa : 99;
  const governingRatio = Math.max(bearingRatio, tearRatio, weldRatio);

  const wSafeTotalKn =
    !invalid && governingRatio > 1e-9 ? wLiftKn / governingRatio : 0;
  const wSafePerLugKn = nLugs > 0 ? wSafeTotalKn / nLugs : 0;

  const pinClearanceMm = dHoleMm - dPinMm;
  const clearanceLimitMm =
    inputs.unitSystem === "imperial" ? 0.2 * MM_PER_IN : 5;
  const pinInterference = pinClearanceMm < -1e-6;
  const clearanceWarn = pinClearanceMm > clearanceLimitMm;
  const angleWarn = angleDeg > 60;

  const pass =
    !invalid &&
    edgeOk &&
    !angleWarn &&
    !pinInterference &&
    bearingRatio <= 1 &&
    tearRatio <= 1 &&
    weldRatio <= 1;

  return {
    angleDeg,
    angleRad,
    wDesignKn,
    pTensionKn,
    pShearKn,
    edgeDistanceMm,
    fyMPa,
    fexxMPa,
    fbAllowMPa,
    fvAllowMPa,
    fwAllowMPa,
    sigmaBMPa,
    tauTearMPa: Number.isFinite(tauTearMPa) ? tauTearMPa : 0,
    weldAreaMm2,
    weldSectionMm3,
    momentKnM: (pShearKn * hMm) / 1e6,
    tauWeldMPa,
    bearingRatio,
    tearRatio,
    weldRatio,
    governingRatio,
    wSafeTotalKn,
    wSafePerLugKn,
    shackleWllKn: grade80ShackleWllKn(dPinMm),
    pinClearanceMm,
    clearanceWarn,
    pinInterference,
    angleWarn,
    pass,
    invalid,
  };
}

function formatForce(kn: number, unitSystem: UnitSystem, digits = 1): string {
  if (!Number.isFinite(kn)) return unitSystem === "imperial" ? "— kip" : "— kN";
  const v = knToForce(kn, unitSystem);
  return unitSystem === "imperial"
    ? `${v.toFixed(digits)} kip`
    : `${v.toFixed(digits)} kN`;
}

function formatStress(mpa: number, unitSystem: UnitSystem, digits = 1): string {
  if (!Number.isFinite(mpa))
    return unitSystem === "imperial" ? "— ksi" : "— MPa";
  const v = mpaToStress(mpa, unitSystem);
  return unitSystem === "imperial"
    ? `${v.toFixed(digits)} ksi`
    : `${v.toFixed(digits)} MPa`;
}

function formatPct(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(0)}%`;
}

function formatMoment(
  knM: number,
  unitSystem: UnitSystem,
  digits = 2,
): string {
  if (!Number.isFinite(knM))
    return unitSystem === "imperial" ? "— kip·ft" : "— kN·m";
  if (unitSystem === "imperial") {
    // kN·m → kip·ft
    const kipFt = (knM * 1000) / (KN_PER_KIP * 1000) / 0.3048;
    return `${kipFt.toFixed(digits)} kip·ft`;
  }
  return `${knM.toFixed(digits)} kN·m`;
}

export function calculateLiftingLugRiggingCapacity(
  inputs: LiftingLugRiggingCapacityInputs,
): CalculatorOutput {
  const c = computeLiftingLugRiggingCapacity(inputs);
  const steel = getLugSteel(
    isLugSteelId(inputs.materialId)
      ? inputs.materialId
      : normalizeLugSteelId(String(inputs.materialId)),
  );
  const electrode =
    ELECTRODE_OPTIONS.find((e) => e.value === inputs.electrodeId) ??
    ELECTRODE_OPTIONS[0]!;

  const governingCheck =
    c.weldRatio >= c.bearingRatio && c.weldRatio >= c.tearRatio
      ? "Weld"
      : c.bearingRatio >= c.tearRatio
        ? "Bearing"
        : "Tear-out";

  let statusLevel: StatusLevel = "pass";
  let statusLabel = "Pass — BTH-1 Category B screening";
  if (c.invalid) {
    statusLevel = "warn";
    statusLabel = "Enter positive geometry, weight, and weld size";
  } else if (c.angleWarn) {
    statusLevel = "fail";
    statusLabel = "Fail — sling angle > 60° (use spreader beam)";
  } else if (c.pinInterference) {
    statusLevel = "fail";
    statusLabel = "Fail — D_pin ≥ D_hole (pin will not fit)";
  } else if (c.edgeDistanceMm <= 0) {
    statusLevel = "fail";
    statusLabel = "Fail — pin hole edge distance a ≤ 0";
  } else if (!c.pass) {
    statusLevel = "fail";
    statusLabel = "Fail — bearing, tear-out, or weld exceeds allowable";
  } else if (c.governingRatio > 0.85 || c.clearanceWarn) {
    statusLevel = "warn";
    statusLabel = c.clearanceWarn
      ? "Pass with clearance warning — confirm BTH-1 local stress"
      : "Pass — thin margin (unity > 0.85)";
  }

  const heroValue = c.invalid
    ? "—"
    : formatForce(c.wSafePerLugKn, inputs.unitSystem, 0);

  const edgeDisp = mmToLength(c.edgeDistanceMm, inputs.unitSystem);
  const edgeUnit = inputs.unitSystem === "imperial" ? "in" : "mm";
  const clearDisp = mmToLength(Math.abs(c.pinClearanceMm), inputs.unitSystem);
  const fyDisp =
    inputs.unitSystem === "imperial"
      ? `${steel.fyKsi.toFixed(0)} ksi`
      : `${steel.fyMPa.toFixed(0)} MPa`;

  const callouts: CalculatorOutput["callouts"] = [];
  if (c.angleWarn) {
    callouts.push({
      tone: "warn",
      title: "Sling angle limit",
      body: "Sling angle from vertical exceeds 60°. Lateral load and buckling risk are out of this screen — use a spreader / lifting beam and a stamped BTH-1 design.",
    });
  } else if (c.pinInterference) {
    callouts.push({
      tone: "warn",
      title: "Pin / hole interference",
      body: "Shackle pin diameter is larger than the pin hole. Increase D_hole or reduce D_pin before screening stresses.",
    });
  } else {
    callouts.push({
      tone: !c.pass || c.clearanceWarn ? "warn" : "info",
      title: "BTH-1 / AISC lifting-lug screen",
      body: "ASME BTH-1 Design Category B (Nd = 2.0) pin-hole bearing and AISC-style tear-out, plus both-face fillet weld combined stress ≤ 0.30 F_EXX. Confirm ASME B30.20 / site lift plan and OEM shackle charts before the lift.",
      items: [
        `Plate ${steel.label} · Fy ${fyDisp} · ${electrodeOptionLabel(inputs.electrodeId, inputs.unitSystem)}`,
        c.clearanceWarn
          ? `Pin clearance ${clearDisp.toFixed(inputs.unitSystem === "imperial" ? 2 : 1)} ${edgeUnit} exceeds 5 mm (0.2 in) — BTH-1 local concentration may apply.`
          : `Edge distance a = ${edgeDisp.toFixed(inputs.unitSystem === "imperial" ? 2 : 1)} ${edgeUnit} (R − D_hole/2)`,
      ],
    });
  }

  return {
    heroLabel: "Safe lift capacity / lug",
    heroValue,
    heroStatus: statusLabel,
    heroStatusLevel: statusLevel,
    heroBadges: [
      { label: "Bearing", value: formatPct(c.bearingRatio) },
      { label: "Tear-out", value: formatPct(c.tearRatio) },
      { label: "Weld", value: formatPct(c.weldRatio) },
      { label: "Governs", value: governingCheck },
    ],
    summary: [
      { label: "Bearing", value: formatPct(c.bearingRatio) },
      { label: "Tear-out", value: formatPct(c.tearRatio) },
      { label: "Weld", value: formatPct(c.weldRatio) },
    ],
    summaryStatus: {
      label:
        "ASME BTH-1 Category B (Nd = 2.0) · AISC lug / AWS fillet screening — not a stamped lift plan",
      level: "neutral",
    },
    rows: [
      {
        label: "Tension P_t per lug",
        value: formatForce(c.pTensionKn, inputs.unitSystem),
        section: "Sling forces",
        emphasis: true,
      },
      {
        label: "Shear P_s per lug",
        value: formatForce(c.pShearKn, inputs.unitSystem),
        section: "Sling forces",
      },
      {
        label: "Pin bearing σ_b",
        value: `${formatStress(c.sigmaBMPa, inputs.unitSystem)} / allow ${formatStress(c.fbAllowMPa, inputs.unitSystem)}`,
        section: "Plate checks",
        emphasis: true,
        warn: c.bearingRatio > 1,
      },
      {
        label: "Tear-out τ",
        value: `${formatStress(c.tauTearMPa, inputs.unitSystem)} / allow ${formatStress(c.fvAllowMPa, inputs.unitSystem)}`,
        section: "Plate checks",
        warn: c.tearRatio > 1,
      },
      {
        label: "Combined weld τ_w",
        value: `${formatStress(c.tauWeldMPa, inputs.unitSystem)} / allow ${formatStress(c.fwAllowMPa, inputs.unitSystem)}`,
        section: "Weld",
        emphasis: true,
        warn: c.weldRatio > 1,
      },
      {
        label: "Grade 80 shackle WLL (pin ref.)",
        value: formatForce(c.shackleWllKn, inputs.unitSystem, 0),
        section: "Rigging reference",
      },
    ],
    callouts,
    exportRows: [
      {
        label: "Standard",
        value: "ASME BTH-1 Cat. B · AISC lug · AWS fillet (screening)",
      },
      { label: "Material", value: steel.label },
      { label: "Electrode", value: electrode.label },
      {
        label: "W_lift",
        value: formatForce(
          forceToKn(inputs.liftWeight, inputs.unitSystem),
          inputs.unitSystem,
        ),
      },
      { label: "IF", value: finite(inputs.impactFactor).toFixed(2) },
      { label: "N_lugs", value: String(inputs.lugCount) },
      { label: "θ (from vertical)", value: `${c.angleDeg.toFixed(0)}°` },
      {
        label: "Design lift (W × IF)",
        value: formatForce(c.wDesignKn, inputs.unitSystem),
      },
      { label: "P_tension", value: formatForce(c.pTensionKn, inputs.unitSystem) },
      { label: "P_shear", value: formatForce(c.pShearKn, inputs.unitSystem) },
      { label: "σ_b", value: formatStress(c.sigmaBMPa, inputs.unitSystem) },
      { label: "Fb allow", value: formatStress(c.fbAllowMPa, inputs.unitSystem) },
      { label: "τ tear", value: formatStress(c.tauTearMPa, inputs.unitSystem) },
      { label: "Fv allow", value: formatStress(c.fvAllowMPa, inputs.unitSystem) },
      {
        label: "Base moment M",
        value: formatMoment(c.momentKnM, inputs.unitSystem),
      },
      { label: "τ weld", value: formatStress(c.tauWeldMPa, inputs.unitSystem) },
      { label: "Fw allow", value: formatStress(c.fwAllowMPa, inputs.unitSystem) },
      {
        label: "W_safe / lug",
        value: formatForce(c.wSafePerLugKn, inputs.unitSystem),
      },
      {
        label: "W_safe total",
        value: formatForce(c.wSafeTotalKn, inputs.unitSystem),
      },
      {
        label: "Shackle WLL ref.",
        value: formatForce(c.shackleWllKn, inputs.unitSystem, 0),
      },
      { label: "Governing check", value: governingCheck },
      { label: "Status", value: c.pass ? "Pass" : "Fail" },
    ],
  };
}

export {
  isLugSteelId,
  normalizeLugSteelId,
  type LugSteelId,
};
