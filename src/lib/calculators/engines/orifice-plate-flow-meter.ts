/**
 * ISO 5167-2 Orifice Plate Flow & Permanent Pressure Loss — screening.
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  ORIFICE_AIR_DENSITY_KG_M3,
  ORIFICE_AIR_VISCOSITY_CP,
  ORIFICE_BETA_RANGE,
  ORIFICE_RE_MIN,
  ORIFICE_WATER_DENSITY_KG_M3,
  ORIFICE_WATER_VISCOSITY_CP,
  permanentPressureLoss,
  readerHarrisGallagherC,
  type OrificeTapType,
} from "@/lib/calculators/data/iso5167OrificeData";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
} from "@/lib/data/loaders";
import { lbFt3ToKgM3, mmToIn } from "@/lib/unitConverter";

export type OrificePlateFlowInputs = {
  unitSystem: UnitSystem;
  nps: string;
  schedule: string;
  /** Orifice bore d — mm (metric) or in (imperial). */
  orificeDiameter: number;
  /** Differential pressure Δp — kPa (metric) or psi (imperial). */
  deltaP: number;
  /** Density ρ — kg/m³ or lb/ft³. */
  fluidDensity: number;
  /** Dynamic viscosity μ — cP (both systems). */
  dynamicViscosity: number;
  tapType: OrificeTapType;
};

export const ORIFICE_DIAMETER_RANGE = { min: 5, max: 500 } as const; // mm basis
export const DELTA_P_RANGE = { min: 0.1, max: 500 } as const; // kPa basis
export const DENSITY_RANGE = { min: 0.5, max: 2000 } as const; // kg/m³
export const VISCOSITY_RANGE = { min: 0.01, max: 500 } as const; // cP

export const DEFAULT_ORIFICE_PLATE_FLOW_INPUTS: OrificePlateFlowInputs = {
  unitSystem: "metric",
  nps: "4",
  schedule: "40",
  orificeDiameter: 50,
  deltaP: 25,
  fluidDensity: ORIFICE_WATER_DENSITY_KG_M3,
  dynamicViscosity: ORIFICE_WATER_VISCOSITY_CP,
  tapType: "flange",
};

export {
  ORIFICE_WATER_DENSITY_KG_M3,
  ORIFICE_WATER_VISCOSITY_CP,
  ORIFICE_AIR_DENSITY_KG_M3,
  ORIFICE_AIR_VISCOSITY_CP,
};

export type OrificePlateFlowComputed = {
  invalid: boolean;
  invalidReason?: string;
  nps: string;
  schedule: string;
  diMm: number;
  dMm: number;
  beta: number;
  betaOk: boolean;
  deltaPKpa: number;
  rhoKgM3: number;
  muPaS: number;
  C: number;
  epsilon: number;
  qmKgS: number;
  qmKgH: number;
  qM3h: number;
  qGpm: number;
  permanentLossKpa: number;
  reD: number;
  reOk: boolean;
  vPipeMs: number;
  vOrificeMs: number;
  tapType: OrificeTapType;
};

const CP_TO_PA_S = 0.001;
const IN_TO_MM = 25.4;
const KPA_TO_PSI = 1 / 6.894757;
const M3H_TO_GPM = 4.402867655;

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function normalizeNps(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/"/g, "").replace(/in$/, "");
  return t || "4";
}

function toMetric(inputs: OrificePlateFlowInputs): {
  dMm: number;
  deltaPKpa: number;
  rhoKgM3: number;
  muCp: number;
} {
  if (inputs.unitSystem !== "imperial") {
    return {
      dMm: inputs.orificeDiameter,
      deltaPKpa: inputs.deltaP,
      rhoKgM3: inputs.fluidDensity,
      muCp: inputs.dynamicViscosity,
    };
  }
  return {
    dMm: inputs.orificeDiameter * IN_TO_MM,
    deltaPKpa: inputs.deltaP / KPA_TO_PSI, // psi → kPa: * 6.894757
    rhoKgM3: lbFt3ToKgM3(inputs.fluidDensity),
    muCp: inputs.dynamicViscosity,
  };
}

function computeMassFlowKgS(
  C: number,
  beta: number,
  epsilon: number,
  dM: number,
  rho: number,
  deltaPPa: number,
): number {
  const approach = Math.sqrt(1 - Math.pow(beta, 4));
  if (!(approach > 0) || !(dM > 0) || !(rho > 0) || !(deltaPPa > 0)) return NaN;
  return (
    (C / approach) *
    epsilon *
    (Math.PI / 4) *
    dM *
    dM *
    Math.sqrt(2 * rho * deltaPPa)
  );
}

