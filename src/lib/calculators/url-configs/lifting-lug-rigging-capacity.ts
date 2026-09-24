import type { UnitSystem } from "@/lib/calculators/definitions";
import {
  DEFAULT_LIFTING_LUG_INPUTS,
  isLugSteelId,
  normalizeLugSteelId,
  type ElectrodeId,
  type LugCount,
  type LugSteelId,
  type LiftingLugRiggingCapacityInputs,
} from "@/lib/calculators/engines/lifting-lug-rigging-capacity";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const LUG_COUNTS: LugCount[] = [1, 2, 4];
const ELECTRODES: ElectrodeId[] = ["E70XX", "E80XX"];

function parseLugCount(value: string | null, fallback: LugCount): LugCount {
  if (value == null) return fallback;
  const n = Number(value);
  return LUG_COUNTS.includes(n as LugCount) ? (n as LugCount) : fallback;
}

function parseElectrode(value: string | null, fallback: ElectrodeId): ElectrodeId {
  if (value == null) return fallback;
  const v = value.toUpperCase();
  if (v.includes("80")) return "E80XX";
  if (v.includes("70")) return "E70XX";
  return ELECTRODES.includes(value as ElectrodeId)
    ? (value as ElectrodeId)
    : fallback;
}

export const LIFTING_LUG_RIGGING_CAPACITY_URL_CONFIG: ParamConfig<LiftingLugRiggingCapacityInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    liftWeight: { param: "weight", ...urlSyncHelpers.number },
    impactFactor: { param: "impact", ...urlSyncHelpers.number },
    lugCount: {
      param: "lugs",
      serialize: (value) => String(value),
      deserialize: (value, fallback) => parseLugCount(value, fallback),
    },
    slingAngleDeg: { param: "angle", ...urlSyncHelpers.number },
    plateThickness: { param: "thk", ...urlSyncHelpers.number },
    outerRadius: { param: "rOuter", ...urlSyncHelpers.number },
    holeDiameter: { param: "dHole", ...urlSyncHelpers.number },
    pinDiameter: { param: "dPin", ...urlSyncHelpers.number },
    lugHeight: { param: "hLug", ...urlSyncHelpers.number },
    materialId: {
      param: "mat",
      serialize: (value: LugSteelId) => value,
      deserialize: (value, fallback) =>
        value != null && isLugSteelId(value)
          ? value
          : normalizeLugSteelId(value || fallback),
    },
    weldSize: { param: "weldSize", ...urlSyncHelpers.number },
    weldLength: { param: "weldLen", ...urlSyncHelpers.number },
    electrodeId: {
      param: "electrode",
      serialize: (value) => value,
      deserialize: (value, fallback) => parseElectrode(value, fallback),
    },
  };

export { DEFAULT_LIFTING_LUG_INPUTS };
