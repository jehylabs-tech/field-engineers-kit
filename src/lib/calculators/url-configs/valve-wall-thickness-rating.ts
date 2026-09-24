import {
  DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS,
  type B1634ClassId,
  type B1634MaterialId,
  type ValveWallThicknessRatingInputs,
} from "@/lib/calculators/engines/valve-wall-thickness-rating";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const CLASSES: B1634ClassId[] = [
  "150",
  "300",
  "600",
  "900",
  "1500",
  "2500",
];

const MATERIALS: B1634MaterialId[] = [
  "group-1.1-A105-WCB",
  "group-1.2-A216-WCC",
  "group-2.2-A351-CF8M-316",
  "group-1.9-A217-WC6",
];

export const VALVE_WALL_THICKNESS_RATING_URL_CONFIG: ParamConfig<ValveWallThicknessRatingInputs> =
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
    nps: {
      param: "nps",
      serialize: (value: string) => value,
      deserialize: (value, fallback) => value ?? fallback,
    },
    pressureClass: {
      param: "class",
      serialize: (value: B1634ClassId) => value,
      deserialize: (value, fallback) =>
        CLASSES.includes(value as B1634ClassId)
          ? (value as B1634ClassId)
          : fallback,
    },
    insideDiameter: { param: "id", ...urlSyncHelpers.number },
    designTemperature: { param: "temp", ...urlSyncHelpers.number },
    workingPressure: { param: "press", ...urlSyncHelpers.number },
    materialId: {
      param: "matGroup",
      serialize: (value: B1634MaterialId) => value,
      deserialize: (value, fallback) =>
        MATERIALS.includes(value as B1634MaterialId)
          ? (value as B1634MaterialId)
          : fallback,
    },
  };

export { DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS };
