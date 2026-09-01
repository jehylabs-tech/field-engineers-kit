export type CalculatorType =
  | "pipe-thickness"
  | "pipe-schedule"
  | "flange-dimension"
  | "fitting-valve-dimension"
  | "butt-weld-fitting"
  | "bolt-torque"
  | "gasket-dimension"
  | "hydro-test"
  | "blind-flange"
  | "valve-cv"
  | "metal-weight"
  | "thermal-expansion"
  | "pressure-drop"
  | "flow-velocity"
  | "unit-converter";

export type FaqItem = {
  q: string;
  a: string;
};

export type RelatedCalculator = {
  slug: string;
  title: string;
  carry?: string;
};

export type CalculatorDefinition = {
  type: CalculatorType;
  standard?: string;
  subtitle?: string;
  formulaBasis?: string;
  faq?: FaqItem[];
  related?: RelatedCalculator[];
  sponsor?: {
    title: string;
    description: string;
  };
};

export type UnitSystem = "metric" | "imperial";

export type StatusLevel = "pass" | "fail" | "warn" | "neutral";

export type SummaryItem = {
  label: string;
  value: string;
};

export type ResultRow = {
  label: string;
  value: string;
  warn?: boolean;
  section?: string;
  highlight?: string;
  /** Primary engineering result — blue emphasis in result tables. */
  emphasis?: boolean;
};

export type ResultCallout = {
  tone: "info" | "warn";
  title: string;
  body: string;
  /** Optional bullet lines under body. */
  items?: string[];
};

export type CalculatorOutput = {
  heroLabel: string;
  heroValue: string;
  heroStatus: string;
  heroStatusLevel: StatusLevel;
  summary: SummaryItem[];
  summaryStatus: {
    label: string;
    level: StatusLevel;
  };
  gauge?: {
    fillPercent: number;
    limitPercent: number;
    minLabel: string;
    limitLabel: string;
    maxLabel: string;
    caption?: string;
    captionInfo?: string;
    markerLabel?: string;
    /** Renders single-color thickness bar with t_min pointer. */
    variant?: "thickness-margin";
    tMin?: number;
    tActual?: number;
    unit?: string;
  };
  rows: ResultRow[];
  /** Alert / callout cards rendered below result tables. */
  callouts?: ResultCallout[];
  exportRows: { label: string; value: string }[];
};

export const MVP_CALCULATOR_SLUGS = [
  "pipe-wall-thickness",
  "valve-cv-sizing",
  "metal-weight-cost",
] as const;

export function parseCalculatorDefinition(
  formulaJson: Record<string, unknown>,
): CalculatorDefinition {
  return {
    type: (formulaJson.type as CalculatorType) ?? "pipe-thickness",
    standard: formulaJson.standard as string | undefined,
    subtitle: formulaJson.subtitle as string | undefined,
    formulaBasis: formulaJson.formulaBasis as string | undefined,
    faq: formulaJson.faq as FaqItem[] | undefined,
    related: formulaJson.related as RelatedCalculator[] | undefined,
    sponsor: formulaJson.sponsor as CalculatorDefinition["sponsor"],
  };
}
