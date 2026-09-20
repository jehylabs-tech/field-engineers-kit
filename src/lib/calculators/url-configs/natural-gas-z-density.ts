import {
  DEFAULT_NATURAL_GAS_Z_DENSITY_INPUTS,
  type NaturalGasZDensityInputs,
} from "@/lib/calculators/engines/natural-gas-z-density";
import { type ParamConfig, urlSyncHelpers } from "@/lib/calculators/url-sync";

export const NATURAL_GAS_Z_DENSITY_URL_CONFIG: ParamConfig<NaturalGasZDensityInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    pressure: { param: "pressure", ...urlSyncHelpers.number },
    temperature: { param: "temperature", ...urlSyncHelpers.number },
    specificGravity: {
      param: "specificGravity",
      ...urlSyncHelpers.number,
    },
    co2MolePercent: {
      param: "co2MolePercent",
      ...urlSyncHelpers.number,
    },
    n2MolePercent: {
      param: "n2MolePercent",
      ...urlSyncHelpers.number,
    },
  };

export { DEFAULT_NATURAL_GAS_Z_DENSITY_INPUTS };
