import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import { getFlangeDimensionEntry, listFlangeNps } from "@/lib/data/loaders";

export type BlindDesignMode = "permanent" | "hydrotest";

export type BlindFlangeInputs = {
  unitSystem: UnitSystem;
  mode: BlindDesignMode;
  nps: string;
  pressureClass: string;
  insideDiameter: number; // Gasket contact diameter d (mm in metric, in in imperial)
  designPressure: number; // Pressure P / Pt (MPa in metric, psi in imperial)
  allowableStress: number; // Allowable stress S (MPa in metric, psi in imperial)
  weldEfficiency: number; // Joint efficiency E (default 1.0)
  corrosionAllowance: number; // Corrosion allowance c (mm in metric, in in imperial)
  materialId: string;
};

export type MaterialStressPreset = {
  id: string;
  label: string;
  description: string;
  ambientStressMpa: number;
  ambientStressPsi: number;
  designStressMpa: number;
  designStressPsi: number;
};

export const MATERIAL_STRESS_PRESETS: Record<string, MaterialStressPreset> = {
  a516_70: {
    id: "a516_70",
    label: "A516 Gr. 70 (Pressure Vessel CS)",
    description: "Standard PV plate, ASME II-D Table 1A",
    ambientStressMpa: 138.0,
    ambientStressPsi: 20000,
    designStressMpa: 125.0,
    designStressPsi: 18100,
  },
  a36: {
    id: "a36",
    label: "ASTM A36 / SS400 (Structural CS)",
    description: "Commonly used for temporary hydrotest blanks",
    ambientStressMpa: 115.0,
    ambientStressPsi: 16600,
    designStressMpa: 100.0,
    designStressPsi: 14500,
  },
  ss304: {
    id: "ss304",
    label: "ASTM A240 Gr. 304 (Austenitic SS)",
    description: "Corrosion resistant, cryogenic to elevated temp",
    ambientStressMpa: 138.0,
    ambientStressPsi: 20000,
    designStressMpa: 104.0,
    designStressPsi: 15100,
  },
  ss316: {
    id: "ss316",
    label: "ASTM A240 Gr. 316 (Moly SS)",
    description: "Marine & chemical resistance",
    ambientStressMpa: 138.0,
    ambientStressPsi: 20000,
    designStressMpa: 110.0,
    designStressPsi: 16000,
  },
  carbon_steel: {
    id: "carbon_steel",
    label: "Carbon Steel (Generic 138 MPa)",
    description: "Default carbon steel allowable stress",
    ambientStressMpa: 138.0,
    ambientStressPsi: 20000,
    designStressMpa: 138.0,
    designStressPsi: 20000,
  },
};

/** Dropdown label with active unit system stress first. */
export function formatBlindMaterialOption(
  preset: MaterialStressPreset,
  unitSystem: UnitSystem,
  mode: BlindDesignMode,
): string {
  const mpa =
    mode === "hydrotest" ? preset.ambientStressMpa : preset.designStressMpa;
  const psi =
    mode === "hydrotest" ? preset.ambientStressPsi : preset.designStressPsi;
  const ksi = Number((psi / 1000).toFixed(1));
  if (unitSystem === "imperial") {
    return `${preset.label} — ${ksi} ksi (${Math.round(mpa)} MPa)`;
  }
  return `${preset.label} — ${Math.round(mpa)} MPa (${ksi} ksi)`;
}

/** ASME VIII-1 UG-34 / B31.3 304.4.1 attachment factor for bolted flat covers. */
export const BLIND_FLANGE_C = 0.3;

/** Format length/corrosion for blind UI — keep imperial values to 3 dp (e.g. 0.125 in). */
export function formatBlindLength(
  value: number,
  unitSystem: UnitSystem,
  kind: "length" | "corrosion" = "length",
): string {
  if (!Number.isFinite(value)) return "—";
  if (unitSystem === "imperial") {
    return value.toFixed(3).replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
  }
  return kind === "corrosion" ? value.toFixed(1) : value.toFixed(2);
}

