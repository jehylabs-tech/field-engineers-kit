/**
 * MSS SP-97 integrally reinforced forged branch outlet (Olet) screening dimensions.
 *
 * Dimensions follow published MSS SP-97 / Bonney Forge-style catalog charts
 * (inches). Values are field screening — confirm the current manufacturer chart
 * and ASME B31.3 §304.3 area replacement separately.
 *
 * Assert anchors (engine tests):
 * - Weldolet STD outlet 2: A = 1.50 in (38.1 mm), B = 2.3125 in (≈58.7 mm)
 * - Sockolet Class 3000 outlet 1.5: A = 1.3125 in (≈33.3 mm), J = 0.50 in (12.7 mm)
 * - Weldolet XS outlet 4: A = 2.25 in, B = 4.875 in (≈4.88 in)
 * - Threadolet Class 3000 outlet 1: A = 1.3125 in (≈1.31 in)
 */

export type OletType = "weldolet" | "sockolet" | "threadolet";

/** Weldolet schedule family or forged class for SW/THRD. */
export type OletRating = "STD" | "XS" | "160" | "3000" | "6000";

export type OletDimensionRow = {
  /** Branch / outlet NPS token ("2", "1.5", …). */
  outletNps: string;
  /** Minimum compatible run (header) NPS. */
  runMinNps: string;
  /** Maximum compatible run (header) NPS. */
  runMaxNps: string;
  /** Height from run OD to fitting top / face (in). */
  A_in: number;
  /** Base / reinforcement diameter at header (in). */
  B_in: number;
  /** Branch bore / ID screening (in). */
  bore_in: number;
  /** Recommended header cutout diameter (in). */
  dHole_in: number;
  /** Socket depth J (Sockolet only, in). */
  J_in?: number;
  /** Approximate shipping weight (lb). */
  weight_lb: number;
  /** End prep note for hero / rows. */
  endPrep: string;
};

export type OletCatalog = {
  standard: string;
  updatedAt: string;
  notes: string;
  rows: Record<OletType, Partial<Record<OletRating, OletDimensionRow[]>>>;
};

/**
 * Run-size families: reducing Olets typically start one size above the outlet
 * (or at ¾ for ½ outlets) and extend through NPS 36 per catalog practice.
 */
function runMax(): string {
  return "36";
}

