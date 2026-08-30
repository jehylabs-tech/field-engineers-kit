"use client";

import { useEffect, useMemo, useState } from "react";
import type { UnitSystem } from "@/lib/calculators/definitions";
import {
  readPreferredUnitSystem,
} from "@/lib/units/preferred-system";

const NM_TO_FT_LB = 0.737562;

type SeoLookupTableProps = {
  caption: string;
  headers: string[];
  rows: string[][];
  footnote?: string;
  allNumeric?: boolean;
  /** Column indexes storing assembly torque in N·m (switch to ft-lb with navbar units). */
  torqueNmColumns?: number[];
  /** Column indexes to emphasize with bold weight. */
  boldColumns?: number[];
};

function useNavbarUnitSystem(): UnitSystem {
  const [units, setUnits] = useState<UnitSystem>("metric");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("units");
    if (fromUrl === "imperial" || fromUrl === "metric") {
      setUnits(fromUrl);
    } else {
      setUnits(readPreferredUnitSystem());
    }
    function onUnits(event: Event) {
      const detail = (event as CustomEvent<UnitSystem>).detail;
      if (detail === "metric" || detail === "imperial") setUnits(detail);
    }
    window.addEventListener("fek-units-change", onUnits);
    return () => window.removeEventListener("fek-units-change", onUnits);
  }, []);

  return units;
}

function headerForUnits(header: string, units: UnitSystem): string {
  if (units === "imperial") {
    return header.replace(/\(N·m\)/g, "(ft-lb)");
  }
  return header;
}

function cellForUnits(
  value: string,
  columnIndex: number,
  torqueNmColumns: number[] | undefined,
  units: UnitSystem,
): string {
  if (!torqueNmColumns?.includes(columnIndex) || units !== "imperial") {
    return value;
  }
  const nm = Number(value);
  if (!Number.isFinite(nm)) return value;
  return String(Math.round(nm * NM_TO_FT_LB));
}

export default function SeoLookupTable({
  caption,
  headers,
  rows,
  footnote,
  allNumeric = false,
  torqueNmColumns,
  boldColumns,
}: SeoLookupTableProps) {
  const units = useNavbarUnitSystem();

  const displayHeaders = useMemo(
    () => headers.map((header) => headerForUnits(header, units)),
    [headers, units],
  );

  const displayCaption = useMemo(() => {
    if (!torqueNmColumns?.length || units !== "imperial") return caption;
    return caption.replace(/\(N·m\)/g, "(ft-lb)");
  }, [caption, torqueNmColumns, units]);

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
                  key={header}
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
                  return (
                    <td
                      key={`${rowIndex}-${cellIndex}`}
                      className={`border border-slate-200 px-3 py-2 font-mono text-sm tabular-nums dark:border-spec-border ${
                        bold
                          ? "font-bold text-slate-900 dark:text-slate-50"
                          : "font-normal text-slate-700 dark:text-slate-200"
                      } ${rightAlign ? "text-right" : "text-left"}`}
                    >
                      {cellForUnits(cell, cellIndex, torqueNmColumns, units)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footnote ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {footnote}
        </p>
      ) : null}
    </>
  );
}
