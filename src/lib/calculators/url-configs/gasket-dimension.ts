import {
  DEFAULT_GASKET_DIMENSION_INPUTS,
  type GasketDimensionInputs,
} from "@/lib/calculators/engines/gasket-dimension";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig } from "@/lib/calculators/url-sync";

export const GASKET_DIMENSION_URL_CONFIG: ParamConfig<GasketDimensionInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value: string | null, fallback: UnitSystem) =>
      value === "imperial" ? "imperial" : value === "metric" ? "metric" : fallback,
  },
  gasketTypeId: {
    param: "type",
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
};

export { DEFAULT_GASKET_DIMENSION_INPUTS };
