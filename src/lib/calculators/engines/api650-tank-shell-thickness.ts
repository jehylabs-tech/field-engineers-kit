/**
 * API 650 Section 5.6.3 — Calculation by 1-Foot Method (shell course thickness).
 *
 *   Metric:  t_t = 4.9 D (H−0.3)/S_t + CA
 *            t_d = 4.9 D (H−0.3) G /(S_d E) + CA
 *   Imperial: t_t = 2.6 D (H−1)/S_t + CA
 *             t_d = 2.6 D (H−1) G /(S_d E) + CA
 *
 * H = height from bottom of the course under consideration to design liquid level.
 * t_required = max(t_d, t_t, t_min,API); t_nom = CeilToCommercialPlate(t_required).
 *
 * Screening only — not a substitute for Variable-Design-Point (5.6.4), wind/seismic
 * girders, or the project API 650 edition annexes.
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  getApi650Material,
  type Api650MaterialId,
} from "@/lib/calculators/data/api650Materials";
import {
  ceilToCommercialPlateIn,
  ceilToCommercialPlateMm,
} from "@/lib/calculators/data/commercialPlateSizes";
import { ftToM, inToMm, mmToIn, mToFt } from "@/lib/unitConverter";

export type Api650JointEfficiency = 1 | 0.85 | 0.7;

export type Api650TankShellThicknessInputs = {
  unitSystem: UnitSystem;
  /** Tank inner diameter D — m or ft. */
  tankDiameter: number;
  /** Design liquid height H (from bottom) — m or ft. */
  tankHeight: number;
  /** Shell course height — m or ft. */
  courseHeight: number;
  /** Design specific gravity G. */
  specificGravity: number;
  materialGrade: Api650MaterialId;
  jointEfficiency: Api650JointEfficiency;
  /** Corrosion allowance CA — mm or in. */
  corrosionAllowance: number;
};

export const D_RANGE_M = { min: 3, max: 100 } as const;
export const D_RANGE_FT = { min: 10, max: 330 } as const;
export const H_RANGE_M = { min: 2, max: 30 } as const;
export const H_RANGE_FT = { min: 6, max: 100 } as const;
export const COURSE_RANGE_M = { min: 1.5, max: 3 } as const;
export const COURSE_RANGE_FT = { min: 5, max: 10 } as const;
export const G_RANGE = { min: 0.6, max: 1.5 } as const;
export const CA_RANGE_MM = { min: 0, max: 10 } as const;
export const CA_RANGE_IN = { min: 0, max: 0.4 } as const;

/** API 650 §5.6.3 diameter screen for 1-foot method. */
export const ONE_FOOT_D_LIMIT_M = 60;
export const ONE_FOOT_D_LIMIT_FT = 200;

const STEEL_DENSITY_KG_M3 = 7850;
const KG_TO_LB = 2.20462262;

export const DEFAULT_API650_TANK_SHELL_THICKNESS_INPUTS: Api650TankShellThicknessInputs =
  {
    unitSystem: "metric",
    tankDiameter: 20,
    tankHeight: 15,
    courseHeight: 2.5,
    specificGravity: 0.85,
    materialGrade: "A36",
    jointEfficiency: 0.85,
    corrosionAllowance: 2,
  };

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * API 650 Table 5.2a / 5.2b minimum shell thickness by nominal diameter.
 * Returns mm.
 */
export function api650MinShellThicknessMm(diameterM: number): number {
  if (!(diameterM > 0)) return 5;
  if (diameterM < 15) return 5;
  if (diameterM < 36) return 6;
  if (diameterM <= 60) return 8;
  return 10;
}

export type Api650CourseResult = {
  course: number;
  /** Liquid height above course bottom — m. */
  hM: number;
  tdMm: number;
  ttMm: number;
  tMinMm: number;
  tRequiredMm: number;
  tNomMm: number;
  /** Course plate mass — kg. */
  massKg: number;
  governedBy: "td" | "tt" | "tmin";
};

