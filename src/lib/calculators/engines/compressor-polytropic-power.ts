/**
 * Compressor polytropic head & gas power — GPSA / API 617 screening.
 *
 *   (n−1)/n = (k−1)/(k·η_p)
 *   H_p = (Z_avg·R·T₁/M)·(n/(n−1))·[r_p^((n−1)/n) − 1]
 *   T₂ = T₁ · r_p^((n−1)/n)
 *   P_gas = ṁ · H_p / η_p
 *
 * Screening only — confirm OEM curves, multi-stage layout, and real-gas EOS.
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  getCompressorGasProps,
  type CompressorGasType,
} from "@/lib/calculators/data/gasCompressorProperties";
import { cToF, fToC, psiToBar } from "@/lib/unitConverter";

export type CompressorPolytropicPowerInputs = {
  unitSystem: UnitSystem;
  gasType: CompressorGasType;
  /** g/mol (metric) or lb/lbmol (imperial — same numeric MW scale). */
  molecularWeight: number;
  kRatio: number;
  /** Absolute suction pressure — bar(a) or psia. */
  suctionPress: number;
  /** Absolute discharge pressure — bar(a) or psia. */
  dischargePress: number;
  /** Suction temperature — °C or °F. */
  suctionTemp: number;
  /** Inlet volume flow — m³/h or ICFM. */
  volFlow: number;
  /** Polytropic efficiency, percent 40–95. */
  polytropicEff: number;
  zFactor: number;
};

export const MW_RANGE = { min: 2, max: 150 } as const;
export const K_RANGE = { min: 1.05, max: 1.7 } as const;
export const P_RANGE_BAR = { min: 0.5, max: 500 } as const;
export const P_RANGE_PSIA = { min: 7, max: 7250 } as const;
export const T_RANGE_C = { min: -50, max: 200 } as const;
export const T_RANGE_F = { min: -58, max: 392 } as const;
export const FLOW_RANGE_M3H = { min: 100, max: 500_000 } as const;
export const FLOW_RANGE_ICFM = { min: 60, max: 300_000 } as const;
export const EFF_RANGE_PCT = { min: 40, max: 95 } as const;
export const Z_RANGE = { min: 0.5, max: 1.5 } as const;

export const T2_ALERT_C = 150;
export const RP_ALERT = 4.5;
export const P2_HIGH_BAR = 50;

/** Universal gas constant kJ/(kmol·K) = J/(mol·K). */
const R_UNIV = 8.314462618;
const KW_TO_HP = 1.34102209;
const M3H_TO_ICFM = 0.58857777;
const BAR_TO_PSIA = 14.5037738;
const KJ_KG_TO_FT_LBF_LB = 334.552565;

export const DEFAULT_COMPRESSOR_POLYTROPIC_POWER_INPUTS: CompressorPolytropicPowerInputs =
  {
    unitSystem: "metric",
    gasType: "natural_gas",
    molecularWeight: 18.5,
    kRatio: 1.28,
    suctionPress: 5,
    dischargePress: 25,
    suctionTemp: 35,
    volFlow: 5000,
    polytropicEff: 75,
    zFactor: 0.95,
  };

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function pressToBar(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? psiToBar(value) : value;
}

function tempToC(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? fToC(value) : value;
}

function flowToM3h(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? value / M3H_TO_ICFM : value;
}

export type CompressorPolytropicPowerComputed = {
  invalid: boolean;
  invalidReason?: string;
  p1Bar: number;
  p2Bar: number;
  t1K: number;
  t2K: number;
  t2C: number;
  rp: number;
  k: number;
  etaP: number;
  zAvg: number;
  mw: number;
  nMinus1OverN: number;
  nOverNMinus1: number;
  hpKjKg: number;
  rho1KgM3: number;
  massKgH: number;
  powerKw: number;
  powerIsothermalKw: number;
  highTemp: boolean;
  highRp: boolean;
  highPressure: boolean;
  gasType: CompressorGasType;
};

