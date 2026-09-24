import type { UnitSystem } from "@/lib/calculators/definitions";
import {
  DEFAULT_STEAM_TURBINE_POWER_SSC_INPUTS,
  type SteamTurbinePowerSscInputs,
} from "@/lib/calculators/engines/steam-turbine-power-ssc";
import { urlSyncHelpers, type ParamConfig } from "@/lib/calculators/url-sync";

export const STEAM_TURBINE_POWER_SSC_URL_CONFIG: ParamConfig<SteamTurbinePowerSscInputs> =
  {
    unitSystem: {
      param: "units",
      serialize: (value: UnitSystem) => value,
      deserialize: (value, fallback) =>
        value === "imperial" || value === "metric" ? value : fallback,
    },
    inletPressure: { param: "p1", ...urlSyncHelpers.number },
    inletTemperature: { param: "t1", ...urlSyncHelpers.number },
    exhaustPressure: { param: "p2", ...urlSyncHelpers.number },
    massFlow: { param: "flow", ...urlSyncHelpers.number },
    etaIsentropicPct: { param: "etaIsen", ...urlSyncHelpers.number },
    etaMechPct: { param: "etaMech", ...urlSyncHelpers.number },
    etaGenPct: { param: "etaGen", ...urlSyncHelpers.number },
  };

export { DEFAULT_STEAM_TURBINE_POWER_SSC_INPUTS };
