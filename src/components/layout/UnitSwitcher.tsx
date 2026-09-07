"use client";

import { useUnitSystem } from "@/components/units/UnitContext";
import type { UnitSystem } from "@/lib/calculators/definitions";

type UnitSwitcherProps = {
  className?: string;
  /** Always visible (e.g. calculator SpecHeader). */
  alwaysShow?: boolean;
};

const SYSTEM_HINTS: Record<UnitSystem, string> = {
  imperial: "Length: in · Torque: ft·lb · Pressure: psi · Temp: °F",
  metric: "Length: mm · Torque: N·m · Pressure: MPa · Temp: °C",
};

export default function UnitSwitcher({
  className = "",
  alwaysShow = false,
}: UnitSwitcherProps) {
  const { unitSystem, setUnitSystem } = useUnitSystem();
  const activeHint = SYSTEM_HINTS[unitSystem];

  function select(next: UnitSystem) {
    if (next === unitSystem) return;
    setUnitSystem(next);
  }

  const visibility = alwaysShow ? "inline-flex" : "hidden md:inline-flex";

  return (
    <div
      className={`${visibility} max-w-full flex-wrap items-center gap-2 ${className}`}
    >
      <div
        role="group"
        aria-label="Preferred unit system"
        className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium text-slate-700 dark:border-spec-border dark:bg-spec-panel dark:text-slate-200 md:text-sm"
      >
        <button
          type="button"
          onClick={() => select("imperial")}
          className={`min-h-11 min-w-[4.5rem] rounded-md px-3 py-2 transition-all ${
            unitSystem === "imperial"
              ? "bg-white font-semibold text-slate-900 shadow-sm dark:bg-spec-bg dark:text-slate-50"
              : "font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-spec-border"
          }`}
          aria-pressed={unitSystem === "imperial"}
        >
          Imperial
        </button>
        <button
          type="button"
          onClick={() => select("metric")}
          className={`min-h-11 min-w-[4.5rem] rounded-md px-3 py-2 transition-all ${
            unitSystem === "metric"
              ? "bg-white font-semibold text-slate-900 shadow-sm dark:bg-spec-bg dark:text-slate-50"
              : "font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-spec-border"
          }`}
          aria-pressed={unitSystem === "metric"}
        >
          Metric
        </button>
      </div>
      <span
        key={unitSystem}
        className="hidden max-w-[16rem] truncate rounded-md border border-slate-200/80 bg-white/90 px-2 py-1 text-[10px] font-medium tabular-nums text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 sm:inline-block lg:max-w-none lg:text-[11px]"
        title={activeHint}
        aria-live="polite"
      >
        {activeHint}
      </span>
    </div>
  );
}