export function computeCompressorPolytropicPower(
  inputs: CompressorPolytropicPowerInputs,
): CompressorPolytropicPowerComputed {
  const p1Bar = pressToBar(inputs.suctionPress, inputs.unitSystem);
  const p2Bar = pressToBar(inputs.dischargePress, inputs.unitSystem);
  const t1C = tempToC(inputs.suctionTemp, inputs.unitSystem);
  const qM3h = flowToM3h(inputs.volFlow, inputs.unitSystem);
  const etaP = clamp(inputs.polytropicEff, EFF_RANGE_PCT.min, EFF_RANGE_PCT.max) / 100;
  const zAvg = clamp(inputs.zFactor, Z_RANGE.min, Z_RANGE.max);
  const mw = clamp(inputs.molecularWeight, MW_RANGE.min, MW_RANGE.max);
  const k = clamp(inputs.kRatio, K_RANGE.min, K_RANGE.max);

  const empty = (reason: string): CompressorPolytropicPowerComputed => ({
    invalid: true,
    invalidReason: reason,
    p1Bar,
    p2Bar,
    t1K: NaN,
    t2K: NaN,
    t2C: NaN,
    rp: NaN,
    k,
    etaP,
    zAvg,
    mw,
    nMinus1OverN: NaN,
    nOverNMinus1: NaN,
    hpKjKg: NaN,
    rho1KgM3: NaN,
    massKgH: NaN,
    powerKw: NaN,
    powerIsothermalKw: NaN,
    highTemp: false,
    highRp: false,
    highPressure: false,
    gasType: inputs.gasType,
  });

  if (!(p1Bar >= P_RANGE_BAR.min) || !(p1Bar <= P_RANGE_BAR.max)) {
    return empty("Suction pressure out of screening range");
  }
  if (!(p2Bar >= P_RANGE_BAR.min) || !(p2Bar <= P_RANGE_BAR.max)) {
    return empty("Discharge pressure out of screening range");
  }
  if (!(p2Bar > p1Bar)) {
    return empty("Discharge pressure must exceed suction pressure (absolute)");
  }
  if (!(t1C >= T_RANGE_C.min) || !(t1C <= T_RANGE_C.max)) {
    return empty(
      `Suction temperature must be ${T_RANGE_C.min}–${T_RANGE_C.max} °C (or °F equivalent)`,
    );
  }
  if (!(qM3h >= FLOW_RANGE_M3H.min) || !(qM3h <= FLOW_RANGE_M3H.max)) {
    return empty("Inlet volume flow out of screening range");
  }
  if (!(etaP > 0) || !(etaP < 1)) {
    return empty("Polytropic efficiency must be between 40% and 95%");
  }
  if (!(k > 1)) {
    return empty("Specific heat ratio k must be > 1");
  }

  const t1K = t1C + 273.15;
  const rp = p2Bar / p1Bar;
  const nMinus1OverN = (k - 1) / (k * etaP);
  if (!(nMinus1OverN > 0) || !(nMinus1OverN < 1)) {
    return empty("Polytropic exponent factor (n−1)/n out of range");
  }
  const nOverNMinus1 = 1 / nMinus1OverN;
  const rpPow = Math.pow(rp, nMinus1OverN);
  if (!(rpPow > 1) || !Number.isFinite(rpPow)) {
    return empty("Pressure-ratio term invalid");
  }

  // H_p [kJ/kg]: R [kJ/(kmol·K)], M [kg/kmol] (= g/mol numeric)
  const hpKjKg =
    ((zAvg * R_UNIV * t1K) / mw) * nOverNMinus1 * (rpPow - 1);

  const t2K = t1K * rpPow;
  const t2C = t2K - 273.15;

  // ρ₁ = P M / (Z R T) with P in Pa, M in kg/mol
  const p1Pa = p1Bar * 1e5;
  const mKgMol = mw / 1000;
  const rho1KgM3 = (p1Pa * mKgMol) / (zAvg * R_UNIV * t1K);

  const massKgS = (qM3h * rho1KgM3) / 3600;
  const massKgH = massKgS * 3600;
  const powerKw = (massKgS * hpKjKg) / etaP;

  // Isothermal comparison: ṁ · Z R T₁/M · ln(rp)
  const powerIsothermalKw =
    massKgS * ((zAvg * R_UNIV * t1K) / mw) * Math.log(rp);

  return {
    invalid: false,
    p1Bar,
    p2Bar,
    t1K,
    t2K,
    t2C,
    rp,
    k,
    etaP,
    zAvg,
    mw,
    nMinus1OverN,
    nOverNMinus1,
    hpKjKg,
    rho1KgM3,
    massKgH,
    powerKw,
    powerIsothermalKw,
    highTemp: t2C > T2_ALERT_C,
    highRp: rp > RP_ALERT,
    highPressure: p2Bar > P2_HIGH_BAR,
    gasType: inputs.gasType,
  };
}

