import {
  DEFAULT_PSV_REACTION_FORCE_INPUTS,
  type Api520GasId,
  type PsvDischargeType,
  type PsvOutletSchedule,
  type PsvReactionForceInputs,
} from "@/lib/calculators/engines/psv-reaction-force";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const GASES: Api520GasId[] = [
  "co2",
  "air",
  "steam",
  "nitrogen",
  "methane",
  "hydrocarbon",
  "custom",
];
const TYPES: PsvDischargeType[] = ["open-discharge", "closed-header"];
const SCHEDS: PsvOutletSchedule[] = ["10", "40", "80"];

function normalizeSchedule(raw: string | null, fallback: PsvOutletSchedule) {
  if (!raw) return fallback;
  const s = raw.replace(/^sch\s*/i, "").trim();
  return SCHEDS.includes(s as PsvOutletSchedule)
    ? (s as PsvOutletSchedule)
    : fallback;
}

export const PSV_REACTION_FORCE_URL_CONFIG: ParamConfig<PsvReactionForceInputs> =
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
    dischargeType: {
      param: "disch",
      serialize: (value: PsvDischargeType) => value,
      deserialize: (value, fallback) =>
        TYPES.includes(value as PsvDischargeType)
          ? (value as PsvDischargeType)
          : value === "open"
            ? "open-discharge"
            : value === "closed"
              ? "closed-header"
              : fallback,
    },
    massFlow: { param: "flow", ...urlSyncHelpers.number },
    relievingTemperature: { param: "temp", ...urlSyncHelpers.number },
    gasId: {
      param: "gas",
      serialize: (value: Api520GasId) => value,
      deserialize: (value, fallback) =>
        GASES.includes(value as Api520GasId)
          ? (value as Api520GasId)
          : fallback,
    },
    molecularWeight: { param: "mw", ...urlSyncHelpers.number },
    specificHeatRatio: { param: "k", ...urlSyncHelpers.number },
    outletNps: {
      param: "nps",
      serialize: (value: string) => value,
      deserialize: (value, fallback) => value ?? fallback,
    },
    outletSchedule: {
      param: "sch",
      serialize: (value: PsvOutletSchedule) => value,
      deserialize: (value, fallback) => normalizeSchedule(value, fallback),
    },
    dynamicLoadFactor: { param: "dlf", ...urlSyncHelpers.number },
    atmosphericPressure: { param: "patm", ...urlSyncHelpers.number },
  };

export { DEFAULT_PSV_REACTION_FORCE_INPUTS };
