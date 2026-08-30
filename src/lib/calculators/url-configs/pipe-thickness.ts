import {
  DEFAULT_PIPE_INPUTS,
  PIPE_THICKNESS_MATERIAL_PRESETS,
  mapPipeThicknessMaterialId,
  type PipeThicknessInputs,
} from "@/lib/calculators/engines/pipe-thickness";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";
import type { UnitSystem } from "@/lib/calculators/definitions";

export const PIPE_URL_CONFIG: ParamConfig<PipeThicknessInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value: string | null, fallback: UnitSystem) =>
      value === "imperial" ? "imperial" : value === "metric" ? "metric" : fallback,
  },
  outsideDiameter: {
    param: "od",
    ...urlSyncHelpers.number,
  },
  designPressure: {
    param: "pressure",
    ...urlSyncHelpers.number,
  },
  allowableStress: {
    param: "stress",
    ...urlSyncHelpers.number,
  },
  weldEfficiency: {
    param: "e",
    ...urlSyncHelpers.number,
  },
  corrosionAllowance: {
    param: "ca",
    ...urlSyncHelpers.number,
  },
  actualThickness: {
    param: "tact",
    ...urlSyncHelpers.number,
  },
  material: {
    param: "material",
    serialize: (value: string | undefined) => {
      if (!value || value === "custom") return "";
      const preset = PIPE_THICKNESS_MATERIAL_PRESETS.find(
        (item) => item.id === value,
      );
      return preset?.plantLabel ?? value;
    },
    deserialize: (value: string | null, fallback: string | undefined) => {
      if (!value) return fallback ?? "";
      if (value === "custom") return "custom";
      return mapPipeThicknessMaterialId(value) ?? fallback ?? "custom";
    },
  },
};

export { DEFAULT_PIPE_INPUTS };
