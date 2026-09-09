import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import { getBoltTorqueEntry } from "@/lib/data/loaders";
import { formatTorque } from "@/utils/unitConverter";

/** Common ASME B16.5 / B16.47 bolt-circle counts. */
export const BOLT_SEQUENCE_COUNTS = [
  4, 8, 12, 16, 20, 24, 32, 36, 40, 48, 56, 64,
] as const;

export type BoltSequenceCount = (typeof BOLT_SEQUENCE_COUNTS)[number];

export type BoltSequencePattern = "star" | "circular";

export type BoltSequenceInputs = {
  boltCount: number;
  pattern: BoltSequencePattern;
  /** Optional ASME B16.5 / B16.47 helper — empty string = none. */
  nps: string;
  pressureClass: string;
  /**
   * Optional target assembly torque in N·m (0 = unset).
   * Used only to screen Round 1–4 wrench values.
   */
  targetTorqueNm: number;
};

export const DEFAULT_BOLT_SEQUENCE_INPUTS: BoltSequenceInputs = {
  boltCount: 8,
  pattern: "star",
  nps: "",
  pressureClass: "",
  targetTorqueNm: 0,
};

export const PCC1_ROUND_FRACTIONS = [0.3, 0.6, 1, 1] as const;

export const PCC1_ROUNDS = [
  {
    round: 1,
    torquePct: "30%",
    fraction: 0.3,
    pattern: "star" as const,
    summary: "Snug to ~30% of target torque using the star/cross sequence.",
  },
  {
    round: 2,
    torquePct: "60%",
    fraction: 0.6,
    pattern: "star" as const,
    summary: "Increase to ~60% of target torque on the same star sequence.",
  },
  {
    round: 3,
    torquePct: "100%",
    fraction: 1,
    pattern: "star" as const,
    summary: "Bring each bolt to 100% target torque in star order.",
  },
  {
    round: 4,
    torquePct: "100%",
    fraction: 1,
    pattern: "circular" as const,
    summary:
      "Final circular clockwise pass at 100% until nuts no longer rotate.",
  },
] as const;

export function isBoltSequenceCount(value: number): value is BoltSequenceCount {
  return (BOLT_SEQUENCE_COUNTS as readonly number[]).includes(value);
}

/**
 * Order of group-start bolts for the legacy PCC-1 cross-pattern.
 * Groups of four: start, opposite (+N/2), +N/4, +3N/4.
 */
function orderGroupStarts(groupCount: number): number[] {
  if (groupCount <= 1) return [1];
  if (groupCount === 2) return [1, 2];
  if (groupCount === 3) return [1, 2, 3];
  if (groupCount % 4 === 0) {
    return generateStarSequence(groupCount);
  }
  if (groupCount % 2 === 0) {
    const half = groupCount / 2;
    const out: number[] = [];
    for (let i = 1; i <= half; i += 1) {
      out.push(i, i + half);
    }
    return out;
  }
  return Array.from({ length: groupCount }, (_, i) => i + 1);
}

/**
 * ASME PCC-1 style star/cross sequence.
 * Bolt 1 at top; remaining bolts numbered clockwise.
 */
export function generateStarSequence(boltCount: number): number[] {
  if (!Number.isInteger(boltCount) || boltCount < 4 || boltCount % 2 !== 0) {
    return [];
  }
  if (boltCount === 4) return [1, 3, 2, 4];

  if (boltCount % 4 !== 0) {
    const half = boltCount / 2;
    const seq: number[] = [];
    for (let i = 1; i <= half; i += 1) {
      seq.push(i, i + half);
    }
    return seq;
  }

  const half = boltCount / 2;
  const quarter = boltCount / 4;
  const starts = orderGroupStarts(quarter);
  const seq: number[] = [];
  for (const start of starts) {
    seq.push(start, start + half, start + quarter, start + half + quarter);
  }
  return seq;
}

/** Clockwise circular pass: 1 → 2 → … → N. */
export function generateCircularSequence(boltCount: number): number[] {
  if (!Number.isInteger(boltCount) || boltCount < 4) return [];
  return Array.from({ length: boltCount }, (_, i) => i + 1);
}

export function generateBoltSequence(
  boltCount: number,
  pattern: BoltSequencePattern,
): number[] {
  return pattern === "circular"
    ? generateCircularSequence(boltCount)
    : generateStarSequence(boltCount);
}

export function formatSequenceArrowText(sequence: number[]): string {
  return sequence.join(" → ");
}

export function sequenceTitle(
  boltCount: number,
  pattern: BoltSequencePattern,
): string {
  if (pattern === "circular") {
    return `${boltCount}-Bolt Circular Pattern`;
  }
  return boltCount === 4
    ? `${boltCount}-Bolt Cross Pattern`
    : `${boltCount}-Bolt Star Pattern`;
}

/** Resolve bolt count from B16.5 / B16.47 joint table when NPS × class is set. */
export function boltCountFromFlangePreset(
  nps: string,
  pressureClass: string,
): number | undefined {
  if (!nps || !pressureClass) return undefined;
  const entry = getBoltTorqueEntry(nps, pressureClass);
  return entry?.rating.boltCount;
}

