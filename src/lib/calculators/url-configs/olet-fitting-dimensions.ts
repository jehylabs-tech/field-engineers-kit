import {
  DEFAULT_OLET_FITTING_DIMENSIONS_INPUTS,
  type OletFittingDimensionsInputs,
  type OletMaterialId,
  type OletType,
} from "@/lib/calculators/engines/olet-fitting-dimensions";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig, urlSyncHelpers } from "@/lib/calculators/url-sync";

function parseNumber(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const OLET_FITTING_DIMENSIONS_URL_CONFIG: ParamConfig<OletFittingDimensionsInputs> =
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
    oletType: {
      param: "type",
      serialize: (value: OletType) => value,
      deserialize: (value: string | null, fallback: OletType) => {
        if (value === "weldolet" || value === "sockolet" || value === "threadolet") {
          return value;
        }
        return fallback;
      },
    },
    runNps: {
      param: "runSize",
      serialize: (value: string) => value,
      deserialize: (value: string | null, fallback: string) => value ?? fallback,
    },
    branchNps: {
      param: "branchSize",
      serialize: (value: string) => value,
      deserialize: (value: string | null, fallback: string) => value ?? fallback,
    },
    rating: {
      param: "rating",
      serialize: (value: string) => value,
      deserialize: (value: string | null, fallback: string) => value ?? fallback,
    },
    designPressure: {
      param: "pressure",
      ...urlSyncHelpers.number,
    },
    designTemperature: {
      param: "temp",
      serialize: (value: number) => String(Math.round(value)),
      deserialize: (value: string | null, fallback: number) =>
        parseNumber(value, fallback),
    },
    material: {
      param: "material",
      serialize: (value: OletMaterialId) => value,
      deserialize: (value: string | null, fallback: OletMaterialId) => {
        if (value === "A105" || value === "A182-F316") return value;
        if (value?.toUpperCase().includes("316")) return "A182-F316";
        if (value?.toUpperCase().includes("A105")) return "A105";
        return fallback;
      },
    },
  };

export { DEFAULT_OLET_FITTING_DIMENSIONS_INPUTS };
