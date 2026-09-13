/**
 * Pump Minimum Continuous Stable Flow (MCSF) & Thermal Protection —
 * API 610 / ISO 13709 / HI 9.6.1 field screening.
 *
 * Governing absolute MCSF:
 *   Q_MCSF = max(Q_min,th, Q_min,hydro)
 *
 * Hydrodynamic / vibration screen (API 610 §6.1 / OEM curve):
 *   Q_min,hydro = Q_BEP × mcsf_ratio   (default 0.35; typical band 0.30–0.60)
 *
 * Shut-off / low-flow shaft power screen:
 *   P_so = P_rated × so_ratio          (default 0.50; typical 0.40–0.60)
 *
 * Thermal minimum flow — energy balance at ≈ shut-off head
 * (all SI: P in W, ρ kg/m³, Cp J/(kg·K), H m, ΔT K → Q in m³/s):
 *   Heat = P_so − ρ g Q H_so
 *   ΔT   = Heat / (ρ Q Cp)
 *   ⇒ Q_min,th = P_so / [ρ (Cp·ΔT_max + g·H_so)]
 *
 * Note: forms that place η in the denominator of the H term
 *   (… + ρ g H / η) under-predict thermal flow and are not used.
 * Optional η_min is shown only for the HI-style ΔT check:
 *   ΔT_η = g H_so (1−η)/(Cp η)
 *
 * Bypass ARC liquid Cv (US): Cv = Q_gpm √(SG / ΔP_psi)
 * Bypass line: A = Q / v_max → smallest Sch 40 NPS with v ≤ v_max.
 *
 * Screening only — confirm OEM MCSF, ARC datasheet, and HI 9.6.1.
 */

import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import { liquidCvUs } from "@/lib/calculators/engines/valve-cv";

export type McsfFlowUnit = "m3h" | "gpm";
export type McsfFluid =
  | "water"
  | "water-hot"
  | "naphtha"
  | "crude"
  | "amine"
  | "custom";

export type PumpMcsfInputs = {
  unitSystem: UnitSystem;
  fluid: McsfFluid;
  /** BEP capacity — m³/h or GPM. */
  flowBep: number;
  flowUnit: McsfFlowUnit;
  /** Shut-off / near-shut-off head — m or ft. */
  headShutoff: number;
  /** Rated driver power — kW or HP. */
  powerRated: number;
  /** Operating temperature — °C or °F (context / hot-service warn). */
  fluidTemp: number;
  /** Density — kg/m³ or lb/ft³. */
  density: number;
  /** Specific heat — kJ/(kg·°C) metric / Btu/(lb·°F) imperial. */
  cp: number;
  /** Specific gravity (water = 1). Synced from density when presets apply. */
  sg: number;
  /** Max allowable temperature rise — °C or °F (delta). */
  deltaTMax: number;
  /** Hydrodynamic MCSF as fraction of Q_BEP (0–1). Default 0.35. */
  mcsfRatio: number;
  /** P_so / P_rated. Default 0.50. */
  soPowerRatio: number;
  /** Low-flow efficiency for HI-style ΔT check only (0–1). */
  etaMin: number;
  /** Bypass ΔP — bar or psi. */
  bypassDp: number;
  /** Max continuous bypass velocity — m/s or ft/s. */
  bypassVmax: number;
  /**
   * Optional current / proposed continuous operating flow (same unit as Q_BEP).
   * 0 = not entered — used only for below-MCSF comparison.
   */
  flowOp: number;
};

