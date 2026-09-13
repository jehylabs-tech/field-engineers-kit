import {
  DEFAULT_MULTI_PUMP_INPUTS,
  type MultiPumpFlowUnit,
  type MultiPumpInputs,
  type MultiPumpMode,
} from "@/lib/calculators/engines/multi-pump";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const MODES: MultiPumpMode[] = ["parallel", "series"];
const FLOW_UNITS: MultiPumpFlowUnit[] = ["m3h", "gpm"];

export const MULTI_PUMP_URL_CONFIG: ParamConfig<MultiPumpInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value, fallback) =>
      value === "imperial" || value === "metric" ? value : fallback,
  },
  mode: {
    param: "mode",
    serialize: (value: MultiPumpMode) => value,
    deserialize: (value, fallback) =>
      MODES.includes(value as MultiPumpMode)
        ? (value as MultiPumpMode)
        : fallback,
  },
  pumpCount: { param: "n", ...urlSyncHelpers.number },
  headShutoff: { param: "hso", ...urlSyncHelpers.number },
  flowRated: { param: "q", ...urlSyncHelpers.number },
  flowUnit: {
    param: "qunit",
    serialize: (value: MultiPumpFlowUnit) => value,
    deserialize: (value, fallback) =>
      FLOW_UNITS.includes(value as MultiPumpFlowUnit)
        ? (value as MultiPumpFlowUnit)
        : fallback,
  },
  headRated: { param: "hr", ...urlSyncHelpers.number },
  headStatic: { param: "hs", ...urlSyncHelpers.number },
  headFrictionRated: { param: "hf", ...urlSyncHelpers.number },
};

export { DEFAULT_MULTI_PUMP_INPUTS };
