import {
  DEFAULT_PIPE_SCHEDULE_INPUTS,
  type PipeScheduleInputs,
} from "@/lib/calculators/engines/pipe-schedule";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig } from "@/lib/calculators/url-sync";

export const PIPE_SCHEDULE_URL_CONFIG: ParamConfig<PipeScheduleInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value: string | null, fallback: UnitSystem) =>
      value === "imperial" ? "imperial" : value === "metric" ? "metric" : fallback,
  },
  nps: {
    param: "nps",
    serialize: (value: string) => value,
    deserialize: (value: string | null, fallback: string) => value ?? fallback,
  },
  schedule: {
    param: "sch",
    serialize: (value: string) => value,
    deserialize: (value: string | null, fallback: string) => value ?? fallback,
  },
  length: {
    param: "length",
    serialize: (value: number | undefined) =>
      value === undefined ? "" : String(value),
    deserialize: (value: string | null, fallback: number | undefined) => {
      if (!value || /[a-z]/i.test(value)) return fallback ?? 6;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : (fallback ?? 6);
    },
  },
  quantity: {
    param: "qty",
    serialize: (value: number | undefined) =>
      value === undefined || value === 1 ? "" : String(value),
    deserialize: (value: string | null, fallback: number | undefined) => {
      if (!value) return fallback ?? 1;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0
        ? Math.floor(parsed)
        : (fallback ?? 1);
    },
  },
};

export { DEFAULT_PIPE_SCHEDULE_INPUTS };
