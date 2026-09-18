import {
  DEFAULT_ORIFICE_PLATE_FLOW_INPUTS,
  type OrificePlateFlowInputs,
} from "@/lib/calculators/engines/orifice-plate-flow-meter";
import type { OrificeTapType } from "@/lib/calculators/data/iso5167OrificeData";
import { type ParamConfig, urlSyncHelpers } from "@/lib/calculators/url-sync";

const TAP_TYPES = new Set<OrificeTapType>(["flange", "corner", "d-and-d2"]);

export const ORIFICE_PLATE_FLOW_URL_CONFIG: ParamConfig<OrificePlateFlowInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    nps: {
      param: "nps",
      serialize: (value: string) => value,
      deserialize: (value: string | null, fallback: string) => {
        if (!value) return fallback;
        return (
          value.trim().toLowerCase().replace(/"/g, "").replace(/in$/, "") ||
          fallback
        );
      },
    },
    schedule: {
      param: "schedule",
      ...urlSyncHelpers.string,
    },
    orificeDiameter: {
      param: "orificeDiameter",
      ...urlSyncHelpers.number,
    },
    deltaP: {
      param: "deltaP",
      ...urlSyncHelpers.number,
    },
    fluidDensity: {
      param: "fluidDensity",
      ...urlSyncHelpers.number,
    },
    dynamicViscosity: {
      param: "dynamicViscosity",
      ...urlSyncHelpers.number,
    },
    tapType: {
      param: "tap",
      serialize: (value: OrificeTapType) => value,
      deserialize: (value, fallback) =>
        value && TAP_TYPES.has(value as OrificeTapType)
          ? (value as OrificeTapType)
          : fallback,
    },
  };

export { DEFAULT_ORIFICE_PLATE_FLOW_INPUTS };
