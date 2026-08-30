"use client";

import type { CSSProperties } from "react";

export type ThicknessGaugeBarProps = {
  tMin: number;
  tActual: number;
  unit: string;
  caption?: string;
};

function formatThickness(value: number, unit: string): string {
  return `${value.toFixed(2)} ${unit}`;
}

/**
 * ASME B31.3 wall-thickness gauge.
 * Scale: 0 → t_actual. Single solid fill on slate track; t_min pin only.
 */
export default function ThicknessGaugeBar({
  tMin,
  tActual,
  unit,
  caption,
}: ThicknessGaugeBarProps) {
  const isPass = tActual >= tMin;
  const markerPosition =
    tActual > 0 ? Math.min(100, Math.max(0, (tMin / tActual) * 100)) : 0;

  const tMinText = formatThickness(tMin, unit);
  const tActualText = formatThickness(tActual, unit);
  const fillClass = isPass ? "bg-emerald-500" : "bg-slate-400";

  return (
    <div className="mt-5">
      <div
        className="relative pb-6 pt-10"
        style={{ "--gauge-marker": `${markerPosition}%` } as CSSProperties}
      >
        {/* t_min badge + single vertical pin */}
        <div className="pointer-events-none absolute top-0 left-[var(--gauge-marker)] z-10 flex -translate-x-1/2 flex-col items-center">
          <span className="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold leading-tight text-slate-700 shadow-sm">
            t_min: {tMinText}
          </span>
          <span
            aria-hidden="true"
            className="mt-1 block h-4 w-px bg-slate-700"
          />
        </div>

        {/* Track + solid fill (= t_actual) */}
        <div
          className="relative h-3.5 overflow-hidden rounded-full bg-slate-200"
          role="img"
          aria-label={`t_min ${tMinText}, t_actual ${tActualText}, ${isPass ? "pass" : "fail"}`}
        >
          <div className={`h-full w-full rounded-full ${fillClass}`} />
        </div>

        {/* t_actual label — text only, no extra vertical line */}
        <p className="pointer-events-none absolute right-0 bottom-0 m-0 font-mono text-[10px] font-semibold text-slate-600">
          t_actual: {tActualText}
        </p>
      </div>

      {caption ? (
        <p
          className={`m-0 text-xs leading-relaxed md:text-sm ${
            isPass
              ? "font-medium text-emerald-600"
              : "font-medium text-slate-600"
          }`}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}
