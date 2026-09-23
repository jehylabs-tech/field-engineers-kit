/**
 * Olet Fitting Dimensions — MSS SP-97 lookup + B31.3 branch t_b screening.
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  B31_3_Y_FERRITIC,
} from "@/lib/calculators/engines/pipe-thickness";
import {
  defaultRatingForType,
  findOletDimensionRow,
  isRunSizeCompatible,
  normalizeOletRating,
  oletInToMm,
  oletLbToKg,
  type OletRating,
  type OletType,
} from "@/lib/calculators/data/oletDimensionsMssSp97";
import { getPipeScheduleEntry } from "@/lib/data/loaders";
import { formatLength, formatWeight } from "@/utils/unitConverter";

export type OletMaterialId = "A105" | "A182-F316";

export type OletFittingDimensionsInputs = {
  unitSystem: UnitSystem;
  oletType: OletType;
  runNps: string;
  branchNps: string;
  rating: string;
  designPressure: number;
  designTemperature: number;
  material: OletMaterialId;
};

export const OLET_TYPE_OPTIONS: { value: OletType; label: string }[] = [
  { value: "weldolet", label: "Weldolet (BW)" },
  { value: "sockolet", label: "Sockolet (SW)" },
  { value: "threadolet", label: "Threadolet (NPT)" },
];

export const OLET_MATERIAL_OPTIONS: {
  value: OletMaterialId;
  label: string;
  stressMpa: number;
}[] = [
  {
    value: "A105",
    label: "ASTM A105 (CS forging)",
    stressMpa: 138,
  },
  {
    value: "A182-F316",
    label: "ASTM A182 F316 (SS forging)",
    stressMpa: 115,
  },
];

export const PRESSURE_RANGE_MPA = { min: 0, max: 50 } as const;
export const TEMP_RANGE_C = { min: -50, max: 500 } as const;

export const DEFAULT_OLET_FITTING_DIMENSIONS_INPUTS: OletFittingDimensionsInputs =
  {
    unitSystem: "metric",
    oletType: "weldolet",
    runNps: "6",
    branchNps: "2",
    rating: "STD",
    designPressure: 2.0,
    designTemperature: 150,
    material: "A105",
  };

export const DEFAULT_OLET_FITTING_DIMENSIONS_INPUTS_IMPERIAL: OletFittingDimensionsInputs =
  {
    unitSystem: "imperial",
    oletType: "weldolet",
    runNps: "12",
    branchNps: "4",
    rating: "XS",
    designPressure: 290, // ≈ 2.0 MPa
    designTemperature: 302, // ≈ 150 °C
    material: "A105",
  };

const MPA_TO_PSI = 145.0377;

function materialStressMpa(id: OletMaterialId): number {
  return (
    OLET_MATERIAL_OPTIONS.find((m) => m.value === id)?.stressMpa ?? 138
  );
}

/** Map Weldolet rating → B36 schedule token for outlet OD lookup. */
export function scheduleTokenForWeldoletRating(rating: OletRating): string {
  if (rating === "XS") return "80";
  if (rating === "160") return "160";
  return "40";
}

/**
 * ASME B31.3 §304.1.2 design thickness for the branch/outlet (screening).
 * t = P·D / (2(SEW + PY)) with W = 1, E = 1, Y = 0.4 (ferritic screening).
 * P and S in consistent units; D = outside diameter.
 */
export function branchDesignThickness(
  pressure: number,
  outsideDiameter: number,
  allowableStress: number,
  y = B31_3_Y_FERRITIC,
  e = 1,
  w = 1,
): number {
  if (!(pressure > 0) || !(outsideDiameter > 0) || !(allowableStress > 0)) {
    return NaN;
  }
  const den = 2 * (allowableStress * e * w + pressure * y);
  if (!(den > 0)) return NaN;
  return (pressure * outsideDiameter) / den;
}

export type OletFittingComputed = {
  invalid: boolean;
  warn?: string;
  oletType: OletType;
  rating: OletRating | null;
  runCompatible: boolean;
  A_mm: number;
  B_mm: number;
  bore_mm: number;
  dHole_mm: number;
  J_mm: number | null;
  weight_kg: number;
  endPrep: string;
  runMinNps: string;
  runMaxNps: string;
  /** Branch design thickness t_b (mm), screening. */
  tb_mm: number;
  Dob_mm: number;
};

