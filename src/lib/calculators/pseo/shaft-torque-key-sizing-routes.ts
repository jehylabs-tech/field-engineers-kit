/**
 * Pattern B: /calculator/shaft-torque-key-sizing/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "45kw-1750rpm-d50mm-s45c-metric",
    label: "45 kW · 1750 rpm · Ø50 mm · S45C",
    query: {
      power: "45",
      rpm: "1750",
      d: "50",
      matShaft: "S45C",
      matKey: "S45C",
      b: "14",
      h: "9",
      length: "50",
      sf: "2",
      units: "metric",
      autokey: "1",
    },
  },
  {
    spec: "110kw-3000rpm-d65mm-scm440-metric",
    label: "110 kW · 3000 rpm · Ø65 mm · SCM440",
    query: {
      power: "110",
      rpm: "3000",
      d: "65",
      matShaft: "SCM440",
      matKey: "S45C",
      b: "18",
      h: "11",
      length: "70",
      sf: "2",
      units: "metric",
      autokey: "1",
    },
  },
  {
    spec: "60hp-1750rpm-d2in-a1045-imperial",
    label: "60 HP · 1750 rpm · Ø2 in · AISI 1045",
    query: {
      power: "60",
      rpm: "1750",
      d: "2",
      matShaft: "AISI1045",
      matKey: "AISI1045",
      b: "0.5",
      h: "0.5",
      length: "2.5",
      sf: "2",
      units: "imperial",
      autokey: "1",
    },
  },
  {
    spec: "200hp-3600rpm-d2.5in-a4140-imperial",
    label: "200 HP · 3600 rpm · Ø2.5 in · AISI 4140",
    query: {
      power: "200",
      rpm: "3600",
      d: "2.5",
      matShaft: "AISI4140",
      matKey: "AISI1045",
      b: "0.625",
      h: "0.625",
      length: "3",
      sf: "2",
      units: "imperial",
      autokey: "1",
    },
  },
];

export function listShaftTorqueKeySizingPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((row) => ({
    slug,
    spec: row.spec,
    query: row.query,
    label: row.label,
  }));
}

export function matchShaftTorqueKeySizingSpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const power =
    partial.power != null && partial.power !== ""
      ? String(partial.power)
      : partial.shaftPower != null && partial.shaftPower !== ""
        ? String(partial.shaftPower)
        : "";
  const rpm =
    partial.rpm != null && partial.rpm !== ""
      ? String(partial.rpm)
      : partial.rotationalSpeed != null && partial.rotationalSpeed !== ""
        ? String(partial.rotationalSpeed)
        : "";
  const d =
    partial.d != null && partial.d !== ""
      ? String(partial.d)
      : partial.shaftDiameter != null && partial.shaftDiameter !== ""
        ? String(partial.shaftDiameter)
        : "";

  if (!power || !rpm || !d) return undefined;

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
    if (!route.query.power || !route.query.rpm || !route.query.d) return false;
    const routeUnits = route.query.units ?? route.query.unit;
    if (unitKey && routeUnits && routeUnits !== unitKey) return false;
    if (!numEq(route.query.power, power)) return false;
    if (!numEq(route.query.rpm, rpm)) return false;
    if (!numEq(route.query.d, d)) return false;
    return true;
  });
}
