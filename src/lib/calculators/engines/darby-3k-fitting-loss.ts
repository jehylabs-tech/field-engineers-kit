/**
 * Darby 3-K Fitting Loss — laminar / transition / turbulent K and L_eq screening.
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  craneFullyTurbulentFrictionFactor,
  getCraneFitting,
} from "@/lib/calculators/data/craneFittingData";
import {
  DARBY_3K_FITTING_OPTIONS,
  darby3kResistanceCoefficient,
  darbyFlowRegime,
  getDarby3kFitting,
  type Darby3kFittingType,
} from "@/lib/calculators/data/darby3kFittingData";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
} from "@/lib/data/loaders";

export type { Darby3kFittingType };
export { DARBY_3K_FITTING_OPTIONS };

export type Darby3kFittingLossInputs = {
  unitSystem: UnitSystem;
  nps: string;
  schedule: string;
  fittingType: Darby3kFittingType;
  /** Pipe Reynolds number Re (dimensionless). */
  reynoldsNumber: number;
  quantity: number;
};

export const REYNOLDS_RANGE = { min: 1, max: 10_000_000 } as const;
export const QUANTITY_RANGE = { min: 1, max: 100 } as const;

export const DEFAULT_DARBY_3K_FITTING_LOSS_INPUTS: Darby3kFittingLossInputs = {
  unitSystem: "metric",
  nps: "2",
  schedule: "40",
  fittingType: "elbow_90_std",
  reynoldsNumber: 50_000,
  quantity: 1,
};

export type Darby3kFittingLossComputed = {
  invalid: boolean;
  invalidReason?: string;
  nps: string;
  dn: number;
  schedule: string;
  fittingType: Darby3kFittingType;
  fittingLabel: string;
  quantity: number;
  re: number;
  regime: "laminar" | "transition" | "turbulent";
  k1: number;
  ki: number;
  kd: number;
  diMm: number;
  diIn: number;
  laminarPart: number;
  turbulentPart: number;
  kSingle: number;
  kTotal: number;
  fT: number;
  leqSingleM: number;
  leqTotalM: number;
  leqSingleFt: number;
  leqTotalFt: number;
  kCrane: number | null;
  ldCrane: number | null;
};

function normalizeNps(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/"/g, "").replace(/in$/, "");
  return t || "2";
}

function clampRe(raw: number): number {
  if (!Number.isFinite(raw)) return REYNOLDS_RANGE.min;
  return Math.min(REYNOLDS_RANGE.max, Math.max(REYNOLDS_RANGE.min, raw));
}

function clampQty(raw: number): number {
  if (!Number.isFinite(raw)) return QUANTITY_RANGE.min;
  return Math.min(
    QUANTITY_RANGE.max,
    Math.max(QUANTITY_RANGE.min, Math.round(raw)),
  );
}

export function computeDarby3kFittingLoss(
  inputs: Darby3kFittingLossInputs,
): Darby3kFittingLossComputed {
  const nps = normalizeNps(inputs.nps);
  const schedule =
    inputs.schedule?.trim() || defaultScheduleForNps(nps) || "40";
  const quantity = clampQty(inputs.quantity);
  const re = clampRe(inputs.reynoldsNumber);
  const fitting = getDarby3kFitting(inputs.fittingType);
  const entry = getPipeScheduleEntry(nps, schedule);
  const fT = craneFullyTurbulentFrictionFactor(nps);
  const regime = darbyFlowRegime(re);

  const empty = (reason: string): Darby3kFittingLossComputed => ({
    invalid: true,
    invalidReason: reason,
    nps,
    dn: entry?.pipe.dn ?? NaN,
    schedule,
    fittingType: inputs.fittingType,
    fittingLabel: fitting?.label ?? inputs.fittingType,
    quantity,
    re,
    regime,
    k1: fitting?.k1 ?? NaN,
    ki: fitting?.ki ?? NaN,
    kd: fitting?.kd ?? NaN,
    diMm: NaN,
    diIn: NaN,
    laminarPart: NaN,
    turbulentPart: NaN,
    kSingle: NaN,
    kTotal: NaN,
    fT,
    leqSingleM: NaN,
    leqTotalM: NaN,
    leqSingleFt: NaN,
    leqTotalFt: NaN,
    kCrane: null,
    ldCrane: null,
  });

  if (!fitting) {
    return empty("Select a Darby 3-K fitting type");
  }
  if (!entry || !(entry.row.insideDiameterMm > 0)) {
    return empty("Select a valid NPS and schedule with known inside diameter");
  }

  const dn = entry.pipe.dn;
  const diMm = entry.row.insideDiameterMm;
  const diIn = diMm / 25.4;
  const parts = darby3kResistanceCoefficient(
    fitting.k1,
    fitting.ki,
    fitting.kd,
    re,
    diIn,
  );
  if (!Number.isFinite(parts.k) || !(parts.k > 0)) {
    return empty("Could not evaluate Darby 3-K coefficient — check Re and size");
  }

  const kSingle = parts.k;
  const kTotal = kSingle * quantity;
  // Convert K → L_eq using Crane f_T so lengths compare with TP-410 L/D screening.
  const leqSingleM = (kSingle * (diMm / 1000)) / fT;
  const leqTotalM = leqSingleM * quantity;
  const leqSingleFt = leqSingleM / 0.3048;
  const leqTotalFt = leqTotalM / 0.3048;

  let kCrane: number | null = null;
  let ldCrane: number | null = null;
  if (fitting.craneType) {
    const crane = getCraneFitting(fitting.craneType);
    if (crane) {
      ldCrane = crane.ldRatio;
      kCrane = fT * crane.ldRatio;
    }
  }

  return {
    invalid: false,
    nps,
    dn,
    schedule,
    fittingType: inputs.fittingType,
    fittingLabel: fitting.label,
    quantity,
    re,
    regime,
    k1: fitting.k1,
    ki: fitting.ki,
    kd: fitting.kd,
    diMm,
    diIn,
    laminarPart: parts.laminarPart,
    turbulentPart: parts.turbulentPart,
    kSingle,
    kTotal,
    fT,
    leqSingleM,
    leqTotalM,
    leqSingleFt,
    leqTotalFt,
    kCrane,
    ldCrane,
  };
}

