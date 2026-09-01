import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import { scheduleRank } from "@/lib/data/b36-19-schedules";
import { getPipeScheduleEntry, listSchedulesForNps } from "@/lib/data/loaders";

/** ASME B31.3 304.1.2 coefficient Y. Ferritic steels through 482 °C (900 °F) use 0.4. */
export const B31_3_Y_FERRITIC = 0.4;

/** ASME B31.3 mill under-tolerance allowance factor (12.5%). */
export const B31_3_MILL_TOLERANCE_FACTOR = 0.875;

export type JointQualityId = "seamless" | "erw" | "efw" | "custom";

export const JOINT_QUALITY_PRESETS: Array<{
  id: JointQualityId;
  label: string;
  efficiency: number;
}> = [
  { id: "seamless", label: "Seamless (E = 1.00)", efficiency: 1.0 },
  { id: "erw", label: "ERW (E = 0.85)", efficiency: 0.85 },
  { id: "efw", label: "EFW (E = 0.80)", efficiency: 0.8 },
];

export type PipeThicknessInputs = {
  unitSystem: UnitSystem;
  nps: string;
  schedule: string;
  outsideDiameter: number;
  designPressure: number;
  designTemperature: number;
  allowableStress: number;
  weldEfficiency: number;
  jointType: JointQualityId;
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
    id: "tp316l",
    label: "ASTM A312 TP316L (SS)",
    plantLabel: "A312 TP316L",
    stressMpa: 115,
    stressPsi: 16700,
    stressKsi: 16.7,
  },
  {
    id: "a333-6",
    label: "ASTM A333 Gr.6 (Low-Temp CS)",
    plantLabel: "A333 Gr.6",
    stressMpa: 138,
    stressPsi: 20000,
    stressKsi: 20.0,
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
  if (value.includes("316l") || value.includes("tp316l")) return "tp316l";
  if (value.includes("a333") || value.includes("gr6") || value.includes("gr.6"))
    return "a333-6";
  if (value.includes("p22") || value.includes("a335p22")) return "p22";
  if (value.includes("304") || value.includes("tp304")) return "tp304l";
  if (value.includes("p11") || value.includes("a335")) return "p22";
  const exact = PIPE_THICKNESS_MATERIAL_PRESETS.find((item) => item.id === raw);
  return exact?.id;
}

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function defaultMechanicalAllowance(unitSystem: UnitSystem): number {
  return unitSystem === "metric" ? 1.5 : 0.063;
}

export function defaultDesignTemperature(unitSystem: UnitSystem): number {
  return unitSystem === "metric" ? 38 : 100;
}

export function jointEfficiencyForType(jointType: JointQualityId): number | undefined {
  const preset = JOINT_QUALITY_PRESETS.find((item) => item.id === jointType);
  return preset?.efficiency;
}

export function mapJointTypeFromEfficiency(efficiency: number): JointQualityId {
  const match = JOINT_QUALITY_PRESETS.find(
    (item) => Math.abs(item.efficiency - efficiency) < 0.001,
  );
  return match?.id ?? "custom";
}

/** Table 304.1.1-1 simplified — ferritic ≤900 °F / 482 °C; austenitic default 0.4. */
export function yCoefficientForDesign(
  designTemperature: number,
  unitSystem: UnitSystem,
  materialId?: string,
): number {
  const tempF =
    unitSystem === "imperial"
      ? finite(designTemperature)
      : (finite(designTemperature) * 9) / 5 + 32;
  const austenitic =
    materialId === "tp304l" ||
    materialId === "tp316l" ||
    (materialId?.includes("tp") ?? false);
  if (austenitic) return B31_3_Y_FERRITIC;
  if (tempF <= 900) return B31_3_Y_FERRITIC;
  if (tempF <= 1000) return 0.5;
  return 0.7;
}

function wallThicknessInUnit(wallMm: number, unitSystem: UnitSystem): number {
  return unitSystem === "metric" ? wallMm : wallMm / 25.4;
}

function wallThicknessToMm(wall: number, unitSystem: UnitSystem): number {
  return unitSystem === "metric" ? wall : wall * 25.4;
}

/**
 * Pressure design thickness without mechanical / corrosion allowance.
 * t = P D / (2 (S E + P Y))   ASME B31.3 §304.1.2(a)
 */
export function pressureDesignThickness(inputs: {
  designPressure: number;
  outsideDiameter: number;
  allowableStress: number;
  weldEfficiency: number;
  yCoefficient?: number;
}): number {
  const P = finite(inputs.designPressure);
  const D = finite(inputs.outsideDiameter);
  const S = finite(inputs.allowableStress);
  const E = finite(inputs.weldEfficiency);
  const Y = finite(inputs.yCoefficient ?? B31_3_Y_FERRITIC, B31_3_Y_FERRITIC);
  if (P <= 0 || D <= 0 || S <= 0 || E <= 0) return 0;
  const denominator = 2 * (S * E + P * Y);
  if (denominator <= 0) return 0;
  return (P * D) / denominator;
}

/**
 * Minimum required thickness with mechanical / corrosion allowance.
 * t_min = t + A
 */
export function minimumRequiredThickness(inputs: {
  designPressure: number;
  outsideDiameter: number;
  allowableStress: number;
  weldEfficiency: number;
  yCoefficient?: number;
  corrosionAllowance: number;
}): number {
  const allowance = Math.max(0, finite(inputs.corrosionAllowance));
  return pressureDesignThickness(inputs) + allowance;
}

/**
 * Nominal ordered thickness accounting for 12.5% mill tolerance.
 * t_nom_req = t_min / 0.875
 */
export function nominalRequiredThickness(inputs: {
  designPressure: number;
  outsideDiameter: number;
  allowableStress: number;
  weldEfficiency: number;
  yCoefficient?: number;
  corrosionAllowance: number;
}): number {
  const tMin = minimumRequiredThickness(inputs);
  if (tMin <= 0) return 0;
  return tMin / B31_3_MILL_TOLERANCE_FACTOR;
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
  return minimumRequiredThickness(inputs);
}

export type ScheduleThicknessResult = {
  schedule: string;
  wallMm: number;
  wall: number;
  standard: string;
};

export function findRecommendedSchedule(
  nps: string,
  nominalRequiredMm: number,
  unitSystem: UnitSystem,
): ScheduleThicknessResult | undefined {
  if (!nps || nominalRequiredMm <= 0) return undefined;
  const rows = [...listSchedulesForNps(nps)].sort(
    (a, b) =>
      scheduleRank(a.schedule) - scheduleRank(b.schedule) ||
      a.wallThicknessMm - b.wallThicknessMm,
  );
  const match = rows.find((row) => row.wallThicknessMm >= nominalRequiredMm);
  if (!match) return undefined;
  const entry = getPipeScheduleEntry(nps, match.schedule);
  const standard = entry
    ? match.schedule.toUpperCase().endsWith("S")
      ? "ASME B36.19M"
      : "ASME B36.10M"
    : "ASME B36.10M";
  return {
    schedule: match.schedule,
    wallMm: match.wallThicknessMm,
    wall: wallThicknessInUnit(match.wallThicknessMm, unitSystem),
    standard,
  };
}

export function evaluateScheduleCompliance(
  nps: string,
  schedule: string,
  nominalRequiredMm: number,
  unitSystem: UnitSystem,
): ScheduleThicknessResult | undefined {
  if (!nps || !schedule || nominalRequiredMm <= 0) return undefined;
  const entry = getPipeScheduleEntry(nps, schedule);
  if (!entry) return undefined;
  const standard = schedule.toUpperCase().endsWith("S")
    ? "ASME B36.19M"
    : "ASME B36.10M";
  return {
    schedule: entry.row.schedule,
    wallMm: entry.row.wallThicknessMm,
    wall: wallThicknessInUnit(entry.row.wallThicknessMm, unitSystem),
    standard,
  };
}

export function schedulePassesNominalRequirement(
  scheduleWallMm: number,
  nominalRequiredMm: number,
): boolean {
  return scheduleWallMm >= nominalRequiredMm && nominalRequiredMm > 0;
}