function fmtPower(kw: number, imperial: boolean): string {
  if (imperial) {
    const hp = kw * KW_TO_HP;
    return hp >= 100 ? `${hp.toFixed(0)} hp` : `${hp.toFixed(1)} hp`;
  }
  return kw >= 100 ? `${kw.toFixed(0)} kW` : `${kw.toFixed(1)} kW`;
}

function fmtPowerAlt(kw: number, imperial: boolean): string {
  return fmtPower(kw, !imperial);
}

function fmtTempC(tC: number, imperial: boolean): string {
  if (imperial) return `${cToF(tC).toFixed(1)} °F`;
  return `${tC.toFixed(1)} °C`;
}

function fmtTempAlt(tC: number, imperial: boolean): string {
  return fmtTempC(tC, !imperial);
}

function fmtHead(hpKjKg: number, imperial: boolean): string {
  if (imperial) {
    return `${(hpKjKg * KJ_KG_TO_FT_LBF_LB).toFixed(0)} ft·lbf/lb`;
  }
  return `${hpKjKg.toFixed(1)} kJ/kg`;
}

export function applyGasTypeDefaults(
  gasType: CompressorGasType,
  current: CompressorPolytropicPowerInputs,
): CompressorPolytropicPowerInputs {
  if (gasType === "custom") {
    return { ...current, gasType };
  }
  const row = getCompressorGasProps(gasType);
  return {
    ...current,
    gasType,
    molecularWeight: row.molecularWeight,
    kRatio: row.kRatio,
    zFactor: row.zDefault,
  };
}

