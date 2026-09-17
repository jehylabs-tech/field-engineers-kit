/**
 * Pattern B: /calculator/piping-equivalent-length/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "2inch-sch40-90-elbow-std",
    label: '2" Sch 40 · 90° std elbow',
    query: {
      units: "metric",
      nps: "2",
      schedule: "40",
      fittingType: "90_elbow_std",
      qty: "1",
    },
  },
  {
    spec: "4inch-sch40-gate-valve-full",
    label: '4" Sch 40 · gate valve',
    query: {
      units: "imperial",
      nps: "4",
      schedule: "40",
      fittingType: "gate_valve_full",
      qty: "1",
    },
  },
  {
    spec: "6inch-sch40-globe-valve-std",
    label: '6" Sch 40 · globe valve',
    query: {
      units: "metric",
      nps: "6",
      schedule: "40",
      fittingType: "globe_valve_std",
      qty: "1",
    },
  },
  {
    spec: "3inch-sch80-45-elbow",
    label: '3" Sch 80 · 45° elbow',
    query: {
      units: "imperial",
      nps: "3",
      schedule: "80",
      fittingType: "45_elbow",
      qty: "1",
    },
  },
];

export function listPipingEquivalentLengthPseoRoutes(
  slug: string,
): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parsePipingEquivalentLengthSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}
