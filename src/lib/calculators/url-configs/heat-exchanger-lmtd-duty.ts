import {
  DEFAULT_HEAT_EXCHANGER_LMTD_DUTY_INPUTS,
  type HeatExchangerLmtdDutyInputs,
} from "@/lib/calculators/engines/heat-exchanger-lmtd-duty";
import { type ParamConfig, urlSyncHelpers } from "@/lib/calculators/url-sync";

export const HEAT_EXCHANGER_LMTD_DUTY_URL_CONFIG: ParamConfig<HeatExchangerLmtdDutyInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    fluidTypeHot: {
      param: "fluid",
      serialize: (value) => value,
      deserialize: (value, fallback) =>
        value === "water" || value === "steam" || value === "custom"
          ? value
          : fallback,
    },
    tempHotIn: { param: "th_in", ...urlSyncHelpers.number },
    tempHotOut: { param: "th_out", ...urlSyncHelpers.number },
    massFlowHot: { param: "flow", ...urlSyncHelpers.number },
    cpHot: { param: "cp_hot", ...urlSyncHelpers.number },
    fluidTypeCold: {
      param: "fluid_cold",
      serialize: (value) => value,
      deserialize: (value, fallback) =>
        value === "water" || value === "custom" ? value : fallback,
    },
    tempColdIn: { param: "tc_in", ...urlSyncHelpers.number },
    tempColdOut: { param: "tc_out", ...urlSyncHelpers.number },
    cpCold: { param: "cp_cold", ...urlSyncHelpers.number },
    shellPasses: {
      param: "shells",
      serialize: (value) => String(value),
      deserialize: (value, fallback) => {
        const n = Number(value);
        return n === 1 || n === 2 || n === 4 ? n : fallback;
      },
    },
    overallU: { param: "u", ...urlSyncHelpers.number },
  };

export { DEFAULT_HEAT_EXCHANGER_LMTD_DUTY_INPUTS };