export function calculateBoltSequence(
  inputs: BoltSequenceInputs,
  unitSystem: UnitSystem = "metric",
): CalculatorOutput {
  const boltCount = Number.isFinite(inputs.boltCount)
    ? Math.round(inputs.boltCount)
    : 0;
  const pattern = inputs.pattern === "circular" ? "circular" : "star";
  const sequence = generateBoltSequence(boltCount, pattern);
  const valid = sequence.length === boltCount && boltCount >= 4;
  const title = sequenceTitle(boltCount, pattern);
  const arrow = valid ? formatSequenceArrowText(sequence) : "—";
  const presetCount = boltCountFromFlangePreset(
    inputs.nps,
    inputs.pressureClass,
  );
  const flangeNote =
    inputs.nps && inputs.pressureClass
      ? presetCount != null
        ? `NPS ${inputs.nps}" Class ${inputs.pressureClass} → ${presetCount} bolts (B16.5/B16.47)`
        : `NPS ${inputs.nps}" Class ${inputs.pressureClass} — no bolt table row`
      : "Manual bolt count";
  const tNm =
    Number.isFinite(inputs.targetTorqueNm) && inputs.targetTorqueNm > 0
      ? inputs.targetTorqueNm
      : 0;
  const hasTorque = tNm > 0;

  const roundRows = PCC1_ROUNDS.map((r) => {
    const torqueText = hasTorque
      ? `${r.torquePct} · ${formatTorque(tNm * r.fraction, unitSystem)} · ${
          r.pattern === "star" ? "star/cross" : "circular"
        }`
      : `${r.torquePct} target · ${
          r.pattern === "star" ? "star/cross" : "circular"
        }`;
    return {
      label: `Round ${r.round}`,
      value: torqueText,
      section: "PCC-1 tightening rounds",
    };
  });

  return {
    heroLabel: title,
    heroValue: valid ? arrow : "—",
    heroStatus: valid
      ? `ASME PCC-1 ${pattern === "star" ? "star/cross" : "circular"} · numbered clockwise from top`
      : "Select a supported bolt count (4–64, even)",
    heroStatusLevel: valid ? "pass" : "warn",
    heroBadges: valid
      ? [
          { label: "Bolts", value: String(boltCount) },
          {
            label: "Mode",
            value: pattern === "star" ? "Star / cross" : "Circular",
          },
          ...(hasTorque
            ? [{ label: "T", value: formatTorque(tNm, unitSystem) }]
            : []),
        ]
      : undefined,
    summary: [
      { label: "Bolt count", value: valid ? String(boltCount) : "—" },
      {
        label: "Pattern",
        value: pattern === "star" ? "Star / cross" : "Circular",
      },
      ...(hasTorque
        ? [{ label: "Target T", value: formatTorque(tNm, unitSystem) }]
        : [{ label: "Flange preset", value: flangeNote }]),
    ],
    summaryStatus: {
      label: valid ? `${title} ready` : "Invalid bolt count",
      level: valid ? "pass" : "warn",
    },
    rows: [
      { label: "Bolt count", value: valid ? String(boltCount) : "—" },
      {
        label: "Pattern mode",
        value:
          pattern === "star"
            ? "Star / cross (PCC-1)"
            : "Circular / sequential",
      },
      { label: "Sequence", value: arrow, emphasis: true },
      ...(hasTorque
        ? [
            {
              label: "Target assembly torque (T)",
              value: formatTorque(tNm, unitSystem),
              section: "PCC-1 tightening rounds",
            },
          ]
        : []),
      ...roundRows,
      {
        label: "Flange helper",
        value: flangeNote,
        section: "Joint helper",
      },
    ],
    callouts: [
      {
        tone: "info",
        title: "ASME PCC-1 assembly rounds",
        body: hasTorque
          ? `Round wrench targets below use T = ${formatTorque(tNm, unitSystem)}. Confirm against the owner’s PCC-1 procedure or the FEK Bolt Torque calculator.`
          : "Use star/cross for Rounds 1–3, then a continuous circular check pass at 100% target torque. Enter optional Target T above for Round 1–4 wrench values, or open the FEK Bolt Torque calculator.",
        items: PCC1_ROUNDS.map((r) =>
          hasTorque
            ? `Round ${r.round}: ${formatTorque(tNm * r.fraction, unitSystem)} (${r.torquePct}, ${r.pattern})`
            : `Round ${r.round}: ${r.torquePct} · ${r.pattern === "star" ? "star/cross" : "circular"}`,
        ),
      },
    ],
    exportRows: [
      { label: "Bolt count", value: valid ? String(boltCount) : "—" },
      {
        label: "Pattern",
        value: pattern === "star" ? "Star / cross" : "Circular",
      },
      { label: "Sequence", value: arrow },
      { label: "Flange helper", value: flangeNote },
      ...(hasTorque
        ? [{ label: "Target T", value: formatTorque(tNm, unitSystem) }]
        : []),
      ...PCC1_ROUNDS.map((r) => ({
        label: `Round ${r.round}`,
        value: hasTorque
          ? `${formatTorque(tNm * r.fraction, unitSystem)} (${r.torquePct}, ${r.pattern})`
          : `${r.torquePct} (${r.pattern})`,
      })),
    ],
  };
}
