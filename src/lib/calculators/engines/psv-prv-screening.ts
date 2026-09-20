/**
 * PSV / PRV orifice screening — API 520 Part I + API 526.
 * Critical gas vapor sizing and non-viscous liquid sizing (F_P / backpressure = atm).
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  IN2_TO_MM2,
  orificeAreaMm2,
  selectApi526Orifice,
  type Api526OrificeLetter,
} from "@/lib/calculators/data/api526OrificeData";
import { barToPsi, psiToBar } from "@/lib/unitConverter";

export type PsvFluidType = "gas" | "liquid";

export type PsvPrvScreeningInputs = {
  unitSystem: UnitSystem;
  fluidType: PsvFluidType;
  /** Set pressure — bar g (metric) or psig (imperial). */
  setPressure: number;
  /**
   * Gas: mass flow W (kg/h or lb/h).
   * Liquid: volumetric Q (L/min or GPM).
   */
  requiredCapacity: number;
  /** Allowable overpressure percent (10 non-fire … 21 fire). */
  overpressurePercent: number;
  /** Gas molecular weight M. */
  molecularWeight: number;
  /** Relieving temperature — °C or °F. */
  relievingTemperature: number;
  /** Liquid specific gravity G (water = 1). */
  liquidDensity: number;
  /** Gas specific-heat ratio k (default air 1.40). */
  specificHeatRatio: number;
};

export const SET_PRESSURE_RANGE = { min: 0.5, max: 250 } as const;
export const CAPACITY_RANGE = { min: 10, max: 500_000 } as const;
export const OVERPRESSURE_RANGE = { min: 10, max: 21 } as const;
export const MW_RANGE = { min: 2, max: 200 } as const;
export const TEMP_RANGE_C = { min: -196, max: 500 } as const;
export const TEMP_RANGE_F = { min: -320, max: 932 } as const;
export const SG_RANGE = { min: 0.5, max: 2.0 } as const;
export const K_RANGE = { min: 1.0, max: 2.0 } as const;

const ATM_BAR = 1.01325;
const ATM_PSI = 14.695948775;
const KG_H_TO_LB_H = 1 / 0.45359237;
const LMIN_TO_GPM = 0.2641720524;
/** API 520 gas Kd / liquid Kd (preliminary effective coefficients). */
export const KD_GAS = 0.975;
export const KD_LIQUID = 0.65;

export const DEFAULT_PSV_PRV_INPUTS: PsvPrvScreeningInputs = {
  unitSystem: "metric",
  fluidType: "gas",
  setPressure: 10,
  requiredCapacity: 5000,
  overpressurePercent: 10,
  molecularWeight: 28.97,
  relievingTemperature: 25,
  liquidDensity: 1,
  specificHeatRatio: 1.4,
};

