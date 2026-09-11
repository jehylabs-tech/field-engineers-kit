import {
  DEFAULT_PIPE_COPING_INPUTS,
  type PipeCopingCutType,
  type PipeCopingInputs,
  type PipeCopingPoints,
} from "@/lib/calculators/engines/pipe-coping";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const CUTS: PipeCopingCutType[] = ["set-on", "set-in", "miter"];

export const PIPE_COPING_URL_CONFIG: ParamConfig<PipeCopingInputs> = {
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
  headerNps: {
    param: "hnps",
    serialize: (value: string) => value,
    deserialize: (value: string | null, fallback: string) => value ?? fallback,
  },
  headerSchedule: {
    param: "hsch",
    serialize: (value: string) => value,
    deserialize: (value: string | null, fallback: string) => value ?? fallback,
  },
  branchNps: {
    param: "bnps",
    serialize: (value: string) => value,
    deserialize: (value: string | null, fallback: string) => value ?? fallback,
  },
  branchSchedule: {
    param: "bsch",
    serialize: (value: string) => value,
    deserialize: (value: string | null, fallback: string) => value ?? fallback,
  },
  angleDeg: {
    param: "theta",
    serialize: (value: number) => String(Math.round(value)),
    deserialize: (value: string | null, fallback: number) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      return Math.min(90, Math.max(30, n));
    },
  },
  offset: { param: "e", ...urlSyncHelpers.number },
  cutType: {
    param: "cut",
    serialize: (value: PipeCopingCutType) => value,
    deserialize: (value: string | null, fallback: PipeCopingCutType) =>
      CUTS.includes(value as PipeCopingCutType)
        ? (value as PipeCopingCutType)
        : fallback,
  },
  points: {
    param: "pts",
    serialize: (value: PipeCopingPoints) => String(value),
    deserialize: (value: string | null, fallback: PipeCopingPoints) =>
      value === "32" ? 32 : value === "16" ? 16 : fallback,
  },
};

export { DEFAULT_PIPE_COPING_INPUTS };
