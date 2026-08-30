import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  WORKSTATION_DOMAINS,
  WORKSTATION_SHORTCUTS,
} from "@/lib/home/workstation";
import type { UnitSystem } from "@/lib/calculators/definitions";
import {
  readPreferredUnitSystem,
  withPreferredUnits,
} from "@/lib/units/preferred-system";

function collectAllHrefs(units: UnitSystem): string[] {
  const seen = new Set<string>();
  const hrefs: string[] = [];

  function add(raw: string) {
    const href = withPreferredUnits(raw, units);
    if (seen.has(href)) return;
    seen.add(href);
    hrefs.push(href);
  }

  for (const shortcut of WORKSTATION_SHORTCUTS) add(shortcut.href);
  for (const domain of WORKSTATION_DOMAINS) {
    for (const tool of domain.tools) add(tool.href);
  }
  return hrefs;
}

function collectPriorityHrefs(units: UnitSystem): string[] {
  return WORKSTATION_SHORTCUTS.map((s) => withPreferredUnits(s.href, units));
}

function staggerPrefetch(
  router: AppRouterInstance,
  hrefs: string[],
  staggerMs: number,
) {
  let index = 0;
  function next() {
    if (index >= hrefs.length) return;
    router.prefetch(hrefs[index]!);
    index += 1;
    if (index < hrefs.length) {
      window.setTimeout(next, staggerMs);
    }
  }
  next();
}

/**
 * Warm calculator routes for instant client navigation.
 * Development (Turbopack): shortcuts only — full-catalog prefetch causes
 * ReadableStream / Application errors when compiles overlap navigations.
 * Production: shortcuts then the rest.
 */
export function prefetchCalculators(router: AppRouterInstance) {
  const isDev = process.env.NODE_ENV === "development";
  const units = readPreferredUnitSystem();
  const priority = collectPriorityHrefs(units);

  if (isDev) {
    const start = () => staggerPrefetch(router, priority, 400);
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(start, { timeout: 1200 });
    } else {
      window.setTimeout(start, 400);
    }
    return;
  }

  for (const href of priority) {
    router.prefetch(href);
  }

  const rest = collectAllHrefs(units).filter((href) => !priority.includes(href));
  const startRest = () => staggerPrefetch(router, rest, 40);
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(startRest, { timeout: 800 });
  } else {
    window.setTimeout(startRest, 0);
  }
}

const prefetched = new Set<string>();

export function prefetchCalculatorHref(
  router: AppRouterInstance,
  href: string | null | undefined,
) {
  if (!href || typeof href !== "string") return;
  if (!href.startsWith("/calculator")) return;
  const path = href.split("?")[0] ?? href;
  if (prefetched.has(path)) return;
  prefetched.add(path);
  router.prefetch(href);
}
