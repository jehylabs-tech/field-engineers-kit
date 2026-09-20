import {
  DEFAULT_CONTROL_VALVE_CHOKED_INPUTS,
  type ChokedFluidState,
  type ControlValveChokedInputs,
} from "@/lib/calculators/engines/control-valve-choked-screening";
import type { IsaValveTrimKind } from "@/lib/calculators/data/isaValveTrimData";
import { type ParamConfig, urlSyncHelpers } from "@/lib/calculators/url-sync";

const TRIM_IDS = new Set<IsaValveTrimKind>([
  "globe_single",
  "globe_cage",
  "butterfly_60",
  "butterfly_90",
  "ball_full",
  "ball_v_notch",
  "custom",
]);

export const CONTROL_VALVE_CHOKED_URL_CONFIG: ParamConfig<ControlValveChokedInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    fluidState: {
      param: "fluidState",
      serialize: (value: ChokedFluidState) => value,
      deserialize: (value, fallback) =>
        value === "liquid" || value === "gas" ? value : fallback,
    },
    p1: { param: "p1", ...urlSyncHelpers.number },
    p2: { param: "p2", ...urlSyncHelpers.number },
    xtFactor: { param: "xtFactor", ...urlSyncHelpers.number },
    flFactor: { param: "flFactor", ...urlSyncHelpers.number },
    specificHeatRatio: {
      param: "specificHeatRatio",
      ...urlSyncHelpers.number,
    },
    vaporPressure: { param: "vaporPressure", ...urlSyncHelpers.number },
    criticalPressure: {
      param: "criticalPressure",
      ...urlSyncHelpers.number,
    },
    trimPreset: {
      param: "trim",
      serialize: (value: IsaValveTrimKind | undefined) => value ?? "",
      deserialize: (value, fallback) =>
        value && TRIM_IDS.has(value as IsaValveTrimKind)
          ? (value as IsaValveTrimKind)
          : fallback,
    },
  };

export { DEFAULT_CONTROL_VALVE_CHOKED_INPUTS };
