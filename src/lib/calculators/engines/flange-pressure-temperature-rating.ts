/**
 * ASME B16.5 Flange Pressure-Temperature Rating — Phase-1
 * Groups 1.1 (CS) and 2.2 (SS316) with linear interpolation between table nodes.
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import ratingTables from "../../../../data/piping/b16_5_pt_ratings.json";

export type FlangePtMaterialGroup = "1.1" | "2.2";
export type FlangePtClass = "150" | "300" | "600" | "900" | "1500" | "2500";

export type FlangePtRatingInputs = {
  unitSystem: UnitSystem;
  materialGroup: FlangePtMaterialGroup;
  flangeClass: FlangePtClass;
  /** Design temperature — °C (metric) or °F (imperial). */
  designTemperature: number;
};

type PtNode = { tC: number; pBar: number };

type GroupTable = {
  id: string;
  label: string;
  shortLabel: string;
  examples: string[];
  classes: Record<string, PtNode[]>;
};

const GROUPS = ratingTables.groups as Record<string, GroupTable>;

export const FLANGE_PT_MATERIAL_OPTIONS: {
  value: FlangePtMaterialGroup;
  label: string;
}[] = [
  { value: "1.1", label: GROUPS["1.1"].label },
  { value: "2.2", label: GROUPS["2.2"].label },
];

export const FLANGE_PT_CLASS_OPTIONS: { value: FlangePtClass; label: string }[] =
  [
    { value: "150", label: "Class 150" },
    { value: "300", label: "Class 300" },
    { value: "600", label: "Class 600" },
    { value: "900", label: "Class 900" },
    { value: "1500", label: "Class 1500" },
    { value: "2500", label: "Class 2500" },
  ];

export const DEFAULT_FLANGE_PT_RATING_INPUTS: FlangePtRatingInputs = {
  unitSystem: "metric",
  materialGroup: "1.1",
  flangeClass: "150",
  designTemperature: 38,
};

const BAR_TO_PSI = 14.5037738;
const CLASS_150_HIGH_TEMP_C = 538;
const CLASS_150_HIGH_TEMP_F = 1000;

export function classesForMaterialGroup(
  group: FlangePtMaterialGroup,
): FlangePtClass[] {
  const keys = Object.keys(GROUPS[group]?.classes ?? {});
  return FLANGE_PT_CLASS_OPTIONS.map((o) => o.value).filter((c) =>
    keys.includes(c),
  );
}

export function getMaterialMeta(group: FlangePtMaterialGroup) {
  return GROUPS[group];
}

export function getRatingCurve(
  group: FlangePtMaterialGroup,
  flangeClass: FlangePtClass,
): PtNode[] | null {
  const nodes = GROUPS[group]?.classes?.[flangeClass];
  return nodes?.length ? nodes : null;
}

export function celsiusToFahrenheit(tC: number): number {
  return tC * 1.8 + 32;
}

export function fahrenheitToCelsius(tF: number): number {
  return (tF - 32) / 1.8;
}

export function designTempToCelsius(
  value: number,
  unitSystem: UnitSystem,
): number {
  return unitSystem === "imperial" ? fahrenheitToCelsius(value) : value;
}

/** Linear interpolate P(bar) at T(°C) on sorted nodes. */
export function interpolatePressureBar(
  nodes: PtNode[],
  tC: number,
): { pBar: number; clamped: boolean; tMin: number; tMax: number } {
  const sorted = [...nodes].sort((a, b) => a.tC - b.tC);
  const tMin = sorted[0].tC;
  const tMax = sorted[sorted.length - 1].tC;
  if (tC <= tMin) {
    return { pBar: sorted[0].pBar, clamped: tC < tMin, tMin, tMax };
  }
  if (tC >= tMax) {
    return {
      pBar: sorted[sorted.length - 1].pBar,
      clamped: tC > tMax,
      tMin,
      tMax,
    };
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (tC >= a.tC && tC <= b.tC) {
      if (b.tC === a.tC) {
        return { pBar: a.pBar, clamped: false, tMin, tMax };
      }
      const frac = (tC - a.tC) / (b.tC - a.tC);
      const pBar = a.pBar + frac * (b.pBar - a.pBar);
      return { pBar, clamped: false, tMin, tMax };
    }
  }
  return {
    pBar: sorted[sorted.length - 1].pBar,
    clamped: true,
    tMin,
    tMax,
  };
}

export function ambientRatingBar(
  group: FlangePtMaterialGroup,
  flangeClass: FlangePtClass,
): number | null {
  const nodes = getRatingCurve(group, flangeClass);
  if (!nodes?.length) return null;
  // Ambient band rating = pressure at 38 °C node (same as −29 °C).
  const at38 = nodes.find((n) => n.tC === 38) ?? nodes[0];
  return at38.pBar;
}

export type FlangePtComputed = {
  tC: number;
  pBar: number;
  hydroBar: number;
  ambientBar: number;
  tMin: number;
  tMax: number;
  outOfRange: boolean;
  class150HighTempWarn: boolean;
  invalid: boolean;
  invalidReason?: string;
  curve: PtNode[] | null;
};

export function computeFlangePtRating(
  inputs: FlangePtRatingInputs,
): FlangePtComputed {
  const curve = getRatingCurve(inputs.materialGroup, inputs.flangeClass);
  const tC = designTempToCelsius(inputs.designTemperature, inputs.unitSystem);

  if (!curve) {
    return {
      tC,
      pBar: 0,
      hydroBar: 0,
      ambientBar: 0,
      tMin: 0,
      tMax: 0,
      outOfRange: false,
      class150HighTempWarn: false,
      invalid: true,
      invalidReason: `Class ${inputs.flangeClass} is not in the Phase-1 table for Group ${inputs.materialGroup}`,
      curve: null,
    };
  }

  if (!Number.isFinite(tC)) {
    return {
      tC: NaN,
      pBar: 0,
      hydroBar: 0,
      ambientBar: 0,
      tMin: curve[0].tC,
      tMax: curve[curve.length - 1].tC,
      outOfRange: false,
      class150HighTempWarn: false,
      invalid: true,
      invalidReason: "Enter a valid design temperature",
      curve,
    };
  }

  const ambientBar = ambientRatingBar(inputs.materialGroup, inputs.flangeClass)!;
  const { pBar, clamped, tMin, tMax } = interpolatePressureBar(curve, tC);
  const hydroBar = ambientBar * 1.5;
  const class150HighTempWarn =
    inputs.flangeClass === "150" && tC > CLASS_150_HIGH_TEMP_C;

  return {
    tC,
    pBar,
    hydroBar,
    ambientBar,
    tMin,
    tMax,
    outOfRange: clamped,
    class150HighTempWarn,
    invalid: false,
    curve,
  };
}

function fmtPressure(bar: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(bar)) return "—";
  const psi = bar * BAR_TO_PSI;
  const mpa = bar / 10;
  if (unitSystem === "imperial") {
    return `${psi.toFixed(0)} psi · ${bar.toFixed(1)} bar · ${mpa.toFixed(2)} MPa`;
  }
  return `${bar.toFixed(1)} bar · ${mpa.toFixed(2)} MPa · ${psi.toFixed(0)} psi`;
}

function fmtTemp(tC: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(tC)) return "—";
  const tF = celsiusToFahrenheit(tC);
  if (unitSystem === "imperial") {
    return `${tF.toFixed(0)} °F · ${tC.toFixed(1)} °C`;
  }
  return `${tC.toFixed(1)} °C · ${tF.toFixed(0)} °F`;
}