export const MCSF_FLUID_OPTIONS: {
  value: McsfFluid;
  label: string;
  shortLabel: string;
  densityKgM3: number;
  cpKjKgK: number;
  tempC: number;
}[] = [
  {
    value: "water",
    label: "Fresh water (~40 °C)",
    shortLabel: "Water",
    densityKgM3: 992,
    cpKjKgK: 4.18,
    tempC: 40,
  },
  {
    value: "water-hot",
    label: "Boiler-feed water (~120 °C)",
    shortLabel: "BFW",
    densityKgM3: 943,
    cpKjKgK: 4.25,
    tempC: 120,
  },
  {
    value: "naphtha",
    label: "Naphtha (SG ≈ 0.72)",
    shortLabel: "Naphtha",
    densityKgM3: 720,
    cpKjKgK: 2.1,
    tempC: 40,
  },
  {
    value: "crude",
    label: "Crude oil (SG ≈ 0.85)",
    shortLabel: "Crude",
    densityKgM3: 850,
    cpKjKgK: 1.9,
    tempC: 38,
  },
  {
    value: "amine",
    label: "Amine solution (SG ≈ 1.02)",
    shortLabel: "Amine",
    densityKgM3: 1020,
    cpKjKgK: 3.5,
    tempC: 49,
  },
  {
    value: "custom",
    label: "Custom ρ / Cp / SG",
    shortLabel: "Custom",
    densityKgM3: 992,
    cpKjKgK: 4.18,
    tempC: 40,
  },
];

/** Sch 40 ID (mm) — ASME B36.10M screening table for bypass line pick. */
const SCH40_ID_MM: { nps: string; idMm: number }[] = [
  { nps: "0.75", idMm: 20.93 },
  { nps: "1", idMm: 26.64 },
  { nps: "1.25", idMm: 35.08 },
  { nps: "1.5", idMm: 40.89 },
  { nps: "2", idMm: 52.48 },
  { nps: "2.5", idMm: 62.71 },
  { nps: "3", idMm: 77.93 },
  { nps: "4", idMm: 102.26 },
  { nps: "6", idMm: 154.05 },
  { nps: "8", idMm: 202.72 },
  { nps: "10", idMm: 254.51 },
  { nps: "12", idMm: 303.23 },
];

export const DEFAULT_PUMP_MCSF_INPUTS: PumpMcsfInputs = {
  unitSystem: "metric",
  fluid: "water",
  flowBep: 200,
  flowUnit: "m3h",
  headShutoff: 150,
  powerRated: 110,
  fluidTemp: 40,
  density: 992,
  cp: 4.18,
  sg: 0.992,
  deltaTMax: 5,
  mcsfRatio: 0.35,
  soPowerRatio: 0.5,
  etaMin: 0.2,
  bypassDp: 10,
  bypassVmax: 3,
  flowOp: 0,
};

const G = 9.80665;
const M3H_TO_GPM = 4.402867513;
const KW_TO_HP = 1 / 0.745699872;
const WATER_KG_M3 = 1000;
/** kJ/(kg·K) ↔ Btu/(lb·°F) factor (≈ 1 for water in each system). */
const CP_KJ_TO_BTU = 1 / 4.1868;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function convertFlowBetweenUnits(
  flow: number,
  from: McsfFlowUnit,
  to: McsfFlowUnit,
): number {
  if (from === to) return flow;
  if (from === "m3h" && to === "gpm") {
    return Number((finite(flow) * M3H_TO_GPM).toFixed(2));
  }
  return Number((finite(flow) / M3H_TO_GPM).toFixed(2));
}

export function sgFromDensityKgM3(densityKgM3: number): number {
  return Math.max(0.01, finite(densityKgM3) / WATER_KG_M3);
}

export function densityDisplayFromKgM3(
  densityKgM3: number,
  unitSystem: UnitSystem,
): number {
  if (unitSystem === "imperial") {
    return Number((densityKgM3 * 0.06242796).toFixed(3));
  }
  return Number(densityKgM3.toFixed(1));
}

export function cpDisplayFromKj(
  cpKjKgK: number,
  unitSystem: UnitSystem,
): number {
  if (unitSystem === "imperial") {
    return Number((cpKjKgK * CP_KJ_TO_BTU).toFixed(3));
  }
  return Number(cpKjKgK.toFixed(2));
}

