/**
 * Piping Equivalent Length — Crane TP-410 L/D screening for fittings & valves.
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  craneFullyTurbulentFrictionFactor,
  CRANE_FITTING_OPTIONS,
  getCraneFitting,
  type CraneFittingType,
} from "@/lib/calculators/data/craneFittingData";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
} from "@/lib/data/loaders";

export type { CraneFittingType };
export { CRANE_FITTING_OPTIONS };

export type PipingEquivalentLengthInputs = {
  unitSystem: UnitSystem;
  nps: string;
  schedule: string;
  fittingType: CraneFittingType;
  quantity: number;
};

export const QUANTITY_RANGE = { min: 1, max: 100 } as const;

export const DEFAULT_PIPING_EQUIVALENT_LENGTH_INPUTS: PipingEquivalentLengthInputs =
  {
    unitSystem: "metric",
    nps: "2",
    schedule: "40",
    fittingType: "90_elbow_std",
    quantity: 1,
  };

export type PipingEquivalentLengthComputed = {
  invalid: boolean;
  invalidReason?: string;
  nps: string;
  schedule: string;
  fittingType: CraneFittingType;
  fittingLabel: string;
  quantity: number;
  ldRatio: number;
  fT: number;
  kSingle: number;
  kTotal: number;
  diMm: number;
  diIn: number;
  leqSingleM: number;
  leqTotalM: number;
  leqSingleFt: number;
  leqTotalFt: number;
};

function clampQuantity(raw: number): number {
  if (!Number.isFinite(raw)) return QUANTITY_RANGE.min;
  return Math.min(
    QUANTITY_RANGE.max,
    Math.max(QUANTITY_RANGE.min, Math.round(raw)),
  );
}

export function computePipingEquivalentLength(
  inputs: PipingEquivalentLengthInputs,
): PipingEquivalentLengthComputed {
  const quantity = clampQuantity(inputs.quantity);
  const fitting = getCraneFitting(inputs.fittingType);
  const schedule =
    inputs.schedule?.trim() ||
    defaultScheduleForNps(inputs.nps) ||
    "40";
  const entry = getPipeScheduleEntry(inputs.nps, schedule);
  const fT = craneFullyTurbulentFrictionFactor(inputs.nps);

  const empty = (reason: string): PipingEquivalentLengthComputed => ({
    invalid: true,
    invalidReason: reason,
    nps: inputs.nps,
    schedule,
    fittingType: inputs.fittingType,
    fittingLabel: fitting?.label ?? inputs.fittingType,
    quantity,
    ldRatio: fitting?.ldRatio ?? NaN,
    fT,
    kSingle: NaN,
    kTotal: NaN,
    diMm: NaN,
    diIn: NaN,
    leqSingleM: NaN,
    leqTotalM: NaN,
    leqSingleFt: NaN,
    leqTotalFt: NaN,
  });

  if (!fitting) {
    return empty("Select a Crane TP-410 fitting or valve type");
  }
  if (!entry || !(entry.row.insideDiameterMm > 0)) {
    return empty("Select a valid NPS and schedule with known inside diameter");
  }

  const diMm = entry.row.insideDiameterMm;
  const diIn = diMm / 25.4;
  const ldRatio = fitting.ldRatio;
  const kSingle = fT * ldRatio;
  const kTotal = kSingle * quantity;
  // L_eq = (L/D) × Di  (Di in m → L_eq in m)
  const leqSingleM = (ldRatio * diMm) / 1000;
  const leqTotalM = leqSingleM * quantity;
  const leqSingleFt = leqSingleM / 0.3048;
  const leqTotalFt = leqTotalM / 0.3048;

  return {
    invalid: false,
    nps: inputs.nps,
    schedule,
    fittingType: fitting.value,
    fittingLabel: fitting.label,
    quantity,
    ldRatio,
    fT,
    kSingle,
    kTotal,
    diMm,
    diIn,
    leqSingleM,
    leqTotalM,
    leqSingleFt,
    leqTotalFt,
  };
}

export function calculatePipingEquivalentLength(
  inputs: PipingEquivalentLengthInputs,
): CalculatorOutput {
  const c = computePipingEquivalentLength(inputs);
  const imperial = inputs.unitSystem === "imperial";

  const callouts: ResultCallout[] = [];
  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Check NPS / schedule / fitting",
      body: c.invalidReason,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Screening Note",
      body: "Equivalent length (L/D) values are based on Crane TP-410 standard turbulent flow conditions (f_T). For laminar flow or high-viscosity fluids (Re < 2000), use 2-K or 3-K methods (Darby 3-K) for higher accuracy in pressure drop calculations.",
    });
  }

  const leqPrimary = (m: number, ft: number) =>
    imperial
      ? `${ft.toFixed(2)} ft · ${m.toFixed(2)} m`
      : `${m.toFixed(2)} m · ${ft.toFixed(2)} ft`;

  const leqDetail = (m: number, ft: number) =>
    imperial
      ? `${ft.toFixed(2)} ft (${m.toFixed(2)} m)`
      : `${m.toFixed(2)} m (${ft.toFixed(2)} ft)`;

  const diPrimary = imperial
    ? `${c.diIn.toFixed(3)} in`
    : `${c.diMm.toFixed(2)} mm`;
  const diDual = imperial
    ? `${c.diIn.toFixed(3)} in · ${c.diMm.toFixed(2)} mm`
    : `${c.diMm.toFixed(2)} mm · ${c.diIn.toFixed(3)} in`;

  const heroValue = c.invalid ? "—" : leqPrimary(c.leqTotalM, c.leqTotalFt);
  const multiQty = c.quantity > 1;

  const rows: ResultRow[] = [];
  if (!c.invalid) {
    if (multiQty) {
      rows.push(
        {
          section: "Equivalent length",
          label: "Unit L_eq (one fitting)",
          value: leqDetail(c.leqSingleM, c.leqSingleFt),
        },
        {
          section: "Equivalent length",
          label: `Total L_eq (× ${c.quantity})`,
          value: leqDetail(c.leqTotalM, c.leqTotalFt),
          emphasis: true,
        },
        {
          section: "Resistance",
          label: "K per fitting (f_T × L/D)",
          value: c.kSingle.toFixed(2),
        },
        {
          section: "Resistance",
          label: "K total",
          value: c.kTotal.toFixed(2),
          emphasis: true,
        },
      );
    } else {
      rows.push(
        {
          section: "Equivalent length",
          label: "L_eq",
          value: leqDetail(c.leqTotalM, c.leqTotalFt),
          emphasis: true,
        },
        {
          section: "Resistance",
          label: "K (f_T × L/D)",
          value: c.kSingle.toFixed(2),
          emphasis: true,
        },
      );
    }
    rows.push({
      section: "Pipe",
      label: "Inside diameter D_i",
      value: diDual,
    });
  }

  return {
    heroLabel: multiQty ? "Total equivalent length" : "Equivalent length",
    heroValue,
    heroStatus: c.invalid
      ? "Check inputs"
      : `${c.fittingLabel} · qty ${c.quantity}`,
    heroStatusLevel: c.invalid ? "fail" : "neutral",
    heroBadges: c.invalid
      ? undefined
      : [
          { label: "NPS", value: c.nps },
          { label: "Sch", value: c.schedule },
          { label: "D_i", value: diPrimary },
          { label: "L/D", value: String(c.ldRatio) },
          {
            label: multiQty ? "K Σ" : "K",
            value: (multiQty ? c.kTotal : c.kSingle).toFixed(2),
          },
          { label: "f_T", value: c.fT.toFixed(3) },
        ],
    summary: [
      {
        label: "Nominal size",
        value: `NPS ${c.nps} · Sch ${c.schedule}`,
      },
      {
        label: "Inside diameter D_i",
        value: c.invalid ? "—" : diDual,
      },
      {
        label: "L/D ratio",
        value: c.invalid ? "—" : String(c.ldRatio),
      },
      {
        label: multiQty ? "K total" : "K",
        value: c.invalid
          ? "—"
          : (multiQty ? c.kTotal : c.kSingle).toFixed(2),
      },
      {
        label: "f_T (Crane)",
        value: c.invalid ? "—" : c.fT.toFixed(3),
      },
    ],
    summaryStatus: {
      label: c.invalid ? "Check inputs" : "Crane TP-410",
      level: c.invalid ? "fail" : "neutral",
    },
    rows,
    callouts,
    exportRows: [
      { label: "Standard", value: "Crane TP-410 / ASME B36.10M ID" },
      { label: "NPS", value: c.nps },
      { label: "Schedule", value: c.schedule },
      { label: "Fitting", value: c.fittingLabel },
      { label: "Quantity", value: String(c.quantity) },
      {
        label: "D_i mm",
        value: c.invalid ? "—" : c.diMm.toFixed(3),
      },
      {
        label: "D_i in",
        value: c.invalid ? "—" : c.diIn.toFixed(4),
      },
      { label: "L/D", value: c.invalid ? "—" : String(c.ldRatio) },
      { label: "f_T", value: c.invalid ? "—" : c.fT.toFixed(4) },
      {
        label: "K single",
        value: c.invalid ? "—" : c.kSingle.toFixed(4),
      },
      {
        label: "K total",
        value: c.invalid ? "—" : c.kTotal.toFixed(4),
      },
      {
        label: "L_eq single m",
        value: c.invalid ? "—" : c.leqSingleM.toFixed(4),
      },
      {
        label: "L_eq total m",
        value: c.invalid ? "—" : c.leqTotalM.toFixed(4),
      },
      {
        label: "L_eq total ft",
        value: c.invalid ? "—" : c.leqTotalFt.toFixed(4),
      },
    ],
  };
}