export const OLET_DIMENSIONS_MSS_SP97: OletCatalog = {
  standard: "MSS SP-97",
  updatedAt: "2026-09-23",
  notes:
    "Screening dimensions from MSS SP-97 / Bonney Forge-style published charts. Confirm OEM chart before purchase. Does not replace B31.3 §304.3 area replacement.",
  rows: {
    weldolet: {
      STD: [
        {
          outletNps: "0.5",
          runMinNps: "0.75",
          runMaxNps: runMax(),
          A_in: 0.75,
          B_in: 1.0625,
          bore_in: 0.622,
          dHole_in: 0.88,
          weight_lb: 0.2,
          endPrep: "BW bevel · match STD / Sch 40",
        },
        {
          outletNps: "0.75",
          runMinNps: "1",
          runMaxNps: runMax(),
          A_in: 0.875,
          B_in: 1.3125,
          bore_in: 0.824,
          dHole_in: 1.09,
          weight_lb: 0.3,
          endPrep: "BW bevel · match STD / Sch 40",
        },
        {
          outletNps: "1",
          runMinNps: "1.25",
          runMaxNps: runMax(),
          A_in: 1.0625,
          B_in: 1.5625,
          bore_in: 1.049,
          dHole_in: 1.38,
          weight_lb: 0.4,
          endPrep: "BW bevel · match STD / Sch 40",
        },
        {
          outletNps: "1.25",
          runMinNps: "1.5",
          runMaxNps: runMax(),
          A_in: 1.25,
          B_in: 1.96875,
          bore_in: 1.38,
          dHole_in: 1.72,
          weight_lb: 0.7,
          endPrep: "BW bevel · match STD / Sch 40",
        },
        {
          outletNps: "1.5",
          runMinNps: "2",
          runMaxNps: runMax(),
          A_in: 1.3125,
          B_in: 2.28125,
          bore_in: 1.61,
          dHole_in: 1.97,
          weight_lb: 0.95,
          endPrep: "BW bevel · match STD / Sch 40",
        },
        {
          outletNps: "2",
          runMinNps: "2.5",
          runMaxNps: runMax(),
          A_in: 1.5,
          B_in: 2.3125,
          bore_in: 2.067,
          dHole_in: 2.44,
          weight_lb: 1.25,
          endPrep: "BW bevel · match STD / Sch 40",
        },
        {
          outletNps: "2.5",
          runMinNps: "3",
          runMaxNps: runMax(),
          A_in: 1.625,
          B_in: 2.875,
          bore_in: 2.469,
          dHole_in: 2.88,
          weight_lb: 2.0,
          endPrep: "BW bevel · match STD / Sch 40",
        },
        {
          outletNps: "3",
          runMinNps: "3.5",
          runMaxNps: runMax(),
          A_in: 1.75,
          B_in: 3.3125,
          bore_in: 3.068,
          dHole_in: 3.5,
          weight_lb: 2.85,
          endPrep: "BW bevel · match STD / Sch 40",
        },
        {
          outletNps: "4",
          runMinNps: "5",
          runMaxNps: runMax(),
          A_in: 2.0,
          B_in: 4.125,
          bore_in: 4.026,
          dHole_in: 4.5,
          weight_lb: 5.5,
          endPrep: "BW bevel · match STD / Sch 40",
        },
        {
          outletNps: "6",
          runMinNps: "8",
          runMaxNps: runMax(),
          A_in: 2.375,
          B_in: 6.125,
          bore_in: 6.065,
          dHole_in: 6.63,
          weight_lb: 12.0,
          endPrep: "BW bevel · match STD / Sch 40",
        },
        {
          outletNps: "8",
          runMinNps: "10",
          runMaxNps: runMax(),
          A_in: 2.75,
          B_in: 8.0,
          bore_in: 7.981,
          dHole_in: 8.63,
          weight_lb: 22.5,
          endPrep: "BW bevel · match STD / Sch 40",
        },
        {
          outletNps: "10",
          runMinNps: "12",
          runMaxNps: runMax(),
          A_in: 3.0625,
          B_in: 10.0,
          bore_in: 10.02,
          dHole_in: 10.75,
          weight_lb: 35.75,
          endPrep: "BW bevel · match STD / Sch 40",
        },
        {
          outletNps: "12",
          runMinNps: "14",
          runMaxNps: runMax(),
          A_in: 3.375,
          B_in: 12.0,
          bore_in: 11.938,
          dHole_in: 12.75,
          weight_lb: 52.5,
          endPrep: "BW bevel · match STD / Sch 40",
        },
      ],
      XS: [
        {
          outletNps: "2",
          runMinNps: "2.5",
          runMaxNps: runMax(),
          A_in: 1.6875,
          B_in: 2.5625,
          bore_in: 1.939,
          dHole_in: 2.44,
          weight_lb: 1.8,
          endPrep: "BW bevel · match XS / Sch 80",
        },
        {
          outletNps: "3",
          runMinNps: "3.5",
          runMaxNps: runMax(),
          A_in: 2.0,
          B_in: 3.75,
          bore_in: 2.9,
          dHole_in: 3.5,
          weight_lb: 4.2,
          endPrep: "BW bevel · match XS / Sch 80",
        },
        {
          outletNps: "4",
          runMinNps: "5",
          runMaxNps: runMax(),
          A_in: 2.25,
          B_in: 4.875,
          bore_in: 3.826,
          dHole_in: 4.5,
          weight_lb: 8.0,
          endPrep: "BW bevel · match XS / Sch 80",
        },
        {
          outletNps: "6",
          runMinNps: "8",
          runMaxNps: runMax(),
          A_in: 2.75,
          B_in: 6.75,
          bore_in: 5.761,
          dHole_in: 6.63,
          weight_lb: 18.0,
          endPrep: "BW bevel · match XS / Sch 80",
        },
      ],
      "160": [
        {
          outletNps: "2",
          runMinNps: "2.5",
          runMaxNps: runMax(),
          A_in: 1.875,
          B_in: 2.75,
          bore_in: 1.687,
          dHole_in: 2.44,
          weight_lb: 2.4,
          endPrep: "BW bevel · match Sch 160",
        },
        {
          outletNps: "4",
          runMinNps: "5",
          runMaxNps: runMax(),
          A_in: 2.5,
          B_in: 5.25,
          bore_in: 3.438,
          dHole_in: 4.5,
          weight_lb: 11.0,
          endPrep: "BW bevel · match Sch 160",
        },
      ],
    },
    sockolet: {
      "3000": [
        {
          outletNps: "0.5",
          runMinNps: "0.75",
          runMaxNps: runMax(),
          A_in: 1.0,
          B_in: 1.325,
          bore_in: 0.546,
          dHole_in: 0.88,
          J_in: 0.38,
          weight_lb: 0.35,
          endPrep: "Socket weld · Class 3000",
        },
        {
          outletNps: "0.75",
          runMinNps: "1",
          runMaxNps: runMax(),
          A_in: 1.0,
          B_in: 1.5,
          bore_in: 0.742,
          dHole_in: 1.09,
          J_in: 0.44,
          weight_lb: 0.45,
          endPrep: "Socket weld · Class 3000",
        },
        {
          outletNps: "1",
          runMinNps: "1.25",
          runMaxNps: runMax(),
          A_in: 1.25,
          B_in: 1.94,
          bore_in: 0.957,
          dHole_in: 1.38,
          J_in: 0.5,
          weight_lb: 0.7,
          endPrep: "Socket weld · Class 3000",
        },
        {
          outletNps: "1.5",
          runMinNps: "2",
          runMaxNps: runMax(),
          A_in: 1.3125,
          B_in: 2.56,
          bore_in: 1.5,
          dHole_in: 1.97,
          J_in: 0.5,
          weight_lb: 1.3,
          endPrep: "Socket weld · Class 3000",
        },
        {
          outletNps: "2",
          runMinNps: "2.5",
          runMaxNps: runMax(),
          A_in: 1.5,
          B_in: 3.06,
          bore_in: 1.939,
          dHole_in: 2.44,
          J_in: 0.62,
          weight_lb: 2.1,
          endPrep: "Socket weld · Class 3000",
        },
      ],
      "6000": [
        {
          outletNps: "0.5",
          runMinNps: "0.75",
          runMaxNps: runMax(),
          A_in: 1.12,
          B_in: 1.5,
          bore_in: 0.434,
          dHole_in: 0.88,
          J_in: 0.38,
          weight_lb: 0.55,
          endPrep: "Socket weld · Class 6000",
        },
        {
          outletNps: "1",
          runMinNps: "1.25",
          runMaxNps: runMax(),
          A_in: 1.38,
          B_in: 2.19,
          bore_in: 0.815,
          dHole_in: 1.38,
          J_in: 0.5,
          weight_lb: 1.1,
          endPrep: "Socket weld · Class 6000",
        },
        {
          outletNps: "1.5",
          runMinNps: "2",
          runMaxNps: runMax(),
          A_in: 1.5,
          B_in: 2.88,
          bore_in: 1.338,
          dHole_in: 1.97,
          J_in: 0.5,
          weight_lb: 2.0,
          endPrep: "Socket weld · Class 6000",
        },
        {
          outletNps: "2",
          runMinNps: "2.5",
          runMaxNps: runMax(),
          A_in: 1.69,
          B_in: 3.44,
          bore_in: 1.687,
          dHole_in: 2.44,
          J_in: 0.62,
          weight_lb: 3.2,
          endPrep: "Socket weld · Class 6000",
        },
      ],
    },
    threadolet: {
      "3000": [
        {
          outletNps: "0.5",
          runMinNps: "0.75",
          runMaxNps: runMax(),
          A_in: 1.0,
          B_in: 1.325,
          bore_in: 0.546,
          dHole_in: 0.88,
          weight_lb: 0.35,
          endPrep: "NPT ½ in · Class 3000",
        },
        {
          outletNps: "0.75",
          runMinNps: "1",
          runMaxNps: runMax(),
          A_in: 1.0,
          B_in: 1.5,
          bore_in: 0.742,
          dHole_in: 1.09,
          weight_lb: 0.45,
          endPrep: "NPT ¾ in · Class 3000",
        },
        {
          outletNps: "1",
          runMinNps: "1.25",
          runMaxNps: runMax(),
          A_in: 1.3125,
          B_in: 1.94,
          bore_in: 0.957,
          dHole_in: 1.38,
          weight_lb: 0.7,
          endPrep: "NPT 1 in · Class 3000",
        },
        {
          outletNps: "1.5",
          runMinNps: "2",
          runMaxNps: runMax(),
          A_in: 1.3125,
          B_in: 2.56,
          bore_in: 1.5,
          dHole_in: 1.97,
          weight_lb: 1.3,
          endPrep: "NPT 1½ in · Class 3000",
        },
        {
          outletNps: "2",
          runMinNps: "2.5",
          runMaxNps: runMax(),
          A_in: 1.5,
          B_in: 3.06,
          bore_in: 1.939,
          dHole_in: 2.44,
          weight_lb: 2.1,
          endPrep: "NPT 2 in · Class 3000",
        },
      ],
      "6000": [
        {
          outletNps: "0.5",
          runMinNps: "0.75",
          runMaxNps: runMax(),
          A_in: 1.12,
          B_in: 1.5,
          bore_in: 0.434,
          dHole_in: 0.88,
          weight_lb: 0.55,
          endPrep: "NPT ½ in · Class 6000",
        },
        {
          outletNps: "1",
          runMinNps: "1.25",
          runMaxNps: runMax(),
          A_in: 1.38,
          B_in: 2.19,
          bore_in: 0.815,
          dHole_in: 1.38,
          weight_lb: 1.1,
          endPrep: "NPT 1 in · Class 6000",
        },
        {
          outletNps: "1.5",
          runMinNps: "2",
          runMaxNps: runMax(),
          A_in: 1.5,
          B_in: 2.88,
          bore_in: 1.338,
          dHole_in: 1.97,
          weight_lb: 2.0,
          endPrep: "NPT 1½ in · Class 6000",
        },
        {
          outletNps: "2",
          runMinNps: "2.5",
          runMaxNps: runMax(),
          A_in: 1.69,
          B_in: 3.44,
          bore_in: 1.687,
          dHole_in: 2.44,
          weight_lb: 3.2,
          endPrep: "NPT 2 in · Class 6000",
        },
      ],
    },
  },
};

