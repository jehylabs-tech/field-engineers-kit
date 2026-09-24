/**
 * PSV / Safety Relief Valve Reaction Force — API RP 520 Part II §4.2
 * (open-discharge vapor/gas screen) + ASME VIII-1 App. M guidance.
 *
 * Open discharge (SI internals):
 *   v = √[ 2k/(k+1) · (R/M) · T ]     [m/s]  — sonic exit from stagnation T
 *   F_mom = (W/3600) · v               [N]
 *   P_e from continuity at sonic exit with T_e = T · 2/(k+1)
 *   F_press = max(0, P_e − P_atm) · A  [N]
 *   F_steady = F_mom + F_press
 *   F_total = F_steady · DLF
 *
 * Matches API 520 Part II US customary momentum term (W/366)·√[kT/((k+1)M)] when
 * converted to SI. Liquid / two-phase / water-hammer out of scope.
 */

import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  API520_GAS_OPTIONS,
  resolveApi520Gas,
  type Api520GasId,
} from "@/lib/calculators/data/api520GasProperties";
import { getPipeScheduleEntry } from "@/lib/data/loaders";

export type PsvDischargeType = "open-discharge" | "closed-header";
export type PsvOutletSchedule = "10" | "40" | "80";

export type PsvReactionForceInputs = {
  unitSystem: UnitSystem;
  dischargeType: PsvDischargeType;
  /** Relieving mass flow — kg/h or lb/h. */
  massFlow: number;
  /** Relieving temperature — °C or °F. */
  relievingTemperature: number;
  gasId: Api520GasId;
  molecularWeight: number;
  specificHeatRatio: number;
  outletNps: string;
  outletSchedule: PsvOutletSchedule;
  dynamicLoadFactor: number;
  /** Atmospheric pressure — barA or psia. */
  atmosphericPressure: number;
};

export const DEFAULT_PSV_REACTION_FORCE_INPUTS: PsvReactionForceInputs = {
  unitSystem: "metric",
  dischargeType: "open-discharge",
  massFlow: 25000,
  relievingTemperature: 180,
  gasId: "co2",
  molecularWeight: 44.01,
  specificHeatRatio: 1.3,
  outletNps: "4",
  outletSchedule: "40",
  dynamicLoadFactor: 2.0,
  atmosphericPressure: 1.013,
};

export const DEFAULT_PSV_REACTION_FORCE_INPUTS_IMPERIAL: PsvReactionForceInputs =
  {
    unitSystem: "imperial",
    dischargeType: "open-discharge",
    massFlow: 50000,
    relievingTemperature: 300,
    gasId: "air",
    molecularWeight: 28.97,
    specificHeatRatio: 1.4,
    outletNps: "4",
    outletSchedule: "40",
    dynamicLoadFactor: 2.0,
    atmosphericPressure: 14.7,
  };

const R_UNIV = 8314.462618; // J/(kmol·K)
const MM_PER_IN = 25.4;
const N_PER_LBF = 4.448221615;
const KG_H_PER_LB_H = 0.45359237;
/** Screening lever arm for nozzle base moment (open vent elbow). */
const VENT_ARM_M = 1.5;

export const PSV_OUTLET_NPS_OPTIONS = [
  "2",
  "3",
  "4",
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "18",
  "20",
  "24",
].map((nps) => ({ value: nps, label: `NPS ${nps}` }));

export const PSV_SCHEDULE_OPTIONS: { value: PsvOutletSchedule; label: string }[] =
  [
    { value: "10", label: "Sch 10" },
    { value: "40", label: "Sch 40" },
    { value: "80", label: "Sch 80" },
  ];

export const PSV_DISCHARGE_TYPE_OPTIONS: {
  value: PsvDischargeType;
  label: string;
}[] = [
  { value: "open-discharge", label: "Open discharge (vent)" },
  { value: "closed-header", label: "Closed header (screen)" },
];

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, finite(value)));
}

export function tempToKelvin(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === "imperial") {
    return ((finite(value) - 32) * 5) / 9 + 273.15;
  }
  return finite(value) + 273.15;
}

