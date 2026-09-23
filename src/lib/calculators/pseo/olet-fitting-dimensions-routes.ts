/**
 * Pattern B: /calculator/olet-fitting-dimensions/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "weldolet-nps6-nps2-std-metric",
    label: "Weldolet 6×2 STD (metric)",
    query: {
      units: "metric",
      type: "weldolet",
      runSize: "6",
      branchSize: "2",
      rating: "STD",
      material: "A105",
      pressure: "2",
      temp: "150",
    },
  },
  {
    spec: "sockolet-nps8-nps1.5-class3000-metric",
    label: "Sockolet 8×1½ Class 3000 (metric)",
    query: {
      units: "metric",
      type: "sockolet",
      runSize: "8",
      branchSize: "1.5",
      rating: "3000",
      material: "A105",
      pressure: "2",
      temp: "150",
    },
  },
  {
    spec: "weldolet-nps12-nps4-xs-imperial",
    label: "Weldolet 12×4 XS (imperial)",
    query: {
      units: "imperial",
      type: "weldolet",
      runSize: "12",
      branchSize: "4",
      rating: "XS",
      material: "A105",
      pressure: "290",
      temp: "302",
    },
  },
  {
    spec: "threadolet-nps4-nps1-class3000-imperial",
    label: "Threadolet 4×1 Class 3000 (imperial)",
    query: {
      units: "imperial",
      type: "threadolet",
      runSize: "4",
      branchSize: "1",
      rating: "3000",
      material: "A105",
      pressure: "290",
      temp: "302",
    },
  },
];

export function listOletFittingDimensionsPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parseOletFittingDimensionsSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}

export function matchOletFittingDimensionsSpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const type =
    partial.type != null && partial.type !== ""
      ? String(partial.type)
      : partial.oletType != null && partial.oletType !== ""
        ? String(partial.oletType)
        : "";
  const runSize =
    partial.runSize != null && partial.runSize !== ""
      ? String(partial.runSize)
      : partial.runNps != null && partial.runNps !== ""
        ? String(partial.runNps)
        : "";
  const branchSize =
    partial.branchSize != null && partial.branchSize !== ""
      ? String(partial.branchSize)
      : partial.branchNps != null && partial.branchNps !== ""
        ? String(partial.branchNps)
        : "";
  const rating =
    partial.rating != null && partial.rating !== ""
      ? String(partial.rating).toUpperCase()
      : "";

  if (!type || !runSize || !branchSize || !rating) return undefined;

  return routes.find((route) => {
    if (!route.query.type || !route.query.runSize || !route.query.branchSize) {
      return false;
    }
    if (route.query.type !== type) return false;
    if (route.query.runSize !== runSize) return false;
    if (route.query.branchSize !== branchSize) return false;
    if ((route.query.rating ?? "").toUpperCase() !== rating) return false;
    if (units && route.query.units && route.query.units !== units) return false;
    return true;
  });
}
