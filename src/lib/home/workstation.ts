import { buildCalculatorHref } from "@/lib/plant-context";

export type WorkstationTool = {
  id: string;
  title: string;
  /** Descriptive label for aria-label / title (SEO + a11y). */
  seoLabel: string;
  standard: string;
  href: string;
  keywords: string[];
};

export type WorkstationDomain = {
  id: string;
  label: string;
  icon: string;
  filterIds: string[];
  tools: WorkstationTool[];
};

const DEMO = {
  size: "4in",
  schedule: "Sch 40",
  class_rating: "Class 150",
  material: "A106 Gr.B",
  pressure: { value: 20, unit: "bar" as const },
};

export const WORKSTATION_SHORTCUTS = [
  {
    id: "flange",
    label: "Flange Calc",
    seoLabel: "ASME B16.5 Flange Weight & Dimension Lookup — NPS 4 Class 150",
    href: buildCalculatorHref("flange-dimension-weight", {
      size: DEMO.size,
      class_rating: DEMO.class_rating,
    }),
  },
  {
    id: "schedule",
    label: "Pipe Schedule",
    seoLabel: "ASME B36.10M Pipe Schedule & Dimension Lookup — NPS 4 Sch 40",
    href: buildCalculatorHref("pipe-schedule-dimension", {
      size: DEMO.size,
      schedule: DEMO.schedule,
    }),
  },
  {
    id: "gasket",
    label: "Gasket Spec",
    seoLabel: "ASME B16.20 Spiral-Wound & RTJ Gasket Dimension Lookup",
    href: buildCalculatorHref("gasket-dimension-selection", {
      size: DEMO.size,
      class_rating: DEMO.class_rating,
    }),
  },
  {
    id: "valve-ftf",
    label: "Fitting & Valve Face-to-Face",
    seoLabel:
      "ASME B16.10 Valve Face-to-Face & B16.9 Fitting Center-to-End Lookup",
    href: buildCalculatorHref(
      "fitting-valve-dimension",
      { size: DEMO.size, class_rating: DEMO.class_rating },
      { component: "gate_valve" },
    ),
  },
  {
    id: "torque",
    label: "Bolt Torque",
    seoLabel: "ASME PCC-1 Flange Bolt Torque & Tensioning Calculator",
    href: buildCalculatorHref("bolt-torque-tensioning", {
      size: DEMO.size,
      class_rating: DEMO.class_rating,
    }),
  },
] as const;

