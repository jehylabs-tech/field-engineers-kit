import {
  DEFAULT_PUMP_NPSH_INPUTS,
  type NpshFluid,
  type PumpNpshInputs,
  type SuctionArrangement,
} from "@/lib/calculators/engines/pump-npsh";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const FLUIDS: NpshFluid[] = ["water", "seawater", "condensate", "light-hc"];
const ARRS: SuctionArrangement[] = ["flooded", "lift"];

export const PUMP_NPSH_URL_CONFIG: ParamConfig<PumpNpshInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value, fallback) =>
      value === "imperial" || value === "metric" ? value : fallback,
  },
  fluid: {
    param: "fluid",
    serialize: (value: NpshFluid) => value,
    deserialize: (value, fallback) =>
      FLUIDS.includes(value as NpshFluid) ? (value as NpshFluid) : fallback,
  },
  temperature: { param: "temp", ...urlSyncHelpers.number },
  surfacePressureAbs: { param: "ps", ...urlSyncHelpers.number },
  arrangement: {
    param: "arr",
    serialize: (value: SuctionArrangement) => value,
    deserialize: (value, fallback) =>
      ARRS.includes(value as SuctionArrangement)
        ? (value as SuctionArrangement)
        : fallback,
  },
  staticHeight: { param: "hs", ...urlSyncHelpers.number },
  frictionLoss: { param: "hf", ...urlSyncHelpers.number },
  npshr: { param: "npshr", ...urlSyncHelpers.number },
};

export { DEFAULT_PUMP_NPSH_INPUTS };
