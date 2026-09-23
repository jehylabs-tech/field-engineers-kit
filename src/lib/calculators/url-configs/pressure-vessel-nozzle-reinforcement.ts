import {
  DEFAULT_PRESSURE_VESSEL_NOZZLE_REINFORCEMENT_INPUTS,
  isNozzleShellTypeId,
  parseNozzleJointEfficiency,
  type NozzleJointEfficiencyId,
  type NozzleShellTypeId,
  type PressureVesselNozzleReinforcementInputs,
} from "@/lib/calculators/engines/pressure-vessel-nozzle-reinforcement";
import {
  isAsmeViiiNozzleMaterialId,
  isAsmeViiiShellMaterialId,
  normalizeAsmeViiiNozzleMaterialId,
  normalizeAsmeViiiShellMaterialId,
  type AsmeViiiNozzleMaterialId,
  type AsmeViiiShellMaterialId,
} from "@/lib/calculators/data/asmeViiiDiv1AllowableStress";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

export const PRESSURE_VESSEL_NOZZLE_REINFORCEMENT_URL_CONFIG: ParamConfig<PressureVesselNozzleReinforcementInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    shellType: {
      param: "shell",
      serialize: (value: NozzleShellTypeId) => value,
      deserialize: (value, fallback) =>
        value != null && isNozzleShellTypeId(value) ? value : fallback,
    },
    shellInsideDiameter: { param: "shellId", ...urlSyncHelpers.number },
    designPressure: { param: "p", ...urlSyncHelpers.number },
    designTemperature: { param: "temp", ...urlSyncHelpers.number },
    shellThickness: { param: "shellThk", ...urlSyncHelpers.number },
    shellMaterialId: {
      param: "shellMat",
      serialize: (value: AsmeViiiShellMaterialId) => value,
      deserialize: (value, fallback) => {
        if (value == null) return fallback;
        return isAsmeViiiShellMaterialId(value)
          ? value
          : normalizeAsmeViiiShellMaterialId(value) || fallback;
      },
    },
    jointEfficiency: {
      param: "e",
      serialize: (value: NozzleJointEfficiencyId) => String(value),
      deserialize: (value, fallback) =>
        parseNozzleJointEfficiency(value, fallback),
    },
    nozzleNps: { param: "nps", ...urlSyncHelpers.string },
    nozzleOutsideDiameter: { param: "dout", ...urlSyncHelpers.number },
    nozzleThickness: { param: "nozThk", ...urlSyncHelpers.number },
    nozzleMaterialId: {
      param: "nozMat",
      serialize: (value: AsmeViiiNozzleMaterialId) => value,
      deserialize: (value, fallback) => {
        if (value == null) return fallback;
        return isAsmeViiiNozzleMaterialId(value)
          ? value
          : normalizeAsmeViiiNozzleMaterialId(value) || fallback;
      },
    },
    corrosionAllowance: { param: "ca", ...urlSyncHelpers.number },
    padOutsideDiameter: { param: "dp", ...urlSyncHelpers.number },
    padThickness: { param: "tp", ...urlSyncHelpers.number },
    insideProjection: { param: "hi", ...urlSyncHelpers.number },
    weldLeg: { param: "weld", ...urlSyncHelpers.number },
  };

export { DEFAULT_PRESSURE_VESSEL_NOZZLE_REINFORCEMENT_INPUTS };
