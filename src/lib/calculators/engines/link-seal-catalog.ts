/**
 * GPT Industries Link-Seal® modular mechanical seal — screening catalog.
 * Free thickness / belt width from published series data. Annular min/max are
 * screening envelopes (~0.80–1.20 × free thickness) for model matching.
 * Confirm final selection against the current GPT Link-Seal sizing chart.
 */

export type LinkSealModelId =
  | "LS-200"
  | "LS-300"
  | "LS-315"
  | "LS-400"
  | "LS-425"
  | "LS-475"
  | "LS-500"
  | "LS-525"
  | "LS-575";

export type LinkSealModelSpec = {
  id: LinkSealModelId;
  /** Unexpanded (free) rubber thickness. */
  freeThicknessMm: number;
  /** Belt / link pitch used for N = π·Dp / pitch. */
  beltWidthMm: number;
  /** Screening annular clearance range (mm). */
  annularMinMm: number;
  annularMaxMm: number;
};

function envelope(freeMm: number): Pick<LinkSealModelSpec, "annularMinMm" | "annularMaxMm"> {
  return {
    annularMinMm: Number((freeMm * 0.8).toFixed(1)),
    annularMaxMm: Number((freeMm * 1.2).toFixed(1)),
  };
}

export const LINK_SEAL_MODELS: readonly LinkSealModelSpec[] = [
  { id: "LS-200", freeThicknessMm: 12.7, beltWidthMm: 31.8, ...envelope(12.7) },
  { id: "LS-300", freeThicknessMm: 18.0, beltWidthMm: 38.1, ...envelope(18.0) },
  { id: "LS-315", freeThicknessMm: 21.1, beltWidthMm: 38.1, ...envelope(21.1) },
  { id: "LS-400", freeThicknessMm: 36.3, beltWidthMm: 63.5, ...envelope(36.3) },
  { id: "LS-425", freeThicknessMm: 28.4, beltWidthMm: 73.0, ...envelope(28.4) },
  { id: "LS-475", freeThicknessMm: 41.3, beltWidthMm: 68.6, ...envelope(41.3) },
  { id: "LS-500", freeThicknessMm: 60.3, beltWidthMm: 98.4, ...envelope(60.3) },
  { id: "LS-525", freeThicknessMm: 55.6, beltWidthMm: 98.4, ...envelope(55.6) },
  { id: "LS-575", freeThicknessMm: 80.0, beltWidthMm: 98.4, ...envelope(80.0) },
];

/** Standard Link-Seal continuous service screening pressure. */
export const LINK_SEAL_PRESSURE_PSIG = 20;
export const LINK_SEAL_HEAD_FT = 40;

/** 20 psig → MPa / bar; 40 ft → m H2O (screening display). */
export const LINK_SEAL_PRESSURE_MPA = 0.138;
export const LINK_SEAL_PRESSURE_BAR = 1.38;
export const LINK_SEAL_HEAD_M = 12.2;

/** Outside typical modular seal annular envelope. */
export const LINK_SEAL_ANNULAR_WARN_MIN_MM = 12;
export const LINK_SEAL_ANNULAR_WARN_MAX_MM = 85;
