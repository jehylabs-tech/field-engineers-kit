/**
 * Heat Exchanger LMTD & Duty — TEMA F · IAPWS-IF97 water/steam screening.
 *
 * Q from enthalpy (IAPWS Region 1/2) or custom Cp · ΔT.
 * ΔT_lm counterflow LMTD · F from TEMA 1–2n / multi-shell · A = Q/(U F ΔT_lm).
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  iapwsSaturationPressureMpa,
  region1Props,
  region2Props,
} from "@/lib/calculators/data/iapwsSteamData";
import { temaFFactor } from "@/lib/calculators/data/temaFFactor";
import { cToF, fToC } from "@/lib/unitConverter";

export type HxFluidType = "water" | "steam" | "custom";
export type HxShellPasses = 1 | 2 | 4;

export type HeatExchangerLmtdDutyInputs = {
  unitSystem: UnitSystem;
  fluidTypeHot: HxFluidType;
  /** Hot inlet — °C or °F. */
  tempHotIn: number;
  /** Hot outlet — °C or °F. */
  tempHotOut: number;
  /** Hot mass flow — kg/h or lb/hr. */
  massFlowHot: number;
  /** Custom hot Cp — kJ/(kg·K) metric or Btu/(lb·°F) imperial. */
  cpHot: number;
  fluidTypeCold: "water" | "custom";
  tempColdIn: number;
  tempColdOut: number;
  /** Custom cold Cp — same units as cpHot. */
  cpCold: number;
  shellPasses: HxShellPasses;
  /** Overall U — W/(m²·K) metric or Btu/(hr·ft²·°F) imperial. */
  overallU: number;
};

export const TEMP_HOT_RANGE_C = { min: 0, max: 600 } as const;
export const TEMP_HOT_RANGE_F = { min: 32, max: 1112 } as const;
export const TEMP_COLD_RANGE_C = { min: 0, max: 400 } as const;
export const TEMP_COLD_RANGE_F = { min: 32, max: 752 } as const;
export const MASS_FLOW_RANGE_KG_H = { min: 1, max: 1_000_000 } as const;
export const MASS_FLOW_RANGE_LB_HR = { min: 2, max: 2_200_000 } as const;
export const U_RANGE_SI = { min: 10, max: 10_000 } as const;
export const U_RANGE_IP = { min: 2, max: 1760 } as const;
export const CP_RANGE_SI = { min: 0.5, max: 10 } as const;
export const CP_RANGE_IP = { min: 0.12, max: 2.4 } as const;

/** Liquid water screening pressure for IAPWS Region 1 (1 bar abs). */
export const HX_WATER_P_MPA = 0.1;

export const F_DESIGN_MIN = 0.75;

export const DEFAULT_HEAT_EXCHANGER_LMTD_DUTY_INPUTS: HeatExchangerLmtdDutyInputs =
  {
    unitSystem: "metric",
    fluidTypeHot: "water",
    tempHotIn: 90,
    tempHotOut: 60,
    massFlowHot: 10_000,
    cpHot: 4.186,
    fluidTypeCold: "water",
    tempColdIn: 20,
    tempColdOut: 50,
    cpCold: 4.186,
    shellPasses: 1,
    overallU: 1200,
  };

const KW_TO_BTU_HR = 3412.141633;
const M2_TO_FT2 = 10.76391042;
const W_M2K_TO_BTU = 0.1761101837;
const KG_H_TO_LB_HR = 2.204622622;
const KJ_KGK_TO_BTU_LBF = 0.2388458966;

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function tempToC(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? fToC(value) : value;
}

function massToKgH(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? value / KG_H_TO_LB_HR : value;
}

function uToSi(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? value / W_M2K_TO_BTU : value;
}

function cpToSi(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? value / KJ_KGK_TO_BTU_LBF : value;
}

function hLiquidKjKg(tC: number, pMpa = HX_WATER_P_MPA): number {
  return region1Props(tC + 273.15, pMpa).h;
}

function meanCpLiquid(
  tInC: number,
  tOutC: number,
  pMpa = HX_WATER_P_MPA,
): number {
  const dT = tOutC - tInC;
  if (Math.abs(dT) < 1e-9) {
    const h = hLiquidKjKg(tInC, pMpa);
    const h2 = hLiquidKjKg(tInC + 0.5, pMpa);
    return (h2 - h) / 0.5;
  }
  return (hLiquidKjKg(tOutC, pMpa) - hLiquidKjKg(tInC, pMpa)) / dT;
}

