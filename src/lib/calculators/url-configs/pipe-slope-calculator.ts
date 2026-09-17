import {
  DEFAULT_PIPE_SLOPE_INPUTS,
  type PipeSlopeInputs,
} from "@/lib/calculators/engines/pipe-slope-calculator";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig, urlSyncHelpers } from "@/lib/calculators/url-sync";

export const PIPE_SLOPE_URL_CONFIG: ParamConfig<PipeSlopeInputs> = {
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
  rise: {
    param: "rise",
    ...urlSyncHelpers.number,
  },
  run: {
    param: "run",
    ...urlSyncHelpers.number,
  },
  pipeNps: {
    param: "nps",
    ...urlSyncHelpers.string,
  },
};

export { DEFAULT_PIPE_SLOPE_INPUTS };
