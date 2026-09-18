/**
 * ISO 5167-2 orifice plate screening constants and tap geometry.
 */

export type OrificeTapType = "flange" | "corner" | "d-and-d2";

export const ORIFICE_BETA_RANGE = { min: 0.1, max: 0.75 } as const;
export const ORIFICE_RE_MIN = 5000;

/** Water @ ~20 °C screening defaults. */
export const ORIFICE_WATER_DENSITY_KG_M3 = 998.2;
export const ORIFICE_WATER_VISCOSITY_CP = 1.0;

/** Air @ STP screening density / viscosity (optional presets). */
export const ORIFICE_AIR_DENSITY_KG_M3 = 1.225;
/** Dynamic viscosity of dry air ≈ 20 °C (cP). */
export const ORIFICE_AIR_VISCOSITY_CP = 0.018;

/**
 * Reader-Harris/Gallagher discharge coefficient (ISO 5167-2:2003).
 * L1 = l1/D, L2p = l2'/D (dimensionless tap locations).
 */
export function readerHarrisGallagherC(
  beta: number,
  reD: number,
  tap: OrificeTapType,
  /** Pipe inside diameter in mm (needed for flange tap L1 = 25.4/D). */
  diMm: number,
): number {
  if (!(beta > 0) || !(beta < 1) || !(reD > 0) || !(diMm > 0)) return 0.6;

  let L1: number;
  let L2p: number;
  if (tap === "corner") {
    L1 = 0;
    L2p = 0;
  } else if (tap === "d-and-d2") {
    L1 = 1;
    L2p = 0.47;
  } else {
    // Flange taps: 25.4 mm from face
    L1 = 25.4 / diMm;
    L2p = 25.4 / diMm;
  }

  const b2 = beta * beta;
  const b4 = b2 * b2;
  const b8 = b4 * b4;
  const A = Math.pow((19000 * beta) / reD, 0.8);
  const M2p = (2 * L2p) / (1 - beta);

  const term1 = 0.5961 + 0.0261 * b2 - 0.216 * b8;
  const term2 = 0.000521 * Math.pow((1e6 * beta) / reD, 0.7);
  const term3 =
    (0.0188 + 0.0063 * A) * Math.pow(beta, 3.5) * Math.pow(1e6 / reD, 0.3);
  const term4 =
    (0.043 + 0.08 * Math.exp(-10 * L1) - 0.123 * Math.exp(-7 * L1)) *
    (1 - 0.11 * A) *
    (b4 / (1 - b4));
  const term5 = 0.031 * (M2p - 0.8 * Math.pow(M2p, 1.1)) * Math.pow(beta, 1.3);

  const C = term1 + term2 + term3 + term4 - term5;
  if (!Number.isFinite(C) || C <= 0.4 || C >= 0.8) return 0.6;
  return C;
}

/** Permanent pressure loss ≈ Δp · (1 − β^1.9) (ISO 5167 screening). */
export function permanentPressureLoss(deltaP: number, beta: number): number {
  if (!(deltaP > 0) || !(beta > 0)) return NaN;
  return deltaP * (1 - Math.pow(beta, 1.9));
}
