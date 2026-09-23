/**
 * Pattern B: /calculator/bearing-life-l10h/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "ball-c32.5kn-fr4.5kn-1750rpm-metric",
    label: "Deep Groove Ball · C 32.5 kN · Fr 4.5 kN · 1750 rpm",
    query: {
      type: "deep-groove-ball",
      c: "32.5",
      fr: "4.5",
      fa: "1.2",
      rpm: "1750",
      x: "0.56",
      y: "1.45",
      xymode: "manual",
      units: "metric",
    },
  },
  {
    spec: "tapered-roller-c120kn-fr25kn-900rpm-metric",
    label: "Tapered Roller · C 120 kN · Fr 25 kN · 900 rpm",
    query: {
      type: "tapered-roller",
      c: "120",
      fr: "25",
      fa: "10",
      rpm: "900",
      x: "0.4",
      y: "1.5",
      xymode: "manual",
      units: "metric",
    },
  },
  {
    spec: "ball-c7500lbf-fr1000lbf-3600rpm-imperial",
    label: "Deep Groove Ball · C 7500 lbf · Fr 1000 lbf · 3600 rpm",
    query: {
      type: "deep-groove-ball",
      c: "7500",
      fr: "1000",
      fa: "300",
      rpm: "3600",
      x: "0.56",
      y: "1.45",
      xymode: "manual",
      units: "imperial",
    },
  },
  {
    spec: "spherical-roller-c45000lbf-fr8000lbf-1200rpm-imperial",
    label: "Spherical Roller · C 45000 lbf · Fr 8000 lbf · 1200 rpm",
    query: {
      type: "spherical-roller",
      c: "45000",
      fr: "8000",
      fa: "2000",
      rpm: "1200",
      x: "1.0",
      y: "2.5",
      xymode: "manual",
      units: "imperial",
    },
  },
];

export function listBearingLifeL10hPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((row) => ({
    slug,
    spec: row.spec,
    query: row.query,
    label: row.label,
  }));
}

export function matchBearingLifeL10hSpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const bearingType =
    partial.type != null && partial.type !== ""
      ? String(partial.type)
      : partial.bearingType != null && partial.bearingType !== ""
        ? String(partial.bearingType)
        : "";
  const c =
    partial.c != null && partial.c !== ""
      ? String(partial.c)
      : partial.dynamicLoadRating != null && partial.dynamicLoadRating !== ""
        ? String(partial.dynamicLoadRating)
        : "";
  const fr =
    partial.fr != null && partial.fr !== ""
      ? String(partial.fr)
      : partial.radialLoad != null && partial.radialLoad !== ""
        ? String(partial.radialLoad)
        : "";
  const rpm =
    partial.rpm != null && partial.rpm !== ""
      ? String(partial.rpm)
      : partial.rotationalSpeed != null && partial.rotationalSpeed !== ""
        ? String(partial.rotationalSpeed)
        : "";

  if (!bearingType || !c || !fr || !rpm) return undefined;

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
    if (!route.query.type || !route.query.c || !route.query.fr || !route.query.rpm) {
      return false;
    }
    if (route.query.type !== bearingType) return false;
    const routeUnits = route.query.units ?? route.query.unit;
    if (unitKey && routeUnits && routeUnits !== unitKey) return false;
    if (!numEq(route.query.c, c)) return false;
    if (!numEq(route.query.fr, fr)) return false;
    if (!numEq(route.query.rpm, rpm)) return false;
    return true;
  });
}
