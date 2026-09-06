"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { UnitSystem } from "@/lib/calculators/definitions";
import {
  readPreferredUnitSystem,
  writePreferredUnitSystem,
} from "@/lib/units/preferred-system";
import { unitSymbol, type UnitQuantity } from "@/lib/unitConverter";

export const FEK_UNITS_CHANGE_EVENT = "fek-units-change";

type UnitContextValue = {
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
  toggleUnitSystem: () => void;
  symbol: (quantity: UnitQuantity) => string;
  isMetric: boolean;
  isImperial: boolean;
};

const UnitContext = createContext<UnitContextValue | null>(null);

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>("metric");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setUnitSystemState(readPreferredUnitSystem());

    function onUnits(event: Event) {
      const detail = (event as CustomEvent<UnitSystem>).detail;
      if (detail === "metric" || detail === "imperial") {
        setUnitSystemState(detail);
      }
    }

    window.addEventListener(FEK_UNITS_CHANGE_EVENT, onUnits);
    return () => window.removeEventListener(FEK_UNITS_CHANGE_EVENT, onUnits);
  }, []);

  // Keep context aligned with ?units= on calculator routes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname?.startsWith("/calculator")) return;
    const fromUrl = new URLSearchParams(window.location.search).get("units");
    if (fromUrl === "metric" || fromUrl === "imperial") {
      setUnitSystemState(fromUrl);
    }
  }, [pathname]);

  const setUnitSystem = useCallback(
    (next: UnitSystem) => {
      setUnitSystemState(next);
      writePreferredUnitSystem(next);
      window.dispatchEvent(
        new CustomEvent(FEK_UNITS_CHANGE_EVENT, { detail: next }),
      );

      if (pathname?.startsWith("/calculator") && typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("units", next);
        router.replace(`${url.pathname}${url.search}`, { scroll: false });
      }
    },
    [pathname, router],
  );

  const toggleUnitSystem = useCallback(() => {
    setUnitSystem(unitSystem === "metric" ? "imperial" : "metric");
  }, [setUnitSystem, unitSystem]);

  const value = useMemo<UnitContextValue>(
    () => ({
      unitSystem,
      setUnitSystem,
      toggleUnitSystem,
      symbol: (quantity) => unitSymbol(quantity, unitSystem),
      isMetric: unitSystem === "metric",
      isImperial: unitSystem === "imperial",
    }),
    [setUnitSystem, toggleUnitSystem, unitSystem],
  );

  return (
    <UnitContext.Provider value={value}>{children}</UnitContext.Provider>
  );
}

export function useUnitSystem(): UnitContextValue {
  const ctx = useContext(UnitContext);
  if (!ctx) {
    throw new Error("useUnitSystem must be used within UnitProvider");
  }
  return ctx;
}

/** Safe variant for components that may render outside the provider. */
export function useUnitSystemOptional(): UnitContextValue | null {
  return useContext(UnitContext);
}
