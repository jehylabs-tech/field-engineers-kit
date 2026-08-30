import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import { getFittingValveDimensionEntry } from "@/lib/data/loaders";
import { formatLength, formatWeight } from "@/utils/unitConverter";

/** Default RF gasket thickness per flange joint (mm). */
export const DEFAULT_GASKET_THICKNESS_MM = 1.5;
/** Two flange faces for in-line spool takeout. */
export const DEFAULT_GASKET_JOINTS = 2;

export type FittingValveDimensionInputs = {
  unitSystem: UnitSystem;
  componentId: string;
  nps: string;
  pressureClass: string;
  /** Add gasket takeout to Total Installation Length (default 1.5 mm × 2). */
  includeGasketTakeout: boolean;
  gasketThicknessMm: number;
  gasketJoints: number;
};

/** Short sticky-bar label from full dimensionLabel (e.g. "Face-to-face (L)" → "Face-to-face"). */
export function stickyDimensionLabel(dimensionLabel: string): string {
  return dimensionLabel.replace(/\s*\([^)]*\)\s*$/, "").trim() || dimensionLabel;
}

export function calculateFittingValveDimension(
  inputs: FittingValveDimensionInputs,
): CalculatorOutput {
  const entry = getFittingValveDimensionEntry(
    inputs.componentId,
    inputs.nps,
    inputs.pressureClass,
  );

  if (!entry) {
    return {
      heroLabel: "Dimension",
      heroValue: "—",
      heroStatus: "Select a valid component, NPS, and class combination",
      heroStatusLevel: "warn",
      summary: [
        { label: "Face-to-face", value: "—" },
        { label: "Total installation", value: "—" },
        { label: "Weight", value: "—" },
      ],
      summaryStatus: {
        label: "No matching data in reference table",
        level: "warn",
      },
      rows: [],
      exportRows: [],
    };
  }

  const { component, size, rating } = entry;
  const dimension = formatLength(rating.dimensionMm, inputs.unitSystem);
  const weight = formatWeight(rating.weightKg, inputs.unitSystem);
  const classLabel = rating.class === "STD" ? "Standard" : `Class ${rating.class}`;
  const dimKey = component.dimensionLabel.match(/\(([LAME])\)/)?.[1];
  const barDimLabel = stickyDimensionLabel(component.dimensionLabel);

  const gasketMm =
    Math.max(0, inputs.gasketThicknessMm) * Math.max(0, inputs.gasketJoints);
  const includeGasket = inputs.includeGasketTakeout && gasketMm > 0;
  const installMm = rating.dimensionMm + (includeGasket ? gasketMm : 0);
  const installLength = formatLength(installMm, inputs.unitSystem);
  const gasketLabel = formatLength(gasketMm, inputs.unitSystem);

  /** Sticky SummaryBar — always 3 live values tied to current inputs. */
  const summary = [
    { label: barDimLabel, value: dimension },
    { label: "Total installation", value: installLength },
    { label: "Weight", value: weight },
  ];

  const rows = [
    { label: "Component", value: component.label },
    { label: "Standard", value: component.standard },
    { label: "Nominal pipe size (NPS)", value: size.npsLabel },
    { label: "DN", value: `DN ${size.dn}` },
    { label: "Rating", value: classLabel },
    {
      label: component.dimensionLabel,
      value: dimension,
      highlight: dimKey,
      emphasis: true,
    },
    ...(includeGasket
      ? [
          {
            label: "Gasket takeout",
            value: `${gasketLabel} (${inputs.gasketThicknessMm} mm × ${inputs.gasketJoints})`,
          },
        ]
      : []),
    {
      label: "Total Installation Length",
      value: installLength,
      emphasis: true,
      highlight: dimKey,
    },
    { label: "Approximate weight", value: weight },
  ];

  const exportRows = [
    { label: "Standard", value: component.standard },
    { label: "Component", value: component.label },
    { label: "NPS", value: size.npsLabel },
    { label: "Rating", value: classLabel },
    { label: component.dimensionLabel, value: dimension },
    ...(includeGasket
      ? [
          {
            label: "Gasket takeout",
            value: `${gasketLabel} (${inputs.gasketThicknessMm} mm × ${inputs.gasketJoints})`,
          },
        ]
      : []),
    { label: "Total Installation Length", value: installLength },
    { label: "Approximate weight", value: weight },
  ];

  return {
    heroLabel: component.dimensionLabel,
    heroValue: dimension,
    heroStatus: `${component.label} · ${size.npsLabel} · ${classLabel}`,
    heroStatusLevel: "neutral",
    summary,
    summaryStatus: {
      label: includeGasket
        ? `${size.npsLabel} · install includes gasket takeout`
        : `${size.npsLabel} · ${classLabel} · verify for procurement`,
      level: "neutral",
    },
    rows,
    exportRows,
  };
}

export const DEFAULT_FITTING_VALVE_DIMENSION_INPUTS: FittingValveDimensionInputs =
  {
    unitSystem: "metric",
    componentId: "gate_valve",
    nps: "4",
    pressureClass: "150",
    includeGasketTakeout: true,
    gasketThicknessMm: DEFAULT_GASKET_THICKNESS_MM,
    gasketJoints: DEFAULT_GASKET_JOINTS,
  };
