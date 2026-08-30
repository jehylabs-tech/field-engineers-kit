import {
  listAvailableNps,
  listFlangeClassesForNps,
  listFlangeNps,
  listFittingValveClassesForNps,
  listGasketClassesForNps,
  listSchedulesForNps,
} from "@/lib/data/loaders";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";

export type SpecRoute = {
  slug: string;
  spec: string;
  query: Record<string, string>;
  label: string;
};

const SCH_SPECS = ["40", "80"] as const;
const SIZE_SPECS = ["2", "4", "8"] as const;
const PSEO_NPS = new Set<string>(SIZE_SPECS);
const PSEO_SCH_NPS = new Set(["2", "3", "4", "6", "8", "10"]);
const PSEO_CLASSES = new Set(["150", "300", "600"]);

function sizeQuery(nps: string): Record<string, string> {
  return { nps, size: `${nps}in` };
}

function schQuery(nps: string, schedule: string): Record<string, string> {
  return { ...sizeQuery(nps), sch: schedule, schedule: `Sch ${schedule}` };
}

function classQuery(nps: string, pressureClass: string): Record<string, string> {
  return {
    ...sizeQuery(nps),
    class: pressureClass,
    class_rating: `Class ${pressureClass}`,
  };
}

function pushUnique(list: SpecRoute[], route: SpecRoute) {
  if (list.some((item) => item.slug === route.slug && item.spec === route.spec)) {
    return;
  }
  list.push(route);
}

function npsSchRoutes(slug: string): SpecRoute[] {
  const routes: SpecRoute[] = [];
  const allowed = PSEO_SCH_NPS;
  for (const pipe of listAvailableNps()) {
    if (!allowed.has(pipe.nps)) continue;
    const schedules = listSchedulesForNps(pipe.nps);
    for (const sch of SCH_SPECS) {
      if (!schedules.some((row) => row.schedule === sch)) continue;
      const spec = `${pipe.nps}-inch-sch-${sch}`;
      pushUnique(routes, {
        slug,
        spec,
        query: schQuery(pipe.nps, sch),
        label: `${pipe.npsLabel} Sch ${sch}`,
      });
    }
  }
  return routes;
}

function npsClassRoutes(
  slug: string,
  classesFor: (nps: string) => { class: string }[],
  sizes: { nps: string; npsLabel: string }[],
): SpecRoute[] {
  const routes: SpecRoute[] = [];
  const allowedSizes = sizes.filter((size) => PSEO_NPS.has(size.nps));
  for (const size of allowedSizes) {
    for (const row of classesFor(size.nps)) {
      if (!PSEO_CLASSES.has(row.class)) continue;
      const spec = `${size.nps}-inch-class-${row.class}`;
      pushUnique(routes, {
        slug,
        spec,
        query: classQuery(size.nps, row.class),
        label: `${size.npsLabel} Class ${row.class}`,
      });
    }
  }
  return routes;
}

function npsOnlyRoutes(slug: string): SpecRoute[] {
  return SIZE_SPECS.map((nps) => ({
    slug,
    spec: `${nps}-inch`,
    query: sizeQuery(nps),
    label: `${nps}"`,
  }));
}

export function parseSpecToQuery(spec: string): Record<string, string> | null {
  const value = spec.trim().toLowerCase();

  // Pattern 1: {nps}-inch-class-{class}-blind or {nps}-inch-class-{class}
  const inchClassBlind = value.match(/^(\d+(?:\.\d+)?)-inch-class-(\d+)(?:-blind)?$/);
  if (inchClassBlind) {
    return classQuery(inchClassBlind[1], inchClassBlind[2]);
  }

  // Pattern 2: {nps}inch-{class}lb or {nps}inch-{class}lb-blind
  const inchLb = value.match(/^(\d+(?:\.\d+)?)inch-(\d+)lb(?:-blind)?$/);
  if (inchLb) {
    return classQuery(inchLb[1], inchLb[2]);
  }

  // Pattern 3: nps-{nps}-sch-{sch} or {nps}-inch-sch-{sch} or nps-{nps}-sch{sch}
  const inchSch = value.match(/^(?:nps-)?(\d+(?:\.\d+)?)(?:-inch)?-sch-?(\w+)$/);
  if (inchSch) {
    return schQuery(inchSch[1], inchSch[2]);
  }

  // Pattern 4: {nps}-inch or nps-{nps}
  const inchOnly = value.match(/^(?:nps-)?(\d+(?:\.\d+)?)(?:-inch)?$/);
  if (inchOnly) {
    return sizeQuery(inchOnly[1]);
  }

  if (value === "liquid" || value === "gas") {
    return { fluid: value };
  }
  if (value === "hydrostatic" || value === "pneumatic") {
    return { fluid: value };
  }
  if (
    value === "pressure" ||
    value === "flow" ||
    value === "dimension" ||
    value === "temperature" ||
    value === "torque" ||
    value === "weight" ||
    value === "velocity"
  ) {
    return { cat: value, category: value };
  }
  if (value === "carbon-steel" || value === "stainless-304" || value === "stainless-316") {
    return { material: value };
  }
  return null;
}

