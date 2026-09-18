/**
 * Pattern B: /calculator/orifice-plate-flow-meter/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "4inch-sch40-d50mm-dp25kpa",
    label: '4" Sch 40 · d 50 mm · Δp 25 kPa',
    query: {
      units: "metric",
      nps: "4",
      schedule: "40",
      sch: "40",
      orificeDiameter: "50",
      deltaP: "25",
      fluidDensity: "998.2",
      dynamicViscosity: "1",
      tap: "flange",
    },
  },
  {
    spec: "6inch-sch40-d80mm-dp40kpa",
    label: '6" Sch 40 · d 80 mm · Δp 40 kPa',
    query: {
      units: "imperial",
      nps: "6",
      schedule: "40",
      sch: "40",
      orificeDiameter: "3.15",
      deltaP: "5.802",
      fluidDensity: "62.3",
      dynamicViscosity: "1",
      tap: "flange",
    },
  },
  {
    spec: "2inch-sch40-d25mm-dp15kpa",
    label: '2" Sch 40 · d 25 mm · Δp 15 kPa',
    query: {
      units: "metric",
      nps: "2",
      schedule: "40",
      sch: "40",
      orificeDiameter: "25",
      deltaP: "15",
      fluidDensity: "998.2",
      dynamicViscosity: "1",
      tap: "flange",
    },
  },
  {
    spec: "8inch-sch40-d100mm-dp30kpa",
    label: '8" Sch 40 · d 100 mm · Δp 30 kPa',
    query: {
      units: "imperial",
      nps: "8",
      schedule: "40",
      sch: "40",
      orificeDiameter: "3.937",
      deltaP: "4.351",
      fluidDensity: "62.3",
      dynamicViscosity: "1",
      tap: "flange",
    },
  },
];

export function listOrificePlateFlowPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parseOrificePlateFlowSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}
