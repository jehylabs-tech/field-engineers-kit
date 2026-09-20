/**
 * Control Valve Choked Flow & x_T / F_L Screening — ISA-75.01.01 / IEC 60534-2-1.
 * Gas: x vs F_k·x_T. Liquid: ΔP vs F_L²(P1 − r_c·P_v). F_P = 1 (no reducers).
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  WATER_CRITICAL_PRESSURE_BAR_ABS,
  WATER_VAPOR_PRESSURE_25C_BAR_ABS,
  type IsaValveTrimKind,
} from "@/lib/calculators/data/isaValveTrimData";
import { barToPsi, psiToBar } from "@/lib/unitConverter";

export type ChokedFluidState = "gas" | "liquid";

export type ControlValveChokedInputs = {
  unitSystem: UnitSystem;
  fluidState: ChokedFluidState;
  /** Upstream absolute pressure — bar abs (metric) or psia (imperial). */
  p1: number;
  /** Downstream absolute pressure — bar abs / psia. */
  p2: number;
  /** Valve x_T (gas mode). */
  xtFactor: number;
  /** Valve F_L (liquid mode). */
  flFactor: number;
  /** Gas specific-heat ratio k = C_p/C_v. */
  specificHeatRatio: number;
  /** Liquid vapor pressure P_v — bar abs / psia. */
  vaporPressure: number;
  /** Liquid critical pressure P_c — bar abs / psia. */
  criticalPressure: number;
  /** Optional trim preset id for UI chips (does not affect compute). */
  trimPreset?: IsaValveTrimKind;
};

export const PRESSURE_RANGE = { min: 0.01, max: 300 } as const;
export const XT_RANGE = { min: 0.1, max: 0.95 } as const;
export const FL_RANGE = { min: 0.4, max: 0.99 } as const;
export const K_RANGE = { min: 1.0, max: 2.0 } as const;

export const DEFAULT_CONTROL_VALVE_CHOKED_INPUTS: ControlValveChokedInputs = {
  unitSystem: "metric",
  fluidState: "gas",
  p1: 10,
  p2: 4,
  xtFactor: 0.7,
  flFactor: 0.9,
  specificHeatRatio: 1.4,
  vaporPressure: WATER_VAPOR_PRESSURE_25C_BAR_ABS,
  criticalPressure: WATER_CRITICAL_PRESSURE_BAR_ABS,
  trimPreset: "globe_single",
};

export const DEFAULT_CONTROL_VALVE_CHOKED_INPUTS_IMPERIAL: ControlValveChokedInputs =
  {
    unitSystem: "imperial",
    fluidState: "gas",
    p1: Number(barToPsi(10).toFixed(2)),
    p2: Number(barToPsi(4).toFixed(2)),
    xtFactor: 0.7,
    flFactor: 0.9,
    specificHeatRatio: 1.4,
    vaporPressure: Number(
      barToPsi(WATER_VAPOR_PRESSURE_25C_BAR_ABS).toFixed(3),
    ),
    criticalPressure: Number(
      barToPsi(WATER_CRITICAL_PRESSURE_BAR_ABS).toFixed(1),
    ),
    trimPreset: "globe_single",
  };

export type ChokedFlowState =
  | "subsonic"
  | "choked"
  | "normal_liquid"
  | "cavitating"
  | "flashing";

