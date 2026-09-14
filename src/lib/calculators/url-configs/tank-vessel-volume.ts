import {
  DEFAULT_TANK_VESSEL_VOLUME_INPUTS,
  TANK_FLUID_OPTIONS,
  TANK_HEAD_TYPE_OPTIONS,
  TANK_ORIENTATION_OPTIONS,
  type TankFluid,
  type TankHeadType,
  type TankOrientation,
  type TankVesselVolumeInputs,
} from "@/lib/calculators/engines/tank-vessel-volume";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const ORIENTATIONS = TANK_ORIENTATION_OPTIONS.map((o) => o.value);
const HEAD_TYPES = TANK_HEAD_TYPE_OPTIONS.map((h) => h.value);
const FLUIDS = TANK_FLUID_OPTIONS.map((f) => f.value);

export const TANK_VESSEL_VOLUME_URL_CONFIG: ParamConfig<TankVesselVolumeInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    orientation: {
      param: "orientation",
      serialize: (value: TankOrientation) => value,
      deserialize: (value, fallback) =>
        ORIENTATIONS.includes(value as TankOrientation)
          ? (value as TankOrientation)
          : fallback,
    },
    headType: {
      param: "headType",
      serialize: (value: TankHeadType) => value,
      deserialize: (value, fallback) =>
        HEAD_TYPES.includes(value as TankHeadType)
          ? (value as TankHeadType)
          : fallback,
    },
    diameter: { param: "diameter", ...urlSyncHelpers.number },
    length: { param: "length", ...urlSyncHelpers.number },
    liquidLevel: { param: "liquidLevel", ...urlSyncHelpers.number },
    fluid: {
      param: "fluid",
      serialize: (value: TankFluid) => value,
      deserialize: (value, fallback) =>
        FLUIDS.includes(value as TankFluid) ? (value as TankFluid) : fallback,
    },
    densityKgM3: { param: "dens", ...urlSyncHelpers.number },
  };

export { DEFAULT_TANK_VESSEL_VOLUME_INPUTS };
