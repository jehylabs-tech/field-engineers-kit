/**
 * Commercial plate stock for CeilToCommercialPlate (API 650 shell MTO screening).
 * Same mill stock ladder as blind-flange — do not invent alternate ladders.
 */

import {
  COMMERCIAL_PLATE_THICKNESSES_IN,
  COMMERCIAL_PLATE_THICKNESSES_MM,
} from "@/lib/calculators/engines/blind-flange";

export { COMMERCIAL_PLATE_THICKNESSES_IN, COMMERCIAL_PLATE_THICKNESSES_MM };

export function ceilToCommercialPlateMm(tRequiredMm: number): number {
  if (!(tRequiredMm > 0) || !Number.isFinite(tRequiredMm)) {
    return COMMERCIAL_PLATE_THICKNESSES_MM[0];
  }
  return (
    COMMERCIAL_PLATE_THICKNESSES_MM.find((size) => size >= tRequiredMm - 1e-9) ??
    COMMERCIAL_PLATE_THICKNESSES_MM[COMMERCIAL_PLATE_THICKNESSES_MM.length - 1]
  );
}

export function ceilToCommercialPlateIn(tRequiredIn: number): number {
  if (!(tRequiredIn > 0) || !Number.isFinite(tRequiredIn)) {
    return COMMERCIAL_PLATE_THICKNESSES_IN[0];
  }
  return (
    COMMERCIAL_PLATE_THICKNESSES_IN.find((size) => size >= tRequiredIn - 1e-9) ??
    COMMERCIAL_PLATE_THICKNESSES_IN[COMMERCIAL_PLATE_THICKNESSES_IN.length - 1]
  );
}
