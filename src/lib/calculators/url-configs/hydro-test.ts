import {
  DEFAULT_HYDRO_TEST_INPUTS,
  type HydroTestInputs,
  type TestFluid,
} from "@/lib/calculators/engines/hydro-test";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

export const HYDRO_TEST_URL_CONFIG: ParamConfig<HydroTestInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value: string | null, fallback: UnitSystem) =>
      value === "imperial" ? "imperial" : value === "metric" ? "metric" : fallback,
  },
  testFluid: {
    param: "fluid",
    serialize: (value: TestFluid) => value,
    deserialize: (value: string | null, fallback: TestFluid) =>
      value === "pneumatic" ? "pneumatic" : value === "hydrostatic" ? "hydrostatic" : fallback,
  },
  designPressure: {
    param: "pressure",
    ...urlSyncHelpers.number,
  },
  designStress: {
    param: "sdesign",
    ...urlSyncHelpers.number,
  },
  testStress: {
    param: "stest",
    ...urlSyncHelpers.number,
  },
  stressRatio: {
    param: "sts",
    ...urlSyncHelpers.number,
  },
  applyTempCorrection: {
    param: "tempcorr",
    serialize: (value: boolean) => (value ? "1" : "0"),
    deserialize: (value: string | null, fallback: boolean) =>
      value === "1" ? true : value === "0" ? false : fallback,
  },
  nps: {
    param: "nps",
    serialize: (value: string) => value,
    deserialize: (value: string | null, fallback: string) => {
      if (!value) return fallback;
      const allowed = new Set([
        "0.5",
        "0.75",
        "1",
        "1.5",
        "2",
        "2.5",
        "3",
        "4",
        "6",
        "8",
        "10",
        "12",
        "14",
        "16",
        "18",
        "20",
        "24",
      ]);
      return allowed.has(value) ? value : fallback;
    },
  },
};

export { DEFAULT_HYDRO_TEST_INPUTS };
