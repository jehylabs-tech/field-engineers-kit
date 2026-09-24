import {
  DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS,
  type ShaftTorqueKeySizingInputs,
} from "@/lib/calculators/engines/shaft-torque-key-sizing";
import {
  isShaftSteelId,
  normalizeShaftSteelId,
  type ShaftSteelId,
} from "@/lib/calculators/data/din6885ParallelKeys";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

function deserializeUnit(
  value: string | null,
  fallback: UnitSystem,
): UnitSystem {
  if (value === "imperial" || value === "imp") return "imperial";
  if (value === "metric" || value === "si") return "metric";
  return fallback;
}

function deserializeSteel(
  value: string | null,
  fallback: ShaftSteelId,
): ShaftSteelId {
  if (!value) return fallback;
  const normalized = normalizeShaftSteelId(value);
  return isShaftSteelId(normalized) ? normalized : fallback;
}

export const SHAFT_TORQUE_KEY_SIZING_URL_CONFIG: ParamConfig<ShaftTorqueKeySizingInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) => deserializeUnit(value, fallback),
    },
    shaftPower: { param: "power", ...urlSyncHelpers.number },
    rotationalSpeed: { param: "rpm", ...urlSyncHelpers.number },
    shaftDiameter: { param: "d", ...urlSyncHelpers.number },
    shaftMaterial: {
      param: "matShaft",
      serialize: (value: ShaftSteelId) => value,
      deserialize: (value, fallback) => deserializeSteel(value, fallback),
    },
    keyMaterial: {
      param: "matKey",
      serialize: (value: ShaftSteelId) => value,
      deserialize: (value, fallback) => deserializeSteel(value, fallback),
    },
    keyWidth: { param: "b", ...urlSyncHelpers.number },
    keyHeight: { param: "h", ...urlSyncHelpers.number },
    keyLength: { param: "length", ...urlSyncHelpers.number },
    safetyFactor: { param: "sf", ...urlSyncHelpers.number },
    autoKeySize: {
      param: "autokey",
      serialize: (value: boolean) => (value ? "1" : "0"),
      deserialize: (value, fallback) => {
        if (value === "1" || value === "true" || value === "yes") return true;
        if (value === "0" || value === "false" || value === "no") return false;
        return fallback;
      },
    },
  };

export { DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS };
