/**
 * Crane TP-410 screening L/D and fully-turbulent f_T tables
 * (Appendix A style — commercial steel pipe, turbulent flow).
 */

export type CraneFittingType =
  | "90_elbow_std"
  | "90_elbow_long"
  | "45_elbow"
  | "tee_flow_through"
  | "tee_branch_flow"
  | "gate_valve_full"
  | "globe_valve_std"
  | "check_valve_swing"
  | "ball_valve_full"
  | "butterfly_valve";

export type CraneFittingOption = {
  value: CraneFittingType;
  label: string;
  /** Equivalent length ratio L/D (Crane TP-410). */
  ldRatio: number;
  group: "elbow" | "tee" | "valve";
};

/** Common Crane TP-410 L/D ratios (standard turbulent flow). */
export const CRANE_FITTING_OPTIONS: CraneFittingOption[] = [
  {
    value: "90_elbow_std",
    label: "90° Elbow (standard, r/D ≈ 1)",
    ldRatio: 30,
    group: "elbow",
  },
  {
    value: "90_elbow_long",
    label: "90° Elbow (long radius, r/D ≈ 1.5)",
    ldRatio: 16,
    group: "elbow",
  },
  {
    value: "45_elbow",
    label: "45° Elbow (standard)",
    ldRatio: 16,
    group: "elbow",
  },
  {
    value: "tee_flow_through",
    label: "Tee — flow through run",
    ldRatio: 20,
    group: "tee",
  },
  {
    value: "tee_branch_flow",
    label: "Tee — branch flow",
    ldRatio: 60,
    group: "tee",
  },
  {
    value: "gate_valve_full",
    label: "Gate valve (full open)",
    ldRatio: 8,
    group: "valve",
  },
  {
    value: "globe_valve_std",
    label: "Globe valve (standard)",
    ldRatio: 340,
    group: "valve",
  },
  {
    value: "check_valve_swing",
    label: "Swing check valve",
    ldRatio: 100,
    group: "valve",
  },
  {
    value: "ball_valve_full",
    label: "Ball valve (full bore, open)",
    ldRatio: 3,
    group: "valve",
  },
  {
    value: "butterfly_valve",
    label: "Butterfly valve (full open)",
    ldRatio: 45,
    group: "valve",
  },
];

const FITTING_BY_ID = Object.fromEntries(
  CRANE_FITTING_OPTIONS.map((row) => [row.value, row]),
) as Record<CraneFittingType, CraneFittingOption>;

export function getCraneFitting(type: string): CraneFittingOption | undefined {
  return FITTING_BY_ID[type as CraneFittingType];
}

/**
 * Fully turbulent friction factor f_T for commercial steel pipe
 * (Crane TP-410 Chart / Appendix A screening by NPS).
 */
const FT_BY_NPS: Record<string, number> = {
  "0.5": 0.027,
  "0.75": 0.025,
  "1": 0.023,
  "1.25": 0.022,
  "1.5": 0.021,
  "2": 0.019,
  "2.5": 0.018,
  "3": 0.018,
  "3.5": 0.017,
  "4": 0.017,
  "5": 0.016,
  "6": 0.015,
  "8": 0.014,
  "10": 0.014,
  "12": 0.013,
  "14": 0.013,
  "16": 0.013,
  "18": 0.012,
  "20": 0.012,
  "24": 0.012,
};

export function craneFullyTurbulentFrictionFactor(nps: string): number {
  const key = String(nps).trim();
  if (FT_BY_NPS[key] != null) return FT_BY_NPS[key];
  const n = Number.parseFloat(key);
  if (!Number.isFinite(n)) return 0.019;
  if (n <= 1) return 0.023;
  if (n <= 2) return 0.019;
  if (n <= 4) return 0.017;
  if (n <= 6) return 0.015;
  if (n <= 10) return 0.014;
  return 0.013;
}
