import {
  DEFAULT_COMPRESSOR_POLYTROPIC_POWER_INPUTS,
  type CompressorPolytropicPowerInputs,
} from "@/lib/calculators/engines/compressor-polytropic-power";
import type { CompressorGasType } from "@/lib/calculators/data/gasCompressorProperties";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const GAS_TYPES: CompressorGasType[] = [
  "air",
  "natural_gas",
  "nitrogen",
  "custom",
];

export const COMPRESSOR_POLYTROPIC_POWER_URL_CONFIG: ParamConfig<CompressorPolytropicPowerInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    gasType: {
      param: "gas",
      serialize: (value: CompressorGasType) => value,
      deserialize: (value, fallback) =>
        GAS_TYPES.includes(value as CompressorGasType)
          ? (value as CompressorGasType)
          : fallback,
    },
    molecularWeight: { param: "mw", ...urlSyncHelpers.number },
    kRatio: { param: "k", ...urlSyncHelpers.number },
    suctionPress: { param: "p1", ...urlSyncHelpers.number },
    dischargePress: { param: "p2", ...urlSyncHelpers.number },
    suctionTemp: { param: "t1", ...urlSyncHelpers.number },
    volFlow: { param: "flow", ...urlSyncHelpers.number },
    polytropicEff: { param: "eff", ...urlSyncHelpers.number },
    zFactor: { param: "z", ...urlSyncHelpers.number },
  };

export { DEFAULT_COMPRESSOR_POLYTROPIC_POWER_INPUTS };