/** Live catalog only — no roadmap / Soon placeholders (avoids soft-404 signals). */
export const WORKSTATION_DOMAINS: WorkstationDomain[] = [
  {
    id: "piping",
    label: "Piping",
    icon: "⚙",
    filterIds: ["piping"],
    tools: [
      {
        id: "pipe-wall-thickness",
        title: "ASME B31.3 Pipe Thickness",
        seoLabel: "ASME B31.3 Process Piping Minimum Wall Thickness Calculator",
        standard: "B31.3",
        href: buildCalculatorHref("pipe-wall-thickness", {
          size: DEMO.size,
          pressure: DEMO.pressure,
        }),
        keywords: ["b31.3", "wall", "thickness", "tmin", "pipe"],
      },
      {
        id: "pipe-schedule-dimension",
        title: "Pipe Schedule & Dimension",
        seoLabel: "ASME B36.10M Pipe Schedule OD ID Wall Thickness Lookup",
        standard: "B36.10M",
        href: buildCalculatorHref("pipe-schedule-dimension", {
          size: DEMO.size,
          schedule: DEMO.schedule,
        }),
        keywords: ["b36.10", "schedule", "od", "id", "nps"],
      },
      {
        id: "flange-dimension-weight",
        title: "Flange Dimension & Weight",
        seoLabel: "ASME B16.5 Flange Weight & Dimension Lookup",
        standard: "B16.5 / B16.47",
        href: buildCalculatorHref("flange-dimension-weight", {
          size: DEMO.size,
          class_rating: DEMO.class_rating,
        }),
        keywords: ["b16.5", "b16.47", "flange", "pcd", "bolt"],
      },
      {
        id: "thermal-expansion-loop",
        title: "Thermal Expansion & Anchor",
        seoLabel: "ASME B31.3 Piping Thermal Expansion and Anchor Load Calculator",
        standard: "B31.3",
        href: "/calculator/thermal-expansion-loop",
        keywords: ["thermal", "expansion", "anchor", "cpvc", "steam", "loop"],
      },
      {
        id: "pressure-drop-friction",
        title: "Pressure Drop & Friction",
        seoLabel: "Darcy-Weisbach Pipe Pressure Drop and Friction Loss Calculator",
        standard: "Darcy",
        href: "/calculator/pressure-drop-friction",
        keywords: ["pressure drop", "friction", "darcy", "haaland"],
      },
      {
        id: "flow-velocity-erosion",
        title: "Flow Velocity & Erosion",
        seoLabel: "API RP 14E Pipe Flow Velocity and Erosion Limit Calculator",
        standard: "API 14E",
        href: "/calculator/flow-velocity-erosion",
        keywords: ["velocity", "erosion", "api 14e"],
      },
      {
        id: "pipe-coping-branch-cut-layout",
        title: "Pipe Coping & Branch Cut",
        seoLabel:
          "Pipe Coping & Branch Cut Layout Calculator (Header/Branch Intersect)",
        standard: "B31.3 / PIP",
        href: "/calculator/pipe-coping-branch-cut-layout/4-on-6-sch-40-90deg",
        keywords: [
          "pipe coping",
          "branch cut",
          "set-on",
          "template",
          "ordinate",
          "miter",
        ],
      },
      {
        id: "pneumatic-test-safety-distance",
        title: "Pneumatic Test Safety Distance",
        seoLabel:
          "ASME PCC-2 Article 501 Pneumatic Test Safety Distance Calculator",
        standard: "PCC-2 Art. 501",
        href: "/calculator/pneumatic-test-safety-distance/10-bar-2-m3",
        keywords: [
          "pneumatic test",
          "safety distance",
          "pcc-2",
          "asme calculator",
          "exclusion zone",
        ],
      },
    ],
  },
  {
    id: "mechanical",
    label: "Mechanical",
    icon: "🔧",
    filterIds: ["mechanical"],
    tools: [
      {
        id: "valve-cv-sizing",
        title: "Valve Cv Sizing",
        seoLabel: "ISA 75.01 / IEC 60534 Control Valve Cv Sizing Calculator",
        standard: "ISA 75.01",
        href: "/calculator/valve-cv-sizing",
        keywords: ["cv", "control valve", "isa", "iec 60534"],
      },
      {
        id: "pump-npsh-cavitation",
        title: "Pump NPSH & Cavitation",
        seoLabel:
          "Pump NPSHa NPSHr Cavitation Margin Calculator (HI 9.6.1 / ASME B73.1 / API 610)",
        standard: "HI 9.6.1",
        href: "/calculator/pump-npsh-cavitation/water-20c-flooded-2m",
        keywords: [
          "npsh",
          "npsha",
          "npshr",
          "cavitation",
          "pump suction",
          "centrifugal pump",
          "hi 9.6.1",
          "api 610",
          "asme b73.1",
        ],
      },
      {
        id: "bolt-torque-tensioning",
        title: "Bolt Torque & Tensioning",
        seoLabel: "ASME PCC-1 Flange Bolt Torque and Tensioning Calculator",
        standard: "PCC-1",
        href: buildCalculatorHref("bolt-torque-tensioning", {
          size: DEMO.size,
          class_rating: DEMO.class_rating,
        }),
        keywords: ["torque", "pcc-1", "stud", "tension"],
      },
      {
        id: "flange-bolt-tightening-sequence",
        title: "Bolt Tightening Sequence",
        seoLabel:
          "Flange Bolt Tightening Sequence & Star Pattern Generator (ASME PCC-1)",
        standard: "PCC-1",
        href: "/calculator/flange-bolt-tightening-sequence/8-bolt-star",
        keywords: ["star pattern", "bolt sequence", "pcc-1", "8 bolt"],
      },
      {
        id: "blind-flange-thickness",
        title: "Blind Flange Thickness",
        seoLabel: "ASME VIII-1 UG-34 Blind Flange Thickness Calculator",
        standard: "UG-34",
        href: "/calculator/blind-flange-thickness",
        keywords: ["blind", "ug-34", "cover"],
      },
    ],
  },
  {
    id: "gaskets",
    label: "Gaskets & Seals",
    icon: "○",
    filterIds: ["piping", "mechanical"],
    tools: [
      {
        id: "gasket-spiral",
        title: "Spiral Wound & RTJ Lookup",
        seoLabel: "ASME B16.20 Spiral-Wound and RTJ Ring Gasket Dimension Lookup",
        standard: "B16.20",
        href: buildCalculatorHref("gasket-dimension-selection", {
          size: DEMO.size,
          class_rating: DEMO.class_rating,
        }),
        keywords: ["b16.20", "gasket", "spiral", "rtj", "ring"],
      },
      {
        id: "link-seal-penetration-sleeve",
        title: "Link-Seal & Penetration Sleeve",
        seoLabel:
          "Link-Seal Modular Seal & Pipe Penetration Sleeve Sizing Calculator",
        standard: "GPT Link-Seal",
        href: buildCalculatorHref("link-seal-penetration-sleeve", {
          size: DEMO.size,
        }),
        keywords: [
          "link seal",
          "link-seal",
          "penetration",
          "sleeve",
          "modular seal",
          "annular",
          "wall sleeve",
        ],
      },
    ],
  },
  {
    id: "valves-fittings",
    label: "Valves & Fittings",
    icon: "⬡",
    filterIds: ["piping"],
    tools: [
      {
        id: "fitting-valve-dimension",
        title: "Fitting & Valve Face-to-Face",
        seoLabel:
          "ASME B16.10 Valve Face-to-Face & B16.9 Elbow/Tee Center-to-End Lookup",
        standard: "B16.10 / B16.9",
        href: buildCalculatorHref(
          "fitting-valve-dimension",
          { size: DEMO.size, class_rating: DEMO.class_rating },
          { component: "gate_valve" },
        ),
        keywords: [
          "b16.10",
          "b16.9",
          "face-to-face",
          "ftf",
          "valve",
          "elbow",
          "tee",
          "center-to-end",
          "fitting",
        ],
      },
      {
        id: "fitting-bw",
        title: "Butt-Weld Fitting Dimensions",
        seoLabel:
          "ASME B16.9 Butt-Weld Elbow Tee Reducer Cap Dimension Lookup",
        standard: "B16.9",
        href: buildCalculatorHref(
          "butt-weld-fitting-dimension",
          { size: DEMO.size, schedule: "40" },
          { component: "elbow_90_lr" },
        ),
        keywords: [
          "b16.9",
          "elbow",
          "tee",
          "reducer",
          "cap",
          "butt-weld",
          "center-to-end",
          "fitting",
        ],
      },
    ],
  },
  {
    id: "procurement",
    label: "Procurement & Cost",
    icon: "▣",
    filterIds: ["procurement"],
    tools: [
      {
        id: "metal-weight-cost",
        title: "Pipe & Metal Weight Estimator",
        seoLabel: "Pipe and Metal Weight Estimator for Procurement MTO",
        standard: "MTO",
        href: buildCalculatorHref("metal-weight-cost", {
          size: DEMO.size,
          schedule: DEMO.schedule,
          material: DEMO.material,
        }),
        keywords: ["weight", "cost", "mto", "procurement"],
      },
      {
        id: "stainless-alloy-weight-density",
        title: "SS & Alloy Weight / Density",
        seoLabel:
          "Stainless Steel & Special Alloy Weight & Density Calculator",
        standard: "Catalog ρ",
        href: "/calculator/stainless-alloy-weight-density/ss316",
        keywords: [
          "ss316",
          "ss304",
          "duplex",
          "inconel",
          "density",
          "plate weight",
          "hastelloy",
        ],
      },
      {
        id: "unit-converter",
        title: "Engineering Unit Converter",
        seoLabel: "ISO 80000-1 Engineering Unit Converter for Plant Design",
        standard: "ISO 80000-1",
        href: "/calculator/unit-converter",
        keywords: ["unit", "converter", "psi", "bar", "mm"],
      },
    ],
  },
  {
    id: "inspection",
    label: "Inspection & QA",
    icon: "◇",
    filterIds: ["inspection"],
    tools: [
      {
        id: "hydro-test-pressure",
        title: "Hydro / Pneumatic Test Pressure",
        seoLabel: "API 570 / ASME B31.3 Hydrotest and Pneumatic Test Pressure Calculator",
        standard: "API 570 / B31.3",
        href: buildCalculatorHref("hydro-test-pressure", {
          size: DEMO.size,
          pressure: DEMO.pressure,
        }),
        keywords: ["hydrotest", "pneumatic", "api 570", "st/s"],
      },
    ],
  },
];