/**
 * ASME B16.5 Table 2-1.1 (Group 1.1 Carbon Steel e.g. A105 / A516-70) Max Working Pressure (bar).
 * Ambient (−29 to 38 °C) and elevated (~150 °C) for reference; hydro = 1.5 × ambient.
 * Single source of truth for warnings, matrix headers, and over-pressure checks.
 */
export const FLANGE_RATING_LIMITS: Record<
  string,
  { ambientBar: number; design150cBar: number; hydroTestBar: number }
> = {
  "150": { ambientBar: 19.6, design150cBar: 15.8, hydroTestBar: 29.3 },
  "300": { ambientBar: 51.1, design150cBar: 41.4, hydroTestBar: 77.1 },
  "600": { ambientBar: 102.1, design150cBar: 82.7, hydroTestBar: 153.2 },
  "900": { ambientBar: 153.2, design150cBar: 124.1, hydroTestBar: 230.1 },
  "1500": { ambientBar: 255.3, design150cBar: 206.8, hydroTestBar: 383.1 },
  "2500": { ambientBar: 425.5, design150cBar: 344.7, hydroTestBar: 638.5 },
};

const BAR_TO_PSI = 14.5037738;

/** Ambient working pressure (MPa) for permanent matrix / screening. */
export function flangeAmbientPressureMpa(pressureClass: string): number {
  const bar = FLANGE_RATING_LIMITS[pressureClass]?.ambientBar;
  return bar != null ? bar / 10 : 0;
}

/** Hydrostatic leak-test pressure (MPa) = 1.5 × ambient. */
export function flangeHydroPressureMpa(pressureClass: string): number {
  const bar = FLANGE_RATING_LIMITS[pressureClass]?.hydroTestBar;
  return bar != null ? bar / 10 : 0;
}

/** Format flange limit for warning banners (follows unitSystem). */
export function formatFlangeRatingLimit(
  bar: number,
  unitSystem: UnitSystem,
): string {
  if (unitSystem === "imperial") {
    return `${Math.round(bar * BAR_TO_PSI).toLocaleString("en-US")} psi`;
  }
  return `${bar.toFixed(1)} bar (${(bar / 10).toFixed(2)} MPa)`;
}

/** Standard commercial steel plate thicknesses (mm). */
export const COMMERCIAL_PLATE_THICKNESSES_MM = [
  6, 8, 9, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100, 110, 120,
];

/** Standard commercial steel plate thicknesses (in). */
export const COMMERCIAL_PLATE_THICKNESSES_IN = [
  0.25, 0.3125, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0, 1.125, 1.25, 1.375, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.5, 5.0,
];

/** US customary fractional plate labels (ASTM A6 / mill stock). */
const IMPERIAL_PLATE_FRACTIONS: Record<string, string> = {
  "0.25": '1/4"',
  "0.3125": '5/16"',
  "0.375": '3/8"',
  "0.5": '1/2"',
  "0.625": '5/8"',
  "0.75": '3/4"',
  "0.875": '7/8"',
  "1": '1"',
  "1.0": '1"',
  "1.125": '1-1/8"',
  "1.25": '1-1/4"',
  "1.375": '1-3/8"',
  "1.5": '1-1/2"',
  "1.75": '1-3/4"',
  "2": '2"',
  "2.0": '2"',
  "2.25": '2-1/4"',
  "2.5": '2-1/2"',
  "2.75": '2-3/4"',
  "3": '3"',
  "3.0": '3"',
};

export function formatImperialPlateFraction(thicknessIn: number): string {
  const key = String(thicknessIn);
  if (IMPERIAL_PLATE_FRACTIONS[key]) return IMPERIAL_PLATE_FRACTIONS[key];
  const rounded = Number(thicknessIn.toFixed(4));
  return (
    IMPERIAL_PLATE_FRACTIONS[String(rounded)] ??
    IMPERIAL_PLATE_FRACTIONS[rounded.toFixed(4)] ??
    `${thicknessIn}"`
  );
}

