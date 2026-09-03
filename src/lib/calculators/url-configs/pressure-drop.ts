import {
  DEFAULT_PRESSURE_DROP_INPUTS,
  type FlowQuantityUnit,
  type PressureDropFluid,
  type PressureDropInputs,
} from "@/lib/calculators/engines/pressure-drop";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const FLUIDS: PressureDropFluid[] = [
  "water",
  "steam",
  "air",
  "crude",
  "condensate",
];
const FLOW_UNITS: FlowQuantityUnit[] = ["m3h", "gpm", "kgh"];

export const PRESSURE_DROP_URL_CONFIG: ParamConfig<PressureDropInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value, fallback) =>
      value === "imperial" || value === "metric" ? value : fallback,
  },
  fluid: {
    param: "fluid",
    serialize: (value: PressureDropFluid) => value,
    deserialize: (value, fallback) =>
      FLUIDS.includes(value as PressureDropFluid)
        ? (value as PressureDropFluid)
        : fallback,
  },
  temperature: { param: "temp", ...urlSyncHelpers.number },
  roughness: { param: "rough", ...urlSyncHelpers.number },
  flow: { param: "flow", ...urlSyncHelpers.number },
  flowUnit: {
    param: "qunit",
    serialize: (value: FlowQuantityUnit) => value,
    deserialize: (value, fallback) =>
      FLOW_UNITS.includes(value as FlowQuantityUnit)
        ? (value as FlowQuantityUnit)
        : fallback,
  },
  nps: { param: "nps", ...urlSyncHelpers.string },
  schedule: { param: "schedule", ...urlSyncHelpers.string },
  length: { param: "length", ...urlSyncHelpers.number },
  elbowCount: { param: "ells", ...urlSyncHelpers.number },
  gateCount: { param: "gates", ...urlSyncHelpers.number },
  globeCount: { param: "globes", ...urlSyncHelpers.number },
};

export { DEFAULT_PRESSURE_DROP_INPUTS };
