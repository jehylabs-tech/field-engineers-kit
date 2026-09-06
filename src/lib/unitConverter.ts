/**
 * Centralized engineering unit conversion constants and helpers.
 * Prefer this module for calculator display/format; category converters live in
 * `@/lib/units/engineering` for the unit-converter tool.
 */
import type { UnitSystem } from "@/lib/calculators/definitions";

/** Exact / NIST-aligned factors used across FieldEngineersKit. */
export const UNIT_FACTORS = {
  IN_TO_MM: 25.4,
  MS_TO_FTS: 3.280839895,
  M3H_TO_GPM: 4.402867513,
  BAR_TO_PSI: 14.5037738,
  KG_M3_TO_LB_FT3: 0.06242796,
  KG_M_TO_LB_FT: 0.671968975,
  KG_TO_LB: 2.20462262,
} as const;

export type UnitQuantity =
  | "length"
  | "lengthLarge"
  | "velocity"
  | "flow"
  | "pressure"
  | "density"
  | "temperature"
  | "mass"
  | "linearMass"
  | "area";

export function unitSymbol(
  quantity: UnitQuantity,
  system: UnitSystem,
): string {
  const metric: Record<UnitQuantity, string> = {
    length: "mm",
    lengthLarge: "m",
    velocity: "m/s",
    flow: "m³/h",
    pressure: "bar",
    density: "kg/m³",
    temperature: "°C",
    mass: "kg",
    linearMass: "kg/m",
    area: "mm²",
  };
  const imperial: Record<UnitQuantity, string> = {
    length: "in",
    lengthLarge: "ft",
    velocity: "ft/s",
    flow: "GPM",
    pressure: "psi",
    density: "lb/ft³",
    temperature: "°F",
    mass: "lb",
    linearMass: "lb/ft",
    area: "in²",
  };
  return system === "imperial" ? imperial[quantity] : metric[quantity];
}

export function mmToIn(mm: number): number {
  return mm / UNIT_FACTORS.IN_TO_MM;
}

export function inToMm(inches: number): number {
  return inches * UNIT_FACTORS.IN_TO_MM;
}

export function mToFt(m: number): number {
  return m * UNIT_FACTORS.MS_TO_FTS; // 1 m = 3.2808399 ft (same factor)
}

export function ftToM(ft: number): number {
  return ft / UNIT_FACTORS.MS_TO_FTS;
}

export function msToFts(ms: number): number {
  return ms * UNIT_FACTORS.MS_TO_FTS;
}

export function ftsToMs(fts: number): number {
  return fts / UNIT_FACTORS.MS_TO_FTS;
}

export function m3hToGpm(m3h: number): number {
  return m3h * UNIT_FACTORS.M3H_TO_GPM;
}

export function gpmToM3h(gpm: number): number {
  return gpm / UNIT_FACTORS.M3H_TO_GPM;
}

export function barToPsi(bar: number): number {
  return bar * UNIT_FACTORS.BAR_TO_PSI;
}

export function psiToBar(psi: number): number {
  return psi / UNIT_FACTORS.BAR_TO_PSI;
}

export function kgM3ToLbFt3(kgM3: number): number {
  return kgM3 * UNIT_FACTORS.KG_M3_TO_LB_FT3;
}

export function lbFt3ToKgM3(lbFt3: number): number {
  return lbFt3 / UNIT_FACTORS.KG_M3_TO_LB_FT3;
}

export function kgMToLbFt(kgM: number): number {
  return kgM * UNIT_FACTORS.KG_M_TO_LB_FT;
}

export function lbFtToKgM(lbFt: number): number {
  return lbFt / UNIT_FACTORS.KG_M_TO_LB_FT;
}

export function kgToLb(kg: number): number {
  return kg * UNIT_FACTORS.KG_TO_LB;
}

export function lbToKg(lb: number): number {
  return lb / UNIT_FACTORS.KG_TO_LB;
}

export function cToF(c: number): number {
  return c * 1.8 + 32;
}

export function fToC(f: number): number {
  return (f - 32) / 1.8;
}

export function formatVelocity(
  velocityMs: number,
  system: UnitSystem,
  digits = 2,
): string {
  if (!Number.isFinite(velocityMs)) return "—";
  if (system === "imperial") {
    return `${msToFts(velocityMs).toFixed(digits)} ft/s`;
  }
  return `${velocityMs.toFixed(digits)} m/s`;
}

export function formatDensity(
  densityKgM3: number,
  system: UnitSystem,
  digits = 1,
): string {
  if (!Number.isFinite(densityKgM3)) return "—";
  if (system === "imperial") {
    return `${kgM3ToLbFt3(densityKgM3).toFixed(digits)} lb/ft³`;
  }
  return `${densityKgM3.toFixed(digits)} kg/m³`;
}

export function formatAreaMm2(
  areaMm2: number,
  system: UnitSystem,
  digits = 0,
): string {
  if (!Number.isFinite(areaMm2)) return "—";
  if (system === "imperial") {
    const in2 = areaMm2 / (UNIT_FACTORS.IN_TO_MM * UNIT_FACTORS.IN_TO_MM);
    return `${in2.toFixed(Math.max(2, digits))} in²`;
  }
  return `${areaMm2.toFixed(digits)} mm²`;
}

export function formatLengthMm(
  lengthMm: number,
  system: UnitSystem,
  digits = 2,
): string {
  if (!Number.isFinite(lengthMm)) return "—";
  if (system === "imperial") {
    return `${mmToIn(lengthMm).toFixed(digits)} in`;
  }
  return `${lengthMm.toFixed(digits)} mm`;
}

