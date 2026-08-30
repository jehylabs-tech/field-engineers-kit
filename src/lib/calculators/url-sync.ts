"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCarryOver } from "@/components/calculator/CarryOverContext";
import { useSpecSeed } from "@/components/calculator/SpecSeedContext";
import { useToast } from "@/components/ui/ToastProvider";
import type { CalculatorType } from "@/lib/calculators/definitions";
import {
  applyPlantContext,
  extractPlantContext,
  parsePlantContextFromSearchParams,
  writePlantContextToSearchParams,
} from "@/lib/plant-context";

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
    for (const key of Object.keys(config) as Array<keyof T>) {
      const { param, deserialize } = config[key];
      next[key] = deserialize(source.get(param), defaultsRef.current[key]);
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

  // Prefer global unit toggle (GNB / SpecHeader) → live unitSystem + labels/results.
  useEffect(() => {
    function onUnits(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (detail !== "metric" && detail !== "imperial") return;
      if (!("unitSystem" in defaultsRef.current)) return;
      setInputs((current) => {
        if ((current as { unitSystem?: string }).unitSystem === detail) {
          return current;
        }
        return { ...current, unitSystem: detail } as T;
      });
    }
    window.addEventListener("fek-units-change", onUnits);
    return () => window.removeEventListener("fek-units-change", onUnits);
  }, []);

  // When SpecHeader rewrites ?units= after hydration, re-read unitSystem from URL.
  useEffect(() => {
    if (!hasHydratedFromUrl.current) return;
    if (!("unitSystem" in defaultsRef.current)) return;
    const fromUrl = searchParams.get("units");
    if (fromUrl !== "metric" && fromUrl !== "imperial") return;
    setInputs((current) => {
      if ((current as { unitSystem?: string }).unitSystem === fromUrl) {
        return current;
      }
      return { ...current, unitSystem: fromUrl } as T;
    });
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
      // Do not overwrite a unit-suffixed plant pressure/temperature with a bare number.
      const existing = params.get(param);
      if (existing && /[a-z]/i.test(existing) && /^-?\d+(?:\.\d+)?$/.test(serialized)) {
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