export function massFlowToKgH(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial"
    ? finite(value) * KG_H_PER_LB_H
    : finite(value);
}

export function pressureToPa(value: number, unitSystem: UnitSystem): number {
  // barA or psia → Pa
  return unitSystem === "imperial"
    ? finite(value) * 6894.757293
    : finite(value) * 1e5;
}

export type PsvReactionForceDetail = {
  massFlowKgH: number;
  tK: number;
  mw: number;
  k: number;
  idMm: number;
  areaM2: number;
  areaMm2: number;
  velocityMs: number;
  pExitPa: number;
  pAtmPa: number;
  fMomentumN: number;
  fPressureN: number;
  fSteadyN: number;
  fTotalN: number;
  dlf: number;
  bendingNm: number;
  dischargeType: PsvDischargeType;
  gasLabel: string;
  nps: string;
  schedule: string;
  invalid: boolean;
  invalidReason?: string;
};

/**
 * Sonic exit velocity from stagnation temperature (isentropic critical flow).
 * Numerically matches API 520 Part II US momentum term when converted to SI.
 */
export function sonicExitVelocityMs(k: number, mw: number, tK: number): number {
  const kk = clamp(k, 1.01, 1.7);
  const m = Math.max(mw, 1e-9);
  const t = Math.max(tK, 1);
  return Math.sqrt(((2 * kk) / (kk + 1)) * (R_UNIV / m) * t);
}

