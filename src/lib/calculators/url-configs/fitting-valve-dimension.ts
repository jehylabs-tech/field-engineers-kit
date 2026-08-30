import {
  DEFAULT_FITTING_VALVE_DIMENSION_INPUTS,
  type FittingValveDimensionInputs,
} from "@/lib/calculators/engines/fitting-valve-dimension";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig } from "@/lib/calculators/url-sync";

export const FITTING_VALVE_DIMENSION_URL_CONFIG: ParamConfig<FittingValveDimensionInputs> =
  {
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
    componentId: {
      param: "component",
      serialize: (value: string) => value,
      deserialize: (value: string | null, fallback: string) => value ?? fallback,
    },
    nps: {
      param: "nps",
      serialize: (value: string) => value,
      deserialize: (value: string | null, fallback: string) => value ?? fallback,
    },
    pressureClass: {
      param: "class",
      serialize: (value: string) => value,
      deserialize: (value: string | null, fallback: string) => value ?? fallback,
    },
    includeGasketTakeout: {
      param: "gasket",
      serialize: (value: boolean) => (value ? "1" : "0"),
      deserialize: (value: string | null, fallback: boolean) =>
        value === "1" ? true : value === "0" ? false : fallback,
    },
    gasketThicknessMm: {
      param: "gtk",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) => {
        if (value == null || value === "") return fallback;
        const n = Number(value);
        return Number.isFinite(n) && n >= 0 ? n : fallback;
      },
    },
    gasketJoints: {
      param: "gj",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) => {
        if (value == null || value === "") return fallback;
        const n = Number(value);
        return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
      },
    },
  };

export { DEFAULT_FITTING_VALVE_DIMENSION_INPUTS };