/** Isothermal condenser: Q = ṁ · h_fg at Tsat = Th. */
function steamCondensationDuty(
  tSatC: number,
  massKgS: number,
): { qKw: number; hfg: number; pMpa: number } | null {
  if (!(tSatC > 0.01) || !(tSatC < 373.9)) return null;
  const tK = tSatC + 273.15;
  const pMpa = iapwsSaturationPressureMpa(tK);
  if (!(pMpa > 0) || !(pMpa < 22)) return null;
  const hf = region1Props(tK, pMpa).h;
  const hg = region2Props(tK, pMpa).h;
  const hfg = hg - hf;
  if (!(hfg > 0)) return null;
  return { qKw: massKgS * hfg, hfg, pMpa };
}

export type HeatExchangerLmtdDutyComputed = {
  invalid: boolean;
  invalidReason?: string;
  thInC: number;
  thOutC: number;
  tcInC: number;
  tcOutC: number;
  massHotKgH: number;
  massColdKgH: number;
  qKw: number;
  cpHotKjKgK: number;
  cpColdKjKgK: number;
  dT1C: number;
  dT2C: number;
  lmtdC: number;
  P: number;
  R: number;
  F: number;
  lmtdCorrC: number;
  uSi: number;
  areaM2: number;
  temperatureCross: boolean;
  fBelowDesign: boolean;
  shellPasses: number;
  hotMode: "water" | "steam-condense" | "steam-sensible" | "custom";
};

