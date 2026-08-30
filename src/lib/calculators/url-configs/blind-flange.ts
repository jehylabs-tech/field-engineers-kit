import {
  DEFAULT_BLIND_FLANGE_INPUTS,
  type BlindDesignMode,
  type BlindFlangeInputs,
} from "@/lib/calculators/engines/blind-flange";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

export const BLIND_FLANGE_URL_CONFIG: ParamConfig<BlindFlangeInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value: string | null, fallback: UnitSystem) =>
      value === "imperial" ? "imperial" : value === "metric" ? "metric" : fallback,
  },
  mode: {
    param: "mode",
    serialize: (value: BlindDesignMode | undefined) => value ?? "permanent",
    deserialize: (value: string | null, fallback: BlindDesignMode | undefined) =>
      value === "hydrotest" ? "hydrotest" : value === "permanent" ? "permanent" : (fallback ?? "permanent"),
  },
  nps: {
    param: "nps",
    ...urlSyncHelpers.string,
  },
  pressureClass: {
    param: "class",
    ...urlSyncHelpers.string,
  },
  materialId: {
    param: "material",
    ...urlSyncHelpers.string,
  },
  insideDiameter: {
    param: "d",
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
    param: "c",
    ...urlSyncHelpers.number,
  },
};

export { DEFAULT_BLIND_FLANGE_INPUTS };
