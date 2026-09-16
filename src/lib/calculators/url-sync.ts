"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCarryOver } from "@/components/calculator/CarryOverContext";
import { useSpecSeed } from "@/components/calculator/SpecSeedContext";
import { useToast } from "@/components/ui/ToastProvider";
import type { CalculatorType, UnitSystem } from "@/lib/calculators/definitions";
import {
  applyPlantContext,
  extractPlantContext,
  parsePlantContextFromSearchParams,
  writePlantContextToSearchParams,
} from "@/lib/plant-context";
import {
  buildSpecPath,
  findSpecRouteForInputs,
} from "@/lib/calculators/spec-routes";
import { syncCompanionUnits } from "@/lib/unitConverter";
import { readPreferredUnitSystem } from "@/lib/units/preferred-system";
import {
  omitPathOwnedSearchParams,
  searchParamsHavePathOwnedKeys,
} from "@/lib/calculators/url-sync-path-owned";

type ParamConfig<T> = {
  [K in keyof T]: {
    param: string;
    serialize: (value: T[K]) => string;
    deserialize: (value: string | null, fallback: T[K]) => T[K];
  };
};

export type { ParamConfig };

type UrlSyncOptions = {
  type: CalculatorType;
};

function applyUnitSystemChange<T extends Record<string, unknown>>(
  current: T,
  nextSystem: UnitSystem,
): T {
  if (!("unitSystem" in current)) return current;
  const prev = (current as { unitSystem?: UnitSystem }).unitSystem;
  if (prev === nextSystem) return current;
  return syncCompanionUnits(current, nextSystem);
}

/** `/calculator/:slug` or `/calculator/:slug/:spec` (also legacy `/calculation/...`). */
function parseCalculatorPath(pathname: string): {
  base: "calculator" | "calculation" | null;
  slug: string | null;
  spec: string | null;
} {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    return { base: null, slug: null, spec: null };
  }
  if (parts[0] !== "calculator" && parts[0] !== "calculation") {
    return { base: null, slug: null, spec: null };
  }
  return {
    base: parts[0] as "calculator" | "calculation",
    slug: parts[1] ?? null,
    spec: parts[2] ?? null,
  };
}

function partialQueryFromInputs<T extends Record<string, unknown>>(
  inputs: T,
  config: ParamConfig<T>,
): Record<string, string> {
  const partial: Record<string, string> = {};
  for (const key of Object.keys(config) as Array<keyof T>) {
    const { param, serialize } = config[key];
    const serialized = serialize(inputs[key]);
    if (serialized !== "" && serialized != null) {
      partial[param] = serialized;
    }
  }
  // Normalize schedule aliases for SpecRoute matching.
  if (partial.schedule && !partial.sch) {
    partial.sch = partial.schedule.replace(/^Sch\s+/i, "");
  }
  if (partial.category && !partial.cat) {
    partial.cat = partial.category;
  }
  return partial;
}

