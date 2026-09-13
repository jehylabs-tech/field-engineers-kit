import {
  DEFAULT_PUMP_TDH_INPUTS,
  type PumpTdhInputs,
  type TdhFlowUnit,
  type TdhFluid,
} from "@/lib/calculators/engines/pump-tdh";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const FLUIDS: TdhFluid[] = [
  "water",
  "seawater",
  "condensate",
  "light-hc",
  "custom",
];
const FLOW_UNITS: TdhFlowUnit[] = ["m3h", "gpm"];

export const PUMP_TDH_URL_CONFIG: ParamConfig<PumpTdhInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value, fallback) =>
      value === "imperial" || value === "metric" ? value : fallback,
  },
  fluid: {
    param: "fluid",
    serialize: (value: TdhFluid) => value,
    deserialize: (value, fallback) =>
      FLUIDS.includes(value as TdhFluid) ? (value as TdhFluid) : fallback,
  },
  flow: { param: "q", ...urlSyncHelpers.number },
  flowUnit: {
    param: "qunit",
    serialize: (value: TdhFlowUnit) => value,
    deserialize: (value, fallback) =>
      FLOW_UNITS.includes(value as TdhFlowUnit)
        ? (value as TdhFlowUnit)
        : fallback,
  },
  staticHead: { param: "hs", ...urlSyncHelpers.number },
  frictionHead: { param: "hf", ...urlSyncHelpers.number },
  pressureHead: { param: "hp", ...urlSyncHelpers.number },
  density: { param: "dens", ...urlSyncHelpers.number },
  viscosityCp: { param: "visc", ...urlSyncHelpers.number },
  pumpEfficiency: { param: "etap", ...urlSyncHelpers.number },
  motorEfficiency: { param: "etam", ...urlSyncHelpers.number },
  serviceFactor: { param: "sf", ...urlSyncHelpers.number },
};

export { DEFAULT_PUMP_TDH_INPUTS };
