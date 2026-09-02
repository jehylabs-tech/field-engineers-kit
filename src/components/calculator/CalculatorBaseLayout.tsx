"use client";

import type { ReactNode } from "react";
import { CarryFlashFrame } from "@/components/calculator/CarryFlashFrame";
import InputTabFlow from "@/components/calculator/InputTabFlow";
import ResultPane from "@/components/calculator/ResultPane";
import CalculatorErrorBoundary from "@/components/calculator/CalculatorErrorBoundary";
import { useWorkstationLayout } from "@/components/calculator/CalculatorMetaContext";
import { SchematicHighlightProvider } from "@/components/calculator/schematics/SchematicHighlight";
import type { CalculatorOutput } from "@/lib/calculators/definitions";
import {
  resolveWorkstationLayout,
  type WorkstationLayout,
} from "@/lib/calculators/workstation-layout";

type CalculatorBaseLayoutProps = {
  inputPanel: ReactNode;
  output: CalculatorOutput;
  exportTitle: string;
  standard?: string;
  inputRows: { label: string; value: string }[];
  visual?: ReactNode;
  chart?: ReactNode;
  /** When set, replaces the default ResultPane inside card 2. */
  resultPanel?: ReactNode;
  /** Extra controls aligned with the "2. Calculation Results" title (e.g. export). */
  resultHeaderActions?: ReactNode;
  /** Formula split override: default 5:7, 7:5 input-heavy, or 6:6 equal. */
  columnRatio?: "5-7" | "7-5" | "6-6";
  layout?: WorkstationLayout | "datasheet";
  /** 3/9 two-column split (inputs ~25% · results ~75%). */
  wideResult?: boolean;
  /** Hero full-width; result tables in a 2-column sub-grid (dimensions | bolt + procurement). */
  resultDashboard?: boolean;
  /** Show View CAD Diagram on this result table section header. */
  diagramSection?: string;
  /** Lookup layout: give the CAD column more width (3 / 4 / 5). */
  diagramEmphasis?: boolean;
  /** Full-width panel below the main input/results grid. */
  footerPanel?: ReactNode;
  /** Keep the input card at natural height (no equal-height stretch). */
  inputNaturalHeight?: boolean;
};

export default function CalculatorBaseLayout({
  inputPanel,
  output,
  exportTitle,
  standard,
  inputRows,
  visual,
  chart,
  resultPanel,
  resultHeaderActions,
  columnRatio = "5-7",
  layout: layoutProp,
  wideResult = false,
  resultDashboard = false,
  diagramSection,
  diagramEmphasis = false,
  footerPanel,
  inputNaturalHeight = false,
}: CalculatorBaseLayoutProps) {
  const metaLayout = useWorkstationLayout();
  const layout = resolveWorkstationLayout(layoutProp ?? metaLayout);
  const showSideDiagram = layout === "lookup" && Boolean(visual) && !wideResult;
  const stretchCards =
    !inputNaturalHeight &&
    (Boolean(resultPanel) ||
      layout === "formula" ||
      layout === "converter" ||
      (layout === "lookup" && !showSideDiagram));

  // Tailwind class literals must stay in this file (content scan).
  let gridGap = "gap-6";
  let inputSpan = "col-span-12 w-full min-w-0 lg:col-span-6";
  let resultSpan = "col-span-12 w-full min-w-0 lg:col-span-6";
  let diagramSpan = "";
  let fieldMax = "[&_.calc-field]:max-w-[300px]";
  let resultMax = "";
  const tight = wideResult || resultDashboard;
  const compactPanel = Boolean(resultPanel) && !wideResult && !resultDashboard;
  const inputHeavy = columnRatio === "7-5" || columnRatio === "6-6";
  const inputCardPad = tight
    ? "px-4 py-5"
    : inputHeavy
      ? "px-4 py-4"
      : compactPanel
        ? "px-3 py-3"
        : "p-4 md:p-5";
  const resultCardPad = tight
    ? "p-4"
    : inputHeavy
      ? "px-4 py-4"
      : compactPanel
        ? "px-3 py-3"
        : "p-4 md:p-5";
  const cardTitleClass = tight
    ? "mb-3 flex h-5 items-center text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200"
    : compactPanel || inputHeavy
      ? "mb-2 flex h-5 items-center text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200"
      : "mb-3 flex h-5 items-center text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200";
  const inputStackGap = tight
    ? resultDashboard
      ? "space-y-4"
      : "space-y-3.5"
    : compactPanel || inputHeavy
      ? "space-y-0"
      : "space-y-3.5";
  const cardShell =
    "w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-spec-border dark:bg-spec-panel";

  if (wideResult) {
    gridGap = resultDashboard ? "gap-3" : "gap-4";
    fieldMax = "[&_.calc-field]:max-w-none";
    inputSpan = "col-span-12 w-full min-w-0 self-start lg:col-span-3";
    resultSpan = "col-span-12 w-full min-w-0 self-start lg:col-span-9";
  } else if (layout === "lookup") {
    gridGap = "gap-5";
    fieldMax = "[&_.calc-field]:max-w-[300px]";
    if (showSideDiagram) {
      if (diagramEmphasis) {
        inputSpan = "col-span-12 w-full min-w-0 self-start lg:col-span-3";
        resultSpan = "col-span-12 w-full min-w-0 self-start lg:col-span-4";
        diagramSpan = "col-span-12 w-full min-w-0 self-start lg:col-span-5";
      } else {
        inputSpan = "col-span-12 w-full min-w-0 self-start lg:col-span-3";
        resultSpan = "col-span-12 w-full min-w-0 self-start lg:col-span-5";
        diagramSpan = "col-span-12 w-full min-w-0 self-start lg:col-span-4";
      }
    } else {
      // 4:8 split — stretch equal-height cards when no side diagram
      inputSpan = "col-span-12 flex w-full min-w-0 lg:col-span-4";
      resultSpan = "col-span-12 flex w-full min-w-0 lg:col-span-8";
      fieldMax = "[&_.calc-field]:max-w-none";
    }
  } else if (layout === "converter") {
    gridGap = "gap-4";
    inputSpan = "col-span-12 flex w-full min-w-0 lg:col-span-5";
    resultSpan = "col-span-12 flex w-full min-w-0 lg:col-span-7";
    fieldMax = "[&_.calc-field]:max-w-[300px]";
  } else if (columnRatio === "7-5") {
    gridGap = "gap-6";
    inputSpan = "col-span-12 flex w-full min-w-0 md:col-span-7";
    resultSpan = "col-span-12 flex w-full min-w-0 md:col-span-5";
    fieldMax = "[&_.calc-field]:max-w-none";
  } else if (columnRatio === "6-6") {
    gridGap = "gap-6";
    inputSpan = "col-span-12 flex w-full min-w-0 md:col-span-6";
    resultSpan = "col-span-12 flex w-full min-w-0 md:col-span-6";
    fieldMax = "[&_.calc-field]:max-w-none";
  } else {
    gridGap = compactPanel ? "gap-3" : "gap-4";
    inputSpan = "col-span-12 flex w-full min-w-0 lg:col-span-5";
    resultSpan = "col-span-12 flex w-full min-w-0 lg:col-span-7";
    fieldMax = "[&_.calc-field]:max-w-none";
  }

  return (
    <SchematicHighlightProvider>
      <div
        className={`-mx-6 mt-0 bg-slate-50 px-6 dark:bg-spec-bg ${
          compactPanel ? "py-2" : "py-3"
        }`}
      >
        <div
          data-workstation-layout={layout}
          className={`grid w-full min-w-0 max-w-full grid-cols-12 ${
            stretchCards && !inputNaturalHeight ? "items-stretch" : "items-start"
          } ${gridGap} ${fieldMax} ${resultMax}`}
        >
          <div className={`${inputSpan}${resultPanel && !stretchCards ? " flex" : ""}`}>
            <div
              className={`${cardShell} ${inputCardPad}${
                stretchCards || resultPanel
                  ? " flex h-full w-full min-w-0 flex-col"
                  : ""
              }`}
            >
              <h2 className={cardTitleClass}>1. Input Parameters</h2>
              <InputTabFlow>
                <CarryFlashFrame>
                  <div
                    className={`w-full min-w-0 [&_.preset-chips]:hidden ${inputStackGap}${
                      stretchCards || resultPanel
                        ? " flex min-h-0 flex-1 flex-col"
                        : ""
                    }`}
                  >
                    {inputPanel}
                  </div>
                </CarryFlashFrame>
              </InputTabFlow>
            </div>
          </div>

          <div
            className={`relative ${
              stretchCards || resultPanel ? "flex " : ""
            }${resultSpan}`}
          >
            <div
              className={`${cardShell} ${resultCardPad}${
                stretchCards || resultPanel
                  ? " flex h-full w-full min-w-0 flex-col"
                  : ""
              }`}
            >
              {resultHeaderActions ? (
                <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
                    2. Calculation Results
                  </h2>
                  <div className="flex shrink-0 items-center justify-end">
                    {resultHeaderActions}
                  </div>
                </div>
              ) : (
                <h2 className={cardTitleClass}>2. Calculation Results</h2>
              )}
              <CalculatorErrorBoundary>
                {resultPanel ?? (
                  <ResultPane
                    output={output}
                    exportTitle={exportTitle}
                    standard={standard}
                    inputRows={inputRows}
                    visual={showSideDiagram ? undefined : visual}
                    compact
                    layout={layout}
                    wideResult={wideResult}
                    resultDashboard={resultDashboard}
                    embedDiagram={false}
                    diagramSection={diagramSection}
                    diagramVariant={diagramSection ? "modal" : "drawer"}
                  />
                )}
                {chart}
              </CalculatorErrorBoundary>
            </div>
          </div>

          {showSideDiagram ? (
            <div className={diagramSpan}>
              <div className={`${cardShell} ${resultCardPad}`}>
                <h2 className={cardTitleClass}>CAD Diagram</h2>
                <div className="flex items-center justify-center [&_.schematic-frame]:mt-0 [&_.schematic-frame]:border-0 [&_.schematic-frame]:pt-0 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full">
                  {visual}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {footerPanel ? (
          <div className="col-span-12 mt-3 w-full min-w-0 space-y-3">{footerPanel}</div>
        ) : null}
      </div>
    </SchematicHighlightProvider>
  );
}
