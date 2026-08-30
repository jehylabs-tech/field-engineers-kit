import type { CalculatorOutput } from "@/lib/calculators/definitions";
import {
  convertDimension,
  convertFlow,
  convertMass,
  convertPressure,
  convertTemperature,
  convertTorque,
  convertVelocity,
  formatEngineering,
  unitCategoryLabel,
  unitDisplayLabel,
  unitsForCategory,
  type DimensionUnitId,
  type FlowUnitId,
  type MassUnitId,
  type PressureUnitId,
  type TemperatureUnitId,
  type TorqueUnitId,
  type UnitCategory,
  type VelocityUnitId,
} from "@/lib/units/engineering";

export type UnitConverterInputs = {
  category: UnitCategory;
  value: number;
  from: string;
  to: string;
  density: number;
  /** Display decimals for the converted value (field screening). */
  digits: 2 | 3;
};

export function normalizeUnitConverterInputs(
  inputs: UnitConverterInputs,
): UnitConverterInputs {
  const units = unitsForCategory(inputs.category);
  const from = units.includes(inputs.from) ? inputs.from : units[0];
  const to = units.includes(inputs.to)
    ? inputs.to
    : (units[1] ?? units[0]);
  const digits = inputs.digits === 2 ? 2 : 3;
  return { ...inputs, from, to, digits };
}

export function calculateUnitConverter(
  inputs: UnitConverterInputs,
): CalculatorOutput {
  const normalized = normalizeUnitConverterInputs(inputs);
  const result = convertByCategory(normalized);
  const display = formatEngineering(result, normalized.digits);
  const invalid = !Number.isFinite(result);
  const inputValue = Number.isFinite(normalized.value)
    ? String(normalized.value)
    : "—";
  const fromLabel = unitDisplayLabel(normalized.from);
  const toLabel = unitDisplayLabel(normalized.to);

  return {
    heroLabel: `${inputValue} ${fromLabel} →`,
    heroValue: `${display} ${toLabel}`,
    heroStatus: invalid ? "Enter a finite numeric value" : unitCategoryLabel(normalized.category),
    heroStatusLevel: invalid ? "warn" : "pass",
    summary: [
      { label: "From", value: `${inputValue} ${fromLabel}` },
      { label: "To", value: `${display} ${toLabel}` },
    ],
    summaryStatus: {
      label:
        normalized.category === "flow" && (normalized.from === "kg/h" || normalized.to === "kg/h")
          ? `Mass/volume uses density ${Number.isFinite(normalized.density) ? normalized.density : 1000} kg/m³`
          : invalid
            ? "Invalid input — conversion skipped"
            : `Rounded to ${normalized.digits} decimal places — exact SI factors`,
      level: invalid ? "warn" : "neutral",
    },
    rows: [],
    exportRows: [
      { label: "Input", value: `${inputValue} ${fromLabel}` },
      { label: "Output", value: `${display} ${toLabel}` },
      { label: "Decimals", value: String(normalized.digits) },
    ],
  };
}

function convertByCategory(inputs: UnitConverterInputs): number {
  const { category, value, from, to, density } = inputs;
  if (!Number.isFinite(value)) return NaN;
  switch (category) {
    case "pressure":
      return convertPressure(value, from as PressureUnitId, to as PressureUnitId);
    case "flow":
      return convertFlow(
        value,
        from as FlowUnitId,
        to as FlowUnitId,
        Number.isFinite(density) && density > 0 ? density : 1000,
      );
    case "dimension":
      return convertDimension(
        value,
        from as DimensionUnitId,
        to as DimensionUnitId,
      );
    case "temperature":
      return convertTemperature(
        value,
        from as TemperatureUnitId,
        to as TemperatureUnitId,
      );
    case "torque":
      return convertTorque(value, from as TorqueUnitId, to as TorqueUnitId);
    case "weight":
      return convertMass(value, from as MassUnitId, to as MassUnitId);
    case "velocity":
      return convertVelocity(
        value,
        from as VelocityUnitId,
        to as VelocityUnitId,
      );
  }
}

export const DEFAULT_UNIT_CONVERTER_INPUTS: UnitConverterInputs = {
  category: "pressure",
  value: 20,
  from: "bar",
  to: "psi",
  density: 1000,
  digits: 3,
};
