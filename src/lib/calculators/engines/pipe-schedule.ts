import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import { isStainlessSchedule } from "@/lib/data/b36-19-schedules";
import { getPipeScheduleEntry } from "@/lib/data/loaders";
import { formatLength, formatWeight, formatWeightPerLength } from "@/utils/unitConverter";

export type PipeScheduleInputs = {
  unitSystem: UnitSystem;
  nps: string;
  schedule: string;
  length?: number;
  quantity?: number;
};

const FT_TO_M = 0.3048;

function pipeLengthMeters(length: number | undefined, unitSystem: UnitSystem): number {
  if (!Number.isFinite(length) || length === undefined || length < 0) return 0;
  return unitSystem === "imperial" ? length * FT_TO_M : length;
}

export function calculatePipeSchedule(
  inputs: PipeScheduleInputs,
): CalculatorOutput {
  const entry = getPipeScheduleEntry(inputs.nps, inputs.schedule);

  if (!entry) {
    return {
      heroLabel: "Pipe Dimensions",
      heroValue: "—",
      heroStatus: "Select a valid NPS and schedule combination",
      heroStatusLevel: "warn",
      summary: [
        { label: "NPS", value: inputs.nps ? `${inputs.nps}"` : "—" },
        { label: "Schedule", value: inputs.schedule || "—" },
      ],
      summaryStatus: {
        label: "No matching data in reference table",
        level: "warn",
      },
      rows: [],
      exportRows: [],
    };
  }

  const { pipe, row } = entry;
  const od = formatLength(pipe.outsideDiameterMm, inputs.unitSystem);
  const id = formatLength(row.insideDiameterMm, inputs.unitSystem);
  const wall = formatLength(row.wallThicknessMm, inputs.unitSystem);
  const weight = formatWeightPerLength(row.weightKgPerM, inputs.unitSystem);
  const standard = isStainlessSchedule(row.schedule)
    ? "ASME B36.19M"
    : "ASME B36.10M";
  const lengthM = pipeLengthMeters(inputs.length, inputs.unitSystem);
  const quantity =
    Number.isFinite(inputs.quantity) && (inputs.quantity ?? 0) > 0
      ? Math.floor(inputs.quantity ?? 1)
      : 1;
  const totalKg = row.weightKgPerM * lengthM * quantity;
  const lengthLabel =
    inputs.unitSystem === "imperial"
      ? `${Number(inputs.length ?? 0).toFixed(2)} ft`
      : `${Number(inputs.length ?? 0).toFixed(2)} m`;
  const totalWeight = formatWeight(totalKg, inputs.unitSystem);

  return {
    heroLabel: "Nominal Wall Thickness",
    heroValue: wall,
    heroStatus: `${pipe.npsLabel} · Sch ${row.schedule} · ${standard}`,
    heroStatusLevel: "neutral",
    summary: [
      { label: "Outside diameter", value: od },
      { label: "Inside diameter", value: id },
      { label: "Total weight", value: totalWeight },
    ],
    summaryStatus: {
      label: "Reference table lookup — verify for procurement",
      level: "neutral",
    },
    rows: [
      { label: "Nominal pipe size (NPS)", value: pipe.npsLabel },
      { label: "DN", value: `DN ${pipe.dn}` },
      { label: "Schedule", value: `Sch ${row.schedule}` },
      { label: "Outside diameter (OD)", value: od, highlight: "od" },
      { label: "Inside diameter (ID)", value: id, highlight: "id" },
      { label: "Wall thickness (t)", value: wall, highlight: "t" },
      { label: "Unit weight", value: weight },
      { label: "Pipe length", value: lengthLabel },
      { label: "Quantity (pcs)", value: String(quantity) },
      { label: "Total weight", value: totalWeight },
    ],
    exportRows: [
      { label: "Standard", value: standard },
      { label: "NPS", value: pipe.npsLabel },
      { label: "Schedule", value: row.schedule },
      { label: "Outside diameter", value: od },
      { label: "Inside diameter", value: id },
      { label: "Wall thickness", value: wall },
      { label: "Unit weight", value: weight },
      { label: "Pipe length", value: lengthLabel },
      { label: "Quantity (pcs)", value: String(quantity) },
      { label: "Total weight", value: totalWeight },
    ],
  };
}

export const DEFAULT_PIPE_SCHEDULE_INPUTS: PipeScheduleInputs = {
  unitSystem: "metric",
  nps: "4",
  schedule: "40",
  length: 6,
  quantity: 1,
};
