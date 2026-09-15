import {
  DEFAULT_NITROGEN_PURGING_VOLUME_INPUTS,
  NITROGEN_GEOMETRY_OPTIONS,
  NITROGEN_PURGE_METHOD_OPTIONS,
  type NitrogenGeometryType,
  type NitrogenPurgeMethod,
  type NitrogenPurgingVolumeInputs,
} from "@/lib/calculators/engines/nitrogen-purging-volume";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const GEOMETRIES = NITROGEN_GEOMETRY_OPTIONS.map((o) => o.value);
const METHODS = NITROGEN_PURGE_METHOD_OPTIONS.map((o) => o.value);

function normalizeNpsParam(value: string | null, fallback: string): string {
  if (!value) return fallback;
  return value.replace(/^NPS\s*/i, "").replace(/"/g, "").trim() || fallback;
}

export const NITROGEN_PURGING_VOLUME_URL_CONFIG: ParamConfig<NitrogenPurgingVolumeInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    geometryType: {
      param: "geometryType",
      serialize: (value: NitrogenGeometryType) => value,
      deserialize: (value, fallback) =>
        GEOMETRIES.includes(value as NitrogenGeometryType)
          ? (value as NitrogenGeometryType)
          : fallback,
    },
    pipeNps: {
      param: "pipeNps",
      serialize: (value: string) => value,
      deserialize: (value, fallback) => normalizeNpsParam(value, fallback),
    },
    pipeSchedule: { param: "pipeSchedule", ...urlSyncHelpers.string },
    pipeLength: { param: "pipeLength", ...urlSyncHelpers.number },
    vesselDiameter: { param: "vesselDiameter", ...urlSyncHelpers.number },
    vesselLength: { param: "vesselLength", ...urlSyncHelpers.number },
    customVolume: { param: "customVolume", ...urlSyncHelpers.number },
    purgeMethod: {
      param: "purgeMethod",
      serialize: (value: NitrogenPurgeMethod) => value,
      deserialize: (value, fallback) =>
        METHODS.includes(value as NitrogenPurgeMethod)
          ? (value as NitrogenPurgeMethod)
          : fallback,
    },
    initialO2: { param: "initialO2", ...urlSyncHelpers.number },
    targetO2: { param: "targetO2", ...urlSyncHelpers.number },
    supplyO2Impurity: { param: "supplyO2", ...urlSyncHelpers.number },
    purgeFlowRate: { param: "purgeFlowRate", ...urlSyncHelpers.number },
    mixingEfficiency: { param: "mixingEfficiency", ...urlSyncHelpers.number },
    cycleHighPressure: { param: "cycleHighPressure", ...urlSyncHelpers.number },
  };

export { DEFAULT_NITROGEN_PURGING_VOLUME_INPUTS };
