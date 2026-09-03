"use client";

import { useEffect, useState } from "react";
import type { StatusLevel, SummaryItem } from "@/lib/calculators/definitions";

type SummaryBarProps = {
  items: SummaryItem[];
  status: { label: string; level: StatusLevel };
  /** Element id of the main result hero — bar shows only when this leaves the viewport. */
  observeTargetId?: string;
};

const statusStyles: Record<StatusLevel, { wrap: string; dot: string }> = {
  pass: {
    wrap: "bg-spec-successBg text-spec-success",
    dot: "bg-spec-success",
  },
  fail: {
    wrap: "bg-spec-dangerBg text-spec-danger",
    dot: "bg-spec-danger",
  },
  warn: {
    wrap: "bg-spec-sponBg text-spec-sponText",
    dot: "bg-spec-sponText",
  },
  neutral: {
    wrap: "bg-spec-panel text-spec-text2",
    dot: "bg-spec-text3",
  },
};

const RESULT_HERO_ID = "calc-result-hero";

export default function SummaryBar({
  items,
  status,
  observeTargetId = RESULT_HERO_ID,
}: SummaryBarProps) {
  const styles = statusStyles[status.level];
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const target = document.getElementById(observeTargetId);
    if (!target || typeof IntersectionObserver === "undefined") {
      setPinned(false);
      return;
    }

    const header = document.querySelector("header");
    const headerHeight = header?.getBoundingClientRect().height ?? 56;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Hide while the main result card is on screen; pin when it scrolls away.
        setPinned(!entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: `-${headerHeight}px 0px 0px 0px`,
        threshold: 0,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [observeTargetId, items, status.label]);

  return (
    <div
      aria-hidden={!pinned}
      className={`sticky top-12 z-40 w-full md:top-14 ${
        pinned
          ? "border-b border-slate-200 bg-white/95 shadow-md backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95"
          : "pointer-events-none invisible max-h-0 overflow-hidden border-b-0 bg-transparent shadow-none"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 md:gap-x-8 md:px-6 md:py-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 flex-col justify-center self-center max-md:max-w-[46%]"
          >
            <div className="mb-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-spec-text3 md:text-[11px]">
              {item.label}
            </div>
            <div className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-spec-text md:text-[15px]">
              {item.value}
            </div>
          </div>
        ))}
        <div className="ml-auto flex min-h-[2.25rem] min-w-0 max-w-full items-center self-center">
          <div
            className={`hidden max-w-[12rem] truncate rounded-md border border-transparent px-2.5 py-1 text-xs font-medium sm:inline-flex sm:items-center sm:gap-1.5 md:max-w-none md:text-sm ${styles.wrap}`}
            title={status.label}
          >
            <span className={`h-1.5 w-1.5 shrink-0 self-center rounded-full ${styles.dot}`} />
            <span className="truncate leading-none">{status.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { RESULT_HERO_ID };
