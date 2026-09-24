/**
 * Pattern B: /calculator/valve-wall-thickness-rating/{spec}
 * Spec: nps{N}-class{C}-{mat}-{T}{c|f}-{metric|imperial}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "nps4-class300-wcb-200c-metric",
    label: "NPS 4 · Class 300 · WCB · 200 °C",
    query: {
      nps: "4",
      class: "300",
      id: "102",
      temp: "200",
      press: "35",
      matGroup: "group-1.1-A105-WCB",
      units: "metric",
    },
  },
  {
    spec: "nps8-class600-cf8m-300c-metric",
    label: "NPS 8 · Class 600 · CF8M · 300 °C",
    query: {
      nps: "8",
      class: "600",
      id: "203",
      temp: "300",
      press: "55",
      matGroup: "group-2.2-A351-CF8M-316",
      units: "metric",
    },
  },
  {
    spec: "nps3-class150-a105-100f-imperial",
    label: "NPS 3 · Class 150 · A105 · 100 °F",
    query: {
      nps: "3",
      class: "150",
      id: "3",
      temp: "100",
      press: "200",
      matGroup: "group-1.1-A105-WCB",
      units: "imperial",
    },
  },
  {
    spec: "nps6-class900-a105-400f-imperial",
    label: "NPS 6 · Class 900 · A105 · 400 °F",
    query: {
      nps: "6",
      class: "900",
      id: "6",
      temp: "400",
      press: "1500",
      matGroup: "group-1.1-A105-WCB",
      units: "imperial",
    },
  },
];

export function listValveWallThicknessRatingPseoRoutes(
  slug: string,
): SpecRoute[] {
  return DUTIES.map((row) => ({
    slug,
    spec: row.spec,
    query: row.query,
    label: row.label,
  }));
}

export function matchValveWallThicknessRatingSpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const nps =
    partial.nps != null && partial.nps !== "" ? String(partial.nps) : "";
  const cls =
    partial.class != null && partial.class !== ""
      ? String(partial.class)
      : partial.pressureClass != null && partial.pressureClass !== ""
        ? String(partial.pressureClass)
        : "";
  const mat =
    partial.matGroup != null && partial.matGroup !== ""
      ? String(partial.matGroup)
      : partial.materialId != null && partial.materialId !== ""
        ? String(partial.materialId)
        : "";
  const temp =
    partial.temp != null && partial.temp !== ""
      ? String(partial.temp)
      : partial.designTemperature != null && partial.designTemperature !== ""
        ? String(partial.designTemperature)
        : "";

  if (!nps || !cls || !mat || !temp) return undefined;

  const unitKey =
    units ||
    (partial.units != null && partial.units !== ""
      ? String(partial.units)
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
    const routeUnits = route.query.units ?? route.query.unit;
    if (unitKey && routeUnits && routeUnits !== unitKey) return false;
    if (String(route.query.nps) !== nps) return false;
    if (String(route.query.class) !== cls) return false;
    if (String(route.query.matGroup) !== mat) return false;
    if (!numEq(String(route.query.temp ?? ""), temp)) return false;
    return true;
  });
}
