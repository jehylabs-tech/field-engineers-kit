import type { ReactNode } from "react";

import { formatCodeStandard } from "@/lib/calculators/format-standard";

type PageTitleRowProps = {
  title: string;
  subtitle?: string;
  standard?: string;
  actions?: ReactNode;
};

export default function PageTitleRow({
  title,
  subtitle,
  standard,
  actions,
}: PageTitleRowProps) {
  const standardLabel = formatCodeStandard(standard);
  return (
    <div className="-mx-6 flex items-center justify-between gap-2 border-b border-spec-border bg-spec-bg px-6 py-2.5">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
        <h1 className="text-xl font-semibold tracking-tight text-spec-text md:text-2xl">
          {title}
        </h1>
        {subtitle ? (
          <span className="truncate text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </span>
        ) : null}
        {standardLabel ? (
          <span className="rounded border border-spec-border bg-spec-panel px-2 py-0.5 font-mono text-sm text-spec-text2">
            {standardLabel}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1">{actions}</div>
    </div>
  );
}
