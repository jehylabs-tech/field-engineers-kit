import {
  DEFAULT_BOLT_TORQUE_INPUTS,
  type BoltGradeId,
  type BoltLubricantId,
  type BoltTorqueInputs,
} from "@/lib/calculators/engines/bolt-torque";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig } from "@/lib/calculators/url-sync";

const LUBRICANTS: BoltLubricantId[] = ["moly", "dry", "ptfe"];
const GRADES: BoltGradeId[] = ["b7", "b8", "b8m"];

export const BOLT_TORQUE_URL_CONFIG: ParamConfig<BoltTorqueInputs> = {
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
  pressureClass: {
    param: "class",
    serialize: (value: string) => value,
    deserialize: (value: string | null, fallback: string) => value ?? fallback,
  },
  lubricant: {
    param: "lube",
    serialize: (value: BoltLubricantId) => value,
    deserialize: (value: string | null, fallback: BoltLubricantId) =>
      LUBRICANTS.includes(value as BoltLubricantId)
        ? (value as BoltLubricantId)
        : fallback,
  },
  boltGrade: {
    param: "grade",
    serialize: (value: BoltGradeId) => value,
    deserialize: (value: string | null, fallback: BoltGradeId) =>
      GRADES.includes(value as BoltGradeId) ? (value as BoltGradeId) : fallback,
  },
};

export { DEFAULT_BOLT_TORQUE_INPUTS };
