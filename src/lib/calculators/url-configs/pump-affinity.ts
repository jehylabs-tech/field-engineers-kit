import {
  DEFAULT_PUMP_AFFINITY_INPUTS,
  type AffinityFlowUnit,
  type AffinityMode,
  type PumpAffinityInputs,
} from "@/lib/calculators/engines/pump-affinity";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const MODES: AffinityMode[] = ["speed", "diameter", "combined"];
const FLOW_UNITS: AffinityFlowUnit[] = ["m3h", "gpm"];

export const PUMP_AFFINITY_URL_CONFIG: ParamConfig<PumpAffinityInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value, fallback) =>
      value === "imperial" || value === "metric" ? value : fallback,
  },
  mode: {
    param: "mode",
    serialize: (value: AffinityMode) => value,
    deserialize: (value, fallback) =>
      MODES.includes(value as AffinityMode) ? (value as AffinityMode) : fallback,
  },
  speed1: { param: "n1", ...urlSyncHelpers.number },
  speed2: { param: "n2", ...urlSyncHelpers.number },
  diameter1: { param: "d1", ...urlSyncHelpers.number },
  diameter2: { param: "d2", ...urlSyncHelpers.number },
  flow1: { param: "q", ...urlSyncHelpers.number },
  flowUnit: {
    param: "qunit",
    serialize: (value: AffinityFlowUnit) => value,
    deserialize: (value, fallback) =>
      FLOW_UNITS.includes(value as AffinityFlowUnit)
        ? (value as AffinityFlowUnit)
        : fallback,
  },
  head1: { param: "head", ...urlSyncHelpers.number },
  power1: { param: "pwr", ...urlSyncHelpers.number },
};

export { DEFAULT_PUMP_AFFINITY_INPUTS };