export function formatLengthM(
  lengthM: number,
  system: UnitSystem,
  digits = 1,
): string {
  if (!Number.isFinite(lengthM)) return "—";
  if (system === "imperial") {
    return `${mToFt(lengthM).toFixed(digits)} ft`;
  }
  return `${lengthM.toFixed(digits)} m`;
}

export function formatPressureBar(
  pressureBar: number,
  system: UnitSystem,
  digits = 3,
): string {
  if (!Number.isFinite(pressureBar)) return "—";
  if (system === "imperial") {
    return `${barToPsi(pressureBar).toFixed(2)} psi`;
  }
  return `${pressureBar.toFixed(digits)} bar`;
}

/**
 * When the global unit system flips, convert companion numeric fields that are
 * stored in the active display unit so inputs stay physically equivalent.
 */
export function syncCompanionUnits<T extends Record<string, unknown>>(
  inputs: T,
  nextSystem: UnitSystem,
): T {
  const prevSystem =
    (inputs as { unitSystem?: UnitSystem }).unitSystem ?? "metric";
  if (prevSystem === nextSystem) {
    return inputs;
  }

  const toImperial = nextSystem === "imperial";
  const next: Record<string, unknown> = { ...inputs, unitSystem: nextSystem };

  const convertNum = (
    key: string,
    forward: (n: number) => number,
    digits: number,
  ) => {
    const value = next[key];
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    next[key] = Number(forward(value).toFixed(digits));
  };

  // Metal weight stores small dims in mm/in; other length fields are m/ft.
  const isMetalWeight = typeof next.shape === "string";
  if (typeof next.length === "number" && Number.isFinite(next.length)) {
    if (isMetalWeight) {
      convertNum("length", toImperial ? mmToIn : inToMm, 3);
    } else {
      convertNum("length", toImperial ? mToFt : ftToM, 3);
    }
  }

  // Temperatures: °C ↔ °F
  for (const key of [
    "temperature",
    "installTemp",
    "operatingTemp",
    "designTemperature",
  ]) {
    if (typeof next[key] === "number" && Number.isFinite(next[key] as number)) {
      convertNum(key, toImperial ? cToF : fToC, 2);
    }
  }

  // Fluid density only (flow-velocity). Metal weight uses material presets in kg/m³.
  if (
    !isMetalWeight &&
    typeof next.density === "number" &&
    Number.isFinite(next.density)
  ) {
    convertNum("density", toImperial ? kgM3ToLbFt3 : lbFt3ToKgM3, 3);
  }

  // Volumetric flow companion unit (leave kg/h alone)
  if (typeof next.flowUnit === "string" && typeof next.flow === "number") {
    if (toImperial && next.flowUnit === "m3h") {
      next.flow = Number(m3hToGpm(next.flow).toFixed(4));
      next.flowUnit = "gpm";
    } else if (!toImperial && next.flowUnit === "gpm") {
      next.flow = Number(gpmToM3h(next.flow).toFixed(4));
      next.flowUnit = "m3h";
    }
  }

  // Valve Cv uses flowRate (m³/h ↔ GPM / Nm³/h ↔ SCFH) without a flowUnit field
  if (
    typeof next.flowRate === "number" &&
    Number.isFinite(next.flowRate) &&
    !("flowUnit" in next)
  ) {
    const isGas = next.fluid === "gas";
    if (isGas) {
      // Nm³/h ↔ SCFH (35.314666721)
      const factor = 35.314666721;
      convertNum(
        "flowRate",
        toImperial ? (n) => n * factor : (n) => n / factor,
        3,
      );
    } else {
      convertNum("flowRate", toImperial ? m3hToGpm : gpmToM3h, 4);
    }
  }

  // Valve / general process pressure in bar ↔ psi
  for (const key of ["inletPressure", "outletPressure"]) {
    if (typeof next[key] === "number" && Number.isFinite(next[key] as number)) {
      convertNum(key, toImperial ? barToPsi : psiToBar, 3);
    }
  }

  // Stress / pressure in MPa ↔ psi (pipe thickness, hydro, blind)
  const mpaToPsi = (mpa: number) => mpa * UNIT_FACTORS.BAR_TO_PSI * 10;
  const psiToMpa = (psi: number) => psi / (UNIT_FACTORS.BAR_TO_PSI * 10);
  for (const key of [
    "designPressure",
    "allowableStress",
    "operatingPressure",
  ]) {
    if (typeof next[key] === "number" && Number.isFinite(next[key] as number)) {
      convertNum(key, toImperial ? mpaToPsi : psiToMpa, 3);
    }
  }

  // Thermal expansion SA is stored as MPa (metric) / ksi (imperial)
  if (
    typeof next.allowableSa === "number" &&
    Number.isFinite(next.allowableSa)
  ) {
    const mpaToKsi = (mpa: number) => mpa / 6.894757;
    const ksiToMpa = (ksi: number) => ksi * 6.894757;
    convertNum("allowableSa", toImperial ? mpaToKsi : ksiToMpa, 3);
  }

  // Small dimensions: mm ↔ in
  for (const key of [
    "outsideDiameter",
    "outerDiameter",
    "innerDiameter",
    "actualThickness",
    "corrosionAllowance",
    "thickness",
    "width",
    "height",
    "od",
    "id",
    "wall",
    "diameter",
  ]) {
    if (typeof next[key] === "number" && Number.isFinite(next[key] as number)) {
      convertNum(key, toImperial ? mmToIn : inToMm, 4);
    }
  }

  return next as T;
}

/** Density to SI kg/m³ regardless of display system. */
export function densityToKgM3(value: number, system: UnitSystem): number {
  if (!Number.isFinite(value) || value <= 0) return 998;
  return system === "imperial" ? lbFt3ToKgM3(value) : value;
}
