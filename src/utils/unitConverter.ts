import type { UnitSystem } from "@/lib/calculators/definitions";

const INCH_TO_MM = 25.4;
/** NIST-aligned: 1 bar = 14.5037738 psi (consistent with src/lib/units/engineering.ts) */
const BAR_TO_PSI = 14.5037738;
const PSI_TO_BAR = 1 / BAR_TO_PSI;
const KG_PER_M_TO_LB_PER_FT = 0.671968975;

export function inchToMm(inches: number): number {
  return inches * INCH_TO_MM;
}

export function mmToInch(mm: number): number {
  return mm / INCH_TO_MM;
}

export function psiToBar(psi: number): number {
  if (!Number.isFinite(psi)) return NaN;
  return psi * PSI_TO_BAR;
}

export function barToPsi(bar: number): number {
  if (!Number.isFinite(bar)) return NaN;
  return bar * BAR_TO_PSI;
}

export function kgPerMToLbPerFt(kgPerM: number): number {
  return kgPerM * KG_PER_M_TO_LB_PER_FT;
}

export function lbPerFtToKgPerM(lbPerFt: number): number {
  return lbPerFt / KG_PER_M_TO_LB_PER_FT;
}

const KG_TO_LB = 2.20462262;

export function kgToLb(kg: number): number {
  return kg * KG_TO_LB;
}

export function lbToKg(lb: number): number {
  return lb / KG_TO_LB;
}

export function convertWeight(
  valueKg: number,
  unitSystem: UnitSystem,
): { value: number; unit: string } {
  if (unitSystem === "imperial") {
    return { value: kgToLb(valueKg), unit: "lb" };
  }
  return { value: valueKg, unit: "kg" };
}

export function formatWeight(
  valueKg: number,
  unitSystem: UnitSystem,
  digits = 2,
): string {
  const { value, unit } = convertWeight(valueKg, unitSystem);
  return `${value.toFixed(digits)} ${unit}`;
}

export function convertLength(
  valueMm: number,
  unitSystem: UnitSystem,
): { value: number; unit: string } {
  if (unitSystem === "imperial") {
    return { value: mmToInch(valueMm), unit: "in" };
  }
  return { value: valueMm, unit: "mm" };
}

export function convertWeightPerLength(
  valueKgPerM: number,
  unitSystem: UnitSystem,
): { value: number; unit: string } {
  if (unitSystem === "imperial") {
    return { value: kgPerMToLbPerFt(valueKgPerM), unit: "lb/ft" };
  }
  return { value: valueKgPerM, unit: "kg/m" };
}

export function formatLength(valueMm: number, unitSystem: UnitSystem, digits = 3): string {
  const { value, unit } = convertLength(valueMm, unitSystem);
  return `${value.toFixed(digits)} ${unit}`;
}

export function formatWeightPerLength(
  valueKgPerM: number,
  unitSystem: UnitSystem,
  digits = 2,
): string {
  const { value, unit } = convertWeightPerLength(valueKgPerM, unitSystem);
  return `${value.toFixed(digits)} ${unit}`;
}

const NM_TO_FT_LB = 0.737562;
const MPA_TO_PSI = BAR_TO_PSI * 10;

export function formatTorque(
  valueNm: number,
  unitSystem: UnitSystem,
  digits = 0,
): string {
  if (unitSystem === "imperial") {
    return `${(valueNm * NM_TO_FT_LB).toFixed(digits)} ft-lb`;
  }
  return `${valueNm.toFixed(digits)} N·m`;
}

export function formatPressure(
  valueMpa: number,
  unitSystem: UnitSystem,
  digits = 2,
): string {
  if (!Number.isFinite(valueMpa)) return "—";
  if (unitSystem === "imperial") {
    return `${(valueMpa * MPA_TO_PSI).toFixed(digits)} psi`;
  }
  return `${valueMpa.toFixed(digits)} MPa`;
}

export function convertPressureFromDisplay(
  value: number,
  unitSystem: UnitSystem,
): number {
  if (unitSystem === "imperial") {
    return value / MPA_TO_PSI;
  }
  return value;
}