export function computeOletFittingDimensions(
  inputs: OletFittingDimensionsInputs,
): OletFittingComputed {
  const rating = normalizeOletRating(inputs.oletType, inputs.rating);
  const empty = (reason: string): OletFittingComputed => ({
    invalid: true,
    warn: reason,
    oletType: inputs.oletType,
    rating,
    runCompatible: false,
    A_mm: NaN,
    B_mm: NaN,
    bore_mm: NaN,
    dHole_mm: NaN,
    J_mm: null,
    weight_kg: NaN,
    endPrep: "—",
    runMinNps: "—",
    runMaxNps: "—",
    tb_mm: NaN,
    Dob_mm: NaN,
  });

  if (!rating) {
    return empty(
      inputs.oletType === "weldolet"
        ? "Select STD, XS, or Sch 160 for Weldolet"
        : "Select Class 3000 or 6000 for Sockolet / Threadolet",
    );
  }

  const row = findOletDimensionRow(inputs.oletType, rating, inputs.branchNps);
  if (!row) {
    return empty("No MSS SP-97 screening row for this outlet size / rating");
  }

  const runCompatible = isRunSizeCompatible(row, inputs.runNps);

  const sch =
    inputs.oletType === "weldolet"
      ? scheduleTokenForWeldoletRating(rating)
      : "40";
  const pipe = getPipeScheduleEntry(inputs.branchNps, sch);
  const Dob_mm = pipe?.pipe.outsideDiameterMm ?? oletInToMm(row.bore_in + 0.2);

  const imperial = inputs.unitSystem === "imperial";
  const P_mpa = imperial
    ? inputs.designPressure / MPA_TO_PSI
    : inputs.designPressure;
  const S_mpa = materialStressMpa(inputs.material);
  const tb_mm = branchDesignThickness(P_mpa, Dob_mm, S_mpa);

  return {
    invalid: false,
    oletType: inputs.oletType,
    rating,
    runCompatible,
    A_mm: oletInToMm(row.A_in),
    B_mm: oletInToMm(row.B_in),
    bore_mm: oletInToMm(row.bore_in),
    dHole_mm: oletInToMm(row.dHole_in),
    J_mm: row.J_in != null ? oletInToMm(row.J_in) : null,
    weight_kg: oletLbToKg(row.weight_lb),
    endPrep: row.endPrep,
    runMinNps: row.runMinNps,
    runMaxNps: row.runMaxNps,
    tb_mm,
    Dob_mm,
  };
}

function fmtLen(mm: number, us: UnitSystem, digits = 1): string {
  if (!Number.isFinite(mm)) return "—";
  return formatLength(mm, us, digits);
}

