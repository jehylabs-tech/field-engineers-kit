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
    ambientStressMpa: 137.9,
    ambientStressPsi: 20000,
    designStressMpa: 104.0,
    designStressPsi: 15100,
  },
  ss316: {
    id: "ss316",
    label: "ASTM A240 Gr. 316 (Moly SS)",
    description: "Marine & chemical resistance",
    ambientStressMpa: 137.9,
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

/** ASME VIII-1 UG-34 / B31.3 304.4.1 attachment factor for bolted flat covers. */
export const BLIND_FLANGE_C = 0.3;

/**
 * ASME B16.5 Table 2-1.1 (Group 1.1 Carbon Steel e.g. A105 / A516-70) Max Working Pressure (bar / MPa).
 * Ambient (up to 38°C) and Elevated Temp (~150°C).
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

/** Standard commercial steel plate thicknesses (mm). */
export const COMMERCIAL_PLATE_THICKNESSES_MM = [
  6, 8, 9, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100, 110, 120,
];

/** Standard commercial steel plate thicknesses (in). */
export const COMMERCIAL_PLATE_THICKNESSES_IN = [
  0.25, 0.3125, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0, 1.125, 1.25, 1.375, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.5, 5.0,
];

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
      Number((Math.ceil(tIn * 8) / 8).toFixed(3));
    return {
      value: match,
      unit: "in",
      label: `${match} in Plate`,
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
    return unitSystem === "metric" ? dMm : Number((dMm / 25.4).toFixed(3));
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
    : `${designPressure.toFixed(2)} ${pressureUnit}`;

  const dShow = Number.isFinite(insideDiameter) ? insideDiameter : 0;
  const sShow = Number.isFinite(allowableStress) ? allowableStress : 0;
  const eShow = Number.isFinite(weldEfficiency) ? weldEfficiency : 0;
  const cShow = Number.isFinite(corrosionAllowance) ? corrosionAllowance : 0;

  const recommendedPlate = getRecommendedCommercialPlate(
    requiredThickness,
    inputs.unitSystem,
  );

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
  const standardBasis =
    mode === "hydrotest"
      ? "ASME B31.3 Ch. VI / Temporary Test Blank (c = 0 mm)"
      : "ASME B31.3 Para. 304.4.1 / ASME VIII-1 UG-34";

  const heroLabel =
    mode === "hydrotest"
      ? "Required Hydrotest Blank Thickness (t_m)"
      : "Required Blind Flange Thickness (t_m)";

  const heroStatus = invalid
    ? "Enter positive d, pressure, and allowable stress"
    : isOverPressure
      ? `⚠️ WARNING: Pressure exceeds ASME B16.5 #${pressureClass} Flange Rating limit (${maxAllowableFlangeBar.toFixed(1)} bar)!`
      : mode === "hydrotest"
        ? `Temporary Test Blank · Recommended: ${recommendedPlate.label}`
        : `Permanent Design (c = ${cShow.toFixed(1)} ${unit}) · Recommended: ${recommendedPlate.label}`;

  const heroStatusLevel = invalid ? "warn" : isOverPressure ? "fail" : "pass";

  const summary = [
    { label: "Design Mode", value: modeTitle },
    {
      label: "Recommended Plate",
      value: invalid ? "—" : recommendedPlate.label,
    },
    {
      label: "Gasket Contact Dia (d)",
      value: `${dShow.toFixed(2)} ${unit}`,
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
    heroValue: invalid ? "—" : `${requiredThickness.toFixed(2)} ${unit}`,
    heroStatus,
    heroStatusLevel,
    summary,
    summaryStatus: {
      label: isOverPressure
        ? `⚠️ Exceeds ASME B16.5 #${pressureClass} Limit (${maxAllowableFlangeBar?.toFixed(1)} bar)`
        : standardBasis,
      level: isOverPressure ? "fail" : invalid ? "warn" : "neutral",
    },
    rows: [
      { label: "Operating Mode", value: modeTitle },
      { label: "Standard Basis", value: standardBasis },
      {
        label: "Formula",
        value:
          mode === "hydrotest"
            ? "t_m = d × √(0.30 Pt / SE) (c = 0 mm)"
            : "t_m = d × √(0.30 P / SE) + c",
      },
      { label: "Attachment Factor (C)", value: BLIND_FLANGE_C.toFixed(2) },
      {
        label: "Gasket Contact Diameter (d)",
        value: `${dShow.toFixed(2)} ${unit}`,
        highlight: "d",
      },
      {
        label: mode === "hydrotest" ? "Test Pressure (Pt)" : "Design Pressure (P)",
        value: pressureLabel,
        highlight: "P",
      },
      {
        label: "Allowable Stress (S)",
        value: `${sShow.toFixed(1)} ${stressUnit}`,
      },
      { label: "Joint Efficiency (E)", value: eShow.toFixed(2) },
      {
        label: "Corrosion Allowance (c)",
        value: `${cShow.toFixed(2)} ${unit}`,
        highlight: "c",
      },
      {
        label: "Minimum Required Thickness (t_m)",
        value: invalid ? "—" : `${requiredThickness.toFixed(2)} ${unit}`,
        highlight: "t",
      },
      {
        label: "Recommended Commercial Plate",
        value: invalid ? "—" : recommendedPlate.label,
      },
      {
        label: "Safety Excess Margin",
        value: invalid ? "—" : `+${recommendedPlate.excess.toFixed(2)} ${unit}`,
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
      { label: "Diameter (d)", value: `${dShow.toFixed(2)} ${unit}` },
      {
        label: mode === "hydrotest" ? "Test Pressure (Pt)" : "Design Pressure (P)",
        value: pressureLabel,
      },
      {
        label: "Allowable Stress (S)",
        value: `${sShow.toFixed(1)} ${stressUnit}`,
      },
      {
        label: "Corrosion Allowance (c)",
        value: `${cShow.toFixed(2)} ${unit}`,
      },
      {
        label: "Calculated Minimum Thickness (t_m)",
        value: invalid ? "—" : `${requiredThickness.toFixed(2)} ${unit}`,
      },
      {
        label: "Recommended Plate Size",
        value: invalid ? "—" : recommendedPlate.label,
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
