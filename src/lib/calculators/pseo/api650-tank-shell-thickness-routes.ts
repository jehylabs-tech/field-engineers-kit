/**
 * Pattern B: /calculator/api650-tank-shell-thickness/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "20m-diameter-15m-height-a36",
    label: "20 m Ø · 15 m H · A36",
    query: {
      units: "metric",
      d: "20",
      h: "15",
      ch: "2.5",
      material: "A36",
      sg: "0.85",
      ca: "2",
      e: "0.85",
    },
  },
  {
    spec: "40m-diameter-18m-height-a516-70",
    label: "40 m Ø · 18 m H · A516-70",
    query: {
      units: "metric",
      d: "40",
      h: "18",
      ch: "2.5",
      material: "A516-70",
      sg: "1.0",
      ca: "3",
      e: "1.0",
    },
  },
  {
    spec: "60ft-diameter-48ft-height-a36",
    label: "60 ft Ø · 48 ft H · A36",
    query: {
      units: "imperial",
      d: "60",
      h: "48",
      ch: "8",
      material: "A36",
      sg: "0.85",
      ca: "0.0625",
      e: "0.85",
    },
  },
  {
    spec: "100ft-diameter-50ft-height-a283c",
    label: "100 ft Ø · 50 ft H · A283-C",
    query: {
      units: "imperial",
      d: "100",
      h: "50",
      ch: "8",
      material: "A283-C",
      sg: "1.0",
      ca: "0.125",
      e: "1.0",
    },
  },
];

export function listApi650TankShellThicknessPseoRoutes(
  slug: string,
): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parseApi650TankShellThicknessSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}

export function matchApi650TankShellThicknessSpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const d =
    partial.d != null && partial.d !== ""
      ? String(partial.d)
      : partial.tankDiameter != null && partial.tankDiameter !== ""
        ? String(partial.tankDiameter)
        : "";
  const h =
    partial.h != null && partial.h !== ""
      ? String(partial.h)
      : partial.tankHeight != null && partial.tankHeight !== ""
        ? String(partial.tankHeight)
        : "";
  const material =
    partial.material != null && partial.material !== ""
      ? String(partial.material)
      : partial.materialGrade != null && partial.materialGrade !== ""
        ? String(partial.materialGrade)
        : "";

  if (!d || !h || !material) return undefined;

  const numEq = (a: string, b: string) => {
    const na = Number(a);
    const nb = Number(b);
    return Number.isFinite(na) && Number.isFinite(nb)
      ? Math.abs(na - nb) < 1e-6
      : a === b;
  };

  const matEq = (a: string, b: string) =>
    a.replace(/_/g, "-").toLowerCase() === b.replace(/_/g, "-").toLowerCase() ||
    a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();

  return routes.find((route) => {
    if (!route.query.d || !route.query.h || !route.query.material) return false;
    if (!matEq(route.query.material, material)) return false;
    if (units && route.query.units && route.query.units !== units) return false;
    if (!numEq(route.query.d, d)) return false;
    if (!numEq(route.query.h, h)) return false;
    return true;
  });
}
