import type {
  CalculatorOutput,
  ResultRow,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  facingLabel,
  isRtjClass,
  resolveFacing,
  studLengthDeltaMm,
  type FacingId,
} from "@/lib/calculators/engines/flange-options";
import {
  getFlangeDimensionEntry,
  listFlangeClassesForNps,
  listFlangeNps,
} from "@/lib/data/loaders";
import { formatLength } from "@/utils/unitConverter";

export type BoltWrenchLookupInputs = {
  unitSystem: UnitSystem;
  nps: string;
  pressureClass: string;
  facing?: FacingId | string;
};

export const DEFAULT_BOLT_WRENCH_LOOKUP_INPUTS: BoltWrenchLookupInputs = {
  unitSystem: "imperial",
  nps: "4",
  pressureClass: "300",
  facing: "rf",
};

/** High-traffic NPS order for the in-app Class wrench chart. */
const CHART_NPS_ORDER = [
  "0.5",
  "0.75",
  "1",
  "1.25",
  "1.5",
  "2",
  "2.5",
  "3",
  "3.5",
  "4",
  "5",
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "18",
  "20",
  "24",
];

/** UNC / 8-UN TPI for common B16.5 stud diameters (ASME B1.1 practice). */
const STUD_TPI: Record<string, { tpi: number; series: string }> = {
  "1/2": { tpi: 13, series: "UNC" },
  "5/8": { tpi: 11, series: "UNC" },
  "3/4": { tpi: 10, series: "UNC" },
  "7/8": { tpi: 9, series: "UNC" },
  "1": { tpi: 8, series: "8-UN" },
  "1-1/8": { tpi: 8, series: "8-UN" },
  "1-1/4": { tpi: 8, series: "8-UN" },
  "1-3/8": { tpi: 8, series: "8-UN" },
  "1-1/2": { tpi: 8, series: "8-UN" },
  "1-5/8": { tpi: 8, series: "8-UN" },
  "1-3/4": { tpi: 8, series: "8-UN" },
  "1-7/8": { tpi: 8, series: "8-UN" },
  "2": { tpi: 8, series: "8-UN" },
  "2-1/4": { tpi: 8, series: "8-UN" },
  "2-1/2": { tpi: 8, series: "8-UN" },
  "2-3/4": { tpi: 8, series: "8-UN" },
  "3": { tpi: 8, series: "8-UN" },
};

export type BoltWrenchChartRow = {
  nps: string;
  npsLabel: string;
  boltCount: number;
  studDiameterIn: string;
  wrenchAfIn: string;
  wrenchAfMm: number;
  bcdMm: number;
};

