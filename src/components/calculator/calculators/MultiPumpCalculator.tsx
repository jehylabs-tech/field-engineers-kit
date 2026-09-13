"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateMultiPump,
  convertFlowBetweenUnits,
  DEFAULT_MULTI_PUMP_INPUTS,
  MULTI_PUMP_MODE_OPTIONS,
  type MultiPumpFlowUnit,
  type MultiPumpInputs,
  type MultiPumpMode,
} from "@/lib/calculators/engines/multi-pump";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { MULTI_PUMP_URL_CONFIG } from "@/lib/calculators/url-configs/multi-pump";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const METRIC_PRESETS = [
  {
    label: "2× parallel · 100 m³/h",
    mode: "parallel" as const,
    pumpCount: 2,
    headShutoff: 60,
    flowRated: 100,
    flowUnit: "m3h" as const,
    headRated: 45,
    headStatic: 15,
    headFrictionRated: 20,
  },
  {
    label: "Cooling 2× · 250 m³/h",
    mode: "parallel" as const,
    pumpCount: 2,
    headShutoff: 65,
    flowRated: 250,
    flowUnit: "m3h" as const,
    headRated: 50,
    headStatic: 10,
    headFrictionRated: 30,
  },
  {
    label: "BFW 2× series · 80 m³/h",
    mode: "series" as const,
    pumpCount: 2,
    headShutoff: 120,
    flowRated: 80,
    flowUnit: "m3h" as const,
    headRated: 100,
    headStatic: 150,
    headFrictionRated: 40,
  },
];

const IMPERIAL_PRESETS = [
  {
    label: "HVAC 3× parallel · 1500 GPM",
    mode: "parallel" as const,
    pumpCount: 3,
    headShutoff: 180,
    flowRated: 1500,
    flowUnit: "gpm" as const,
    headRated: 135,
    headStatic: 30,
    headFrictionRated: 85,
  },
  {
    label: "Booster 2× series · 800 GPM",
    mode: "series" as const,
    pumpCount: 2,
    headShutoff: 350,
    flowRated: 800,
    flowUnit: "gpm" as const,
    headRated: 280,
    headStatic: 400,
    headFrictionRated: 120,
  },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </h4>
  );
}

export default function MultiPumpCalculator({ title, standard }: Props) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<MultiPumpInputs>(
      DEFAULT_MULTI_PUMP_INPUTS,
      MULTI_PUMP_URL_CONFIG,
      { type: "multi-pump" },
    );

  const output = useMemo(() => calculateMultiPump(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const headUnit = inputs.unitSystem === "imperial" ? "ft" : "m";
  const flowUnitLabel = inputs.flowUnit === "gpm" ? "GPM" : "m³/h";
  const presets =
    inputs.unitSystem === "imperial" ? IMPERIAL_PRESETS : METRIC_PRESETS;
  const modeShort =
    MULTI_PUMP_MODE_OPTIONS.find((m) => m.value === inputs.mode)?.shortLabel ??
    inputs.mode;

  function onFlowUnitChange(next: MultiPumpFlowUnit) {
    setInputs((current) => ({
      ...current,
      flowUnit: next,
      flowRated: convertFlowBetweenUnits(
        current.flowRated,
        current.flowUnit,
        next,
      ),
    }));
  }

  function applyPreset(preset: (typeof METRIC_PRESETS)[number]) {
    setInputs((current) => ({
      ...current,
      ...preset,
    }));
  }

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        { label: "Mode", value: `${modeShort} ×${inputs.pumpCount}` },
        {
          label: "Q_rated",
          value: `${inputs.flowRated} ${flowUnitLabel}`,
        },
        {
          label: "H_so / H_r",
          value: `${inputs.headShutoff} / ${inputs.headRated} ${headUnit}`,
        },
        {
          label: "H_s / H_f",
          value: `${inputs.headStatic} / ${inputs.headFrictionRated} ${headUnit}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Pump curve &amp; system resistance
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active =
                inputs.mode === preset.mode &&
                inputs.pumpCount === preset.pumpCount &&
                inputs.flowRated === preset.flowRated &&
                inputs.headShutoff === preset.headShutoff;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
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

          <SectionLabel>Configuration</SectionLabel>
          <FieldSelect
            label="Operation mode"
            value={inputs.mode}
            options={MULTI_PUMP_MODE_OPTIONS.map((m) => ({
              value: m.value,
              label: m.label,
            }))}
            onChange={(value) => setField("mode", value as MultiPumpMode)}
          />
          <FieldSelect
            label="Number of identical pumps N"
            value={String(inputs.pumpCount)}
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
              { value: "4", label: "4" },
            ]}
            onChange={(value) =>
              setField("pumpCount", toNumber(value, inputs.pumpCount))
            }
          />

          <SectionLabel>Single-pump curve (quadratic fit)</SectionLabel>
          <FieldGroup
            label="Shut-off head H_so"
            value={inputs.headShutoff}
            onChange={(value) =>
              setField("headShutoff", toNumber(value, inputs.headShutoff))
            }
            unit={headUnit}
            hint="Zero-flow head from the OEM curve."
          />
          <FieldGroup
            label="Rated head H_rated"
            value={inputs.headRated}
            onChange={(value) =>
              setField("headRated", toNumber(value, inputs.headRated))
            }
            unit={headUnit}
            hint="Must be less than H_so. a = (H_so − H_rated) / Q_rated²."
          />
          <FieldGroup
            label="Rated flow Q_rated"
            value={inputs.flowRated}
            onChange={(value) =>
              setField("flowRated", toNumber(value, inputs.flowRated))
            }
            unit={flowUnitLabel}
            hint="Design / BEP-near duty used to fit a and to reference friction."
          />
          <FieldSelect
            label="Flow unit"
            value={inputs.flowUnit}
            options={[
              { value: "m3h", label: "m³/h" },
              { value: "gpm", label: "GPM" },
            ]}
            onChange={(value) => onFlowUnitChange(value as MultiPumpFlowUnit)}
          />

          <SectionLabel>System curve</SectionLabel>
          <FieldGroup
            label="Static head H_static"
            value={inputs.headStatic}
            onChange={(value) =>
              setField("headStatic", toNumber(value, inputs.headStatic))
            }
            unit={headUnit}
            allowZero
            hint="Elevation lift + (Pd − Ps)/(ρg). Open tanks at equal Patm → elevation only."
          />
          <FieldGroup
            label="Friction head at Q_rated"
            value={inputs.headFrictionRated}
            onChange={(value) =>
              setField(
                "headFrictionRated",
                toNumber(value, inputs.headFrictionRated),
              )
            }
            unit={headUnit}
            allowZero
            hint="ΔH_friction at Q_rated → k = ΔH_f / Q_rated². From Pressure Drop or measured."
          />

          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Pair with{" "}
            <Link
              href="/calculator/pump-tdh-power"
              className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
            >
              TDH &amp; Pump Power
            </Link>
            ,{" "}
            <Link
              href="/calculator/pressure-drop-friction"
              className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
            >
              Pressure Drop
            </Link>
            ,{" "}
            <Link
              href="/calculator/pump-npsh-cavitation"
              className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
            >
              Pump NPSH
            </Link>
            , and{" "}
            <Link
              href="/calculator/pump-mcsf-thermal-protection"
              className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
            >
              MCSF
            </Link>
            .
          </p>
        </div>
      }
    />
  );
}
