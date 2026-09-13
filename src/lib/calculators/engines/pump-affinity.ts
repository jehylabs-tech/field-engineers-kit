/**
 * Pump Affinity Laws & Impeller Trimming — field screening.
 *
 * Classical affinity (geometrically similar / constant η screen):
 *   Q₂/Q₁ = (N₂/N₁)·(D₂/D₁)
 *   H₂/H₁ = (N₂/N₁)²·(D₂/D₁)²
 *   P₂/P₁ = (N₂/N₁)³·(D₂/D₁)³
 *
 * Speed mode: D₂ locked to D₁. Trim mode: N₂ locked to N₁. Combined: both free.
 *
 * Trim screens (OEM / HI field practice): soft warn D₂/D₁ < 0.80 (~20% cut);
 * hard warn < 0.70. Confirm OEM curves, NPSHr, and motor limits after TA/VFD.
 */

import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";

export type AffinityMode = "speed" | "diameter" | "combined";
export type AffinityFlowUnit = "m3h" | "gpm";

export type PumpAffinityInputs = {
  unitSystem: UnitSystem;
  mode: AffinityMode;
  /** Baseline speed (RPM). */
  speed1: number;
  /** New speed (RPM) — VFD / pulley / gear. */
  speed2: number;
  /** Baseline impeller diameter (mm metric / in imperial). */
  diameter1: number;
  /** Trimmed / new diameter (same units as diameter1). */
  diameter2: number;
  /** Baseline capacity. */
  flow1: number;
  flowUnit: AffinityFlowUnit;
  /** Baseline head (m / ft). */
  head1: number;
  /** Baseline brake / shaft power (kW metric / HP imperial). */
  power1: number;
};

export const AFFINITY_MODE_OPTIONS: {
  value: AffinityMode;
  label: string;
  shortLabel: string;
}[] = [
  {
    value: "speed",
    label: "Speed change (VFD / RPM) — diameter fixed",
    shortLabel: "Speed / VFD",
  },
  {
    value: "diameter",
    label: "Impeller trim — speed fixed",
    shortLabel: "Impeller trim",
  },
  {
    value: "combined",
    label: "Combined VFD + trim",
    shortLabel: "Combined",
  },
];

/** Soft OEM screen: trim beyond this ratio needs curve confirmation. */
export const TRIM_SOFT_LIMIT = 0.8;
/** Hard screen: beyond typical centrifugal trim envelopes. */
export const TRIM_HARD_LIMIT = 0.7;

export const DEFAULT_PUMP_AFFINITY_INPUTS: PumpAffinityInputs = {
  unitSystem: "metric",
  mode: "speed",
  speed1: 1480,
  speed2: 1780,
  diameter1: 250,
  diameter2: 250,
  flow1: 50,
  flowUnit: "m3h",
  head1: 25,
  power1: 5.5,
};

const M3H_TO_GPM = 4.402867513;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function convertFlowBetweenUnits(
  flow: number,
  from: AffinityFlowUnit,
  to: AffinityFlowUnit,
): number {
  if (from === to) return flow;
  if (from === "m3h" && to === "gpm") {
    return Number((finite(flow) * M3H_TO_GPM).toFixed(2));
  }
  return Number((finite(flow) / M3H_TO_GPM).toFixed(2));
}

export type PumpAffinityComputed = {
  mode: AffinityMode;
  speedRatio: number;
  diameterRatio: number;
  /** (N₂/N₁)·(D₂/D₁) — capacity scale factor. */
  capacityRatio: number;
  flow2: number;
  head2: number;
  power2: number;
  flowDeltaPct: number;
  headDeltaPct: number;
  powerDeltaPct: number;
  trimPercent: number;
  /** D₂/D₁ (1 = no cut). */
  diameterFraction: number;
  trimSoftWarn: boolean;
  trimHardWarn: boolean;
  diameterIncrease: boolean;
  largeSpeedChange: boolean;
  invalid: boolean;
};

export function effectiveRatios(inputs: PumpAffinityInputs): {
  speedRatio: number;
  diameterRatio: number;
} {
  const n1 = Math.max(1e-9, finite(inputs.speed1));
  const n2 = Math.max(0, finite(inputs.speed2));
  const d1 = Math.max(1e-9, finite(inputs.diameter1));
  const d2 = Math.max(0, finite(inputs.diameter2));

  if (inputs.mode === "speed") {
    return { speedRatio: n2 / n1, diameterRatio: 1 };
  }
  if (inputs.mode === "diameter") {
    return { speedRatio: 1, diameterRatio: d2 / d1 };
  }
  return { speedRatio: n2 / n1, diameterRatio: d2 / d1 };
}

function pctChange(from: number, to: number): number {
  if (!Number.isFinite(from) || from <= 0 || !Number.isFinite(to)) return 0;
  return ((to - from) / from) * 100;
}

export function computePumpAffinity(
  inputs: PumpAffinityInputs,
): PumpAffinityComputed {
  const { speedRatio, diameterRatio } = effectiveRatios(inputs);
  const capacityRatio = speedRatio * diameterRatio;
  const q1 = Math.max(0, finite(inputs.flow1));
  const h1 = Math.max(0, finite(inputs.head1));
  const p1 = Math.max(0, finite(inputs.power1));
  const d1 = finite(inputs.diameter1);
  const d2 = inputs.mode === "speed" ? d1 : finite(inputs.diameter2);
  const diameterFraction = d1 > 0 ? d2 / d1 : 1;
  const trimPercent =
    diameterFraction < 1 ? (1 - diameterFraction) * 100 : 0;

  const invalid =
    q1 <= 0 ||
    h1 <= 0 ||
    p1 <= 0 ||
    finite(inputs.speed1) <= 0 ||
    (inputs.mode !== "diameter" && finite(inputs.speed2) <= 0) ||
    d1 <= 0 ||
    (inputs.mode !== "speed" && d2 <= 0) ||
    !Number.isFinite(speedRatio) ||
    !Number.isFinite(diameterRatio);

  const flow2 = invalid ? 0 : q1 * capacityRatio;
  const head2 = invalid ? 0 : h1 * capacityRatio ** 2;
  const power2 = invalid ? 0 : p1 * capacityRatio ** 3;

  const trimHardWarn =
    inputs.mode !== "speed" && diameterFraction < TRIM_HARD_LIMIT;
  const trimSoftWarn =
    inputs.mode !== "speed" &&
    diameterFraction < TRIM_SOFT_LIMIT &&
    !trimHardWarn;
  const diameterIncrease =
    inputs.mode !== "speed" && diameterFraction > 1.001;
  const largeSpeedChange =
    inputs.mode !== "diameter" &&
    (speedRatio > 1.25 || speedRatio < 0.5);

  return {
    mode: inputs.mode,
    speedRatio,
    diameterRatio,
    capacityRatio,
    flow2,
    head2,
    power2,
    flowDeltaPct: invalid ? 0 : pctChange(q1, flow2),
    headDeltaPct: invalid ? 0 : pctChange(h1, head2),
    powerDeltaPct: invalid ? 0 : pctChange(p1, power2),
    trimPercent,
    diameterFraction,
    trimSoftWarn,
    trimHardWarn,
    diameterIncrease,
    largeSpeedChange,
    invalid,
  };
}

function formatFlow(q: number, flowUnit: AffinityFlowUnit): string {
  if (!Number.isFinite(q) || q <= 0) {
    return flowUnit === "gpm" ? "— GPM" : "— m³/h";
  }
  const digits = q >= 100 ? 1 : 2;
  return flowUnit === "gpm"
    ? `${q.toFixed(digits)} GPM`
    : `${q.toFixed(digits)} m³/h`;
}

function formatHead(h: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(h) || h <= 0) {
    return unitSystem === "imperial" ? "— ft" : "— m";
  }
  const digits = h >= 100 ? 1 : 2;
  return unitSystem === "imperial"
    ? `${h.toFixed(digits)} ft`
    : `${h.toFixed(digits)} m`;
}

function formatPower(p: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(p) || p <= 0) {
    return unitSystem === "imperial" ? "— HP" : "— kW";
  }
  const digits = p >= 10 ? 1 : 2;
  return unitSystem === "imperial"
    ? `${p.toFixed(digits)} HP`
    : `${p.toFixed(digits)} kW`;
}

function formatRatio(r: number): string {
  if (!Number.isFinite(r)) return "—";
  return `${r.toFixed(3)}×`;
}

