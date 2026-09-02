"use client";

import type { ReactNode } from "react";
import { useCarryOver } from "@/components/calculator/CarryOverContext";
import PresetChips from "@/components/calculator/PresetChips";
import type { PresetOption } from "@/components/calculator/presets";
import { useSchematicHighlight } from "@/components/calculator/schematics/SchematicHighlight";
import type { UnitSystem } from "@/lib/calculators/definitions";

export const FIELD_SELECT_CLASS =
  "h-10 min-h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-sm text-slate-900 outline-none focus:border-spec-accent focus:ring-2 focus:ring-spec-accent dark:border-slate-600 dark:bg-spec-bg dark:text-spec-text";

const UNIT_GUTTER_CLASS =
  "box-border h-10 min-h-10 w-full min-w-0 appearance-none rounded-lg border border-slate-300 bg-white px-2.5 text-center text-sm leading-10 text-slate-600 dark:border-slate-600 dark:bg-spec-bg dark:text-spec-text2";

const FIELD_WRAP =
  "calc-field mb-0 w-full max-w-[300px] min-w-0";

export const FIELD_LABEL_CLASS =
  "mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200";

export function fieldLabelHint(label: string): string | undefined {
  const text = label.toLowerCase();
  if (text.includes("nps") || text.includes("nominal pipe")) {
    return "NPS is the dimensionless pipe size (for example 4\"), not the measured outside diameter.";
  }
  if (text.includes("pressure class") || text === "class" || text.includes("class rating")) {
    return "ASME class (150 / 300 / 600) is a rating designation, not a psi value.";
  }
  if (text.includes("design pressure") || text.includes("inlet pressure") || text.includes("outlet pressure")) {
    return "Enter gauge pressure. Units follow the metric / imperial toggle.";
  }
  if (text.includes("pipe schedule") || text === "schedule") {
    return "Sch 40 / STD is the default wall for most process carbon-steel pipe. Sch 5S / 10S / 40S / 80S follow ASME B36.19M stainless dimensions.";
  }
  if (text.includes("flange type")) {
    return "WN is the default process flange. SO/SW are lighter hubs; blind has no bore. Weights are B16.5 screening factors on the WN table mass.";
  }
  if (text.includes("facing")) {
    return "RF is the default facing. RTJ is typical from Class 300 up; the ring number follows ASME B16.20.";
  }
  if (text.includes("component type") || text === "component") {
    return "Valves use ASME B16.10 face-to-face. Elbows, tees, and reducers use ASME B16.9 center-to-end or end-to-end.";
  }
  if (text.includes("allowable stress")) {
    return "Use the code allowable at design temperature from the material group tables.";
  }
  return undefined;
}

type FieldGroupProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  unit?: string;
  error?: string;
  highlight?: string;
  hint?: string;
  chips?: PresetOption[];
  autoFocus?: boolean;
  allowNegative?: boolean;
  allowZero?: boolean;
};

export default function FieldGroup({
  label,
  value,
  onChange,
  unit,
  error,
  highlight,
  hint,
  chips,
  autoFocus,
  allowNegative,
  allowZero,
}: FieldGroupProps) {
  const carryOver = useCarryOver();
  const schematic = useSchematicHighlight();
  const unitLabel = unit?.trim() ? unit : "—";
  const resolvedHint = hint ?? fieldLabelHint(label);

  const labelLower = label.toLowerCase();
  const isTemperature = labelLower.includes("temp");
  const canBeNegative = allowNegative ?? isTemperature;
  const canBeZero =
    allowZero ??
    (labelLower.includes("corrosion") ||
      labelLower.includes("allowance") ||
      labelLower.includes("count") ||
      labelLower.includes("elbow") ||
      labelLower.includes("gate") ||
      labelLower.includes("globe"));

  // Auto-validation for numeric fields
  let validationError = error;
  if (!validationError && value !== "" && value !== undefined) {
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isNaN(num)) {
      if (!canBeNegative) {
        if (!canBeZero && num <= 0) {
          validationError = "Please enter a valid positive number";
        } else if (canBeZero && num < 0) {
          validationError = "Please enter a valid positive number";
        }
      }
    } else if (typeof value === "string" && value.trim() !== "" && value.trim() !== ".") {
      validationError = "Please enter a valid positive number";
    }
  }

  const handleInputChange = (raw: string) => {
    // Prevent typing negative sign if negative values are forbidden
    if (!canBeNegative && raw.includes("-")) {
      raw = raw.replace(/-/g, "");
    }
    onChange(raw);
  };

  return (
    <div
      className={`${FIELD_WRAP} ${validationError ? "[&_input]:border-spec-danger [&_input]:bg-spec-dangerBg" : ""} ${
        carryOver?.active ? "carry-flash" : ""
      }`}
    >
      <label className={FIELD_LABEL_CLASS}>
        <span>{label}</span>
        {resolvedHint ? (
          <span
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-xs font-bold leading-none text-slate-500"
            title={resolvedHint}
            aria-label={resolvedHint}
          >
            ?
          </span>
        ) : null}
      </label>
      {chips ? (
        <PresetChips
          options={chips}
          value={String(value)}
          onChange={handleInputChange}
          ariaLabel={`${label} presets`}
        />
      ) : null}
      <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_72px] gap-1.5">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          tabIndex={0}
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            if (highlight) schematic?.setActive(highlight);
          }}
          onBlur={() => {
            if (highlight) schematic?.setActive(null);
          }}
          className="box-border h-10 min-h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-sm leading-10 text-slate-900 outline-none focus:border-spec-accent focus:ring-2 focus:ring-spec-accent dark:border-slate-600 dark:bg-spec-bg dark:text-spec-text"
        />
        <select
          disabled
          tabIndex={-1}
          className={UNIT_GUTTER_CLASS}
          aria-label={`${label} unit`}
        >
          <option>{unitLabel}</option>
        </select>
      </div>
      {validationError ? (
        <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-spec-danger">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-spec-danger text-[10px] font-bold text-white">
            !
          </span>
          <span>{validationError}</span>
        </div>
      ) : null}
    </div>
  );
}

