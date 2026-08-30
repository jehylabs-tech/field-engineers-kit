import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import {
  getButtWeldFittingComponent,
  getButtWeldFittingData,
  getButtWeldFittingSize,
  getPipeScheduleEntry,
  resolveScheduleOptionValue,
} from "@/lib/data/loaders";
import { formatLength, formatWeight } from "@/utils/unitConverter";

export type ButtWeldFittingInputs = {
  unitSystem: UnitSystem;
  componentId: string;
  nps: string;
  schedule: string;
};

/** Prefer Sch 40 (≈ STD) when present for BW fitting screening. */
export const DEFAULT_BUTT_WELD_FITTING_INPUTS: ButtWeldFittingInputs = {
  unitSystem: "metric",
  componentId: "elbow_90_lr",
  nps: "4",
  schedule: "40",
};

function stickyDimLabel(dimensionLabel: string): string {
  return dimensionLabel.replace(/\s*\([^)]*\)\s*$/, "").trim() || dimensionLabel;
}

/** Fixed identity: ID = OD − 2t (mm). */
export function computeInsideDiameterMm(odMm: number, wallMm: number): number {
  return Math.max(0, odMm - 2 * wallMm);
}

/**
 * Scale STD-wall screening weight by wall ratio for the selected schedule.
 * weight ≈ weightKgStd × (t / t_ref) with t_ref from Sch 40 / STD.
 */
export function scaleFittingWeightKg(
  weightKgStd: number,
  wallMm: number,
  refWallMm: number,
): number {
  if (!(weightKgStd > 0) || !(wallMm > 0)) return 0;
  const ref = refWallMm > 0 ? refWallMm : wallMm;
  return weightKgStd * (wallMm / ref);
}

export function calculateButtWeldFitting(
  inputs: ButtWeldFittingInputs,
): CalculatorOutput {
  const component = getButtWeldFittingComponent(inputs.componentId);
  const size = getButtWeldFittingSize(inputs.componentId, inputs.nps);
  const schedule = resolveScheduleOptionValue(inputs.nps, inputs.schedule);
  const pipe = getPipeScheduleEntry(inputs.nps, schedule);
  const refPipe =
    getPipeScheduleEntry(inputs.nps, "40") ??
    getPipeScheduleEntry(inputs.nps, "STD") ??
    pipe;

  if (!component || !size || !pipe) {
    return {
      heroLabel: "Center-to-end",
      heroValue: "—",
      heroStatus: "Select a valid component, NPS, and schedule",
      heroStatusLevel: "warn",
      summary: [
        { label: "Center-to-end", value: "—" },
        { label: "Wall thickness", value: "—" },
        { label: "Weight", value: "—" },
      ],
      summaryStatus: {
        label: "No matching B16.9 / pipe schedule combination",
        level: "warn",
      },
      rows: [],
      exportRows: [],
    };
  }

  const odMm = pipe.pipe.outsideDiameterMm;
  const wallMm = pipe.row.wallThicknessMm;
  const idMm = computeInsideDiameterMm(odMm, wallMm);
  const refWall = refPipe?.row.wallThicknessMm || wallMm;
  const weightKg = scaleFittingWeightKg(size.weightKgStd, wallMm, refWall);

  const primary = formatLength(size.dimensionMm, inputs.unitSystem);
  const od = formatLength(odMm, inputs.unitSystem);
  const id = formatLength(idMm, inputs.unitSystem);
  const wall = formatLength(wallMm, inputs.unitSystem, 2);
  const weight = formatWeight(weightKg, inputs.unitSystem);
  const barLabel = stickyDimLabel(component.dimensionLabel);
  const dimKey = component.heroSymbol;

  return {
    heroLabel: component.dimensionLabel,
    heroValue: primary,
    heroStatus: `${component.label} · ${size.npsLabel} · Sch ${schedule}`,
    heroStatusLevel: "neutral",
    summary: [
      { label: barLabel, value: primary },
      { label: "Wall thickness", value: wall },
      { label: "Weight", value: weight },
    ],
    summaryStatus: {
      label: `ASME B16.9 · bevel ${getButtWeldFittingData().bevelAngleDeg}°`,
      level: "neutral",
    },
    rows: [
      { label: "Standard", value: "ASME B16.9 (BW Fittings)" },
      { label: "Component", value: component.label },
      { label: "Nominal pipe size (NPS)", value: size.npsLabel },
      { label: "DN", value: `DN ${size.dn}` },
      { label: "Pipe schedule", value: `Sch ${schedule}` },
      {
        label: component.dimensionLabel,
        value: primary,
        highlight: dimKey,
        emphasis: true,
      },
      {
        label: "Outside diameter at bevel (OD)",
        value: od,
        highlight: "OD",
      },
      {
        label: "Inside diameter (ID)",
        value: id,
        highlight: "ID",
      },
      {
        label: "Wall thickness (t)",
        value: wall,
        highlight: "t",
      },
      { label: "Approximate weight", value: weight },
    ],
    exportRows: [
      { label: "Standard", value: "ASME B16.9" },
      { label: "Component", value: component.label },
      { label: "NPS", value: size.npsLabel },
      { label: "Schedule", value: schedule },
      { label: component.dimensionLabel, value: primary },
      { label: "OD at bevel", value: od },
      { label: "ID", value: id },
      { label: "Wall thickness", value: wall },
      { label: "Approximate weight", value: weight },
    ],
  };
}
