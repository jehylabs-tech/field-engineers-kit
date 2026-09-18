/**
 * Control Valve Noise Prediction — IEC 60534-8-3 / 8-4 screening
 * with ISA-75.01.01 process context (Cv, P1/P2, mass flow).
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  ACOUSTIC_EFFICIENCY,
  EXTERNAL_SPL,
  getValveNoiseFluid,
  pipeTransmissionLossDb,
  WREF_W,
  type ValveNoiseFluidKind,
} from "@/lib/calculators/data/isaValveNoiseData";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
} from "@/lib/data/loaders";
import { barToPsi, cToF, fToC, psiToBar } from "@/lib/unitConverter";

export type ControlValveNoiseFluid = ValveNoiseFluidKind;

export type ControlValveNoiseInputs = {
  unitSystem: UnitSystem;
  nps: string;
  schedule: string;
  fluidType: ControlValveNoiseFluid;
  cv: number;
  /** Upstream pressure — bar g (metric) or psi g (imperial). */
  p1: number;
  /** Downstream pressure — bar g / psi g. */
  p2: number;
  /** Fluid temperature — °C / °F. */
  temp: number;
  /** Mass flow — kg/h (metric) or lb/h (imperial). */
  massFlow: number;
};

export const CV_RANGE = { min: 0.1, max: 10_000 } as const;
export const MASS_FLOW_RANGE = { min: 1, max: 5_000_000 } as const;

export const DEFAULT_CONTROL_VALVE_NOISE_INPUTS: ControlValveNoiseInputs = {
  unitSystem: "metric",
  nps: "4",
  schedule: "40",
  fluidType: "gas",
  cv: 120,
  p1: 10,
  p2: 2,
  temp: 25,
  massFlow: 15_000,
};

export type FlowRegime =
  | "subsonic"
  | "choked"
  | "cavitating"
  | "flashing";

export type ControlValveNoiseComputed = {
  invalid: boolean;
  invalidReason?: string;
  nps: string;
  schedule: string;
  fluidType: ControlValveNoiseFluid;
  cv: number;
  p1BarG: number;
  p2BarG: number;
  tempC: number;
  massFlowKgH: number;
  massFlowKgS: number;
  diMm: number;
  twMm: number;
  pressureRatio: number;
  regime: FlowRegime;
  regimeLabel: string;
  uvMs: number;
  mach: number;
  wmW: number;
  etaA: number;
  waW: number;
  waDb: number;
  deltaLTlDb: number;
  lp1mDba: number;
  severity: "safe" | "caution" | "high";
  severityLabel: string;
  exposureLimit: string;
  rho1: number;
  c1: number;
};

const LB_H_TO_KG_H = 0.45359237;
const ATM_BAR = 1.01325;

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function normalizeNps(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/"/g, "").replace(/in$/, "");
  return t || "4";
}

function toMetric(inputs: ControlValveNoiseInputs): {
  p1BarG: number;
  p2BarG: number;
  tempC: number;
  massFlowKgH: number;
} {
  if (inputs.unitSystem !== "imperial") {
    return {
      p1BarG: inputs.p1,
      p2BarG: inputs.p2,
      tempC: inputs.temp,
      massFlowKgH: inputs.massFlow,
    };
  }
  return {
    p1BarG: psiToBar(inputs.p1),
    p2BarG: psiToBar(inputs.p2),
    tempC: fToC(inputs.temp),
    massFlowKgH: inputs.massFlow * LB_H_TO_KG_H,
  };
}

function gasJetVelocityMs(
  p1AbsPa: number,
  p2AbsPa: number,
  T: number,
  k: number,
  R: number,
): { uv: number; choked: boolean; c1: number } {
  const c1 = Math.sqrt(k * R * T);
  const critRatio = Math.pow(2 / (k + 1), k / (k - 1));
  const choked = p2AbsPa / p1AbsPa <= critRatio;
  const pVc = choked ? p1AbsPa * critRatio : p2AbsPa;
  const ratio = Math.min(1, Math.max(1e-6, pVc / p1AbsPa));
  const uv = Math.sqrt(
    ((2 * k) / (k - 1)) * R * T * (1 - Math.pow(ratio, (k - 1) / k)),
  );
  return { uv: Number.isFinite(uv) ? uv : 0, choked, c1 };
}

