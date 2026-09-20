import {
  DEFAULT_PIPE_SUPPORT_SPAN_INPUTS,
  type PipeSupportFluidType,
  type PipeSupportMaterial,
  type PipeSupportSpanInputs,
} from "@/lib/calculators/engines/pipe-support-span";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig, urlSyncHelpers } from "@/lib/calculators/url-sync";

const FLUIDS = new Set<PipeSupportFluidType>([
  "water",
  "gas",
  "steam",
  "empty",
]);

const MATERIALS = new Set<PipeSupportMaterial>([
  "carbon_steel",
  "stainless_304",
  "stainless_316",
]);

export const PIPE_SUPPORT_SPAN_URL_CONFIG: ParamConfig<PipeSupportSpanInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value: string | null, fallback: UnitSystem) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    nps: {
      param: "nps",
      serialize: (value: string) => value,
      deserialize: (value: string | null, fallback: string) => {
        if (!value) return fallback;
        return (
          value.trim().toLowerCase().replace(/"/g, "").replace(/in$/, "") ||
          fallback
        );
      },
    },
    schedule: {
      param: "schedule",
      ...urlSyncHelpers.string,
    },
    fluidType: {
      param: "fluidType",
      serialize: (value: PipeSupportFluidType) => value,
      deserialize: (value, fallback) =>
        value && FLUIDS.has(value as PipeSupportFluidType)
          ? (value as PipeSupportFluidType)
          : fallback,
    },
    insulationThickness: {
      param: "ins",
      ...urlSyncHelpers.number,
    },
    allowableDeflection: {
      param: "ymax",
      ...urlSyncHelpers.number,
    },
    material: {
      param: "material",
      serialize: (value: PipeSupportMaterial) => value,
      deserialize: (value, fallback) =>
        value && MATERIALS.has(value as PipeSupportMaterial)
          ? (value as PipeSupportMaterial)
          : fallback,
    },
  };

export { DEFAULT_PIPE_SUPPORT_SPAN_INPUTS };
