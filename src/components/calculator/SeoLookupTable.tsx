"use client";

import { useMemo } from "react";
import { useUnitSystemOptional } from "@/components/units/UnitContext";
import type { UnitSystem } from "@/lib/calculators/definitions";
import {
  convertSeoTableCell,
  rewriteUnitLabels,
  type SeoTableColumnUnit,
} from "@/lib/units/unit-aware-text";
import { readPreferredUnitSystem } from "@/lib/units/preferred-system";
import { useEffect, useState } from "react";

type SeoLookupTableProps = {
  caption: string;
  headers: string[];
  rows: string[][];
  footnote?: string;
  allNumeric?: boolean;
  /** @deprecated Prefer tableColumnUnits with quantity "torque". */
  torqueNmColumns?: number[];
  /** SI-stored columns converted when navbar is imperial. */
  columnUnits?: SeoTableColumnUnit[];
  /** Column indexes to emphasize with bold weight. */
  boldColumns?: number[];
};

function useTableUnitSystem(): UnitSystem {
  const ctx = useUnitSystemOptional();
  const [fallback, setFallback] = useState<UnitSystem>("metric");

  useEffect(() => {
    if (ctx) return;
    const fromUrl = new URLSearchParams(window.location.search).get("units");
    if (fromUrl === "imperial" || fromUrl === "metric") {
      setFallback(fromUrl);
    } else {
      setFallback(readPreferredUnitSystem());
    }
    function onUnits(event: Event) {
      const detail = (event as CustomEvent<UnitSystem>).detail;
      if (detail === "metric" || detail === "imperial") setFallback(detail);
    }
    window.addEventListener("fek-units-change", onUnits);
    return () => window.removeEventListener("fek-units-change", onUnits);
  }, [ctx]);

  return ctx?.unitSystem ?? fallback;
}

function resolveColumnUnits(
  columnUnits: SeoTableColumnUnit[] | undefined,
  torqueNmColumns: number[] | undefined,
): SeoTableColumnUnit[] {
  if (columnUnits?.length) return columnUnits;
  if (!torqueNmColumns?.length) return [];
  return torqueNmColumns.map((index) => ({
    index,
    quantity: "torque" as const,
    digits: 0,
  }));
}

export default function SeoLookupTable({
  caption,
  headers,
  rows,
  footnote,
  allNumeric = false,
  torqueNmColumns,
  columnUnits,
  boldColumns,
}: SeoLookupTableProps) {
  const units = useTableUnitSystem();
  const columns = useMemo(
    () => resolveColumnUnits(columnUnits, torqueNmColumns),
    [columnUnits, torqueNmColumns],
  );

  const displayHeaders = useMemo(
    () => headers.map((header) => rewriteUnitLabels(header, units)),
    [headers, units],
  );

  const displayCaption = useMemo(
    () => rewriteUnitLabels(caption, units),
    [caption, units],
  );

  const displayFootnote = useMemo(
    () => (footnote ? rewriteUnitLabels(footnote, units) : undefined),
    [footnote, units],
  );

  const columnByIndex = useMemo(() => {
    const map = new Map<number, SeoTableColumnUnit>();
    for (const col of columns) map.set(col.index, col);
    return map;
  }, [columns]);

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-spec-border dark:bg-spec-bg">
        <table className="min-w-full border-collapse border border-slate-200 text-sm text-slate-700 dark:border-spec-border dark:text-slate-200">
          <caption className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 dark:border-spec-border dark:bg-spec-panel dark:text-slate-300">
            {displayCaption}
          </caption>
          <thead>
            <tr className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
              {displayHeaders.map((header, headerIndex) => (
                <th
                  key={`${header}-${headerIndex}`}
                  scope="col"
                  className={`border border-slate-200 bg-slate-100 px-3 py-2.5 font-mono text-sm font-semibold tabular-nums dark:border-spec-border dark:bg-slate-800 ${
                    allNumeric || headerIndex > 0 ? "text-right" : "text-left"
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={`${row[0]}-${rowIndex}`}
                className="border-b border-slate-200 transition-colors hover:bg-slate-50 dark:border-spec-border dark:hover:bg-slate-800/40"
              >
                {row.map((cell, cellIndex) => {
                  const bold = boldColumns?.includes(cellIndex);
                  const rightAlign = allNumeric || cellIndex > 0;
                  const meta = columnByIndex.get(cellIndex);
                  const display = meta
                    ? convertSeoTableCell(
                        cell,
                        meta.quantity,
                        units,
                        meta.digits,
                      )
                    : cell;
                  return (
                    <td
                      key={`${rowIndex}-${cellIndex}`}
                      className={`border border-slate-200 px-3 py-2 font-mono text-sm tabular-nums dark:border-spec-border ${
                        bold
                          ? "font-bold text-slate-900 dark:text-slate-50"
                          : "font-normal text-slate-700 dark:text-slate-200"
                      } ${rightAlign ? "text-right" : "text-left"}`}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {displayFootnote ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {displayFootnote}
        </p>
      ) : null}
    </>
  );
}
