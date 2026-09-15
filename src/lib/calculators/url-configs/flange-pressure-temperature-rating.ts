import {
  DEFAULT_FLANGE_PT_RATING_INPUTS,
  FLANGE_PT_CLASS_OPTIONS,
  FLANGE_PT_MATERIAL_OPTIONS,
  type FlangePtClass,
  type FlangePtMaterialGroup,
  type FlangePtRatingInputs,
} from "@/lib/calculators/engines/flange-pressure-temperature-rating";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const GROUPS = FLANGE_PT_MATERIAL_OPTIONS.map((o) => o.value);
const CLASSES = FLANGE_PT_CLASS_OPTIONS.map((o) => o.value);

export const FLANGE_PT_RATING_URL_CONFIG: ParamConfig<FlangePtRatingInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value, fallback) =>
      value === "imperial" || value === "metric" ? value : fallback,
  },
  materialGroup: {
    param: "materialGroup",
    serialize: (value: FlangePtMaterialGroup) => value,
    deserialize: (value, fallback) =>
      GROUPS.includes(value as FlangePtMaterialGroup)
        ? (value as FlangePtMaterialGroup)
        : fallback,
  },
  flangeClass: {
    param: "flangeClass",
    serialize: (value: FlangePtClass) => value,
    deserialize: (value, fallback) =>
      CLASSES.includes(value as FlangePtClass)
        ? (value as FlangePtClass)
        : fallback,
  },
  designTemperature: {
    param: "designTemperature",
    ...urlSyncHelpers.number,
  },
};

export { DEFAULT_FLANGE_PT_RATING_INPUTS };
