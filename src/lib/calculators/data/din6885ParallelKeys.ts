/**
 * DIN 6885-1 parallel key lookup + shaft/key steel Fy for screening.
 */

import dinRaw from "../../../../data/mechanical/din6885-parallel-keys.json";

export type Din6885Row = {
  dMinMm: number;
  dMaxMm: number;
  bMm: number;
  hMm: number;
  t1Mm: number;
  t2Mm: number;
};

type DinFile = {
  description: string;
  standard: string;
  rows: Din6885Row[];
};

const DIN = dinRaw as DinFile;

export type ShaftSteelId = "S45C" | "SCM440" | "SUS304" | "AISI1045" | "AISI4140";

export type ShaftSteelRow = {
  id: ShaftSteelId;
  label: string;
  fyMPa: number;
  fyKsi: number;
  notes: string;
};

/** Ambient min yield for pure-torsion / key screening (not temperature-derated). */
export const SHAFT_KEY_STEELS: readonly ShaftSteelRow[] = [
  {
    id: "S45C",
    label: "S45C / AISI 1045 class",
    fyMPa: 345,
    fyKsi: 50,
    notes: "JIS S45C / AISI 1045 class ambient Fy screening (≈ 50 ksi).",
  },
  {
    id: "AISI1045",
    label: "AISI 1045",
    fyMPa: 345,
    fyKsi: 50,
    notes: "AISI 1045 ambient Fy screening (same class as S45C).",
  },
  {
    id: "SCM440",
    label: "SCM440 / AISI 4140 class",
    fyMPa: 655,
    fyKsi: 95,
    notes: "JIS SCM440 / AISI 4140 QT class ambient Fy screening.",
  },
  {
    id: "AISI4140",
    label: "AISI 4140",
    fyMPa: 655,
    fyKsi: 95,
    notes: "AISI 4140 QT ambient Fy screening (same class as SCM440).",
  },
  {
    id: "SUS304",
    label: "SUS304 / SS304",
    fyMPa: 205,
    fyKsi: 30,
    notes: "Austenitic stainless ambient Fy screening (≈ 30 ksi).",
  },
] as const;

export function isShaftSteelId(value: string): value is ShaftSteelId {
  return SHAFT_KEY_STEELS.some((r) => r.id === value);
}

export function normalizeShaftSteelId(raw: string): ShaftSteelId {
  const v = raw.trim().toUpperCase().replace(/[\s_-]/g, "");
  if (v.includes("4140") || v.includes("SCM440")) return "AISI4140";
  if (v.includes("SCM")) return "SCM440";
  if (v.includes("304") || v.includes("SUS")) return "SUS304";
  if (v.includes("1045") || v.includes("AISI1045")) return "AISI1045";
  if (v.includes("S45") || v.includes("45C")) return "S45C";
  if (isShaftSteelId(raw)) return raw;
  return "S45C";
}

export function getShaftSteel(id: ShaftSteelId): ShaftSteelRow {
  return (
    SHAFT_KEY_STEELS.find((r) => r.id === id) ??
    SHAFT_KEY_STEELS.find((r) => r.id === "S45C")!
  );
}

/**
 * DIN 6885-1 band: dMin < d ≤ dMax (mm).
 * Falls back to nearest band edge if outside published table.
 */
export function lookupDin6885Key(dMm: number): Din6885Row {
  const d = Number.isFinite(dMm) ? dMm : 50;
  const hit = DIN.rows.find((r) => d > r.dMinMm && d <= r.dMaxMm);
  if (hit) return hit;
  if (d <= DIN.rows[0]!.dMaxMm) return DIN.rows[0]!;
  return DIN.rows[DIN.rows.length - 1]!;
}

export function listDin6885Rows(): readonly Din6885Row[] {
  return DIN.rows;
}

/**
 * ASME B17.1 square-key screening suggestion (inch) by shaft diameter.
 * Common commercial square sizes — confirm OEM chart for final selection.
 */
export function lookupAsmeB171SquareKey(dIn: number): { bIn: number; hIn: number } {
  const d = Number.isFinite(dIn) ? dIn : 2;
  if (d <= 0.875) return { bIn: 0.1875, hIn: 0.1875 };
  if (d <= 1.25) return { bIn: 0.25, hIn: 0.25 };
  if (d <= 1.375) return { bIn: 0.3125, hIn: 0.3125 };
  if (d <= 1.75) return { bIn: 0.375, hIn: 0.375 };
  if (d <= 2.25) return { bIn: 0.5, hIn: 0.5 };
  if (d <= 2.75) return { bIn: 0.625, hIn: 0.625 };
  if (d <= 3.25) return { bIn: 0.75, hIn: 0.75 };
  if (d <= 3.75) return { bIn: 0.875, hIn: 0.875 };
  return { bIn: 1.0, hIn: 1.0 };
}
