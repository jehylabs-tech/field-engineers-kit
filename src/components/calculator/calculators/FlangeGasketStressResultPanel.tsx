"use client";

import type { CalculatorOutput, ResultRow } from "@/lib/calculators/definitions";
import ExportButtons from "@/components/calculator/ExportButtons";
import { RESULT_HERO_ID } from "@/components/calculator/SummaryBar";

type FlangeGasketStressResultPanelProps = {
  output: CalculatorOutput;
  exportTitle: string;
  standard?: string;
  inputRows: { label: string; value: string }[];
};

function SectionTable({ title, rows }: { title: string; rows: ResultRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="min-w-0">
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </h3>
      <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-spec-border">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${title}-${row.label}`}
                className={`border-b border-slate-200 last:border-b-0 dark:border-spec-border ${
                  row.highlight
                    ? "bg-blue-50/70 dark:bg-blue-950/30"
                    : row.emphasis
                      ? "bg-slate-50/80 dark:bg-spec-panel/40"
                      : ""
                }`}
              >
                <th className="w-[48%] px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 dark:text-slate-400">
                  {row.label}
                </th>
                <td className="px-2.5 py-1.5 text-right font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function groupRows(rows: ResultRow[]): Map<string, ResultRow[]> {
  const map = new Map<string, ResultRow[]>();
  for (const row of rows) {
    const key = row.section ?? "Details";
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return map;
}

export default function FlangeGasketStressResultPanel({
  output,
  exportTitle,
  standard,
  inputRows,
}: FlangeGasketStressResultPanelProps) {
  const sections = groupRows(output.rows);
  const statusTone =
    output.heroStatusLevel === "fail"
      ? "border-red-300 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/30"
      : output.heroStatusLevel === "warn"
        ? "border-amber-300 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20"
        : "border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-white to-slate-50 dark:border-blue-900/50 dark:from-slate-900/80 dark:via-slate-900/50 dark:to-blue-950/20";

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col space-y-3.5">
      <div
        id={RESULT_HERO_ID}
        className={`scroll-mt-20 rounded-xl border p-3.5 shadow-xs ${statusTone}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2 dark:border-spec-border/60">
          <span className="text-xs font-bold tracking-wider text-slate-700 dark:text-slate-200">
            {output.heroLabel}
          </span>
          <span className="rounded px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-800 dark:bg-spec-panel dark:text-slate-200">
            {output.heroStatus}
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-3">
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
            {output.heroValue}
          </div>
          {output.heroBadges && output.heroBadges.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              {output.heroBadges.map((badge) => (
                <span
                  key={badge.label}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-spec-border dark:bg-spec-bg dark:text-slate-200"
                >
                  {badge.label}: {badge.value}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {output.summary.length > 0 ? (
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {output.summary.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-1.5 dark:border-spec-border dark:bg-spec-bg/60"
              >
                <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {item.label}
                </dt>
                <dd className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {Array.from(sections.entries()).map(([title, rows]) => (
        <SectionTable key={title} title={title} rows={rows} />
      ))}

      {output.callouts?.map((callout) => (
        <div
          key={callout.title}
          className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${
            callout.tone === "warn"
              ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
              : "border-slate-200 bg-slate-50 text-slate-700 dark:border-spec-border dark:bg-spec-panel dark:text-slate-300"
          }`}
        >
          <p className="font-bold">{callout.title}</p>
          <p className="mt-0.5">{callout.body}</p>
        </div>
      ))}

      {output.exportRows.length > 0 ? (
        <ExportButtons
          title={exportTitle}
          standard={standard}
          inputRows={inputRows}
          resultRows={output.exportRows}
        />
      ) : null}
    </div>
  );
}