export function applyMcsfFluidPreset(
  fluid: McsfFluid,
  current: PumpMcsfInputs,
): PumpMcsfInputs {
  const preset = MCSF_FLUID_OPTIONS.find((f) => f.value === fluid);
  if (!preset || fluid === "custom") {
    return { ...current, fluid };
  }
  const density = densityDisplayFromKgM3(
    preset.densityKgM3,
    current.unitSystem,
  );
  const cp = cpDisplayFromKj(preset.cpKjKgK, current.unitSystem);
  const temp =
    current.unitSystem === "imperial"
      ? Math.round((preset.tempC * 9) / 5 + 32)
      : preset.tempC;
  return {
    ...current,
    fluid,
    density,
    cp,
    sg: Number(sgFromDensityKgM3(preset.densityKgM3).toFixed(3)),
    fluidTemp: temp,
  };
}

function toSi(inputs: PumpMcsfInputs): {
  qBepM3s: number;
  hSoM: number;
  pRatedW: number;
  rho: number;
  cpJ: number;
  sg: number;
  dTmaxK: number;
  bypassDpBar: number;
  vmaxMs: number;
  tempC: number;
} {
  const imperial = inputs.unitSystem === "imperial";
  const qBep =
    inputs.flowUnit === "gpm"
      ? finite(inputs.flowBep) / M3H_TO_GPM
      : finite(inputs.flowBep);
  const qBepM3s = qBep / 3600;
  const hSoM = imperial
    ? finite(inputs.headShutoff) * 0.3048
    : finite(inputs.headShutoff);
  const pRatedW = imperial
    ? finite(inputs.powerRated) * 0.745699872 * 1000
    : finite(inputs.powerRated) * 1000;
  const rho = imperial
    ? finite(inputs.density) / 0.06242796
    : finite(inputs.density);
  const cpJ = imperial
    ? finite(inputs.cp) * 4186.8
    : finite(inputs.cp) * 1000;
  const dTmaxK = imperial
    ? finite(inputs.deltaTMax) / 1.8
    : finite(inputs.deltaTMax);
  const bypassDpBar = imperial
    ? finite(inputs.bypassDp) / 14.5037738
    : finite(inputs.bypassDp);
  const vmaxMs = imperial
    ? finite(inputs.bypassVmax) * 0.3048
    : finite(inputs.bypassVmax);
  const tempC = imperial
    ? ((finite(inputs.fluidTemp) - 32) * 5) / 9
    : finite(inputs.fluidTemp);
  const sg =
    finite(inputs.sg) > 0
      ? finite(inputs.sg)
      : sgFromDensityKgM3(rho);

  return {
    qBepM3s,
    hSoM,
    pRatedW,
    rho,
    cpJ,
    sg,
    dTmaxK,
    bypassDpBar,
    vmaxMs,
    tempC,
  };
}

export type PumpMcsfComputed = {
  powerSoW: number;
  qMinThermalM3h: number;
  qMinHydroM3h: number;
  qMcsfM3h: number;
  governing: "thermal" | "hydro" | "tie";
  deltaTAtMcsfK: number;
  /** ΔT_max − ΔT@MCSF (K). Positive = margin remaining. */
  deltaTMarginK: number;
  deltaTEtaK: number;
  arcCv: number;
  bypassNps: string | null;
  bypassVelocityMs: number;
  bypassOverspeed: boolean;
  mcsfFractionOfBep: number;
  highEnergy: boolean;
  hotService: boolean;
  belowMcsf: boolean;
  soRatioOutOfBand: boolean;
  hydroRatioOutOfBand: boolean;
  invalid: boolean;
};

