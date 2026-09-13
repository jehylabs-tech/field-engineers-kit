import {
  DEFAULT_PUMP_MCSF_INPUTS,
  type McsfFlowUnit,
  type McsfFluid,
  type PumpMcsfInputs,
} from "@/lib/calculators/engines/pump-mcsf";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const FLUIDS: McsfFluid[] = [
  "water",
  "water-hot",
  "naphtha",
  "crude",
  "amine",
  "custom",
];
const FLOW_UNITS: McsfFlowUnit[] = ["m3h", "gpm"];

export const PUMP_MCSF_URL_CONFIG: ParamConfig<PumpMcsfInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value, fallback) =>
      value === "imperial" || value === "metric" ? value : fallback,
  },
  fluid: {
    param: "fluid",
    serialize: (value: McsfFluid) => value,
    deserialize: (value, fallback) =>
      FLUIDS.includes(value as McsfFluid) ? (value as McsfFluid) : fallback,
  },
  flowBep: { param: "q", ...urlSyncHelpers.number },
  flowUnit: {
    param: "qunit",
    serialize: (value: McsfFlowUnit) => value,
    deserialize: (value, fallback) =>
      FLOW_UNITS.includes(value as McsfFlowUnit)
        ? (value as McsfFlowUnit)
        : fallback,
  },
  headShutoff: { param: "hso", ...urlSyncHelpers.number },
  powerRated: { param: "pwr", ...urlSyncHelpers.number },
  fluidTemp: { param: "temp", ...urlSyncHelpers.number },
  density: { param: "dens", ...urlSyncHelpers.number },
  cp: { param: "cp", ...urlSyncHelpers.number },
  sg: { param: "sg", ...urlSyncHelpers.number },
  deltaTMax: { param: "dtmax", ...urlSyncHelpers.number },
  mcsfRatio: { param: "mcsf", ...urlSyncHelpers.number },
  soPowerRatio: { param: "sor", ...urlSyncHelpers.number },
  etaMin: { param: "etamin", ...urlSyncHelpers.number },
  bypassDp: { param: "dp", ...urlSyncHelpers.number },
  bypassVmax: { param: "vmax", ...urlSyncHelpers.number },
  flowOp: { param: "qop", ...urlSyncHelpers.number },
};

export { DEFAULT_PUMP_MCSF_INPUTS };
