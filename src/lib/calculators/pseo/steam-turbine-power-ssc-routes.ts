/**
 * Pattern B: /calculator/steam-turbine-power-ssc/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "60bar-480c-50th-metric",
    label: "60 bar · 480 °C · 50 t/h",
    query: {
      p1: "60",
      t1: "480",
      p2: "0.1",
      flow: "50",
      etaIsen: "80",
      etaMech: "98",
      etaGen: "97",
      units: "metric",
    },
  },
  {
    spec: "100bar-540c-100th-metric",
    label: "100 bar · 540 °C · 100 t/h",
    query: {
      p1: "100",
      t1: "540",
      p2: "0.08",
      flow: "100",
      etaIsen: "84",
      etaMech: "98.5",
      etaGen: "97.5",
      units: "metric",
    },
  },
  {
    spec: "850psi-850f-100klbh-imperial",
    label: "850 psia · 850 °F · 100 klb/h",
    query: {
      p1: "850",
      t1: "850",
      p2: "1.5",
      flow: "100000",
      etaIsen: "80",
      etaMech: "98",
      etaGen: "97",
      units: "imperial",
    },
  },
  {
    spec: "1200psi-950f-200klbh-imperial",
    label: "1200 psia · 950 °F · 200 klb/h",
    query: {
      p1: "1200",
      t1: "950",
      p2: "2.0",
      flow: "200000",
      etaIsen: "82",
      etaMech: "98.5",
      etaGen: "97.5",
      units: "imperial",
    },
  },
];

export function listSteamTurbinePowerSscPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parseSteamTurbinePowerSscSpec(value: string) {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}

export function matchSteamTurbinePowerSscSpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units?: string,
): SpecRoute | undefined {
  const p1 =
    partial.p1 != null && partial.p1 !== ""
      ? String(partial.p1)
      : partial.inletPressure != null && partial.inletPressure !== ""
        ? String(partial.inletPressure)
        : "";
  const t1 =
    partial.t1 != null && partial.t1 !== ""
      ? String(partial.t1)
      : partial.inletTemperature != null && partial.inletTemperature !== ""
        ? String(partial.inletTemperature)
        : "";
  const flow =
    partial.flow != null && partial.flow !== ""
      ? String(partial.flow)
      : partial.massFlow != null && partial.massFlow !== ""
        ? String(partial.massFlow)
        : "";

  if (!p1 || !t1 || !flow) return undefined;

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
    if (!route.query.p1 || !route.query.t1 || !route.query.flow) return false;
    const routeUnits = route.query.units ?? route.query.unit;
    if (unitKey && routeUnits && routeUnits !== unitKey) return false;
    if (!numEq(route.query.p1, p1)) return false;
    if (!numEq(route.query.t1, t1)) return false;
    if (!numEq(route.query.flow, flow)) return false;
    return true;
  });
}
