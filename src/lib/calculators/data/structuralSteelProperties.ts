/**
 * Structural carbon-steel yield strengths for lifting-lug screening.
 * Sources: EN 10025 (S275/S355), ASTM A36 / A572, ASME SA-516 Gr.70 min yield.
 * Ambient screening only — not temperature-derated Section II-D allowables.
 */
export type LugSteelId =
  | "S275"
  | "S355"
  | "A36"
  | "A572-50"
  | "SA-516-70";

export type LugSteelRow = {
  id: LugSteelId;
  label: string;
  /** Min yield strength Fy — MPa */
  fyMPa: number;
  /** Min yield strength Fy — ksi */
  fyKsi: number;
  notes: string;
};

export const LUG_STEEL_PROPERTIES: readonly LugSteelRow[] = [
  {
    id: "S275",
    label: "S275 (EN 10025)",
    fyMPa: 275,
    fyKsi: 39.9,
    notes: "EN 10025-2 S275JR min Fy (t ≤ 16 mm band used for screening).",
  },
  {
    id: "S355",
    label: "S355 (EN 10025)",
    fyMPa: 355,
    fyKsi: 51.5,
    notes: "EN 10025-2 S355JR min Fy (t ≤ 16 mm band used for screening).",
  },
  {
    id: "A36",
    label: "ASTM A36",
    fyMPa: 250,
    fyKsi: 36,
    notes: "ASTM A36 min Fy = 36 ksi (250 MPa rounding used in FEK metric).",
  },
  {
    id: "A572-50",
    label: "ASTM A572 Grade 50",
    fyMPa: 345,
    fyKsi: 50,
    notes:
      "ASTM A572 Gr.50 min Fy = 50 ksi (distinct from EN S355 screening Fy).",
  },
  {
    id: "SA-516-70",
    label: "ASME SA-516 Grade 70",
    fyMPa: 260,
    fyKsi: 38,
    notes: "SA-516 Gr.70 min Fy = 38 ksi (plate lug screening).",
  },
] as const;

export function getLugSteel(id: LugSteelId): LugSteelRow {
  const row = LUG_STEEL_PROPERTIES.find((r) => r.id === id);
  if (!row) {
    return LUG_STEEL_PROPERTIES.find((r) => r.id === "S355")!;
  }
  return row;
}

export function isLugSteelId(value: string): value is LugSteelId {
  return LUG_STEEL_PROPERTIES.some((r) => r.id === value);
}

/** Map UI material tokens from URL / presets. */
export function normalizeLugSteelId(raw: string): LugSteelId {
  const v = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (v === "S275" || v.includes("S275")) return "S275";
  if (v === "S355" || v.includes("S355")) return "S355";
  if (v === "A36") return "A36";
  if (v.includes("A572") || v === "A572-50" || v === "A57250") return "A572-50";
  if (v.includes("516") || v.includes("SA-516")) return "SA-516-70";
  if (isLugSteelId(raw)) return raw;
  return "S355";
}