export type PsvPrvComputed = {
  invalid: boolean;
  invalidReason?: string;
  fluidType: PsvFluidType;
  setPressureBarg: number;
  overpressurePercent: number;
  p1BarAbs: number;
  p1Psia: number;
  deltaPPsi: number;
  kd: number;
  cGas: number;
  aReqIn2: number;
  aReqMm2: number;
  letter: Api526OrificeLetter | null;
  aApiIn2: number;
  aApiMm2: number;
  marginPercent: number;
  /** Rated capacity in display units of requiredCapacity. */
  ratedCapacity: number;
  capacityUnit: string;
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** API 520 gas constant C (US customary), function of k. */
export function api520GasConstantC(k: number): number {
  const kk = clamp(k, K_RANGE.min, K_RANGE.max);
  const inner = kk * (2 / (kk + 1)) ** ((kk + 1) / (kk - 1));
  return 520 * Math.sqrt(inner);
}

function toBarg(setPressure: number, imperial: boolean): number {
  return imperial ? psiToBar(setPressure) : setPressure;
}

function toTempC(temp: number, imperial: boolean): number {
  return imperial ? ((temp - 32) * 5) / 9 : temp;
}

export function computePsvPrvScreening(
  inputs: PsvPrvScreeningInputs,
): PsvPrvComputed {
  const imperial = inputs.unitSystem === "imperial";
  const fluidType = inputs.fluidType === "liquid" ? "liquid" : "gas";
  const op = clamp(
    inputs.overpressurePercent,
    OVERPRESSURE_RANGE.min,
    OVERPRESSURE_RANGE.max,
  );
  const setBarg = toBarg(inputs.setPressure, imperial);
  const mw = clamp(inputs.molecularWeight, MW_RANGE.min, MW_RANGE.max);
  const sg = clamp(inputs.liquidDensity, SG_RANGE.min, SG_RANGE.max);
  const k = clamp(inputs.specificHeatRatio, K_RANGE.min, K_RANGE.max);
  const cGas = api520GasConstantC(k);
  const tempC = toTempC(inputs.relievingTemperature, imperial);

  const empty = (reason: string): PsvPrvComputed => ({
    invalid: true,
    invalidReason: reason,
    fluidType,
    setPressureBarg: setBarg,
    overpressurePercent: op,
    p1BarAbs: NaN,
    p1Psia: NaN,
    deltaPPsi: NaN,
    kd: fluidType === "gas" ? KD_GAS : KD_LIQUID,
    cGas,
    aReqIn2: NaN,
    aReqMm2: NaN,
    letter: null,
    aApiIn2: NaN,
    aApiMm2: NaN,
    marginPercent: NaN,
    ratedCapacity: NaN,
    capacityUnit: fluidType === "gas" ? (imperial ? "lb/h" : "kg/h") : imperial ? "GPM" : "L/min",
  });

  if (
    !(setBarg >= SET_PRESSURE_RANGE.min && setBarg <= SET_PRESSURE_RANGE.max)
  ) {
    return empty(
      `Set pressure must be ${SET_PRESSURE_RANGE.min}–${SET_PRESSURE_RANGE.max} (gauge)`,
    );
  }
  if (
    !(
      inputs.requiredCapacity >= CAPACITY_RANGE.min &&
      inputs.requiredCapacity <= CAPACITY_RANGE.max
    )
  ) {
    return empty(
      `Capacity must be ${CAPACITY_RANGE.min}–${CAPACITY_RANGE.max}`,
    );
  }

  const p1BarAbs = setBarg * (1 + op / 100) + ATM_BAR;
  const p1Psia = setBarg * (1 + op / 100) * barToPsi(1) + ATM_PSI;
  // Liquid ΔP across valve to atmosphere = relieving gauge pressure.
  const deltaPPsi = setBarg * (1 + op / 100) * barToPsi(1);

  let aReqIn2: number;
  const kd = fluidType === "gas" ? KD_GAS : KD_LIQUID;
  const capacityUnit =
    fluidType === "gas"
      ? imperial
        ? "lb/h"
        : "kg/h"
      : imperial
        ? "GPM"
        : "L/min";

  if (fluidType === "gas") {
    const W_lbh = imperial
      ? inputs.requiredCapacity
      : inputs.requiredCapacity * KG_H_TO_LB_H;
    const T_R = (tempC + 273.15) * 1.8;
    if (!(T_R > 0) || !(mw > 0) || !(p1Psia > 0)) {
      return empty("Invalid gas temperature, MW, or relieving pressure");
    }
    // Critical flow, Kb = Kc = Z = 1 (atm discharge screening).
    aReqIn2 =
      (W_lbh / (cGas * kd * p1Psia)) * Math.sqrt(T_R / mw);
  } else {
    const Q_gpm = imperial
      ? inputs.requiredCapacity
      : inputs.requiredCapacity * LMIN_TO_GPM;
    if (!(deltaPPsi > 0) || !(sg > 0)) {
      return empty("Invalid liquid differential pressure or specific gravity");
    }
    // Kw = Kv = Kc = 1 (non-viscous, no rupture disk, atm backpressure).
    aReqIn2 = (Q_gpm / (38 * kd)) * Math.sqrt(sg / deltaPPsi);
  }

  if (!(aReqIn2 > 0) || !Number.isFinite(aReqIn2)) {
    return empty("Could not evaluate required orifice area");
  }

  const selected = selectApi526Orifice(aReqIn2);
  const aReqMm2 = aReqIn2 * IN2_TO_MM2;

  if (!selected) {
    return {
      invalid: false,
      fluidType,
      setPressureBarg: setBarg,
      overpressurePercent: op,
      p1BarAbs,
      p1Psia,
      deltaPPsi,
      kd,
      cGas,
      aReqIn2,
      aReqMm2,
      letter: null,
      aApiIn2: NaN,
      aApiMm2: NaN,
      marginPercent: NaN,
      ratedCapacity: NaN,
      capacityUnit,
    };
  }

  const aApiIn2 = selected.areaIn2;
  const aApiMm2 = orificeAreaMm2(aApiIn2);
  const marginPercent = ((aApiIn2 / aReqIn2 - 1) * 100);

  let ratedCapacity: number;
  if (fluidType === "gas") {
    const T_R = (tempC + 273.15) * 1.8;
    const W_lbh =
      aApiIn2 * cGas * kd * p1Psia * Math.sqrt(mw / T_R);
    ratedCapacity = imperial ? W_lbh : W_lbh / KG_H_TO_LB_H;
  } else {
    const Q_gpm =
      aApiIn2 * 38 * kd * Math.sqrt(deltaPPsi / sg);
    ratedCapacity = imperial ? Q_gpm : Q_gpm / LMIN_TO_GPM;
  }

  return {
    invalid: false,
    fluidType,
    setPressureBarg: setBarg,
    overpressurePercent: op,
    p1BarAbs,
    p1Psia,
    deltaPPsi,
    kd,
    cGas,
    aReqIn2,
    aReqMm2,
    letter: selected.letter,
    aApiIn2,
    aApiMm2,
    marginPercent,
    ratedCapacity,
    capacityUnit,
  };
}

function fmtArea(mm2: number, in2: number, imperial: boolean): string {
  return imperial
    ? `${in2.toFixed(3)} in² (${mm2.toFixed(1)} mm²)`
    : `${mm2.toFixed(1)} mm² (${in2.toFixed(3)} in²)`;
}

function fmtP1(c: PsvPrvComputed, imperial: boolean): string {
  return imperial
    ? `${c.p1Psia.toFixed(2)} psia (${c.p1BarAbs.toFixed(2)} bar a)`
    : `${c.p1BarAbs.toFixed(2)} bar a (${c.p1Psia.toFixed(2)} psia)`;
}

export function calculatePsvPrvScreening(
  inputs: PsvPrvScreeningInputs,
): CalculatorOutput {
  const c = computePsvPrvScreening(inputs);
  const imperial = inputs.unitSystem === "imperial";

  const callouts: ResultCallout[] = [];
  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Check PSV sizing inputs",
      body: c.invalidReason,
    });
  } else if (!c.letter) {
    callouts.push({
      tone: "warn",
      title: "Above API 526 letter T",
      body: `Required area ${fmtArea(c.aReqMm2, c.aReqIn2, imperial)} exceeds the largest standard orifice (T). Use multiple valves or a manufacturer special orifice.`,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Screening Note",
      body: "Preliminary API 520 / 526 sizing for MTO and line screening. Certified selection must include actual backpressure, two-phase/HEM, viscosity (Kv), rupture disks (Kc), and ASME UG-131 manufacturer Kd from the nameplate.",
    });
  }

  const heroValue = c.invalid
    ? "—"
    : c.letter
      ? `API 526 “${c.letter}” · ${imperial ? `${c.aApiIn2.toFixed(3)} in²` : `${c.aApiMm2.toFixed(0)} mm²`}`
      : `Oversize · A_req ${imperial ? `${c.aReqIn2.toFixed(3)} in²` : `${c.aReqMm2.toFixed(0)} mm²`}`;

  const heroStatus = c.invalid
    ? "Check inputs"
    : !c.letter
      ? "No standard orifice"
      : c.marginPercent < 5
        ? "Tight margin"
        : "Sized";
  const heroStatusLevel: StatusLevel = c.invalid
    ? "fail"
    : !c.letter
      ? "fail"
      : c.marginPercent < 5
        ? "warn"
        : "pass";

  const rows: ResultRow[] = [];
  if (!c.invalid) {
    rows.push(
      {
        section: "Orifice",
        label: "Required area A_req",
        value: fmtArea(c.aReqMm2, c.aReqIn2, imperial),
        emphasis: true,
      },
      {
        section: "Orifice",
        label: c.letter
          ? `Selected API 526 “${c.letter}”`
          : "Selected API 526 orifice",
        value: c.letter
          ? fmtArea(c.aApiMm2, c.aApiIn2, imperial)
          : "— (above T)",
        emphasis: true,
        warn: !c.letter,
      },
      {
        section: "Duty",
        label: "Relieving pressure P1",
        value: fmtP1(c, imperial),
      },
    );
    if (c.letter) {
      rows.push({
        section: "Duty",
        label: `Rated capacity (${c.capacityUnit})`,
        value: `${c.ratedCapacity.toFixed(0)} ${c.capacityUnit}`,
      });
    }
  }

  const badges = c.invalid
    ? undefined
    : [
        {
          label: "A_req",
          value: imperial
            ? `${c.aReqIn2.toFixed(3)} in²`
            : `${c.aReqMm2.toFixed(1)} mm²`,
        },
        {
          label: "Orifice",
          value: c.letter ?? "—",
        },
        {
          label: "P1",
          value: imperial
            ? `${c.p1Psia.toFixed(1)} psia`
            : `${c.p1BarAbs.toFixed(2)} bar a`,
        },
        {
          label: "Margin",
          value: c.letter ? `${c.marginPercent.toFixed(1)}%` : "—",
        },
      ];

  return {
    heroLabel: "API 526 orifice selection",
    heroValue,
    heroStatus,
    heroStatusLevel,
    heroBadges: badges,
    summary: badges ?? [],
    summaryStatus: { label: heroStatus, level: heroStatusLevel },
    rows,
    callouts,
    exportRows: [
      { label: "Standard", value: "API 520 Part I / API 526" },
      { label: "Fluid", value: c.fluidType },
      {
        label: "Pset bar g",
        value: c.invalid ? "—" : c.setPressureBarg.toFixed(4),
      },
      {
        label: "Overpressure %",
        value: String(c.overpressurePercent),
      },
      {
        label: "P1 bar abs",
        value: c.invalid ? "—" : c.p1BarAbs.toFixed(4),
      },
      {
        label: "A_req mm2",
        value: c.invalid ? "—" : c.aReqMm2.toFixed(3),
      },
      {
        label: "A_req in2",
        value: c.invalid ? "—" : c.aReqIn2.toFixed(5),
      },
      { label: "Orifice", value: c.letter ?? "—" },
      {
        label: "A_API mm2",
        value: c.letter ? c.aApiMm2.toFixed(3) : "—",
      },
      {
        label: "Margin %",
        value: c.letter ? c.marginPercent.toFixed(2) : "—",
      },
      {
        label: "Rated capacity",
        value: c.letter ? c.ratedCapacity.toFixed(2) : "—",
      },
      { label: "Capacity unit", value: c.capacityUnit },
      { label: "Kd", value: String(c.kd) },
      { label: "C gas", value: c.cGas.toFixed(3) },
    ],
  };
}
