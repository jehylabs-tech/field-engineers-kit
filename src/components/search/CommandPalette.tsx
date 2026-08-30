"use client";

import { useRouter } from "next/navigation";
import { navigateToHref } from "@/lib/navigation/navigate";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "@/components/search/SearchProvider";
import { getCategoryById } from "@/lib/menu/config";
import { WORKSTATION_DOMAINS } from "@/lib/home/workstation";
import {
  readPreferredUnitSystem,
  withPreferredUnits,
} from "@/lib/units/preferred-system";
import { trackCalculatorRequested } from "@/lib/analytics/events";
import { useZeroResultSearchTracking } from "@/hooks/useZeroResultSearchTracking";

const KEYWORD_BY_SLUG = (() => {
  const map = new Map<string, string>();
  for (const domain of WORKSTATION_DOMAINS) {
    for (const tool of domain.tools) {
      const slug = tool.href.split("?")[0]?.split("/").pop();
      if (!slug) continue;
      const existing = map.get(slug) ?? "";
      map.set(
        slug,
        `${existing} ${tool.keywords.join(" ")} ${tool.standard} ${tool.seoLabel}`,
      );
    }
  }
  return map;
})();

export default function CommandPalette() {
  const router = useRouter();
  const { calculators, isOpen, close } = useSearch();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return calculators;

    return calculators.filter((calculator) => {
      const category = getCategoryById(calculator.category)?.label ?? "";
      const haystack = [
        calculator.title,
        calculator.slug,
        calculator.category,
        category,
        calculator.meta_description ?? "",
        KEYWORD_BY_SLUG.get(calculator.slug) ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return normalized.split(/\s+/).every((term) => haystack.includes(term));
    });
  }, [calculators, query]);

  const trimmedQuery = query.trim();
  const noResults = trimmedQuery.length > 0 && filtered.length === 0;
  useZeroResultSearchTracking(query, filtered.length, "command-palette");

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function navigateTo(slug: string) {
    close();
    const units = readPreferredUnitSystem();
    navigateToHref(router, withPreferredUnits(`/calculator/${slug}`, units));
  }

  function requestCalculator() {
    if (!trimmedQuery) return;
    trackCalculatorRequested(trimmedQuery, "command-palette");
    close();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (noResults) {
      if (event.key === "Enter") {
        event.preventDefault();
        requestCalculator();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      navigateTo(filtered[activeIndex].slug);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0"
        onClick={close}
      />
      <div className="relative z-[101] w-full max-w-xl overflow-hidden rounded-xl border border-spec-border bg-spec-bg shadow-2xl">
        <div className="border-b border-spec-border px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="NPS, ASME B16.5, B31.3, Torque, Cable…"
            className="w-full bg-transparent text-base text-spec-text outline-none placeholder:text-spec-text3 md:text-lg"
          />
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2">
          {noResults ? (
            <div className="space-y-1">
              <p className="px-3 py-3 text-center text-sm text-spec-text3 md:text-base">
                No calculators found for &quot;{trimmedQuery}&quot;
              </p>
              <button
                type="button"
                onClick={requestCalculator}
                className="flex w-full items-start justify-between rounded-lg bg-spec-accentBg px-3 py-2.5 text-left hover:brightness-95"
              >
                <div>
                  <div className="text-base font-medium text-spec-text md:text-lg">
                    Can&apos;t find &apos;{trimmedQuery}&apos;? Click to request
                    this calculator.
                  </div>
                  <div className="mt-0.5 text-sm text-spec-text3 md:text-base">
                    Sends a high-priority feature request
                  </div>
                </div>
                <span className="shrink-0 text-sm text-spec-accentText md:text-base">
                  Request ↵
                </span>
              </button>
            </div>
          ) : (
            filtered.map((calculator, index) => {
              const category = getCategoryById(calculator.category)?.label;
              const active = index === activeIndex;

              return (
                <button
                  key={calculator.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => navigateTo(calculator.slug)}
                  className={`flex w-full items-start justify-between rounded-lg px-3 py-2.5 text-left ${
                    active ? "bg-spec-accentBg" : "hover:bg-spec-panel"
                  }`}
                >
                  <div>
                    <div className="text-base font-medium text-spec-text md:text-lg">
                      {calculator.title}
                    </div>
                    <div className="mt-0.5 text-sm text-spec-text3 md:text-base">
                      {category} · {calculator.slug}
                    </div>
                  </div>
                  <span className="text-sm text-spec-accentText md:text-base">
                    Open ↵
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-spec-border px-4 py-2 text-sm text-spec-text3 md:text-base">
          ↑↓ navigate · ↵ open · esc close
        </div>
      </div>
    </div>
  );
}
