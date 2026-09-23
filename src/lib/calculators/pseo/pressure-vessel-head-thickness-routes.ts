/**
 * Pattern B: /calculator/pressure-vessel-head-thickness/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "2to1-ellipsoidal-id1500-1.5mpa-metric",
    label: "2:1 SE · ID 1500 mm · 1.5 MPa",
    query: {
      head: "ellipsoidal-2-1",
      id: "1500",
      p: "1.5",
      temp: "150",
      mat: "SA-516-70",
      e: "1",
      ca: "3",
      units: "metric",
    },
  },
  {
    spec: "torispherical-id2000-2.0mpa-metric",
    label: "Torispherical · ID 2000 mm · 2.0 MPa",
    query: {
      head: "torispherical",
      id: "2000",
      p: "2.0",
      temp: "200",
      mat: "SA-516-70",
      e: "0.85",
      ca: "3",
      units: "metric",
    },
  },
  {
    spec: "hemispherical-id60in-300psi-imperial",
    label: "Hemispherical · ID 60 in · 300 psi",
    query: {
      head: "hemispherical",
      id: "60",
      p: "300",
      temp: "300",
      mat: "SA-516-70",
      e: "1",
      ca: "0.125",
      units: "imperial",
    },
  },
  {
    spec: "conical-id48in-150psi-30deg-imperial",
    label: "Conical · ID 48 in · 150 psi · 30°",
    query: {
      head: "conical",
      id: "48",
      p: "150",
      temp: "200",
      mat: "SA-240-316L",
      e: "0.85",
      ca: "0",
      alpha: "30",
      units: "imperial",
    },
  },
];

export function listPressureVesselHeadThicknessPseoRoutes(
  slug: string,
): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parsePressureVesselHeadThicknessSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}

export function matchPressureVesselHeadThicknessSpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const head =
    partial.head != null && partial.head !== ""
      ? String(partial.head)
      : partial.headType != null && partial.headType !== ""
        ? String(partial.headType)
        : "";
  const id =
    partial.id != null && partial.id !== ""
      ? String(partial.id)
      : partial.insideDiameter != null && partial.insideDiameter !== ""
        ? String(partial.insideDiameter)
        : "";
  const p =
    partial.p != null && partial.p !== ""
      ? String(partial.p)
      : partial.designPressure != null && partial.designPressure !== ""
        ? String(partial.designPressure)
        : "";

  if (!head || !id || !p) return undefined;

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

  const headEq = (a: string, b: string) =>
    a.replace(/_/g, "-").toLowerCase() === b.replace(/_/g, "-").toLowerCase();

  return routes.find((route) => {
    if (!route.query.head || !route.query.id || !route.query.p) return false;
    if (!headEq(route.query.head, head)) return false;
    const routeUnits = route.query.units ?? route.query.unit;
    if (unitKey && routeUnits && routeUnits !== unitKey) return false;
    if (!numEq(route.query.id, id)) return false;
    if (!numEq(route.query.p, p)) return false;
    return true;
  });
}