export function useCalculatorUrlSync<T extends Record<string, unknown>>(
  defaults: T,
  config: ParamConfig<T>,
  options?: UrlSyncOptions,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultsRef = useRef(defaults);
  const { showToast } = useToast();
  const carryOver = useCarryOver();
  const [inputs, setInputs] = useState<T>(defaults);
  const hasHydratedFromUrl = useRef(false);

  const specSeed = useSpecSeed();

  const mergedSearch = useCallback(() => {
    const merged = new URLSearchParams(searchParams.toString());
    if (specSeed) {
      for (const [key, value] of Object.entries(specSeed)) {
        if (value && !merged.get(key)) {
          merged.set(key, value);
        }
      }
    }
    return merged;
  }, [searchParams, specSeed]);

  const readFromUrl = useCallback((): T => {
    const source = mergedSearch();
    const next = { ...defaultsRef.current };
    const explicitParams = new Set<string>();

    for (const key of Object.keys(config) as Array<keyof T>) {
      const { param, deserialize } = config[key];
      const raw = source.get(param);
      if (raw != null && raw !== "") {
        explicitParams.add(String(key));
      }
      next[key] = deserialize(raw, defaultsRef.current[key]);
    }

    if ("unitSystem" in next) {
      const fromUrl = source.get("units");
      const preferred =
        fromUrl === "metric" || fromUrl === "imperial"
          ? fromUrl
          : readPreferredUnitSystem();
      const defaultSystem =
        (defaultsRef.current as { unitSystem?: UnitSystem }).unitSystem ??
        "metric";

      if (preferred && preferred !== defaultSystem) {
        const converted = syncCompanionUnits(
          { ...defaultsRef.current },
          preferred,
        ) as T;
        for (const key of Object.keys(config) as Array<keyof T>) {
          if (key === "unitSystem") continue;
          if (!explicitParams.has(String(key))) {
            next[key] = converted[key];
          }
        }
        (next as unknown as { unitSystem: UnitSystem }).unitSystem = preferred;
      } else if (preferred) {
        (next as unknown as { unitSystem: UnitSystem }).unitSystem = preferred;
      }
    }

    if (!options?.type) return next;

    const beforePlant = { ...next };
    const plant = parsePlantContextFromSearchParams(source);
    const applied = applyPlantContext(options.type, next, plant);
    // SpecRoute / explicit query keys win over soft plant-context carry-over
    // (e.g. ?size=12in must not overwrite hnps=4 from /4-on-6-… path seed).
    for (const key of Array.from(explicitParams)) {
      (applied as Record<string, unknown>)[key] = (
        beforePlant as Record<string, unknown>
      )[key];
    }
    return applied;
  }, [config, mergedSearch, options?.type]);

  useEffect(() => {
    if (hasHydratedFromUrl.current) return;

    setInputs(readFromUrl());
    hasHydratedFromUrl.current = true;

    if (searchParams.get("carried") === "1") {
      carryOver?.triggerCarryOver();
      showToast("Values carried over from the previous calculator");
    }
  }, [carryOver, readFromUrl, searchParams, showToast]);

  useEffect(() => {
    function onUnits(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (detail !== "metric" && detail !== "imperial") return;
      if (!("unitSystem" in defaultsRef.current)) return;
      setInputs((current) => applyUnitSystemChange(current, detail));
    }
    window.addEventListener("fek-units-change", onUnits);
    return () => window.removeEventListener("fek-units-change", onUnits);
  }, []);

  useEffect(() => {
    if (!hasHydratedFromUrl.current) return;
    if (!("unitSystem" in defaultsRef.current)) return;
    const fromUrl = searchParams.get("units");
    if (fromUrl !== "metric" && fromUrl !== "imperial") return;
    setInputs((current) => applyUnitSystemChange(current, fromUrl));
  }, [searchParams]);

  useEffect(() => {
    if (!hasHydratedFromUrl.current) return;

    const params = new URLSearchParams();

    if (options?.type) {
      const previous = parsePlantContextFromSearchParams(searchParams);
      const extracted = extractPlantContext(
        options.type,
        inputs as Record<string, unknown>,
      );
      writePlantContextToSearchParams(params, { ...previous, ...extracted });
    }

    for (const key of Object.keys(config) as Array<keyof T>) {
      const { param, serialize } = config[key];
      const serialized = serialize(inputs[key]);
      const existing = params.get(param);
      if (
        existing &&
        /[a-z]/i.test(existing) &&
        /^-?\d+(?:\.\d+)?$/.test(serialized)
      ) {
        continue;
      }
      params.set(param, serialized);
    }

    const pathInfo = parseCalculatorPath(pathname);
    const partial = partialQueryFromInputs(inputs, config);
    const matched =
      pathInfo.slug != null
        ? findSpecRouteForInputs(pathInfo.slug, partial)
        : undefined;

    // Matched SpecRoute → always prefer clean path; never re-emit path-owned
    // keys (nps/class/size/gasketType/…) into ?query. Aux state (units,
    // pressure, targetBoltStress, …) stays in the query string.
    if (pathInfo.base === "calculator" && pathInfo.slug && matched) {
      const nextPath = buildSpecPath(pathInfo.slug, matched.spec);
      const keep = omitPathOwnedSearchParams(params);
      keep.delete("carried");
      const qs = keep.toString();
      const nextUrl = qs ? `${nextPath}?${qs}` : nextPath;

      const currentAux = omitPathOwnedSearchParams(
        new URLSearchParams(searchParams.toString()),
      );
      currentAux.delete("carried");
      const pathChanged = pathname !== nextPath;
      const dirtyPathOwned = searchParamsHavePathOwnedKeys(searchParams);
      const auxChanged = currentAux.toString() !== keep.toString();

      if (pathChanged || dirtyPathOwned || auxChanged) {
        router.replace(nextUrl, { scroll: false });
      }
      return;
    }

    // Stale SpecRoute path (inputs no longer match any listed combo) —
    // drop to the calculator root and keep state in the query string so the
    // URL never advertises a different joint than the live inputs.
    if (
      pathInfo.base === "calculator" &&
      pathInfo.slug &&
      pathInfo.spec &&
      !matched
    ) {
      const nextPath = `/calculator/${pathInfo.slug}`;
      const qs = params.toString();
      router.replace(qs ? `${nextPath}?${qs}` : nextPath, { scroll: false });
      return;
    }

    const nextQuery = params.toString();
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete("carried");
    const currentQuery = currentParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [config, inputs, options?.type, pathname, router, searchParams]);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setInputs((current) => {
      if (current[key] === value) return current;
      return { ...current, [key]: value };
    });
  }, []);

  return { inputs, setInputs, setField };
}

export const urlSyncHelpers = {
  number: {
    serialize: (value: number) => String(value),
    deserialize: (value: string | null, fallback: number) => {
      if (!value || /[a-z]/i.test(value)) return fallback;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    },
  },
  string: {
    serialize: (value: string) => value,
    deserialize: (value: string | null, fallback: string) => value ?? fallback,
  },
};