export function computeHeatExchangerLmtdDuty(
  inputs: HeatExchangerLmtdDutyInputs,
): HeatExchangerLmtdDutyComputed {
  const imperial = inputs.unitSystem === "imperial";
  const thInC = tempToC(inputs.tempHotIn, inputs.unitSystem);
  const thOutC = tempToC(inputs.tempHotOut, inputs.unitSystem);
  const tcInC = tempToC(inputs.tempColdIn, inputs.unitSystem);
  const tcOutC = tempToC(inputs.tempColdOut, inputs.unitSystem);
  const massHotKgH = massToKgH(inputs.massFlowHot, inputs.unitSystem);
  const uSi = uToSi(inputs.overallU, inputs.unitSystem);
  const shellPasses = inputs.shellPasses;

  const empty = (reason: string): HeatExchangerLmtdDutyComputed => ({
    invalid: true,
    invalidReason: reason,
    thInC,
    thOutC,
    tcInC,
    tcOutC,
    massHotKgH,
    massColdKgH: NaN,
    qKw: NaN,
    cpHotKjKgK: NaN,
    cpColdKjKgK: NaN,
    dT1C: NaN,
    dT2C: NaN,
    lmtdC: NaN,
    P: NaN,
    R: NaN,
    F: NaN,
    lmtdCorrC: NaN,
    uSi,
    areaM2: NaN,
    temperatureCross: false,
    fBelowDesign: false,
    shellPasses,
    hotMode: "water",
  });

  const tHotMax = imperial ? TEMP_HOT_RANGE_F.max : TEMP_HOT_RANGE_C.max;
  const tHotMin = imperial ? TEMP_HOT_RANGE_F.min : TEMP_HOT_RANGE_C.min;
  void tHotMax;
  void tHotMin;

  if (
    !(thInC >= TEMP_HOT_RANGE_C.min && thInC <= TEMP_HOT_RANGE_C.max) ||
    !(thOutC >= TEMP_HOT_RANGE_C.min && thOutC <= TEMP_HOT_RANGE_C.max)
  ) {
    return empty(
      `Hot temperatures must be ${TEMP_HOT_RANGE_C.min}–${TEMP_HOT_RANGE_C.max} °C (or °F equivalent)`,
    );
  }
  if (
    !(tcInC >= TEMP_COLD_RANGE_C.min && tcInC <= TEMP_COLD_RANGE_C.max) ||
    !(tcOutC >= TEMP_COLD_RANGE_C.min && tcOutC <= TEMP_COLD_RANGE_C.max)
  ) {
    return empty(
      `Cold temperatures must be ${TEMP_COLD_RANGE_C.min}–${TEMP_COLD_RANGE_C.max} °C (or °F equivalent)`,
    );
  }
  if (
    !(massHotKgH >= MASS_FLOW_RANGE_KG_H.min) ||
    !(massHotKgH <= MASS_FLOW_RANGE_KG_H.max)
  ) {
    return empty("Hot mass flow out of screening range");
  }
  if (!(uSi >= U_RANGE_SI.min) || !(uSi <= U_RANGE_SI.max)) {
    return empty("Overall U out of screening range");
  }
  if (!(tcOutC > tcInC)) {
    return empty("Cold outlet must be warmer than cold inlet");
  }

  const massKgS = massHotKgH / 3600;
  let qKw = NaN;
  let cpHotKjKgK = NaN;
  let hotMode: HeatExchangerLmtdDutyComputed["hotMode"] = "water";

  if (inputs.fluidTypeHot === "water") {
    if (!(thInC > thOutC)) {
      return empty("Hot water outlet must be cooler than hot inlet");
    }
    const hin = hLiquidKjKg(thInC);
    const hout = hLiquidKjKg(thOutC);
    qKw = massKgS * (hin - hout);
    cpHotKjKgK = (hin - hout) / (thInC - thOutC);
    hotMode = "water";
  } else if (inputs.fluidTypeHot === "steam") {
    const dT = Math.abs(thInC - thOutC);
    if (dT < 0.51) {
      const cond = steamCondensationDuty(thInC, massKgS);
      if (!cond) return empty("Steam saturation state out of IAPWS Region 1/2 range");
      qKw = cond.qKw;
      cpHotKjKgK = NaN;
      hotMode = "steam-condense";
    } else {
      // Sensible steam cool / desuperheat screening at Psat(Th_in)
      const pMpa = iapwsSaturationPressureMpa(thInC + 273.15);
      if (!(pMpa > 0)) return empty("Cannot resolve steam pressure from hot inlet");
      const hin = region2Props(thInC + 273.15, pMpa).h;
      let hout: number;
      if (thOutC < thInC - 0.5) {
        // Drop into condensate Region 1 at same Psat
        const tSat = thInC;
        if (thOutC < tSat - 0.5) {
          hout = region1Props(thOutC + 273.15, pMpa).h;
        } else {
          hout = region2Props(thOutC + 273.15, pMpa).h;
        }
      } else {
        return empty("Steam outlet must be ≤ steam inlet for cooling duty");
      }
      qKw = massKgS * (hin - hout);
      cpHotKjKgK =
        Math.abs(thInC - thOutC) > 1e-6
          ? (hin - hout) / (thInC - thOutC)
          : NaN;
      hotMode = "steam-sensible";
    }
  } else {
    if (!(thInC > thOutC)) {
      return empty("Hot custom fluid outlet must be cooler than inlet");
    }
    cpHotKjKgK = clamp(
      cpToSi(inputs.cpHot, inputs.unitSystem),
      CP_RANGE_SI.min,
      CP_RANGE_SI.max,
    );
    qKw = massKgS * cpHotKjKgK * (thInC - thOutC);
    hotMode = "custom";
  }

  if (!(qKw > 0) || !Number.isFinite(qKw)) {
    return empty("Heat duty could not be resolved from hot-side inputs");
  }

  let cpColdKjKgK: number;
  if (inputs.fluidTypeCold === "water") {
    cpColdKjKgK = meanCpLiquid(tcInC, tcOutC);
  } else {
    cpColdKjKgK = clamp(
      cpToSi(inputs.cpCold, inputs.unitSystem),
      CP_RANGE_SI.min,
      CP_RANGE_SI.max,
    );
  }
  if (!(cpColdKjKgK > 0)) {
    return empty("Cold-side Cp invalid");
  }

  const dTc = tcOutC - tcInC;
  const massColdKgH = (qKw * 3600) / (cpColdKjKgK * dTc);

  // Counterflow terminal differences
  const dT1C = thInC - tcOutC;
  const dT2C = thOutC - tcInC;
  if (!(dT1C > 0) || !(dT2C > 0)) {
    return empty(
      "LMTD terminals require ΔT₁ = Th,in−Tc,out > 0 and ΔT₂ = Th,out−Tc,in > 0 (counterflow)",
    );
  }

  let lmtdC: number;
  if (Math.abs(dT1C - dT2C) < 1e-9) {
    lmtdC = dT1C;
  } else {
    lmtdC = (dT1C - dT2C) / Math.log(dT1C / dT2C);
  }
  if (!(lmtdC > 0)) return empty("LMTD invalid");

  const dTh = thInC - thOutC;
  const R = Math.abs(dTh) < 1e-9 ? 0 : dTh / dTc;
  const P = dTc / (thInC - tcInC);
  if (!(P > 0) || !(P < 1)) {
    return empty("TEMA P = (Tc,out−Tc,in)/(Th,in−Tc,in) must be in (0,1)");
  }

  const F = temaFFactor(P, R, shellPasses);
  if (!(F > 0) || !Number.isFinite(F)) {
    return empty("TEMA F-factor undefined for this P, R, shell-pass set");
  }

  const lmtdCorrC = F * lmtdC;
  const areaM2 = (qKw * 1000) / (uSi * lmtdCorrC);
  const temperatureCross = thOutC < tcOutC;
  const fBelowDesign = F < F_DESIGN_MIN;

  return {
    invalid: false,
    thInC,
    thOutC,
    tcInC,
    tcOutC,
    massHotKgH,
    massColdKgH,
    qKw,
    cpHotKjKgK,
    cpColdKjKgK,
    dT1C,
    dT2C,
    lmtdC,
    P,
    R,
    F,
    lmtdCorrC,
    uSi,
    areaM2,
    temperatureCross,
    fBelowDesign,
    shellPasses,
    hotMode,
  };
}