export function calculateOletFittingDimensions(
  inputs: OletFittingDimensionsInputs,
): CalculatorOutput {
  const c = computeOletFittingDimensions(inputs);
  const us = inputs.unitSystem;

  if (c.invalid) {
    return {
      heroLabel: "Outlet height A",
      heroValue: "—",
      heroStatus: c.warn ?? "Invalid inputs",
      heroStatusLevel: "warn",
      summary: [
        { label: "MSS SP-97 match", value: "—" },
        { label: "Weight", value: "—" },
      ],
      summaryStatus: { label: c.warn ?? "No match", level: "warn" },
      rows: [],
      exportRows: [],
      callouts: [
        {
          tone: "warn",
          title: "Lookup failed",
          body: c.warn ?? "Adjust olet type, rating, or outlet NPS.",
        },
      ],
    };
  }

  const A = fmtLen(c.A_mm, us, us === "imperial" ? 2 : 1);
  const B = fmtLen(c.B_mm, us, us === "imperial" ? 2 : 1);
  const dHole = fmtLen(c.dHole_mm, us, us === "imperial" ? 2 : 1);
  const bore = fmtLen(c.bore_mm, us, us === "imperial" ? 2 : 1);
  const J =
    c.J_mm != null ? fmtLen(c.J_mm, us, us === "imperial" ? 2 : 1) : null;
  const weight = formatWeight(c.weight_kg, us);
  const tb = fmtLen(c.tb_mm, us, 2);

  const matchLabel = c.runCompatible
    ? `Pass · NPS ${c.runMinNps}–${c.runMaxNps}`
    : `Fail · need NPS ${c.runMinNps}–${c.runMaxNps}`;

  const typeLabel =
    inputs.oletType === "weldolet"
      ? "Weldolet"
      : inputs.oletType === "sockolet"
        ? "Sockolet"
        : "Threadolet";

  // Lean rows: A is hero — do not repeat. Keep ≤4 field dims.
  const rows: ResultRow[] = [
    {
      section: "MSS SP-97 dimensions",
      label: "Header cutout (d_hole)",
      value: dHole,
      highlight: "d_hole",
      emphasis: true,
    },
    {
      section: "MSS SP-97 dimensions",
      label: "Base diameter (B)",
      value: B,
      highlight: "B",
      emphasis: true,
    },
    {
      section: "MSS SP-97 dimensions",
      label: "Branch bore (d_i)",
      value: bore,
      highlight: "d_i",
    },
  ];
  if (J != null) {
    rows.push({
      section: "MSS SP-97 dimensions",
      label: "Socket depth (J)",
      value: J,
      highlight: "J",
      emphasis: true,
    });
  }

  const callouts: ResultCallout[] = [];
  if (!c.runCompatible) {
    callouts.push({
      tone: "warn",
      title: "Run size outside consolidated range",
      body: `Header NPS ${inputs.runNps} is outside screening range ${c.runMinNps}–${c.runMaxNps}. Confirm size-on-size / OEM specials before ordering.`,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Screening lookup — not pad reinforcement",
      body: "MSS SP-97 envelopes only. For high-pressure or large branches, also run Pipe Branch Reinforcement (B31.3 §304.3.2).",
    });
  }

  const heroBadges =
    J != null
      ? [
          { label: "Base B", value: B },
          { label: "Socket J", value: J },
        ]
      : [
          { label: "Base B", value: B },
          { label: "Cutout", value: dHole },
        ];

  return {
    heroLabel: "Outlet height A",
    heroValue: A,
    heroStatus: `${typeLabel} · ${c.rating} · ${c.endPrep}`,
    heroStatusLevel: c.runCompatible ? "pass" : "warn",
    heroBadges,
    summary: [
      { label: "Run match", value: matchLabel },
      { label: "Weight", value: weight },
    ],
    summaryStatus: {
      label: c.runCompatible
        ? "MSS SP-97 run size · Pass"
        : "MSS SP-97 run size · Fail",
      level: c.runCompatible ? "pass" : "warn",
    },
    rows,
    exportRows: [
      { label: "Standard", value: "MSS SP-97" },
      { label: "Olet type", value: typeLabel },
      { label: "Rating", value: String(c.rating) },
      { label: "Run NPS", value: inputs.runNps },
      { label: "Outlet NPS", value: inputs.branchNps },
      { label: "Height A", value: A },
      { label: "Base B", value: B },
      { label: "Cutout d_hole", value: dHole },
      { label: "Branch ID d_i", value: bore },
      ...(J != null ? [{ label: "Socket depth J", value: J }] : []),
      { label: "Weight", value: weight },
      { label: "End prep", value: c.endPrep },
      {
        label: "Run range",
        value: `${c.runMinNps}–${c.runMaxNps}`,
      },
      {
        label: "Run match",
        value: c.runCompatible ? "Pass" : "Fail",
      },
      {
        label: "Branch t_b (B31.3 screening)",
        value: tb,
      },
      {
        label: "Outlet OD D_ob",
        value: fmtLen(c.Dob_mm, us, 2),
      },
      { label: "Material", value: inputs.material },
    ],
    callouts,
  };
}

export function ratingsForOletType(oletType: OletType): OletRating[] {
  return oletType === "weldolet" ? ["STD", "XS", "160"] : ["3000", "6000"];
}

export { defaultRatingForType, normalizeOletRating };
export type { OletType, OletRating };
