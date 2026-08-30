import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import { getBoltTorqueEntry } from "@/lib/data/loaders";
import { formatTorque } from "@/utils/unitConverter";

/** Nut factor presets (PCC-1 style field screening). */
export type BoltLubricantId = "moly" | "dry" | "ptfe";

export type BoltGradeId = "b7" | "b8" | "b8m";

export type BoltTorqueInputs = {
  unitSystem: UnitSystem;
  nps: string;
  pressureClass: string;
  lubricant: BoltLubricantId;
  boltGrade: BoltGradeId;
};

/** Table torque assumes moly anti-seize at this reference K. */
export const BOLT_K_REF = 0.13;

export const BOLT_LUBRICANT_OPTIONS: {
  value: BoltLubricantId;
  label: string;
  k: number;
}[] = [
  {
    value: "moly",
    label: "Moly-based anti-seize (K = 0.13)",
    k: 0.13,
  },
  {
    value: "dry",
    label: "Dry / Lightly Oiled Steel (K = 0.20)",
    k: 0.2,
  },
  {
    value: "ptfe",
    label: "PTFE / Teflon Coated (K = 0.11)",
    k: 0.11,
  },
];

export const BOLT_GRADE_OPTIONS: {
  value: BoltGradeId;
  label: string;
  /** Relative to A193 B7 table baseline (stress / preload limit). */
  factor: number;
}[] = [
  { value: "b7", label: "A193 B7", factor: 1 },
  { value: "b8", label: "A193 B8 Class 2", factor: 0.85 },
  { value: "b8m", label: "A193 B8M Class 2", factor: 0.85 },
];

export function resolveLubricant(id: BoltLubricantId) {
  return (
    BOLT_LUBRICANT_OPTIONS.find((item) => item.value === id) ??
    BOLT_LUBRICANT_OPTIONS[0]!
  );
}

export function resolveBoltGrade(id: BoltGradeId) {
  return (
    BOLT_GRADE_OPTIONS.find((item) => item.value === id) ??
    BOLT_GRADE_OPTIONS[0]!
  );
}

/** Scale tabulated moly torque by selected K and bolt grade. */
export function adjustedTorqueNm(
  baseNm: number,
  lubricant: BoltLubricantId,
  boltGrade: BoltGradeId,
): number {
  const k = resolveLubricant(lubricant).k;
  const grade = resolveBoltGrade(boltGrade).factor;
  const scaled = baseNm * (k / BOLT_K_REF) * grade;
  return Number.isFinite(scaled) && scaled > 0 ? scaled : 0;
}

const PASS_PLAN = [
  { label: "Round 1 (30% Target Torque)", fraction: 0.3 },
  { label: "Round 2 (60% Target Torque)", fraction: 0.6 },
  { label: "Round 3 (100% Target Torque)", fraction: 1 },
  { label: "Round 4 (100% Circular Check)", fraction: 1 },
] as const;

export function calculateBoltTorque(inputs: BoltTorqueInputs): CalculatorOutput {
  const entry = getBoltTorqueEntry(inputs.nps, inputs.pressureClass);
  const lubricant = resolveLubricant(inputs.lubricant);
  const grade = resolveBoltGrade(inputs.boltGrade);

  if (!entry) {
    return {
      heroLabel: "Recommended Torque",
      heroValue: "—",
      heroStatus: "Select a valid NPS and pressure class combination",
      heroStatusLevel: "warn",
      summary: [
        { label: "NPS", value: inputs.nps ? `${inputs.nps}"` : "—" },
        { label: "Class", value: inputs.pressureClass ? `${inputs.pressureClass}#` : "—" },
      ],
      summaryStatus: {
        label: "No matching data in reference table",
        level: "warn",
      },
      rows: [],
      exportRows: [],
    };
  }

  const { size, rating, standard } = entry;
  const finalNm = adjustedTorqueNm(
    rating.torqueNm,
    inputs.lubricant,
    inputs.boltGrade,
  );
  const torque = formatTorque(finalNm, inputs.unitSystem);

  const passRows = PASS_PLAN.map((pass) => ({
    label: pass.label,
    value: formatTorque(finalNm * pass.fraction, inputs.unitSystem),
    section: "Assembly torque passes (ASME PCC-1)",
  }));

  return {
    heroLabel: "Recommended Assembly Torque",
    heroValue: torque,
    heroStatus: `${size.npsLabel} · Class ${rating.class} · ${rating.studSize} · K = ${lubricant.k.toFixed(2)}`,
    heroStatusLevel: "neutral",
    summary: [
      { label: "Final torque", value: torque },
      { label: "Studs", value: `${rating.boltCount} × ${rating.studSize}` },
    ],
    summaryStatus: {
      label: `${grade.label} · ${lubricant.label.split(" (")[0]} — verify with project spec`,
      level: "neutral",
    },
    rows: [
      {
        label: "Nominal pipe size (NPS)",
        value: size.npsLabel,
        section: "Joint selection",
      },
      { label: "DN", value: `DN ${size.dn}`, section: "Joint selection" },
      {
        label: "Pressure class",
        value: `Class ${rating.class}`,
        section: "Joint selection",
      },
      {
        label: "Stud bolt size",
        value: rating.studSize,
        section: "Joint selection",
      },
      {
        label: "Number of studs",
        value: String(rating.boltCount),
        section: "Joint selection",
      },
      {
        label: "Bolt grade",
        value: grade.label,
        section: "Joint selection",
      },
      {
        label: "Lubricant / nut factor K",
        value: `K = ${lubricant.k.toFixed(2)} (${lubricant.label.split(" (")[0]})`,
        section: "Joint selection",
      },
      {
        label: "Final assembly torque",
        value: torque,
        section: "Joint selection",
      },
      {
        label: "Tightening sequence",
        value: rating.tighteningPattern,
        section: "Joint selection",
      },
      ...passRows,
    ],
    exportRows: [
      { label: "Standard", value: standard },
      { label: "NPS", value: size.npsLabel },
      { label: "Pressure class", value: rating.class },
      { label: "Stud size", value: rating.studSize },
      { label: "Bolt count", value: String(rating.boltCount) },
      { label: "Bolt grade", value: grade.label },
      { label: "Nut factor K", value: String(lubricant.k) },
      { label: "Final torque", value: torque },
      ...PASS_PLAN.map((pass) => ({
        label: pass.label,
        value: formatTorque(finalNm * pass.fraction, inputs.unitSystem),
      })),
      { label: "Tightening sequence", value: rating.tighteningPattern },
    ],
  };
}

export const DEFAULT_BOLT_TORQUE_INPUTS: BoltTorqueInputs = {
  unitSystem: "metric",
  nps: "4",
  pressureClass: "150",
  lubricant: "moly",
  boltGrade: "b7",
};
