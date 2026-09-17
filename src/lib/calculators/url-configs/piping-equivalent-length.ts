import {
  DEFAULT_PIPING_EQUIVALENT_LENGTH_INPUTS,
  type CraneFittingType,
  type PipingEquivalentLengthInputs,
} from "@/lib/calculators/engines/piping-equivalent-length";
import { CRANE_FITTING_OPTIONS } from "@/lib/calculators/data/craneFittingData";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig, urlSyncHelpers } from "@/lib/calculators/url-sync";

const FITTING_IDS = new Set(CRANE_FITTING_OPTIONS.map((f) => f.value));

export const PIPING_EQUIVALENT_LENGTH_URL_CONFIG: ParamConfig<PipingEquivalentLengthInputs> =
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
      ...urlSyncHelpers.string,
    },
    schedule: {
      param: "schedule",
      ...urlSyncHelpers.string,
    },
    fittingType: {
      param: "fittingType",
      serialize: (value: CraneFittingType) => value,
      deserialize: (value: string | null, fallback: CraneFittingType) =>
        value && FITTING_IDS.has(value as CraneFittingType)
          ? (value as CraneFittingType)
          : fallback,
    },
    quantity: {
      param: "qty",
      ...urlSyncHelpers.number,
    },
  };

export { DEFAULT_PIPING_EQUIVALENT_LENGTH_INPUTS };
