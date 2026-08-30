"use client";

import type { PresetOption } from "@/components/calculator/presets";

type PresetChipsProps = {
  options: PresetOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
};

export default function PresetChips({
  options,
  value,
  onChange,
  ariaLabel = "Quick presets",
}: PresetChipsProps) {
  if (options.length === 0) return null;

  return (
    <div
      className="preset-chips mb-1.5 flex flex-wrap gap-1"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            tabIndex={-1}
            onClick={() => onChange(option.value)}
            className={`min-h-8 rounded-full border px-2.5 text-sm ${
              active
                ? "border-spec-accent bg-spec-accentBg font-medium text-spec-accentText"
                : "border-spec-border text-spec-text2 hover:border-spec-accent/40 hover:text-spec-text"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
