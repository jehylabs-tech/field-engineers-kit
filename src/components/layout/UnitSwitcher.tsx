"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { UnitSystem } from "@/lib/calculators/definitions";
import {
  readPreferredUnitSystem,
  writePreferredUnitSystem,
} from "@/lib/units/preferred-system";

type UnitSwitcherProps = {
  className?: string;
  /** Always visible (e.g. calculator SpecHeader). */
  alwaysShow?: boolean;
};

export default function UnitSwitcher({
  className = "",
  alwaysShow = false,
}: UnitSwitcherProps) {
  const [units, setUnits] = useState<UnitSystem>("metric");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setUnits(readPreferredUnitSystem());
    function onUnits(event: Event) {
      const detail = (event as CustomEvent<UnitSystem>).detail;
      if (detail === "metric" || detail === "imperial") setUnits(detail);
    }
    window.addEventListener("fek-units-change", onUnits);
    return () => window.removeEventListener("fek-units-change", onUnits);
  }, []);

  function select(next: UnitSystem) {
    setUnits(next);
    writePreferredUnitSystem(next);
    window.dispatchEvent(new CustomEvent("fek-units-change", { detail: next }));

    if (pathname.startsWith("/calculator") && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("units", next);
      router.replace(`${url.pathname}${url.search}`, { scroll: false });
    }
  }

  const visibility = alwaysShow ? "inline-flex" : "hidden md:inline-flex";

  return (
    <div
      role="group"
      aria-label="Preferred unit system"
      className={`${visibility} items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium text-slate-700 dark:border-spec-border dark:bg-spec-panel dark:text-slate-200 md:text-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => select("imperial")}
        className={`min-h-11 min-w-[3.25rem] rounded-md px-3 py-2 transition-all ${
          units === "imperial"
            ? "bg-white font-semibold text-slate-900 shadow-sm dark:bg-spec-bg dark:text-slate-50"
            : "font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-spec-border"
        }`}
        title="Imperial (in / psi / °F)"
      >
        in/psi
      </button>
      <button
        type="button"
        onClick={() => select("metric")}
        className={`min-h-11 min-w-[3.25rem] rounded-md px-3 py-2 transition-all ${
          units === "metric"
            ? "bg-white font-semibold text-slate-900 shadow-sm dark:bg-spec-bg dark:text-slate-50"
            : "font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-spec-border"
        }`}
        title="Metric (mm / bar / °C)"
      >
        mm/bar
      </button>
    </div>
  );
}
