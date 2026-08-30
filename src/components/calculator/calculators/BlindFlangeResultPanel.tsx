"use client";

import { useState, type ReactNode } from "react";
import CalculatorResultNotice from "@/components/calculator/CalculatorResultNotice";
import ExportButtons from "@/components/calculator/ExportButtons";
import type { CalculatorOutput } from "@/lib/calculators/definitions";

type BlindFlangeResultPanelProps = {
  output: CalculatorOutput;
  exportTitle: string;
  standard?: string;
  inputRows: { label: string; value: string }[];
  chart: ReactNode;
};

export default function BlindFlangeResultPanel({
  output,
  exportTitle,
  standard,
  inputRows,
  chart,
}: BlindFlangeResultPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col space-y-3.5">
      {/* 1. Hero Summary Card (Key result: Commercial Plate & Required Thickness) */}
      <div
        className={`rounded-xl border p-3.5 shadow-xs ${
          output.heroStatusLevel === "fail"
            ? "border-red-300 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/30"
            : "border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-white to-slate-50 dark:border-blue-900/50 dark:from-slate-900/80 dark:via-slate-900/50 dark:to-blue-950/20"
        }`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-2 border-b pb-2 ${
            output.heroStatusLevel === "fail"
              ? "border-red-200/80 dark:border-red-900/40"
              : "border-blue-100/80 dark:border-blue-900/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                output.heroStatusLevel === "fail"
                  ? "bg-red-600 dark:bg-red-400"
                  : "bg-blue-600 dark:bg-blue-400"
              }`}
            />
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                output.heroStatusLevel === "fail"
                  ? "text-red-900 dark:text-red-200"
                  : "text-blue-900 dark:text-blue-200"
              }`}
            >
              {output.heroLabel}
            </span>
          </div>
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${
              output.heroStatusLevel === "fail"
                ? "bg-red-200 text-red-900 dark:bg-red-900/80 dark:text-red-200"
                : "bg-blue-100/90 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
            }`}
          >
            {output.heroStatus}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Minimum Required Thickness (t_m)
            </div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
              {output.heroValue}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Code Standard Basis
            </div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {standard ?? "ASME B31.3 Para. 304.4.1"}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primary High-Visibility Matrix & Chart (Testing Blind Table / Rating Matrix) */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {chart}
      </div>

      {/* 3. Collapsible Detailed Calculation Breakdown & DataSheet Table */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 transition-all dark:border-slate-800 dark:bg-slate-900/40">
        <button
          type="button"
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              i
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Detailed Calculation Breakdown &amp; Engineering Specs
            </span>
            <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {output.rows.length} parameters
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {detailsOpen ? "▲ Hide Breakdown" : "▼ View DataSheet"}
          </span>
        </button>

        {detailsOpen && (
          <div className="space-y-3 border-t border-slate-200 p-3.5 dark:border-slate-800">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
                    <th className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">
                      Parameter / Formula Factor
                    </th>
                    <th className="py-2 px-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                      Applied Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {output.rows.map((row, idx) => (
                    <tr
                      key={row.label}
                      className={idx % 2 === 1 ? "bg-slate-50/40 dark:bg-slate-800/20" : ""}
                    >
                      <td className="py-1.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {row.label}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ExportButtons
              title={exportTitle}
              standard={standard}
              inputRows={inputRows}
              resultRows={output.exportRows}
            />
          </div>
        )}
      </div>
    </div>
  );
}
