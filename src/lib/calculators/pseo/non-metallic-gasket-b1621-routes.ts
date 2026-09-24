/**
 * Pattern B: /calculator/non-metallic-gasket-b1621/{spec}
 * Spec: nps{N}-class{C}-{ibc|ff}-{matTag}-{metric|imperial}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "nps4-class150-ibc-metric",
    label: "NPS 4 · Class 150 · IBC",
    query: {
      nps: "4",
      class: "150",
      type: "ibc",
      mat: "compressed-elastomer-sheet",
      thick: "1.5",
      press: "10",
      std: "b16.5",
      units: "metric",
    },
  },
  {
    spec: "nps8-class300-ff-ptfe-metric",
    label: "NPS 8 · Class 300 · FF · PTFE",
    query: {
      nps: "8",
      class: "300",
      type: "full-face",
      mat: "ptfe-ePTFE",
      thick: "3.2",
      press: "20",
      std: "b16.5",
      units: "metric",
    },
  },
  {
    spec: "nps3-class150-ibc-graphite-imperial",
    label: "NPS 3 · Class 150 · IBC · Graphite",
    query: {
      nps: "3",
      class: "150",
      type: "ibc",
      mat: "flexible-graphite",
      thick: "1.5",
      press: "150",
      std: "b16.5",
      units: "imperial",
    },
  },
  {
    spec: "nps12-class150-ff-rubber-imperial",
    label: "NPS 12 · Class 150 · FF · Rubber",
    query: {
      nps: "12",
      class: "150",
      type: "full-face",
      mat: "neoprene-rubber",
      thick: "3.2",
      press: "50",
      std: "b16.5",
      units: "imperial",
    },
  },
];

export function listNonMetallicGasketB1621PseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((row) => ({
    slug,
    spec: row.spec,
    query: row.query,
    label: row.label,
  }));
}

export function matchNonMetallicGasketB1621SpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const nps =
    partial.nps != null && partial.nps !== ""
      ? String(partial.nps)
      : "";
  const cls =
    partial.class != null && partial.class !== ""
      ? String(partial.class)
      : partial.pressureClass != null && partial.pressureClass !== ""
        ? String(partial.pressureClass)
        : "";
  const type =
    partial.type != null && partial.type !== ""
      ? String(partial.type)
      : partial.gasketProfile != null && partial.gasketProfile !== ""
        ? String(partial.gasketProfile)
        : "";

  if (!nps || !cls || !type) return undefined;

  const unitKey =
    units ||
    (partial.units != null && partial.units !== ""
      ? String(partial.units)
      : partial.unitSystem != null && partial.unitSystem !== ""
        ? String(partial.unitSystem)
        : "");

  const normType = (t: string) =>
    t === "ff" || t === "fullface" || t === "full-face" ? "full-face" : t;

  return routes.find((route) => {
    const routeUnits = route.query.units ?? route.query.unit;
    if (unitKey && routeUnits && routeUnits !== unitKey) return false;
    if (String(route.query.nps) !== nps) return false;
    if (String(route.query.class) !== cls) return false;
    if (normType(String(route.query.type)) !== normType(type)) return false;
    return true;
  });
}
