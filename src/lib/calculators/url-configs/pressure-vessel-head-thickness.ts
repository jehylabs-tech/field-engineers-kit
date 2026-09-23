import {
  DEFAULT_PRESSURE_VESSEL_HEAD_THICKNESS_INPUTS,
  isHeadTypeId,
  parseJointEfficiency,
  type HeadTypeId,
  type JointEfficiencyId,
  type PressureVesselHeadThicknessInputs,
} from "@/lib/calculators/engines/pressure-vessel-head-thickness";
import {
  isAsmeViiiHeadMaterialId,
  normalizeAsmeViiiHeadMaterialId,
  type AsmeViiiHeadMaterialId,
} from "@/lib/calculators/data/asmeViiiDiv1AllowableStress";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

export const PRESSURE_VESSEL_HEAD_THICKNESS_URL_CONFIG: ParamConfig<PressureVesselHeadThicknessInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    headType: {
      param: "head",
      serialize: (value: HeadTypeId) => value,
      deserialize: (value, fallback) =>
        value != null && isHeadTypeId(value) ? value : fallback,
    },
    insideDiameter: { param: "id", ...urlSyncHelpers.number },
    designPressure: { param: "p", ...urlSyncHelpers.number },
    designTemperature: { param: "temp", ...urlSyncHelpers.number },
    materialId: {
      param: "mat",
      serialize: (value: AsmeViiiHeadMaterialId) => value,
      deserialize: (value, fallback) => {
        if (value == null) return fallback;
        return isAsmeViiiHeadMaterialId(value)
          ? value
          : normalizeAsmeViiiHeadMaterialId(value) || fallback;
      },
    },
    jointEfficiency: {
      param: "e",
      serialize: (value: JointEfficiencyId) => String(value),
      deserialize: (value, fallback) => parseJointEfficiency(value, fallback),
    },
    corrosionAllowance: { param: "ca", ...urlSyncHelpers.number },
    halfApexAngle: { param: "alpha", ...urlSyncHelpers.number },
  };

export { DEFAULT_PRESSURE_VESSEL_HEAD_THICKNESS_INPUTS };
