/**
 * Multiple Pump Parallel & Series Operation — system-curve intersection.
 *
 * Basis: ANSI/HI 14.3 screening with quadratic pump & system approximations
 * (HI Engineering Data Book / Crane TP-410 style resistance curves).
 *
 * Single pump:  H₁(Q) = H_so − a Q² ,  a = (H_so − H_rated) / Q_rated²
 * System:       H_sys(Q) = H_static + k Q² ,  k = ΔH_friction(Q_ref) / Q_ref²
 *               (Q_ref = Q_rated for field screening)
 *
 * Parallel (N identical): H = H_so − a (Q/N)²
 *   Q_op = √( (H_so − H_static) / (k + a/N²) )
 *
 * Series (N identical):   H = N (H_so − a Q²)
 *   Q_op = √( (N·H_so − H_static) / (k + N·a) )
 *
 * Screening only — confirm OEM curves, NPSH, and motor limits.
 */

import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";

export type MultiPumpMode = "parallel" | "series";
export type MultiPumpFlowUnit = "m3h" | "gpm";

export type MultiPumpInputs = {
  unitSystem: UnitSystem;
  mode: MultiPumpMode;
  /** Identical operating pumps (1–4). */
  pumpCount: number;
  /** Single-pump shut-off head — m or ft. */
  headShutoff: number;
  /** Rated flow for curve fit / friction reference — m³/h or GPM. */
  flowRated: number;
  flowUnit: MultiPumpFlowUnit;
  /** Rated head at flowRated — m or ft. */
  headRated: number;
  /** Static lift + pressure head — m or ft. */
  headStatic: number;
  /** System friction head at flowRated — m or ft. */
  headFrictionRated: number;
};

export const MULTI_PUMP_MODE_OPTIONS: {
  value: MultiPumpMode;
  label: string;
  shortLabel: string;
}[] = [
  {
    value: "parallel",
    label: "Parallel (flow adds, common head)",
    shortLabel: "Parallel",
  },
  {
    value: "series",
    label: "Series (head adds, common flow)",
    shortLabel: "Series",
  },
];

export const DEFAULT_MULTI_PUMP_INPUTS: MultiPumpInputs = {
  unitSystem: "metric",
  mode: "parallel",
  pumpCount: 2,
  headShutoff: 60,
  flowRated: 100,
  flowUnit: "m3h",
  headRated: 45,
  headStatic: 15,
  headFrictionRated: 20,
};

const M3H_TO_GPM = 4.402867513;
const RUNOUT_RATIO = 1.25;
/** Extra flow vs single alone below this → diminishing-return warn (parallel). */
const DIMINISHING_EXTRA_FRAC = 0.15;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function convertFlowBetweenUnits(
  flow: number,
  from: MultiPumpFlowUnit,
  to: MultiPumpFlowUnit,
): number {
  if (from === to) return flow;
  if (from === "m3h" && to === "gpm") {
    return Number((finite(flow) * M3H_TO_GPM).toFixed(2));
  }
  return Number((finite(flow) / M3H_TO_GPM).toFixed(2));
}

function toSi(inputs: MultiPumpInputs): {
  hSo: number;
  hRated: number;
  hStatic: number;
  hFric: number;
  qRatedM3h: number;
} {
  const imperial = inputs.unitSystem === "imperial";
  const qRatedM3h =
    inputs.flowUnit === "gpm"
      ? finite(inputs.flowRated) / M3H_TO_GPM
      : finite(inputs.flowRated);
  const scale = imperial ? 0.3048 : 1;
  return {
    hSo: finite(inputs.headShutoff) * scale,
    hRated: finite(inputs.headRated) * scale,
    hStatic: finite(inputs.headStatic) * scale,
    hFric: Math.max(0, finite(inputs.headFrictionRated) * scale),
    qRatedM3h,
  };
}

export type MultiPumpComputed = {
  mode: MultiPumpMode;
  n: number;
  a: number;
  kSys: number;
  /** k/a — friction vs pump curve steepness (≫1 → diminishing parallel gain). */
  kOverA: number;
  qOpM3h: number;
  hOpM: number;
  /** Head from combined pump curve at Q_op (should ≈ hOpM). */
  hPumpCurveM: number;
  qPerPumpM3h: number;
  /** Q_per_pump / Q_rated. */
  qRatioToRated: number;
  qAloneM3h: number;
  hAloneM: number;
  /** Parallel: Q_op / (N·Q_alone) · 100. Series: unused → 0. */
  flowGainPercent: number;
  /** Series: H_op / (N·H_alone) or H_op/(N·H_so) if alone has no intersect. */
  headGainPercent: number;
  headGainUsesShutoffStack: boolean;
  /** (Q_op − Q_alone) / Q_alone for parallel N≥2. */
  extraFlowVsAlonePercent: number;
  runoutRisk: boolean;
  diminishingReturn: boolean;
  steepSystem: boolean;
  noIntersection: boolean;
  invalid: boolean;
};

export function computeMultiPump(inputs: MultiPumpInputs): MultiPumpComputed {
  const n = Math.min(4, Math.max(1, Math.round(finite(inputs.pumpCount, 2))));
  const si = toSi(inputs);
  const qR = si.qRatedM3h;

  const invalid =
    qR <= 0 ||
    si.hSo <= 0 ||
    si.hRated <= 0 ||
    si.hRated >= si.hSo ||
    si.hStatic < 0 ||
    si.hFric < 0;

  const a = !invalid ? (si.hSo - si.hRated) / (qR * qR) : 0;
  const kSys = !invalid && qR > 0 ? si.hFric / (qR * qR) : 0;

  const aloneNum = si.hSo - si.hStatic;
  const aloneDen = kSys + a;
  const noAlone =
    invalid || aloneNum <= 0 || aloneDen <= 0 || !Number.isFinite(aloneNum / aloneDen);
  const qAloneM3h = noAlone ? 0 : Math.sqrt(aloneNum / aloneDen);
  const hAloneM = noAlone ? 0 : si.hStatic + kSys * qAloneM3h * qAloneM3h;

  let qOpM3h = 0;
  let noIntersection = noAlone;

  if (!invalid) {
    if (inputs.mode === "parallel") {
      const num = si.hSo - si.hStatic;
      const den = kSys + a / (n * n);
      if (num <= 0 || den <= 0) {
        noIntersection = true;
      } else {
        qOpM3h = Math.sqrt(num / den);
        noIntersection = false;
      }
    } else {
      const num = n * si.hSo - si.hStatic;
      const den = kSys + n * a;
      if (num <= 0 || den <= 0) {
        noIntersection = true;
      } else {
        qOpM3h = Math.sqrt(num / den);
        noIntersection = false;
      }
    }
  }

  const hOpM =
    !noIntersection && qOpM3h > 0
      ? si.hStatic + kSys * qOpM3h * qOpM3h
      : 0;

  const qPerPumpM3h =
    inputs.mode === "parallel" && n > 0 ? qOpM3h / n : qOpM3h;

  const hPumpCurveM =
    !noIntersection && qOpM3h > 0
      ? inputs.mode === "parallel"
        ? si.hSo - a * (qOpM3h / n) ** 2
        : n * (si.hSo - a * qOpM3h * qOpM3h)
      : 0;

  const qRatioToRated = qR > 0 && !noIntersection ? qPerPumpM3h / qR : 0;
  const kOverA = a > 0 ? kSys / a : 0;

  const flowGainPercent =
    inputs.mode === "parallel" && qAloneM3h > 0 && n > 0 && !noIntersection
      ? (qOpM3h / (n * qAloneM3h)) * 100
      : 0;

  const headGainUsesShutoffStack =
    inputs.mode === "series" && !noIntersection && hAloneM <= 0;
  const headGainPercent =
    inputs.mode === "series" && n > 0 && !noIntersection
      ? headGainUsesShutoffStack
        ? (hOpM / (n * si.hSo)) * 100
        : (hOpM / (n * hAloneM)) * 100
      : 0;

  const extraFlowVsAlonePercent =
    inputs.mode === "parallel" && qAloneM3h > 0 && n >= 2 && !noIntersection
      ? ((qOpM3h - qAloneM3h) / qAloneM3h) * 100
      : 0;

  const runoutRisk =
    !invalid &&
    !noIntersection &&
    (qRatioToRated > RUNOUT_RATIO ||
      (n >= 2 && qAloneM3h > RUNOUT_RATIO * qR));

  const diminishingReturn =
    inputs.mode === "parallel" &&
    n >= 2 &&
    !noIntersection &&
    qAloneM3h > 0 &&
    extraFlowVsAlonePercent < DIMINISHING_EXTRA_FRAC * 100;

  /** Steep friction relative to pump curve — parallel adds little capacity. */
  const steepSystem = !invalid && a > 0 && kOverA >= 2;

  return {
    mode: inputs.mode,
    n,
    a,
    kSys,
    kOverA,
    qOpM3h,
    hOpM,
    hPumpCurveM,
    qPerPumpM3h,
    qRatioToRated,
    qAloneM3h,
    hAloneM,
    flowGainPercent,
    headGainPercent,
    headGainUsesShutoffStack,
    extraFlowVsAlonePercent,
    runoutRisk,
    diminishingReturn,
    steepSystem,
    noIntersection,
    invalid,
  };
}

function formatFlow(qM3h: number, flowUnit: MultiPumpFlowUnit): string {
  if (!Number.isFinite(qM3h) || qM3h <= 0) {
    return flowUnit === "gpm" ? "— GPM" : "— m³/h";
  }
  if (flowUnit === "gpm") {
    const gpm = qM3h * M3H_TO_GPM;
    return `${gpm >= 100 ? gpm.toFixed(0) : gpm.toFixed(1)} GPM`;
  }
  return `${qM3h >= 100 ? qM3h.toFixed(1) : qM3h.toFixed(2)} m³/h`;
}

function formatHead(hM: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(hM) || hM < 0) {
    return unitSystem === "imperial" ? "— ft" : "— m";
  }
  if (unitSystem === "imperial") {
    const ft = hM / 0.3048;
    return `${ft >= 100 ? ft.toFixed(0) : ft.toFixed(1)} ft`;
  }
  return `${hM >= 100 ? hM.toFixed(1) : hM.toFixed(2)} m`;
}

function statusFor(c: MultiPumpComputed): {
  level: StatusLevel;
  label: string;
} {
  if (c.invalid) {
    return {
      level: "warn",
      label: "Enter H_so > H_rated > 0, Q_rated > 0, and non-negative static / friction heads",
    };
  }
  if (c.noIntersection) {
    return {
      level: "fail",
      label:
        c.mode === "series"
          ? "No intersection — N·H_so must exceed H_static (series cannot lift against static)"
          : "No intersection — H_so must exceed H_static",
    };
  }
  if (c.runoutRisk) {
    return {
      level: "fail",
      label: `Runout risk — per-pump or single-alone flow > ${RUNOUT_RATIO}× Q_rated (motor / NPSH check)`,
    };
  }
  if (c.diminishingReturn) {
    return {
      level: "warn",
      label: `Parallel diminishing return — only +${c.extraFlowVsAlonePercent.toFixed(0)}% flow vs one pump (steep system curve)`,
    };
  }
  if (c.steepSystem && c.mode === "parallel" && c.n >= 2) {
    return {
      level: "warn",
      label: `Steep system (k/a ≈ ${c.kOverA.toFixed(1)}) — parallel capacity gain is limited by friction`,
    };
  }
  return {
    level: "pass",
    label:
      c.mode === "parallel"
        ? `Parallel duty OK — Q_op / (N·Q_alone) = ${c.flowGainPercent.toFixed(0)}%`
        : c.headGainUsesShutoffStack
          ? `Series duty OK — single pump cannot intersect; H_op / (N·H_so) = ${c.headGainPercent.toFixed(0)}%`
          : `Series duty OK — H_op / (N·H_alone) = ${c.headGainPercent.toFixed(0)}%`,
  };
}

