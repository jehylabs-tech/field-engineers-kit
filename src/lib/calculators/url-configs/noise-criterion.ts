import {
  DEFAULT_NOISE_CRITERION_INPUTS,
  NOISE_SPACE_OPTIONS,
  type NoiseCriterionInputs,
  type NoiseSpaceType,
} from "@/lib/calculators/engines/noise-criterion";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig } from "@/lib/calculators/url-sync";

function parseNumber(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  if (/[a-z]/i.test(value)) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const SPACE_IDS = NOISE_SPACE_OPTIONS.map((s) => s.value);

function splConfig(param: string) {
  return {
    param,
    serialize: (value: number) => String(value),
    deserialize: (value: string | null, fallback: number) =>
      parseNumber(value, fallback),
  };
}

export const NOISE_CRITERION_URL_CONFIG: ParamConfig<NoiseCriterionInputs> = {
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
  spaceType: {
    param: "space",
    serialize: (value: NoiseSpaceType) => value,
    deserialize: (value: string | null, fallback: NoiseSpaceType) =>
      SPACE_IDS.includes(value as NoiseSpaceType)
        ? (value as NoiseSpaceType)
        : fallback,
  },
  spl63Hz: splConfig("s63"),
  spl125Hz: splConfig("s125"),
  spl250Hz: splConfig("s250"),
  spl500Hz: splConfig("s500"),
  spl1000Hz: splConfig("s1k"),
  spl2000Hz: splConfig("s2k"),
  spl4000Hz: splConfig("s4k"),
  spl8000Hz: splConfig("s8k"),
};

export { DEFAULT_NOISE_CRITERION_INPUTS };
