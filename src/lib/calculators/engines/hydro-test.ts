import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import { formatPressure } from "@/utils/unitConverter";

export type TestFluid = "hydrostatic" | "pneumatic";

export const STRESS_RATIO_DEFAULT = 1;
export const STRESS_RATIO_MAX = 6.5;

export type HydroTestInputs = {
  unitSystem: UnitSystem;
  testFluid: TestFluid;
  designPressure: number;
  designStress: number;
  testStress: number;
  stressRatio: number;
  applyTempCorrection: boolean;
  nps: string;
};

/** ASME B36.10 nominal sizes used for holding-time screening. */
export const HYDRO_NPS_OPTIONS: { value: string; label: string }[] = [
  { value: "0.5", label: '1/2"' },
  { value: "0.75", label: '3/4"' },
  { value: "1", label: '1"' },
  { value: "1.5", label: '1-1/2"' },
  { value: "2", label: '2"' },
  { value: "2.5", label: '2-1/2"' },
  { value: "3", label: '3"' },
  { value: "4", label: '4"' },
  { value: "6", label: '6"' },
  { value: "8", label: '8"' },
  { value: "10", label: '10"' },
  { value: "12", label: '12"' },
  { value: "14", label: '14"' },
  { value: "16", label: '16"' },
  { value: "18", label: '18"' },
  { value: "20", label: '20"' },
  { value: "24", label: '24"' },
];

const MPA_PER_PSI = 1 / 145.037738;

function toMpa(value: number, unitSystem: UnitSystem): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return unitSystem === "imperial" ? value * MPA_PER_PSI : value;
}

export function clampStressRatio(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return STRESS_RATIO_DEFAULT;
  return Math.min(value, STRESS_RATIO_MAX);
}

/**
 * ASME B31.3 para. 345.4.2: Pt = 1.5 P (St/S) hydrostatic, 1.1 P (St/S) pneumatic.
 * St/S is capped at 6.5 as a field screening / yield-limit guide.
 */
export function resolveStressRatio(inputs: HydroTestInputs): number {
  const explicit = clampStressRatio(inputs.stressRatio);
  if (
    explicit === STRESS_RATIO_DEFAULT &&
    inputs.applyTempCorrection &&
    inputs.designStress > 0
  ) {
    return clampStressRatio(inputs.testStress / inputs.designStress);
  }
  return explicit;
}

export function hydroTestPressureMpa(inputs: HydroTestInputs): number {
  const designMpa = toMpa(inputs.designPressure, inputs.unitSystem);
  if (designMpa <= 0) return 0;
  const multiplier = inputs.testFluid === "hydrostatic" ? 1.5 : 1.1;
  return designMpa * multiplier * resolveStressRatio(inputs);
}

/**
 * Field holding-time guide by NPS (screening — site procedure may require longer).
 * ≤ 2" → 10 min · 2-1/2"–4" → 30 min · ≥ 6" → 60 min
 * NPS parenthetical uses NBSP so it stays on one line; optional site note is a new line.
 */
export function getHoldingTimeGuide(nps: string): string {
  const npsNum = Number(nps);
  const nbsp = "\u00A0";
  if (!Number.isFinite(npsNum) || npsNum <= 0) {
    return `Select NPS for a holding-time guide\n— confirm site procedure`;
  }
  if (npsNum <= 2) {
    return `Minimum 10 minutes at test pressure${nbsp}(NPS${nbsp}≤${nbsp}2")`;
  }
  if (npsNum <= 4) {
    return `Minimum 30 minutes at test pressure${nbsp}(NPS${nbsp}2-1/2"–4")`;
  }
  return `Minimum 60 minutes at test pressure${nbsp}(NPS${nbsp}≥${nbsp}6")\n— confirm site procedure`;
}

function getSafetyNotes(testFluid: TestFluid): string[] {
  if (testFluid === "pneumatic") {
    return [
      "Pneumatic testing requires written authorization per ASME B31.3.",
      "Personnel shall be excluded from the test envelope during pressurization.",
      "Use calibrated pressure relief and stepwise pressurization.",
    ];
  }
  return [
    "Vent trapped air before hydrostatic pressurization.",
    "Inspect joints and supports while at test pressure.",
    "Depressurize safely and drain test medium after acceptance.",
  ];
}

