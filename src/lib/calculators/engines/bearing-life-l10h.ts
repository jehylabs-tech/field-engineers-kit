/**
 * Rolling Element Bearing Life L₁₀h — ISO 281 / ABMA 9 & 11 screening.
 *
 *   P = X·F_r + Y·F_a
 *   L₁₀ = (C/P)^p          [10⁶ revolutions]
 *   L₁₀h = 10⁶/(60·n)·L₁₀  [hours at 90% reliability]
 *
 * p = 3 (ball) · p = 10/3 (roller). a_ISO modified life (L₁₀mh) is out of scope.
 */

import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import factorsRaw from "../../../../data/mechanical/bearing-standard-factors.json";

export type BearingTypeId =
  | "deep-groove-ball"
  | "angular-contact-ball"
  | "cylindrical-roller"
  | "spherical-roller"
  | "tapered-roller";

export type BearingXyMode = "manual" | "auto";

export type BearingLifeL10hInputs = {
  unitSystem: UnitSystem;
  bearingType: BearingTypeId;
  /** Basic dynamic load rating C (kN or lbf). */
  dynamicLoadRating: number;
  /** Radial load F_r (kN or lbf). */
  radialLoad: number;
  /** Axial / thrust load F_a (kN or lbf). */
  axialLoad: number;
  /** Operating speed n (rpm). */
  rotationalSpeed: number;
  /** Radial factor X. */
  radialFactor: number;
  /** Thrust factor Y. */
  thrustFactor: number;
  /** When auto, X/Y come from ISO/ABMA screening table vs F_a/F_r. */
  xyMode: BearingXyMode;
};

export type BearingFactorRow = {
  id: BearingTypeId;
  label: string;
  category: "ball" | "roller";
  p: number;
  e: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type FactorsFile = {
  standard: string;
  notes: string;
  types: BearingFactorRow[];
};

const FACTORS = factorsRaw as FactorsFile;

/** 1 kN = 224.808943 lbf */
export const KN_TO_LBF = 224.808943;

export const BEARING_TYPE_OPTIONS: {
  value: BearingTypeId;
  label: string;
  category: "ball" | "roller";
}[] = FACTORS.types.map((row) => ({
  value: row.id,
  label: row.label,
  category: row.category,
}));

export const DEFAULT_BEARING_LIFE_L10H_INPUTS: BearingLifeL10hInputs = {
  unitSystem: "metric",
  bearingType: "deep-groove-ball",
  dynamicLoadRating: 32.5,
  radialLoad: 4.5,
  axialLoad: 1.2,
  rotationalSpeed: 1750,
  radialFactor: 0.56,
  thrustFactor: 1.45,
  xyMode: "manual",
};

const C_RANGE = { min: 0.1, max: 5_000_000 };
const FR_RANGE = { min: 0.01, max: 2_000_000 };
const FA_RANGE = { min: 0, max: 2_000_000 };
const RPM_RANGE = { min: 1, max: 50000 };
const X_RANGE = { min: 0.1, max: 1 };
const Y_RANGE = { min: 0, max: 5 };

/** Continuous-duty screening threshold for Pass vs Warning (hours). */
export const L10H_PASS_HOURS = 20_000;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, finite(value)));
}

export function resolveBearingFactor(
  id: BearingTypeId,
): BearingFactorRow {
  return (
    FACTORS.types.find((row) => row.id === id) ?? FACTORS.types[0]!
  );
}

/** Auto X/Y from F_a/F_r vs type e (ISO 281 screening form). */
export function resolveAutoXy(
  bearingType: BearingTypeId,
  radialLoad: number,
  axialLoad: number,
): { x: number; y: number; e: number; ratio: number } {
  const row = resolveBearingFactor(bearingType);
  const fr = Math.max(1e-12, finite(radialLoad));
  const fa = Math.max(0, finite(axialLoad));
  const ratio = fa / fr;
  if (ratio <= row.e) {
    return { x: row.x1, y: row.y1, e: row.e, ratio };
  }
  return { x: row.x2, y: row.y2, e: row.e, ratio };
}

export function convertForceBetweenSystems(
  value: number,
  from: UnitSystem,
  to: UnitSystem,
): number {
  if (from === to) return finite(value);
  if (from === "metric" && to === "imperial") {
    return Number((finite(value) * KN_TO_LBF).toFixed(1));
  }
  return Number((finite(value) / KN_TO_LBF).toFixed(3));
}

