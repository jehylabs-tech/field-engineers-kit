"use client";

import { useEffect, useMemo, useRef } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect, fieldLabelHint } from "@/components/calculator/FieldGroup";
import SectionBlock from "@/components/calculator/SectionBlock";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import type { UnitSystem } from "@/lib/calculators/definitions";
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

  const unitSystemRef = useRef(inputs.unitSystem);
  useEffect(() => {
    unitSystemRef.current = inputs.unitSystem;
  }, [inputs.unitSystem]);

  useEffect(() => {
    function onUnits(event: Event) {
      const next = (event as CustomEvent<UnitSystem>).detail;
      if (next !== "metric" && next !== "imperial") return;
      setInputs((current) => {
        const from = unitSystemRef.current;
        if (from === next) return current;
        unitSystemRef.current = next;
        const length = current.length ?? 6;
        const nextLength =
          next === "imperial" ? length * 3.280839895 : length / 3.280839895;
        return {
          ...current,
          unitSystem: next,
          length: Number(nextLength.toFixed(3)),
        };
      });
    }
    window.addEventListener("fek-units-change", onUnits);
    return () => window.removeEventListener("fek-units-change", onUnits);
  }, [setInputs]);

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
    { label: "Pipe length", value: `${resolvedInputs.length ?? 6} ${lengthUnit}` },
    { label: "Quantity", value: `${resolvedInputs.quantity ?? 1} pcs` },
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
        <>
          <SectionBlock number={1} title="Pipe Selection">
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
          </SectionBlock>

          <SectionBlock number={2} title="MTO length">
            <FieldGroup
              label="Pipe length (L)"
              value={resolvedInputs.length ?? 6}
              onChange={(value) =>
                updateField("length", toNumber(value, resolvedInputs.length ?? 6))
              }
              unit={lengthUnit}
              chips={lengthChips}
              hint="Single-random mill lengths are typically 6 m (≈ 20 ft). Total weight = unit weight × length × quantity."
            />
            <FieldGroup
              label="Quantity (pcs)"
              value={resolvedInputs.quantity ?? 1}
              onChange={(value) => {
                const parsed = Math.max(1, Math.floor(toNumber(value, 1)));
                updateField("quantity", parsed);
              }}
              unit="pcs"
              hint="Optional MTO piece count. Defaults to 1 single length."
            />
          </SectionBlock>

          <SectionBlock number={3} title="Reference Data">
            <p className="text-xs leading-snug text-spec-text2">
              Dimensional data verified against ASME B36.10M (Carbon Steel) and
              ASME B36.19M (Stainless Steel) standards.
            </p>
            {selectedPipe ? (
              <div className="rounded-md border border-spec-border bg-spec-panel px-2.5 py-1.5 text-xs text-spec-text2">
                Nominal OD:{" "}
                <span className="font-mono text-spec-text">
                  {resolvedInputs.unitSystem === "metric"
                    ? `${selectedPipe.outsideDiameterMm} ${dimUnit}`
                    : `${selectedPipe.outsideDiameterIn} ${dimUnit}`}
                </span>
              </div>
            ) : null}
          </SectionBlock>
        </>
      }
    />
  );
}
