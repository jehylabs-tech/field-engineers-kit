/**
 * Darby 3-K fitting constants (K₁, Kᵢ, K_d) for resistance coefficient
 * screening — Ron Darby, Chemical Engineering Fluid Mechanics (Table 6.3 style).
 *
 * K = K₁/Re + Kᵢ · (1 + K_d / D_in^0.3)  with D_in in inches.
 */

export type Darby3kFittingType =
  | "elbow_90_std"
  | "elbow_90_long"
  | "elbow_45_std"
  | "tee_flow_through"
  | "tee_branch"
  | "gate_valve_full"
  | "globe_valve_std"
  | "check_swing"
  | "ball_full"
  | "butterfly_valve";

export type Darby3kFittingOption = {
  value: Darby3kFittingType;
  label: string;
  /** Laminar / low-Re constant K₁. */
  k1: number;
  /** Turbulent asymptotic constant Kᵢ (K_∞). */
  ki: number;
  /** Diameter scale factor K_d. */
  kd: number;
  group: "elbow" | "tee" | "valve";
  /** Matching Crane TP-410 fitting id for L/D comparison (when available). */
  craneType?: string;
};

/**
 * Published Darby 3-K constants (flanged / welded commercial fittings).
 * Elbow 90° std matches the FEK default duty (K₁=800, Kᵢ=0.09, K_d=4.0).
 */
export const DARBY_3K_FITTING_OPTIONS: Darby3kFittingOption[] = [
  {
    value: "elbow_90_std",
    label: "90° Elbow (standard, r/D ≈ 1)",
    k1: 800,
    ki: 0.09,
    kd: 4.0,
    group: "elbow",
    craneType: "90_elbow_std",
  },
  {
    value: "elbow_90_long",
    label: "90° Elbow (long radius, r/D ≈ 1.5)",
    k1: 800,
    ki: 0.071,
    kd: 4.2,
    group: "elbow",
    craneType: "90_elbow_long",
  },
  {
    value: "elbow_45_std",
    label: "45° Elbow (standard)",
    k1: 500,
    ki: 0.052,
    kd: 4.0,
    group: "elbow",
    craneType: "45_elbow",
  },
  {
    value: "tee_flow_through",
    label: "Tee — flow through run",
    k1: 200,
    ki: 0.091,
    kd: 4.0,
    group: "tee",
    craneType: "tee_flow_through",
  },
  {
    value: "tee_branch",
    label: "Tee — branch flow",
    k1: 800,
    ki: 0.28,
    kd: 4.0,
    group: "tee",
    craneType: "tee_branch_flow",
  },
  {
    value: "gate_valve_full",
    label: "Gate valve (full open)",
    k1: 300,
    ki: 0.037,
    kd: 3.9,
    group: "valve",
    craneType: "gate_valve_full",
  },
  {
    value: "globe_valve_std",
    label: "Globe valve (standard)",
    k1: 1500,
    ki: 1.7,
    kd: 3.6,
    group: "valve",
    craneType: "globe_valve_std",
  },
  {
    value: "check_swing",
    label: "Swing check valve",
    k1: 1500,
    ki: 0.46,
    kd: 4.0,
    group: "valve",
    craneType: "check_valve_swing",
  },
  {
    value: "ball_full",
    label: "Ball valve (full bore, open)",
    k1: 300,
    ki: 0.017,
    kd: 3.5,
    group: "valve",
    craneType: "ball_valve_full",
  },
  {
    value: "butterfly_valve",
    label: "Butterfly valve (full open)",
    k1: 800,
    ki: 0.25,
    kd: 4.0,
    group: "valve",
    craneType: "butterfly_valve",
  },
];

const BY_ID = Object.fromEntries(
  DARBY_3K_FITTING_OPTIONS.map((row) => [row.value, row]),
) as Record<Darby3kFittingType, Darby3kFittingOption>;

export function getDarby3kFitting(
  type: string,
): Darby3kFittingOption | undefined {
  return BY_ID[type as Darby3kFittingType];
}

/** Flow-regime label from pipe Reynolds number. */
export function darbyFlowRegime(
  re: number,
): "laminar" | "transition" | "turbulent" {
  if (!(re > 0)) return "laminar";
  if (re < 2000) return "laminar";
  if (re <= 4000) return "transition";
  return "turbulent";
}

/**
 * Darby 3-K resistance coefficient for one fitting.
 * @param diIn Internal diameter in inches (D_in).
 */
export function darby3kResistanceCoefficient(
  k1: number,
  ki: number,
  kd: number,
  re: number,
  diIn: number,
): { k: number; laminarPart: number; turbulentPart: number } {
  if (!(re > 0) || !(diIn > 0)) {
    return { k: NaN, laminarPart: NaN, turbulentPart: NaN };
  }
  const laminarPart = k1 / re;
  const turbulentPart = ki * (1 + kd / Math.pow(diIn, 0.3));
  return {
    k: laminarPart + turbulentPart,
    laminarPart,
    turbulentPart,
  };
}
