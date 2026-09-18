/**
 * ISA/IEC control-valve noise screening fluid constants
 * (IEC 60534-8-3 aerodynamic / 60534-8-4 hydrodynamic).
 */

export type ValveNoiseFluidKind = "gas" | "liquid";

export type ValveNoiseFluidProps = {
  /** Ratio of specific heats k = cp/cv (gas) or placeholder (liquid). */
  k: number;
  /** Specific gas constant R (J/kg·K) — gas only. */
  R: number;
  /** Reference density at STP screening (kg/m³). */
  rhoRef: number;
  /** Speed of sound reference at 20 °C (m/s) — liquid bulk. */
  cLiquid: number;
  label: string;
};

/** Default gas: dry air / N2-like screening fluid. */
export const VALVE_NOISE_GAS: ValveNoiseFluidProps = {
  k: 1.4,
  R: 287.058,
  rhoRef: 1.204,
  cLiquid: 343,
  label: "Air / N₂ (gas)",
};

/** Default liquid: water-like screening fluid. */
export const VALVE_NOISE_LIQUID: ValveNoiseFluidProps = {
  k: 1.0,
  R: 0,
  rhoRef: 997,
  cLiquid: 1480,
  label: "Water (liquid)",
};

export function getValveNoiseFluid(
  fluidType: ValveNoiseFluidKind,
): ValveNoiseFluidProps {
  return fluidType === "liquid" ? VALVE_NOISE_LIQUID : VALVE_NOISE_GAS;
}

/** Reference acoustic pressure (Pa). */
export const PREF_PA = 2e-5;

/** Reference acoustic power (W). */
export const WREF_W = 1e-12;

/**
 * Empirical acoustic-efficiency scale for single-stage globe/butterfly
 * screening (IEC 60534-8-3/8-4 style).
 */
export const ACOUSTIC_EFFICIENCY = {
  /** Gas subsonic η₀ · Ma^n */
  gasSubsonicEta0: 1.15e-4,
  gasSubsonicExp: 3.2,
  /** Gas choked η ceiling scale */
  gasChokedEta0: 2.8e-4,
  gasChokedExp: 2.4,
  /** Liquid / hydrodynamic η₀ · (ΔP/P1)^n */
  liquidEta0: 4.5e-5,
  liquidExp: 1.8,
  /** Soft cap so Wa never exceeds a few % of Wm */
  etaMax: 5e-3,
} as const;

/**
 * External SPL assembly (screening):
 * L_{p,1m} ≈ L_{wA} − ΔL_{TL} − RAD + a·log10(P1/P1,ref) − b·log10(Di/Di,ref) [+ liquid]
 * Coefficients calibrated to FEK Pattern-B duties (IEC-style single-stage trim).
 */
export const EXTERNAL_SPL = {
  /** Radiation / near-field offset (dB) at 1 m. */
  radiationDb: 37,
  /** Reference upstream gauge pressure (bar g) — NPS 4 default duty. */
  p1RefBarG: 10,
  /** P1 sensitivity (dB / decade). */
  p1LogGain: 26.1,
  /** Reference inside diameter (mm) — NPS 4 Sch 40. */
  diRefMm: 102.26,
  /** Diameter radiation sensitivity (dB / decade). */
  diLogGain: 30.6,
  /** Hydrodynamic (liquid) level uplift vs aerodynamic baseline (dB). */
  liquidBonusDb: 19.5,
} as const;

/** Observer radius for external SPL (m) — IEC 1 m from pipe wall. */
export const OBSERVER_RADIUS_M = 1;

/**
 * Pipe-wall transmission-loss screening (prompt form):
 * ΔL_TL = 17 log10(t_w / D_i) + 36  (t_w, D_i same length unit).
 */
export function pipeTransmissionLossDb(twMm: number, diMm: number): number {
  if (!(twMm > 0) || !(diMm > 0)) return 0;
  return 17 * Math.log10(twMm / diMm) + 36;
}
