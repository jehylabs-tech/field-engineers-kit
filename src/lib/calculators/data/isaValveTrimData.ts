/**
 * Typical ISA-75.01.01 / IEC 60534-2-1 valve trim factors (x_T, F_L)
 * for screening when manufacturer data is unavailable.
 * Values are representative single-stage, no reducers (F_P = 1).
 */

export type IsaValveTrimKind =
  | "globe_single"
  | "globe_cage"
  | "butterfly_60"
  | "butterfly_90"
  | "ball_full"
  | "ball_v_notch"
  | "custom";

export type IsaValveTrimPreset = {
  id: IsaValveTrimKind;
  label: string;
  /** Pressure differential ratio factor (gas / vapor). */
  xt: number;
  /** Liquid pressure recovery factor. */
  fl: number;
};

export const ISA_VALVE_TRIM_PRESETS: IsaValveTrimPreset[] = [
  {
    id: "globe_single",
    label: "Globe · single seated (x_T≈0.70, F_L≈0.90)",
    xt: 0.7,
    fl: 0.9,
  },
  {
    id: "globe_cage",
    label: "Globe · cage / contoured (x_T≈0.75, F_L≈0.85)",
    xt: 0.75,
    fl: 0.85,
  },
  {
    id: "butterfly_60",
    label: "Butterfly · 60° open (x_T≈0.50, F_L≈0.68)",
    xt: 0.5,
    fl: 0.68,
  },
  {
    id: "butterfly_90",
    label: "Butterfly · 90° open (x_T≈0.35, F_L≈0.55)",
    xt: 0.35,
    fl: 0.55,
  },
  {
    id: "ball_full",
    label: "Ball · full port (x_T≈0.25, F_L≈0.60)",
    xt: 0.25,
    fl: 0.6,
  },
  {
    id: "ball_v_notch",
    label: "Ball · V-notch (x_T≈0.55, F_L≈0.72)",
    xt: 0.55,
    fl: 0.72,
  },
  {
    id: "custom",
    label: "Custom (enter x_T / F_L)",
    xt: 0.7,
    fl: 0.9,
  },
];

export function getIsaValveTrimPreset(
  id: IsaValveTrimKind,
): IsaValveTrimPreset {
  return (
    ISA_VALVE_TRIM_PRESETS.find((p) => p.id === id) ??
    ISA_VALVE_TRIM_PRESETS[0]
  );
}

/** Water critical pressure (bar abs) — IAPWS / common ISA screening. */
export const WATER_CRITICAL_PRESSURE_BAR_ABS = 220.64;

/** Water vapor pressure ≈ 25 °C (bar abs). */
export const WATER_VAPOR_PRESSURE_25C_BAR_ABS = 0.0317;
