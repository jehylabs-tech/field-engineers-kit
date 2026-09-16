import {
  DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS,
  type PipeBranchReinforcementInputs,
} from "@/lib/calculators/engines/pipe-branch-reinforcement";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

function parseNumber(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const PIPE_BRANCH_REINFORCEMENT_URL_CONFIG: ParamConfig<PipeBranchReinforcementInputs> =
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
    designPressure: {
      param: "pressure",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
    designTemp: {
      param: "temp",
      serialize: (value: number) => String(Math.round(value)),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
    allowStressHeader: {
      param: "sh",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
    allowStressBranch: {
      param: "sb",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
    allowStressPad: {
      param: "sr",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
    jointEfficiency: {
      param: "e",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
    weldW: {
      param: "w",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
    yFactor: {
      param: "y",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
    corrosionAllowance: {
      param: "ca",
      ...urlSyncHelpers.number,
    },
    millTolerance: {
      param: "mill",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
    branchAngle: {
      param: "angle",
      serialize: (value: number) => String(Math.round(value)),
      deserialize: (value: string | null, fallback: number) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(90, Math.max(45, n));
      },
    },
    weldLegHeader: {
      param: "legh",
      ...urlSyncHelpers.number,
    },
    weldLegBranch: {
      param: "legb",
      ...urlSyncHelpers.number,
    },
  };

export { DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS };
