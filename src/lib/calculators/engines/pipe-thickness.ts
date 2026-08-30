import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";

/** ASME B31.3 304.1.2 coefficient Y. Ferritic steels through 482 °C (900 °F) use 0.4. */
export const B31_3_Y_FERRITIC = 0.4;

export type PipeThicknessInputs = {
  unitSystem: UnitSystem;
  outsideDiameter: number;
  designPressure: number;
  allowableStress: number;
  weldEfficiency: number;
  corrosionAllowance: number;
  actualThickness: number;
  yCoefficient?: number;
  material?: string;
};

export const PIPE_THICKNESS_MATERIAL_PRESETS = [
  {
    id: "a106-b",
    label: "ASTM A106 Gr.B (CS)",
    plantLabel: "A106 Gr.B",
    stressMpa: 138,
    stressPsi: 20000,
    stressKsi: 20.0,
  },
  {
    id: "a53-a",
    label: "ASTM A53 Gr.A (CS)",
    plantLabel: "A53 Gr.A",
    stressMpa: 110,
    stressPsi: 16000,
    stressKsi: 16.0,
  },
  {
    id: "tp304l",
    label: "ASTM A312 TP304L (SS)",
    plantLabel: "A312 TP304L",
    stressMpa: 115,
    stressPsi: 16700,
    stressKsi: 16.7,
  },
  {
    id: "p22",
    label: "ASTM A335 P22 (Alloy)",
    plantLabel: "A335 P22",
    stressMpa: 123,
    stressPsi: 17900,
    stressKsi: 17.9,
  },
] as const;

export type PipeThicknessMaterialId =
  (typeof PIPE_THICKNESS_MATERIAL_PRESETS)[number]["id"];

const MPA_TO_PSI = 145.037738;

export function convertAllowableStress(
  value: number,
  from: UnitSystem,
  to: UnitSystem,
): number {
  if (from === to || !Number.isFinite(value)) return value;
  return to === "imperial" ? value * MPA_TO_PSI : value / MPA_TO_PSI;
}

export function pipeThicknessStressForMaterial(
  materialId: string,
  unitSystem: UnitSystem,
): number | undefined {
  if (!materialId || materialId === "custom") return undefined;
  const preset = PIPE_THICKNESS_MATERIAL_PRESETS.find(
    (item) => item.id === materialId,
  );
  if (!preset) return undefined;
  return unitSystem === "imperial" ? preset.stressPsi : preset.stressMpa;
}

export function formatMaterialPresetOption(
  preset: (typeof PIPE_THICKNESS_MATERIAL_PRESETS)[number],
): string {
  return `${preset.label} — ${preset.stressMpa} MPa (${preset.stressKsi} ksi)`;
}

export function mapPipeThicknessMaterialId(
  raw: string,
): PipeThicknessMaterialId | "custom" | undefined {
  const value = raw.toLowerCase().replace(/\s+/g, "");
  if (value === "custom") return "custom";
  if (value.includes("a106") || value === "a106-b") return "a106-b";
  if (value.includes("a53") || value === "a53-a") return "a53-a";
  if (value.includes("304l") || value.includes("tp304l")) return "tp304l";
  if (value.includes("p22") || value.includes("a335p22")) return "p22";
  // Legacy URL aliases → nearest current preset
  if (value.includes("a333")) return "a106-b";
  if (value.includes("316") || value.includes("tp316")) return "tp304l";
  if (value.includes("304") || value.includes("tp304")) return "tp304l";
  if (value.includes("p11") || value.includes("a335")) return "p22";
  const exact = PIPE_THICKNESS_MATERIAL_PRESETS.find((item) => item.id === raw);
  return exact?.id;
}

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Required wall including corrosion allowance.
 * t = P D / (2 (S E + P Y)) + c   ASME B31.3 para. 304.1.2(a)
 * P, S in the same stress units; D, t, c in the same length units.
 */
export function requiredPipeWallThickness(inputs: {
  designPressure: number;
  outsideDiameter: number;
  allowableStress: number;
  weldEfficiency: number;
  yCoefficient?: number;
  corrosionAllowance: number;
}): number {
  const P = finite(inputs.designPressure);
  const D = finite(inputs.outsideDiameter);
  const S = finite(inputs.allowableStress);
  const E = finite(inputs.weldEfficiency);
  const Y = finite(inputs.yCoefficient ?? B31_3_Y_FERRITIC, B31_3_Y_FERRITIC);
  const c = Math.max(0, finite(inputs.corrosionAllowance));
  if (P <= 0 || D <= 0 || S <= 0 || E <= 0) return c;
  const denominator = 2 * (S * E + P * Y);
  if (denominator <= 0) return c;
  return (P * D) / denominator + c;
}