export function recommendBypassNps(
  flowM3h: number,
  vmaxMs: number,
): { nps: string; velocityMs: number } | null {
  if (!(flowM3h > 0) || !(vmaxMs > 0)) return null;
  const qM3s = flowM3h / 3600;
  for (const row of SCH40_ID_MM) {
    const area = Math.PI * (row.idMm / 1000 / 2) ** 2;
    const v = qM3s / area;
    if (v <= vmaxMs) {
      return { nps: row.nps, velocityMs: v };
    }
  }
  const last = SCH40_ID_MM[SCH40_ID_MM.length - 1];
  const area = Math.PI * (last.idMm / 1000 / 2) ** 2;
  return { nps: last.nps, velocityMs: qM3s / area };
}

export function computePumpMcsf(inputs: PumpMcsfInputs): PumpMcsfComputed {
  const si = toSi(inputs);
  const soRatio = Math.min(1, Math.max(0.05, finite(inputs.soPowerRatio, 0.5)));
  const mcsfRatio = Math.min(
    1,
    Math.max(0.05, finite(inputs.mcsfRatio, 0.35)),
  );
  const etaMin = Math.min(0.95, Math.max(0.05, finite(inputs.etaMin, 0.2)));

  const invalid =
    si.qBepM3s <= 0 ||
    si.hSoM <= 0 ||
    si.pRatedW <= 0 ||
    si.rho <= 0 ||
    si.cpJ <= 0 ||
    si.dTmaxK <= 0 ||
    si.sg <= 0 ||
    si.bypassDpBar <= 0 ||
    si.vmaxMs <= 0;

  const powerSoW = si.pRatedW * soRatio;
  const denom = si.rho * (si.cpJ * si.dTmaxK + G * si.hSoM);
  const qMinThermalM3s = !invalid && denom > 0 ? powerSoW / denom : 0;
  const qMinHydroM3s = !invalid ? si.qBepM3s * mcsfRatio : 0;
  const qMcsfM3s = Math.max(qMinThermalM3s, qMinHydroM3s);

  let governing: PumpMcsfComputed["governing"] = "tie";
  if (qMinThermalM3s > qMinHydroM3s * 1.001) governing = "thermal";
  else if (qMinHydroM3s > qMinThermalM3s * 1.001) governing = "hydro";

  const qMcsfM3h = qMcsfM3s * 3600;
  const heatAtMcsf =
    !invalid && qMcsfM3s > 0
      ? Math.max(0, powerSoW - si.rho * G * qMcsfM3s * si.hSoM)
      : 0;
  const deltaTAtMcsfK =
    !invalid && qMcsfM3s > 0
      ? heatAtMcsf / (si.rho * qMcsfM3s * si.cpJ)
      : 0;
  const deltaTEtaK =
    !invalid && etaMin > 0
      ? (G * si.hSoM * (1 - etaMin)) / (si.cpJ * etaMin)
      : 0;

  const arcCv = invalid
    ? 0
    : liquidCvUs(qMcsfM3h, si.bypassDpBar, si.sg);

  const bypass = recommendBypassNps(qMcsfM3h, si.vmaxMs);
  const bypassVelocityMs = bypass?.velocityMs ?? 0;
  const bypassOverspeed =
    !invalid && bypassVelocityMs > si.vmaxMs + 1e-9;

  const qOpM3h =
    finite(inputs.flowOp) > 0
      ? inputs.flowUnit === "gpm"
        ? finite(inputs.flowOp) / M3H_TO_GPM
        : finite(inputs.flowOp)
      : 0;
  const belowMcsf =
    !invalid && qOpM3h > 0 && qOpM3h + 1e-9 < qMcsfM3h;

  const pRatedKw = si.pRatedW / 1000;
  const deltaTMarginK = si.dTmaxK - deltaTAtMcsfK;

  return {
    powerSoW,
    qMinThermalM3h: qMinThermalM3s * 3600,
    qMinHydroM3h: qMinHydroM3s * 3600,
    qMcsfM3h,
    governing,
    deltaTAtMcsfK,
    deltaTMarginK,
    deltaTEtaK,
    arcCv,
    bypassNps: bypass?.nps ?? null,
    bypassVelocityMs,
    bypassOverspeed,
    mcsfFractionOfBep:
      si.qBepM3s > 0 ? qMcsfM3s / si.qBepM3s : 0,
    highEnergy: pRatedKw > 300,
    hotService: !invalid && si.tempC >= 100,
    belowMcsf,
    soRatioOutOfBand: soRatio < 0.4 || soRatio > 0.6,
    hydroRatioOutOfBand: mcsfRatio < 0.3 || mcsfRatio > 0.6,
    invalid,
  };
}

