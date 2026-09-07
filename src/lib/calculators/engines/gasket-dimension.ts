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
      heroLabel: "ID × SE_OD × OR_OD",
      heroValue,
      heroStatus: `${gasketType.label} · ${size.npsLabel} · Class ${rating.class}`,
      heroStatusLevel: "neutral",
      heroBadges: [
        { label: "ID", value: innerDia },
        { label: "SE_OD", value: sealing },
        { label: "OR_OD", value: outerRing },
        { label: "IR_OD", value: innerRing },
      ],
      summary: [
        { label: "Inner ID (ID)", value: innerDia },
        { label: "Sealing OD (SE_OD)", value: sealing },
        { label: "Outer ring OD (OR_OD)", value: outerRing },
      ],
      summaryStatus: {
        label: "ASME B16.20 spiral-wound lookup — verify OEM datasheet before PO",
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
          label: "Inner diameter (ID)",
          value: innerDia,
          section: "Spiral-wound dimensions",
          highlight: "bore",
          emphasis: true,
        },
        {
          label: "Inner ring OD (IR_OD)",
          value: innerRing,
          section: "Spiral-wound dimensions",
        },
        {
          label: "Sealing element OD (SE_OD)",
          value: sealing,
          section: "Spiral-wound dimensions",
          highlight: "od",
        },
        {
          label: "Outer ring OD (OR_OD)",
          value: outerRing,
          section: "Spiral-wound dimensions",
          emphasis: true,
        },
      ],
      exportRows: [
        { label: "Standard", value: gasketType.standard },
        { label: "Gasket type", value: gasketType.label },
        { label: "NPS", value: size.npsLabel },
        { label: "Class", value: rating.class },
        { label: "ID × SE_OD × OR_OD", value: heroValue },
        { label: "Inner diameter (ID)", value: innerDia },
        { label: "Inner ring OD (IR_OD)", value: innerRing },
        { label: "Sealing element OD (SE_OD)", value: sealing },
        { label: "Outer ring OD (OR_OD)", value: outerRing },
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
    heroLabel: "Ring No. · Pitch (P) · Section (w×h)",
    heroValue,
    heroStatus: `${gasketType.label} · ${size.npsLabel} · Class ${rating.class}`,
    heroStatusLevel: "neutral",
    heroBadges: [
      { label: "Ring", value: rtj.ringNumber },
      { label: "P", value: pitch },
      { label: "w×h", value: `${width} × ${height}` },
      { label: "ID", value: innerDia },
    ],
    summary: [
      { label: "Ring number", value: rtj.ringNumber },
      { label: "Pitch diameter (P)", value: pitch },
      { label: "Section (w × h)", value: `${width} × ${height}` },
    ],
    summaryStatus: {
      label: `ASME B16.20 ${style} RTJ lookup — verify OEM datasheet before PO`,
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
        label: "Ring number",
        value: rtj.ringNumber,
        section: "RTJ dimensions",
        emphasis: true,
      },
      { label: "Ring style", value: style, section: "RTJ dimensions" },
      {
        label: "Pitch diameter (P)",
        value: pitch,
        section: "RTJ dimensions",
        highlight: "pcd",
      },
      {
        label: "Ring width × height (w × h)",
        value: `${width} × ${height}`,
        section: "RTJ dimensions",
      },
      {
        label: "Inner diameter (ID)",
        value: innerDia,
        section: "RTJ dimensions",
        highlight: "bore",
      },
    ],
    exportRows: [
      { label: "Standard", value: gasketType.standard },
      { label: "Gasket type", value: gasketType.label },
      { label: "NPS", value: size.npsLabel },
      { label: "Class", value: rating.class },
      { label: "Ring number", value: rtj.ringNumber },
      { label: "Ring style", value: style },
      { label: "Pitch diameter (P)", value: pitch },
      { label: "Ring width (w)", value: width },
      { label: "Ring height (h)", value: height },
      { label: "Inner diameter (ID)", value: innerDia },
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
