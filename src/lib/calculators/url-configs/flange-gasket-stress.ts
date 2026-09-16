import {
  DEFAULT_FLANGE_GASKET_STRESS_INPUTS,
  type FlangeGasketStressInputs,
  type GasketStressTypeId,
} from "@/lib/calculators/engines/flange-gasket-stress";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig } from "@/lib/calculators/url-sync";

const GASKET_TYPES: GasketStressTypeId[] = [
  "soft_rubber",
  "compressed_fiber",
  "spiral_wound_filled",
  "ptfe_sheet",
  "rtj_soft_iron",
];

function parseNumber(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  // Plant-bus values like "740psi" / "51bar" share ?pressure= — keep calculator field on fallback
  // so carry-over can convert by unit; do not coerce the unit suffix into a bare number.
  if (/[a-z]/i.test(value)) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const FLANGE_GASKET_STRESS_URL_CONFIG: ParamConfig<FlangeGasketStressInputs> =
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
    nps: {
      param: "nps",
      serialize: (value: string) => value,
      deserialize: (value: string | null, fallback: string) => value ?? fallback,
    },
    flangeClass: {
      param: "class",
      serialize: (value: string) => value,
      deserialize: (value: string | null, fallback: string) => {
        if (value) return value.replace(/^Class\s+/i, "");
        return fallback;
      },
    },
    gasketType: {
      param: "gasketType",
      serialize: (value: GasketStressTypeId) => value,
      deserialize: (value: string | null, fallback: GasketStressTypeId) =>
        GASKET_TYPES.includes(value as GasketStressTypeId)
          ? (value as GasketStressTypeId)
          : fallback,
    },
    pressure: {
      param: "pressure",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
    targetBoltStress: {
      param: "targetBoltStress",
      serialize: (value: number) => String(value),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
  };

export { DEFAULT_FLANGE_GASKET_STRESS_INPUTS };
