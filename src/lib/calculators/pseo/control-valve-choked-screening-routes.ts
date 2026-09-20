/**
 * Pattern B: /calculator/control-valve-choked-screening/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "gas-p1-10bar-p2-4bar-xt070",
    label: "Gas · P1 10 / P2 4 bar · x_T 0.70",
    query: {
      units: "metric",
      fluidState: "gas",
      p1: "10",
      p2: "4",
      xtFactor: "0.70",
      specificHeatRatio: "1.40",
    },
  },
  {
    spec: "gas-p1-10bar-p2-2bar-xt070",
    label: "Gas · P1 145 / P2 29 psia · x_T 0.70",
    query: {
      units: "imperial",
      fluidState: "gas",
      p1: "145.04",
      p2: "29.01",
      xtFactor: "0.70",
      specificHeatRatio: "1.40",
    },
  },
  {
    spec: "liquid-p1-15bar-p2-2bar-fl090",
    label: "Liquid · P1 15 / P2 2 bar · F_L 0.90",
    query: {
      units: "metric",
      fluidState: "liquid",
      p1: "15",
      p2: "2",
      flFactor: "0.90",
      vaporPressure: "0.0317",
      criticalPressure: "220.64",
    },
  },
  {
    spec: "liquid-p1-8bar-p2-5bar-fl085",
    label: "Liquid · P1 116 / P2 72.5 psia · F_L 0.85",
    query: {
      units: "imperial",
      fluidState: "liquid",
      p1: "116.03",
      p2: "72.52",
      flFactor: "0.85",
      vaporPressure: "0.46",
      criticalPressure: "3200.6",
    },
  },
];

export function listControlValveChokedPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parseControlValveChokedSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}
