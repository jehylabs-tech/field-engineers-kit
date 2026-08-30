import {
  DEFAULT_BUTT_WELD_FITTING_INPUTS,
  type ButtWeldFittingInputs,
} from "@/lib/calculators/engines/butt-weld-fitting";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig } from "@/lib/calculators/url-sync";

export const BUTT_WELD_FITTING_URL_CONFIG: ParamConfig<ButtWeldFittingInputs> = {
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
  schedule: {
    param: "sch",
    serialize: (value: string) => value,
    deserialize: (value: string | null, fallback: string) => value ?? fallback,
  },
};

export { DEFAULT_BUTT_WELD_FITTING_INPUTS };
