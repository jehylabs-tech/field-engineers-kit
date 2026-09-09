import type { CalculatorType } from "@/lib/calculators/definitions";
import {
  ALLOY_MATERIAL_BY_ID,
  ALLOY_PSEO_MATERIALS,
} from "@/lib/calculators/engines/alloy-weight";
import {
  formatSequenceArrowText,
  generateBoltSequence,
} from "@/lib/calculators/engines/bolt-sequence";
import {
  getPipeScheduleEntry,
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

export type SpecSeoCopy = {
  title: string;
  description: string;
  h1: string;
  h2: string;
};

/** High-volume NPS set for class-based tools. */
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

/** NPS × schedule matrix tools. */
const PSEO_SCH_NPS = new Set([
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

const SCH_SPECS = ["40", "80", "160", "STD", "XS"] as const;
const PSEO_CLASSES = new Set(["150", "300", "600", "900"]);

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
  for (const pipe of listAvailableNps()) {
    if (!PSEO_SCH_NPS.has(pipe.nps)) continue;
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

export function parseSpecToQuery(spec: string): Record<string, string> | null {
  const value = spec.trim().toLowerCase();

  const inchClassBlind = value.match(
    /^(\d+(?:\.\d+)?)-inch-class-(\d+)(?:-blind)?$/,
  );
  if (inchClassBlind) {
    return classQuery(inchClassBlind[1], inchClassBlind[2]);
  }

  const inchLb = value.match(/^(\d+(?:\.\d+)?)inch-(\d+)lb(?:-blind)?$/);
  if (inchLb) {
    return classQuery(inchLb[1], inchLb[2]);
  }

  // Sch tokens may be numeric or STD/XS (case-insensitive in URL).
  const inchSch = value.match(
    /^(?:nps-)?(\d+(?:\.\d+)?)(?:-inch)?-sch-?([a-z0-9]+)$/i,
  );
  if (inchSch) {
    const schRaw = inchSch[2];
    const sch =
      schRaw.toUpperCase() === "STD" || schRaw.toUpperCase() === "XS"
        ? schRaw.toUpperCase()
        : schRaw;
    return schQuery(inchSch[1], sch);
  }

  const inchOnly = value.match(/^(?:nps-)?(\d+(?:\.\d+)?)(?:-inch)?$/);
  if (inchOnly) {
    return sizeQuery(inchOnly[1]);
  }

  const boltPattern = value.match(
    /^(\d+)-bolt-(star|circular|cross|sequence)$/,
  );
  if (boltPattern) {
    const pattern =
      boltPattern[2] === "circular" ? "circular" : "star";
    return { bolts: boltPattern[1], pattern };
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
  if (
    value === "carbon-steel" ||
    value === "stainless-304" ||
    value === "stainless-316" ||
    value in ALLOY_MATERIAL_BY_ID
  ) {
    return { material: value };
  }
  return null;
}

export function specLabelFromQuery(
  spec: string,
  query: Record<string, string>,
): string {
  if (query.bolts) {
    const pattern =
      query.pattern === "circular" ? "circular" : "star";
    return `${query.bolts}-Bolt ${pattern === "circular" ? "Circular" : "Star"}`;
  }
  if (query.class && query.nps) return `${query.nps}" Class ${query.class}`;
  if (query.sch && query.nps) return `${query.nps}" Sch ${query.sch}`;
  if (query.nps) return `${query.nps}"`;
  if (query.fluid) {
    return query.fluid.charAt(0).toUpperCase() + query.fluid.slice(1);
  }
  if (query.cat) return query.cat;
  if (query.category) return query.category;
  if (query.material) {
    return query.material
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
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
    case "butt-weld-fitting":
    case "pipe-thickness":
    case "hydro-test":
    case "link-seal":
      return npsSchRoutes(slug);
    case "flange-dimension":
      return npsClassRoutes(slug, listFlangeClassesForNps, listFlangeNps());
    case "bolt-torque":
      return npsClassRoutes(slug, listFlangeClassesForNps, listFlangeNps());
    case "bolt-sequence": {
      const routes: SpecRoute[] = [];
      const counts = [4, 8, 12, 16, 20, 24, 32, 36, 40, 48, 56, 64];
      for (const bolts of counts) {
        for (const pattern of ["star", "circular"] as const) {
          const spec = `${bolts}-bolt-${pattern}`;
          pushUnique(routes, {
            slug,
            spec,
            query: { bolts: String(bolts), pattern },
            label: `${bolts}-Bolt ${pattern === "star" ? "Star" : "Circular"}`,
          });
        }
      }
      return routes;
    }
    case "fitting-valve-dimension":
      return npsClassRoutes(
        slug,
        (nps) => listFittingValveClassesForNps("gate_valve", nps),
        listFlangeNps(),
      );
    case "gasket-dimension":
      return npsClassRoutes(
        slug,
        (nps) => listGasketClassesForNps("spiral_wound", nps),
        listFlangeNps(),
      );
    case "blind-flange":
      return npsClassRoutes(slug, listFlangeClassesForNps, listFlangeNps());
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
    case "alloy-weight":
      return ALLOY_PSEO_MATERIALS.map((id) => ({
        slug,
        spec: id,
        query: { material: id },
        label: ALLOY_MATERIAL_BY_ID[id].label,
      }));
    case "unit-converter":
      return [
        {
          slug,
          spec: "pressure",
          query: {
            cat: "pressure",
            category: "pressure",
            from: "bar",
            to: "psi",
          },
          label: "Pressure",
        },
        {
          slug,
          spec: "dimension",
          query: {
            cat: "dimension",
            category: "dimension",
            from: "mm",
            to: "in",
          },
          label: "Dimension",
        },
        {
          slug,
          spec: "temperature",
          query: {
            cat: "temperature",
            category: "temperature",
            from: "C",
            to: "F",
          },
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
          query: {
            cat: "torque",
            category: "torque",
            from: "N·m",
            to: "ft·lb",
          },
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
          query: {
            cat: "velocity",
            category: "velocity",
            from: "m/s",
            to: "ft/s",
          },
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

export function buildSpecPath(slug: string, spec: string): string {
  return `/calculator/${slug}/${spec}`;
}

/**
 * Match current UI / URL query keys to a listed SpecRoute for path sync.
 * Prefer the most specific match (nps+sch, nps+class, then single-key routes).
 */
export function findSpecRouteForInputs(
  slug: string,
  partial: Record<string, string | number | undefined | null>,
): SpecRoute | undefined {
  const routes = listSpecRoutesForSlug(slug);
  if (routes.length === 0) return undefined;

  const nps = partial.nps != null && partial.nps !== "" ? String(partial.nps) : "";
  const sch =
    partial.sch != null && partial.sch !== ""
      ? String(partial.sch)
      : partial.schedule != null && partial.schedule !== ""
        ? String(partial.schedule).replace(/^Sch\s+/i, "")
        : "";
  const pressureClass =
    partial.class != null && partial.class !== ""
      ? String(partial.class)
      : partial.class_rating != null && partial.class_rating !== ""
        ? String(partial.class_rating).replace(/^Class\s+/i, "")
        : "";
  const fluid = partial.fluid != null ? String(partial.fluid) : "";
  const material = partial.material != null ? String(partial.material) : "";
  const cat =
    partial.cat != null
      ? String(partial.cat)
      : partial.category != null
        ? String(partial.category)
        : "";
  const bolts =
    partial.bolts != null && partial.bolts !== ""
      ? String(partial.bolts)
      : "";
  const pattern =
    partial.pattern != null && partial.pattern !== ""
      ? String(partial.pattern)
      : "";

  if (bolts && pattern) {
    const hit = routes.find(
      (route) =>
        route.query.bolts === bolts && route.query.pattern === pattern,
    );
    if (hit) return hit;
  }
  if (bolts) {
    const hit = routes.find(
      (route) =>
        route.query.bolts === bolts &&
        (route.query.pattern === "star" || !route.query.pattern),
    );
    if (hit) return hit;
  }

  if (nps && sch) {
    const hit = routes.find(
      (route) => route.query.nps === nps && route.query.sch === sch,
    );
    if (hit) return hit;
  }
  if (nps && pressureClass) {
    const hit = routes.find(
      (route) => route.query.nps === nps && route.query.class === pressureClass,
    );
    if (hit) return hit;
  }
  if (fluid) {
    const hit = routes.find((route) => route.query.fluid === fluid);
    if (hit) return hit;
  }
  if (material) {
    const hit = routes.find((route) => route.query.material === material);
    if (hit) return hit;
  }
  if (cat) {
    const hit = routes.find(
      (route) => route.query.cat === cat || route.query.category === cat,
    );
    if (hit) return hit;
  }
  if (nps) {
    const hit = routes.find(
      (route) =>
        route.query.nps === nps && !route.query.sch && !route.query.class,
    );
    if (hit) return hit;
    // Tools without a schedule control still land on Sch 40 pSEO pages.
    const sch40 = routes.find(
      (route) => route.query.nps === nps && route.query.sch === "40",
    );
    if (sch40) return sch40;
  }
  return undefined;
}

function humanNps(nps: string): string {
  return `${nps} Inch`;
}

function humanSch(sch: string): string {
  return `Schedule ${sch}`;
}

function humanClass(cls: string): string {
  return `Class ${cls}`;
}

/**
 * Long-tail title / description / headings for programmatic SEO pages.
 */
export function buildSpecSeoCopy(
  calculatorTitle: string,
  calculatorType: CalculatorType | undefined,
  route: SpecRoute,
  metaDescription?: string | null,
): SpecSeoCopy {
  const q = route.query;
  const brand = "FieldEngineersKit";
  const shortTitle = calculatorTitle.replace(/\s+Calculator$/i, "").trim();

  if (q.bolts) {
    const count = q.bolts;
    const mode = q.pattern === "circular" ? "Circular" : "Star";
    const focus = `${count}-Bolt ${mode} Pattern`;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Interactive ASME PCC-1 ${mode.toLowerCase()} tightening sequence for a ${count}-bolt flange circle.`;
    return {
      title,
      description,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} sequence & PCC-1 rounds`,
    };
  }

  if (q.nps && q.sch) {
    const size = humanNps(q.nps);
    const schedule = humanSch(q.sch);
    const focus = `${size} ${schedule}`;
    const title = `${shortTitle} for ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Calculate ${shortTitle.toLowerCase()} for ${focus} pipe with verified ASME/API screening formulas.`;
    return {
      title,
      description,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} specification summary`,
    };
  }

  if (q.nps && q.class) {
    const size = humanNps(q.nps);
    const cls = humanClass(q.class);
    const focus = `${size} ${cls}`;
    const title = `${shortTitle} for ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Look up ${shortTitle.toLowerCase()} for ${focus} per ASME B16 dimensional tables.`;
    return {
      title,
      description,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} specification summary`,
    };
  }

  if (q.fluid) {
    const focus = q.fluid === "gas" ? "Gas Service" : "Liquid Service";
    return {
      title: `${shortTitle} — ${focus} | ${brand}`,
      description:
        metaDescription ??
        `${shortTitle} screening for ${focus.toLowerCase()} with ISA/IEC flow equations.`,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} calculation inputs`,
    };
  }

  if (q.material) {
    const focus = route.label;
    return {
      title: `${shortTitle} — ${focus} | ${brand}`,
      description:
        metaDescription ??
        `${shortTitle} for ${focus} stock with density-based mass and cost screening.`,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} material summary`,
    };
  }

  if (q.cat || q.category) {
    const focus = route.label;
    return {
      title: `${shortTitle} — ${focus} Units | ${brand}`,
      description:
        metaDescription ??
        `Convert ${focus.toLowerCase()} engineering units instantly with FieldEngineersKit.`,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} conversion presets`,
    };
  }

  void calculatorType;
  return {
    title: `${route.label} ${shortTitle} | ${brand}`,
    description:
      metaDescription ??
      `${route.label} calculation and reference data for ${shortTitle}.`,
    h1: `${route.label} · ${shortTitle}`,
    h2: `${route.label} specification summary`,
  };
}

export type SpecFactRow = {
  label: string;
  value: string;
};

/** Unique on-page facts for Googlebot (NPS / sch / OD / ID when available). */
export function buildSpecFactRows(route: SpecRoute): SpecFactRow[] {
  const rows: SpecFactRow[] = [];
  const q = route.query;

  if (q.nps) {
    rows.push({ label: "Nominal pipe size (NPS)", value: `${q.nps}"` });
  }
  if (q.bolts) {
    rows.push({ label: "Bolt count", value: q.bolts });
  }
  if (q.pattern) {
    rows.push({
      label: "Pattern",
      value: q.pattern === "circular" ? "Circular" : "Star / cross",
    });
  }
  if (q.bolts && q.pattern) {
    const count = Number(q.bolts);
    if (Number.isFinite(count) && count >= 4) {
      const pattern = q.pattern === "circular" ? "circular" : "star";
      const seq = generateBoltSequence(count, pattern);
      if (seq.length === count) {
        rows.push({
          label: "Sequence",
          value: formatSequenceArrowText(seq),
        });
      }
    }
  }
  if (q.sch) {
    rows.push({ label: "Schedule", value: `Sch ${q.sch}` });
  }
  if (q.class) {
    rows.push({ label: "Pressure class", value: `Class ${q.class}` });
  }
  if (q.fluid) {
    rows.push({
      label: "Service fluid",
      value: q.fluid.charAt(0).toUpperCase() + q.fluid.slice(1),
    });
  }
  if (q.material) {
    rows.push({ label: "Material", value: route.label });
    const alloy = ALLOY_MATERIAL_BY_ID[q.material as keyof typeof ALLOY_MATERIAL_BY_ID];
    if (alloy) {
      rows.push({
        label: "Density",
        value: `${alloy.densityKgM3} kg/m³ (${(alloy.densityKgM3 / 1000).toFixed(2)} g/cm³)`,
      });
    }
  }
  if (q.cat || q.category) {
    rows.push({ label: "Unit category", value: route.label });
    if (q.from && q.to) {
      rows.push({ label: "Default conversion", value: `${q.from} → ${q.to}` });
    }
  }

  if (q.nps && q.sch) {
    const entry = getPipeScheduleEntry(q.nps, q.sch);
    if (entry) {
      rows.push({
        label: "Outside diameter (OD)",
        value: `${entry.pipe.outsideDiameterMm.toFixed(2)} mm (${entry.pipe.outsideDiameterIn.toFixed(3)} in)`,
      });
      rows.push({
        label: "Wall thickness (t)",
        value: `${entry.row.wallThicknessMm.toFixed(2)} mm`,
      });
      rows.push({
        label: "Inside diameter (ID)",
        value: `${entry.row.insideDiameterMm.toFixed(2)} mm`,
      });
    }
  }

  return rows;
}
