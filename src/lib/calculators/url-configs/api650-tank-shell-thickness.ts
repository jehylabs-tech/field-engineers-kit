import {
  DEFAULT_API650_TANK_SHELL_THICKNESS_INPUTS,
  type Api650TankShellThicknessInputs,
  type Api650JointEfficiency,
} from "@/lib/calculators/engines/api650-tank-shell-thickness";
import type { Api650MaterialId } from "@/lib/calculators/data/api650Materials";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const MATERIALS: Api650MaterialId[] = [
  "A283-C",
  "A36",
  "A516-70",
  "A537-1",
];
const EFFS: Api650JointEfficiency[] = [1, 0.85, 0.7];

export const API650_TANK_SHELL_THICKNESS_URL_CONFIG: ParamConfig<Api650TankShellThicknessInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    tankDiameter: { param: "d", ...urlSyncHelpers.number },
    tankHeight: { param: "h", ...urlSyncHelpers.number },
    courseHeight: { param: "ch", ...urlSyncHelpers.number },
    specificGravity: { param: "sg", ...urlSyncHelpers.number },
    materialGrade: {
      param: "material",
      serialize: (value: Api650MaterialId) => value,
      deserialize: (value, fallback) =>
        MATERIALS.includes(value as Api650MaterialId)
          ? (value as Api650MaterialId)
          : fallback,
    },
    jointEfficiency: {
      param: "e",
      serialize: (value: Api650JointEfficiency) => String(value),
      deserialize: (value, fallback) => {
        const n = Number(value);
        return EFFS.includes(n as Api650JointEfficiency)
          ? (n as Api650JointEfficiency)
          : fallback;
      },
    },
    corrosionAllowance: { param: "ca", ...urlSyncHelpers.number },
  };

export { DEFAULT_API650_TANK_SHELL_THICKNESS_INPUTS };