/** Parse inch fraction strings like `3/4`, `1-1/4`, `1`. */
export function parseInchFraction(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const compound = raw.match(/^(\d+)\s*-\s*(\d+)\s*\/\s*(\d+)$/);
  if (compound) {
    const whole = Number(compound[1]);
    const num = Number(compound[2]);
    const den = Number(compound[3]);
    if (den === 0) return null;
    return whole + num / den;
  }
  const simple = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (simple) {
    const num = Number(simple[1]);
    const den = Number(simple[2]);
    if (den === 0) return null;
    return num / den;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * ASME B18.2.2 heavy hex nut across-flats screening:
 * W = 1.5 × d_b + 1/8 in
 */
export function heavyHexWrenchIn(studDiameterIn: number): number {
  return 1.5 * studDiameterIn + 0.125;
}

export function boltCirclePitchMm(bcdMm: number, boltCount: number): number {
  if (boltCount <= 0) return 0;
  return (Math.PI * bcdMm) / boltCount;
}

/**
 * Size chart for one pressure class — primary field scan surface for this lookup tool.
 * Rows follow B16.5 flangeDimension.json (same source as live selection).
 */
export function listBoltWrenchChartForClass(
  pressureClass: string,
): BoltWrenchChartRow[] {
  const order = new Map(CHART_NPS_ORDER.map((nps, i) => [nps, i]));
  const rows: BoltWrenchChartRow[] = [];

  for (const flange of listFlangeNps()) {
    if (!listFlangeClassesForNps(flange.nps).some((r) => r.class === pressureClass)) {
      continue;
    }
    const entry = getFlangeDimensionEntry(flange.nps, pressureClass);
    if (!entry) continue;
    const { rating } = entry;
    rows.push({
      nps: flange.nps,
      npsLabel: flange.npsLabel,
      boltCount: rating.boltHoleCount,
      studDiameterIn: rating.studDiameterIn,
      wrenchAfIn: rating.wrenchAfIn,
      wrenchAfMm: rating.wrenchAfMm,
      bcdMm: rating.boltCircleMm,
    });
  }

  return rows.sort((a, b) => {
    const ia = order.get(a.nps) ?? 999;
    const ib = order.get(b.nps) ?? 999;
    if (ia !== ib) return ia - ib;
    return Number(a.nps) - Number(b.nps);
  });
}

function formatDim(mm: number, unitSystem: UnitSystem): string {
  return formatLength(mm, unitSystem, unitSystem === "metric" ? 1 : 2);
}

function threadLabel(studDiameterIn: string): string {
  const row = STUD_TPI[studDiameterIn];
  if (!row) return "Confirm UNC / 8-UN chart";
  return `${row.tpi} ${row.series}`;
}

export function calculateBoltWrenchLookup(
  inputs: BoltWrenchLookupInputs,
): CalculatorOutput {
  const facing = resolveFacing(inputs.facing, inputs.pressureClass);
  const entry = getFlangeDimensionEntry(inputs.nps, inputs.pressureClass);

  if (!entry) {
    return {
      heroLabel: "Wrench / spanner size",
      heroValue: "—",
      heroStatus: "Select a valid NPS and pressure class (ASME B16.5 table)",
      heroStatusLevel: "warn",
      summary: [
        { label: "NPS", value: inputs.nps ? `${inputs.nps}"` : "—" },
        {
          label: "Class",
          value: inputs.pressureClass ? `${inputs.pressureClass}#` : "—",
        },
      ],
      summaryStatus: {
        label: "No matching B16.5 bolt row",
        level: "warn",
      },
      rows: [],
      exportRows: [],
    };
  }

  const { flange, rating, standard } = entry;
  const studDelta = studLengthDeltaMm(facing, rating.class);
  const studLengthMm = Math.max(
    40,
    Math.round((rating.studLengthMm + studDelta) / 5) * 5,
  );
  const pitchMm = boltCirclePitchMm(rating.boltCircleMm, rating.boltHoleCount);
  const dbIn = parseInchFraction(rating.studDiameterIn);
  const formulaWrenchIn = dbIn != null ? heavyHexWrenchIn(dbIn) : null;
  const tableWrenchIn = parseInchFraction(rating.wrenchAfIn);
  const formulaMismatch =
    formulaWrenchIn != null &&
    tableWrenchIn != null &&
    Math.abs(formulaWrenchIn - tableWrenchIn) > 0.03;

  // Always show both AF units in the hero — field techs need imperial + metric sockets.
  const wrenchBoth = `${rating.wrenchAfIn} in · ${rating.wrenchAfMm} mm`;
  const boltDia =
    inputs.unitSystem === "metric" && dbIn != null
      ? `${(dbIn * 25.4).toFixed(1)} mm (${rating.studDiameterIn} in)`
      : `${rating.studDiameterIn} in${dbIn != null ? ` (${dbIn.toFixed(3)} in)` : ""}`;

  const rows: ResultRow[] = [
    {
      label: "Stud bolt diameter (d_b)",
      value: boltDia,
      section: "Bolting",
    },
    {
      label: "Bolt count (N)",
      value: String(rating.boltHoleCount),
      section: "Bolting",
    },
    {
      label: "Recommended stud length",
      value: formatDim(studLengthMm, inputs.unitSystem),
      section: "Bolting",
    },
    {
      label: "Thread (TPI)",
      value: threadLabel(rating.studDiameterIn),
      section: "Bolting",
    },
    {
      label: "Bolt circle diameter (BCD)",
      value: formatDim(rating.boltCircleMm, inputs.unitSystem),
      section: "Flange bolt pattern",
    },
    {
      label: "Bolt hole diameter",
      value: formatDim(rating.boltHoleDiameterMm, inputs.unitSystem),
      section: "Flange bolt pattern",
    },
    {
      label: "Circumferential pitch (P_c)",
      value: formatDim(pitchMm, inputs.unitSystem),
      section: "Flange bolt pattern",
    },
  ];

  const callouts: CalculatorOutput["callouts"] = [
    {
      tone: "warn",
      title: "Heavy hex nuts only (ASME B16.5 / B18.2.2)",
      body: "B16.5 flanges use heavy hex nuts. Standard commercial hex AF is smaller — wrong wrench size and under-torqued joints.",
    },
    {
      tone: "info",
      title: "Metric socket is an equivalent",
      body: `Tabulated heavy-hex AF is ${rating.wrenchAfIn}" → ${rating.wrenchAfMm} mm. Confirm clearance at the hub before using impact sockets.`,
    },
  ];

  if (facing === "rtj") {
    callouts.push({
      tone: "info",
      title: "RTJ stud length allowance",
      body: "Stud length includes RTJ groove / ring allowance vs RF table length. Confirm B16.5 Appendix / vendor stud charts before PO.",
    });
  } else if (facing === "ff") {
    callouts.push({
      tone: "info",
      title: "FF stud length",
      body: "Flat-face joints omit raised-face height — stud length is shorter than the RF table baseline.",
    });
  }

  if (formulaWrenchIn != null) {
    callouts.push({
      tone: formulaMismatch ? "warn" : "info",
      title: formulaMismatch
        ? "Table AF differs from 1.5·d_b+1/8 screening"
        : "Heavy hex AF check",
      body: formulaMismatch
        ? `Screening W ≈ ${formulaWrenchIn.toFixed(3)} in vs table ${rating.wrenchAfIn}". Use the **table AF** for tool selection.`
        : `Screening W ≈ 1.5·d_b + 1/8" = ${formulaWrenchIn.toFixed(3)} in matches table ${rating.wrenchAfIn}".`,
    });
  }

  return {
    heroLabel: "Wrench / spanner size (heavy hex)",
    heroValue: wrenchBoth,
    heroStatus: `${flange.npsLabel} Class ${rating.class} ${facingLabel(facing)} · ${rating.boltHoleCount} × ${rating.studDiameterIn}" · ${standard}`,
    heroStatusLevel: "pass",
    heroBadges: [
      { label: "Bolts", value: `${rating.boltHoleCount} × ${rating.studDiameterIn}"` },
      { label: "Face", value: facing.toUpperCase() },
      {
        label: "Stud L",
        value: formatDim(studLengthMm, inputs.unitSystem),
      },
    ],
    summary: [
      { label: "Wrench", value: wrenchBoth },
      { label: "Bolts", value: `${rating.boltHoleCount} × ${rating.studDiameterIn}"` },
      { label: "Stud L", value: formatDim(studLengthMm, inputs.unitSystem) },
      { label: "BCD", value: formatDim(rating.boltCircleMm, inputs.unitSystem) },
    ],
    summaryStatus: {
      label: "Heavy hex AF — B16.5 / B18.2.2 screening",
      level: "pass",
    },
    rows,
    callouts,
    exportRows: [
      { label: "NPS", value: flange.npsLabel },
      { label: "Class", value: String(rating.class) },
      { label: "Facing", value: facingLabel(facing) },
      { label: "Wrench AF (in)", value: rating.wrenchAfIn },
      { label: "Wrench AF (mm)", value: String(rating.wrenchAfMm) },
      { label: "Stud diameter", value: `${rating.studDiameterIn} in` },
      { label: "Bolt count", value: String(rating.boltHoleCount) },
      {
        label: "Stud length",
        value: formatDim(studLengthMm, inputs.unitSystem),
      },
      {
        label: "BCD",
        value: formatDim(rating.boltCircleMm, inputs.unitSystem),
      },
      {
        label: "Bolt hole",
        value: formatDim(rating.boltHoleDiameterMm, inputs.unitSystem),
      },
      {
        label: "Pitch P_c",
        value: formatDim(pitchMm, inputs.unitSystem),
      },
      { label: "Thread", value: threadLabel(rating.studDiameterIn) },
    ],
  };
}

export { isRtjClass };
