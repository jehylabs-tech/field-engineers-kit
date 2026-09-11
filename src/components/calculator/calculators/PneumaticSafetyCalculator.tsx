"use client";

import { useEffect, useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculatePneumaticSafety,
  DEFAULT_PNEUMATIC_SAFETY_INPUTS,
  listPneumaticNpsOptions,
  PNEUMATIC_GAS_OPTIONS,
  PNEUMATIC_IMPERIAL_PRESETS,
  PNEUMATIC_METRIC_PRESETS,
  PNEUMATIC_MODE_OPTIONS,
  resolveVolumeM3,
  type PneumaticGas,
  type PneumaticSafetyInputs,
  type PneumaticVolumeMode,
} from "@/lib/calculators/engines/pneumatic-safety";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PNEUMATIC_SAFETY_URL_CONFIG } from "@/lib/calculators/url-configs/pneumatic-safety";
import {
  defaultScheduleForNps,
  listScheduleOptionsForNps,
  resolveScheduleOptionValue,
} from "@/lib/data/loaders";
import { chipsInOptions } from "@/components/calculator/presets";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const SCH_CHIPS = [
  { value: "40", label: "Sch 40" },
  { value: "80", label: "Sch 80" },
  { value: "160", label: "Sch 160" },
];

export default function PneumaticSafetyCalculator({ title, standard }: Props) {
  const { inputs, setField, setInputs } = useCalculatorUrlSync<PneumaticSafetyInputs>(
    DEFAULT_PNEUMATIC_SAFETY_INPUTS,
    PNEUMATIC_SAFETY_URL_CONFIG,
    { type: "pneumatic-safety" },
  );

  useEffect(() => {
    if (inputs.mode !== "pipe") return;
    const next = defaultScheduleForNps(inputs.nps, inputs.schedule);
    if (next && next !== inputs.schedule) {
      setField("schedule", next);
    }
  }, [inputs.mode, inputs.nps, inputs.schedule, setField]);

  const output = useMemo(() => calculatePneumaticSafety(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const pressureUnit = inputs.unitSystem === "imperial" ? "psi" : "bar";
  const volumeUnit = inputs.unitSystem === "imperial" ? "ft³" : "m³";
  const lengthUnit = inputs.unitSystem === "imperial" ? "ft" : "m";

  const npsOptions = useMemo(() => listPneumaticNpsOptions(), []);
  const scheduleOptions = useMemo(() => {
    const available = listScheduleOptionsForNps(inputs.nps);
    return available.map((row) => ({ value: row.value, label: row.label }));
  }, [inputs.nps]);

  const presets =
    inputs.unitSystem === "imperial"
      ? PNEUMATIC_IMPERIAL_PRESETS
      : PNEUMATIC_METRIC_PRESETS;

  const resolvedVol = resolveVolumeM3(inputs);
  const volDisplay =
    inputs.unitSystem === "imperial"
      ? `${(resolvedVol / 0.028316846592).toFixed(2)} ft³`
      : `${resolvedVol.toFixed(3)} m³`;

  function applyPreset(testPressure: number, volume: number) {
    setInputs((current) => ({
      ...current,
      mode: "volume",
      testPressure,
      volume,
      gas: current.gas || "air",
    }));
  }

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        {
          label: "P_test",
          value: `${inputs.testPressure} ${pressureUnit} g`,
        },
        { label: "Volume V", value: volDisplay },
        {
          label: "Gas",
          value:
            PNEUMATIC_GAS_OPTIONS.find((g) => g.value === inputs.gas)?.label ??
            inputs.gas,
        },
        {
          label: "Mode",
          value: inputs.mode === "pipe" ? "Pipe run" : "Direct volume",
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Pneumatic test conditions
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active =
                inputs.mode === "volume" &&
                inputs.testPressure === preset.testPressure &&
                inputs.volume === preset.volume;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    applyPreset(preset.testPressure, preset.volume)
                  }
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-spec-border dark:bg-spec-bg dark:text-slate-300"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <FieldGroup
            label="Test pressure (gauge)"
            value={inputs.testPressure}
            onChange={(value) =>
              setField("testPressure", toNumber(value, inputs.testPressure))
            }
            unit={pressureUnit}
            hint="Authorized pneumatic Pt (B31.3 typically ≤ 1.1 × P × St/S). Prefer hydrotest when practical."
          />
          <FieldSelect
            label="Test gas"
            value={inputs.gas}
            options={PNEUMATIC_GAS_OPTIONS.map((g) => ({
              value: g.value,
              label: g.label,
            }))}
            onChange={(value) => setField("gas", value as PneumaticGas)}
          />
          <FieldSelect
            label="Volume input"
            value={inputs.mode}
            options={PNEUMATIC_MODE_OPTIONS.map((m) => ({
              value: m.value,
              label: m.label,
            }))}
            onChange={(value) =>
              setField("mode", value as PneumaticVolumeMode)
            }
          />

          {inputs.mode === "volume" ? (
            <FieldGroup
              label="Volume under test"
              value={inputs.volume}
              onChange={(value) =>
                setField("volume", toNumber(value, inputs.volume))
              }
              unit={volumeUnit}
              hint="Include pipe, vessels, and instrument tubing in the pressurized envelope."
            />
          ) : (
            <>
              <FieldSelect
                label="NPS"
                value={inputs.nps}
                options={npsOptions}
                onChange={(value) => setField("nps", value)}
              />
              <FieldSelect
                label="Schedule"
                value={
                  scheduleOptions.some((o) => o.value === inputs.schedule)
                    ? inputs.schedule
                    : (scheduleOptions[0]?.value ?? inputs.schedule)
                }
                options={scheduleOptions}
                chips={chipsInOptions(SCH_CHIPS, scheduleOptions)}
                onChange={(value) =>
                  setField(
                    "schedule",
                    resolveScheduleOptionValue(inputs.nps, value),
                  )
                }
              />
              <FieldGroup
                label="Pipe run length"
                value={inputs.length}
                onChange={(value) =>
                  setField("length", toNumber(value, inputs.length))
                }
                unit={lengthUnit}
                hint={`V = π/4 · ID² · L → ${volDisplay} (B36 ID). Add vessel volume separately if significant.`}
              />
            </>
          )}
        </div>
      }
    />
  );
}
