import {
  DEFAULT_FLOW_VELOCITY_INPUTS,
  type FlowVelocityInputs,
  type VelocityFlowUnit,
} from "@/lib/calculators/engines/flow-velocity";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const FLOW_UNITS: VelocityFlowUnit[] = ["m3h", "gpm"];

export const FLOW_VELOCITY_URL_CONFIG: ParamConfig<FlowVelocityInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value, fallback) =>
      value === "imperial" || value === "metric" ? value : fallback,
  },
  nps: { param: "nps", ...urlSyncHelpers.string },
  schedule: { param: "schedule", ...urlSyncHelpers.string },
  flow: { param: "flow", ...urlSyncHelpers.number },
  flowUnit: {
    param: "qunit",
    serialize: (value: VelocityFlowUnit) => value,
    deserialize: (value, fallback) =>
      FLOW_UNITS.includes(value as VelocityFlowUnit)
        ? (value as VelocityFlowUnit)
        : fallback,
  },
  density: { param: "density", ...urlSyncHelpers.number },
  erosionC: { param: "c", ...urlSyncHelpers.number },
};

export { DEFAULT_FLOW_VELOCITY_INPUTS };
