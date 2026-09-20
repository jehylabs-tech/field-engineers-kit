/**
 * Pattern B: /calculator/pipe-support-span/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "4inch-sch40-water",
    label: '4" Sch 40 · water-filled',
    query: {
      units: "metric",
      nps: "4",
      schedule: "40",
      sch: "40",
      fluidType: "water",
    },
  },
  {
    spec: "2inch-sch40-water",
    label: '2" Sch 40 · water-filled',
    query: {
      units: "metric",
      nps: "2",
      schedule: "40",
      sch: "40",
      fluidType: "water",
    },
  },
  {
    spec: "6inch-sch40-water",
    label: '6" Sch 40 · water-filled',
    query: {
      units: "imperial",
      nps: "6",
      schedule: "40",
      sch: "40",
      fluidType: "water",
      ymax: "0.5",
    },
  },
  {
    spec: "8inch-sch40-gas",
    label: '8" Sch 40 · gas / empty',
    query: {
      units: "imperial",
      nps: "8",
      schedule: "40",
      sch: "40",
      fluidType: "gas",
      ymax: "0.5",
    },
  },
];

export function listPipeSupportSpanPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parsePipeSupportSpanSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}
