export const PRESSURE_UNITS = ["bar", "MPa", "psi", "kgf/cm2", "kPa"] as const;
export const FLOW_UNITS = ["m3/h", "L/min", "GPM", "kg/h"] as const;
export const DIMENSION_UNITS = ["mm", "in", "ft", "m"] as const;
export const TEMPERATURE_UNITS = ["C", "F", "K"] as const;
export const TORQUE_UNITS = ["N·m", "ft·lb", "kgf·m"] as const;
export const MASS_UNITS = ["kg", "lb", "t"] as const;
export const VELOCITY_UNITS = ["m/s", "ft/s"] as const;

export type PressureUnitId = (typeof PRESSURE_UNITS)[number];
export type FlowUnitId = (typeof FLOW_UNITS)[number];
export type DimensionUnitId = (typeof DIMENSION_UNITS)[number];
export type TemperatureUnitId = (typeof TEMPERATURE_UNITS)[number];
export type TorqueUnitId = (typeof TORQUE_UNITS)[number];
export type MassUnitId = (typeof MASS_UNITS)[number];
export type VelocityUnitId = (typeof VELOCITY_UNITS)[number];

export type UnitCategory =
  | "pressure"
  | "dimension"
  | "temperature"
  | "flow"
  | "torque"
  | "weight"
  | "velocity";

export const UNIT_CATEGORIES: { id: UnitCategory; label: string }[] = [
  { id: "pressure", label: "Pressure" },
  { id: "dimension", label: "Dimension" },
  { id: "temperature", label: "Temperature" },
  { id: "flow", label: "Flow Rate" },
  { id: "torque", label: "Torque" },
  { id: "weight", label: "Weight" },
  { id: "velocity", label: "Velocity" },
];

export function unitsForCategory(category: UnitCategory): readonly string[] {
  switch (category) {
    case "pressure":
      return PRESSURE_UNITS;
    case "flow":
      return FLOW_UNITS;
    case "dimension":
      return DIMENSION_UNITS;
    case "temperature":
      return TEMPERATURE_UNITS;
    case "torque":
      return TORQUE_UNITS;
    case "weight":
      return MASS_UNITS;
    case "velocity":
      return VELOCITY_UNITS;
  }
}

export function unitCategoryLabel(category: UnitCategory): string {
  return UNIT_CATEGORIES.find((item) => item.id === category)?.label ?? category;
}

export function unitDisplayLabel(unit: string): string {
  if (unit === "C") return "°C";
  if (unit === "F") return "°F";
  if (unit === "kgf/cm2") return "kgf/cm²";
  if (unit === "m3/h") return "m³/h";
  if (unit === "t") return "t (metric)";
  return unit;
}

const BAR_PER_UNIT: Record<PressureUnitId, number> = {
  bar: 1,
  MPa: 10,
  psi: 1 / 14.5037738,
  "kgf/cm2": 1 / 1.01971621,
  kPa: 0.01,
};

const M3H_PER_UNIT: Record<Exclude<FlowUnitId, "kg/h">, number> = {
  "m3/h": 1,
  "L/min": 60 / 1000,
  GPM: 0.227124707,
};

/** Exact: 1 ft·lbf = 1.3558179483314004 N·m */
const NM_PER_UNIT: Record<TorqueUnitId, number> = {
  "N·m": 1,
  "ft·lb": 1.3558179483314004,
  "kgf·m": 9.80665,
};

/** Exact avoirdupois pound; metric tonne = 1000 kg */
const KG_PER_UNIT: Record<MassUnitId, number> = {
  kg: 1,
  lb: 0.45359237,
  t: 1000,
};

const MS_PER_UNIT: Record<VelocityUnitId, number> = {
  "m/s": 1,
  "ft/s": 0.3048,
};

export function pressureToBarValue(value: number, from: PressureUnitId): number {
  return value * BAR_PER_UNIT[from];
}

export function pressureFromBar(bar: number, to: PressureUnitId): number {
  return bar / BAR_PER_UNIT[to];
}

export function convertPressure(
  value: number,
  from: PressureUnitId,
  to: PressureUnitId,
): number {
  if (!Number.isFinite(value)) return NaN;
  return pressureFromBar(pressureToBarValue(value, from), to);
}

export function convertFlowVolume(
  value: number,
  from: Exclude<FlowUnitId, "kg/h">,
  to: Exclude<FlowUnitId, "kg/h">,
): number {
  const m3h = value * M3H_PER_UNIT[from];
  return m3h / M3H_PER_UNIT[to];
}

/** Volumetric/mass conversion. kg/h uses density kg/m³. */
export function convertFlow(
  value: number,
  from: FlowUnitId,
  to: FlowUnitId,
  densityKgM3 = 1000,
): number {
  if (!Number.isFinite(value)) return NaN;
  const density = densityKgM3 > 0 && Number.isFinite(densityKgM3) ? densityKgM3 : 1000;
  const toM3h =
    from === "kg/h" ? value / density : value * M3H_PER_UNIT[from];
  if (to === "kg/h") return toM3h * density;
  return toM3h / M3H_PER_UNIT[to];
}

export function convertDimension(
  value: number,
  from: DimensionUnitId,
  to: DimensionUnitId,
): number {
  if (!Number.isFinite(value)) return NaN;
  const toMm: Record<DimensionUnitId, number> = {
    mm: 1,
    in: 25.4,
    m: 1000,
    ft: 304.8,
  };
  return (value * toMm[from]) / toMm[to];
}

export function convertTemperature(
  value: number,
  from: TemperatureUnitId,
  to: TemperatureUnitId,
): number {
  if (!Number.isFinite(value)) return NaN;
  let c = value;
  if (from === "F") c = (value - 32) / 1.8;
  if (from === "K") c = value - 273.15;
  if (to === "C") return c;
  if (to === "F") return c * 1.8 + 32;
  return c + 273.15;
}

export function convertTorque(
  value: number,
  from: TorqueUnitId,
  to: TorqueUnitId,
): number {
  if (!Number.isFinite(value)) return NaN;
  const factorFrom = NM_PER_UNIT[from];
  const factorTo = NM_PER_UNIT[to];
  if (!factorFrom || !factorTo) return NaN;
  return (value * factorFrom) / factorTo;
}

export function convertMass(
  value: number,
  from: MassUnitId,
  to: MassUnitId,
): number {
  if (!Number.isFinite(value)) return NaN;
  const factorFrom = KG_PER_UNIT[from];
  const factorTo = KG_PER_UNIT[to];
  if (!factorFrom || !factorTo) return NaN;
  return (value * factorFrom) / factorTo;
}

export function convertVelocity(
  value: number,
  from: VelocityUnitId,
  to: VelocityUnitId,
): number {
  if (!Number.isFinite(value)) return NaN;
  const factorFrom = MS_PER_UNIT[from];
  const factorTo = MS_PER_UNIT[to];
  if (!factorFrom || !factorTo) return NaN;
  return (value * factorFrom) / factorTo;
}

export function roundTo(value: number, precision = 4): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** Math.max(0, Math.min(12, Math.floor(precision)));
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatEngineering(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e6 || abs < 0.0001)) return value.toExponential(3);
  const rounded = roundTo(value, digits);
  const fixed = rounded.toFixed(digits);
  return fixed.replace(/\.?0+$/, "") || "0";
}