export function computeOrificePlateFlow(
  inputs: OrificePlateFlowInputs,
): OrificePlateFlowComputed {
  const nps = normalizeNps(inputs.nps);
  const schedule =
    inputs.schedule?.trim() || defaultScheduleForNps(nps) || "40";
  const metric = toMetric(inputs);
  const dMm = clamp(metric.dMm, ORIFICE_DIAMETER_RANGE.min, ORIFICE_DIAMETER_RANGE.max);
  const deltaPKpa = clamp(metric.deltaPKpa, DELTA_P_RANGE.min, DELTA_P_RANGE.max);
  const rhoKgM3 = clamp(metric.rhoKgM3, DENSITY_RANGE.min, DENSITY_RANGE.max);
  const muCp = clamp(metric.muCp, VISCOSITY_RANGE.min, VISCOSITY_RANGE.max);
  const muPaS = muCp * CP_TO_PA_S;
  const tapType = inputs.tapType ?? "flange";
  const entry = getPipeScheduleEntry(nps, schedule);

  const empty = (reason: string): OrificePlateFlowComputed => ({
    invalid: true,
    invalidReason: reason,
    nps,
    schedule,
    diMm: NaN,
    dMm,
    beta: NaN,
    betaOk: false,
    deltaPKpa,
    rhoKgM3,
    muPaS,
    C: NaN,
    epsilon: 1,
    qmKgS: NaN,
    qmKgH: NaN,
    qM3h: NaN,
    qGpm: NaN,
    permanentLossKpa: NaN,
    reD: NaN,
    reOk: false,
    vPipeMs: NaN,
    vOrificeMs: NaN,
    tapType,
  });

  if (!entry || !(entry.row.insideDiameterMm > 0)) {
    return empty("Select a valid NPS and schedule with known inside diameter");
  }
  if (!(dMm > 0) || !(deltaPKpa > 0) || !(rhoKgM3 > 0)) {
    return empty("Orifice diameter, Δp, and density must be greater than zero");
  }

  const diMm = entry.row.insideDiameterMm;
  if (!(dMm < diMm)) {
    return empty(
      `Orifice bore d must be smaller than pipe inside diameter D_i (${diMm.toFixed(2)} mm). Reduce d or choose a larger NPS.`,
    );
  }
  const beta = dMm / diMm;
  const betaOk =
    beta >= ORIFICE_BETA_RANGE.min && beta <= ORIFICE_BETA_RANGE.max;
  const dM = dMm / 1000;
  const DiM = diMm / 1000;
  const deltaPPa = deltaPKpa * 1000;
  const epsilon = 1; // liquid / incompressible screening

  let C = 0.6;
  let qmKgS = computeMassFlowKgS(C, beta, epsilon, dM, rhoKgM3, deltaPPa);
  let reD = (4 * qmKgS) / (Math.PI * muPaS * DiM);

  for (let i = 0; i < 12; i++) {
    C = readerHarrisGallagherC(beta, Math.max(reD, 100), tapType, diMm);
    qmKgS = computeMassFlowKgS(C, beta, epsilon, dM, rhoKgM3, deltaPPa);
    if (!Number.isFinite(qmKgS) || qmKgS <= 0) {
      return empty("Could not converge orifice mass flow — check inputs");
    }
    reD = (4 * qmKgS) / (Math.PI * muPaS * DiM);
  }

  const qmKgH = qmKgS * 3600;
  const qM3h = (qmKgS / rhoKgM3) * 3600;
  const qGpm = qM3h * M3H_TO_GPM;
  const permanentLossKpa = permanentPressureLoss(deltaPKpa, beta);
  const areaPipe = (Math.PI / 4) * DiM * DiM;
  const areaOrifice = (Math.PI / 4) * dM * dM;
  const vPipeMs = qmKgS / (rhoKgM3 * areaPipe);
  const vOrificeMs = qmKgS / (rhoKgM3 * areaOrifice);
  const reOk = reD >= ORIFICE_RE_MIN;

  return {
    invalid: false,
    nps,
    schedule,
    diMm,
    dMm,
    beta,
    betaOk,
    deltaPKpa,
    rhoKgM3,
    muPaS,
    C,
    epsilon,
    qmKgS,
    qmKgH,
    qM3h,
    qGpm,
    permanentLossKpa,
    reD,
    reOk,
    vPipeMs,
    vOrificeMs,
    tapType,
  };
}

