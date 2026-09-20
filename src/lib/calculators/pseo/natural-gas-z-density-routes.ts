/**
 * Pattern B: /calculator/natural-gas-z-density/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "30bar-25c-sg060",
    label: "30 bar abs · 25 °C · SG 0.60",
    query: {
      units: "metric",
      pressure: "30",
      temperature: "25",
      specificGravity: "0.60",
      co2MolePercent: "0",
      n2MolePercent: "0",
    },
  },
  {
    spec: "725psia-104f-sg065",
    label: "725 psia · 104 °F · SG 0.65",
    query: {
      units: "imperial",
      pressure: "725.19",
      temperature: "104",
      specificGravity: "0.65",
      co2MolePercent: "0",
      n2MolePercent: "0",
    },
  },
  {
    spec: "10bar-15c-sg055",
    label: "10 bar abs · 15 °C · SG 0.55",
    query: {
      units: "metric",
      pressure: "10",
      temperature: "15",
      specificGravity: "0.55",
      co2MolePercent: "0",
      n2MolePercent: "0",
    },
  },
  {
    spec: "1160psia-122f-sg060",
    label: "1160 psia · 122 °F · SG 0.60",
    query: {
      units: "imperial",
      pressure: "1160.3",
      temperature: "122",
      specificGravity: "0.60",
      co2MolePercent: "0",
      n2MolePercent: "0",
    },
  },
];

export function listNaturalGasZDensityPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parseNaturalGasZDensitySpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}
