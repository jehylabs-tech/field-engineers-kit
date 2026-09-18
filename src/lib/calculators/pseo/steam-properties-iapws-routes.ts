/**
 * Pattern B: /calculator/steam-properties-iapws/{spec}
 * Specs: 10bar-saturated-steam · 20bar-superheated-300c · …
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  units: "metric" | "imperial";
  pressure: number;
  inputMode: "saturation" | "superheated";
  temperature?: number;
  steamQuality?: number;
  label: string;
}> = [
  {
    spec: "10bar-saturated-steam",
    units: "metric",
    pressure: 10,
    inputMode: "saturation",
    steamQuality: 1,
    label: "10 bar · saturated steam",
  },
  {
    spec: "20bar-superheated-300c",
    units: "metric",
    pressure: 20,
    inputMode: "superheated",
    temperature: 300,
    label: "20 bar · 300 °C superheated",
  },
  {
    spec: "3bar-saturated-steam",
    units: "metric",
    pressure: 3,
    inputMode: "saturation",
    steamQuality: 1,
    label: "3 bar · saturated steam",
  },
  {
    spec: "15bar-superheated-250c",
    units: "metric",
    pressure: 15,
    inputMode: "superheated",
    temperature: 250,
    label: "15 bar · 250 °C superheated",
  },
  {
    spec: "145psi-saturated-steam",
    units: "imperial",
    pressure: 145,
    inputMode: "saturation",
    steamQuality: 1,
    label: "145 psi · saturated steam",
  },
  {
    spec: "290psi-superheated-572f",
    units: "imperial",
    pressure: 290,
    inputMode: "superheated",
    temperature: 572,
    label: "290 psi · 572 °F superheated",
  },
];

export function listSteamPropertiesIapwsPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: {
      units: duty.units,
      pressure: String(duty.pressure),
      inputMode: duty.inputMode,
      ...(duty.temperature != null ? { temp: String(duty.temperature) } : {}),
      ...(duty.steamQuality != null
        ? { steamQuality: String(duty.steamQuality) }
        : {}),
    },
    label: duty.label,
  }));
}

/** Parse known Pattern B tokens → url query. */
export function parseSteamPropertiesIapwsSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  if (!hit) return null;
  return {
    units: hit.units,
    pressure: String(hit.pressure),
    inputMode: hit.inputMode,
    ...(hit.temperature != null ? { temp: String(hit.temperature) } : {}),
    ...(hit.steamQuality != null
      ? { steamQuality: String(hit.steamQuality) }
      : {}),
  };
}