export function specLabelFromQuery(
  spec: string,
  query: Record<string, string>,
): string {
  if (query.class && query.nps) return `${query.nps}" Class ${query.class}`;
  if (query.sch && query.nps) return `${query.nps}" Sch ${query.sch}`;
  if (query.nps) return `${query.nps}"`;
  if (query.fluid) return query.fluid;
  if (query.cat) return query.cat;
  if (query.category) return query.category;
  if (query.material) return query.material;
  if (query.query) return query.query;
  return spec.replace(/-/g, " ");
}

export function listSpecRoutesForSlug(slug: string): SpecRoute[] {
  const type = SLUG_TO_CALCULATOR_TYPE[slug];
  if (!type) return [];

  switch (type) {
    case "pipe-schedule":
    case "pressure-drop":
    case "flow-velocity":
    case "thermal-expansion":
      return npsSchRoutes(slug);
    case "flange-dimension":
      return npsClassRoutes(
        slug,
        listFlangeClassesForNps,
        listFlangeNps(),
      );
    case "bolt-torque":
      return npsClassRoutes(slug, listFlangeClassesForNps, listFlangeNps());
    case "fitting-valve-dimension":
      return npsClassRoutes(
        slug,
        (nps) => listFittingValveClassesForNps("gate_valve", nps),
        listFlangeNps(),
      );
    case "butt-weld-fitting":
      return npsSchRoutes(slug);
    case "gasket-dimension":
      return npsClassRoutes(
        slug,
        (nps) => listGasketClassesForNps("spiral_wound", nps),
        listFlangeNps(),
      );
    case "blind-flange":
      return npsClassRoutes(
        slug,
        listFlangeClassesForNps,
        listFlangeNps(),
      );
    case "pipe-thickness":
    case "hydro-test":
      return npsOnlyRoutes(slug);
    case "valve-cv":
      return [
        { slug, spec: "liquid", query: { fluid: "liquid" }, label: "Liquid" },
        { slug, spec: "gas", query: { fluid: "gas" }, label: "Gas" },
      ];
    case "metal-weight":
      return [
        {
          slug,
          spec: "carbon-steel",
          query: { material: "carbon-steel" },
          label: "Carbon steel",
        },
        {
          slug,
          spec: "stainless-304",
          query: { material: "stainless-304" },
          label: "Stainless 304",
        },
        {
          slug,
          spec: "stainless-316",
          query: { material: "stainless-316" },
          label: "Stainless 316",
        },
      ];
    case "unit-converter":
      return [
        {
          slug,
          spec: "pressure",
          query: { cat: "pressure", category: "pressure", from: "bar", to: "psi" },
          label: "Pressure",
        },
        {
          slug,
          spec: "dimension",
          query: { cat: "dimension", category: "dimension", from: "mm", to: "in" },
          label: "Dimension",
        },
        {
          slug,
          spec: "temperature",
          query: { cat: "temperature", category: "temperature", from: "C", to: "F" },
          label: "Temperature",
        },
        {
          slug,
          spec: "flow",
          query: { cat: "flow", category: "flow", from: "m3/h", to: "GPM" },
          label: "Flow Rate",
        },
        {
          slug,
          spec: "torque",
          query: { cat: "torque", category: "torque", from: "N·m", to: "ft·lb" },
          label: "Torque",
        },
        {
          slug,
          spec: "weight",
          query: { cat: "weight", category: "weight", from: "kg", to: "lb" },
          label: "Weight",
        },
        {
          slug,
          spec: "velocity",
          query: { cat: "velocity", category: "velocity", from: "m/s", to: "ft/s" },
          label: "Velocity",
        },
      ];
    default:
      return [];
  }
}

export function listAllSpecRoutes(slugs: string[]): SpecRoute[] {
  return slugs.flatMap((slug) => listSpecRoutesForSlug(slug));
}

export function resolveSpecRoute(
  slug: string,
  spec: string,
): SpecRoute | undefined {
  const listed = listSpecRoutesForSlug(slug).find((item) => item.spec === spec);
  if (listed) return listed;

  const query = parseSpecToQuery(spec);
  if (!query) return undefined;
  return {
    slug,
    spec,
    query,
    label: specLabelFromQuery(spec, query),
  };
}
