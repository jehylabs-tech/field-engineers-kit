import type { SpecRoute } from "@/lib/calculators/spec-routes";
import { listFlangeClassesForNps, listFlangeNps } from "@/lib/data/loaders";

/** High-traffic NPS × class set for wrench lookup SEO. */
const PSEO_NPS = new Set([
  "0.5",
  "1",
  "1.5",
  "2",
  "3",
  "4",
  "6",
  "8",
  "10",
  "12",
]);

const PSEO_CLASSES = new Set(["150", "300", "600", "900", "1500"]);

/** Extra long-tail duties (facing variants + prompt examples). */
const DUTY_CASES: Array<{
  nps: string;
  class: string;
  facing: "rf" | "rtj" | "ff";
  label: string;
}> = [
  {
    nps: "4",
    class: "300",
    facing: "rf",
    label: '4" Class 300 RF wrench lookup',
  },
  {
    nps: "6",
    class: "150",
    facing: "rf",
    label: '6" Class 150 RF wrench lookup',
  },
  {
    nps: "8",
    class: "600",
    facing: "rtj",
    label: '8" Class 600 RTJ wrench lookup',
  },
  {
    nps: "12",
    class: "150",
    facing: "rf",
    label: '12" Class 150 RF wrench lookup',
  },
  {
    nps: "2",
    class: "1500",
    facing: "rf",
    label: '2" Class 1500 RF wrench lookup',
  },
];

function query(
  nps: string,
  pressureClass: string,
  facing: string,
): Record<string, string> {
  return {
    nps,
    size: `${nps}in`,
    class: pressureClass,
    class_rating: `Class ${pressureClass}`,
    facing,
  };
}

function pushUnique(list: SpecRoute[], route: SpecRoute) {
  if (list.some((item) => item.slug === route.slug && item.spec === route.spec)) {
    return;
  }
  list.push(route);
}

/**
 * Pattern B specs: `{nps}inch-{class}lb-{rf|rtj|ff}`
 * Example: `4inch-300lb-rf`
 */
export function listBoltWrenchLookupPseoRoutes(slug: string): SpecRoute[] {
  const routes: SpecRoute[] = [];
  const sizes = listFlangeNps().filter((size) => PSEO_NPS.has(size.nps));

  for (const size of sizes) {
    for (const row of listFlangeClassesForNps(size.nps)) {
      if (!PSEO_CLASSES.has(row.class)) continue;
      const faces: Array<"rf" | "rtj"> =
        Number(row.class) >= 300 ? ["rf", "rtj"] : ["rf"];
      for (const facing of faces) {
        const spec = `${size.nps}inch-${row.class}lb-${facing}`;
        pushUnique(routes, {
          slug,
          spec,
          query: query(size.nps, row.class, facing),
          label: `${size.npsLabel} Class ${row.class} ${facing.toUpperCase()}`,
        });
      }
    }
  }

  for (const duty of DUTY_CASES) {
    const size = listFlangeNps().find((row) => row.nps === duty.nps);
    if (!size) continue;
    const classes = listFlangeClassesForNps(duty.nps);
    if (!classes.some((row) => row.class === duty.class)) continue;
    const spec = `${duty.nps}inch-${duty.class}lb-${duty.facing}`;
    pushUnique(routes, {
      slug,
      spec,
      query: query(duty.nps, duty.class, duty.facing),
      label: duty.label,
    });
  }

  return routes;
}