export function calculateFlangePtRating(
  inputs: FlangePtRatingInputs,
): CalculatorOutput {
  const c = computeFlangePtRating(inputs);
  const meta = getMaterialMeta(inputs.materialGroup);

  let heroStatusLevel: StatusLevel = "neutral";
  let heroStatus = c.invalidReason ?? "Enter material group, class, and temperature";

  if (c.invalid) {
    heroStatusLevel = "fail";
    heroStatus = c.invalidReason ?? "Invalid selection";
  } else if (c.outOfRange || c.class150HighTempWarn) {
    heroStatusLevel = "warn";
    if (c.outOfRange && c.class150HighTempWarn) {
      heroStatus = `Outside table range (−29…538 °C) · Class 150 high-temp limit`;
    } else if (c.outOfRange) {
      heroStatus = `Outside table range (${c.tMin}…${c.tMax} °C) — endpoint rating shown, not valid at this T`;
    } else {
      heroStatus = `Class 150 above ${CLASS_150_HIGH_TEMP_C} °C / ${CLASS_150_HIGH_TEMP_F} °F — confirm B16.5 notes`;
    }
  } else {
    heroStatusLevel = "pass";
    heroStatus = `MAWP at ${fmtTemp(c.tC, inputs.unitSystem)}`;
  }

  const callouts: ResultCallout[] = [];

  if (!c.invalid && c.outOfRange) {
    callouts.push({
      tone: "warn",
      title: "Temperature Outside Published Nodes",
      body: `Design temperature is outside ${c.tMin}…${c.tMax} °C for this group/class. The value shown is the nearest table endpoint only — it is not a rated MAWP at the entered temperature.`,
    });
  }

  if (!c.invalid && c.class150HighTempWarn) {
    callouts.push({
      tone: "warn",
      title: "Class 150 High-Temperature Restriction",
      body: `Class 150 flanges above ${CLASS_150_HIGH_TEMP_C} °C (${CLASS_150_HIGH_TEMP_F} °F) have special B16.5 limitations. Confirm material notes and owner specification before use.`,
    });
  }

  const ambientLabel =
    inputs.unitSystem === "imperial"
      ? "Ambient rating (−20…100 °F)"
      : "Ambient rating (−29…38 °C)";

  const rows: ResultRow[] = [
    {
      section: "Rating",
      label: "Maximum allowable working pressure",
      value: c.invalid ? "—" : fmtPressure(c.pBar, inputs.unitSystem),
      emphasis: true,
      warn: !c.invalid && c.outOfRange,
    },
    {
      section: "Rating",
      label: "Hydrostatic shell test (1.5 × ambient)",
      value: c.invalid ? "—" : fmtPressure(c.hydroBar, inputs.unitSystem),
    },
    {
      section: "Rating",
      label: ambientLabel,
      value: c.invalid ? "—" : fmtPressure(c.ambientBar, inputs.unitSystem),
    },
    {
      section: "Rating",
      label: "Typical material specs",
      value: meta?.examples?.join(", ") ?? "—",
    },
  ];

  return {
    heroLabel: "Maximum allowable working pressure",
    heroValue: c.invalid ? "—" : fmtPressure(c.pBar, inputs.unitSystem),
    heroStatus,
    heroStatusLevel,
    heroBadges: c.invalid
      ? undefined
      : [
          {
            label: "Hydrotest",
            value:
              inputs.unitSystem === "imperial"
                ? `${(c.hydroBar * BAR_TO_PSI).toFixed(0)} psi`
                : `${c.hydroBar.toFixed(1)} bar`,
          },
          { label: "Group", value: inputs.materialGroup },
          { label: "Class", value: inputs.flangeClass },
        ],
    summary: [
      {
        label: "MAWP",
        value: c.invalid
          ? "—"
          : inputs.unitSystem === "imperial"
            ? `${(c.pBar * BAR_TO_PSI).toFixed(0)} psi`
            : `${c.pBar.toFixed(1)} bar`,
      },
      {
        label: "Hydrotest",
        value: c.invalid
          ? "—"
          : inputs.unitSystem === "imperial"
            ? `${(c.hydroBar * BAR_TO_PSI).toFixed(0)} psi`
            : `${c.hydroBar.toFixed(1)} bar`,
      },
      {
        label: "Material",
        value: meta?.shortLabel ?? `Group ${inputs.materialGroup}`,
      },
      { label: "Class", value: String(inputs.flangeClass) },
    ],
    summaryStatus: {
      label: heroStatus,
      level: heroStatusLevel,
    },
    rows,
    callouts,
    exportRows: [
      { label: "Material group", value: meta?.label ?? inputs.materialGroup },
      { label: "Flange class", value: inputs.flangeClass },
      { label: "Design temperature", value: fmtTemp(c.tC, inputs.unitSystem) },
      {
        label: "MAWP",
        value: c.invalid ? "—" : fmtPressure(c.pBar, inputs.unitSystem),
      },
      {
        label: "Hydrotest 1.5× ambient",
        value: c.invalid ? "—" : fmtPressure(c.hydroBar, inputs.unitSystem),
      },
    ],
  };
}