function fmtQPrimary(qKw: number, imperial: boolean): string {
  if (imperial) {
    const btuHr = qKw * KW_TO_BTU_HR;
    if (btuHr >= 1e6) return `${(btuHr / 1e6).toFixed(2)} MMBtu/hr`;
    if (btuHr >= 1000) return `${(btuHr / 1000).toFixed(0)} kBTU/hr`;
    return `${btuHr.toFixed(0)} BTU/hr`;
  }
  if (qKw >= 1000) return `${(qKw / 1000).toFixed(2)} MW`;
  return `${qKw.toFixed(1)} kW`;
}

function fmtQ(qKw: number, imperial: boolean): string {
  return fmtQPrimary(qKw, imperial);
}

function fmtA(areaM2: number, imperial: boolean): string {
  return fmtAExport(areaM2, imperial);
}

function fmtQAlt(qKw: number, imperial: boolean): string {
  return fmtQPrimary(qKw, !imperial);
}

function fmtAAlt(areaM2: number, imperial: boolean): string {
  return fmtAExport(areaM2, !imperial);
}

function fmtT(dtC: number, imperial: boolean): string {
  if (imperial) return `${(dtC * 1.8).toFixed(1)} °F`;
  return `${dtC.toFixed(1)} °C`;
}

function fmtQExport(qKw: number, imperial: boolean): string {
  return fmtQPrimary(qKw, imperial);
}

function fmtAExport(areaM2: number, imperial: boolean): string {
  if (imperial) return `${(areaM2 * M2_TO_FT2).toFixed(1)} ft²`;
  return `${areaM2.toFixed(2)} m²`;
}