export function getRecommendedCommercialPlate(
  tRequired: number,
  unitSystem: UnitSystem,
): { value: number; unit: string; label: string; excess: number } {
  if (unitSystem === "metric") {
    const tMm = Math.max(0, tRequired);
    const match =
      COMMERCIAL_PLATE_THICKNESSES_MM.find((size) => size >= tMm) ??
      Math.ceil(tMm);
    return {
      value: match,
      unit: "mm",
      label: `${match} mm (${match}T Plate)`,
      excess: Number(Math.max(0, match - tMm).toFixed(2)),
    };
  } else {
    const tIn = Math.max(0, tRequired);
    const match =
      COMMERCIAL_PLATE_THICKNESSES_IN.find((size) => size >= tIn) ??
      Number((Math.ceil(tIn * 8) / 8).toFixed(4));
    const frac = formatImperialPlateFraction(match);
    return {
      value: match,
      unit: "in",
      label: `${frac} Plate`,
      excess: Number(Math.max(0, match - tIn).toFixed(3)),
    };
  }
}

/**
 * Standard ASME B16.5 Raised Face (RF) Diameter lookup for Gasket Contact Diameter d.
 */
export function getStandardGasketContactDiameter(
  nps: string,
  pressureClass: string = "150",
  unitSystem: UnitSystem = "metric",
): number | null {
  const entry = getFlangeDimensionEntry(nps, pressureClass);
  if (entry && entry.rating.raisedFaceDiameterMm > 0) {
    const dMm = entry.rating.raisedFaceDiameterMm;
    return unitSystem === "metric"
      ? Number(dMm.toFixed(1))
      : Number((dMm / 25.4).toFixed(3));
  }
  return null;
}

/**
 * t = d √(3P / 16SE) + c.
 * Equivalent to t = d √(0.1875 P / SE) + c = d √(CP / SE) + c with C = 0.30.
 * P and S share stress units; d, t, c share length units.
 */
export function requiredBlindThicknessMm(inputs: {
  insideDiameter: number;
  designPressure: number;
  allowableStress: number;
  weldEfficiency: number;
  corrosionAllowance: number;
}): number {
  const d = Number.isFinite(inputs.insideDiameter) ? inputs.insideDiameter : 0;
  const P = Number.isFinite(inputs.designPressure) ? inputs.designPressure : 0;
  const S = Number.isFinite(inputs.allowableStress) ? inputs.allowableStress : 0;
  const E = Number.isFinite(inputs.weldEfficiency) ? inputs.weldEfficiency : 0;
  const c = Math.max(
    0,
    Number.isFinite(inputs.corrosionAllowance) ? inputs.corrosionAllowance : 0,
  );
  if (d <= 0 || P <= 0 || S <= 0 || E <= 0) return c;
  const inner = (BLIND_FLANGE_C * P) / (S * E);
  if (inner < 0) return c;
  const t = d * Math.sqrt(inner) + c;
  return Number.isFinite(t) ? t : c;
}

