import {
  DEFAULT_BOLT_WRENCH_LOOKUP_INPUTS,
  type BoltWrenchLookupInputs,
} from "@/lib/calculators/engines/bolt-wrench-lookup";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig } from "@/lib/calculators/url-sync";

export const BOLT_WRENCH_LOOKUP_URL_CONFIG: ParamConfig<BoltWrenchLookupInputs> =
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
    facing: {
      param: "facing",
      serialize: (value: string | undefined) => value ?? "rf",
      deserialize: (value: string | null, fallback: string | undefined) =>
        value || fallback || "rf",
    },
  };

export { DEFAULT_BOLT_WRENCH_LOOKUP_INPUTS };
