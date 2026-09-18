import {
  DEFAULT_STEAM_PROPERTIES_IAPWS_INPUTS,
  type SteamInputMode,
  type SteamPropertiesIapwsInputs,
} from "@/lib/calculators/engines/steam-properties-iapws";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig } from "@/lib/calculators/url-sync";

function parseNumber(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  if (/[a-z]/i.test(value)) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseMode(
  value: string | null,
  fallback: SteamInputMode,
): SteamInputMode {
  if (value === "saturation" || value === "superheated") return value;
  return fallback;
}

export const STEAM_PROPERTIES_IAPWS_URL_CONFIG: ParamConfig<SteamPropertiesIapwsInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value: string | null, fallback: UnitSystem) =>
        value === "imperial"
          ? "imperial"
          : value === "metric"
            ? "metric"
            : fallback,
    },
    pressure: {
      param: "pressure",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
    inputMode: {
      param: "inputMode",
      serialize: (value: SteamInputMode) => value,
      deserialize: (value: string | null, fallback: SteamInputMode) =>
        parseMode(value, fallback),
    },
    temperature: {
      param: "temp",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
    steamQuality: {
      param: "steamQuality",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
  };

export { DEFAULT_STEAM_PROPERTIES_IAPWS_INPUTS };