function liquidJetVelocityMs(
  p1AbsPa: number,
  p2AbsPa: number,
  rho: number,
): number {
  const dp = Math.max(0, p1AbsPa - p2AbsPa);
  const uv = Math.sqrt((2 * dp) / Math.max(rho, 1));
  return Number.isFinite(uv) ? uv : 0;
}

function acousticEfficiency(
  fluidType: ControlValveNoiseFluid,
  mach: number,
  choked: boolean,
  dpOverP1: number,
): number {
  const {
    gasSubsonicEta0,
    gasSubsonicExp,
    gasChokedEta0,
    gasChokedExp,
    liquidEta0,
    liquidExp,
    etaMax,
  } = ACOUSTIC_EFFICIENCY;
  let eta: number;
  if (fluidType === "liquid") {
    eta = liquidEta0 * Math.pow(Math.max(dpOverP1, 1e-4), liquidExp);
  } else if (choked) {
    eta = gasChokedEta0 * Math.pow(Math.max(mach, 0.05), gasChokedExp);
  } else {
    eta = gasSubsonicEta0 * Math.pow(Math.max(mach, 0.05), gasSubsonicExp);
  }
  return Math.min(etaMax, Math.max(1e-8, eta));
}

function severityFromLp(lp: number): {
  severity: ControlValveNoiseComputed["severity"];
  severityLabel: string;
  level: StatusLevel;
} {
  if (lp < 85) {
    return {
      severity: "safe",
      severityLabel: "Safe Level (<85 dBA)",
      level: "pass",
    };
  }
  if (lp < 90) {
    return {
      severity: "caution",
      severityLabel: "Caution Band (85–90 dBA)",
      level: "warn",
    };
  }
  return {
    severity: "high",
    severityLabel: "High Noise Alert (≥90 dBA)",
    level: "fail",
  };
}

/** OSHA/ISO 1999 style continuous-exposure screening from A-weighted level. */
function exposureFromLp(lp: number): string {
  if (lp < 85) return "Continuous (<85 dBA)";
  if (lp < 90) return "< 8 h/day";
  if (lp < 95) return "< 4 h/day";
  if (lp < 100) return "< 2 h/day";
  if (lp < 105) return "< 1 h/day";
  return "< 15 min/day — HPD required";
}

function regimeLabel(
  fluidType: ControlValveNoiseFluid,
  regime: FlowRegime,
): string {
  if (fluidType === "liquid") {
    if (regime === "cavitating") return "Cavitating Flow Regime";
    if (regime === "flashing") return "Flashing Flow Regime";
    return "Non-cavitating Hydrodynamic";
  }
  if (regime === "choked") return "Sonic Choked Flow";
  return "Subsonic Expansion";
}

/** Compact badge text (full label stays in summary / rows). */
function regimeBadge(
  regime: FlowRegime,
  fluidType: ControlValveNoiseFluid,
): string {
  if (fluidType === "liquid") {
    if (regime === "cavitating") return "Cavitating";
    if (regime === "flashing") return "Flashing";
    return "Liquid";
  }
  return regime === "choked" ? "Choked" : "Subsonic";
}

