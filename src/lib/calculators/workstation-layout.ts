import type { CalculatorType } from "@/lib/calculators/definitions";

/**
 * Pattern A — lookup + CAD: 3-col (inputs 3 / results 5 / diagram 4)
 * Pattern B — formula / multi-input: 2-col (inputs 7 / results 5)
 * Pattern C — simple converter: 2-col (inputs 5 / results 7, capped widths)
 */
export type WorkstationLayout = "lookup" | "formula" | "converter";

/** @deprecated alias kept for older call sites */
export type WorkstationLayoutLegacy = WorkstationLayout | "datasheet";

const LOOKUP_TYPES = new Set<CalculatorType>([
  "fitting-valve-dimension",
  "butt-weld-fitting",
  "gasket-dimension",
]);

const CONVERTER_TYPES = new Set<CalculatorType>(["unit-converter"]);

export function getWorkstationLayout(
  type: CalculatorType | undefined,
): WorkstationLayout {
  if (type && LOOKUP_TYPES.has(type)) return "lookup";
  if (type && CONVERTER_TYPES.has(type)) return "converter";
  return "formula";
}

/** Normalize legacy "datasheet" → "lookup". */
export function resolveWorkstationLayout(
  layout: WorkstationLayout | "datasheet" | undefined,
  type?: CalculatorType,
): WorkstationLayout {
  if (layout === "datasheet") return "lookup";
  if (layout === "lookup" || layout === "formula" || layout === "converter") {
    return layout;
  }
  return getWorkstationLayout(type);
}
