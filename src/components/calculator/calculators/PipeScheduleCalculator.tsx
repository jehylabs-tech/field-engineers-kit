"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect, fieldLabelHint } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculatePipeSchedule,
  DEFAULT_PIPE_SCHEDULE_INPUTS,
  type PipeScheduleInputs,
} from "@/lib/calculators/engines/pipe-schedule";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PIPE_SCHEDULE_URL_CONFIG } from "@/lib/calculators/url-configs/pipe-schedule";
import {
  chipsInOptions,
  COMMON_NPS_CHIPS,
  COMMON_SCHEDULE_CHIPS,
} from "@/components/calculator/presets";
import {
  defaultScheduleForNps,
  listAvailableNps,
  listScheduleOptionsForNps,
  resolveScheduleOptionValue,
} from "@/lib/data/loaders";

type PipeScheduleCalculatorProps = {
  title: string;
  standard?: string;
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function SelectField({
  label,
  value,
  options,
  onChange,
  chips,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  chips?: { value: string; label: string }[];
}) {
  return (
    <FieldSelect
      label={label}
      value={value}
      options={options}
      chips={chips ? chipsInOptions(chips, options) : undefined}
      onChange={onChange}
      hint={fieldLabelHint(label)}
    />
  );
}

export default function PipeScheduleCalculator({
  title,
  standard,
}: PipeScheduleCalculatorProps) {
  const [showMto, setShowMto] = useState(false);
  const { inputs, setField, setInputs } = useCalculatorUrlSync<PipeScheduleInputs>(
    DEFAULT_PIPE_SCHEDULE_INPUTS,
    PIPE_SCHEDULE_URL_CONFIG,
    { type: "pipe-schedule" },
  );

  useEffect(() => {
    const nextSchedule = defaultScheduleForNps(inputs.nps, inputs.schedule);
    if (nextSchedule && nextSchedule !== inputs.schedule) {
      setField("schedule", nextSchedule);
    }
  }, [inputs.nps, inputs.schedule, setField]);

  const npsOptions = useMemo(
    () =>
      listAvailableNps().map((pipe) => ({
        value: pipe.nps,
        label: `${pipe.npsLabel} (DN ${pipe.dn})`,
      })),
    [],
  );

  const scheduleOptions = useMemo(
    () =>
      listScheduleOptionsForNps(inputs.nps).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [inputs.nps],
  );

  const scheduleChips = useMemo(
    () => chipsInOptions(COMMON_SCHEDULE_CHIPS, scheduleOptions),
    [scheduleOptions],
  );

  const resolvedInputs = useMemo(() => {
    const schedule = defaultScheduleForNps(inputs.nps, inputs.schedule);
    return {
      ...inputs,
      length: Number.isFinite(inputs.length) ? inputs.length : 6,
      quantity:
        Number.isFinite(inputs.quantity) && (inputs.quantity ?? 0) > 0
          ? Math.floor(inputs.quantity ?? 1)
          : 1,
      schedule,
    };
  }, [inputs]);

  const output = useMemo(
    () => calculatePipeSchedule(resolvedInputs),
    [resolvedInputs],
  );
  usePublishCalculatorOutput(output);

  function updateField<K extends keyof PipeScheduleInputs>(
    key: K,
    value: PipeScheduleInputs[K],
  ) {
    if (key === "nps") {
      const nps = String(value);
      const nextSchedule = defaultScheduleForNps(nps, inputs.schedule);
      setInputs((current) => ({
        ...current,
        nps,
        schedule: nextSchedule,
      }));
      return;
    }

    if (key === "schedule") {
      setField(
        "schedule",
        resolveScheduleOptionValue(inputs.nps, String(value)),
      );
      return;
    }

    setField(key, value);
  }

  const selectedPipe = listAvailableNps().find((pipe) => pipe.nps === resolvedInputs.nps);
  const dimUnit = resolvedInputs.unitSystem === "metric" ? "mm" : "in";
  const lengthUnit = resolvedInputs.unitSystem === "metric" ? "m" : "ft";
  const lengthChips =
    resolvedInputs.unitSystem === "metric"
      ? [
          { value: "6", label: "6 m" },
          { value: "12", label: "12 m" },
        ]
      : [
          { value: "20", label: "20 ft" },
          { value: "40", label: "40 ft" },
        ];

  const scheduleDisplay =
    scheduleOptions.find((option) => option.value === resolvedInputs.schedule)?.label ??
    `Sch ${resolvedInputs.schedule}`;

  const inputRows = [
    { label: "NPS", value: selectedPipe?.npsLabel ?? resolvedInputs.nps },
    { label: "Schedule", value: scheduleDisplay },
    { label: "Pipe length (L)", value: `${resolvedInputs.length ?? 6} ${lengthUnit}` },
    { label: "Quantity (n)", value: `${resolvedInputs.quantity ?? 1} pcs` },
    { label: "Unit system", value: resolvedInputs.unitSystem },
    {
      label: "Reference OD",
      value: selectedPipe
        ? resolvedInputs.unitSystem === "metric"
          ? `${selectedPipe.outsideDiameterMm} mm`
          : `${selectedPipe.outsideDiameterIn} in`
        : "—",
    },
  ];

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0">
          {/* Under 1. Input Parameters — no duplicate top-level section number */}
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Pipe selection
          </h3>
          <SelectField
            label="Nominal pipe size (NPS)"
            value={resolvedInputs.nps}
            options={npsOptions}
            chips={COMMON_NPS_CHIPS}
            onChange={(value) => updateField("nps", value)}
          />
          <SelectField
            label="Schedule"
            value={resolvedInputs.schedule}
            options={scheduleOptions}
            chips={scheduleChips}
            onChange={(value) => updateField("schedule", value)}
          />

          {selectedPipe ? (
            <div className="rounded-md border border-spec-border bg-spec-panel px-2.5 py-1.5 text-xs text-spec-text2">
              Nominal OD:{" "}
              <span className="font-mono text-spec-text">
                {resolvedInputs.unitSystem === "metric"
                  ? `${selectedPipe.outsideDiameterMm} ${dimUnit}`
                  : `${selectedPipe.outsideDiameterIn} ${dimUnit}`}
              </span>
              <span className="mt-1 block text-[11px] leading-snug">
                B36.10M carbon / alloy · B36.19M stainless (S schedules). Hero is
                wall <span className="font-mono">t</span>;{" "}
                <span className="font-mono">W_tot = W_m × L × n</span>.
              </span>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowMto((open) => !open)}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-slate-100 px-1.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  1.2
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  MTO length &amp; quantity
                </span>
                {!showMto ? (
                  <span className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    L {resolvedInputs.length ?? 6} {lengthUnit} · n{" "}
                    {resolvedInputs.quantity ?? 1}
                  </span>
                ) : null}
              </div>
              <span className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {showMto ? "▲ Hide" : "▼ Edit"}
              </span>
            </button>

            {showMto ? (
              <div className="space-y-2.5 border-t border-slate-200/80 p-3.5 dark:border-slate-800">
                <FieldGroup
                  label="Pipe length (L)"
                  value={resolvedInputs.length ?? 6}
                  onChange={(value) =>
                    updateField("length", toNumber(value, resolvedInputs.length ?? 6))
                  }
                  unit={lengthUnit}
                  chips={lengthChips}
                  hint="Single-random mill lengths are typically 6 m (≈ 20 ft). W_tot = W_m × L × n."
                />
                <FieldGroup
                  label="Quantity (n, pcs)"
                  value={resolvedInputs.quantity ?? 1}
                  onChange={(value) => {
                    const parsed = Math.max(1, Math.floor(toNumber(value, 1)));
                    updateField("quantity", parsed);
                  }}
                  unit="pcs"
                  hint="Optional MTO piece count. Defaults to 1 single length."
                />
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
