import {
  DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS,
  type B1621FlangeStandard,
  type B1621GasketProfile,
  type B1621MaterialId,
  type B1621ThicknessId,
  type NonMetallicGasketB1621Inputs,
} from "@/lib/calculators/engines/non-metallic-gasket-b1621";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const STANDARDS: B1621FlangeStandard[] = ["b16.5", "b16.47-a", "b16.47-b"];
const PROFILES: B1621GasketProfile[] = ["ibc", "full-face"];
const MATERIALS: B1621MaterialId[] = [
  "compressed-elastomer-sheet",
  "ptfe-ePTFE",
  "flexible-graphite",
  "neoprene-rubber",
];
const THICK: B1621ThicknessId[] = ["1.5", "3.2"];

export const NON_METALLIC_GASKET_B1621_URL_CONFIG: ParamConfig<NonMetallicGasketB1621Inputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric"
          ? value
          : value === "imp"
            ? "imperial"
            : fallback,
    },
    flangeStandard: {
      param: "std",
      serialize: (value: B1621FlangeStandard) => value,
      deserialize: (value, fallback) =>
        STANDARDS.includes(value as B1621FlangeStandard)
          ? (value as B1621FlangeStandard)
          : fallback,
    },
    nps: {
      param: "nps",
      serialize: (value: string) => value,
      deserialize: (value, fallback) => value ?? fallback,
    },
    pressureClass: {
      param: "class",
      serialize: (value: string) => value,
      deserialize: (value, fallback) => value ?? fallback,
    },
    gasketProfile: {
      param: "type",
      serialize: (value: B1621GasketProfile) => value,
      deserialize: (value, fallback) =>
        PROFILES.includes(value as B1621GasketProfile)
          ? (value as B1621GasketProfile)
          : value === "ff" || value === "fullface"
            ? "full-face"
            : value === "ring"
              ? "ibc"
              : fallback,
    },
    materialId: {
      param: "mat",
      serialize: (value: B1621MaterialId) => value,
      deserialize: (value, fallback) =>
        MATERIALS.includes(value as B1621MaterialId)
          ? (value as B1621MaterialId)
          : fallback,
    },
    thicknessId: {
      param: "thick",
      serialize: (value: B1621ThicknessId) => value,
      deserialize: (value, fallback) => {
        if (!value) return fallback;
        if (value === "1/16" || value === "1.5") return "1.5";
        if (value === "1/8" || value === "3.2") return "3.2";
        return THICK.includes(value as B1621ThicknessId)
          ? (value as B1621ThicknessId)
          : fallback;
      },
    },
    // `pressure` (not designPressure) → syncCompanionUnits uses bar↔psi
    pressure: { param: "press", ...urlSyncHelpers.number },
  };

export { DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS };
