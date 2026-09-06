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
  metric: "Length: mm · Torque: N·m · Pressure: bar · Temp: °C",
};

export default function UnitSwitcher({
  className = "",
  alwaysShow = false,
}: UnitSwitcherProps) {
  const { unitSystem, setUnitSystem } = useUnitSystem();

  function select(next: UnitSystem) {
    if (next === unitSystem) return;
    setUnitSystem(next);
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
        className={`min-h-11 min-w-[4.5rem] rounded-md px-3 py-2 transition-all ${
          unitSystem === "imperial"
            ? "bg-white font-semibold text-slate-900 shadow-sm dark:bg-spec-bg dark:text-slate-50"
            : "font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-spec-border"
        }`}
        title={SYSTEM_HINTS.imperial}
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
        title={SYSTEM_HINTS.metric}
        aria-pressed={unitSystem === "metric"}
      >
        Metric
      </button>
    </div>
  );
}
