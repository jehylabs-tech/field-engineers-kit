/**
 * Pattern B: /calculator/pressure-vessel-nozzle-reinforcement/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "nps6-shell1200-2mpa-metric",
    label: "NPS 6 · Shell ID 1200 mm · 2.0 MPa",
    query: {
      shell: "cylindrical-shell",
      shellId: "1200",
      p: "2.0",
      temp: "150",
      shellMat: "SA-516-70",
      shellThk: "16",
      e: "1",
      nps: "6",
      dout: "168.3",
      nozThk: "11",
      nozMat: "SA-106-B",
      ca: "3",
      dp: "300",
      tp: "12",
      units: "metric",
    },
  },
  {
    spec: "nps12-shell1500-3mpa-repad-metric",
    label: "NPS 12 · Shell ID 1500 mm · 3.0 MPa · Repad",
    query: {
      shell: "cylindrical-shell",
      shellId: "1500",
      p: "3.0",
      temp: "200",
      shellMat: "SA-516-70",
      shellThk: "18",
      e: "1",
      nps: "12",
      dout: "323.85",
      nozThk: "12.7",
      nozMat: "SA-106-B",
      ca: "3",
      dp: "500",
      tp: "16",
      units: "metric",
    },
  },
  {
    spec: "nps4-shell48in-300psi-imperial",
    label: "NPS 4 · Shell ID 48 in · 300 psi",
    query: {
      shell: "cylindrical-shell",
      shellId: "48",
      p: "300",
      temp: "300",
      shellMat: "SA-516-70",
      shellThk: "0.625",
      e: "1",
      nps: "4",
      dout: "4.5",
      nozThk: "0.337",
      nozMat: "SA-106-B",
      ca: "0.125",
      dp: "12",
      tp: "0.5",
      units: "imperial",
    },
  },
  {
    spec: "nps10-shell60in-450psi-imperial",
    label: "NPS 10 · Shell ID 60 in · 450 psi · Repad",
    query: {
      shell: "cylindrical-shell",
      shellId: "60",
      p: "450",
      temp: "350",
      shellMat: "SA-240-316L",
      shellThk: "0.75",
      e: "1",
      nps: "10",
      dout: "10.75",
      nozThk: "0.365",
      nozMat: "SA-312-316L",
      ca: "0",
      dp: "20",
      tp: "0.5",
      units: "imperial",
    },
  },
];

export function listPressureVesselNozzleReinforcementPseoRoutes(
  slug: string,
): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parsePressureVesselNozzleReinforcementSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}

export function matchPressureVesselNozzleReinforcementSpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const nps =
    partial.nps != null && partial.nps !== ""
      ? String(partial.nps)
      : partial.nozzleNps != null && partial.nozzleNps !== ""
        ? String(partial.nozzleNps)
        : "";
  const shellId =
    partial.shellId != null && partial.shellId !== ""
      ? String(partial.shellId)
      : partial.shellInsideDiameter != null &&
          partial.shellInsideDiameter !== ""
        ? String(partial.shellInsideDiameter)
        : "";
  const p =
    partial.p != null && partial.p !== ""
      ? String(partial.p)
      : partial.designPressure != null && partial.designPressure !== ""
        ? String(partial.designPressure)
        : "";

  if (!nps || !shellId || !p) return undefined;

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
    if (!route.query.nps || !route.query.shellId || !route.query.p) return false;
    if (route.query.nps !== nps) return false;
    const routeUnits = route.query.units ?? route.query.unit;
    if (unitKey && routeUnits && routeUnits !== unitKey) return false;
    if (!numEq(route.query.shellId, shellId)) return false;
    if (!numEq(route.query.p, p)) return false;
    return true;
  });
}