export function computeControlValveNoise(
  inputs: ControlValveNoiseInputs,
): ControlValveNoiseComputed {
  const nps = normalizeNps(inputs.nps);
  const schedule =
    inputs.schedule?.trim() || defaultScheduleForNps(nps) || "40";
  const cv = clamp(inputs.cv, CV_RANGE.min, CV_RANGE.max);
  const metric = toMetric(inputs);
  const massFlowKgH = clamp(
    metric.massFlowKgH,
    MASS_FLOW_RANGE.min,
    MASS_FLOW_RANGE.max,
  );
  const massFlowKgS = massFlowKgH / 3600;
  const fluid = getValveNoiseFluid(inputs.fluidType);
  const entry = getPipeScheduleEntry(nps, schedule);

  const empty = (reason: string): ControlValveNoiseComputed => ({
    invalid: true,
    invalidReason: reason,
    nps,
    schedule,
    fluidType: inputs.fluidType,
    cv,
    p1BarG: metric.p1BarG,
    p2BarG: metric.p2BarG,
    tempC: metric.tempC,
    massFlowKgH,
    massFlowKgS,
    diMm: NaN,
    twMm: NaN,
    pressureRatio: NaN,
    regime: "subsonic",
    regimeLabel: "—",
    uvMs: NaN,
    mach: NaN,
    wmW: NaN,
    etaA: NaN,
    waW: NaN,
    waDb: NaN,
    deltaLTlDb: NaN,
    lp1mDba: NaN,
    severity: "caution",
    severityLabel: "Check inputs",
    exposureLimit: "—",
    rho1: NaN,
    c1: NaN,
  });

  if (!entry || !(entry.row.insideDiameterMm > 0)) {
    return empty("Select a valid NPS and schedule with known wall / ID");
  }
  if (!(metric.p1BarG > metric.p2BarG)) {
    return empty("Upstream pressure P1 must exceed downstream pressure P2");
  }
  if (!(massFlowKgS > 0)) {
    return empty("Mass flow must be greater than zero");
  }

  const diMm = entry.row.insideDiameterMm;
  const twMm = entry.row.wallThicknessMm;
  const p1AbsBar = metric.p1BarG + ATM_BAR;
  const p2AbsBar = metric.p2BarG + ATM_BAR;
  const p1AbsPa = p1AbsBar * 1e5;
  const p2AbsPa = p2AbsBar * 1e5;
  const T = metric.tempC + 273.15;
  const pressureRatio = p1AbsBar / Math.max(p2AbsBar, 1e-6);
  const dpOverP1 = (p1AbsPa - p2AbsPa) / p1AbsPa;

  let uvMs: number;
  let c1: number;
  let rho1: number;
  let choked = false;
  let regime: FlowRegime;

  if (inputs.fluidType === "gas") {
    const jet = gasJetVelocityMs(p1AbsPa, p2AbsPa, T, fluid.k, fluid.R);
    uvMs = jet.uv;
    c1 = jet.c1;
    choked = jet.choked;
    rho1 = p1AbsPa / (fluid.R * T);
    regime = choked ? "choked" : "subsonic";
  } else {
    rho1 = fluid.rhoRef;
    c1 = fluid.cLiquid;
    uvMs = liquidJetVelocityMs(p1AbsPa, p2AbsPa, rho1);
    // Hydrodynamic screening: high ΔP/P1 → cavitation / flashing proxy
    if (dpOverP1 >= 0.9) regime = "flashing";
    else if (dpOverP1 >= 0.45) regime = "cavitating";
    else regime = "subsonic";
  }

  const machJet = c1 > 0 ? uvMs / c1 : 0;
  // Throat is sonic when choked; keep jet Mach for η_a, report Ma = 1 when choked.
  const mach = choked ? 1 : machJet;
  const wmW = 0.5 * massFlowKgS * uvMs * uvMs;
  const etaA = acousticEfficiency(
    inputs.fluidType,
    machJet,
    choked,
    dpOverP1,
  );
  const waW = etaA * wmW;
  const waDb = 10 * Math.log10(Math.max(waW, 1e-18) / WREF_W);
  const deltaLTlDb = pipeTransmissionLossDb(twMm, diMm);
  // External A-weighted SPL: LwA − ΔL_TL − radiation + plant corrections
  // (IEC 60534-8-3/8-4 single-stage screening; ΔL_TL subtracts wall loss).
  const {
    radiationDb,
    p1RefBarG,
    p1LogGain,
    diRefMm,
    diLogGain,
    liquidBonusDb,
  } = EXTERNAL_SPL;
  const p1Corr =
    p1LogGain *
    Math.log10(Math.max(metric.p1BarG, 0.1) / p1RefBarG);
  const diCorr = -diLogGain * Math.log10(Math.max(diMm, 1) / diRefMm);
  const liquidCorr =
    inputs.fluidType === "liquid" ? liquidBonusDb : 0;
  const lp1mDba = waDb - deltaLTlDb - radiationDb + p1Corr + diCorr + liquidCorr;

  const sev = severityFromLp(lp1mDba);

  return {
    invalid: false,
    nps,
    schedule,
    fluidType: inputs.fluidType,
    cv,
    p1BarG: metric.p1BarG,
    p2BarG: metric.p2BarG,
    tempC: metric.tempC,
    massFlowKgH,
    massFlowKgS,
    diMm,
    twMm,
    pressureRatio,
    regime,
    regimeLabel: regimeLabel(inputs.fluidType, regime),
    uvMs,
    mach,
    wmW,
    etaA,
    waW,
    waDb,
    deltaLTlDb,
    lp1mDba,
    severity: sev.severity,
    severityLabel: sev.severityLabel,
    exposureLimit: exposureFromLp(lp1mDba),
    rho1,
    c1,
  };
}