export function computePsvReactionForce(
  inputs: PsvReactionForceInputs,
): PsvReactionForceDetail {
  const unitSystem = inputs.unitSystem === "imperial" ? "imperial" : "metric";
  const gas = resolveApi520Gas(inputs.gasId);
  const mw =
    inputs.gasId === "custom"
      ? clamp(inputs.molecularWeight, 2, 200)
      : gas.molecularWeight;
  const k =
    inputs.gasId === "custom"
      ? clamp(inputs.specificHeatRatio, 1.01, 1.7)
      : gas.kRatio;
  const gasLabel = gas.label;

  const massFlowKgH = clamp(massFlowToKgH(inputs.massFlow, unitSystem), 100, 500000);
  const tK = clamp(tempToKelvin(inputs.relievingTemperature, unitSystem), 200, 900);
  const dlf = clamp(inputs.dynamicLoadFactor, 1.0, 2.0);
  const pAtmPa = clamp(pressureToPa(inputs.atmosphericPressure, unitSystem), 8e4, 1.2e5);

  const entry = getPipeScheduleEntry(inputs.outletNps, inputs.outletSchedule);
  if (!entry) {
    return {
      massFlowKgH,
      tK,
      mw,
      k,
      idMm: NaN,
      areaM2: NaN,
      areaMm2: NaN,
      velocityMs: NaN,
      pExitPa: NaN,
      pAtmPa,
      fMomentumN: NaN,
      fPressureN: NaN,
      fSteadyN: NaN,
      fTotalN: NaN,
      dlf,
      bendingNm: NaN,
      dischargeType: inputs.dischargeType,
      gasLabel,
      nps: inputs.outletNps,
      schedule: inputs.outletSchedule,
      invalid: true,
      invalidReason: `No pipe schedule for NPS ${inputs.outletNps} Sch ${inputs.outletSchedule}`,
    };
  }

  const idMm = entry.row.insideDiameterMm;
  const areaM2 = (Math.PI / 4) * (idMm / 1000) ** 2;
  const areaMm2 = areaM2 * 1e6;

  const velocityMs = sonicExitVelocityMs(k, mw, tK);
  const mDot = massFlowKgH / 3600; // kg/s
  const fMomentumN = mDot * velocityMs;

  // Sonic exit static pressure from continuity (T_e = T·2/(k+1))
  const tExitK = tK * (2 / (k + 1));
  const pExitPa =
    (mDot / Math.max(areaM2 * velocityMs, 1e-12)) * (R_UNIV * tExitK) / mw;

  const open = inputs.dischargeType === "open-discharge";
  const fPressureN = open ? Math.max(0, pExitPa - pAtmPa) * areaM2 : 0;
  const fSteadyN = fMomentumN + fPressureN;
  const fTotalN = fSteadyN * dlf;
  const bendingNm = fTotalN * VENT_ARM_M;

  return {
    massFlowKgH,
    tK,
    mw,
    k,
    idMm,
    areaM2,
    areaMm2,
    velocityMs,
    pExitPa,
    pAtmPa,
    fMomentumN,
    fPressureN,
    fSteadyN,
    fTotalN,
    dlf,
    bendingNm,
    dischargeType: inputs.dischargeType,
    gasLabel,
    nps: inputs.outletNps,
    schedule: inputs.outletSchedule,
    invalid: false,
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

export function calculatePsvReactionForce(
  inputs: PsvReactionForceInputs,
): CalculatorOutput {
  const unitSystem = inputs.unitSystem === "imperial" ? "imperial" : "metric";
  const d = computePsvReactionForce(inputs);
  const imperial = unitSystem === "imperial";

  if (d.invalid) {
    return {
      heroLabel: "Total reaction force F_total",
      heroValue: "—",
      heroStatus: d.invalidReason ?? "Invalid outlet pipe",
      heroStatusLevel: "warn",
      summary: [],
      summaryStatus: {
        label: d.invalidReason ?? "Invalid outlet pipe",
        level: "warn",
      },
      rows: [],
      callouts: [
        {
          tone: "warn",
          title: "Outlet pipe not found",
          body: d.invalidReason ?? "Select a valid NPS and schedule.",
        },
      ],
      exportRows: [],
    };
  }

  const fTotDisp = imperial ? d.fTotalN / N_PER_LBF : d.fTotalN / 1000;
  const fStDisp = imperial ? d.fSteadyN / N_PER_LBF : d.fSteadyN / 1000;
  const fMomDisp = imperial ? d.fMomentumN / N_PER_LBF : d.fMomentumN / 1000;
  const fPrDisp = imperial ? d.fPressureN / N_PER_LBF : d.fPressureN / 1000;
  const fUnit = imperial ? "lbf" : "kN";
  const fDigits = imperial ? 0 : 2;

  const pExitDisp = imperial ? d.pExitPa / 6894.757293 : d.pExitPa / 1e5;
  const pUnit = imperial ? "psia" : "barA";
  const vDisp = imperial ? d.velocityMs * 3.280839895 : d.velocityMs;
  const vUnit = imperial ? "ft/s" : "m/s";
  const idDisp = imperial ? d.idMm / MM_PER_IN : d.idMm;
  const idUnit = imperial ? "in" : "mm";
  const areaDisp = imperial ? d.areaMm2 / (MM_PER_IN * MM_PER_IN) : d.areaMm2;
  const areaUnit = imperial ? "in²" : "mm²";
  const wDisp = imperial ? d.massFlowKgH / KG_H_PER_LB_H : d.massFlowKgH;
  const wUnit = imperial ? "lb/h" : "kg/h";
  const mbImperial = d.bendingNm / 1.355817948;
  const mbShow = imperial ? mbImperial : d.bendingNm / 1000;
  const mbUnit = imperial ? "lbf·ft" : "kN·m";

  const statusLevel: StatusLevel = "pass";
  const statusLabel =
    d.dischargeType === "open-discharge"
      ? `Open discharge · DLF ${fmt(d.dlf, 1)}`
      : `Closed header screen · DLF ${fmt(d.dlf, 1)}`;

  const callouts: CalculatorOutput["callouts"] = [
    {
      tone: "warn",
      title: "API 520 Part II vapor/gas reaction screen",
      body:
        d.dischargeType === "closed-header"
          ? "Momentum-only closed-header screen. Header P₁/P₂ terms, liquid, two-phase, and water-hammer need dedicated transient piping analysis."
          : "Open-discharge vapor/gas thrust per API RP 520 Part II §4.2 (momentum + exit pressure). Liquid, two-phase, and water-hammer need dedicated transient piping analysis.",
    },
  ];
  if (d.dischargeType === "open-discharge" && d.dlf >= 1.5) {
    callouts.push({
      tone: "info",
      title: "DLF for open vent popping",
      body: "DLF 2.0 is the usual screening default for sudden popping on open vent elbows (API 520 Part II). Lower DLF only when project dynamics justify it.",
    });
  }

  return {
    heroLabel: "Total reaction force F_total",
    heroValue: `${fmt(fTotDisp, fDigits)} ${fUnit}`,
    heroStatus: statusLabel,
    heroStatusLevel: statusLevel,
    heroBadges: [
      {
        label: "F_steady",
        value: `${fmt(fStDisp, fDigits)} ${fUnit}`,
      },
      { label: "DLF", value: fmt(d.dlf, 1) },
    ],
    summary: [
      {
        label: "Exit pressure P_e",
        value: `${fmt(pExitDisp, imperial ? 1 : 2)} ${pUnit}`,
      },
      {
        label: "Exit velocity v",
        value: `${fmt(vDisp, 0)} ${vUnit}`,
      },
      {
        label: "Base moment (1.5 m arm)",
        value: `${fmt(mbShow, imperial ? 0 : 2)} ${mbUnit}`,
      },
    ],
    summaryStatus: {
      label: statusLabel,
      level: "neutral",
    },
    rows: [
      {
        section: "Outlet",
        label: "NPS · ID · A_exit",
        value: `NPS ${d.nps} Sch ${d.schedule} · ${fmt(idDisp, imperial ? 3 : 1)} ${idUnit} · ${fmt(areaDisp, imperial ? 2 : 0)} ${areaUnit}`,
      },
      {
        section: "Force components",
        label: "F_momentum · F_pressure",
        value: `${fmt(fMomDisp, fDigits)} · ${fmt(fPrDisp, fDigits)} ${fUnit}`,
        emphasis: true,
      },
      {
        section: "Duty",
        label: "W · gas (M, k)",
        value: `${fmt(wDisp, 0)} ${wUnit} · ${d.gasLabel} (M=${fmt(d.mw, 1)}, k=${fmt(d.k, 2)})`,
      },
    ],
    callouts,
    exportRows: [
      { label: "Unit system", value: unitSystem },
      { label: "Discharge type", value: d.dischargeType },
      { label: `Mass flow (${wUnit})`, value: fmt(wDisp, 1) },
      { label: "Gas", value: d.gasLabel },
      { label: "Molecular weight", value: fmt(d.mw, 2) },
      { label: "k = Cp/Cv", value: fmt(d.k, 3) },
      { label: "Temperature (K)", value: fmt(d.tK, 1) },
      { label: "Outlet NPS", value: d.nps },
      { label: "Outlet schedule", value: d.schedule },
      { label: `ID (${idUnit})`, value: fmt(idDisp, imperial ? 3 : 2) },
      { label: `A_exit (${areaUnit})`, value: fmt(areaDisp, imperial ? 3 : 1) },
      { label: `v (${vUnit})`, value: fmt(vDisp, 1) },
      { label: `P_e (${pUnit})`, value: fmt(pExitDisp, 3) },
      { label: `P_atm (${pUnit})`, value: fmt(imperial ? d.pAtmPa / 6894.757293 : d.pAtmPa / 1e5, 3) },
      { label: `F_momentum (${fUnit})`, value: fmt(fMomDisp, 3) },
      { label: `F_pressure (${fUnit})`, value: fmt(fPrDisp, 3) },
      { label: `F_steady (${fUnit})`, value: fmt(fStDisp, 3) },
      { label: "DLF", value: fmt(d.dlf, 2) },
      { label: `F_total (${fUnit})`, value: fmt(fTotDisp, 3) },
      { label: `M_bending (${mbUnit})`, value: fmt(mbShow, 3) },
      { label: "Vent arm (screening)", value: "1.5 m / 4.92 ft" },
    ],
  };
}

export { API520_GAS_OPTIONS, resolveApi520Gas };
export type { Api520GasId };