export function calculatePipeThickness(
  inputs: PipeThicknessInputs,
): CalculatorOutput {
  const requiredThickness = requiredPipeWallThickness(inputs);
  const actualThickness = Math.max(0, finite(inputs.actualThickness));

  const passes = actualThickness >= requiredThickness && requiredThickness > 0;
  const margin = actualThickness - requiredThickness;
  const fillPercent = actualThickness > 0 ? 100 : 0;
  const limitPercent =
    actualThickness > 0
      ? Math.min(100, (requiredThickness / actualThickness) * 100)
      : 0;
  const marginPercent =
    requiredThickness > 0 ? (margin / requiredThickness) * 100 : 0;

  const unit = inputs.unitSystem === "metric" ? "mm" : "in";
  const pressureUnit = inputs.unitSystem === "metric" ? "MPa" : "psi";
  const invalid =
    inputs.designPressure <= 0 ||
    inputs.outsideDiameter <= 0 ||
    inputs.allowableStress <= 0;

  return {
    heroLabel: "Required Minimum Wall Thickness (tmin)",
    heroValue: invalid ? "—" : `${requiredThickness.toFixed(3)} ${unit}`,
    heroStatus: invalid
      ? "Enter positive P, D, and S — check inputs"
      : passes
        ? "Within ASME B31.3 allowable thickness"
        : "Below required minimum — review required",
    heroStatusLevel: invalid ? "warn" : passes ? "pass" : "fail",
    summary: [
      {
        label: "Required tmin",
        value: invalid ? "—" : `${requiredThickness.toFixed(3)} ${unit}`,
      },
      { label: "Actual thickness", value: `${actualThickness.toFixed(3)} ${unit}` },
    ],
    summaryStatus: {
      label: invalid
        ? "Invalid design inputs"
        : passes
          ? "Within standard — OK"
          : "Below minimum — review required",
      level: invalid ? "warn" : passes ? "pass" : "fail",
    },
    gauge: invalid
      ? undefined
      : {
          variant: "thickness-margin" as const,
          fillPercent,
          limitPercent,
          tMin: requiredThickness,
          tActual: actualThickness,
          unit,
          minLabel: `0 ${unit}`,
          limitLabel: `${requiredThickness.toFixed(2)} ${unit}`,
          maxLabel: `${actualThickness.toFixed(2)} ${unit}`,
          caption: passes
            ? `Safety margin: ${margin.toFixed(2)} ${unit} (${marginPercent.toFixed(0)}%)`
            : `Shortfall: ${Math.abs(margin).toFixed(2)} ${unit} — below t_min`,
        },
    rows: [
      {
        label: "Design pressure (P)",
        value: `${finite(inputs.designPressure).toFixed(2)} ${pressureUnit}`,
        highlight: "P",
      },
      {
        label: "Outside diameter (D)",
        value: `${finite(inputs.outsideDiameter).toFixed(2)} ${unit}`,
        highlight: "D",
      },
      {
        label: "Allowable stress (S)",
        value: `${finite(inputs.allowableStress).toFixed(1)} ${pressureUnit}`,
      },
      {
        label: "Weld joint efficiency (E)",
        value: finite(inputs.weldEfficiency).toFixed(2),
      },
      {
        label: "Coefficient Y",
        value: finite(inputs.yCoefficient ?? B31_3_Y_FERRITIC, B31_3_Y_FERRITIC).toFixed(2),
      },
      {
        label: "Corrosion / mechanical allowance (c)",
        value: `${finite(inputs.corrosionAllowance).toFixed(3)} ${unit}`,
        highlight: "c",
      },
      {
        label: "Thickness margin",
        value: `${margin.toFixed(3)} ${unit}`,
        warn: !passes,
      },
      {
        label: "Compliance check",
        value: invalid ? "—" : passes ? "Pass" : "Fail",
        warn: !passes,
      },
    ],
    exportRows: [
      { label: "Standard", value: "ASME B31.3 304.1.2" },
      { label: "Required tmin", value: `${requiredThickness.toFixed(3)} ${unit}` },
      { label: "Actual thickness", value: `${actualThickness.toFixed(3)} ${unit}` },
      {
        label: "Design pressure",
        value: `${finite(inputs.designPressure).toFixed(2)} ${pressureUnit}`,
      },
      {
        label: "Outside diameter",
        value: `${finite(inputs.outsideDiameter).toFixed(2)} ${unit}`,
      },
      { label: "Compliance", value: invalid ? "Invalid" : passes ? "Pass" : "Fail" },
    ],
  };
}

export const DEFAULT_PIPE_INPUTS: PipeThicknessInputs = {
  unitSystem: "metric",
  outsideDiameter: 114.3,
  designPressure: 2.0,
  allowableStress: 138,
  weldEfficiency: 1.0,
  corrosionAllowance: 0,
  actualThickness: 6.02,
  yCoefficient: B31_3_Y_FERRITIC,
  material: "a106-b",
};
