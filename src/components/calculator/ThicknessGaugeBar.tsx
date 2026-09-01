"use client";

import type { CSSProperties } from "react";

export type ThicknessGaugeBarProps = {
  tMin: number;
  tActual: number;
  unit: string;
  caption?: string;
  captionInfo?: string;
  markerLabel?: string;
};

function formatThickness(value: number, unit: string): string {
  return `${value.toFixed(2)} ${unit}`;
}

/**
 * ASME B31.3 wall-thickness gauge.
 * Scale: 0 → t_actual. Pin marks required nominal (t_nom_req) or t_m threshold.
 */
export default function ThicknessGaugeBar({
  tMin,
  tActual,
  unit,
  caption,
  captionInfo,
  markerLabel = "t_min",
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
        <div className="pointer-events-none absolute top-0 left-[var(--gauge-marker)] z-10 flex -translate-x-1/2 flex-col items-center">
          <span className="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold leading-tight text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {markerLabel}: {tMinText}
          </span>
          <span
            aria-hidden="true"
            className="mt-1 block h-4 w-px bg-slate-700 dark:bg-slate-400"
          />
        </div>

        <div
          className="relative h-3.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="img"
          aria-label={`${markerLabel} ${tMinText}, t_actual ${tActualText}, ${isPass ? "pass" : "fail"}`}
        >
          <div className={`h-full w-full rounded-full ${fillClass}`} />
        </div>

        <p className="pointer-events-none absolute right-0 bottom-0 m-0 font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-400">
          t_actual: {tActualText}
        </p>
      </div>

      {caption ? (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <p
            className={`m-0 text-xs leading-relaxed md:text-sm ${
              isPass
                ? "font-medium text-emerald-600 dark:text-emerald-400"
                : "font-medium text-slate-600 dark:text-slate-300"
            }`}
          >
            {caption}
          </p>
          {captionInfo ? (
            <span
              className="inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold leading-none text-slate-500 dark:border-slate-600 dark:text-slate-400"
              title={captionInfo}
              aria-label={captionInfo}
            >
              i
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
