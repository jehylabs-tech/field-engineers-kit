/**
 * Pattern B: /calculator/socket-weld-threaded-fitting-dimension/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "sw-elbow90-nps1-class3000-metric",
    label: "SW 90° Elbow NPS 1 Class 3000 (metric)",
    query: {
      units: "metric",
      conn: "socket-weld",
      fitting: "elbow-90",
      nps: "1",
      rating: "3000",
    },
  },
  {
    spec: "threaded-tee-nps2-class3000-metric",
    label: "Threaded Tee NPS 2 Class 3000 (metric)",
    query: {
      units: "metric",
      conn: "threaded-npt",
      fitting: "tee",
      nps: "2",
      rating: "3000",
    },
  },
  {
    spec: "sw-coupling-nps1.5-class6000-imperial",
    label: "SW Coupling NPS 1½ Class 6000 (imperial)",
    query: {
      units: "imperial",
      conn: "socket-weld",
      fitting: "coupling",
      nps: "1.5",
      rating: "6000",
    },
  },
  {
    spec: "threaded-cap-nps0.75-class2000-imperial",
    label: "Threaded Cap NPS ¾ Class 2000 (imperial)",
    query: {
      units: "imperial",
      conn: "threaded-npt",
      fitting: "cap",
      nps: "0.75",
      rating: "2000",
    },
  },
  {
    spec: "sw-elbow45-nps2-class3000-metric",
    label: "SW 45° Elbow NPS 2 Class 3000 (metric)",
    query: {
      units: "metric",
      conn: "socket-weld",
      fitting: "elbow-45",
      nps: "2",
      rating: "3000",
    },
  },
  {
    spec: "threaded-elbow90-nps1-class3000-imperial",
    label: "Threaded 90° Elbow NPS 1 Class 3000 (imperial)",
    query: {
      units: "imperial",
      conn: "threaded-npt",
      fitting: "elbow-90",
      nps: "1",
      rating: "3000",
    },
  },
];

export function listSocketWeldThreadedFittingDimensionPseoRoutes(
  slug: string,
): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parseSocketWeldThreadedFittingDimensionSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}

export function matchSocketWeldThreadedFittingDimensionSpecRoute(
  routes: SpecRoute[],
  partial: Record<string, string | number | undefined | null>,
  units: string,
): SpecRoute | undefined {
  const conn =
    partial.conn != null && partial.conn !== ""
      ? String(partial.conn)
      : partial.connection != null && partial.connection !== ""
        ? String(partial.connection)
        : "";
  const fitting =
    partial.fitting != null && partial.fitting !== ""
      ? String(partial.fitting)
      : "";
  const nps =
    partial.nps != null && partial.nps !== "" ? String(partial.nps) : "";
  const rating =
    partial.rating != null && partial.rating !== ""
      ? String(partial.rating)
      : "";

  if (!conn || !fitting || !nps || !rating) return undefined;

  return routes.find((route) => {
    if (
      !route.query.conn ||
      !route.query.fitting ||
      !route.query.nps ||
      !route.query.rating
    ) {
      return false;
    }
    if (route.query.conn !== conn) return false;
    if (route.query.fitting !== fitting) return false;
    if (route.query.nps !== nps) return false;
    if (route.query.rating !== rating) return false;
    if (units && route.query.units && route.query.units !== units) return false;
    return true;
  });
}