export type Api650TankShellThicknessComputed = {
  invalid: boolean;
  invalidReason?: string;
  diameterM: number;
  heightM: number;
  courseHeightM: number;
  g: number;
  e: number;
  caMm: number;
  sdMpa: number;
  stMpa: number;
  materialGrade: Api650MaterialId;
  tMinMm: number;
  courseCount: number;
  courses: Api650CourseResult[];
  bottom: Api650CourseResult | null;
  totalMassKg: number;
  diameterOverLimit: boolean;
  tminUplift: boolean;
};

function courseThicknessMetric(
  dM: number,
  hM: number,
  g: number,
  e: number,
  sdMpa: number,
  stMpa: number,
  caMm: number,
  tMinMm: number,
): Omit<Api650CourseResult, "course" | "massKg"> {
  const hEff = Math.max(0, hM - 0.3);
  const tdMm = (4.9 * dM * hEff * g) / (sdMpa * e) + caMm;
  const ttMm = (4.9 * dM * hEff) / stMpa + caMm;
  const tRequiredMm = Math.max(tdMm, ttMm, tMinMm);
  let governedBy: "td" | "tt" | "tmin" = "td";
  if (tRequiredMm === tMinMm || (tMinMm >= tdMm && tMinMm >= ttMm)) {
    governedBy = "tmin";
  } else if (ttMm >= tdMm) {
    governedBy = "tt";
  }
  const tNomMm = ceilToCommercialPlateMm(tRequiredMm);
  return {
    hM,
    tdMm,
    ttMm,
    tMinMm,
    tRequiredMm,
    tNomMm,
    governedBy,
  };
}

export function computeApi650TankShellThickness(
  inputs: Api650TankShellThicknessInputs,
): Api650TankShellThicknessComputed {
  const imperial = inputs.unitSystem === "imperial";
  const diameterM = imperial ? ftToM(inputs.tankDiameter) : inputs.tankDiameter;
  const heightM = imperial ? ftToM(inputs.tankHeight) : inputs.tankHeight;
  const courseHeightM = imperial
    ? ftToM(inputs.courseHeight)
    : inputs.courseHeight;
  const caMm = imperial
    ? inToMm(inputs.corrosionAllowance)
    : inputs.corrosionAllowance;
  const g = clamp(inputs.specificGravity, G_RANGE.min, G_RANGE.max);
  const e = inputs.jointEfficiency;
  const mat = getApi650Material(inputs.materialGrade);

  const empty = (reason: string): Api650TankShellThicknessComputed => ({
    invalid: true,
    invalidReason: reason,
    diameterM,
    heightM,
    courseHeightM,
    g,
    e,
    caMm,
    sdMpa: mat.sdMpa,
    stMpa: mat.stMpa,
    materialGrade: inputs.materialGrade,
    tMinMm: NaN,
    courseCount: 0,
    courses: [],
    bottom: null,
    totalMassKg: NaN,
    diameterOverLimit: false,
    tminUplift: false,
  });

  if (
    !(diameterM >= D_RANGE_M.min) ||
    !(diameterM <= D_RANGE_M.max)
  ) {
    return empty("Tank diameter out of screening range");
  }
  if (!(heightM >= H_RANGE_M.min) || !(heightM <= H_RANGE_M.max)) {
    return empty("Design liquid height out of screening range");
  }
  if (
    !(courseHeightM >= COURSE_RANGE_M.min) ||
    !(courseHeightM <= COURSE_RANGE_M.max)
  ) {
    return empty("Course height out of screening range");
  }
  if (!(courseHeightM <= heightM)) {
    return empty("Course height must not exceed design liquid height");
  }
  if (!(e > 0) || !(e <= 1)) {
    return empty("Joint efficiency must be 0.70, 0.85, or 1.0");
  }
  if (!(caMm >= CA_RANGE_MM.min) || !(caMm <= CA_RANGE_MM.max)) {
    return empty("Corrosion allowance out of screening range");
  }

  const tMinMm = api650MinShellThicknessMm(diameterM);
  const courseCount = Math.max(1, Math.ceil(heightM / courseHeightM - 1e-9));
  const courses: Api650CourseResult[] = [];
  let tminUplift = false;

  for (let i = 0; i < courseCount; i++) {
    const hM = heightM - i * courseHeightM;
    if (hM <= 0) break;
    const courseH = Math.min(courseHeightM, hM);
    const raw = courseThicknessMetric(
      diameterM,
      hM,
      g,
      e,
      mat.sdMpa,
      mat.stMpa,
      caMm,
      tMinMm,
    );
    if (raw.tRequiredMm === tMinMm && (raw.tdMm < tMinMm || raw.ttMm < tMinMm)) {
      tminUplift = true;
    }
    // Plate mass: π · D · h_course · t_nom · ρ (inside-D screening)
    const massKg =
      Math.PI * diameterM * courseH * (raw.tNomMm / 1000) * STEEL_DENSITY_KG_M3;
    courses.push({
      course: i + 1,
      ...raw,
      massKg,
    });
  }

  const totalMassKg = courses.reduce((s, c) => s + c.massKg, 0);
  const bottom = courses[0] ?? null;

  return {
    invalid: false,
    diameterM,
    heightM,
    courseHeightM,
    g,
    e,
    caMm,
    sdMpa: mat.sdMpa,
    stMpa: mat.stMpa,
    materialGrade: inputs.materialGrade,
    tMinMm,
    courseCount: courses.length,
    courses,
    bottom,
    totalMassKg,
    diameterOverLimit: diameterM > ONE_FOOT_D_LIMIT_M,
    tminUplift,
  };
}

