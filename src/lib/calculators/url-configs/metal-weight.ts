import {
  DEFAULT_METAL_INPUTS,
  type MetalCurrency,
  type MetalMaterial,
  type MetalPriceBasis,
  type MetalShape,
  type MetalWallMode,
  type MetalWeightInputs,
} from "@/lib/calculators/engines/metal-weight";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";
import type { UnitSystem } from "@/lib/calculators/definitions";

const SHAPES: MetalShape[] = ["pipe", "tube", "plate", "bar", "structural"];
const MATERIALS: MetalMaterial[] = [
  "ss316l",
  "copper",
  "brass",
  "inconel",
  "titanium",
  "monel",
  "carbon-steel",
  "stainless-304",
  "aluminum",
];

function mapLegacyShape(value: string | null, fallback: MetalShape): MetalShape {
  if (value && SHAPES.includes(value as MetalShape)) return value as MetalShape;
  // Legacy URLs
  if (value === "plate") return "plate";
  if (value === "bar") return "bar";
  if (value === "pipe") return "pipe";
  return fallback;
}

export const METAL_WEIGHT_URL_CONFIG: ParamConfig<MetalWeightInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value: string | null, fallback: UnitSystem) =>
      value === "imperial" ? "imperial" : value === "metric" ? "metric" : fallback,
  },
  shape: {
    param: "shape",
    serialize: (value: MetalShape) => value,
    deserialize: (value: string | null, fallback: MetalShape) =>
      mapLegacyShape(value, fallback),
  },
  material: {
    param: "material",
    serialize: (value: MetalMaterial) => value,
    deserialize: (value: string | null, fallback: MetalMaterial) =>
      MATERIALS.includes(value as MetalMaterial)
        ? (value as MetalMaterial)
        : fallback,
  },
  length: { param: "length", ...urlSyncHelpers.number },
  width: { param: "width", ...urlSyncHelpers.number },
  thickness: { param: "thk", ...urlSyncHelpers.number },
  outerDiameter: { param: "od", ...urlSyncHelpers.number },
  innerDiameter: { param: "id", ...urlSyncHelpers.number },
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
  unitPrice: { param: "price", ...urlSyncHelpers.number },
  currency: {
    param: "ccy",
    serialize: (value: MetalCurrency) => value,
    deserialize: (value: string | null, fallback: MetalCurrency) => {
      if (value === "USD" || value === "KRW" || value === "EUR") return value;
      return fallback;
    },
  },
  priceBasis: {
    param: "basis",
    serialize: (value: MetalPriceBasis) => value,
    deserialize: (value: string | null, fallback: MetalPriceBasis) => {
      if (value === "kg" || value === "ton" || value === "m") return value;
      return fallback;
    },
  },
  quantity: { param: "qty", ...urlSyncHelpers.number },
  wallMode: {
    param: "wall",
    serialize: (value: MetalWallMode) => value,
    deserialize: (value: string | null, fallback: MetalWallMode) =>
      value === "bwg" || value === "dim" ? value : fallback,
  },
  bwg: { param: "bwg", ...urlSyncHelpers.number },
};

export { DEFAULT_METAL_INPUTS };