export function calculateOrificePlateFlow(
  inputs: OrificePlateFlowInputs,
): CalculatorOutput {
  const c = computeOrificePlateFlow(inputs);
  const imperial = inputs.unitSystem === "imperial";

  const tapLabel =
    c.tapType === "corner"
      ? "corner taps"
      : c.tapType === "d-and-d2"
        ? "D and D/2 taps"
        : "flange taps";

  const callouts: ResultCallout[] = [];
  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Check orifice / pipe inputs",
      body: c.invalidReason,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Screening Note",
      body: `Flow and discharge coefficient C follow ISO 5167-2 Reader-Harris/Gallagher (${tapLabel}). Valid for Re_D ≥ 5000 and 0.10 ≤ β ≤ 0.75 with straight lengths per §6.2. Expansibility ε = 1.0 (liquid / incompressible screening).`,
    });
    if (c.rhoKgM3 < 50) {
      callouts.push({
        tone: "warn",
        title: "Gas density — ε held at 1.0",
        body: "Low density looks like a gas. Full ISO 5167 gas metering needs expansibility ε(κ, Δp/p₁) and upstream absolute pressure. Treat this Q as approximate screening only.",
      });
    }
    if (!c.betaOk) {
      callouts.push({
        tone: "warn",
        title: "Beta ratio outside ISO range",
        body: `β = ${c.beta.toFixed(3)} is outside 0.10–0.75. Results are extrapolated screening only — resize bore or pipe.`,
      });
    }
    if (!c.reOk) {
      callouts.push({
        tone: "warn",
        title: "Low pipe Reynolds number",
        body: `Re_D = ${Math.round(c.reD).toLocaleString("en-US")} is below 5000. ISO 5167-2 C is for turbulent flow — treat as approximate.`,
      });
    }
  }

  const heroValue = c.invalid
    ? "—"
    : imperial
      ? `${c.qGpm.toFixed(1)} GPM · ${c.qM3h.toFixed(1)} m³/h`
      : `${c.qM3h.toFixed(1)} m³/h · ${c.qGpm.toFixed(1)} GPM`;

  const lossDisplay = c.invalid
    ? "—"
    : imperial
      ? `${(c.permanentLossKpa * KPA_TO_PSI).toFixed(2)} psi`
      : `${c.permanentLossKpa.toFixed(1)} kPa`;

  const diDisplay = c.invalid
    ? "—"
    : imperial
      ? `${mmToIn(c.diMm).toFixed(3)} in · ${c.diMm.toFixed(2)} mm`
      : `${c.diMm.toFixed(2)} mm · ${mmToIn(c.diMm).toFixed(3)} in`;
  const dDisplay = c.invalid
    ? "—"
    : imperial
      ? `${mmToIn(c.dMm).toFixed(3)} in · ${c.dMm.toFixed(2)} mm`
      : `${c.dMm.toFixed(2)} mm · ${mmToIn(c.dMm).toFixed(3)} in`;
  const reDisplay = c.invalid
    ? "—"
    : c.reD >= 1e6
      ? c.reD.toExponential(2)
      : Math.round(c.reD).toLocaleString("en-US");

  const statusLevel = c.invalid
    ? "fail"
    : !c.betaOk || !c.reOk
      ? "warn"
      : "neutral";

  const rows: ResultRow[] = [];
  if (!c.invalid) {
    rows.push(
      {
        section: "Flow",
        label: "Mass flow q_m",
        value: imperial
          ? `${(c.qmKgH * 2.2046226218).toFixed(0)} lb/h (${c.qmKgH.toFixed(0)} kg/h)`
          : `${c.qmKgH.toFixed(0)} kg/h (${(c.qmKgH * 2.2046226218).toFixed(0)} lb/h)`,
        emphasis: true,
      },
      {
        section: "Pressure",
        label: "Permanent pressure loss",
        value: imperial
          ? `${(c.permanentLossKpa * KPA_TO_PSI).toFixed(2)} psi (${c.permanentLossKpa.toFixed(1)} kPa)`
          : `${c.permanentLossKpa.toFixed(1)} kPa (${(c.permanentLossKpa * KPA_TO_PSI).toFixed(2)} psi)`,
        emphasis: true,
      },
      {
        section: "Geometry",
        label: "Pipe inside diameter D_i",
        value: diDisplay,
      },
      {
        section: "Geometry",
        label: "Orifice bore d",
        value: dDisplay,
      },
      {
        section: "Velocity",
        label: "Pipe velocity v_p",
        value: imperial
          ? `${(c.vPipeMs * 3.28084).toFixed(2)} ft/s (${c.vPipeMs.toFixed(2)} m/s)`
          : `${c.vPipeMs.toFixed(2)} m/s (${(c.vPipeMs * 3.28084).toFixed(2)} ft/s)`,
      },
      {
        section: "Velocity",
        label: "Orifice velocity v_o",
        value: imperial
          ? `${(c.vOrificeMs * 3.28084).toFixed(2)} ft/s (${c.vOrificeMs.toFixed(2)} m/s)`
          : `${c.vOrificeMs.toFixed(2)} m/s (${(c.vOrificeMs * 3.28084).toFixed(2)} ft/s)`,
      },
      {
        section: "Validation",
        label: "Pipe Reynolds Re_D",
        value: reDisplay,
        warn: !c.reOk,
      },
      {
        section: "Validation",
        label: "ISO β check",
        value: c.betaOk ? "Within 0.10–0.75" : "Outside 0.10–0.75",
        warn: !c.betaOk,
      },
    );
  }

  return {
    heroLabel: "Volumetric flow Q",
    heroValue,
    heroStatus: c.invalid
      ? "Check inputs"
      : `β ${c.beta.toFixed(3)} · C ${c.C.toFixed(3)}`,
    heroStatusLevel: statusLevel,
    heroBadges: c.invalid
      ? undefined
      : [
          { label: "β", value: c.beta.toFixed(3) },
          { label: "C", value: c.C.toFixed(3) },
          { label: "Loss", value: lossDisplay },
          {
            label: "v_o",
            value: imperial
              ? `${(c.vOrificeMs * 3.28084).toFixed(1)} ft/s`
              : `${c.vOrificeMs.toFixed(1)} m/s`,
          },
        ],
    summary: [
      {
        label: "Beta ratio β",
        value: c.invalid ? "—" : c.beta.toFixed(3),
      },
      {
        label: "Discharge C",
        value: c.invalid ? "—" : c.C.toFixed(4),
      },
      {
        label: "Permanent loss",
        value: lossDisplay,
      },
      {
        label: "Orifice velocity v_o",
        value: c.invalid
          ? "—"
          : imperial
            ? `${(c.vOrificeMs * 3.28084).toFixed(2)} ft/s`
            : `${c.vOrificeMs.toFixed(2)} m/s`,
      },
      {
        label: "Re_D",
        value: reDisplay,
      },
    ],
    summaryStatus: {
      label: c.invalid
        ? "Check inputs"
        : !c.betaOk
          ? "β out of range"
          : !c.reOk
            ? "Low Re_D"
            : "ISO 5167-2",
      level: statusLevel,
    },
    rows,
    callouts,
    exportRows: [
      { label: "Standard", value: "ISO 5167-2 / ASME MFC-3M · RG C" },
      { label: "NPS", value: c.nps },
      { label: "Schedule", value: c.schedule },
      { label: "Tap type", value: c.tapType },
      {
        label: "D_i mm",
        value: c.invalid ? "—" : c.diMm.toFixed(3),
      },
      {
        label: "d mm",
        value: c.invalid ? "—" : c.dMm.toFixed(3),
      },
      {
        label: "beta",
        value: c.invalid ? "—" : c.beta.toFixed(5),
      },
      {
        label: "C",
        value: c.invalid ? "—" : c.C.toFixed(5),
      },
      {
        label: "deltaP kPa",
        value: c.invalid ? "—" : c.deltaPKpa.toFixed(4),
      },
      {
        label: "permanentLoss kPa",
        value: c.invalid ? "—" : c.permanentLossKpa.toFixed(4),
      },
      {
        label: "Q m3/h",
        value: c.invalid ? "—" : c.qM3h.toFixed(4),
      },
      {
        label: "Q GPM",
        value: c.invalid ? "—" : c.qGpm.toFixed(4),
      },
      {
        label: "qm kg/h",
        value: c.invalid ? "—" : c.qmKgH.toFixed(3),
      },
      {
        label: "Re_D",
        value: c.invalid ? "—" : c.reD.toFixed(1),
      },
      {
        label: "rho kg/m3",
        value: c.invalid ? "—" : c.rhoKgM3.toFixed(3),
      },
    ],
  };
}

/** Helpers for unit sync / presets */
export function psiToKpa(psi: number): number {
  return psi * 6.894757;
}