type FieldSelectProps = {
  label: string;
  /** Secondary hint inline after the label, e.g. "(for loop D)". */
  labelNote?: string;
  value: string;
  onChange: (value: string) => void;
  children?: ReactNode;
  options?: PresetOption[];
  chips?: PresetOption[];
  highlight?: string;
  hint?: string;
};

export function FieldSelect({
  label,
  labelNote,
  value,
  onChange,
  children,
  options,
  chips,
  highlight,
  hint,
}: FieldSelectProps) {
  const schematic = useSchematicHighlight();
  const resolvedHint = hint ?? fieldLabelHint(label);

  // Auto fallback to first option if value is empty or not in options
  const safeValue =
    options && options.length > 0
      ? options.some((o) => o.value === value)
        ? value
        : options[0].value
      : value;

  return (
    <div className={FIELD_WRAP}>
      <label className={FIELD_LABEL_CLASS}>
        <span>{label}</span>
        {labelNote ? (
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            {labelNote}
          </span>
        ) : null}
        {resolvedHint ? (
          <span
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-sm font-bold leading-none text-slate-500"
            title={resolvedHint}
            aria-label={resolvedHint}
          >
            ?
          </span>
        ) : null}
      </label>
      {chips ? (
        <PresetChips
          options={chips}
          value={value}
          onChange={onChange}
          ariaLabel={`${label} presets`}
        />
      ) : null}
      <select
        value={value}
        tabIndex={0}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          if (highlight) schematic?.setActive(highlight);
        }}
        onBlur={() => {
          if (highlight) schematic?.setActive(null);
        }}
        className={FIELD_SELECT_CLASS}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
    </div>
  );
}

type FieldChipRadioProps = {
  label: string;
  labelNote?: string;
  value: string;
  onChange: (value: string) => void;
  options: PresetOption[];
  highlight?: string;
  hint?: string;
  /** Full-width chip grid (lookup calculators). */
  wide?: boolean;
};

/** Chip-only radio grid — no dropdown. */
export function FieldChipRadio({
  label,
  labelNote,
  value,
  onChange,
  options,
  highlight,
  hint,
  wide = false,
}: FieldChipRadioProps) {
  const schematic = useSchematicHighlight();
  const resolvedHint = hint ?? fieldLabelHint(label);
  const safeValue = options.some((o) => o.value === value)
    ? value
    : (options[0]?.value ?? value);

  return (
    <div className={wide ? "calc-field mb-0 w-full min-w-0" : FIELD_WRAP}>
      <label className={FIELD_LABEL_CLASS}>
        <span>{label}</span>
        {labelNote ? (
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            {labelNote}
          </span>
        ) : null}
        {resolvedHint ? (
          <span
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-sm font-bold leading-none text-slate-500"
            title={resolvedHint}
            aria-label={resolvedHint}
          >
            ?
          </span>
        ) : null}
      </label>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-1.5"
        onMouseLeave={() => {
          if (highlight) schematic?.setActive(null);
        }}
      >
        {options.map((option) => {
          const active = option.value === safeValue;
          return (
            <button
              key={`${label}-${option.value}`}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={0}
              onClick={() => onChange(option.value)}
              onFocus={() => {
                if (highlight) schematic?.setActive(highlight);
              }}
              onBlur={() => {
                if (highlight) schematic?.setActive(null);
              }}
              className={`min-h-9 rounded-lg border px-3 text-sm font-medium transition-colors ${
                active
                  ? "border-spec-accent bg-spec-accentBg text-spec-accentText shadow-sm"
                  : "border-slate-300 bg-white text-slate-700 hover:border-spec-accent/50 dark:border-slate-600 dark:bg-spec-bg dark:text-slate-200"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type InlineUnitToggleProps = {
  value: UnitSystem;
  onChange: (next: UnitSystem) => void;
};

/** Compact metric / imperial toggle for calculator input panels. */
export function InlineUnitToggle({ value, onChange }: InlineUnitToggleProps) {
  return (
    <div className={`${FIELD_WRAP} max-w-none`}>
      <span className={FIELD_LABEL_CLASS}>Unit system</span>
      <div
        role="group"
        aria-label="Unit system"
        className="inline-flex w-full items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-sm font-medium dark:border-spec-border dark:bg-spec-panel"
      >
        <button
          type="button"
          onClick={() => onChange("metric")}
          className={`min-h-9 flex-1 rounded-md px-3 py-1.5 transition-all ${
            value === "metric"
              ? "bg-white font-semibold text-slate-900 shadow-sm dark:bg-spec-bg dark:text-slate-50"
              : "text-slate-600 hover:bg-slate-200/80 dark:text-slate-300"
          }`}
        >
          Metric (mm, kg)
        </button>
        <button
          type="button"
          onClick={() => onChange("imperial")}
          className={`min-h-9 flex-1 rounded-md px-3 py-1.5 transition-all ${
            value === "imperial"
              ? "bg-white font-semibold text-slate-900 shadow-sm dark:bg-spec-bg dark:text-slate-50"
              : "text-slate-600 hover:bg-slate-200/80 dark:text-slate-300"
          }`}
        >
          Imperial (in, lb)
        </button>
      </div>
    </div>
  );
}