/** Fixed 2×3 dashboard order — prevents orphaned last-row cards. */
export const WORKSTATION_GRID_ORDER = [
  "piping",
  "mechanical",
  "procurement",
  "valves-fittings",
  "gaskets",
  "inspection",
] as const;

export function orderedWorkstationDomains(
  domains: WorkstationDomain[] = WORKSTATION_DOMAINS,
): WorkstationDomain[] {
  const byId = new Map(domains.map((domain) => [domain.id, domain]));
  return WORKSTATION_GRID_ORDER.map((id) => byId.get(id)).filter(
    (domain): domain is WorkstationDomain => Boolean(domain),
  );
}

export const WORKSTATION_DOMAIN_TABS = [
  { id: "all", label: "All" },
  ...orderedWorkstationDomains().map((domain) => ({
    id: domain.id,
    label: domain.label,
  })),
] as const;

export type SearchHit = {
  id: string;
  title: string;
  standard: string;
  href: string;
  domain: string;
  seoLabel: string;
  score: number;
};

export function buildWorkstationSearchIndex(): Omit<SearchHit, "score">[] {
  const hits: Omit<SearchHit, "score">[] = [];
  for (const domain of WORKSTATION_DOMAINS) {
    for (const tool of domain.tools) {
      hits.push({
        id: tool.id,
        title: tool.title,
        standard: tool.standard,
        href: tool.href,
        domain: domain.label,
        seoLabel: tool.seoLabel,
      });
    }
  }
  return hits;
}

export function searchWorkstationTools(query: string, limit = 8): SearchHit[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const index = buildWorkstationSearchIndex();
  const results: SearchHit[] = [];

  for (const item of index) {
    const domain = WORKSTATION_DOMAINS.find((d) => d.label === item.domain);
    const tool = domain?.tools.find((t) => t.id === item.id);
    const haystack = [
      item.title,
      item.seoLabel,
      item.standard,
      item.domain,
      item.id,
      ...(tool?.keywords ?? []),
    ]
      .join(" ")
      .toLowerCase();

    let score = 0;
    let matched = true;
    for (const term of terms) {
      if (!haystack.includes(term)) {
        matched = false;
        break;
      }
      score += haystack.startsWith(term) ? 4 : haystack.includes(` ${term}`) ? 2 : 1;
      if (item.standard.toLowerCase().includes(term)) score += 3;
    }
    if (matched) results.push({ ...item, score });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
