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
import { syncCompanionUnits } from "@/lib/unitConverter";
import { readPreferredUnitSystem } from "@/lib/units/preferred-system";

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
  // Always start from defaults so SSR and the first client paint match.
  // Preferred units / URL are applied in useEffect after hydration (see below).
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

    // Prefer explicit ?units=, else localStorage preference.
    // Defaults are stored in the default unitSystem (usually metric). When the
    // preferred system differs, convert fields that still hold default values.
    // Fields present in the URL are already in the preferred system.
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
        (next as { unitSystem: UnitSystem }).unitSystem = preferred;
      } else if (preferred) {
        (next as { unitSystem: UnitSystem }).unitSystem = preferred;
      }
    }

    if (!options?.type) return next;

    const plant = parsePlantContextFromSearchParams(source);
    return applyPlantContext(options.type, next, plant);
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

  // Global navbar / SpecHeader unit toggle → convert inputs + labels together.
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

  // When SpecHeader rewrites ?units= after hydration, sync companion fields too.
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
