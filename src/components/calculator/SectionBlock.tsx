"use client";

import type { ReactNode } from "react";
import { useWorkstationLayout } from "@/components/calculator/CalculatorMetaContext";

type SectionBlockProps = {
  number: number;
  title: string;
  children: ReactNode;
  /** When false, children stack full-width. Default follows layout pattern. */
  twoColumn?: boolean;
  /** Tighter vertical spacing between fields. */
  compact?: boolean;
  /** Extra controls beside the section title (e.g. info popover trigger). */
  headerExtra?: ReactNode;
};

export default function SectionBlock({
  number,
  title,
  children,
  twoColumn,
  compact = false,
  headerExtra,
}: SectionBlockProps) {
  const layout = useWorkstationLayout();
  const useTwoCol =
    twoColumn ?? layout === "formula";
  const subcard = title === "Reference Data";
  const tight = compact || subcard;
  const stackGap = tight ? "space-y-2.5" : "space-y-3";
  const gridGap = tight ? "gap-2.5" : "gap-3";

  return (
    <section
      className={
        subcard
          ? "mb-0 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-spec-border dark:bg-spec-bg"
          : "mb-0 w-full min-w-0"
      }
    >
      <div className={`${tight ? "mb-1.5" : "mb-2"} flex items-center gap-1.5`}>
        <span className="flex h-5 w-5 items-center justify-center rounded border border-spec-border bg-spec-panel text-sm font-semibold text-slate-500">
          {number}
        </span>
        <h3
          className={
            subcard
              ? "min-w-0 flex-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
              : "min-w-0 flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300"
          }
        >
          {title}
        </h3>
        {headerExtra}
      </div>
      <div
        className={
          useTwoCol
            ? `grid w-full min-w-0 grid-cols-1 ${gridGap} sm:grid-cols-2 [&>.field-span-2]:col-span-full`
            : `flex w-full min-w-0 flex-col ${stackGap}`
        }
      >
        {children}
      </div>
    </section>
  );
}