export function calculatePipeThickness(
  inputs: PipeThicknessInputs,
): CalculatorOutput {
  const unit = inputs.unitSystem === "metric" ? "mm" : "in";
  const pressureUnit = inputs.unitSystem === "metric" ? "MPa" : "psi";
  const tempUnit = inputs.unitSystem === "metric" ? "°C" : "°F";

  const yCoeff =
    inputs.yCoefficient ??
    yCoefficientForDesign(
      inputs.designTemperature,
      inputs.unitSystem,
      inputs.material,
    );

  const calcInputs = {
    designPressure: inputs.designPressure,
    outsideDiameter: inputs.outsideDiameter,
    allowableStress: inputs.allowableStress,
    weldEfficiency: inputs.weldEfficiency,
    yCoefficient: yCoeff,
    corrosionAllowance: inputs.corrosionAllowance,
  };

  const tPressure = pressureDesignThickness(calcInputs);
  const tMin = minimumRequiredThickness(calcInputs);
  const tNomReq = nominalRequiredThickness(calcInputs);
  const tNomReqMm = wallThicknessToMm(tNomReq, inputs.unitSystem);

  const scheduleEntry = evaluateScheduleCompliance(
    inputs.nps,
    inputs.schedule,
    tNomReqMm,
    inputs.unitSystem,
  );
  const recommended = findRecommendedSchedule(
    inputs.nps,
    tNomReqMm,
    inputs.unitSystem,
  );

  const scheduleWall =
    scheduleEntry?.wall ??
    Math.max(0, finite(inputs.actualThickness));
  const passesSchedule =
    scheduleEntry != null &&
    schedulePassesNominalRequirement(scheduleEntry.wallMm, tNomReqMm);

  const actualThickness = scheduleWall;
  const marginVsTm = actualThickness - tMin;
  const marginPercentTm =
    tMin > 0 ? (marginVsTm / tMin) * 100 : 0;
  const fillPercent = actualThickness > 0 ? 100 : 0;
  const limitPercent =
    actualThickness > 0
      ? Math.min(100, (tNomReq / actualThickness) * 100)
      : 0;

  const invalid =
    inputs.designPressure <= 0 ||
    inputs.outsideDiameter <= 0 ||
    inputs.allowableStress <= 0 ||
    inputs.weldEfficiency <= 0;

  const scheduleLabel = inputs.schedule
    ? `Sch ${scheduleEntry?.schedule ?? inputs.schedule}`
    : "—";
  const recommendedLabel = recommended
    ? `Sch ${recommended.schedule} (${recommended.standard})`
    : "—";

  return {
    heroLabel: "Required Nominal Thickness (t_nom_req)",
    heroValue: invalid ? "—" : `${tNomReq.toFixed(3)} ${unit}`,
    heroStatus: invalid
      ? "Enter positive P, D, and S — check inputs"
      : scheduleEntry
        ? passesSchedule
          ? `SAFE — ${scheduleLabel} meets ASME B36.10M / B36.19M requirement`
          : `INSUFFICIENT — ${scheduleLabel} below required nominal thickness`
        : passesSchedule
          ? "Within ASME B31.3 allowable thickness"
          : "Below required nominal thickness — review schedule",
    heroStatusLevel: invalid ? "warn" : passesSchedule ? "pass" : "fail",
    summary: [
      {
        label: "Pressure design t",
        value: invalid ? "—" : `${tPressure.toFixed(3)} ${unit}`,
      },
      {
        label: "Required t_min (with A)",
        value: invalid ? "—" : `${tMin.toFixed(3)} ${unit}`,
      },
      {
        label: "Required t_nom_req",
        value: invalid ? "—" : `${tNomReq.toFixed(3)} ${unit}`,
      },
      {
        label: "Selected schedule wall",
        value: scheduleEntry
          ? `${scheduleWall.toFixed(3)} ${unit}`
          : `${finite(inputs.actualThickness).toFixed(3)} ${unit}`,
      },
      {
        label: "Recommended minimum schedule",
        value: recommendedLabel,
      },
    ],
    summaryStatus: {
      label: invalid
        ? "Invalid design inputs"
        : passesSchedule
          ? "SAFE (PASS)"
          : "INSUFFICIENT (FAIL)",
      level: invalid ? "warn" : passesSchedule ? "pass" : "fail",
    },
    gauge: invalid
      ? undefined
      : {
          variant: "thickness-margin" as const,
          fillPercent,
          limitPercent,
          tMin: tNomReq,
          tActual: actualThickness,
          unit,
          minLabel: `0 ${unit}`,
          limitLabel: `${tNomReq.toFixed(2)} ${unit}`,
          maxLabel: `${actualThickness.toFixed(2)} ${unit}`,
          markerLabel: "t_nom_req",
          caption: passesSchedule
            ? `Safety margin: ${marginVsTm.toFixed(2)} ${unit} (${marginPercentTm.toFixed(0)}%)`
            : `Shortfall: ${Math.abs(marginVsTm).toFixed(2)} ${unit} — below t_m`,
          captionInfo:
            "Safety margin shows total excess wall thickness over minimum required thickness (t_m). Percentage is calculated relative to t_m.",
        },
    rows: [
      {
        label: "NPS / Schedule",
        value: inputs.nps
          ? `${inputs.nps}" · ${scheduleLabel}`
          : "—",
      },
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
        label: "Design temperature (T)",
        value: `${finite(inputs.designTemperature).toFixed(0)} ${tempUnit}`,
      },
      {
        label: "Allowable stress (S)",
        value: `${finite(inputs.allowableStress).toFixed(1)} ${pressureUnit}`,
      },
      {
        label: "Joint quality factor (E)",
        value: finite(inputs.weldEfficiency).toFixed(2),
      },
      {
        label: "Coefficient Y",
        value: yCoeff.toFixed(2),
      },
      {
        label: "Mechanical / corrosion allowance (A)",
        value: `${finite(inputs.corrosionAllowance).toFixed(3)} ${unit}`,
        highlight: "A",
      },
      {
        label: "Pressure design thickness (t)",
        value: invalid ? "—" : `${tPressure.toFixed(3)} ${unit}`,
        highlight: "t",
      },
      {
        label: "Required t_min (t + A)",
        value: invalid ? "—" : `${tMin.toFixed(3)} ${unit}`,
      },
      {
        label: "Required t_nom_req (t_min / 0.875)",
        value: invalid ? "—" : `${tNomReq.toFixed(3)} ${unit}`,
      },
      {
        label: "Schedule vs t_nom_req",
        value: invalid
          ? "—"
          : scheduleEntry
            ? passesSchedule
              ? "PASS"
              : "FAIL"
            : "—",
        warn: !passesSchedule && !invalid,
      },
    ],
    exportRows: [
      { label: "Standard", value: "ASME B31.3 §304.1.2" },
      { label: "Pressure design t", value: `${tPressure.toFixed(3)} ${unit}` },
      { label: "Required t_min", value: `${tMin.toFixed(3)} ${unit}` },
      { label: "Required t_nom_req", value: `${tNomReq.toFixed(3)} ${unit}` },
      { label: "Selected schedule", value: scheduleLabel },
      { label: "Recommended schedule", value: recommendedLabel },
      {
        label: "Design pressure",
        value: `${finite(inputs.designPressure).toFixed(2)} ${pressureUnit}`,
      },
      {
        label: "Outside diameter",
        value: `${finite(inputs.outsideDiameter).toFixed(2)} ${unit}`,
      },
      {
        label: "Schedule compliance",
        value: invalid ? "Invalid" : passesSchedule ? "Pass" : "Fail",
      },
    ],
  };
}

export const DEFAULT_PIPE_INPUTS: PipeThicknessInputs = {
  unitSystem: "metric",
  nps: "4",
  schedule: "40",
  outsideDiameter: 114.3,
  designPressure: 2.0,
  designTemperature: 38,
  allowableStress: 138,
  weldEfficiency: 1.0,
  jointType: "seamless",
  corrosionAllowance: 1.5,
  actualThickness: 6.02,
  yCoefficient: B31_3_Y_FERRITIC,
  material: "a106-b",
};
