import {
  DEFAULT_BEARING_LIFE_L10H_INPUTS,
  type BearingLifeL10hInputs,
  type BearingTypeId,
  type BearingXyMode,
} from "@/lib/calculators/engines/bearing-life-l10h";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const BEARING_TYPES: BearingTypeId[] = [
  "deep-groove-ball",
  "angular-contact-ball",
  "cylindrical-roller",
  "spherical-roller",
  "tapered-roller",
];

const XY_MODES: BearingXyMode[] = ["manual", "auto"];

export const BEARING_LIFE_L10H_URL_CONFIG: ParamConfig<BearingLifeL10hInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value, fallback) =>
      value === "imperial" || value === "metric"
        ? value
        : value === "imp"
          ? "imperial"
          : fallback,
  },
  bearingType: {
    param: "type",
    serialize: (value: BearingTypeId) => value,
    deserialize: (value, fallback) =>
      BEARING_TYPES.includes(value as BearingTypeId)
        ? (value as BearingTypeId)
        : fallback,
  },
  dynamicLoadRating: { param: "c", ...urlSyncHelpers.number },
  radialLoad: { param: "fr", ...urlSyncHelpers.number },
  axialLoad: { param: "fa", ...urlSyncHelpers.number },
  rotationalSpeed: { param: "rpm", ...urlSyncHelpers.number },
  radialFactor: { param: "x", ...urlSyncHelpers.number },
  thrustFactor: { param: "y", ...urlSyncHelpers.number },
  xyMode: {
    param: "xymode",
    serialize: (value: BearingXyMode) => value,
    deserialize: (value, fallback) =>
      XY_MODES.includes(value as BearingXyMode)
        ? (value as BearingXyMode)
        : fallback,
  },
};

export { DEFAULT_BEARING_LIFE_L10H_INPUTS };
