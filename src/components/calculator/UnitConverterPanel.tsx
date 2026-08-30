"use client";

import {
  UNIT_CATEGORIES,
  unitDisplayLabel,
  unitsForCategory,
  type UnitCategory,
} from "@/lib/units/engineering";

type UnitConverterPanelProps = {
  category: UnitCategory;
  value: number;
  from: string;
  to: string;
  density: number;
  digits?: 2 | 3;
  resultLabel?: string;
  compact?: boolean;
  onCategory: (category: UnitCategory) => void;
  onValue: (value: number) => void;
  onFrom: (unit: string) => void;
  onTo: (unit: string) => void;
  onDensity: (value: number) => void;
  onDigits?: (digits: 2 | 3) => void;
};

export default function UnitConverterPanel({
  category,
  value,
  from,
  to,
  density,
  digits = 3,
  resultLabel,
  compact = false,
  onCategory,
  onValue,
  onFrom,
  onTo,
  onDensity,
  onDigits,
}: UnitConverterPanelProps) {
  const units = unitsForCategory(category);
  const fromValue = units.includes(from) ? from : units[0];
  const toValue = units.includes(to) ? to : (units[1] ?? units[0]);

  function changeCategory(next: UnitCategory) {
    onCategory(next);
    const nextUnits = unitsForCategory(next);
    onFrom(nextUnits[0]);
    onTo(nextUnits[1] ?? nextUnits[0]);
  }

  function swapUnits() {
    onFrom(toValue);
    onTo(fromValue);
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <div className="flex flex-wrap gap-1.5">
        {UNIT_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => changeCategory(item.id)}
            className={`min-h-9 rounded-full border px-2.5 text-sm outline-none focus:ring-2 focus:ring-spec-accent md:px-3 ${
              category === item.id
                ? "border-spec-accent bg-spec-accentBg font-medium text-spec-accentText"
                : "border-spec-border text-spec-text2"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-spec-text">Value</span>
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => onValue(Number(event.target.value))}
          className="min-h-11 w-full rounded-md border border-spec-border bg-spec-panel px-3 text-base text-spec-text outline-none focus:border-spec-accent focus:ring-2 focus:ring-spec-accent"
        />
      </label>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
        <label className="min-w-0">
          <span className="mb-1.5 block text-sm font-medium text-spec-text">From</span>
          <select
            value={fromValue}
            onChange={(event) => onFrom(event.target.value)}
            className="min-h-11 w-full rounded-md border border-spec-border bg-spec-panel px-2 text-sm text-spec-text outline-none focus:border-spec-accent focus:ring-2 focus:ring-spec-accent"
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unitDisplayLabel(unit)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={swapUnits}
          aria-label="Swap From and To units"
          title="Swap From ↔ To"
          className="inline-flex h-11 min-h-11 w-11 shrink-0 items-center justify-center rounded-md border border-spec-border bg-spec-panel text-lg font-semibold text-spec-text outline-none hover:border-spec-accent hover:bg-spec-accentBg hover:text-spec-accentText focus:border-spec-accent focus:ring-2 focus:ring-spec-accent"
        >
          ↔
        </button>
        <label className="min-w-0">
          <span className="mb-1.5 block text-sm font-medium text-spec-text">To</span>
          <select
            value={toValue}
            onChange={(event) => onTo(event.target.value)}
            className="min-h-11 w-full rounded-md border border-spec-border bg-spec-panel px-2 text-sm text-spec-text outline-none focus:border-spec-accent focus:ring-2 focus:ring-spec-accent"
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unitDisplayLabel(unit)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {onDigits ? (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-spec-text">
            Result decimals
          </span>
          <div className="flex flex-wrap gap-1.5">
            {([2, 3] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onDigits(option)}
                className={`min-h-9 rounded-full border px-3 text-sm outline-none focus:ring-2 focus:ring-spec-accent ${
                  digits === option
                    ? "border-spec-accent bg-spec-accentBg font-medium text-spec-accentText"
                    : "border-spec-border text-spec-text2"
                }`}
              >
                {option} dp
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {category === "flow" && (from === "kg/h" || to === "kg/h") ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-spec-text">
            Density (kg/m³)
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={density}
            onChange={(event) => onDensity(Number(event.target.value))}
            className="min-h-11 w-full rounded-md border border-spec-border bg-spec-panel px-3 text-base text-spec-text outline-none focus:border-spec-accent focus:ring-2 focus:ring-spec-accent"
          />
        </label>
      ) : null}

      {compact && resultLabel ? (
        <p className="break-words rounded-lg bg-spec-accentBg px-3 py-2.5 font-mono text-[15px] text-spec-accentText md:text-base">
          {resultLabel}
        </p>
      ) : null}
    </div>
  );
}