export function convertBearingLifeUnitSystem(
  inputs: BearingLifeL10hInputs,
  next: UnitSystem,
): BearingLifeL10hInputs {
  if (inputs.unitSystem === next) return inputs;
  return {
    ...inputs,
    unitSystem: next,
    dynamicLoadRating: convertForceBetweenSystems(
      inputs.dynamicLoadRating,
      inputs.unitSystem,
      next,
    ),
    radialLoad: convertForceBetweenSystems(
      inputs.radialLoad,
      inputs.unitSystem,
      next,
    ),
    axialLoad: convertForceBetweenSystems(
      inputs.axialLoad,
      inputs.unitSystem,
      next,
    ),
  };
}

export type BearingLifeComputed = {
  invalid: boolean;
  invalidReason?: string;
  p: number;
  category: "ball" | "roller";
  typeLabel: string;
  x: number;
  y: number;
  faFr: number;
  P: number;
  C: number;
  n: number;
  L10: number;
  L10h: number;
  lifeDays: number;
  loadRatioPC: number;
  heavyLoad: boolean;
  statusLevel: StatusLevel;
  statusLabel: string;
  forceUnit: string;
};

export function computeBearingLifeL10h(
  inputs: BearingLifeL10hInputs,
): BearingLifeComputed {
  const row = resolveBearingFactor(inputs.bearingType);
  const forceUnit = inputs.unitSystem === "imperial" ? "lbf" : "kN";

  const C = clamp(inputs.dynamicLoadRating, C_RANGE.min, C_RANGE.max);
  const Fr = clamp(inputs.radialLoad, FR_RANGE.min, FR_RANGE.max);
  const Fa = clamp(inputs.axialLoad, FA_RANGE.min, FA_RANGE.max);
  const n = clamp(inputs.rotationalSpeed, RPM_RANGE.min, RPM_RANGE.max);

  let x: number;
  let y: number;
  if (inputs.xyMode === "auto") {
    const auto = resolveAutoXy(inputs.bearingType, Fr, Fa);
    x = auto.x;
    y = auto.y;
  } else {
    x = clamp(inputs.radialFactor, X_RANGE.min, X_RANGE.max);
    y = clamp(inputs.thrustFactor, Y_RANGE.min, Y_RANGE.max);
  }

  const faFr = Fr > 0 ? Fa / Fr : Fa > 0 ? Infinity : 0;
  const P = x * Fr + y * Fa;

  if (!(C > 0) || !(P > 0) || !(n > 0)) {
    return {
      invalid: true,
      invalidReason: "C, P, and n must be greater than zero",
      p: row.p,
      category: row.category,
      typeLabel: row.label,
      x,
      y,
      faFr,
      P,
      C,
      n,
      L10: 0,
      L10h: 0,
      lifeDays: 0,
      loadRatioPC: 0,
      heavyLoad: false,
      statusLevel: "warn",
      statusLabel: "Invalid inputs",
      forceUnit,
    };
  }

  const L10 = Math.pow(C / P, row.p);
  const L10h = (1e6 / (60 * n)) * L10;
  const lifeDays = L10h / 24;
  const loadRatioPC = P / C;
  const heavyLoad = loadRatioPC > 0.5;
  const pass = L10h >= L10H_PASS_HOURS;

  return {
    invalid: false,
    p: row.p,
    category: row.category,
    typeLabel: row.label,
    x,
    y,
    faFr,
    P,
    C,
    n,
    L10,
    L10h,
    lifeDays,
    loadRatioPC,
    heavyLoad,
    statusLevel: pass ? "pass" : "warn",
    statusLabel: pass
      ? `Pass · L₁₀h ≥ ${L10H_PASS_HOURS.toLocaleString("en-US")} h screening`
      : `Warning · L₁₀h < ${L10H_PASS_HOURS.toLocaleString("en-US")} h continuous-duty screen`,
    forceUnit,
  };
}

function fmtForce(value: number, unit: string): string {
  if (!Number.isFinite(value)) return `— ${unit}`;
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : abs >= 10 ? 2 : 3;
  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })} ${unit}`;
}

function fmtHours(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1000) {
    return `${Math.round(value).toLocaleString("en-US")} h`;
  }
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} h`;
}

