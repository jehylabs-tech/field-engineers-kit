import {
  ALLOY_MATERIALS,
  DEFAULT_ALLOY_WEIGHT_INPUTS,
  type AlloyMaterialId,
  type AlloyShape,
  type AlloyWeightInputs,
} from "@/lib/calculators/engines/alloy-weight";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const SHAPES: AlloyShape[] = [
  "pipe",
  "plate",
  "round-bar",
  "rect-bar",
  "structural",
];
const MATERIAL_IDS = new Set(ALLOY_MATERIALS.map((m) => m.id));

export const ALLOY_WEIGHT_URL_CONFIG: ParamConfig<AlloyWeightInputs> = {
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
  material: {
    param: "material",
    serialize: (value: AlloyMaterialId) => value,
    deserialize: (value: string | null, fallback: AlloyMaterialId) =>
      value && MATERIAL_IDS.has(value as AlloyMaterialId)
        ? (value as AlloyMaterialId)
        : fallback,
  },
  shape: {
    param: "shape",
    serialize: (value: AlloyShape) => value,
    deserialize: (value: string | null, fallback: AlloyShape) =>
      value && SHAPES.includes(value as AlloyShape)
        ? (value as AlloyShape)
        : fallback,
  },
  length: { param: "length", ...urlSyncHelpers.number },
  width: { param: "width", ...urlSyncHelpers.number },
  thickness: { param: "thk", ...urlSyncHelpers.number },
  outerDiameter: { param: "od", ...urlSyncHelpers.number },
  quantity: { param: "qty", ...urlSyncHelpers.number },
  unitPrice: { param: "price", ...urlSyncHelpers.number },
};

export { DEFAULT_ALLOY_WEIGHT_INPUTS };
