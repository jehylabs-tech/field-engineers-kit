/**
 * Pattern B: /calculator/heat-exchanger-lmtd-duty/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "water-to-water-90c-60c-10000kgh",
    label: "Water–water 90→60 °C · 10 000 kg/h",
    query: {
      units: "metric",
      fluid: "water",
      th_in: "90",
      th_out: "60",
      tc_in: "20",
      tc_out: "50",
      flow: "10000",
      shells: "1",
      u: "1200",
    },
  },
  {
    spec: "steam-condenser-120c-cooling-water",
    label: "Steam condenser 120 °C · CW 25→40 °C",
    query: {
      units: "metric",
      fluid: "steam",
      th_in: "120",
      th_out: "120",
      tc_in: "25",
      tc_out: "40",
      flow: "5000",
      shells: "1",
      u: "1200",
    },
  },
  {
    spec: "water-cooler-194f-140f-22000lbhr",
    label: "Water cooler 194→140 °F · 22 000 lb/hr",
    query: {
      units: "imperial",
      fluid: "water",
      th_in: "194",
      th_out: "140",
      tc_in: "68",
      tc_out: "122",
      flow: "22000",
      shells: "1",
      u: "211",
    },
  },
  {
    spec: "shell-tube-u-factor-200-btu",
    label: "Shell-and-tube U = 200 BTU/hr·ft²·°F",
    query: {
      units: "imperial",
      fluid: "water",
      th_in: "200",
      th_out: "150",
      tc_in: "80",
      tc_out: "130",
      flow: "15000",
      shells: "1",
      u: "200",
    },
  },
];

export function listHeatExchangerLmtdDutyPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parseHeatExchangerLmtdDutySpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}

export function matchHeatExchangerLmtdDutySpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const fluid =
    partial.fluid != null && partial.fluid !== ""
      ? String(partial.fluid)
      : partial.fluidTypeHot != null && partial.fluidTypeHot !== ""
        ? String(partial.fluidTypeHot)
        : "";
  const thIn =
    partial.th_in != null && partial.th_in !== ""
      ? String(partial.th_in)
      : partial.tempHotIn != null && partial.tempHotIn !== ""
        ? String(partial.tempHotIn)
        : "";
  const thOut =
    partial.th_out != null && partial.th_out !== ""
      ? String(partial.th_out)
      : partial.tempHotOut != null && partial.tempHotOut !== ""
        ? String(partial.tempHotOut)
        : "";
  const flow =
    partial.flow != null && partial.flow !== ""
      ? String(partial.flow)
      : partial.massFlowHot != null && partial.massFlowHot !== ""
        ? String(partial.massFlowHot)
        : "";
  if (!fluid || !thIn || !thOut) return undefined;

  const numEq = (a: string, b: string) => {
    const na = Number(a);
    const nb = Number(b);
    return Number.isFinite(na) && Number.isFinite(nb)
      ? Math.abs(na - nb) < 1e-6
      : a === b;
  };

  return routes.find((route) => {
    if (!route.query.fluid || route.query.th_in == null) return false;
    if (route.query.fluid !== fluid) return false;
    if (units && route.query.units && route.query.units !== units) return false;
    if (!numEq(route.query.th_in, thIn)) return false;
    if (!numEq(route.query.th_out ?? "", thOut)) return false;
    if (flow && route.query.flow != null && !numEq(route.query.flow, flow)) {
      return false;
    }
    return true;
  });
}