export function calculateControlValveNoise(
  inputs: ControlValveNoiseInputs,
): CalculatorOutput {
  const c = computeControlValveNoise(inputs);
  const imperial = inputs.unitSystem === "imperial";
  const sev = severityFromLp(c.invalid ? 999 : c.lp1mDba);

  const callouts: ResultCallout[] = [];
  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Check process / pipe inputs",
      body: c.invalidReason,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Screening Note",
      body: "Noise prediction uses IEC 60534-8-3 (aerodynamic) and 60534-8-4 (hydrodynamic) screening for standard single-stage globe/butterfly trims. Catalog Cᵥ is process context for ISA carry-over — Lₚ is driven by ṁ, P₁/P₂, temperature, and downstream pipe wall. For multi-stage low-noise trims, quiet plates, or diffuser silencers, consult OEM attenuation tables.",
    });
    if (c.severity === "high") {
      callouts.push({
        tone: "warn",
        title: "High noise warning",
        body: `${c.lp1mDba.toFixed(1)} dBA exceeds the typical 90 dBA plant alert band. Consider low-noise trim, downstream silencers, or path isolation.`,
      });
    } else if (c.regime === "cavitating" || c.regime === "flashing") {
      callouts.push({
        tone: "warn",
        title: "Hydrodynamic noise alert",
        body: "High ΔP/P1 indicates cavitation or flashing risk. Hydrodynamic noise (IEC 60534-8-4) dominates — verify anti-cavitation trim with the OEM.",
      });
    }
  }

  const heroValue = c.invalid ? "—" : `${c.lp1mDba.toFixed(1)} dBA`;
  const uvDisplay = c.invalid
    ? "—"
    : imperial
      ? `${(c.uvMs * 3.28084).toFixed(0)} ft/s (${c.uvMs.toFixed(0)} m/s)`
      : `${c.uvMs.toFixed(0)} m/s (${(c.uvMs * 3.28084).toFixed(0)} ft/s)`;
  const twDisplay = c.invalid
    ? "—"
    : imperial
      ? `${(c.twMm / 25.4).toFixed(3)} in`
      : `${c.twMm.toFixed(2)} mm`;

  const rows: ResultRow[] = [];
  if (!c.invalid) {
    rows.push(
      {
        section: "Acoustics",
        label: "Acoustic power W_a",
        value: `${c.waW.toExponential(2)} W · ${c.waDb.toFixed(1)} dB`,
        emphasis: true,
      },
      {
        section: "Acoustics",
        label: "Transmission loss ΔL_TL",
        value: `${c.deltaLTlDb.toFixed(1)} dB`,
      },
      {
        section: "Jet / trim",
        label: "Vena contracta velocity U_v",
        value: uvDisplay,
        emphasis: true,
      },
    );
    if (c.fluidType === "gas") {
      rows.push({
        section: "Jet / trim",
        label: "Throat Mach number Ma",
        value: c.mach.toFixed(2),
      });
    } else {
      const dpFrac =
        (c.p1BarG - c.p2BarG) / Math.max(c.p1BarG + 1.01325, 1e-6);
      rows.push({
        section: "Jet / trim",
        label: "ΔP / P₁ (abs)",
        value: dpFrac.toFixed(2),
      });
    }
    rows.push(
      {
        section: "Exposure",
        label: "OSHA/ISO exposure limit",
        value: c.exposureLimit,
      },
      {
        section: "Pipe",
        label: "Downstream wall t_w",
        value: twDisplay,
      },
      {
        section: "Pipe",
        label: "Inside diameter D_i",
        value: imperial
          ? `${(c.diMm / 25.4).toFixed(3)} in`
          : `${c.diMm.toFixed(2)} mm`,
      },
    );
  }

  return {
    heroLabel: "Predicted noise Lₚ,₁ₘ",
    heroValue,
    heroStatus: c.invalid ? "Check inputs" : c.severityLabel,
    heroStatusLevel: c.invalid ? "fail" : sev.level,
    heroBadges: c.invalid
      ? undefined
      : [
          { label: "Cᵥ", value: String(c.cv) },
          { label: "P₁/P₂", value: c.pressureRatio.toFixed(2) },
          { label: "Regime", value: regimeBadge(c.regime, c.fluidType) },
          { label: "t_w", value: twDisplay },
        ],
    summary: [
      {
        label: "Catalog Cᵥ",
        value: String(c.cv),
      },
      {
        label: "Pressure ratio P₁/P₂ (abs)",
        value: c.invalid ? "—" : c.pressureRatio.toFixed(2),
      },
      {
        label: "Flow regime",
        value: c.invalid ? "—" : c.regimeLabel,
      },
      {
        label: "Pipe wall t_w",
        value: twDisplay,
      },
      {
        label: "Exposure",
        value: c.invalid ? "—" : c.exposureLimit,
      },
    ],
    summaryStatus: {
      label: c.invalid ? "Check inputs" : c.severityLabel,
      level: c.invalid ? "fail" : sev.level,
    },
    rows,
    callouts,
    exportRows: [
      { label: "Standard", value: "IEC 60534-8-3 / 8-4 · ISA-75.01.01" },
      { label: "NPS", value: c.nps },
      { label: "Schedule", value: c.schedule },
      { label: "Fluid", value: c.fluidType },
      { label: "Cv", value: String(c.cv) },
      {
        label: "P1 bar g",
        value: c.invalid ? "—" : c.p1BarG.toFixed(3),
      },
      {
        label: "P2 bar g",
        value: c.invalid ? "—" : c.p2BarG.toFixed(3),
      },
      {
        label: "P1 psi g",
        value: c.invalid ? "—" : barToPsi(c.p1BarG).toFixed(2),
      },
      {
        label: "Temp C",
        value: c.invalid ? "—" : c.tempC.toFixed(1),
      },
      {
        label: "Temp F",
        value: c.invalid ? "—" : cToF(c.tempC).toFixed(1),
      },
      {
        label: "Mass flow kg/h",
        value: c.invalid ? "—" : c.massFlowKgH.toFixed(1),
      },
      {
        label: "Lp_1m dBA",
        value: c.invalid ? "—" : c.lp1mDba.toFixed(2),
      },
      {
        label: "Wa W",
        value: c.invalid ? "—" : c.waW.toExponential(4),
      },
      {
        label: "DeltaL_TL dB",
        value: c.invalid ? "—" : c.deltaLTlDb.toFixed(2),
      },
      {
        label: "Uv m/s",
        value: c.invalid ? "—" : c.uvMs.toFixed(2),
      },
      {
        label: "Mach",
        value: c.invalid ? "—" : c.mach.toFixed(3),
      },
      { label: "Regime", value: c.invalid ? "—" : c.regimeLabel },
      { label: "Severity", value: c.invalid ? "—" : c.severityLabel },
      { label: "Exposure", value: c.invalid ? "—" : c.exposureLimit },
    ],
  };
}
