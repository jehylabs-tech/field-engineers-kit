import {
  DEFAULT_WATER_THERMO_INPUTS,
  type WaterThermoInputs,
} from "@/lib/calculators/engines/water-thermodynamic-properties";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig } from "@/lib/calculators/url-sync";

function parseNumber(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  if (/[a-z]/i.test(value)) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const WATER_THERMO_URL_CONFIG: ParamConfig<WaterThermoInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value: string | null, fallback: UnitSystem) =>
      value === "imperial"
        ? "imperial"
        : value === "metric"
          ? "metric"
          : fallback,
  },
  temperature: {
    param: "temp",
    serialize: (value: number) => String(value),
    deserialize: (value: string | null, fallback: number) =>
      parseNumber(value, fallback),
  },
  pressure: {
    param: "pressure",
    serialize: (value: number) => String(value),
    deserialize: (value: string | null, fallback: number) =>
      parseNumber(value, fallback),
  },
};

export { DEFAULT_WATER_THERMO_INPUTS };
