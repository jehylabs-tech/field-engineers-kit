/**
 * Recommended maximum support spacing chart (metres).
 *
 * Values match ASME B31.1 Table 121.5 (std-weight pipe, water / vapor service)
 * and the same numbers commonly reprinted in MSS hanger spacing guides.
 * Stored in metres; convert with / 0.3048 for feet.
 */

export type SupportChartService = "water" | "gas";

/** Water / liquid-filled service spans (m) by NPS key. */
const CHART_WATER_M: Record<string, number> = {
  "0.5": 2.13, // 7 ft
  "0.75": 2.13,
  "1": 2.13,
  "1.25": 2.13,
  "1.5": 2.74, // 9 ft
  "2": 3.05, // 10 ft
  "2.5": 3.35, // 11 ft
  "3": 3.66, // 12 ft
  "3.5": 3.96, // 13 ft
  "4": 4.27, // 14 ft
  "5": 4.88, // 16 ft
  "6": 5.18, // 17 ft
  "8": 5.79, // 19 ft
  "10": 6.71, // 22 ft
  "12": 7.01, // 23 ft
  "14": 7.62, // 25 ft
  "16": 8.23, // 27 ft
  "18": 8.53, // 28 ft
  "20": 9.14, // 30 ft
  "24": 9.75, // 32 ft
};

/** Gas / steam / vapor / empty service spans (m) by NPS key. */
const CHART_GAS_M: Record<string, number> = {
  "0.5": 2.74, // 9 ft
  "0.75": 2.74,
  "1": 2.74,
  "1.25": 2.74,
  "1.5": 3.66, // 12 ft
  "2": 3.96, // 13 ft
  "2.5": 4.27, // 14 ft
  "3": 4.57, // 15 ft
  "3.5": 4.88, // 16 ft
  "4": 5.18, // 17 ft
  "5": 5.79, // 19 ft
  "6": 6.4, // 21 ft
  "8": 7.32, // 24 ft
  "10": 7.92, // 26 ft
  "12": 9.14, // 30 ft
  "14": 9.75, // 32 ft
  "16": 10.67, // 35 ft
  "18": 11.28, // 37 ft
  "20": 11.89, // 39 ft
  "24": 12.8, // 42 ft
};

/** B36 carbon-steel linear density basis for stainless mass scaling. */
export const B36_CS_DENSITY_KG_M3 = 7850;

export function supportChartServiceForFluid(
  fluidType: "water" | "gas" | "steam" | "empty",
): SupportChartService {
  return fluidType === "water" ? "water" : "gas";
}

export function getSupportChartSpanM(
  nps: string,
  service: SupportChartService,
): number | null {
  const key = nps.trim();
  const table = service === "water" ? CHART_WATER_M : CHART_GAS_M;
  const hit = table[key];
  return hit != null && Number.isFinite(hit) ? hit : null;
}

/** @deprecated Use getSupportChartSpanM */
export const getMssSp58SupportSpanM = getSupportChartSpanM;
/** @deprecated Use supportChartServiceForFluid */
export const mssSupportServiceForFluid = supportChartServiceForFluid;
export type MssSupportService = SupportChartService;
