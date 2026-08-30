import {
  DEFAULT_FLANGE_DIMENSION_INPUTS,
  type FlangeDimensionInputs,
} from "@/lib/calculators/engines/flange-dimension";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig } from "@/lib/calculators/url-sync";

export const FLANGE_DIMENSION_URL_CONFIG: ParamConfig<FlangeDimensionInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value: string | null, fallback: UnitSystem) =>
      value === "imperial" ? "imperial" : value === "metric" ? "metric" : fallback,
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
  flangeType: {
    param: "flange_type",
    serialize: (value: string | undefined) => value ?? "wn",
    deserialize: (value: string | null, fallback: string | undefined) =>
      value || fallback || "wn",
  },
  facing: {
    param: "facing",
    serialize: (value: string | undefined) => value ?? "rf",
    deserialize: (value: string | null, fallback: string | undefined) =>
      value || fallback || "rf",
  },
};

export { DEFAULT_FLANGE_DIMENSION_INPUTS };
