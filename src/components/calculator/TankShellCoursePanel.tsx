"use client";

import type { Api650CourseResult } from "@/lib/calculators/engines/api650-tank-shell-thickness";
import { mmToIn } from "@/lib/unitConverter";
import {
  ceilToCommercialPlateIn,
  ceilToCommercialPlateMm,
} from "@/lib/calculators/data/commercialPlateSizes";

type Props = {
  courses: Api650CourseResult[];
  imperial: boolean;
};

function fmtT(mm: number, imperial: boolean): string {
  if (imperial) return mmToIn(mm).toFixed(3);
  return mm.toFixed(2);
}

function fmtNom(tRequiredMm: number, imperial: boolean): string {
  if (imperial) return ceilToCommercialPlateIn(mmToIn(tRequiredMm)).toFixed(3);
  return String(ceilToCommercialPlateMm(tRequiredMm));
}

/** Course thickness step chart + MTO table (afterHero). */
export default function TankShellCoursePanel({ courses, imperial }: Props) {
  if (courses.length === 0) return null;
  const unit = imperial ? "in" : "mm";
  const maxT = Math.max(...courses.map((c) => c.tNomMm), 1);
  const chartH = 120;
  const barW = Math.min(36, Math.floor(360 / courses.length) - 4);

  return (
    <div className="mt-2 space-y-2 border-t border-spec-border pt-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-spec-text3">
        Course thickness step · MTO
      </p>
      <div className="overflow-hidden rounded-md border border-dashed border-spec-border bg-spec-bg p-2">
        <svg
          viewBox={`0 0 400 ${chartH + 28}`}
          className="mx-auto h-auto w-full max-w-full"
          role="img"
          aria-label={`API 650 shell course thickness step chart for ${courses.length} courses in ${unit} per API 650 1-foot method`}
        >
          <title>{`Course t_nom step chart (${unit})`}</title>
          {courses.map((c, i) => {
            const h = (c.tNomMm / maxT) * chartH;
            const x = 40 + i * (barW + 8);
            const y = chartH - h + 8;
            return (
              <g key={c.course}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  className={
                    c.course === 1
                      ? "fill-sky-600 dark:fill-sky-400"
                      : "fill-slate-400 dark:fill-slate-500"
                  }
                  rx={2}
                />
                <text
                  x={x + barW / 2}
                  y={chartH + 22}
                  textAnchor="middle"
                  className="fill-slate-600 dark:fill-slate-300"
                  style={{ fontSize: 9 }}
                >
                  {`C${c.course}`}
                </text>
                <text
                  x={x + barW / 2}
                  y={y - 3}
                  textAnchor="middle"
                  className="fill-slate-700 dark:fill-slate-200"
                  style={{ fontSize: 8 }}
                >
                  {fmtNom(c.tRequiredMm, imperial)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="overflow-x-auto rounded-md border border-spec-border">
        <table className="w-full min-w-[420px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-spec-border bg-slate-50 dark:bg-slate-900/60">
              <th className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-300">
                Course
              </th>
              <th className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-300">
                H ({imperial ? "ft" : "m"})
              </th>
              <th className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-300">
                t_d ({unit})
              </th>
              <th className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-300">
                t_t ({unit})
              </th>
              <th className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-300">
                t_nom ({unit})
              </th>
              <th className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-300">
                Mass
              </th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr
                key={c.course}
                className="border-b border-spec-border/70 last:border-0"
              >
                <td className="px-2 py-1 font-medium text-slate-800 dark:text-slate-100">
                  {c.course}
                </td>
                <td className="px-2 py-1 text-slate-700 dark:text-slate-200">
                  {imperial ? (c.hM / 0.3048).toFixed(1) : c.hM.toFixed(1)}
                </td>
                <td className="px-2 py-1 text-slate-700 dark:text-slate-200">
                  {fmtT(c.tdMm, imperial)}
                </td>
                <td className="px-2 py-1 text-slate-700 dark:text-slate-200">
                  {fmtT(c.ttMm, imperial)}
                </td>
                <td className="px-2 py-1 font-semibold text-sky-800 dark:text-sky-300">
                  {fmtNom(c.tRequiredMm, imperial)}
                </td>
                <td className="px-2 py-1 text-slate-700 dark:text-slate-200">
                  {imperial
                    ? `${Math.round(c.massKg * 2.20462262).toLocaleString("en-US")} lb`
                    : `${(c.massKg / 1000).toFixed(2)} t`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