export type ControlValveChokedComputed = {
  invalid: boolean;
  invalidReason?: string;
  fluidState: ChokedFluidState;
  /** Absolute pressures in bar abs (internal SI). */
  p1BarAbs: number;
  p2BarAbs: number;
  deltaPBar: number;
  xt: number;
  fl: number;
  k: number;
  fk: number;
  /** Gas pressure differential ratio x = ΔP/P1. */
  x: number;
  xChoked: number;
  /** Gas effective max ΔP (bar). */
  deltaPMaxGasBar: number;
  /** Liquid critical pressure ratio factor r_c. */
  rc: number;
  pvBarAbs: number;
  pcBarAbs: number;
  /** Liquid cavitation limit ΔP_cav (bar). */
  deltaPCavBar: number;
  /** Effective max ΔP for sizing cap (bar). */
  deltaPMaxBar: number;
  /** x / x_choked (gas) or ΔP / ΔP_cav (liquid). */
  marginRatio: number;
  choked: boolean;
  flowState: ChokedFlowState;
  flowStateLabel: string;
  riskLabel: string;
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function toBarAbs(value: number, imperial: boolean): number {
  return imperial ? psiToBar(value) : value;
}

export function computeControlValveChoked(
  inputs: ControlValveChokedInputs,
): ControlValveChokedComputed {
  const imperial = inputs.unitSystem === "imperial";
  const fluidState = inputs.fluidState === "liquid" ? "liquid" : "gas";
  const xt = clamp(inputs.xtFactor, XT_RANGE.min, XT_RANGE.max);
  const fl = clamp(inputs.flFactor, FL_RANGE.min, FL_RANGE.max);
  const k = clamp(inputs.specificHeatRatio, K_RANGE.min, K_RANGE.max);
  const fk = k / 1.4;

  const p1BarAbs = toBarAbs(inputs.p1, imperial);
  const p2BarAbs = toBarAbs(inputs.p2, imperial);
  const pvBarAbs = toBarAbs(inputs.vaporPressure, imperial);
  const pcBarAbs = toBarAbs(inputs.criticalPressure, imperial);

  const empty = (reason: string): ControlValveChokedComputed => ({
    invalid: true,
    invalidReason: reason,
    fluidState,
    p1BarAbs,
    p2BarAbs,
    deltaPBar: NaN,
    xt,
    fl,
    k,
    fk,
    x: NaN,
    xChoked: fk * xt,
    deltaPMaxGasBar: NaN,
    rc: NaN,
    pvBarAbs,
    pcBarAbs,
    deltaPCavBar: NaN,
    deltaPMaxBar: NaN,
    marginRatio: NaN,
    choked: false,
    flowState: "subsonic",
    flowStateLabel: "—",
    riskLabel: "—",
  });

  if (!(p1BarAbs >= PRESSURE_RANGE.min && p1BarAbs <= PRESSURE_RANGE.max)) {
    return empty(`P1 must be ${PRESSURE_RANGE.min}–${PRESSURE_RANGE.max} (abs)`);
  }
  if (!(p2BarAbs >= PRESSURE_RANGE.min && p2BarAbs <= PRESSURE_RANGE.max)) {
    return empty(`P2 must be ${PRESSURE_RANGE.min}–${PRESSURE_RANGE.max} (abs)`);
  }
  if (!(p1BarAbs > p2BarAbs)) {
    return empty("P1 must be greater than P2 (flowing differential required)");
  }

  const deltaPBar = p1BarAbs - p2BarAbs;
  const x = deltaPBar / p1BarAbs;
  const xChoked = fk * xt;
  const deltaPMaxGasBar = xChoked * p1BarAbs;

  let rc = NaN;
  let deltaPCavBar = NaN;
  if (fluidState === "liquid") {
    if (!(pcBarAbs > 0)) {
      return empty("Critical pressure P_c must be greater than zero");
    }
    if (!(pvBarAbs >= 0) || pvBarAbs >= p1BarAbs) {
      return empty("Vapor pressure P_v must be ≥ 0 and less than P1");
    }
    rc = 0.96 - 0.28 * Math.sqrt(pvBarAbs / pcBarAbs);
    rc = clamp(rc, 0.5, 1.0);
    deltaPCavBar = fl * fl * (p1BarAbs - rc * pvBarAbs);
  }

  let choked = false;
  let flowState: ChokedFlowState;
  let flowStateLabel: string;
  let riskLabel: string;
  let marginRatio: number;
  let deltaPMaxBar: number;

  if (fluidState === "gas") {
    deltaPMaxBar = deltaPMaxGasBar;
    marginRatio = xChoked > 0 ? x / xChoked : Number.POSITIVE_INFINITY;
    choked = x >= xChoked - 1e-9;
    if (choked) {
      flowState = "choked";
      flowStateLabel = "Choked (sonic)";
      riskLabel = "High · ΔP capped · noise risk";
    } else {
      flowState = "subsonic";
      flowStateLabel = "Subsonic";
      riskLabel =
        marginRatio >= 0.85 ? "Elevated · near choke" : "Low · expandable";
    }
  } else {
    deltaPMaxBar = deltaPCavBar;
    marginRatio =
      deltaPCavBar > 0 ? deltaPBar / deltaPCavBar : Number.POSITIVE_INFINITY;
    if (p2BarAbs <= pvBarAbs + 1e-9) {
      choked = true;
      flowState = "flashing";
      flowStateLabel = "Flashing";
      riskLabel = "Critical · two-phase / erosion";
    } else if (deltaPBar >= deltaPCavBar - 1e-9) {
      choked = true;
      flowState = "cavitating";
      flowStateLabel = "Cavitating";
      riskLabel = "High · cavitation / noise";
    } else {
      choked = false;
      flowState = "normal_liquid";
      flowStateLabel = "Normal liquid";
      riskLabel =
        marginRatio >= 0.85 ? "Elevated · near cavitation" : "Low · single-phase";
    }
  }

  return {
    invalid: false,
    fluidState,
    p1BarAbs,
    p2BarAbs,
    deltaPBar,
    xt,
    fl,
    k,
    fk,
    x,
    xChoked,
    deltaPMaxGasBar,
    rc,
    pvBarAbs,
    pcBarAbs,
    deltaPCavBar,
    deltaPMaxBar,
    marginRatio,
    choked,
    flowState,
    flowStateLabel,
    riskLabel,
  };
}

function fmtPressure(barAbs: number, imperial: boolean): string {
  if (imperial) {
    return `${barToPsi(barAbs).toFixed(2)} psi (${barAbs.toFixed(2)} bar)`;
  }
  return `${barAbs.toFixed(2)} bar (${barToPsi(barAbs).toFixed(2)} psi)`;
}

/** Compact single-system pressure for side-by-side comparisons. */
function fmtP(barAbs: number, imperial: boolean): string {
  return imperial
    ? `${barToPsi(barAbs).toFixed(2)} psi`
    : `${barAbs.toFixed(2)} bar`;
}

function headroomLabel(
  c: ControlValveChokedComputed,
  imperial: boolean,
): string {
  if (c.fluidState === "gas") {
    const remain = c.xChoked - c.x;
    return remain >= 0
      ? `Δx ${remain.toFixed(3)}`
      : `over by ${Math.abs(remain).toFixed(3)}`;
  }
  const remainBar = c.deltaPCavBar - c.deltaPBar;
  if (remainBar >= 0) {
    return `+${fmtP(remainBar, imperial)}`;
  }
  return `−${fmtP(Math.abs(remainBar), imperial)}`;
}

export function calculateControlValveChoked(
  inputs: ControlValveChokedInputs,
): CalculatorOutput {
  const c = computeControlValveChoked(inputs);
  const imperial = inputs.unitSystem === "imperial";

  const callouts: ResultCallout[] = [];
  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Check pressure / trim inputs",
      body: c.invalidReason,
    });
  } else if (c.choked) {
    callouts.push({
      tone: "warn",
      title:
        c.flowState === "flashing"
          ? "Flashing limit"
          : c.flowState === "cavitating"
            ? "Cavitation limit"
            : "Choked-flow limit",
      body: `ISA-75.01.01 / IEC 60534-2-1 (F_P = 1). Effective ΔP caps at ${fmtPressure(c.deltaPMaxBar, imperial)}. Consider multi-stage / anti-cavitation trim or noise screening (IEC 60534-8).`,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Screening Note",
      body: "ISA-75.01.01 / IEC 60534-2-1 for trims without reducers (F_P = 1). Prefer manufacturer x_T / F_L. Absolute pressures only.",
    });
  }

  let heroValue: string;
  if (c.invalid) {
    heroValue = "—";
  } else if (c.fluidState === "gas") {
    heroValue = c.choked
      ? `Choked · x/x_choked = ${c.marginRatio.toFixed(2)}`
      : `Non-choked · x/x_choked = ${c.marginRatio.toFixed(2)}`;
  } else if (c.flowState === "flashing") {
    heroValue = `Flashing · ΔP/ΔP_cav = ${c.marginRatio.toFixed(2)}`;
  } else if (c.flowState === "cavitating") {
    heroValue = `Cavitation · ΔP/ΔP_cav = ${c.marginRatio.toFixed(2)}`;
  } else {
    heroValue = `Normal · ΔP/ΔP_cav = ${c.marginRatio.toFixed(2)}`;
  }

  const heroStatus = c.invalid
    ? "Check inputs"
    : c.choked
      ? c.flowStateLabel
      : c.marginRatio >= 0.85
        ? "Near limit"
        : "OK";
  const heroStatusLevel: StatusLevel = c.invalid
    ? "fail"
    : c.choked
      ? "fail"
      : c.marginRatio >= 0.85
        ? "warn"
        : "pass";

  // Lean rows: no Risk echo (hero+callout), no liquid ΔP_max duplicate of ΔP_cav.
  const rows: ResultRow[] = [];
  if (!c.invalid) {
    if (c.fluidState === "gas") {
      rows.push(
        {
          section: "Limits",
          label: "x vs x_choked",
          value: `${c.x.toFixed(3)} vs ${c.xChoked.toFixed(3)}`,
          emphasis: true,
          warn: c.choked,
        },
        {
          section: "Limits",
          label: "Operating ΔP",
          value: fmtPressure(c.deltaPBar, imperial),
        },
        {
          section: "Limits",
          label: "Max effective ΔP (x_choked·P1)",
          value: fmtPressure(c.deltaPMaxGasBar, imperial),
          emphasis: c.choked,
        },
      );
    } else {
      rows.push(
        {
          section: "Limits",
          label: "ΔP vs ΔP_cav",
          value: `${fmtP(c.deltaPBar, imperial)} vs ${fmtP(c.deltaPCavBar, imperial)}`,
          emphasis: true,
          warn: c.choked,
        },
        {
          section: "Limits",
          label: "r_c · F_L",
          value: `${c.rc.toFixed(4)} · ${c.fl.toFixed(2)}`,
        },
      );
    }
  }

  const badges = c.invalid
    ? undefined
    : c.fluidState === "gas"
      ? [
          { label: "x", value: c.x.toFixed(3) },
          { label: "x_choked", value: c.xChoked.toFixed(3) },
          { label: "F_k", value: c.fk.toFixed(3) },
          { label: "Headroom", value: headroomLabel(c, imperial) },
        ]
      : [
          { label: "ΔP", value: fmtP(c.deltaPBar, imperial) },
          { label: "ΔP_cav", value: fmtP(c.deltaPCavBar, imperial) },
          { label: "r_c", value: c.rc.toFixed(3) },
          { label: "Headroom", value: headroomLabel(c, imperial) },
        ];

  return {
    heroLabel:
      c.fluidState === "gas"
        ? "Gas choked-flow status"
        : "Liquid cavitation / flashing status",
    heroValue,
    heroStatus,
    heroStatusLevel,
    heroBadges: badges,
    summary: badges ?? [],
    summaryStatus: {
      label: heroStatus,
      level: heroStatusLevel,
    },
    rows,
    callouts,
    exportRows: [
      {
        label: "Standard",
        value: "ISA-75.01.01 / IEC 60534-2-1 (F_P = 1)",
      },
      { label: "Fluid", value: c.fluidState },
      {
        label: "P1 bar abs",
        value: c.invalid ? "—" : c.p1BarAbs.toFixed(4),
      },
      {
        label: "P2 bar abs",
        value: c.invalid ? "—" : c.p2BarAbs.toFixed(4),
      },
      { label: "x", value: c.invalid ? "—" : c.x.toFixed(5) },
      { label: "x_choked", value: c.invalid ? "—" : c.xChoked.toFixed(5) },
      { label: "F_k", value: c.invalid ? "—" : c.fk.toFixed(5) },
      { label: "x_T", value: String(c.xt) },
      { label: "F_L", value: String(c.fl) },
      {
        label: "r_c",
        value: c.invalid || !Number.isFinite(c.rc) ? "—" : c.rc.toFixed(5),
      },
      {
        label: "ΔP_cav bar",
        value:
          c.invalid || !Number.isFinite(c.deltaPCavBar)
            ? "—"
            : c.deltaPCavBar.toFixed(4),
      },
      {
        label: "ΔP_max bar",
        value: c.invalid ? "—" : c.deltaPMaxBar.toFixed(4),
      },
      { label: "Flow state", value: c.flowState },
      {
        label: "Margin ratio",
        value: c.invalid ? "—" : c.marginRatio.toFixed(4),
      },
    ],
  };
}
