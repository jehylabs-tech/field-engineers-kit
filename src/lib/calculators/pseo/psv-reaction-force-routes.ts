/**
 * Pattern B: /calculator/psv-reaction-force/{spec}
 * Spec: {gas}-{flow}{kgh|lbh}-nps{N}-{metric|imperial}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "co2-25000kgh-nps4-metric",
    label: "CO₂ · 25 000 kg/h · NPS 4",
    query: {
      gas: "co2",
      flow: "25000",
      temp: "180",
      mw: "44.01",
      k: "1.3",
      nps: "4",
      sch: "40",
      disch: "open-discharge",
      dlf: "2",
      patm: "1.013",
      units: "metric",
    },
  },
  {
    spec: "steam-50000kgh-nps6-metric",
    label: "Steam · 50 000 kg/h · NPS 6",
    query: {
      gas: "steam",
      flow: "50000",
      temp: "250",
      mw: "18.02",
      k: "1.33",
      nps: "6",
      sch: "40",
      disch: "open-discharge",
      dlf: "2",
      patm: "1.013",
      units: "metric",
    },
  },
  {
    spec: "air-50000lbh-nps4-imperial",
    label: "Air · 50 000 lb/h · NPS 4",
    query: {
      gas: "air",
      flow: "50000",
      temp: "300",
      mw: "28.97",
      k: "1.4",
      nps: "4",
      sch: "40",
      disch: "open-discharge",
      dlf: "2",
      patm: "14.7",
      units: "imperial",
    },
  },
  {
    spec: "hydrocarbon-100000lbh-nps8-imperial",
    label: "Hydrocarbon · 100 000 lb/h · NPS 8",
    query: {
      gas: "hydrocarbon",
      flow: "100000",
      temp: "400",
      mw: "58.12",
      k: "1.12",
      nps: "8",
      sch: "40",
      disch: "open-discharge",
      dlf: "2",
      patm: "14.7",
      units: "imperial",
    },
  },
];

export function listPsvReactionForcePseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((row) => ({
    slug,
    spec: row.spec,
    query: row.query,
    label: row.label,
  }));
}

export function matchPsvReactionForceSpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const gas =
    partial.gas != null && partial.gas !== ""
      ? String(partial.gas)
      : partial.gasId != null && partial.gasId !== ""
        ? String(partial.gasId)
        : "";
  const flow =
    partial.flow != null && partial.flow !== ""
      ? String(partial.flow)
      : partial.massFlow != null && partial.massFlow !== ""
        ? String(partial.massFlow)
        : "";
  const nps =
    partial.nps != null && partial.nps !== ""
      ? String(partial.nps)
      : partial.outletNps != null && partial.outletNps !== ""
        ? String(partial.outletNps)
        : "";

  if (!gas || !flow || !nps) return undefined;

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
      ? Math.abs(na - nb) < 1e-3
      : a === b;
  };

  return routes.find((route) => {
    const routeUnits = route.query.units ?? route.query.unit;
    if (unitKey && routeUnits && routeUnits !== unitKey) return false;
    if (String(route.query.gas) !== gas) return false;
    if (!numEq(String(route.query.flow ?? ""), flow)) return false;
    if (String(route.query.nps) !== nps) return false;
    return true;
  });
}
