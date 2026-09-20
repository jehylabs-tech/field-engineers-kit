import {
  DEFAULT_PSV_PRV_INPUTS,
  type PsvFluidType,
  type PsvPrvScreeningInputs,
} from "@/lib/calculators/engines/psv-prv-screening";
import { type ParamConfig, urlSyncHelpers } from "@/lib/calculators/url-sync";

export const PSV_PRV_URL_CONFIG: ParamConfig<PsvPrvScreeningInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value) => value,
    deserialize: (value, fallback) =>
      value === "imperial" || value === "metric" ? value : fallback,
  },
  fluidType: {
    param: "fluidType",
    serialize: (value: PsvFluidType) => value,
    deserialize: (value, fallback) =>
      value === "liquid" || value === "gas" ? value : fallback,
  },
  setPressure: { param: "setPressure", ...urlSyncHelpers.number },
  requiredCapacity: { param: "requiredCapacity", ...urlSyncHelpers.number },
  overpressurePercent: {
    param: "overpressurePercent",
    ...urlSyncHelpers.number,
  },
  molecularWeight: { param: "molecularWeight", ...urlSyncHelpers.number },
  relievingTemperature: {
    param: "relievingTemperature",
    ...urlSyncHelpers.number,
  },
  liquidDensity: { param: "liquidDensity", ...urlSyncHelpers.number },
  specificHeatRatio: {
    param: "specificHeatRatio",
    ...urlSyncHelpers.number,
  },
};

export { DEFAULT_PSV_PRV_INPUTS };