export function calculateCompressorPolytropicPower(
  inputs: CompressorPolytropicPowerInputs,
): CalculatorOutput {
  const c = computeCompressorPolytropicPower(inputs);
  const imperial = inputs.unitSystem === "imperial";

  if (c.invalid) {
    return {
      heroLabel: "Gas power · Discharge temperature",
      heroValue: "—",
      heroStatus: c.invalidReason ?? "Enter absolute pressures and suction duty",
      heroStatusLevel: "neutral",
      summary: [],
      summaryStatus: { label: "Incomplete", level: "neutral" },
      rows: [],
      callouts: [
        {
          tone: "info",
          title: "GPSA / API 617 screening",
          body: "Enter absolute suction/discharge pressures, suction temperature, inlet volume flow, polytropic efficiency, and gas properties (M, k, Z).",
        },
      ],
      exportRows: [],
    };
  }

  const t2AlertLabel = imperial
    ? `${cToF(T2_ALERT_C).toFixed(0)} °F`
    : `${T2_ALERT_C} °C`;
  const t2Label = fmtTempC(c.t2C, imperial);

  let heroStatusLevel: StatusLevel = "pass";
  let heroStatus = "Screening OK";
  if (c.highTemp || c.highRp) {
    heroStatusLevel = "warn";
    if (c.highTemp && c.highRp) {
      heroStatus = `T₂ ${t2Label} · r_p ${c.rp.toFixed(2)} — review multi-stage`;
    } else if (c.highTemp) {
      heroStatus = `T₂ ${t2Label} > ${t2AlertLabel} — review intercooling`;
    } else {
      heroStatus = `r_p = ${c.rp.toFixed(2)} > ${RP_ALERT} — review multi-stage`;
    }
  }

  const callouts: ResultCallout[] = [];
  if (c.highTemp) {
    const rpNote = c.highRp
      ? ` Pressure ratio r_p = ${c.rp.toFixed(2)} also exceeds ${RP_ALERT}.`
      : "";
    callouts.push({
      tone: "warn",
      title: c.highRp
        ? "High Temperature & Pressure Ratio Alert"
        : "High Temperature Rise Alert",
      body: `Discharge temperature T₂ ≈ ${t2Label} exceeds the ${t2AlertLabel} API 617 single-stage screening limit.${rpNote} Consider intercooled multi-stage compression to protect seals and gas quality.`,
    });
  } else if (c.highRp) {
    callouts.push({
      tone: "warn",
      title: "High Pressure Ratio Limit",
      body: `Single-stage pressure ratio r_p = ${c.rp.toFixed(2)} exceeds ${RP_ALERT}. Split the duty across stages to limit mechanical stress and efficiency loss.`,
    });
  } else if (c.highPressure) {
    callouts.push({
      tone: "info",
      title: "Real Gas Behavior Notice",
      body: `Discharge pressure P₂ ≈ ${c.p2Bar.toFixed(1)} bar(a) is in a high-pressure band. Confirm Z_avg with Lee–Kesler / RK EOS — constant-Z screening may understate head.`,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "GPSA / API 617 screening",
      body: "Polytropic head and gas power from GPSA-style relations. Not a substitute for OEM performance maps or ASME PTC 10 acceptance tests.",
      items: [
        `r_p=${c.rp.toFixed(2)} · (n−1)/n=${c.nMinus1OverN.toFixed(4)} · Z=${c.zAvg.toFixed(3)}`,
      ],
    });
  }

  const massDisp = imperial
    ? `${(c.massKgH * 2.20462262).toFixed(0)} lb/hr`
    : `${c.massKgH.toFixed(0)} kg/h`;
  const rhoDisp = imperial
    ? `${(c.rho1KgM3 * 0.06242796).toFixed(3)} lb/ft³`
    : `${c.rho1KgM3.toFixed(3)} kg/m³`;

  let stageScreen = "Within single-stage screen";
  if (c.highTemp && c.highRp) {
    stageScreen = "T₂ & r_p high — multi-stage + intercool";
  } else if (c.highTemp) {
    stageScreen = "T₂ high — intercool / multi-stage";
  } else if (c.highRp) {
    stageScreen = "r_p high — split stages";
  }

  const rows: ResultRow[] = [
    {
      section: "Flow",
      label: "Mass flow ṁ",
      value: massDisp,
      emphasis: true,
    },
    {
      section: "Flow",
      label: "Suction density ρ₁",
      value: rhoDisp,
    },
    {
      section: "Compare",
      label: "Isothermal power",
      value: fmtPower(c.powerIsothermalKw, imperial),
    },
    {
      section: "Screen",
      label: "API 617 stage screen",
      value: stageScreen,
      warn: c.highTemp || c.highRp,
    },
  ];

  const exportRows = [
    { label: "Gas power P_gas", value: fmtPower(c.powerKw, imperial) },
    { label: "Discharge temperature T₂", value: fmtTempC(c.t2C, imperial) },
    { label: "Pressure ratio r_p", value: c.rp.toFixed(4) },
    { label: "Polytropic head H_p", value: fmtHead(c.hpKjKg, imperial) },
    {
      label: "(n−1)/n",
      value: c.nMinus1OverN.toFixed(6),
    },
    { label: "Mass flow", value: massDisp },
    { label: "Suction density", value: rhoDisp },
    {
      label: "Isothermal power",
      value: fmtPower(c.powerIsothermalKw, imperial),
    },
    {
      label: "Suction / discharge",
      value: `${c.p1Bar.toFixed(3)} → ${c.p2Bar.toFixed(3)} bar(a)`,
    },
    {
      label: "Gas",
      value: `${c.gasType} · M=${c.mw} · k=${c.k} · Z=${c.zAvg}`,
    },
    {
      label: "η_p",
      value: `${(c.etaP * 100).toFixed(1)} %`,
    },
  ];

  return {
    heroLabel: "Gas power · Discharge temperature",
    heroValue: `${fmtPower(c.powerKw, imperial)} · ${fmtTempC(c.t2C, imperial)}`,
    heroStatus,
    heroStatusLevel,
    heroBadges: [
      {
        label: "Also",
        value: `${fmtPowerAlt(c.powerKw, imperial)} · ${fmtTempAlt(c.t2C, imperial)}`,
      },
      { label: "r_p", value: c.rp.toFixed(2) },
    ],
    summary: [
      { label: "Pressure ratio r_p", value: c.rp.toFixed(3) },
      { label: "Polytropic head H_p", value: fmtHead(c.hpKjKg, imperial) },
      {
        label: "(n−1)/n",
        value: c.nMinus1OverN.toFixed(4),
      },
    ],
    summaryStatus: { label: heroStatus, level: heroStatusLevel },
    rows,
    callouts,
    exportRows,
  };
}

export { BAR_TO_PSIA, M3H_TO_ICFM, KW_TO_HP };
