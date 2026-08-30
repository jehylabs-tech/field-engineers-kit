import {
  DEFAULT_VALVE_CV_INPUTS,
  type ValveCvFluid,
  type ValveCvInputs,
} from "@/lib/calculators/engines/valve-cv";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

export const VALVE_CV_URL_CONFIG: ParamConfig<ValveCvInputs> = {
  fluid: {
    param: "fluid",
    serialize: (value: ValveCvFluid) => value,
    deserialize: (value: string | null, fallback: ValveCvFluid) =>
      value === "gas" ? "gas" : value === "liquid" ? "liquid" : fallback,
  },
  flowRate: {
    param: "flow",
    ...urlSyncHelpers.number,
  },
  inletPressure: {
    param: "p1",
    ...urlSyncHelpers.number,
  },
  outletPressure: {
    param: "p2",
    ...urlSyncHelpers.number,
  },
  specificGravity: {
    param: "sg",
    ...urlSyncHelpers.number,
  },
  temperature: {
    param: "temp",
    ...urlSyncHelpers.number,
  },
  requiredCv: {
    param: "cv",
    ...urlSyncHelpers.number,
  },
};

export { DEFAULT_VALVE_CV_INPUTS };