function fmtMillionRevs(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ×10⁶ rev`;
}

function fmtRatio(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (!Number.isFinite(value) || value === Infinity) return "∞";
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export function calculateBearingLifeL10h(
  inputs: BearingLifeL10hInputs,
): CalculatorOutput {
  const c = computeBearingLifeL10h(inputs);

  if (c.invalid) {
    return {
      heroLabel: "Bearing Rating Life (L₁₀h)",
      heroValue: "—",
      heroStatus: c.invalidReason ?? "Check inputs",
      heroStatusLevel: "warn",
      summary: [
        { label: "Equivalent load P", value: "—" },
        { label: "L₁₀", value: "—" },
      ],
      summaryStatus: { label: "Invalid inputs", level: "warn" },
      rows: [],
      exportRows: [],
      callouts: [
        {
          tone: "warn",
          title: "ISO 281 basic rating life only",
          body: "This calculator reports ISO 281 / ABMA 9 & 11 basic rating life (L₁₀h, 90% reliability). Modified rating life L₁₀mh with a_ISO (lubrication, contamination, material) requires additional ISO 281 review.",
        },
      ],
    };
  }

  const pLabel =
    c.category === "ball"
      ? "3.0 (ball)"
      : "10/3 ≈ 3.33 (roller)";

  const callouts: CalculatorOutput["callouts"] = [
    {
      tone: "warn",
      title: "ISO 281 basic L₁₀h (90% reliability)",
      body: "Basic rating life only. Modified life L₁₀mh with a_ISO (lubrication, contamination, material) needs ISO 281 / OEM catalog review.",
    },
  ];
  if (c.heavyLoad) {
    callouts.push({
      tone: "info",
      title: "High equivalent load vs C",
      body: `P/C = ${fmtRatio(c.loadRatioPC)} (> 0.5). Extreme load can limit long-life formulas — verify catalog C / C₀ and duty.`,
    });
  }

  return {
    heroLabel: "Bearing Rating Life (L₁₀h)",
    heroValue: fmtHours(c.L10h),
    heroStatus: `${c.typeLabel} · ${c.statusLevel === "pass" ? "Pass" : "Warning"} · n = ${c.n.toLocaleString("en-US")} rpm`,
    heroStatusLevel: c.statusLevel,
    heroBadges: [
      { label: "P", value: fmtForce(c.P, c.forceUnit) },
      { label: "L₁₀", value: fmtMillionRevs(c.L10) },
      { label: "p", value: pLabel },
    ],
    summary: [
      { label: "Equivalent load (P)", value: fmtForce(c.P, c.forceUnit) },
      { label: "Life (L₁₀)", value: fmtMillionRevs(c.L10) },
    ],
    summaryStatus: {
      label: c.statusLabel,
      level: c.statusLevel,
    },
    rows: [
      {
        label: "Thrust / radial ratio (F_a / F_r)",
        value: fmtRatio(c.faFr),
        section: "Equivalent load",
      },
      {
        label: "Equivalent dynamic load (P)",
        value: fmtForce(c.P, c.forceUnit),
        section: "Equivalent load",
        emphasis: true,
      },
      {
        label: "X / Y factors used",
        value: `X=${fmtRatio(c.x)} · Y=${fmtRatio(c.y)}`,
        section: "Equivalent load",
      },
      {
        label: "Continuous equivalent days",
        value: `${c.lifeDays.toLocaleString("en-US", { maximumFractionDigits: 1 })} days`,
        section: "Rating life",
      },
    ],
    exportRows: [
      { label: "Bearing type", value: c.typeLabel },
      { label: "Life exponent p", value: String(c.p) },
      { label: "C", value: fmtForce(c.C, c.forceUnit) },
      {
        label: "F_r",
        value: fmtForce(
          clamp(inputs.radialLoad, FR_RANGE.min, FR_RANGE.max),
          c.forceUnit,
        ),
      },
      {
        label: "F_a",
        value: fmtForce(
          clamp(inputs.axialLoad, FA_RANGE.min, FA_RANGE.max),
          c.forceUnit,
        ),
      },
      { label: "X", value: fmtRatio(c.x) },
      { label: "Y", value: fmtRatio(c.y) },
      { label: "F_a/F_r", value: fmtRatio(c.faFr) },
      { label: "P", value: fmtForce(c.P, c.forceUnit) },
      { label: "n", value: `${c.n} rpm` },
      { label: "L₁₀ (10⁶ rev)", value: c.L10.toFixed(4) },
      { label: "L₁₀h (h)", value: c.L10h.toFixed(1) },
      { label: "Continuous days", value: c.lifeDays.toFixed(2) },
      { label: "P/C", value: fmtRatio(c.loadRatioPC) },
      {
        label: "Status",
        value: c.statusLevel === "pass" ? "Pass" : "Warning",
      },
    ],
    callouts,
  };
}
