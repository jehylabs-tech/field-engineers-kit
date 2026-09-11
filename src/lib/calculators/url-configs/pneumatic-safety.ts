import {
  DEFAULT_PNEUMATIC_SAFETY_INPUTS,
  type PneumaticGas,
  type PneumaticSafetyInputs,
  type PneumaticVolumeMode,
} from "@/lib/calculators/engines/pneumatic-safety";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const GASES: PneumaticGas[] = ["air", "nitrogen", "helium"];
const MODES: PneumaticVolumeMode[] = ["volume", "pipe"];

export const PNEUMATIC_SAFETY_URL_CONFIG: ParamConfig<PneumaticSafetyInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value, fallback) =>
      value === "imperial" || value === "metric" ? value : fallback,
  },
  mode: {
    param: "mode",
    serialize: (value: PneumaticVolumeMode) => value,
    deserialize: (value, fallback) =>
      MODES.includes(value as PneumaticVolumeMode)
        ? (value as PneumaticVolumeMode)
        : fallback,
  },
  testPressure: { param: "pt", ...urlSyncHelpers.number },
  volume: { param: "vol", ...urlSyncHelpers.number },
  nps: { param: "nps", ...urlSyncHelpers.string },
  schedule: { param: "sch", ...urlSyncHelpers.string },
  length: { param: "length", ...urlSyncHelpers.number },
  gas: {
    param: "gas",
    serialize: (value: PneumaticGas) => value,
    deserialize: (value, fallback) =>
      GASES.includes(value as PneumaticGas)
        ? (value as PneumaticGas)
        : fallback,
  },
};

export { DEFAULT_PNEUMATIC_SAFETY_INPUTS };
