import type { CalculatorOutput, ResultRow, UnitSystem } from "@/lib/calculators/definitions";
import {
  facingGasketFactor,
  facingLabel,
  flangeMassBasisLabel,
  flangeStyleLabel,
  flangeTypeLabel,
  lookupRtjRingNumber,
  resolveFacing,
  resolveFlangeMassKg,
  resolveFlangeType,
  studLengthDeltaMm,
  type FacingId,
  type FlangeTypeId,
} from "@/lib/calculators/engines/flange-options";
import {
  defaultScheduleForNps,
  formatPipeScheduleLabel,
  getFlangeDimensionEntry,
  getPipeScheduleEntry,
  resolveScheduleOptionValue,
} from "@/lib/data/loaders";
import { formatLength, formatWeight } from "@/utils/unitConverter";

export type FlangeDimensionInputs = {
  unitSystem: UnitSystem;
  nps: string;
  pressureClass: string;
  flangeType?: FlangeTypeId | string;
  facing?: FacingId | string;
  /** Pipe schedule for WN hub bore (B36.10M ID). Ignored for Blind. */
  pipeSchedule?: string;
};

function formatFlangeDim(mm: number, unitSystem: UnitSystem): string {
  return formatLength(mm, unitSystem, unitSystem === "metric" ? 1 : 2);
}

function hubBorePipeEntry(nps: string, pipeSchedule?: string) {
  const schedule = defaultScheduleForNps(
    nps,
    pipeSchedule ? resolveScheduleOptionValue(nps, pipeSchedule) : undefined,
  );
  return { schedule, entry: getPipeScheduleEntry(nps, schedule) };
}

function studBoltSpec(diameterIn: string, lengthMm: number): string {
  return `${diameterIn} in × ${lengthMm} mm`;
}

function wrenchSpec(afIn: string, afMm: number): string {
  return `${afIn} in (${afMm} mm)`;
}

function matedPairAssemblyKg(args: {
  flangeKg: number;
  gasketKg: number;
  studKg: number;
  nutKg: number;
  boltCount: number;
}): number {
  const hardwareSetKg = args.boltCount * (args.studKg + 2 * args.nutKg);
  return 2 * args.flangeKg + args.gasketKg + hardwareSetKg;
}

function roundKg(value: number): number {
  return Number(value.toFixed(2));
}