export function calculateBlindFlange(inputs: BlindFlangeInputs): CalculatorOutput {
  const mode: BlindDesignMode = inputs.mode === "hydrotest" ? "hydrotest" : "permanent";
  const {
    insideDiameter,
    designPressure,
    allowableStress,
    weldEfficiency,
    corrosionAllowance,
    nps,
    pressureClass,
  } = inputs;

  const requiredThickness = requiredBlindThicknessMm(inputs);
  const invalid =
    !Number.isFinite(designPressure) ||
    designPressure <= 0 ||
    !Number.isFinite(insideDiameter) ||
    insideDiameter <= 0 ||
    !Number.isFinite(allowableStress) ||
    allowableStress <= 0;

  const unit = inputs.unitSystem === "metric" ? "mm" : "in";
  const pressureUnit = inputs.unitSystem === "imperial" ? "psi" : "MPa";
  const stressUnit = inputs.unitSystem === "imperial" ? "psi" : "MPa";

  const pressureLabel = invalid
    ? "—"
    : inputs.unitSystem === "imperial"
      ? `${designPressure.toFixed(1)} ${pressureUnit}`
      : `${designPressure.toFixed(2)} ${pressureUnit}`;

  const dShow = Number.isFinite(insideDiameter) ? insideDiameter : 0;
  const sShow = Number.isFinite(allowableStress) ? allowableStress : 0;
  const eShow = Number.isFinite(weldEfficiency) ? weldEfficiency : 0;
  const cShow = Number.isFinite(corrosionAllowance) ? corrosionAllowance : 0;
  const dLabel = formatBlindLength(dShow, inputs.unitSystem);
  const cLabel = formatBlindLength(cShow, inputs.unitSystem, "corrosion");
  const sLabel =
    inputs.unitSystem === "imperial"
      ? `${Math.round(sShow).toLocaleString("en-US")} ${stressUnit}`
      : `${Math.round(sShow)} ${stressUnit}`;
  const tLabel = invalid
    ? "—"
    : `${formatBlindLength(requiredThickness, inputs.unitSystem)} ${unit}`;

  const recommendedPlate = getRecommendedCommercialPlate(
    requiredThickness,
    inputs.unitSystem,
  );
  const marginPercent =
    !invalid && requiredThickness > 0
      ? ((recommendedPlate.value / requiredThickness) - 1) * 100
      : 0;

  // Pressure Rating Over-pressure Check per ASME B16.5
  const pressBar =
    inputs.unitSystem === "imperial"
      ? (designPressure ?? 0) * 0.0689476
      : (designPressure ?? 0) * 10;

  const classLimit = pressureClass ? FLANGE_RATING_LIMITS[pressureClass] : null;
  const maxAllowableFlangeBar = classLimit
    ? mode === "hydrotest"
      ? classLimit.hydroTestBar
      : classLimit.ambientBar
    : null;

  const isOverPressure =
    maxAllowableFlangeBar != null &&
    Number.isFinite(pressBar) &&
    pressBar > maxAllowableFlangeBar;

  const modeTitle =
    mode === "hydrotest"
      ? "Hydrotest Temporary Blank"
      : "Permanent Operating Blind";
  const hydroCNote =
    inputs.unitSystem === "imperial" ? "c = 0 in" : "c = 0 mm";
  const standardBasis =
    mode === "hydrotest"
      ? `ASME B31.3 Ch. VI / Temporary Test Blank (${hydroCNote})`
      : "ASME B31.3 Para. 304.4.1 / ASME VIII-1 UG-34";

  const heroLabel =
    mode === "hydrotest"
      ? "Required Hydrotest Blank Thickness (t_m)"
      : "Required Blind Flange Thickness (t_m)";

  const ratingKind = mode === "hydrotest" ? "hydrotest" : "ambient";

  const heroStatus = invalid
    ? "Enter positive d, pressure, and allowable stress"
    : isOverPressure
      ? `⚠️ WARNING: Pressure exceeds ASME B16.5 #${pressureClass} ${ratingKind} rating (${formatFlangeRatingLimit(maxAllowableFlangeBar!, inputs.unitSystem)})!`
      : mode === "hydrotest"
        ? `Temporary Test Blank · Recommended: ${recommendedPlate.label}`
        : `Permanent Design (c = ${cLabel} ${unit}) · Recommended: ${recommendedPlate.label}`;

  const heroStatusLevel = invalid ? "warn" : isOverPressure ? "fail" : "pass";

  const summary = [
    { label: "Design Mode", value: modeTitle },
    {
      label: "Recommended Plate",
      value: invalid ? "—" : recommendedPlate.label,
    },
    {
      label: "Gasket Contact Dia (d)",
      value: `${dLabel} ${unit}`,
    },
    {
      label: mode === "hydrotest" ? "Test Pressure (Pt)" : "Design Pressure (P)",
      value: pressureLabel,
    },
  ];

  if (nps && pressureClass) {
    summary.unshift({
      label: "Flange Size & Class",
      value: `${nps}" #${pressureClass}`,
    });
  }

  return {
    heroLabel,
    heroValue: tLabel,
    heroStatus,
    heroStatusLevel,
    heroBadges: invalid
      ? undefined
      : [
          {
            label: "Recommended plate",
            value: recommendedPlate.label,
          },
          {
            label: "Safety margin vs t_m",
            value: `+${formatBlindLength(recommendedPlate.excess, inputs.unitSystem)} ${unit} (${marginPercent.toFixed(0)}%)`,
          },
        ],
    summary,
    summaryStatus: {
      label: isOverPressure
        ? `⚠️ Exceeds ASME B16.5 #${pressureClass} ${ratingKind} limit (${formatFlangeRatingLimit(maxAllowableFlangeBar!, inputs.unitSystem)})`
        : standardBasis,
      level: isOverPressure ? "fail" : invalid ? "warn" : "neutral",
    },
    rows: [
      { label: "Operating Mode", value: modeTitle },
      { label: "Standard Basis", value: standardBasis },
      {
        label: "Calculation Scope",
        value: invalid
          ? "—"
          : mode === "hydrotest"
            ? `Custom hydrotest condition (Pt = ${pressureLabel})`
            : `Custom operating condition (P = ${pressureLabel})`,
      },
      {
        label: "Formula",
        value:
          mode === "hydrotest"
            ? String.raw`t_m = d \cdot \sqrt{\frac{0.30 \cdot P_t}{S \cdot E}}`
            : String.raw`t_m = d \cdot \sqrt{\frac{0.30 \cdot P}{S \cdot E}} + c`,
      },
      { label: "Attachment Factor (C)", value: BLIND_FLANGE_C.toFixed(2) },
      {
        label: "Gasket Contact Diameter (d)",
        value: `${dLabel} ${unit}`,
        highlight: "d",
      },
      {
        label: mode === "hydrotest" ? "Test Pressure (Pt)" : "Design Pressure (P)",
        value: pressureLabel,
        highlight: "P",
      },
      {
        label: "Allowable Stress (S)",
        value: sLabel,
      },
      { label: "Joint Efficiency (E)", value: eShow.toFixed(2) },
      {
        label: "Corrosion Allowance (c)",
        value: `${cLabel} ${unit}`,
        highlight: "c",
      },
      {
        label: "Minimum Required Thickness (t_m)",
        value: tLabel,
        highlight: "t",
      },
      {
        label: "Recommended Commercial Plate",
        value: invalid ? "—" : recommendedPlate.label,
      },
      {
        label: "Safety Margin vs t_m",
        value: invalid
          ? "—"
          : `+${formatBlindLength(recommendedPlate.excess, inputs.unitSystem)} ${unit} (${marginPercent.toFixed(0)}%) — (t_plate / t_m − 1) × 100%`,
      },
    ],
    exportRows: [
      { label: "Mode", value: modeTitle },
      { label: "Standard", value: standardBasis },
      {
        label: "Formula",
        value:
          mode === "hydrotest"
            ? "t_m = d × √(0.30 Pt / SE)"
            : "t_m = d × √(0.30 P / SE) + c",
      },
      { label: "Diameter (d)", value: `${dLabel} ${unit}` },
      {
        label: mode === "hydrotest" ? "Test Pressure (Pt)" : "Design Pressure (P)",
        value: pressureLabel,
      },
      {
        label: "Allowable Stress (S)",
        value: sLabel,
      },
      {
        label: "Corrosion Allowance (c)",
        value: `${cLabel} ${unit}`,
      },
      {
        label: "Calculated Minimum Thickness (t_m)",
        value: tLabel,
      },
      {
        label: "Recommended Plate Size",
        value: invalid ? "—" : recommendedPlate.label,
      },
      {
        label: "Safety Margin vs t_m",
        value: invalid
          ? "—"
          : `+${formatBlindLength(recommendedPlate.excess, inputs.unitSystem)} ${unit} (${marginPercent.toFixed(0)}%)`,
      },
    ],
  };
}

export const DEFAULT_BLIND_FLANGE_INPUTS: BlindFlangeInputs = {
  unitSystem: "metric",
  mode: "permanent",
  nps: "4",
  pressureClass: "150",
  insideDiameter: 157.2,
  designPressure: 2.5,
  allowableStress: 125.0,
  weldEfficiency: 1.0,
  corrosionAllowance: 3.0,
  materialId: "a516_70",
};

export function getAllowableStressForMaterial(
  materialId: string,
  mode: BlindDesignMode,
  unitSystem: UnitSystem,
): number {
  const preset =
    MATERIAL_STRESS_PRESETS[materialId] ?? MATERIAL_STRESS_PRESETS.a516_70;
  if (mode === "hydrotest") {
    return unitSystem === "metric"
      ? preset.ambientStressMpa
      : preset.ambientStressPsi;
  }
  return unitSystem === "metric"
    ? preset.designStressMpa
    : preset.designStressPsi;
}
