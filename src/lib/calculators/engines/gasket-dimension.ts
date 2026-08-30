import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import { getGasketDimensionEntry } from "@/lib/data/loaders";
import { convertLength, formatLength } from "@/utils/unitConverter";

export type GasketDimensionInputs = {
  unitSystem: UnitSystem;
  gasketTypeId: string;
  nps: string;
  pressureClass: string;
};

function lengthTriplet(
  aMm: number,
  bMm: number,
  cMm: number,
  unitSystem: UnitSystem,
  digits = 3,
): string {
  const a = convertLength(aMm, unitSystem);
  const b = convertLength(bMm, unitSystem);
  const c = convertLength(cMm, unitSystem);
  return `${a.value.toFixed(digits)} × ${b.value.toFixed(digits)} × ${c.value.toFixed(digits)} ${a.unit}`;
}

export function calculateGasketDimension(
  inputs: GasketDimensionInputs,
): CalculatorOutput {
  const entry = getGasketDimensionEntry(
    inputs.gasketTypeId,
    inputs.nps,
    inputs.pressureClass,
  );

  if (!entry) {
    return {
      heroLabel: "Gasket Dimensions",
      heroValue: "—",
      heroStatus: "Select a valid gasket type, NPS, and class combination",
      heroStatusLevel: "warn",
      summary: [
        { label: "Type", value: inputs.gasketTypeId || "—" },
        { label: "NPS", value: inputs.nps ? `${inputs.nps}"` : "—" },
      ],
      summaryStatus: {
        label: "No matching data in reference table",
        level: "warn",
      },
      rows: [],
      exportRows: [],
    };
  }

  const { gasketType, size, rating } = entry;

  if (inputs.gasketTypeId === "spiral_wound" && "outerRingOdMm" in rating) {
    const spiral = rating as {
      innerRingOdMm: number;
      sealingElementOdMm: number;
      outerRingOdMm: number;
      innerDiameterMm: number;
    };
    const outerRing = formatLength(spiral.outerRingOdMm, inputs.unitSystem);
    const sealing = formatLength(spiral.sealingElementOdMm, inputs.unitSystem);
    const innerRing = formatLength(spiral.innerRingOdMm, inputs.unitSystem);
    const innerDia = formatLength(spiral.innerDiameterMm, inputs.unitSystem);
    const heroValue = lengthTriplet(
      spiral.innerDiameterMm,
      spiral.sealingElementOdMm,
      spiral.outerRingOdMm,
      inputs.unitSystem,
    );

    return {
      heroLabel: "ID × Sealing OD × Outer Ring OD",
      heroValue,
      heroStatus: `${gasketType.label} · ${size.npsLabel} · Class ${rating.class}`,
      heroStatusLevel: "neutral",
      summary: [
        { label: "Inner ID", value: innerDia },
        { label: "Sealing OD", value: sealing },
        { label: "Outer OD", value: outerRing },
      ],
      summaryStatus: {
        label: "ASME B16.20 table lookup — verify for procurement",
        level: "neutral",
      },
      rows: [
        { label: "Gasket type", value: gasketType.label, section: "Selection" },
        { label: "Standard", value: gasketType.standard, section: "Selection" },
        {
          label: "Nominal pipe size (NPS)",
          value: size.npsLabel,
          section: "Selection",
        },
        { label: "DN", value: `DN ${size.dn}`, section: "Selection" },
        {
          label: "Pressure class",
          value: `Class ${rating.class}`,
          section: "Selection",
        },
        {
          label: "Inner ring / ID",
          value: innerDia,
          section: "Spiral wound dimensions",
        },
        {
          label: "Inner ring OD",
          value: innerRing,
          section: "Spiral wound dimensions",
        },
        {
          label: "Sealing element OD",
          value: sealing,
          section: "Spiral wound dimensions",
        },
        {
          label: "Outer ring OD",
          value: outerRing,
          section: "Spiral wound dimensions",
        },
      ],
      exportRows: [
        { label: "Standard", value: gasketType.standard },
        { label: "Gasket type", value: gasketType.label },
        { label: "NPS", value: size.npsLabel },
        { label: "Class", value: rating.class },
        { label: "ID × SE OD × OR OD", value: heroValue },
        { label: "Inner diameter", value: innerDia },
        { label: "Inner ring OD", value: innerRing },
        { label: "Sealing element OD", value: sealing },
        { label: "Outer ring OD", value: outerRing },
      ],
    };
  }

  const rtj = rating as {
    ringNumber: string;
    pitchDiameterMm: number;
    ringWidthMm: number;
    ringHeightMm: number;
    innerDiameterMm: number;
    ringStyle?: string;
  };
  const pitch = formatLength(rtj.pitchDiameterMm, inputs.unitSystem);
  const width = formatLength(rtj.ringWidthMm, inputs.unitSystem);
  const height = formatLength(rtj.ringHeightMm, inputs.unitSystem);
  const innerDia = formatLength(rtj.innerDiameterMm, inputs.unitSystem);
  const style = rtj.ringStyle ?? "Octagonal";
  const section = convertLength(rtj.ringWidthMm, inputs.unitSystem);
  const heightConv = convertLength(rtj.ringHeightMm, inputs.unitSystem);
  const pitchConv = convertLength(rtj.pitchDiameterMm, inputs.unitSystem);
  const heroValue = `${rtj.ringNumber} · ⌀${pitchConv.value.toFixed(3)} · ${section.value.toFixed(3)}×${heightConv.value.toFixed(3)} ${section.unit} (${style})`;

  return {
    heroLabel: "Ring No. × Pitch Dia × Section",
    heroValue,
    heroStatus: `${gasketType.label} · ${size.npsLabel} · Class ${rating.class}`,
    heroStatusLevel: "neutral",
    summary: [
      { label: "Ring number", value: rtj.ringNumber },
      { label: "Pitch dia", value: pitch },
      { label: "Section", value: `${width} × ${height}` },
    ],
    summaryStatus: {
      label: `ASME B16.20 ${style} RTJ — verify for procurement`,
      level: "neutral",
    },
    rows: [
      { label: "Gasket type", value: gasketType.label, section: "Selection" },
      { label: "Standard", value: gasketType.standard, section: "Selection" },
      {
        label: "Nominal pipe size (NPS)",
        value: size.npsLabel,
        section: "Selection",
      },
      { label: "DN", value: `DN ${size.dn}`, section: "Selection" },
      {
        label: "Pressure class",
        value: `Class ${rating.class}`,
        section: "Selection",
      },
      { label: "Ring number", value: rtj.ringNumber, section: "RTJ dimensions" },
      { label: "Ring style", value: style, section: "RTJ dimensions" },
      { label: "Pitch diameter", value: pitch, section: "RTJ dimensions" },
      {
        label: "Ring width × height",
        value: `${width} × ${height}`,
        section: "RTJ dimensions",
      },
      { label: "Inner diameter (ID)", value: innerDia, section: "RTJ dimensions" },
    ],
    exportRows: [
      { label: "Standard", value: gasketType.standard },
      { label: "Gasket type", value: gasketType.label },
      { label: "NPS", value: size.npsLabel },
      { label: "Class", value: rating.class },
      { label: "Ring number", value: rtj.ringNumber },
      { label: "Ring style", value: style },
      { label: "Pitch diameter", value: pitch },
      { label: "Ring width", value: width },
      { label: "Ring height", value: height },
      { label: "Summary", value: heroValue },
    ],
  };
}

export const DEFAULT_GASKET_DIMENSION_INPUTS: GasketDimensionInputs = {
  unitSystem: "metric",
  gasketTypeId: "spiral_wound",
  nps: "4",
  pressureClass: "150",
};