function formatFlow(qM3h: number, flowUnit: McsfFlowUnit): string {
  if (!Number.isFinite(qM3h) || qM3h <= 0) {
    return flowUnit === "gpm" ? "— GPM" : "— m³/h";
  }
  if (flowUnit === "gpm") {
    const gpm = qM3h * M3H_TO_GPM;
    return `${gpm >= 100 ? gpm.toFixed(0) : gpm.toFixed(1)} GPM`;
  }
  return `${qM3h >= 100 ? qM3h.toFixed(1) : qM3h.toFixed(2)} m³/h`;
}

function formatPower(pW: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(pW) || pW <= 0) {
    return unitSystem === "imperial" ? "— HP" : "— kW";
  }
  if (unitSystem === "imperial") {
    const hp = (pW / 1000) * KW_TO_HP;
    return `${hp >= 10 ? hp.toFixed(1) : hp.toFixed(2)} HP`;
  }
  const kw = pW / 1000;
  return `${kw >= 10 ? kw.toFixed(1) : kw.toFixed(2)} kW`;
}

function formatDeltaT(dTK: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(dTK) || dTK < 0) {
    return unitSystem === "imperial" ? "— °F" : "— °C";
  }
  if (unitSystem === "imperial") {
    return `${(dTK * 1.8).toFixed(1)} °F`;
  }
  return `${dTK.toFixed(2)} °C`;
}

function formatNps(nps: string | null): string {
  if (!nps) return "—";
  const n = Number(nps);
  if (!Number.isFinite(n)) return `NPS ${nps}`;
  if (n < 1) return `NPS ${nps}"`;
  return Number.isInteger(n) ? `NPS ${n}"` : `NPS ${nps}"`;
}

function formatVelocity(vMs: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(vMs) || vMs <= 0) {
    return unitSystem === "imperial" ? "— ft/s" : "— m/s";
  }
  if (unitSystem === "imperial") {
    return `${(vMs / 0.3048).toFixed(1)} ft/s`;
  }
  return `${vMs.toFixed(2)} m/s`;
}

function statusFor(c: PumpMcsfComputed): {
  level: StatusLevel;
  label: string;
} {
  if (c.invalid) {
    return {
      level: "warn",
      label: "Enter positive Q_BEP, H_so, P_rated, ρ, Cp, ΔT_max, and bypass ΔP",
    };
  }
  if (c.belowMcsf) {
    return {
      level: "fail",
      label:
        "Operating flow is below governing Q_MCSF — thermal / vibration risk (raise recycle or trip)",
    };
  }
  if (c.governing === "thermal") {
    return {
      level: "warn",
      label: `Thermal bound governs — Q_MCSF = Q_min,th (${(c.mcsfFractionOfBep * 100).toFixed(0)}% of Q_BEP)`,
    };
  }
  if (c.highEnergy) {
    return {
      level: "warn",
      label:
        "High-energy pump (P_rated > 300 kW) — ARC / continuous min-flow protection is mandatory",
    };
  }
  if (c.bypassOverspeed) {
    return {
      level: "warn",
      label:
        "Bypass velocity exceeds v_max even at NPS 12\" Sch 40 — enlarge line or raise v_max with care",
    };
  }
  if (c.soRatioOutOfBand || c.hydroRatioOutOfBand) {
    return {
      level: "warn",
      label:
        "P_so or hydro MCSF ratio outside typical API/OEM band — confirm curve values",
    };
  }
  return {
    level: "pass",
    label: `Hydrodynamic MCSF governs — confirm OEM curve (API 610 / HI 9.6.1)`,
  };
}

