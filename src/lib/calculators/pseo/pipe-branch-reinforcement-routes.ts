import type { SpecRoute } from "@/lib/calculators/spec-routes";
import {
  buildPipeBranchReinforcementSpec,
  listPipeBranchReinforcementPseoRoutes,
} from "@/lib/calculators/engines/pipe-branch-reinforcement";
import { getPipeScheduleEntry } from "@/lib/data/loaders";

const DN_BY_NPS: Record<string, number> = {
  "6": 150,
  "10": 250,
  "16": 400,
};

const NPS_BY_DN: Record<string, string> = Object.fromEntries(
  Object.entries(DN_BY_NPS).map(([nps, dn]) => [String(dn), nps]),
);

const FEATURED_DUTIES: Array<{
  headerNps: string;
  branchNps: string;
  schedule: string;
  units: "imperial" | "metric";
  pressure: string;
  label: string;
  specImperial: string;
  specMetric: string;
}> = [
  {
    headerNps: "10",
    branchNps: "6",
    schedule: "40",
    units: "imperial",
    pressure: "500",
    label: '10" STD header · 6" STD branch · 500 psi',
    specImperial: "10inch-std-6inch-std-500psi",
    specMetric: "250a-std-150a-std-35bar",
  },
  {
    headerNps: "16",
    branchNps: "10",
    schedule: "40",
    units: "imperial",
    pressure: "800",
    label: '16" STD header · 10" STD branch · 800 psi',
    specImperial: "16inch-std-10inch-std-800psi",
    specMetric: "400a-std-250a-std-55bar",
  },
];

function branchQuery(
  headerNps: string,
  branchNps: string,
  schedule: string,
  extras?: Record<string, string>,
): Record<string, string> {
  return {
    hnps: headerNps,
    bnps: branchNps,
    hsch: schedule,
    bsch: schedule,
    angle: "90",
    ...extras,
  };
}

const METRIC_DUTY_FIELDS: Record<string, string> = {
  temp: "38",
  sh: "138",
  sb: "138",
  sr: "138",
  ca: "1.6",
  legh: "9.5",
  legb: "9.5",
  e: "1",
  w: "1",
  y: "0.4",
  mill: "12.5",
};

const IMPERIAL_DUTY_FIELDS: Record<string, string> = {
  temp: "100",
  sh: "20000",
  sb: "20000",
  sr: "20000",
  ca: "0.0625",
  legh: "0.375",
  legb: "0.375",
  e: "1",
  w: "1",
  y: "0.4",
  mill: "12.5",
};

function pushUnique(list: SpecRoute[], route: SpecRoute) {
  if (list.some((item) => item.slug === route.slug && item.spec === route.spec)) {
    return;
  }
  list.push(route);
}

export function listPipeBranchReinforcementPseoRoutesFull(
  slug: string,
): SpecRoute[] {
  const routes: SpecRoute[] = listPipeBranchReinforcementPseoRoutes(slug);

  for (const duty of FEATURED_DUTIES) {
    if (
      !getPipeScheduleEntry(duty.headerNps, duty.schedule) ||
      !getPipeScheduleEntry(duty.branchNps, duty.schedule)
    ) {
      continue;
    }

    pushUnique(routes, {
      slug,
      spec: duty.specImperial,
      query: branchQuery(duty.headerNps, duty.branchNps, duty.schedule, {
        units: "imperial",
        pressure: duty.pressure,
        ...IMPERIAL_DUTY_FIELDS,
      }),
      label: duty.label,
    });

    const metricPressure = duty.headerNps === "10" ? "35" : "55";
    pushUnique(routes, {
      slug,
      spec: duty.specMetric,
      query: branchQuery(duty.headerNps, duty.branchNps, duty.schedule, {
        units: "metric",
        pressure: metricPressure,
        ...METRIC_DUTY_FIELDS,
      }),
      label:
        duty.headerNps === "10"
          ? "DN250 STD · DN150 STD branch · 35 bar"
          : "DN400 STD · DN250 STD branch · 55 bar",
    });
  }

  return routes;
}

function resolveStdSchedule(): string {
  return "40";
}

/**
 * Pattern B specs:
 * - Featured imperial: `{header}inch-std-{branch}inch-std-{pressure}psi`
 * - Featured metric: `{headerA}a-std-{branchA}a-std-{pressure}bar`
 * - Combinatorial: `{branch}-on-{header}-sch-{sch}-{angle}deg`
 */
export function parsePipeBranchReinforcementSpec(
  spec: string,
): Record<string, string> | null {
  const value = spec.trim().toLowerCase();

  const featuredInch = value.match(
    /^(\d+(?:\.\d+)?)inch-std-(\d+(?:\.\d+)?)inch-std-(\d+(?:\.\d+)?)psi$/,
  );
  if (featuredInch) {
    return branchQuery(featuredInch[1]!, featuredInch[2]!, resolveStdSchedule(), {
      units: "imperial",
      pressure: featuredInch[3]!,
      ...IMPERIAL_DUTY_FIELDS,
    });
  }

  const featuredMetric = value.match(
    /^(\d+)a-std-(\d+)a-std-(\d+(?:\.\d+)?)bar$/,
  );
  if (featuredMetric) {
    const headerNps = NPS_BY_DN[featuredMetric[1]!];
    const branchNps = NPS_BY_DN[featuredMetric[2]!];
    if (!headerNps || !branchNps) return null;
    return branchQuery(headerNps, branchNps, resolveStdSchedule(), {
      units: "metric",
      pressure: featuredMetric[3]!,
      ...METRIC_DUTY_FIELDS,
    });
  }

  return null;
}

export { buildPipeBranchReinforcementSpec };
