export const CATEGORY_UI: Record<
  string,
  { icon: string; shortLabel: string; label: string }
> = {
  piping: {
    icon: "⚙️",
    shortLabel: "Piping",
    label: "Piping",
  },
  mechanical: {
    icon: "🔧",
    shortLabel: "Mechanical",
    label: "Mechanical",
  },
  procurement: {
    icon: "📦",
    shortLabel: "Procurement",
    label: "Procurement",
  },
  inspection: {
    icon: "🔍",
    shortLabel: "Inspection",
    label: "Inspection",
  },
  electrical: {
    icon: "⚡",
    shortLabel: "Electrical",
    label: "Electrical",
  },
  instrumentation: {
    icon: "📡",
    shortLabel: "Instrumentation",
    label: "Instrumentation",
  },
  hvac: {
    icon: "🌡️",
    shortLabel: "HVAC",
    label: "HVAC",
  },
  structural: {
    icon: "🏗️",
    shortLabel: "Structural",
    label: "Structural",
  },
};

export const RECENT_STORAGE_KEY = "fek-recent-calculators";

export type RecentCalculatorItem = {
  slug: string;
  title: string;
  category: string;
  snap?: string;
  visitedAt: number;
};

/** One-line catalog copy crawled with each calculator anchor on the home list. */
export const CATALOG_SEO_BLURBS: Record<string, string> = {
  "pipe-wall-thickness":
    "Calculates t_min and pressure rating based on ASME B31.3 process piping code.",
  "pipe-schedule-dimension":
    "ASME B36.10M pipe NPS, schedule, OD, ID, wall thickness, and unit weight lookup.",
  "flange-dimension-weight":
    "ASME B16.5 & B16.47 flange dimensions, rating, and bolt hole data.",
  "fitting-valve-dimension":
    "ASME B16.10 flanged valve face-to-face (FTF) by NPS and class.",
  "butt-weld-fitting-dimension":
    "ASME B16.9 BW fittings: LR/SR elbow, tee, reducer, and cap center-to-end with schedule OD/ID/wall.",
  "gasket-dimension-selection":
    "ASME B16.20 spiral-wound and RTJ ring gasket dimensions by NPS and class.",
  "valve-cv-sizing":
    "ISA / IEC 60534 control-valve Cv sizing for liquid and gas service.",
  "bolt-torque-tensioning":
    "ASME PCC-1 flange joint assembly torque, stud count, and star tightening sequence.",
  "flange-bolt-tightening-sequence":
    "ASME PCC-1 flange bolt star/cross and circular tightening sequence generator with interactive diagram.",
  "blind-flange-thickness":
    "ASME B31.3 / VIII-1 UG-34 blind thickness t = d × √(0.3P / SE) + c.",
  "metal-weight-cost":
    "Plate, pipe, and bar metal weight and procurement cost from density and unit price.",
  "stainless-alloy-weight-density":
    "SS304/316, Duplex, Inconel, Hastelloy, and Titanium weight & density for plate, pipe, and bar.",
  "hydro-test-pressure":
    "ASME B31.3 St/S stress ratio & yield limit check for 1.5× hydro / 1.1× pneumatic tests.",
  "thermal-expansion-loop":
    "ASME B31.3 thermal expansion ΔL = αLΔT, loop H/W, and F_anchor for CS, steam pipe, and CPVC.",
  "pressure-drop-friction":
    "Darcy–Weisbach / Haaland friction pressure drop for process pipe and fittings.",
  "flow-velocity-erosion":
    "Pipe flow velocity v = Q/A and API RP 14E erosion velocity limit vc.",
  "pump-npsh-cavitation":
    "Mechanical pump NPSHa = (Ps−Pv)/ρg + zs − hf with HI 9.6.1 / ASME B73.1 / API 610 cavitation margin screening.",
  "pipe-coping-branch-cut-layout":
    "Pipe coping / branch cut flat-pattern layout with 16–32 ordinate marks for set-on, set-in, and miter joints.",
  "pneumatic-test-safety-distance":
    "ASME PCC-2 Article 501 pneumatic test stored energy and personnel exclusion distance screening.",
  "unit-converter":
    "Free engineering unit converter for pressure, dimension, temperature, flow, torque, weight, and velocity.",
  "link-seal-penetration-sleeve":
    "Link-Seal modular seal sizing: annular C, LS model, link count N, and sleeve / core-drill ID from pipe OD.",
};

export function catalogSeoBlurb(slug: string): string {
  return (
    CATALOG_SEO_BLURBS[slug] ??
    "Free plant engineering calculator for piping, mechanical, and procurement work."
  );
}