export function calculateMultiPump(
  inputs: MultiPumpInputs,
): CalculatorOutput {
  const c = computeMultiPump(inputs);
  const status = statusFor(c);
  const modeLabel =
    MULTI_PUMP_MODE_OPTIONS.find((m) => m.value === inputs.mode)?.label ??
    inputs.mode;

  const qOp = c.invalid || c.noIntersection
    ? "—"
    : formatFlow(c.qOpM3h, inputs.flowUnit);
  const hOp = c.invalid || c.noIntersection
    ? "—"
    : formatHead(c.hOpM, inputs.unitSystem);
  const qEach = c.invalid || c.noIntersection
    ? "—"
    : formatFlow(c.qPerPumpM3h, inputs.flowUnit);
  const qAlone = c.invalid || c.qAloneM3h <= 0
    ? "—"
    : formatFlow(c.qAloneM3h, inputs.flowUnit);
  const hAlone = c.invalid || c.hAloneM <= 0
    ? "—"
    : formatHead(c.hAloneM, inputs.unitSystem);

  const gainBadge =
    inputs.mode === "parallel"
      ? {
          label: "Flow gain",
          value:
            c.flowGainPercent > 0
              ? `${c.flowGainPercent.toFixed(0)} %`
              : "—",
        }
      : {
          label: "Head gain",
          value:
            c.headGainPercent > 0
              ? `${c.headGainPercent.toFixed(0)} %`
              : "—",
        };

  return {
    heroLabel: "Total operating flow Q_op",
    heroValue: qOp,
    heroStatus: status.label,
    heroStatusLevel: status.level,
    heroBadges: [
      {
        label: "Mode",
        value: `${inputs.mode === "parallel" ? "Par" : "Ser"} ×${c.n}`,
      },
      { label: "H_op", value: hOp },
      { label: "Q / pump", value: qEach },
      {
        label: "Q/Q_r",
        value:
          c.invalid || c.noIntersection
            ? "—"
            : `${(c.qRatioToRated * 100).toFixed(0)} %`,
      },
      gainBadge,
    ],
    summary: [
      { label: "Q_op", value: qOp },
      { label: "H_op", value: hOp },
      { label: "Q/pump", value: qEach },
    ],
    summaryStatus: {
      label:
        "HI 14.3 quadratic pump/system screening — not a substitute for OEM curves or transient analysis",
      level: "neutral",
    },
    rows: [
      {
        label: "Configuration",
        value: `${modeLabel} · N = ${c.n}`,
        section: "Duty setup",
      },
      {
        label: "Single-pump H_so / H_rated",
        value: `${finite(inputs.headShutoff).toFixed(inputs.unitSystem === "imperial" ? 0 : 1)} / ${finite(inputs.headRated).toFixed(inputs.unitSystem === "imperial" ? 0 : 1)} ${inputs.unitSystem === "imperial" ? "ft" : "m"}`,
        section: "Duty setup",
      },
      {
        label: "Q_rated (curve / friction ref)",
        value: `${finite(inputs.flowRated).toFixed(finite(inputs.flowRated) >= 100 ? 0 : 1)} ${inputs.flowUnit === "gpm" ? "GPM" : "m³/h"}`,
        section: "Duty setup",
      },
      {
        label: "H_static / ΔH_friction @ Q_rated",
        value: `${finite(inputs.headStatic).toFixed(inputs.unitSystem === "imperial" ? 0 : 1)} / ${finite(inputs.headFrictionRated).toFixed(inputs.unitSystem === "imperial" ? 0 : 1)} ${inputs.unitSystem === "imperial" ? "ft" : "m"}`,
        section: "Duty setup",
      },
      {
        label: "Pump coeff. a = (H_so−H_r)/Q_r²",
        value: c.invalid ? "—" : c.a.toExponential(3),
        section: "Curve coefficients",
      },
      {
        label: "System coeff. k = ΔH_f/Q_r²",
        value: c.invalid ? "—" : c.kSys.toExponential(3),
        section: "Curve coefficients",
      },
      {
        label: "Steepness k / a",
        value: c.invalid || !(c.a > 0) ? "—" : c.kOverA.toFixed(2),
        section: "Curve coefficients",
        warn: c.steepSystem,
      },
      {
        label: "Total Q_op (intersection)",
        value: qOp,
        section: "Operating point",
        emphasis: true,
      },
      {
        label: "Operating head H_op (system)",
        value: hOp,
        section: "Operating point",
        emphasis: true,
      },
      {
        label: "Head from pump curve @ Q_op",
        value:
          c.invalid || c.noIntersection
            ? "—"
            : formatHead(c.hPumpCurveM, inputs.unitSystem),
        section: "Operating point",
      },
      {
        label:
          inputs.mode === "parallel"
            ? "Flow per pump Q_op / N"
            : "Flow per pump (series = Q_op)",
        value: qEach,
        section: "Operating point",
        emphasis: true,
        warn: c.runoutRisk,
      },
      {
        label: "Per-pump Q / Q_rated",
        value:
          c.invalid || c.noIntersection
            ? "—"
            : `${(c.qRatioToRated * 100).toFixed(0)} %`,
        section: "Operating point",
        warn: c.runoutRisk,
      },
      {
        label: "Single pump alone Q_alone",
        value: qAlone,
        section: "Benchmarks",
        warn:
          c.runoutRisk &&
          c.qAloneM3h >
            RUNOUT_RATIO *
              (inputs.flowUnit === "gpm"
                ? finite(inputs.flowRated) / M3H_TO_GPM
                : finite(inputs.flowRated)),
      },
      {
        label: "Single pump alone H_alone",
        value: hAlone,
        section: "Benchmarks",
      },
      ...(inputs.mode === "parallel"
        ? [
            {
              label: "Flow gain Q_op / (N·Q_alone)",
              value:
                c.flowGainPercent > 0
                  ? `${c.flowGainPercent.toFixed(1)} %`
                  : "—",
              section: "Benchmarks",
              warn: c.diminishingReturn,
            },
            {
              label: "Extra flow vs 1 pump",
              value:
                c.extraFlowVsAlonePercent !== 0 ||
                (!c.noIntersection && c.n >= 2)
                  ? `${c.extraFlowVsAlonePercent >= 0 ? "+" : ""}${c.extraFlowVsAlonePercent.toFixed(1)} %`
                  : "—",
              section: "Benchmarks",
              warn: c.diminishingReturn,
            },
          ]
        : [
            {
              label: c.headGainUsesShutoffStack
                ? "Head vs stacked shut-off H_op / (N·H_so)"
                : "Head gain H_op / (N·H_alone)",
              value:
                c.headGainPercent > 0
                  ? `${c.headGainPercent.toFixed(1)} %`
                  : "—",
              section: "Benchmarks",
            },
          ]),
    ],
    callouts: [
      {
        tone: "info",
        title: "Quadratic pump + system intersection (HI 14.3 screen)",
        body: "Pump curve H = H_so − aQ² and system H = H_static + kQ² intersect at the steady operating point. Parallel adds flow at common head; series adds head at common flow. Friction coefficient k is referenced to Q_rated for screening.",
        items: [
          "Assumes identical pumps and a single common system curve.",
          "Dissimilar parallel pumps can deadhead the weaker unit — not modeled here.",
          "Confirm NPSH and motor power at Q_per_pump on the OEM curve.",
        ],
      },
      ...(c.diminishingReturn
        ? [
            {
              tone: "warn" as const,
              title: "Parallel diminishing return",
              body: `Adding pumps on this steep friction curve only raises total flow by ~${c.extraFlowVsAlonePercent.toFixed(0)}% vs one pump alone (k/a ≈ ${c.kOverA.toFixed(1)}). Check whether a larger single pump, trimmed impeller, or lower system resistance is a better TA move.`,
            },
          ]
        : []),
      ...(c.steepSystem &&
      c.mode === "parallel" &&
      c.n >= 2 &&
      !c.diminishingReturn
        ? [
            {
              tone: "info" as const,
              title: "Friction-dominated system",
              body: `System resistance is steep relative to the pump curve (k/a ≈ ${c.kOverA.toFixed(1)}). Extra parallel pumps buy less capacity than a flat-friction intuition suggests.`,
            },
          ]
        : []),
      ...(c.runoutRisk
        ? [
            {
              tone: "warn" as const,
              title: "Runout / motor overload risk",
              body: `Per-pump duty is ~${(c.qRatioToRated * 100).toFixed(0)}% of Q_rated (limit screen ${RUNOUT_RATIO * 100}%). One pump alone on a multi-pump system can run far right of BEP — check motor amps, NPSHa, and vibration.`,
            },
          ]
        : []),
      ...(c.headGainUsesShutoffStack
        ? [
            {
              tone: "info" as const,
              title: "Series required for static lift",
              body: "A single pump cannot intersect this system (H_so ≤ H_static). Series stages are required; head gain is reported versus stacked shut-off N·H_so because Q_alone does not exist.",
            },
          ]
        : []),
      ...(inputs.mode === "parallel" && c.n >= 2
        ? [
            {
              tone: "info" as const,
              title: "Identical-pump parallel assumption",
              body: "Results assume matched H–Q curves. Unequal wear, speed, or impeller diameter can push the lower-head pump toward deadhead (near-zero flow) against the stronger unit.",
            },
          ]
        : []),
    ],
    exportRows: [
      { label: "Standard", value: "ANSI/HI 14.3 · quadratic screen" },
      { label: "Mode", value: modeLabel },
      { label: "N", value: String(c.n) },
      {
        label: "H_so",
        value: `${finite(inputs.headShutoff)} ${inputs.unitSystem === "imperial" ? "ft" : "m"}`,
      },
      {
        label: "Q_rated",
        value: `${finite(inputs.flowRated)} ${inputs.flowUnit === "gpm" ? "GPM" : "m³/h"}`,
      },
      {
        label: "H_rated",
        value: `${finite(inputs.headRated)} ${inputs.unitSystem === "imperial" ? "ft" : "m"}`,
      },
      {
        label: "H_static",
        value: `${finite(inputs.headStatic)} ${inputs.unitSystem === "imperial" ? "ft" : "m"}`,
      },
      {
        label: "ΔH_friction @ Q_rated",
        value: `${finite(inputs.headFrictionRated)} ${inputs.unitSystem === "imperial" ? "ft" : "m"}`,
      },
      { label: "a", value: c.invalid ? "—" : c.a.toExponential(4) },
      { label: "k", value: c.invalid ? "—" : c.kSys.toExponential(4) },
      { label: "k/a", value: c.invalid || !(c.a > 0) ? "—" : c.kOverA.toFixed(3) },
      { label: "Q_op", value: qOp },
      { label: "H_op", value: hOp },
      { label: "Q per pump", value: qEach },
      {
        label: "Q/Q_rated",
        value:
          c.invalid || c.noIntersection
            ? "—"
            : `${(c.qRatioToRated * 100).toFixed(1)}%`,
      },
      { label: "Q alone", value: qAlone },
      {
        label: inputs.mode === "parallel" ? "Flow gain %" : "Head gain %",
        value:
          inputs.mode === "parallel"
            ? c.flowGainPercent > 0
              ? c.flowGainPercent.toFixed(1)
              : "—"
            : c.headGainPercent > 0
              ? c.headGainPercent.toFixed(1)
              : "—",
      },
      {
        label: "Runout risk",
        value: c.runoutRisk ? "YES" : "No",
      },
    ],
  };
}

