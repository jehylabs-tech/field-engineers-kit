/**
 * Pattern B: /calculator/control-valve-noise/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "4inch-sch40-gas-cv120",
    label: '4" Sch 40 · gas · Cv 120',
    query: {
      units: "metric",
      nps: "4",
      schedule: "40",
      fluidType: "gas",
      cv: "120",
      p1: "10",
      p2: "2",
      temp: "25",
      massFlow: "15000",
    },
  },
  {
    spec: "6inch-sch40-gas-cv300",
    label: '6" Sch 40 · gas · Cv 300',
    query: {
      units: "imperial",
      nps: "6",
      schedule: "40",
      fluidType: "gas",
      cv: "300",
      p1: "362.6",
      p2: "43.5",
      temp: "77",
      massFlow: "99208",
    },
  },
  {
    spec: "3inch-sch80-liquid-cv75",
    label: '3" Sch 80 · liquid · Cv 75',
    query: {
      units: "metric",
      nps: "3",
      schedule: "80",
      fluidType: "liquid",
      cv: "75",
      p1: "15",
      p2: "2",
      temp: "25",
      massFlow: "35000",
    },
  },
  {
    spec: "8inch-sch40-gas-cv500",
    label: '8" Sch 40 · gas · Cv 500',
    query: {
      units: "imperial",
      nps: "8",
      schedule: "40",
      fluidType: "gas",
      cv: "500",
      p1: "116.0",
      p2: "21.8",
      temp: "77",
      massFlow: "176370",
    },
  },
];

export function listControlValveNoisePseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parseControlValveNoiseSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}
