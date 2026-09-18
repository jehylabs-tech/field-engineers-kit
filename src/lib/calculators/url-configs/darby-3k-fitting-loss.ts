import {
  DEFAULT_DARBY_3K_FITTING_LOSS_INPUTS,
  type Darby3kFittingLossInputs,
} from "@/lib/calculators/engines/darby-3k-fitting-loss";
import type { Darby3kFittingType } from "@/lib/calculators/data/darby3kFittingData";
import { type ParamConfig, urlSyncHelpers } from "@/lib/calculators/url-sync";

const FITTING_TYPES = new Set<Darby3kFittingType>([
  "elbow_90_std",
  "elbow_90_long",
  "elbow_45_std",
  "tee_flow_through",
  "tee_branch",
  "gate_valve_full",
  "globe_valve_std",
  "check_swing",
  "ball_full",
  "butterfly_valve",
]);

export const DARBY_3K_FITTING_LOSS_URL_CONFIG: ParamConfig<Darby3kFittingLossInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    nps: {
      param: "nps",
      serialize: (value: string) => value,
      deserialize: (value: string | null, fallback: string) => {
        if (!value) return fallback;
        return (
          value.trim().toLowerCase().replace(/"/g, "").replace(/in$/, "") ||
          fallback
        );
      },
    },
    schedule: {
      param: "schedule",
      ...urlSyncHelpers.string,
    },
    fittingType: {
      param: "fittingType",
      serialize: (value: Darby3kFittingType) => value,
      deserialize: (value, fallback) =>
        value && FITTING_TYPES.has(value as Darby3kFittingType)
          ? (value as Darby3kFittingType)
          : fallback,
    },
    reynoldsNumber: {
      param: "re",
      ...urlSyncHelpers.number,
    },
    quantity: {
      param: "qty",
      ...urlSyncHelpers.number,
    },
  };

export { DEFAULT_DARBY_3K_FITTING_LOSS_INPUTS };
