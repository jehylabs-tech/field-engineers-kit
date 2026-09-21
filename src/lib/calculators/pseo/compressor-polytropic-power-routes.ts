/**
 * Pattern B: /calculator/compressor-polytropic-power/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "natural-gas-5bar-to-25bar-5000m3h",
    label: "Natural gas 5→25 bar(a) · 5000 m³/h",
    query: {
      units: "metric",
      gas: "natural_gas",
      p1: "5",
      p2: "25",
      t1: "35",
      flow: "5000",
      eff: "75",
      mw: "18.5",
      k: "1.28",
      z: "0.95",
    },
  },
  {
    spec: "air-compressor-1bar-to-7bar-1000m3h",
    label: "Air 1.013→7 bar(a) · 1000 m³/h",
    query: {
      units: "metric",
      gas: "air",
      p1: "1.013",
      p2: "7",
      t1: "20",
      flow: "1000",
      eff: "72",
      mw: "28.97",
      k: "1.4",
      z: "1",
    },
  },
  {
    spec: "natural-gas-70psia-350psia-3000icfm",
    label: "Natural gas 70→350 psia · 3000 ICFM",
    query: {
      units: "imperial",
      gas: "natural_gas",
      p1: "70",
      p2: "350",
      t1: "95",
      flow: "3000",
      eff: "75",
      mw: "18.5",
      k: "1.28",
      z: "0.95",
    },
  },
  {
    spec: "nitrogen-gas-15psia-90psia-1500icfm",
    label: "Nitrogen 15→90 psia · 1500 ICFM",
    query: {
      units: "imperial",
      gas: "nitrogen",
      p1: "15",
      p2: "90",
      t1: "70",
      flow: "1500",
      eff: "70",
      mw: "28.01",
      k: "1.4",
      z: "1",
    },
  },
];

export function listCompressorPolytropicPowerPseoRoutes(
  slug: string,
): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parseCompressorPolytropicPowerSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}

export function matchCompressorPolytropicPowerSpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const gas =
    partial.gas != null && partial.gas !== ""
      ? String(partial.gas)
      : partial.gasType != null && partial.gasType !== ""
        ? String(partial.gasType)
        : "";
  const p1 =
    partial.p1 != null && partial.p1 !== ""
      ? String(partial.p1)
      : partial.suctionPress != null && partial.suctionPress !== ""
        ? String(partial.suctionPress)
        : "";
  const p2 =
    partial.p2 != null && partial.p2 !== ""
      ? String(partial.p2)
      : partial.dischargePress != null && partial.dischargePress !== ""
        ? String(partial.dischargePress)
        : "";
  const flow =
    partial.flow != null && partial.flow !== ""
      ? String(partial.flow)
      : partial.volFlow != null && partial.volFlow !== ""
        ? String(partial.volFlow)
        : "";

  if (!gas || !p1 || !p2) return undefined;

  const numEq = (a: string, b: string) => {
    const na = Number(a);
    const nb = Number(b);
    return Number.isFinite(na) && Number.isFinite(nb)
      ? Math.abs(na - nb) < 1e-6
      : a === b;
  };

  return routes.find((route) => {
    if (!route.query.gas || route.query.p1 == null || route.query.p2 == null) {
      return false;
    }
    if (route.query.gas !== gas) return false;
    if (units && route.query.units && route.query.units !== units) return false;
    if (!numEq(route.query.p1, p1)) return false;
    if (!numEq(route.query.p2, p2)) return false;
    if (flow && route.query.flow != null && !numEq(route.query.flow, flow)) {
      return false;
    }
    return true;
  });
}
