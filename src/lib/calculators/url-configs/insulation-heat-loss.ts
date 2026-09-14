import {
  DEFAULT_INSULATION_HEAT_LOSS_INPUTS,
  INSULATION_MATERIAL_OPTIONS,
  type InsulationHeatLossInputs,
  type InsulationMaterial,
} from "@/lib/calculators/engines/insulation-heat-loss";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const MATERIALS = INSULATION_MATERIAL_OPTIONS.map((m) => m.value);

export const INSULATION_HEAT_LOSS_URL_CONFIG: ParamConfig<InsulationHeatLossInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    nps: { param: "nps", ...urlSyncHelpers.string },
    material: {
      param: "material",
      serialize: (value: InsulationMaterial) => value,
      deserialize: (value, fallback) =>
        MATERIALS.includes(value as InsulationMaterial)
          ? (value as InsulationMaterial)
          : fallback,
    },
    insulationThickness: {
      param: "insulationThickness",
      ...urlSyncHelpers.number,
    },
    operatingTemp: { param: "operatingTemp", ...urlSyncHelpers.number },
    ambientTemp: { param: "ambientTemp", ...urlSyncHelpers.number },
    windSpeed: { param: "windSpeed", ...urlSyncHelpers.number },
    emissivity: { param: "emissivity", ...urlSyncHelpers.number },
  };

export { DEFAULT_INSULATION_HEAT_LOSS_INPUTS };