export function calculateDarby3kFittingLoss(
  inputs: Darby3kFittingLossInputs,
): CalculatorOutput {
  const c = computeDarby3kFittingLoss(inputs);
  const imperial = inputs.unitSystem === "imperial";
  const multiQty = c.quantity > 1;

  const callouts: ResultCallout[] = [];
  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Check fitting / pipe inputs",
      body: c.invalidReason,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Screening Note",
      body: "K = K₁/Re + Kᵢ(1 + K_d/D_in^0.3). L_eq = K·D_i/f_T (Crane f_T). Prefer 3-K when Re < 2000 — Crane L/D alone understates laminar loss. ΔP = K·ρv²/2 needs velocity.",
    });
    if (c.regime === "laminar") {
      callouts.push({
        tone: "warn",
        title: "Laminar regime — K₁/Re dominates",
        body: `Re = ${Math.round(c.re).toLocaleString("en-US")}. Viscous term K₁/Re = ${c.laminarPart.toFixed(3)} is a large share of K. Crane TP-410 L/D assumes turbulent flow.`,
      });
    } else if (c.regime === "transition") {
      callouts.push({
        tone: "warn",
        title: "Transitional Reynolds number",
        body: `Re = ${Math.round(c.re).toLocaleString("en-US")} is between 2000 and 4000. Treat K as approximate if the loss is critical.`,
      });
    }
  }

  const leqHero = c.invalid
    ? "—"
    : imperial
      ? `${c.leqTotalFt.toFixed(2)} ft · ${c.leqTotalM.toFixed(2)} m`
      : `${c.leqTotalM.toFixed(2)} m · ${c.leqTotalFt.toFixed(2)} ft`;

  const leqDetail = (m: number, ft: number) =>
    imperial
      ? `${ft.toFixed(2)} ft (${m.toFixed(2)} m)`
      : `${m.toFixed(2)} m (${ft.toFixed(2)} ft)`;

  const kHero = multiQty
    ? `K_Σ = ${c.kTotal.toFixed(3)}`
    : `K = ${c.kTotal.toFixed(3)}`;
  const heroValue = c.invalid ? "—" : `${kHero} · L_eq = ${leqHero}`;

  const statusLevel = c.invalid
    ? "fail"
    : c.regime === "turbulent"
      ? "neutral"
      : "warn";

  const craneDelta =
    c.kCrane != null && Number.isFinite(c.kCrane) && c.kSingle > 0
      ? ((c.kCrane - c.kSingle) / c.kSingle) * 100
      : null;

  const shortFitting = c.fittingLabel
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Lean rows: deliverables + 3-K split + Crane contrast only.
  // Size / regime / constants / Re / D_i / f_T live in hero badges (no row echo).
  const rows: ResultRow[] = [];
  if (!c.invalid) {
    if (multiQty) {
      rows.push(
        {
          section: "Darby 3-K",
          label: "K per fitting",
          value: c.kSingle.toFixed(4),
        },
        {
          section: "Darby 3-K",
          label: `K total (× ${c.quantity})`,
          value: c.kTotal.toFixed(4),
          emphasis: true,
        },
      );
    } else {
      rows.push({
        section: "Darby 3-K",
        label: "Resistance coefficient K",
        value: c.kSingle.toFixed(4),
        emphasis: true,
      });
    }
    rows.push(
      {
        section: "Darby 3-K",
        label: "Laminar term K₁/Re",
        value: c.laminarPart.toFixed(4),
      },
      {
        section: "Darby 3-K",
        label: "Turbulent term Kᵢ(1 + K_d/D_in^0.3)",
        value: c.turbulentPart.toFixed(4),
      },
    );
    if (multiQty) {
      rows.push(
        {
          section: "Equivalent length",
          label: "L_eq per fitting",
          value: leqDetail(c.leqSingleM, c.leqSingleFt),
        },
        {
          section: "Equivalent length",
          label: `Total L_eq (× ${c.quantity})`,
          value: leqDetail(c.leqTotalM, c.leqTotalFt),
          emphasis: true,
        },
      );
    } else {
      rows.push({
        section: "Equivalent length",
        label: "L_eq (= K·D_i/f_T)",
        value: leqDetail(c.leqTotalM, c.leqTotalFt),
        emphasis: true,
      });
    }
    if (c.kCrane != null && c.ldCrane != null) {
      const deltaPart =
        craneDelta != null
          ? ` · ΔK ${craneDelta >= 0 ? "+" : ""}${craneDelta.toFixed(0)}%`
          : "";
      rows.push({
        section: "Crane comparison",
        label: "Crane K (f_T · L/D)",
        value: `${c.kCrane.toFixed(3)} (L/D ${c.ldCrane})${deltaPart}`,
        warn: c.regime === "laminar" && craneDelta != null && Math.abs(craneDelta) > 20,
      });
    }
  }

  const sizeBadge = imperial
    ? { label: "NPS", value: `${c.nps}/${c.schedule}` }
    : {
        label: "DN",
        value: Number.isFinite(c.dn)
          ? `${c.dn}/${c.schedule}`
          : `${c.nps}/${c.schedule}`,
      };

  const badges = c.invalid
    ? undefined
    : [
        sizeBadge,
        {
          label: "Regime",
          value:
            c.regime === "laminar"
              ? "Laminar"
              : c.regime === "transition"
                ? "Transition"
                : "Turbulent",
        },
        {
          label: "K₁/Kᵢ/K_d",
          value: `${c.k1}/${c.ki}/${c.kd}`,
        },
        {
          label: "D_i",
          value: imperial
            ? `${c.diIn.toFixed(3)} in`
            : `${c.diMm.toFixed(1)} mm`,
        },
        { label: "f_T", value: c.fT.toFixed(3) },
        ...(multiQty ? [{ label: "Qty", value: String(c.quantity) }] : []),
      ];

  return {
    heroLabel: multiQty
      ? "Total K · Equivalent length"
      : "Resistance K · Equivalent length",
    heroValue,
    heroStatus: c.invalid
      ? "Check inputs"
      : `${shortFitting} · Re ${Math.round(c.re).toLocaleString("en-US")}`,
    heroStatusLevel: statusLevel,
    heroBadges: badges,
    summary: [
      {
        label: multiQty ? "K total" : "K (3-K)",
        value: c.invalid ? "—" : c.kTotal.toFixed(3),
      },
      {
        label: "L_eq",
        value: leqHero,
      },
      {
        label: "Crane K",
        value: c.kCrane != null ? c.kCrane.toFixed(3) : "—",
      },
    ],
    summaryStatus: {
      label: c.invalid
        ? "Check inputs"
        : c.regime === "laminar"
          ? "Laminar — prefer 3-K"
          : c.regime === "transition"
            ? "Transition"
            : "Darby 3-K",
      level: statusLevel,
    },
    rows,
    callouts,
    exportRows: [
      { label: "Standard", value: "Darby 3-K · Crane TP-410 comparison" },
      { label: "NPS", value: c.nps },
      { label: "DN", value: Number.isFinite(c.dn) ? String(c.dn) : "—" },
      { label: "Schedule", value: c.schedule },
      { label: "Fitting", value: c.fittingLabel },
      { label: "Quantity", value: String(c.quantity) },
      { label: "Re", value: c.invalid ? "—" : c.re.toFixed(1) },
      { label: "Regime", value: c.regime },
      { label: "K1", value: c.invalid ? "—" : String(c.k1) },
      { label: "Ki", value: c.invalid ? "—" : String(c.ki) },
      { label: "Kd", value: c.invalid ? "—" : String(c.kd) },
      { label: "Di mm", value: c.invalid ? "—" : c.diMm.toFixed(3) },
      { label: "fT", value: c.fT.toFixed(5) },
      { label: "K single", value: c.invalid ? "—" : c.kSingle.toFixed(5) },
      { label: "K total", value: c.invalid ? "—" : c.kTotal.toFixed(5) },
      {
        label: "Leq total m",
        value: c.invalid ? "—" : c.leqTotalM.toFixed(4),
      },
      {
        label: "Leq total ft",
        value: c.invalid ? "—" : c.leqTotalFt.toFixed(4),
      },
      {
        label: "Crane K",
        value: c.kCrane != null ? c.kCrane.toFixed(5) : "—",
      },
    ],
  };
}