export function calculateFlangeDimension(
  inputs: FlangeDimensionInputs,
): CalculatorOutput {
  const entry = getFlangeDimensionEntry(inputs.nps, inputs.pressureClass);
  const { schedule: resolvedSchedule, entry: pipe } = hubBorePipeEntry(
    inputs.nps,
    inputs.pipeSchedule,
  );
  const flangeType = resolveFlangeType(inputs.flangeType);
  const facing = resolveFacing(inputs.facing, inputs.pressureClass);
  const style = flangeStyleLabel(flangeType, facing);

  if (!entry) {
    return {
      heroLabel: "Mated Pair Weight (W_pair)",
      heroValue: "—",
      heroStatus: "Select a valid NPS and pressure class combination",
      heroStatusLevel: "warn",
      summary: [
        { label: "NPS", value: inputs.nps ? `${inputs.nps}"` : "—" },
        { label: "Class", value: inputs.pressureClass ? `${inputs.pressureClass}#` : "—" },
      ],
      summaryStatus: {
        label: "No matching data in reference table",
        level: "warn",
      },
      rows: [],
      exportRows: [],
    };
  }

  const { flange, rating, standard } = entry;
  const od = formatFlangeDim(rating.outsideDiameterMm, inputs.unitSystem);
  const thickness = formatFlangeDim(rating.thicknessMm, inputs.unitSystem);
  const boltCircle = formatFlangeDim(rating.boltCircleMm, inputs.unitSystem);
  const boltHole = formatFlangeDim(rating.boltHoleDiameterMm, inputs.unitSystem);

  const mass = resolveFlangeMassKg(flangeType, {
    weightKg: rating.weightKg,
    outsideDiameterMm: rating.outsideDiameterMm,
    thicknessMm: rating.thicknessMm,
    weightKgBl: rating.weightKgBl,
    weightKgSo: rating.weightKgSo,
    weightKgSw: rating.weightKgSw,
  });
  const flangeKg = roundKg(mass.kg);
  const gasketKg = roundKg(rating.gasketMassKg * facingGasketFactor(facing));
  const studDelta = studLengthDeltaMm(facing, rating.class);
  const studLengthMm = Math.max(
    40,
    Math.round((rating.studLengthMm + studDelta) / 5) * 5,
  );
  const studKg = roundKg(
    rating.studMassKg * (studLengthMm / Math.max(rating.studLengthMm, 1)),
  );
  const singleWeight = formatWeight(flangeKg, inputs.unitSystem);

  const hubBoreMm =
    flangeType === "bl"
      ? undefined
      : flangeType === "wn"
        ? pipe?.row.insideDiameterMm
        : pipe?.pipe.outsideDiameterMm;
  const hubBore = hubBoreMm
    ? formatFlangeDim(hubBoreMm, inputs.unitSystem)
    : flangeType === "bl"
      ? "Solid (blind)"
      : "—";
  const studSpec = studBoltSpec(rating.studDiameterIn, studLengthMm);
  const wrench = wrenchSpec(rating.wrenchAfIn, rating.wrenchAfMm);
  const studSetKg = rating.boltHoleCount * (studKg + 2 * rating.nutMassKg);
  const assemblyKg = matedPairAssemblyKg({
    flangeKg,
    gasketKg,
    studKg,
    nutKg: rating.nutMassKg,
    boltCount: rating.boltHoleCount,
  });
  const gasketWeight = formatWeight(gasketKg, inputs.unitSystem);
  const hardwareWeight = formatWeight(studSetKg, inputs.unitSystem);
  const assemblyWeight = formatWeight(assemblyKg, inputs.unitSystem);
  const ringNumber =
    facing === "rtj"
      ? lookupRtjRingNumber(inputs.nps, inputs.pressureClass)
      : undefined;
  const gasketKind =
    facing === "rtj"
      ? ringNumber
        ? `RTJ ring ${ringNumber}`
        : "RTJ ring"
      : facing === "ff"
        ? "Full-face gasket (screening)"
        : "Spiral-wound RF (screening)";
  const scheduleLabel = formatPipeScheduleLabel(resolvedSchedule);
  const massBasisLabel = flangeMassBasisLabel(mass.basis);

  const dim: ResultRow[] = [
    { label: "Nominal pipe size (NPS)", value: flange.npsLabel, section: "Flange dimensions" },
    { label: "DN", value: `DN ${flange.dn}`, section: "Flange dimensions" },
    { label: "Pressure class", value: `Class ${rating.class}`, section: "Flange dimensions" },
    { label: "Flange type", value: flangeTypeLabel(flangeType), section: "Flange dimensions" },
    { label: "Facing", value: facingLabel(facing), section: "Flange dimensions" },
    { label: "Flange OD (OD)", value: od, section: "Flange dimensions", highlight: "od" },
    { label: "Flange thickness (T)", value: thickness, section: "Flange dimensions", highlight: "T" },
    {
      label: flangeType === "bl" ? "Bore" : "Flange hub bore diameter",
      value: hubBore,
      warn: flangeType !== "bl" && !pipe,
      section: "Flange dimensions",
      highlight: "bore",
    },
  ];

  if (flangeType === "wn") {
    dim.push({
      label: "Pipe schedule (hub bore)",
      value: scheduleLabel,
      section: "Flange dimensions",
    });
  }

  if (ringNumber) {
    dim.push({
      label: "RTJ ring number",
      value: ringNumber,
      section: "Flange dimensions",
    });
  }

  const bolt: ResultRow[] = [
    {
      label: "Stud bolt diameter & length",
      value: studSpec,
      section: "Field bolt & tool specs",
    },
    {
      label: "Heavy hex nut wrench / spanner size",
      value: wrench,
      section: "Field bolt & tool specs",
    },
    {
      label: "Bolt circle diameter (PCD)",
      value: boltCircle,
      section: "Field bolt & tool specs",
      highlight: "pcd",
    },
    {
      label: "Number of bolts",
      value: String(rating.boltHoleCount),
      section: "Field bolt & tool specs",
    },
    {
      label: "Bolt hole size",
      value: boltHole,
      section: "Field bolt & tool specs",
      highlight: "hole",
    },
  ];

  const procurement: ResultRow[] = [
    {
      label: "Single flange weight (W_f)",
      value: singleWeight,
      section: "Procurement & rigging weight",
    },
    {
      label: "W_f mass basis",
      value: massBasisLabel,
      section: "Procurement & rigging weight",
    },
    {
      label: "Gasket weight (W_g, screening)",
      value: gasketWeight,
      section: "Procurement & rigging weight",
    },
    {
      label: "Stud bolts & nuts set (n × set)",
      value: hardwareWeight,
      section: "Procurement & rigging weight",
    },
    {
      label: "Mated pair assembly weight (W_pair)",
      value: assemblyWeight,
      section: "Procurement & rigging weight",
      emphasis: true,
    },
  ];

  const callouts =
    mass.basis === "solid-disc-estimate" || mass.basis === "type-factor-estimate"
      ? [
          {
            tone: "info" as const,
            title: "W_f is a screening estimate",
            body:
              mass.basis === "solid-disc-estimate"
                ? "Blind flange mass uses a solid-disc estimate (7850 kg/m³ × π/4 × OD² × T), not a flat ratio of the WN catalog weight. Confirm vendor weights for rigging and PO."
                : "SO / SW masses scale the WN RF catalog row by type factors (SO 0.70, SW 0.75) unless a type-specific override is stored. Confirm vendor weights for purchasing.",
          },
        ]
      : undefined;

  return {
    heroLabel: "Mated Pair Weight (W_pair)",
    heroValue: assemblyWeight,
    heroStatus: `${flange.npsLabel} · Class ${rating.class} · ${style} · W_f ${singleWeight}`,
    heroStatusLevel: "neutral",
    heroBadges: [
      { label: "OD", value: od },
      { label: "T", value: thickness },
      { label: "Bolts", value: `${rating.boltHoleCount} × ${rating.studDiameterIn}"` },
      { label: "W_f", value: singleWeight },
    ],
    summary: [
      {
        label: "Rating & type",
        value: `Class ${rating.class} · ${flangeType.toUpperCase()} ${facing.toUpperCase()}`,
      },
      { label: "Single flange (W_f)", value: singleWeight },
      { label: "Flange OD (OD)", value: od },
      { label: flangeType === "bl" ? "Bore" : "Hub bore (ID)", value: hubBore },
    ],
    summaryStatus: {
      label: `${gasketKind} · W_f: ${massBasisLabel} · stud length is screening — verify for procurement`,
      level: "neutral",
    },
    callouts,
    rows: [...dim, ...bolt, ...procurement],
    exportRows: [
      { label: "Standard", value: standard },
      { label: "NPS", value: flange.npsLabel },
      { label: "Pressure class", value: rating.class },
      { label: "Flange type", value: flangeTypeLabel(flangeType) },
      { label: "Facing", value: facingLabel(facing) },
      ...(flangeType === "wn"
        ? [{ label: "Pipe schedule (hub bore)", value: scheduleLabel }]
        : []),
      ...(ringNumber ? [{ label: "RTJ ring number", value: ringNumber }] : []),
      { label: "Flange OD", value: od },
      { label: "Flange thickness (T)", value: thickness },
      { label: "Flange hub bore diameter", value: hubBore },
      { label: "Stud bolt diameter & length", value: studSpec },
      { label: "Heavy hex nut wrench / spanner size", value: wrench },
      { label: "Bolt circle diameter (PCD)", value: boltCircle },
      { label: "Number of bolts", value: String(rating.boltHoleCount) },
      { label: "Bolt hole size", value: boltHole },
      { label: "Single flange weight (W_f)", value: singleWeight },
      { label: "W_f mass basis", value: massBasisLabel },
      { label: "Gasket weight (W_g)", value: gasketWeight },
      { label: "Stud bolts & nuts set", value: hardwareWeight },
      { label: "Mated pair assembly weight (W_pair)", value: assemblyWeight },
    ],
  };
}

export const DEFAULT_FLANGE_DIMENSION_INPUTS: FlangeDimensionInputs = {
  unitSystem: "metric",
  nps: "4",
  pressureClass: "150",
  flangeType: "wn",
  facing: "rf",
  pipeSchedule: "40",
};