export function calculateHydroTest(inputs: HydroTestInputs): CalculatorOutput {
  const testPressureMpa = hydroTestPressureMpa(inputs);
  const designPressureMpa = toMpa(inputs.designPressure, inputs.unitSystem);
  const invalid = testPressureMpa <= 0;
  const stressRatio = resolveStressRatio(inputs);
  const rawRatio = Number.isFinite(inputs.stressRatio) ? inputs.stressRatio : STRESS_RATIO_DEFAULT;
  const capped = Number.isFinite(rawRatio) && rawRatio > STRESS_RATIO_MAX;
  const multiplier = inputs.testFluid === "hydrostatic" ? 1.5 : 1.1;
  const formula =
    inputs.testFluid === "hydrostatic"
      ? "Pt = 1.5 × P × (St/S)"
      : "Pt = 1.1 × P × (St/S)";
  const testPressure = invalid
    ? "—"
    : formatPressure(testPressureMpa, inputs.unitSystem);
  const designPressure = invalid
    ? "—"
    : formatPressure(designPressureMpa, inputs.unitSystem);
  const safetyNotes = getSafetyNotes(inputs.testFluid);
  const holdingTime = getHoldingTimeGuide(inputs.nps);

  return {
    heroLabel: "Required Test Pressure (Pt)",
    heroValue: testPressure,
    heroStatus: invalid
      ? "Enter a positive design pressure"
      : "ASME B31.3 St/S stress ratio & yield limit check",
    heroStatusLevel: invalid || capped ? "warn" : "neutral",
    summary: [
      { label: "Design pressure", value: designPressure },
      { label: "Stress ratio St/S", value: stressRatio.toFixed(3) },
    ],
    summaryStatus: {
      label: capped
        ? `St/S capped at ${STRESS_RATIO_MAX} — verify yield at test temperature`
        : holdingTime,
      level: capped ? "warn" : "neutral",
    },
    rows: [
      {
        label: "Test fluid",
        value: inputs.testFluid === "hydrostatic" ? "Hydrostatic" : "Pneumatic",
      },
      { label: "Design pressure (P)", value: designPressure },
      { label: "Formula", value: formula },
      {
        label: "Stress ratio (St/S)",
        value: capped
          ? `${rawRatio.toFixed(3)} → ${stressRatio.toFixed(3)} (cap ${STRESS_RATIO_MAX})`
          : stressRatio.toFixed(3),
        warn: capped,
      },
      { label: "Test multiplier", value: `${multiplier.toFixed(1)} × P × (St/S)` },
      {
        label: "Test pressure (Pt)",
        value: testPressure,
        emphasis: true,
      },
      { label: "Minimum holding time", value: holdingTime },
    ],
    callouts: [
      {
        tone: "warn",
        title: "Yield limit",
        body: "Pt shall not produce stress above yield at test temperature (ASME B31.3 para. 345.4.2).",
      },
      {
        tone: "info",
        title: "Safety notes",
        body:
          inputs.testFluid === "pneumatic"
            ? "Pneumatic testing controls (B31.3):"
            : "Hydrostatic testing controls (B31.3):",
        items: safetyNotes,
      },
    ],
    exportRows: [
      { label: "Standard", value: "ASME B31.3 345.4.2" },
      { label: "Test fluid", value: inputs.testFluid },
      { label: "Design pressure", value: designPressure },
      { label: "Stress ratio St/S", value: stressRatio.toFixed(3) },
      { label: "Test pressure", value: testPressure },
      { label: "Holding time", value: holdingTime },
      { label: "Yield limit", value: "Do not exceed yield at test temperature" },
      ...safetyNotes.map((note, index) => ({
        label: `Safety note ${index + 1}`,
        value: note,
      })),
    ],
  };
}

export const DEFAULT_HYDRO_TEST_INPUTS: HydroTestInputs = {
  unitSystem: "metric",
  testFluid: "hydrostatic",
  designPressure: 2.5,
  designStress: 138,
  testStress: 138,
  stressRatio: STRESS_RATIO_DEFAULT,
  applyTempCorrection: false,
  nps: "4",
};
