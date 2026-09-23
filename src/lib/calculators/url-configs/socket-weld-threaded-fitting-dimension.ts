import {
  DEFAULT_SOCKET_WELD_THREADED_FITTING_DIMENSION_INPUTS,
  type B1611Class,
  type B1611Connection,
  type B1611Fitting,
  type SocketWeldThreadedFittingDimensionInputs,
} from "@/lib/calculators/engines/socket-weld-threaded-fitting-dimension";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const CONNECTIONS: B1611Connection[] = ["socket-weld", "threaded-npt"];
const FITTINGS: B1611Fitting[] = [
  "elbow-90",
  "elbow-45",
  "tee",
  "cross",
  "coupling",
  "half-coupling",
  "cap",
  "street-elbow",
];
const CLASSES: B1611Class[] = ["2000", "3000", "6000", "9000"];

export const SOCKET_WELD_THREADED_FITTING_DIMENSION_URL_CONFIG: ParamConfig<SocketWeldThreadedFittingDimensionInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    connection: {
      param: "conn",
      serialize: (value: B1611Connection) => value,
      deserialize: (value, fallback) =>
        CONNECTIONS.includes(value as B1611Connection)
          ? (value as B1611Connection)
          : fallback,
    },
    fitting: {
      param: "fitting",
      serialize: (value: B1611Fitting) => value,
      deserialize: (value, fallback) =>
        FITTINGS.includes(value as B1611Fitting)
          ? (value as B1611Fitting)
          : fallback,
    },
    nps: { param: "nps", ...urlSyncHelpers.string },
    rating: {
      param: "rating",
      serialize: (value: B1611Class) => value,
      deserialize: (value, fallback) =>
        CLASSES.includes(value as B1611Class)
          ? (value as B1611Class)
          : fallback,
    },
  };

export { DEFAULT_SOCKET_WELD_THREADED_FITTING_DIMENSION_INPUTS };
