import {
  DEFAULT_CONTROL_VALVE_NOISE_INPUTS,
  type ControlValveNoiseFluid,
  type ControlValveNoiseInputs,
} from "@/lib/calculators/engines/control-valve-noise";
import { type ParamConfig, urlSyncHelpers } from "@/lib/calculators/url-sync";

export const CONTROL_VALVE_NOISE_URL_CONFIG: ParamConfig<ControlValveNoiseInputs> =
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
        return value.trim().toLowerCase().replace(/"/g, "").replace(/in$/, "") ||
          fallback;
      },
    },
    schedule: {
      param: "schedule",
      ...urlSyncHelpers.string,
    },
    fluidType: {
      param: "fluidType",
      serialize: (value: ControlValveNoiseFluid) => value,
      deserialize: (value, fallback) =>
        value === "liquid" || value === "gas" ? value : fallback,
    },
    cv: {
      param: "cv",
      ...urlSyncHelpers.number,
    },
    p1: {
      param: "p1",
      ...urlSyncHelpers.number,
    },
    p2: {
      param: "p2",
      ...urlSyncHelpers.number,
    },
    temp: {
      param: "temp",
      ...urlSyncHelpers.number,
    },
    massFlow: {
      param: "massFlow",
      ...urlSyncHelpers.number,
    },
  };

export { DEFAULT_CONTROL_VALVE_NOISE_INPUTS };
