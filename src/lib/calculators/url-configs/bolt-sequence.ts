import {
  BOLT_SEQUENCE_COUNTS,
  DEFAULT_BOLT_SEQUENCE_INPUTS,
  type BoltSequenceInputs,
  type BoltSequencePattern,
} from "@/lib/calculators/engines/bolt-sequence";
import { type ParamConfig } from "@/lib/calculators/url-sync";

const PATTERNS: BoltSequencePattern[] = ["star", "circular"];
const COUNT_SET = new Set<number>(BOLT_SEQUENCE_COUNTS);

export const BOLT_SEQUENCE_URL_CONFIG: ParamConfig<BoltSequenceInputs> = {
  boltCount: {
    param: "bolts",
    serialize: (value: number) => String(value),
    deserialize: (value: string | null, fallback: number) => {
      const n = Number(value);
      return Number.isFinite(n) && COUNT_SET.has(n) ? n : fallback;
    },
  },
  pattern: {
    param: "pattern",
    serialize: (value: BoltSequencePattern) => value,
    deserialize: (value: string | null, fallback: BoltSequencePattern) =>
      PATTERNS.includes(value as BoltSequencePattern)
        ? (value as BoltSequencePattern)
        : fallback,
  },
  nps: {
    param: "nps",
    serialize: (value: string) => value,
    deserialize: (value: string | null, fallback: string) => value ?? fallback,
  },
  pressureClass: {
    param: "class",
    serialize: (value: string) => value,
    deserialize: (value: string | null, fallback: string) => value ?? fallback,
  },
  targetTorqueNm: {
    param: "T",
    serialize: (value: number) =>
      Number.isFinite(value) && value > 0 ? String(value) : "",
    deserialize: (value: string | null, fallback: number) => {
      if (!value || value.trim() === "") return 0;
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    },
  },
};

export { DEFAULT_BOLT_SEQUENCE_INPUTS };