const IN_TO_MM = 25.4;
const LB_TO_KG = 0.45359237;

export function npsToNumber(nps: string): number {
  const n = Number(nps);
  return Number.isFinite(n) ? n : NaN;
}

export function normalizeOletRating(
  oletType: OletType,
  rating: string,
): OletRating | null {
  const r = rating.trim().toUpperCase().replace(/^CLASS\s*/, "").replace(/^SCH\s*/, "");
  if (oletType === "weldolet") {
    if (r === "STD" || r === "40" || r === "SCH40") return "STD";
    if (r === "XS" || r === "80" || r === "SCH80") return "XS";
    if (r === "160" || r === "SCH160") return "160";
    return null;
  }
  if (r === "3000" || r === "3M") return "3000";
  if (r === "6000" || r === "6M") return "6000";
  return null;
}

export function defaultRatingForType(oletType: OletType): OletRating {
  return oletType === "weldolet" ? "STD" : "3000";
}

export function listOletOutletNps(
  oletType: OletType,
  rating: OletRating,
): string[] {
  const rows = OLET_DIMENSIONS_MSS_SP97.rows[oletType][rating] ?? [];
  return rows.map((r) => r.outletNps);
}

export function findOletDimensionRow(
  oletType: OletType,
  rating: OletRating,
  outletNps: string,
): OletDimensionRow | undefined {
  const rows = OLET_DIMENSIONS_MSS_SP97.rows[oletType][rating] ?? [];
  return rows.find((r) => r.outletNps === outletNps);
}

export function isRunSizeCompatible(
  row: OletDimensionRow,
  runNps: string,
): boolean {
  const run = npsToNumber(runNps);
  const min = npsToNumber(row.runMinNps);
  const max = npsToNumber(row.runMaxNps);
  if (![run, min, max].every(Number.isFinite)) return false;
  return run + 1e-9 >= min && run - 1e-9 <= max;
}

export function oletInToMm(inches: number): number {
  return inches * IN_TO_MM;
}

export function oletLbToKg(lb: number): number {
  return lb * LB_TO_KG;
}
