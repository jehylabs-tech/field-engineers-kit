import type { UnitSystem } from "@/lib/calculators/definitions";

export const PREFERRED_UNIT_KEY = "fek-units";

export function readPreferredUnitSystem(): UnitSystem {
  if (typeof window === "undefined") return "metric";
  try {
    const stored = window.localStorage.getItem(PREFERRED_UNIT_KEY);
    if (stored === "imperial" || stored === "metric") return stored;
  } catch {
    /* ignore */
  }
  return "metric";
}

export function writePreferredUnitSystem(system: UnitSystem) {
  try {
    window.localStorage.setItem(PREFERRED_UNIT_KEY, system);
  } catch {
    /* ignore */
  }
}

/** Append or replace preferred units on a calculator href. */
export function withPreferredUnits(
  href: string,
  system: UnitSystem,
  options?: { force?: boolean },
): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  if (options?.force || !params.has("units")) {
    params.set("units", system);
  }
  const next = params.toString();
  return next ? `${path}?${next}` : path;
}
