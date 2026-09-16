import type { SpecRoute } from "@/lib/calculators/spec-routes";
import type { GasketStressTypeId } from "@/lib/calculators/engines/flange-gasket-stress";
import { listFlangeClassesForNps, listFlangeNps } from "@/lib/data/loaders";

const PSEO_NPS = new Set(["0.5", "1", "1.5", "2", "3", "4", "6", "8", "10", "12"]);
const PSEO_CLASSES = new Set(["150", "300", "600", "900"]);

/** Spec path segment ↔ gasketType id */
export const GASKET_STRESS_SPEC_SLUG: Record<GasketStressTypeId, string> = {
  soft_rubber: "soft-rubber",
  compressed_fiber: "compressed-fiber",
  spiral_wound_filled: "spiral-wound",
  ptfe_sheet: "ptfe-sheet",
  rtj_soft_iron: "rtj-soft-iron",
};

export const GASKET_STRESS_SPEC_TO_TYPE: Record<string, GasketStressTypeId> =
  Object.fromEntries(
    Object.entries(GASKET_STRESS_SPEC_SLUG).map(([type, slug]) => [slug, type]),
  ) as Record<string, GasketStressTypeId>;

const DN_BY_NPS: Record<string, number> = {
  "0.5": 15,
  "1": 25,
  "1.5": 40,
  "2": 50,
  "3": 80,
  "4": 100,
  "6": 150,
  "8": 200,
  "10": 250,
  "12": 300,
};

const NPS_BY_DN: Record<string, string> = Object.fromEntries(
  Object.entries(DN_BY_NPS).map(([nps, dn]) => [String(dn), nps]),
);

/** Featured long-tail duties (imperial + metric aliases). */
const DUTY_CASES: Array<{
  nps: string;
  class: string;
  gasketType: GasketStressTypeId;
  units: "imperial" | "metric";
  pressure: string;
  targetBoltStress: string;
  label: string;
}> = [
  {
    nps: "2",
    class: "300",
    gasketType: "spiral_wound_filled",
    units: "imperial",
    pressure: "740",
    targetBoltStress: "45000",
    label: '2" Class 300 spiral-wound gasket stress',
  },
  {
    nps: "3",
    class: "150",
    gasketType: "compressed_fiber",
    units: "imperial",
    pressure: "285",
    targetBoltStress: "30000",
    label: '3" Class 150 compressed-fiber gasket stress',
  },
  {
    nps: "2",
    class: "300",
    gasketType: "spiral_wound_filled",
    units: "metric",
    pressure: "51",
    targetBoltStress: "310",
    label: "DN50 Class 300 spiral-wound gasket stress",
  },
  {
    nps: "3",
    class: "150",
    gasketType: "compressed_fiber",
    units: "metric",
    pressure: "19.6",
    targetBoltStress: "207",
    label: "DN80 Class 150 compressed-fiber gasket stress",
  },
];

function query(
  nps: string,
  pressureClass: string,
  gasketType: GasketStressTypeId,
  extras?: Record<string, string>,
): Record<string, string> {
  return {
    nps,
    size: `${nps}in`,
    class: pressureClass,
    class_rating: `Class ${pressureClass}`,
    gasketType,
    ...extras,
  };
}

function pushUnique(list: SpecRoute[], route: SpecRoute) {
  if (list.some((item) => item.slug === route.slug && item.spec === route.spec)) {
    return;
  }
  list.push(route);
}

function imperialSpec(
  nps: string,
  pressureClass: string,
  gasketType: GasketStressTypeId,
): string {
  return `${nps}inch-${pressureClass}lb-${GASKET_STRESS_SPEC_SLUG[gasketType]}`;
}

function metricSpec(
  nps: string,
  pressureClass: string,
  gasketType: GasketStressTypeId,
): string | null {
  const dn = DN_BY_NPS[nps];
  if (dn == null) return null;
  return `dn${dn}-${pressureClass}lb-${GASKET_STRESS_SPEC_SLUG[gasketType]}`;
}

/**
 * Pattern B specs:
 * - `{nps}inch-{class}lb-{gasket}` e.g. `2inch-300lb-spiral-wound`
 * - `dn{dn}-{class}lb-{gasket}` e.g. `dn50-300lb-spiral-wound`
 */
export function listFlangeGasketStressPseoRoutes(slug: string): SpecRoute[] {
  const routes: SpecRoute[] = [];
  const sizes = listFlangeNps().filter((size) => PSEO_NPS.has(size.nps));
  const gasketTypes: GasketStressTypeId[] = [
    "spiral_wound_filled",
    "compressed_fiber",
    "ptfe_sheet",
  ];

  for (const size of sizes) {
    for (const row of listFlangeClassesForNps(size.nps)) {
      if (!PSEO_CLASSES.has(row.class)) continue;
      for (const gasketType of gasketTypes) {
        const spec = imperialSpec(size.nps, row.class, gasketType);
        pushUnique(routes, {
          slug,
          spec,
          query: query(size.nps, row.class, gasketType),
          label: `${size.npsLabel} Class ${row.class} ${GASKET_STRESS_SPEC_SLUG[gasketType]}`,
        });
      }
    }
  }

  for (const duty of DUTY_CASES) {
    const extras = {
      units: duty.units,
      pressure: duty.pressure,
      targetBoltStress: duty.targetBoltStress,
    };
    if (duty.units === "imperial") {
      pushUnique(routes, {
        slug,
        spec: imperialSpec(duty.nps, duty.class, duty.gasketType),
        query: query(duty.nps, duty.class, duty.gasketType, extras),
        label: duty.label,
      });
    } else {
      const spec = metricSpec(duty.nps, duty.class, duty.gasketType);
      if (!spec) continue;
      pushUnique(routes, {
        slug,
        spec,
        query: query(duty.nps, duty.class, duty.gasketType, extras),
        label: duty.label,
      });
    }
  }

  return routes;
}

export function parseFlangeGasketStressSpec(
  spec: string,
): Record<string, string> | null {
  const inch = spec.match(/^(\d+(?:\.\d+)?)inch-(\d+)lb-([a-z0-9-]+)$/i);
  if (inch) {
    const gasketSlug = inch[3]!.toLowerCase();
    const gasketType = GASKET_STRESS_SPEC_TO_TYPE[gasketSlug];
    if (!gasketType) return null;
    return query(inch[1]!, inch[2]!, gasketType);
  }
  const dn = spec.match(/^dn(\d+)-(\d+)lb-([a-z0-9-]+)$/i);
  if (dn) {
    const nps = NPS_BY_DN[dn[1]!];
    const gasketSlug = dn[3]!.toLowerCase();
    const gasketType = GASKET_STRESS_SPEC_TO_TYPE[gasketSlug];
    if (!nps || !gasketType) return null;
    return query(nps, dn[2]!, gasketType, { units: "metric" });
  }
  return null;
}
