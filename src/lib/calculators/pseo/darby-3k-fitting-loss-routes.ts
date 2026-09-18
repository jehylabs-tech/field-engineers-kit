/**
 * Pattern B: /calculator/darby-3k-fitting-loss/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "2inch-sch40-elbow-90-std-re50000",
    label: '2" Sch 40 · 90° std elbow · Re 50k',
    query: {
      units: "metric",
      nps: "2",
      schedule: "40",
      sch: "40",
      fittingType: "elbow_90_std",
      re: "50000",
      qty: "1",
    },
  },
  {
    spec: "2inch-sch40-elbow-90-std-re500",
    label: '2" Sch 40 · 90° std elbow · Re 500',
    query: {
      units: "metric",
      nps: "2",
      schedule: "40",
      sch: "40",
      fittingType: "elbow_90_std",
      re: "500",
      qty: "1",
    },
  },
  {
    spec: "4inch-sch40-globe-valve-std-re100000",
    label: '4" Sch 40 · globe valve · Re 100k',
    query: {
      units: "imperial",
      nps: "4",
      schedule: "40",
      sch: "40",
      fittingType: "globe_valve_std",
      re: "100000",
      qty: "1",
    },
  },
  {
    spec: "3inch-sch80-tee-branch-re1500",
    label: '3" Sch 80 · tee branch · Re 1500',
    query: {
      units: "imperial",
      nps: "3",
      schedule: "80",
      sch: "80",
      fittingType: "tee_branch",
      re: "1500",
      qty: "1",
    },
  },
];

export function listDarby3kFittingLossPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parseDarby3kFittingLossSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}
