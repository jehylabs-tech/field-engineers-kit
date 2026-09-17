/**
 * Pattern B: /calculator/pipe-slope-calculator/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "4inch-drainage-slope",
    label: '4" · 1/4 in/ft drainage',
    query: {
      units: "imperial",
      nps: "4",
      rise: "2.5",
      run: "10",
    },
  },
  {
    spec: "6inch-drainage-slope",
    label: '6" · 1/8 in/ft drainage',
    query: {
      units: "imperial",
      nps: "6",
      rise: "1.25",
      run: "10",
    },
  },
  {
    spec: "100a-2percent-slope",
    label: "100A · 2% slope",
    query: {
      units: "metric",
      nps: "4",
      rise: "60",
      run: "3",
    },
  },
  {
    spec: "150a-1percent-slope",
    label: "150A · 1% slope",
    query: {
      units: "metric",
      nps: "6",
      rise: "30",
      run: "3",
    },
  },
];

export function listPipeSlopePseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parsePipeSlopeSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}
