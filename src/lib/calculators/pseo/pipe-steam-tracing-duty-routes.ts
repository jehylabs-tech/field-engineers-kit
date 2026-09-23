/**
 * Pattern B: /calculator/pipe-steam-tracing-duty/{spec}
 *
 * Specs: nps{N}-maintain{T}{c|f}-steam{P}{bar|psig}-{metric|imperial}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "nps4-maintain50c-steam3.5bar-metric",
    label: "NPS 4 · Maintain 50 °C · 3.5 bar.g",
    query: {
      units: "metric",
      nps: "4",
      tMaint: "50",
      tAmb: "-10",
      wind: "5",
      material: "mineral-wool",
      insThk: "50",
      tracer: "0.5",
      pSteam: "3.5",
    },
  },
  {
    spec: "nps8-maintain100c-steam7bar-metric",
    label: "NPS 8 · Maintain 100 °C · 7.0 bar.g",
    query: {
      units: "metric",
      nps: "8",
      tMaint: "100",
      tAmb: "-15",
      wind: "5",
      material: "mineral-wool",
      insThk: "75",
      tracer: "0.5",
      pSteam: "7",
    },
  },
  {
    spec: "nps3-maintain120f-steam50psig-imperial",
    label: "NPS 3 · Maintain 120 °F · 50 psig",
    query: {
      units: "imperial",
      nps: "3",
      tMaint: "120",
      tAmb: "0",
      wind: "11.2",
      material: "mineral-wool",
      insThk: "2",
      tracer: "0.5",
      pSteam: "50",
    },
  },
  {
    spec: "nps6-maintain180f-steam100psig-imperial",
    label: "NPS 6 · Maintain 180 °F · 100 psig",
    query: {
      units: "imperial",
      nps: "6",
      tMaint: "180",
      tAmb: "10",
      wind: "11.2",
      material: "mineral-wool",
      insThk: "3",
      tracer: "0.5",
      pSteam: "100",
    },
  },
];

export function listPipeSteamTracingDutyPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parsePipeSteamTracingDutySpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}

function numEq(a: string | undefined, b: string, tol = 1e-6): boolean {
  if (a == null || a === "") return false;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return a === b;
  return Math.abs(na - nb) <= tol;
}

export function matchPipeSteamTracingDutySpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const nps =
    partial.nps != null && partial.nps !== "" ? String(partial.nps) : "";
  const tMaint =
    partial.tMaint != null && partial.tMaint !== ""
      ? String(partial.tMaint)
      : partial.maintainTemp != null && partial.maintainTemp !== ""
        ? String(partial.maintainTemp)
        : "";
  const pSteam =
    partial.pSteam != null && partial.pSteam !== ""
      ? String(partial.pSteam)
      : partial.steamPressure != null && partial.steamPressure !== ""
        ? String(partial.steamPressure)
        : "";
  const insThk =
    partial.insThk != null && partial.insThk !== ""
      ? String(partial.insThk)
      : partial.insulationThickness != null &&
          partial.insulationThickness !== ""
        ? String(partial.insulationThickness)
        : "";

  if (!nps || !tMaint || !pSteam) return undefined;

  return routes.find((route) => {
    if (!route.query.nps || !route.query.tMaint || !route.query.pSteam) {
      return false;
    }
    if (route.query.nps !== nps) return false;
    if (!numEq(route.query.tMaint, tMaint)) return false;
    if (!numEq(route.query.pSteam, pSteam, 0.05)) return false;
    if (insThk && route.query.insThk && !numEq(route.query.insThk, insThk, 0.05)) {
      return false;
    }
    if (units && route.query.units && route.query.units !== units) return false;
    return true;
  });
}
