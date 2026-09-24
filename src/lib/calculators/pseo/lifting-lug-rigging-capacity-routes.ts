/**
 * Pattern B: /calculator/lifting-lug-rigging-capacity/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "15ton-2lugs-30deg-s355-metric",
    label: "15 t · 2 lugs · 30° · S355",
    query: {
      weight: "150",
      impact: "1.15",
      lugs: "2",
      angle: "30",
      thk: "25",
      rOuter: "80",
      dHole: "42",
      dPin: "38",
      hLug: "150",
      mat: "S355",
      weldSize: "12",
      weldLen: "160",
      electrode: "E70XX",
      units: "metric",
    },
  },
  {
    spec: "50ton-4lugs-45deg-s355-metric",
    label: "50 t · 4 lugs · 45° · S355",
    query: {
      weight: "500",
      impact: "1.20",
      lugs: "4",
      angle: "45",
      thk: "40",
      rOuter: "120",
      dHole: "65",
      dPin: "60",
      hLug: "200",
      mat: "S355",
      weldSize: "18",
      weldLen: "240",
      electrode: "E70XX",
      units: "metric",
    },
  },
  {
    spec: "30kips-2lugs-0deg-a36-imperial",
    label: "30 kip · 2 lugs · 0° · A36",
    query: {
      weight: "30",
      impact: "1.15",
      lugs: "2",
      angle: "0",
      thk: "0.75",
      rOuter: "3.0",
      dHole: "1.375",
      dPin: "1.25",
      hLug: "6.0",
      mat: "A36",
      weldSize: "0.375",
      weldLen: "6.0",
      electrode: "E70XX",
      units: "imperial",
    },
  },
  {
    spec: "100kips-4lugs-30deg-a572-imperial",
    label: "100 kip · 4 lugs · 30° · A572-50",
    query: {
      weight: "100",
      impact: "1.25",
      lugs: "4",
      angle: "30",
      thk: "1.50",
      rOuter: "4.5",
      dHole: "2.125",
      dPin: "2.00",
      hLug: "8.0",
      mat: "A572-50",
      weldSize: "0.625",
      weldLen: "8.0",
      electrode: "E70XX",
      units: "imperial",
    },
  },
];

export function listLiftingLugRiggingCapacityPseoRoutes(
  slug: string,
): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parseLiftingLugRiggingCapacitySpec(value: string) {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}

export function matchLiftingLugRiggingCapacitySpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units?: string,
): SpecRoute | undefined {
  const weight =
    partial.weight != null && partial.weight !== ""
      ? String(partial.weight)
      : partial.liftWeight != null && partial.liftWeight !== ""
        ? String(partial.liftWeight)
        : "";
  const lugs =
    partial.lugs != null && partial.lugs !== ""
      ? String(partial.lugs)
      : partial.lugCount != null && partial.lugCount !== ""
        ? String(partial.lugCount)
        : "";
  const angle =
    partial.angle != null && partial.angle !== ""
      ? String(partial.angle)
      : partial.slingAngleDeg != null && partial.slingAngleDeg !== ""
        ? String(partial.slingAngleDeg)
        : "";
  const mat =
    partial.mat != null && partial.mat !== ""
      ? String(partial.mat)
      : partial.materialId != null && partial.materialId !== ""
        ? String(partial.materialId)
        : "";

  if (!weight || !lugs || !angle || !mat) return undefined;

  const unitKey =
    units ||
    (partial.units != null && partial.units !== ""
      ? String(partial.units)
      : partial.unit != null && partial.unit !== ""
        ? String(partial.unit)
        : partial.unitSystem != null && partial.unitSystem !== ""
          ? String(partial.unitSystem)
          : "");

  const numEq = (a: string, b: string) => {
    const na = Number(a);
    const nb = Number(b);
    return Number.isFinite(na) && Number.isFinite(nb)
      ? Math.abs(na - nb) < 1e-6
      : a === b;
  };

  return routes.find((route) => {
    if (!route.query.weight || !route.query.lugs || !route.query.angle) {
      return false;
    }
    const routeUnits = route.query.units ?? route.query.unit;
    if (unitKey && routeUnits && routeUnits !== unitKey) return false;
    if (!numEq(route.query.weight, weight)) return false;
    if (route.query.lugs !== lugs) return false;
    if (!numEq(route.query.angle, angle)) return false;
    if (route.query.mat && route.query.mat !== mat) return false;
    return true;
  });
}
