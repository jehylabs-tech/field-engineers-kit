import {
  DEFAULT_API2000_TANK_VENTING_INPUTS,
  type Api2000TankVentingInputs,
} from "@/lib/calculators/engines/api2000-tank-venting";
import {
  environmentIdFromF,
  type Api2000EnvironmentId,
  type Api2000LatitudeId,
  type Api2000VolatilityId,
} from "@/lib/calculators/data/api2000VentingFactors";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const VOLATILITIES: Api2000VolatilityId[] = [
  "flash-point-below-37.8c",
  "flash-point-above-37.8c",
  "hexane-like",
];
const LATITUDES: Api2000LatitudeId[] = ["below-42-deg", "above-42-deg"];
const ENVIRONMENTS: Api2000EnvironmentId[] = [
  "bare",
  "insulated",
  "water-deluge",
];

export const API2000_TANK_VENTING_URL_CONFIG: ParamConfig<Api2000TankVentingInputs> =
  {
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
    tankDiameter: { param: "dia", ...urlSyncHelpers.number },
    tankHeight: { param: "height", ...urlSyncHelpers.number },
    pumpInRate: { param: "pumpIn", ...urlSyncHelpers.number },
    pumpOutRate: { param: "pumpOut", ...urlSyncHelpers.number },
    volatility: {
      param: "volatility",
      serialize: (value: Api2000VolatilityId) => value,
      deserialize: (value, fallback) =>
        VOLATILITIES.includes(value as Api2000VolatilityId)
          ? (value as Api2000VolatilityId)
          : fallback,
    },
    environment: {
      param: "env",
      serialize: (value: Api2000EnvironmentId) => value,
      deserialize: (value, fallback) => {
        if (ENVIRONMENTS.includes(value as Api2000EnvironmentId)) {
          return value as Api2000EnvironmentId;
        }
        // Legacy / spec query: f=1.0 | 0.3 | 0.15
        return fallback;
      },
    },
    latentHeat: { param: "lv", ...urlSyncHelpers.number },
    molecularWeight: { param: "m", ...urlSyncHelpers.number },
    latitude: {
      param: "lat",
      serialize: (value: Api2000LatitudeId) => value,
      deserialize: (value, fallback) =>
        LATITUDES.includes(value as Api2000LatitudeId)
          ? (value as Api2000LatitudeId)
          : fallback,
    },
  };

/** Apply numeric `f` from SpecRoute query onto environment when present. */
export function applyApi2000FFromQuery(
  inputs: Api2000TankVentingInputs,
  fRaw: string | null | undefined,
): Api2000TankVentingInputs {
  if (fRaw == null || fRaw === "") return inputs;
  const f = Number(fRaw);
  if (!Number.isFinite(f)) return inputs;
  return { ...inputs, environment: environmentIdFromF(f) };
}

export { DEFAULT_API2000_TANK_VENTING_INPUTS, environmentIdFromF };
