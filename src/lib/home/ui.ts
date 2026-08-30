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
  "blind-flange-thickness":
    "ASME B31.3 / VIII-1 UG-34 blind thickness t = d × √(0.3P / SE) + c.",
  "metal-weight-cost":
    "Plate, pipe, and bar metal weight and procurement cost from density and unit price.",
  "hydro-test-pressure":
    "ASME B31.3 St/S stress ratio & yield limit check for 1.5× hydro / 1.1× pneumatic tests.",
  "thermal-expansion-loop":
    "ASME B31.3 thermal expansion ΔL = αLΔT and piping expansion-loop screening.",
  "pressure-drop-friction":
    "Darcy–Weisbach / Haaland friction pressure drop for process pipe and fittings.",
  "flow-velocity-erosion":
    "Pipe flow velocity v = Q/A and API RP 14E erosion velocity limit vc.",
  "unit-converter":
    "Free engineering unit converter for pressure, dimension, temperature, flow, torque, weight, and velocity.",
};

export function catalogSeoBlurb(slug: string): string {
  return (
    CATALOG_SEO_BLURBS[slug] ??
    "Free plant engineering calculator for piping, mechanical, and procurement work."
  );
}