export function calculateHeatExchangerLmtdDuty(
  inputs: HeatExchangerLmtdDutyInputs,
): CalculatorOutput {
  const c = computeHeatExchangerLmtdDuty(inputs);
  const imperial = inputs.unitSystem === "imperial";

  if (c.invalid) {
    return {
      heroLabel: "Heat duty · Required area",
      heroValue: "—",
      heroStatus: c.invalidReason ?? "Enter valid temperatures and flow",
      heroStatusLevel: "neutral",
      summary: [],
      summaryStatus: { label: "Incomplete", level: "neutral" },
      rows: [],
      callouts: [
        {
          tone: "info",
          title: "TEMA / IAPWS screening",
          body: "Set hot and cold terminals, hot mass flow, shell passes, and overall U. Liquid/steam properties use IAPWS-IF97; F uses the TEMA 1–2n LMTD correction.",
        },
      ],
      exportRows: [],
    };
  }

  let heroStatusLevel: StatusLevel = "pass";
  let heroStatus = "Screening OK";
  if (c.fBelowDesign || c.temperatureCross) {
    heroStatusLevel = "warn";
    heroStatus = c.fBelowDesign
      ? `F = ${c.F.toFixed(3)} < ${F_DESIGN_MIN} — review shell passes`
      : "Temperature cross — review multi-shell layout";
  }

  /** Lean: one callout — warn wins over baseline info. */
  const callouts: ResultCallout[] = [];
  if (c.temperatureCross) {
    callouts.push({
      tone: "warn",
      title: "Temperature Cross Alert",
      body: `Th,out (${c.thOutC.toFixed(1)} °C) < Tc,out (${c.tcOutC.toFixed(1)} °C). On a 1-shell unit TEMA F collapses — use 2+ shell passes or reduce cold-side rise.`,
    });
  } else if (c.fBelowDesign) {
    callouts.push({
      tone: "warn",
      title: "LMTD Correction Limit",
      body: `TEMA F = ${c.F.toFixed(3)} (< ${F_DESIGN_MIN}). Increase shell passes or reduce effectiveness P before locking the datasheet.`,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "TEMA / IAPWS screening",
      body: "IAPWS-IF97 water/steam · TEMA F for 1–2n / multi-shell. Not a TEMA mechanical design or HTRI rating.",
      items: [
        `Mode ${c.hotMode} · N_shell ${c.shellPasses} · P=${c.P.toFixed(3)} · R=${c.R.toFixed(3)}`,
      ],
    });
  }

  const coldFlow = imperial
    ? `${(c.massColdKgH * KG_H_TO_LB_HR).toFixed(0)} lb/hr`
    : `${c.massColdKgH.toFixed(0)} kg/h`;
  const cpLine =
    c.hotMode === "steam-condense"
      ? `h_fg · cold Cp ${c.cpColdKjKgK.toFixed(3)} kJ/kg·K`
      : `Cp ${Number.isFinite(c.cpHotKjKgK) ? c.cpHotKjKgK.toFixed(3) : "—"} / ${c.cpColdKjKgK.toFixed(3)} kJ/kg·K`;

  const rows: ResultRow[] = [
    {
      section: "Balance",
      label: "Cold mass flow (required)",
      value: coldFlow,
      emphasis: true,
    },
    {
      section: "Balance",
      label: "Hot / cold capacity",
      value: cpLine,
    },
    {
      section: "Approach",
      label: "ΔT₁ / ΔT₂",
      value: `${fmtT(c.dT1C, imperial)} / ${fmtT(c.dT2C, imperial)}`,
    },
    {
      section: "Approach",
      label: "TEMA P / R",
      value: `${c.P.toFixed(3)} / ${c.R.toFixed(3)}`,
      warn: c.fBelowDesign || c.temperatureCross,
    },
  ];

  const exportRows = [
    { label: "Heat duty Q", value: fmtQExport(c.qKw, imperial) },
    { label: "Required area A", value: fmtAExport(c.areaM2, imperial) },
    { label: "LMTD (uncorrected)", value: fmtT(c.lmtdC, imperial) },
    { label: "TEMA F-factor", value: c.F.toFixed(4) },
    { label: "Corrected LMTD", value: fmtT(c.lmtdCorrC, imperial) },
    {
      label: "Hot mass flow",
      value: imperial
        ? `${(c.massHotKgH * KG_H_TO_LB_HR).toFixed(0)} lb/hr`
        : `${c.massHotKgH.toFixed(0)} kg/h`,
    },
    { label: "Cold mass flow", value: coldFlow },
    {
      label: "Overall U",
      value: imperial
        ? `${(c.uSi * W_M2K_TO_BTU).toFixed(1)} Btu/h·ft²·°F`
        : `${c.uSi.toFixed(0)} W/m²·K`,
    },
    { label: "Shell passes", value: String(c.shellPasses) },
    { label: "TEMA P / R", value: `${c.P.toFixed(4)} / ${c.R.toFixed(4)}` },
    {
      label: "Hot / cold terminals",
      value: `${c.thInC.toFixed(1)}→${c.thOutC.toFixed(1)} / ${c.tcInC.toFixed(1)}→${c.tcOutC.toFixed(1)} °C`,
    },
  ];

  const modeBadge =
    c.hotMode === "steam-condense"
      ? "Steam condenser"
      : c.hotMode === "steam-sensible"
        ? "Steam cool"
        : c.hotMode === "custom"
          ? "Custom Cp"
          : "Water–water";

  return {
    heroLabel: "Heat duty · Required area",
    heroValue: `${fmtQ(c.qKw, imperial)} · ${fmtA(c.areaM2, imperial)}`,
    heroStatus,
    heroStatusLevel,
    heroBadges: [
      { label: "Also", value: `${fmtQAlt(c.qKw, imperial)} · ${fmtAAlt(c.areaM2, imperial)}` },
      { label: "Duty", value: modeBadge },
      { label: "N", value: `${c.shellPasses}-shell` },
    ],
    summary: [
      { label: "Uncorrected LMTD", value: fmtT(c.lmtdC, imperial) },
      { label: "TEMA F-factor", value: c.F.toFixed(3) },
      { label: "Corrected LMTD", value: fmtT(c.lmtdCorrC, imperial) },
    ],
    summaryStatus: {
      label: heroStatus,
      level: heroStatusLevel,
    },
    rows,
    callouts,
    exportRows,
  };
}