function formatDeltaPct(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)} %`;
}

function formatDiameter(d: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(d) || d <= 0) {
    return unitSystem === "imperial" ? "— in" : "— mm";
  }
  return unitSystem === "imperial"
    ? `${d.toFixed(3)} in`
    : `${d.toFixed(1)} mm`;
}

function statusFor(c: PumpAffinityComputed): {
  level: StatusLevel;
  label: string;
} {
  if (c.invalid) {
    return {
      level: "warn",
      label: "Enter positive baseline Q, H, P and valid N₁ / D₁ (and targets)",
    };
  }
  if (c.trimHardWarn) {
    return {
      level: "fail",
      label: `Trim ${c.trimPercent.toFixed(0)}% (D₂/D₁ = ${c.diameterFraction.toFixed(2)}) — beyond ~70% screening limit; OEM curve required`,
    };
  }
  if (c.diameterIncrease) {
    return {
      level: "warn",
      label:
        "D₂ > D₁ — oversized impeller is not a shop trim case; confirm OEM",
    };
  }
  if (c.trimSoftWarn) {
    return {
      level: "warn",
      label: `Trim ${c.trimPercent.toFixed(0)}% — near typical OEM limit (~20%); verify BEP / NPSHr after cut`,
    };
  }
  if (c.largeSpeedChange) {
    return {
      level: "warn",
      label: `Large speed ratio (${c.speedRatio.toFixed(2)}×) — check motor, NPSH, and OEM max RPM`,
    };
  }
  return {
    level: "pass",
    label: "Affinity screen OK — confirm efficiency / NPSH on OEM curve",
  };
}

export function calculatePumpAffinity(
  inputs: PumpAffinityInputs,
): CalculatorOutput {
  const c = computePumpAffinity(inputs);
  const status = statusFor(c);
  const modeLabel =
    AFFINITY_MODE_OPTIONS.find((m) => m.value === inputs.mode)?.label ??
    inputs.mode;

  const q2Out = c.invalid ? "—" : formatFlow(c.flow2, inputs.flowUnit);
  const h2Out = c.invalid ? "—" : formatHead(c.head2, inputs.unitSystem);
  const p2Out = c.invalid ? "—" : formatPower(c.power2, inputs.unitSystem);

  const d1Eff = finite(inputs.diameter1);
  const d2Eff = inputs.mode === "speed" ? d1Eff : finite(inputs.diameter2);
  const n1Eff = finite(inputs.speed1);
  const n2Eff = inputs.mode === "diameter" ? n1Eff : finite(inputs.speed2);

  return {
    heroLabel: "Predicted capacity Q₂",
    heroValue: q2Out,
    heroStatus: status.label,
    heroStatusLevel: status.level,
    heroBadges: [
      { label: "H₂", value: h2Out },
      { label: "P₂", value: p2Out },
      {
        label: "ΔP",
        value: c.invalid ? "—" : formatDeltaPct(c.powerDeltaPct),
      },
      {
        label: "N₂/N₁",
        value: formatRatio(c.speedRatio),
      },
      {
        label: "D₂/D₁",
        value: formatRatio(c.diameterRatio),
      },
    ],
    summary: [
      { label: "Q₂", value: q2Out },
      { label: "H₂", value: h2Out },
      { label: "P₂", value: p2Out },
    ],
    summaryStatus: {
      label:
        "Affinity screening (η assumed constant) — not a substitute for OEM curves or HI acceptance tests",
      level: "neutral",
    },
    rows: [
      {
        label: "Mode",
        value: modeLabel,
        section: "Duty change",
      },
      {
        label: "Speed N₁ → N₂",
        value: `${n1Eff.toFixed(0)} → ${n2Eff.toFixed(0)} RPM`,
        section: "Duty change",
        emphasis: true,
      },
      {
        label: "Diameter D₁ → D₂",
        value: `${formatDiameter(d1Eff, inputs.unitSystem)} → ${formatDiameter(d2Eff, inputs.unitSystem)}`,
        section: "Duty change",
        emphasis: true,
      },
      {
        label: "Speed ratio N₂/N₁",
        value: formatRatio(c.speedRatio),
        section: "Duty change",
      },
      {
        label: "Diameter ratio D₂/D₁",
        value: formatRatio(c.diameterRatio),
        section: "Duty change",
        warn: c.trimSoftWarn || c.trimHardWarn || c.diameterIncrease,
      },
      {
        label: "Capacity scale (N·D)",
        value: formatRatio(c.capacityRatio),
        section: "Duty change",
      },
      {
        label: "Trim cut",
        value:
          c.trimPercent > 0
            ? `${c.trimPercent.toFixed(1)} % of D₁`
            : "None (D₂ ≥ D₁)",
        section: "Duty change",
        warn: c.trimSoftWarn || c.trimHardWarn,
      },
      {
        label: "Baseline Q₁",
        value: formatFlow(finite(inputs.flow1), inputs.flowUnit),
        section: "Predicted performance",
      },
      {
        label: "Predicted Q₂",
        value: q2Out,
        section: "Predicted performance",
        emphasis: true,
      },
      {
        label: "ΔQ",
        value: c.invalid ? "—" : formatDeltaPct(c.flowDeltaPct),
        section: "Predicted performance",
      },
      {
        label: "Baseline H₁",
        value: formatHead(finite(inputs.head1), inputs.unitSystem),
        section: "Predicted performance",
      },
      {
        label: "Predicted H₂",
        value: h2Out,
        section: "Predicted performance",
        emphasis: true,
      },
      {
        label: "ΔH",
        value: c.invalid ? "—" : formatDeltaPct(c.headDeltaPct),
        section: "Predicted performance",
      },
      {
        label: "Baseline P₁",
        value: formatPower(finite(inputs.power1), inputs.unitSystem),
        section: "Predicted performance",
      },
      {
        label: "Predicted P₂",
        value: p2Out,
        section: "Predicted performance",
        emphasis: true,
      },
      {
        label: "ΔP (power)",
        value: c.invalid ? "—" : formatDeltaPct(c.powerDeltaPct),
        section: "Predicted performance",
        warn: !c.invalid && c.powerDeltaPct > 50,
      },
    ],
    callouts: [
      {
        tone: "info",
        title: "Affinity laws (constant η screen)",
        body: "For geometrically similar operation: Q ∝ N·D, H ∝ (N·D)², P ∝ (N·D)³. Use speed mode for VFD setpoints, diameter mode for shop impeller cuts, or combined when both change in the same TA.",
        items: [
          "Efficiency is assumed constant — real η usually drops slightly off the original BEP.",
          "NPSHr roughly scales with speed² (and diameter²) — recheck NPSH after large cuts or speed-up.",
          "Typical centrifugal trim screen: keep D₂/D₁ ≳ 0.80; below ~0.70 needs OEM approval.",
        ],
      },
      ...(c.trimHardWarn || c.trimSoftWarn
        ? [
            {
              tone: "warn" as const,
              title: "Trimming limit warning",
              body: c.trimHardWarn
                ? `Proposed cut removes ~${c.trimPercent.toFixed(0)}% of diameter (D₂/D₁ = ${c.diameterFraction.toFixed(3)}). Many centrifugal pumps are limited to about 20–30% maximum trim. Do not release a shop cut without OEM curve / HI guidance.`
                : `Proposed cut is ~${c.trimPercent.toFixed(0)}% (D₂/D₁ = ${c.diameterFraction.toFixed(3)}), near the common ~20% OEM screening limit. Recheck BEP, power, and NPSHr on the manufacturer curve after machining.`,
            },
          ]
        : []),
    ],
    exportRows: [
      { label: "Standard", value: "Affinity laws · HI / OEM screening" },
      { label: "Mode", value: modeLabel },
      { label: "N₁ (RPM)", value: String(n1Eff) },
      { label: "N₂ (RPM)", value: String(n2Eff) },
      {
        label: "D₁",
        value: formatDiameter(d1Eff, inputs.unitSystem),
      },
      {
        label: "D₂",
        value: formatDiameter(d2Eff, inputs.unitSystem),
      },
      { label: "N₂/N₁", value: formatRatio(c.speedRatio) },
      { label: "D₂/D₁", value: formatRatio(c.diameterRatio) },
      { label: "(N·D) scale", value: formatRatio(c.capacityRatio) },
      {
        label: "Q₁",
        value: formatFlow(finite(inputs.flow1), inputs.flowUnit),
      },
      { label: "Q₂", value: q2Out },
      { label: "ΔQ %", value: formatDeltaPct(c.flowDeltaPct) },
      {
        label: "H₁",
        value: formatHead(finite(inputs.head1), inputs.unitSystem),
      },
      { label: "H₂", value: h2Out },
      { label: "ΔH %", value: formatDeltaPct(c.headDeltaPct) },
      {
        label: "P₁",
        value: formatPower(finite(inputs.power1), inputs.unitSystem),
      },
      { label: "P₂", value: p2Out },
      { label: "ΔP %", value: formatDeltaPct(c.powerDeltaPct) },
      {
        label: "Trim warning",
        value: c.trimHardWarn
          ? "HARD — below ~70% D"
          : c.trimSoftWarn
            ? "SOFT — below ~80% D"
            : "None",
      },
    ],
  };
}

/** Sync companion fields when switching mode so locked ratios stay coherent. */
export function applyAffinityMode(
  mode: AffinityMode,
  current: PumpAffinityInputs,
): PumpAffinityInputs {
  if (mode === "speed") {
    return { ...current, mode, diameter2: current.diameter1 };
  }
  if (mode === "diameter") {
    return { ...current, mode, speed2: current.speed1 };
  }
  return { ...current, mode };
}
