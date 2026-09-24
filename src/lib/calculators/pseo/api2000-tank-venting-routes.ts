/**
 * Pattern B: /calculator/api2000-tank-venting/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "d15m-h12m-pumpin200-metric",
    label: "Ø15 m · H 12 m · pump-in 200 m³/h",
    query: {
      dia: "15",
      height: "12",
      pumpIn: "200",
      pumpOut: "250",
      volatility: "flash-point-below-37.8c",
      env: "bare",
      f: "1",
      m: "72",
      lv: "360",
      lat: "below-42-deg",
      units: "metric",
    },
  },
  {
    spec: "d25m-h18m-insulated-metric",
    label: "Ø25 m · H 18 m · insulated",
    query: {
      dia: "25",
      height: "18",
      pumpIn: "500",
      pumpOut: "600",
      volatility: "flash-point-above-37.8c",
      env: "insulated",
      f: "0.3",
      m: "100",
      lv: "310",
      lat: "below-42-deg",
      units: "metric",
    },
  },
  {
    spec: "d50ft-h40ft-pumpin1000gpm-imperial",
    label: "Ø50 ft · H 40 ft · pump-in 1000 GPM",
    query: {
      dia: "50",
      height: "40",
      pumpIn: "1000",
      pumpOut: "1200",
      volatility: "flash-point-below-37.8c",
      env: "bare",
      f: "1",
      m: "72",
      lv: "155",
      lat: "below-42-deg",
      units: "imperial",
    },
  },
  {
    spec: "d80ft-h50ft-insulated-imperial",
    label: "Ø80 ft · H 50 ft · insulated",
    query: {
      dia: "80",
      height: "50",
      pumpIn: "2000",
      pumpOut: "2500",
      volatility: "flash-point-above-37.8c",
      env: "insulated",
      f: "0.3",
      m: "110",
      lv: "135",
      lat: "below-42-deg",
      units: "imperial",
    },
  },
];

export function listApi2000TankVentingPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((row) => ({
    slug,
    spec: row.spec,
    query: row.query,
    label: row.label,
  }));
}

export function matchApi2000TankVentingSpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const dia =
    partial.dia != null && partial.dia !== ""
      ? String(partial.dia)
      : partial.tankDiameter != null && partial.tankDiameter !== ""
        ? String(partial.tankDiameter)
        : "";
  const height =
    partial.height != null && partial.height !== ""
      ? String(partial.height)
      : partial.tankHeight != null && partial.tankHeight !== ""
        ? String(partial.tankHeight)
        : "";
  const pumpIn =
    partial.pumpIn != null && partial.pumpIn !== ""
      ? String(partial.pumpIn)
      : partial.pumpInRate != null && partial.pumpInRate !== ""
        ? String(partial.pumpInRate)
        : "";

  if (!dia || !height || !pumpIn) return undefined;

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
    if (!route.query.dia || !route.query.height || !route.query.pumpIn) {
      return false;
    }
    const routeUnits = route.query.units ?? route.query.unit;
    if (unitKey && routeUnits && routeUnits !== unitKey) return false;
    if (!numEq(route.query.dia, dia)) return false;
    if (!numEq(route.query.height, height)) return false;
    if (!numEq(route.query.pumpIn, pumpIn)) return false;
    return true;
  });
}
