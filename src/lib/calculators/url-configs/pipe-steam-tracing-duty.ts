import {
  DEFAULT_PIPE_STEAM_TRACING_DUTY_INPUTS,
  TRACING_MATERIAL_OPTIONS,
  TRACER_NPS_OPTIONS,
  type PipeSteamTracingDutyInputs,
  type TracerNps,
  type TracingInsulationMaterial,
} from "@/lib/calculators/engines/pipe-steam-tracing-duty";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

const MATERIALS = TRACING_MATERIAL_OPTIONS.map((m) => m.value);
const TRACERS = TRACER_NPS_OPTIONS.map((t) => t.value);

export const PIPE_STEAM_TRACING_DUTY_URL_CONFIG: ParamConfig<PipeSteamTracingDutyInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    nps: { param: "nps", ...urlSyncHelpers.string },
    maintainTemp: { param: "tMaint", ...urlSyncHelpers.number },
    ambientTemp: { param: "tAmb", ...urlSyncHelpers.number },
    windSpeed: { param: "wind", ...urlSyncHelpers.number },
    material: {
      param: "material",
      serialize: (value: TracingInsulationMaterial) => value,
      deserialize: (value, fallback) =>
        MATERIALS.includes(value as TracingInsulationMaterial)
          ? (value as TracingInsulationMaterial)
          : fallback,
    },
    insulationThickness: {
      param: "insThk",
      ...urlSyncHelpers.number,
    },
    tracerNps: {
      param: "tracer",
      serialize: (value: TracerNps) => value,
      deserialize: (value, fallback) =>
        TRACERS.includes(value as TracerNps) ? (value as TracerNps) : fallback,
    },
    steamPressure: { param: "pSteam", ...urlSyncHelpers.number },
  };

export { DEFAULT_PIPE_STEAM_TRACING_DUTY_INPUTS };
