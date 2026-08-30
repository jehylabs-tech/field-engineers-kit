import {
  DEFAULT_UNIT_CONVERTER_INPUTS,
  type UnitConverterInputs,
} from "@/lib/calculators/engines/unit-converter";
import { UNIT_CATEGORIES, type UnitCategory } from "@/lib/units/engineering";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const CATEGORIES = UNIT_CATEGORIES.map((item) => item.id);

export const UNIT_CONVERTER_URL_CONFIG: ParamConfig<UnitConverterInputs> = {
  category: {
    param: "cat",
    serialize: (value: UnitCategory) => value,
    deserialize: (value, fallback) =>
      CATEGORIES.includes(value as UnitCategory)
        ? (value as UnitCategory)
        : fallback,
  },
  value: { param: "v", ...urlSyncHelpers.number },
  from: { param: "from", ...urlSyncHelpers.string },
  to: { param: "to", ...urlSyncHelpers.string },
  density: { param: "density", ...urlSyncHelpers.number },
  digits: {
    param: "digits",
    serialize: (value: 2 | 3) => String(value),
    deserialize: (value, fallback) => (value === "2" ? 2 : value === "3" ? 3 : fallback),
  },
};

export { DEFAULT_UNIT_CONVERTER_INPUTS };