function fmtThick(mm: number, imperial: boolean): string {
  if (imperial) {
    return `${mmToIn(mm).toFixed(3)} in`;
  }
  return mm >= 10 ? `${mm.toFixed(1)} mm` : `${mm.toFixed(2)} mm`;
}

function fmtNomFromRequired(tRequiredMm: number, imperial: boolean): string {
  if (imperial) {
    const stock = ceilToCommercialPlateIn(mmToIn(tRequiredMm));
    return `${stock.toFixed(3)} in`;
  }
  return `${ceilToCommercialPlateMm(tRequiredMm)} mm`;
}

function fmtWeight(kg: number, imperial: boolean): string {
  if (imperial) {
    const lb = kg * KG_TO_LB;
    return lb >= 1000
      ? `${Math.round(lb).toLocaleString("en-US")} lb`
      : `${lb.toFixed(0)} lb`;
  }
  const ton = kg / 1000;
  return ton >= 10 ? `${ton.toFixed(1)} t` : `${ton.toFixed(2)} t`;
}

export function calculateApi650TankShellThickness(
  inputs: Api650TankShellThicknessInputs,
): CalculatorOutput {
  const c = computeApi650TankShellThickness(inputs);
  const imperial = inputs.unitSystem === "imperial";

  if (c.invalid || !c.bottom) {
    return {
      heroLabel: "Bottom course t_nom · Shell weight",
      heroValue: "—",
      heroStatus: c.invalidReason ?? "Enter tank diameter, height, and material",
      heroStatusLevel: "neutral",
      summary: [],
      summaryStatus: { label: "Incomplete", level: "neutral" },
      rows: [],
      callouts: [
        {
          tone: "info",
          title: "API 650 1-foot method screening",
          body: "Enter tank diameter D, design liquid height H, course height, specific gravity, plate material, joint efficiency E, and corrosion allowance.",
        },
      ],
      exportRows: [],
    };
  }

  const b = c.bottom;
  const tNomDisp = fmtNomFromRequired(b.tRequiredMm, imperial);
  const tNomAlt = fmtNomFromRequired(b.tRequiredMm, !imperial);

  let heroStatusLevel: StatusLevel = "pass";
  let heroStatus = "Screening OK";
  if (c.diameterOverLimit) {
    heroStatusLevel = "warn";
    heroStatus = `D > ${ONE_FOOT_D_LIMIT_M} m — use Variable-Design-Point`;
  }

  const callouts: ResultCallout[] = [];
  if (c.diameterOverLimit) {
    callouts.push({
      tone: "warn",
      title: "1-Foot Method Diameter Limit",
      body: `Tank diameter D ≈ ${imperial ? `${mToFt(c.diameterM).toFixed(0)} ft` : `${c.diameterM.toFixed(1)} m`} exceeds the API 650 §5.6.3 screen (60 m / 200 ft). Apply the Variable-Design-Point Method (§5.6.4) for final design.`,
    });
  } else if (c.tminUplift) {
    callouts.push({
      tone: "warn",
      title: "API 650 Minimum Thickness Applied",
      body: `One or more courses are governed by Table 5.2a/5.2b minimum shell thickness t_min = ${fmtThick(c.tMinMm, imperial)}. Calculated t_d / t_t below this floor are raised to t_min before commercial plate selection.`,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Wind & Seismic Buckling Notice",
      body: "This engine sizes shell courses for product and hydrostatic head (1-foot method). Intermediate wind girders and seismic buckling are out of scope — confirm separately per API 650.",
    });
  }

  const rows: ResultRow[] = [
    {
      section: "Bottom course",
      label: "Design thickness t_d",
      value: fmtThick(b.tdMm, imperial),
      emphasis: true,
    },
    {
      section: "Bottom course",
      label: "Hydrotest thickness t_t",
      value: fmtThick(b.ttMm, imperial),
    },
    {
      section: "Code floor",
      label: "API 650 t_min",
      value: fmtThick(c.tMinMm, imperial),
    },
    {
      section: "Shell",
      label: "Courses · plate mass",
      value: `${c.courseCount} · ${fmtWeight(c.totalMassKg, imperial)}`,
    },
  ];

  const exportRows = [
    { label: "Bottom course t_nom", value: tNomDisp },
    { label: "Total shell mass", value: fmtWeight(c.totalMassKg, imperial) },
    { label: "Bottom t_d", value: fmtThick(b.tdMm, imperial) },
    { label: "Bottom t_t", value: fmtThick(b.ttMm, imperial) },
    { label: "API 650 t_min", value: fmtThick(c.tMinMm, imperial) },
    {
      label: "Diameter / height",
      value: imperial
        ? `${mToFt(c.diameterM).toFixed(1)} ft · ${mToFt(c.heightM).toFixed(1)} ft`
        : `${c.diameterM.toFixed(2)} m · ${c.heightM.toFixed(2)} m`,
    },
    {
      label: "Material",
      value: `${c.materialGrade} · S_d=${c.sdMpa} MPa · S_t=${c.stMpa} MPa`,
    },
    { label: "G / E / CA", value: `${c.g} / ${c.e} / ${fmtThick(c.caMm, false)}` },
    ...c.courses.map((course) => ({
      label: `Course ${course.course} t_nom`,
      value: `${fmtNomFromRequired(course.tRequiredMm, imperial)} (t_d=${fmtThick(course.tdMm, imperial)}, t_t=${fmtThick(course.ttMm, imperial)})`,
    })),
  ];

  return {
    heroLabel: "Bottom course t_nom · Shell weight",
    heroValue: `${tNomDisp} · ${fmtWeight(c.totalMassKg, imperial)}`,
    heroStatus,
    heroStatusLevel,
    heroBadges: [
      {
        label: "Also",
        value: `${tNomAlt} · ${fmtWeight(c.totalMassKg, !imperial)}`,
      },
      {
        label: "Governed",
        value:
          b.governedBy === "td"
            ? "t_d"
            : b.governedBy === "tt"
              ? "t_t"
              : "t_min",
      },
    ],
    summary: [
      { label: "Design t_d", value: fmtThick(b.tdMm, imperial) },
      { label: "Hydrotest t_t", value: fmtThick(b.ttMm, imperial) },
      { label: "API 650 t_min", value: fmtThick(c.tMinMm, imperial) },
    ],
    summaryStatus: { label: heroStatus, level: heroStatusLevel },
    rows,
    callouts,
    exportRows,
  };
}

export { STEEL_DENSITY_KG_M3, KG_TO_LB };
