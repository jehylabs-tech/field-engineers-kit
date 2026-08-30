import { getGasketDimensionEntry } from "@/lib/data/loaders";

export const FLANGE_TYPE_OPTIONS = [
  { value: "wn", label: "Weld Neck (WN)" },
  { value: "bl", label: "Blind (BL)" },
  { value: "so", label: "Slip-On (SO)" },
  { value: "sw", label: "Socket Weld (SW)" },
] as const;

export const FACING_OPTIONS = [
  { value: "rf", label: "RF (Raised Face)" },
  { value: "ff", label: "FF (Flat Face)" },
  { value: "rtj", label: "RTJ (Ring Joint)" },
] as const;

export type FlangeTypeId = (typeof FLANGE_TYPE_OPTIONS)[number]["value"];
export type FacingId = (typeof FACING_OPTIONS)[number]["value"];

const TYPE_WEIGHT: Record<FlangeTypeId, number> = {
  wn: 1,
  so: 0.7,
  sw: 0.75,
  bl: 0.85,
};

const RING_BY_NPS: Record<string, { low: string; mid: string; high: string; extra: string }> =
  {
    "0.5": { low: "R-11", mid: "R-12", high: "R-13", extra: "R-14" },
    "0.75": { low: "R-13", mid: "R-14", high: "R-16", extra: "R-18" },
    "1": { low: "R-16", mid: "R-16", high: "R-18", extra: "R-19" },
    "1.25": { low: "R-18", mid: "R-18", high: "R-21", extra: "R-22" },
    "1.5": { low: "R-20", mid: "R-20", high: "R-23", extra: "R-24" },
    "2": { low: "R-23", mid: "R-24", high: "R-26", extra: "R-27" },
    "2.5": { low: "R-26", mid: "R-27", high: "R-28", extra: "R-32" },
    "3": { low: "R-31", mid: "R-32", high: "R-35", extra: "R-36" },
    "3.5": { low: "R-34", mid: "R-34", high: "R-34", extra: "R-34" },
    "4": { low: "R-37", mid: "R-38", high: "R-39", extra: "R-41" },
    "5": { low: "R-41", mid: "R-42", high: "R-44", extra: "R-45" },
    "6": { low: "R-45", mid: "R-46", high: "R-49", extra: "R-50" },
    "8": { low: "R-49", mid: "R-50", high: "R-53", extra: "R-54" },
    "10": { low: "R-53", mid: "R-54", high: "R-57", extra: "R-58" },
    "12": { low: "R-57", mid: "R-58", high: "R-61", extra: "R-62" },
    "14": { low: "R-61", mid: "R-62", high: "R-63", extra: "R-65" },
    "16": { low: "R-65", mid: "R-66", high: "R-67", extra: "R-69" },
    "18": { low: "R-69", mid: "R-70", high: "R-71", extra: "R-73" },
    "20": { low: "R-73", mid: "R-74", high: "R-75", extra: "R-77" },
    "24": { low: "R-77", mid: "R-78", high: "R-79", extra: "R-81" },
  };

export function isRtjClass(pressureClass: string): boolean {
  return Number(pressureClass) >= 300;
}

export function resolveFacing(
  facing: string | undefined,
  pressureClass: string,
): FacingId {
  if (facing === "ff") return "ff";
  if (facing === "rtj" && isRtjClass(pressureClass)) return "rtj";
  return "rf";
}

export function resolveFlangeType(type: string | undefined): FlangeTypeId {
  if (type === "bl" || type === "so" || type === "sw") return type;
  return "wn";
}

export function flangeTypeLabel(type: FlangeTypeId): string {
  return FLANGE_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

export function facingLabel(facing: FacingId): string {
  return FACING_OPTIONS.find((item) => item.value === facing)?.label ?? facing;
}

export function flangeStyleLabel(type: FlangeTypeId, facing: FacingId): string {
  const face = facing.toUpperCase();
  if (type === "wn") return `Weld Neck ${face}`;
  if (type === "bl") return `Blind ${face}`;
  if (type === "so") return `Slip-On ${face}`;
  return `Socket Weld ${face}`;
}

export function raisedFaceHeightMm(pressureClass: string): number {
  return Number(pressureClass) >= 400 ? 6.4 : 1.6;
}

export function typeWeightFactor(type: FlangeTypeId): number {
  return TYPE_WEIGHT[type];
}

export function facingGasketFactor(facing: FacingId): number {
  if (facing === "ff") return 1.15;
  if (facing === "rtj") return 0.35;
  return 1;
}

/** Stud length delta vs the tabulated RF length (two-flange joint). */
export function studLengthDeltaMm(
  facing: FacingId,
  pressureClass: string,
): number {
  const rfHeight = raisedFaceHeightMm(pressureClass);
  if (facing === "ff") return -2 * rfHeight;
  if (facing === "rtj") return Number(pressureClass) >= 900 ? 16 : 10;
  return 0;
}

export function lookupRtjRingNumber(
  nps: string,
  pressureClass: string,
): string | undefined {
  const classNum = Number(pressureClass);
  const classTries =
    classNum <= 300
      ? ["300", "150", pressureClass]
      : classNum <= 400
        ? ["400", "300", "600", pressureClass]
        : classNum <= 600
          ? ["600", "400", "300", pressureClass]
          : [pressureClass, "600", "300"];

  for (const cls of classTries) {
    const entry = getGasketDimensionEntry("rtj_ring", nps, cls);
    if (entry && "ringNumber" in entry.rating) {
      return entry.rating.ringNumber;
    }
  }

  const row = RING_BY_NPS[nps];
  if (!row) return undefined;
  if (classNum >= 2500) return row.extra;
  if (classNum >= 900) return row.high;
  if (classNum >= 400) return row.mid;
  return row.low;
}
