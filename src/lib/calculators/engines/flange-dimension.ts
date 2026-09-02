import type { CalculatorOutput, ResultRow, UnitSystem } from "@/lib/calculators/definitions";
import {
  facingGasketFactor,
  facingLabel,
  flangeStyleLabel,
  flangeTypeLabel,
  lookupRtjRingNumber,
  resolveFacing,
  resolveFlangeType,
  studLengthDeltaMm,
  typeWeightFactor,
  type FacingId,
  type FlangeTypeId,
} from "@/lib/calculators/engines/flange-options";
import { getFlangeDimensionEntry, getPipeScheduleEntry, defaultScheduleForNps } from "@/lib/data/loaders";
import { formatLength, formatWeight } from "@/utils/unitConverter";

export type FlangeDimensionInputs = {
  unitSystem: UnitSystem;
  nps: string;
  pressureClass: string;
  flangeType?: FlangeTypeId | string;
  facing?: FacingId | string;
};

function hubBorePipeEntry(nps: string) {
  const schedule = defaultScheduleForNps(nps);
  return getPipeScheduleEntry(nps, schedule);
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
  const pipe = hubBorePipeEntry(inputs.nps);
  const flangeType = resolveFlangeType(inputs.flangeType);
  const facing = resolveFacing(inputs.facing, inputs.pressureClass);
  const style = flangeStyleLabel(flangeType, facing);

  if (!entry) {
    return {
      heroLabel: "Flange Weight",
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
  const od = formatLength(rating.outsideDiameterMm, inputs.unitSystem);
  const thickness = formatLength(rating.thicknessMm, inputs.unitSystem);
  const boltCircle = formatLength(rating.boltCircleMm, inputs.unitSystem);
  const boltHole = formatLength(rating.boltHoleDiameterMm, inputs.unitSystem);

  const flangeKg = roundKg(rating.weightKg * typeWeightFactor(flangeType));
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
    ? formatLength(hubBoreMm, inputs.unitSystem)
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

  const dim: ResultRow[] = [
    { label: "Nominal pipe size (NPS)", value: flange.npsLabel, section: "Flange dimensions" },
    { label: "DN", value: `DN ${flange.dn}`, section: "Flange dimensions" },
    { label: "Pressure class", value: `Class ${rating.class}`, section: "Flange dimensions" },
    { label: "Flange type", value: flangeTypeLabel(flangeType), section: "Flange dimensions" },
    { label: "Facing", value: facingLabel(facing), section: "Flange dimensions" },
    { label: "Flange OD", value: od, section: "Flange dimensions", highlight: "od" },
    { label: "Flange thickness (T)", value: thickness, section: "Flange dimensions", highlight: "T" },
    {
      label: flangeType === "bl" ? "Bore" : "Flange hub bore diameter",
      value: hubBore,
      warn: flangeType !== "bl" && !pipe,
      section: "Flange dimensions",
      highlight: "bore",
    },
  ];

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
      label: "Single flange weight",
      value: singleWeight,
      section: "Procurement & rigging weight",
    },
    {
      label: "Gasket weight (screening)",
      value: gasketWeight,
      section: "Procurement & rigging weight",
    },
    {
      label: "Stud bolts & nuts set",
      value: hardwareWeight,
      section: "Procurement & rigging weight",
    },
    {
      label: "Mated pair assembly weight",
      value: assemblyWeight,
      section: "Procurement & rigging weight",
      emphasis: true,
    },
  ];

  return {
    heroLabel: "Total Mated Pair Weight",
    heroValue: assemblyWeight,
    heroStatus: `${flange.npsLabel} · Class ${rating.class} · ${style} · single flange ${singleWeight}`,
    heroStatusLevel: "neutral",
    summary: [
      {
        label: "Rating & type",
        value: `Class ${rating.class} · ${flangeType.toUpperCase()} ${facing.toUpperCase()}`,
      },
      { label: "Single flange weight", value: singleWeight },
      { label: "Flange OD", value: od },
      { label: flangeType === "bl" ? "Bore" : "Hub bore (ID)", value: hubBore },
    ],
    summaryStatus: {
      label: `${gasketKind} · stud length is a screening value — verify for procurement`,
      level: "neutral",
    },
    rows: [...dim, ...bolt, ...procurement],
    exportRows: [
      { label: "Standard", value: standard },
      { label: "NPS", value: flange.npsLabel },
      { label: "Pressure class", value: rating.class },
      { label: "Flange type", value: flangeTypeLabel(flangeType) },
      { label: "Facing", value: facingLabel(facing) },
      ...(ringNumber ? [{ label: "RTJ ring number", value: ringNumber }] : []),
      { label: "Flange OD", value: od },
      { label: "Flange thickness", value: thickness },
      { label: "Flange hub bore diameter", value: hubBore },
      { label: "Stud bolt diameter & length", value: studSpec },
      { label: "Heavy hex nut wrench / spanner size", value: wrench },
      { label: "Bolt circle diameter (PCD)", value: boltCircle },
      { label: "Number of bolts", value: String(rating.boltHoleCount) },
      { label: "Bolt hole size", value: boltHole },
      { label: "Single flange weight", value: singleWeight },
      { label: "Gasket weight (screening)", value: gasketWeight },
      { label: "Stud bolts & nuts set", value: hardwareWeight },
      { label: "Mated pair assembly weight", value: assemblyWeight },
    ],
  };
}

export const DEFAULT_FLANGE_DIMENSION_INPUTS: FlangeDimensionInputs = {
  unitSystem: "metric",
  nps: "4",
  pressureClass: "150",
  flangeType: "wn",
  facing: "rf",
};
