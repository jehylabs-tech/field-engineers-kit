import {
  DEFAULT_THERMAL_EXPANSION_INPUTS,
  type ExpansionMaterial,
  type ThermalExpansionInputs,
} from "@/lib/calculators/engines/thermal-expansion";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const MATERIALS: ExpansionMaterial[] = ["cs", "304ss", "316ss", "alloy"];

export const THERMAL_EXPANSION_URL_CONFIG: ParamConfig<ThermalExpansionInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    material: {
      param: "material",
      serialize: (value: ExpansionMaterial) => value,
      deserialize: (value, fallback) =>
        MATERIALS.includes(value as ExpansionMaterial)
          ? (value as ExpansionMaterial)
          : fallback,
    },
    installTemp: { param: "t1", ...urlSyncHelpers.number },
    operatingTemp: { param: "t2", ...urlSyncHelpers.number },
    length: { param: "length", ...urlSyncHelpers.number },
    nps: { param: "nps", ...urlSyncHelpers.string },
    schedule: { param: "sch", ...urlSyncHelpers.string },
    allowableSa: { param: "sa", ...urlSyncHelpers.number },
    frictionFactor: { param: "mu", ...urlSyncHelpers.number },
  };

export { DEFAULT_THERMAL_EXPANSION_INPUTS };