export function calculatePumpMcsf(
  inputs: PumpMcsfInputs,
): CalculatorOutput {
  const c = computePumpMcsf(inputs);
  const status = statusFor(c);
  const fluidLabel =
    MCSF_FLUID_OPTIONS.find((f) => f.value === inputs.fluid)?.label ??
    inputs.fluid;

  const qGov = c.invalid
    ? "—"
    : formatFlow(c.qMcsfM3h, inputs.flowUnit);
  const qTh = c.invalid
    ? "—"
    : formatFlow(c.qMinThermalM3h, inputs.flowUnit);
  const qHy = c.invalid
    ? "—"
    : formatFlow(c.qMinHydroM3h, inputs.flowUnit);
  const pSo = c.invalid
    ? "—"
    : formatPower(c.powerSoW, inputs.unitSystem);
  const dT = c.invalid
    ? "—"
    : formatDeltaT(c.deltaTAtMcsfK, inputs.unitSystem);
  const cvOut =
    c.invalid || c.arcCv <= 0 ? "—" : c.arcCv.toFixed(c.arcCv >= 10 ? 1 : 2);
  const npsOut = c.invalid ? "—" : formatNps(c.bypassNps);
  const govLabel =
    c.governing === "thermal"
      ? "Thermal"
      : c.governing === "hydro"
        ? "Hydro"
        : "Tie";
  const qOpOut =
    finite(inputs.flowOp) > 0
      ? formatFlow(
          inputs.flowUnit === "gpm"
            ? finite(inputs.flowOp) / M3H_TO_GPM
            : finite(inputs.flowOp),
          inputs.flowUnit,
        )
      : "— (not entered)";

  return {
    heroLabel: "Governing Q_MCSF",
    heroValue: qGov,
    heroStatus: status.label,
    heroStatusLevel: status.level,
    heroBadges: [
      { label: "Governs", value: govLabel },
      { label: "Q_min,th", value: qTh },
      { label: "Q_min,hydro", value: qHy },
      { label: "ΔT @ MCSF", value: dT },
      { label: "ARC Cv", value: cvOut },
    ],
    summary: [
      { label: "Q_MCSF", value: qGov },
      { label: "Governs", value: govLabel },
      { label: "ARC Cv", value: cvOut },
    ],
    summaryStatus: {
      label:
        "API 610 / ISO 13709 / HI 9.6.1 screening — not a substitute for OEM MCSF or ARC vendor sizing",
      level: "neutral",
    },
    rows: [
      {
        label: "Fluid",
        value: fluidLabel,
        section: "Duty & fluid",
      },
      {
        label: "Q_BEP",
        value:
          inputs.flowUnit === "gpm"
            ? `${finite(inputs.flowBep).toFixed(finite(inputs.flowBep) >= 100 ? 0 : 1)} GPM`
            : `${finite(inputs.flowBep).toFixed(finite(inputs.flowBep) >= 100 ? 1 : 2)} m³/h`,
        section: "Duty & fluid",
      },
      {
        label: "Operating flow Q_op",
        value: qOpOut,
        section: "Duty & fluid",
        warn: c.belowMcsf,
      },
      {
        label: "H_so (shut-off head)",
        value:
          inputs.unitSystem === "imperial"
            ? `${finite(inputs.headShutoff).toFixed(0)} ft`
            : `${finite(inputs.headShutoff).toFixed(1)} m`,
        section: "Duty & fluid",
      },
      {
        label: "P_rated",
        value:
          inputs.unitSystem === "imperial"
            ? `${finite(inputs.powerRated).toFixed(0)} HP`
            : `${finite(inputs.powerRated).toFixed(1)} kW`,
        section: "Duty & fluid",
        warn: c.highEnergy,
      },
      {
        label: "P_so (shut-off power)",
        value: pSo,
        section: "Power & ratios",
        emphasis: true,
      },
      {
        label: "P_so / P_rated",
        value: `${(finite(inputs.soPowerRatio) * 100).toFixed(0)} %`,
        section: "Power & ratios",
        warn: c.soRatioOutOfBand,
      },
      {
        label: "Hydro MCSF ratio",
        value: `${(finite(inputs.mcsfRatio) * 100).toFixed(0)} % of Q_BEP`,
        section: "Power & ratios",
        warn: c.hydroRatioOutOfBand,
      },
      {
        label: "Q_min,thermal",
        value: qTh,
        section: "MCSF boundaries",
        emphasis: c.governing === "thermal",
        warn: c.governing === "thermal",
      },
      {
        label: "Q_min,hydro",
        value: qHy,
        section: "MCSF boundaries",
        emphasis: c.governing === "hydro",
      },
      {
        label: "Governing Q_MCSF",
        value: qGov,
        section: "MCSF boundaries",
        emphasis: true,
      },
      {
        label: "Governing basis",
        value:
          c.governing === "thermal"
            ? "Thermal (ΔT / energy balance)"
            : c.governing === "hydro"
              ? "Hydrodynamic / vibration"
              : "Thermal ≈ hydrodynamic",
        section: "MCSF boundaries",
      },
      {
        label: "Q_MCSF / Q_BEP",
        value: c.invalid
          ? "—"
          : `${(c.mcsfFractionOfBep * 100).toFixed(1)} %`,
        section: "MCSF boundaries",
      },
      {
        label: "ΔT at Q_MCSF",
        value: dT,
        section: "Thermal check",
        emphasis: true,
      },
      {
        label: "ΔT_max allow",
        value:
          inputs.unitSystem === "imperial"
            ? `${finite(inputs.deltaTMax).toFixed(1)} °F`
            : `${finite(inputs.deltaTMax).toFixed(1)} °C`,
        section: "Thermal check",
      },
      {
        label: "ΔT margin (max − at MCSF)",
        value: c.invalid
          ? "—"
          : formatDeltaT(Math.max(0, c.deltaTMarginK), inputs.unitSystem),
        section: "Thermal check",
        warn: !c.invalid && c.deltaTMarginK < 0,
      },
      {
        label: "HI-style ΔT (η_min @ H_so)",
        value: c.invalid
          ? "—"
          : formatDeltaT(c.deltaTEtaK, inputs.unitSystem),
        section: "Thermal check",
      },
      {
        label: "ARC valve Cv (US)",
        value: cvOut,
        section: "Bypass / ARC",
        emphasis: true,
      },
      {
        label: "Recommended bypass NPS (Sch 40)",
        value: npsOut,
        section: "Bypass / ARC",
        emphasis: true,
        warn: c.bypassOverspeed,
      },
      {
        label: "Bypass velocity @ Q_MCSF",
        value: c.invalid
          ? "—"
          : formatVelocity(c.bypassVelocityMs, inputs.unitSystem),
        section: "Bypass / ARC",
        warn: c.bypassOverspeed,
      },
    ],
    callouts: [
      {
        tone: "info",
        title: "API 610 / HI 9.6.1 MCSF screen",
        body: "Governing Q_MCSF is the larger of thermal and hydrodynamic minima. Never operate continuously below the OEM MCSF; use ARC, control valve bypass, or orifice recirculation sized for at least Q_MCSF.",
        items: [
          "Thermal Q_min uses energy balance: Q = P_so / [ρ(Cp·ΔT_max + g·H_so)].",
          "Hydrodynamic Q_min defaults to ~30–60% of Q_BEP (OEM / specific-speed dependent).",
          "High-energy pumps (≳ 300 kW) typically require automatic continuous min-flow protection.",
        ],
      },
      ...(c.belowMcsf
        ? [
            {
              tone: "warn" as const,
              title: "Below MCSF — thermal / vibration risk",
              body: `Entered operating flow (${qOpOut}) is below governing Q_MCSF (${qGov}). Continuous duty here risks temperature rise, seal flush breakdown, stall, and bearing distress. Raise continuous recycle or enforce a trip / ARC setpoint at ≥ Q_MCSF.`,
            },
          ]
        : []),
      ...(c.highEnergy
        ? [
            {
              tone: "warn" as const,
              title: "High-energy pump alert",
              body: "Rated driver power exceeds the 300 kW (≈ 400 HP) high-energy screen. Strict ARC / automatic recirculation continuous bypass is mandatory practice under API 610 — do not rely on intermittent operator bypass.",
            },
          ]
        : []),
      ...(c.governing === "thermal" && !c.invalid
        ? [
            {
              tone: "warn" as const,
              title: "Thermal runaway boundary",
              body: `Thermal minimum (${qTh}) exceeds the hydrodynamic screen. Operating below Q_min,th risks rapid temperature rise, seal flush breakdown, flashing, and seizure. Size continuous recirculation for at least the governing Q_MCSF.`,
            },
          ]
        : []),
      ...(!c.invalid && c.governing === "hydro"
        ? [
            {
              tone: "info" as const,
              title: "Vibration / recirculation limit",
              body: `Hydrodynamic MCSF (${qHy}) governs. Operation below this band increases internal recirculation, stall, and bearing / seal distress (API 610 low-flow guidance). Confirm the published OEM MCSF on the curve.`,
            },
          ]
        : []),
      ...(c.hotService
        ? [
            {
              tone: "info" as const,
              title: "Hot-service note",
              body: "Fluid temperature ≥ 100 °C. Recheck vapor pressure / NPSHa and seal flush plan — this MCSF screen does not replace NPSH or flashing analysis.",
            },
          ]
        : []),
      ...(c.bypassOverspeed
        ? [
            {
              tone: "warn" as const,
              title: "Bypass line velocity",
              body: "Even the largest screened Sch 40 size (NPS 12\") exceeds v_max at Q_MCSF. Increase line size beyond the table, split bypass paths, or revisit v_max with project piping standards.",
            },
          ]
        : []),
    ],
    exportRows: [
      { label: "Standard", value: "API 610 / ISO 13709 / HI 9.6.1" },
      { label: "Fluid", value: fluidLabel },
      {
        label: "Q_BEP",
        value: `${finite(inputs.flowBep)} ${inputs.flowUnit === "gpm" ? "GPM" : "m³/h"}`,
      },
      {
        label: "Q_op",
        value:
          finite(inputs.flowOp) > 0
            ? `${finite(inputs.flowOp)} ${inputs.flowUnit === "gpm" ? "GPM" : "m³/h"}`
            : "—",
      },
      {
        label: "H_so",
        value: `${finite(inputs.headShutoff)} ${inputs.unitSystem === "imperial" ? "ft" : "m"}`,
      },
      {
        label: "P_rated",
        value: `${finite(inputs.powerRated)} ${inputs.unitSystem === "imperial" ? "HP" : "kW"}`,
      },
      { label: "P_so", value: pSo },
      { label: "Q_min,th", value: qTh },
      { label: "Q_min,hydro", value: qHy },
      { label: "Q_MCSF", value: qGov },
      { label: "Governing", value: c.governing },
      { label: "ΔT @ MCSF", value: dT },
      { label: "ARC Cv", value: cvOut },
      { label: "Bypass NPS", value: npsOut },
      {
        label: "High energy",
        value: c.highEnergy ? "YES (>300 kW)" : "No",
      },
      {
        label: "Below MCSF",
        value: c.belowMcsf ? "YES" : "No",
      },
    ],
  };
}

