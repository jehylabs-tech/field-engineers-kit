"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  AFFINITY_MODE_OPTIONS,
  applyAffinityMode,
  calculatePumpAffinity,
  convertFlowBetweenUnits,
  DEFAULT_PUMP_AFFINITY_INPUTS,
  type AffinityFlowUnit,
  type AffinityMode,
  type PumpAffinityInputs,
} from "@/lib/calculators/engines/pump-affinity";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PUMP_AFFINITY_URL_CONFIG } from "@/lib/calculators/url-configs/pump-affinity";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const METRIC_PRESETS = [
  {
    label: "VFD 1480→1780 · 50 m³/h",
    mode: "speed" as const,
    speed1: 1480,
    speed2: 1780,
    diameter1: 250,
    diameter2: 250,
    flow1: 50,
    flowUnit: "m3h" as const,
    head1: 25,
    power1: 5.5,
  },
  {
    label: "Trim 250→230 mm · 50 m³/h",
    mode: "diameter" as const,
    speed1: 1480,
    speed2: 1480,
    diameter1: 250,
    diameter2: 230,
    flow1: 50,
    flowUnit: "m3h" as const,
    head1: 25,
    power1: 5.5,
  },
  {
    label: "VFD+trim 1480→1780 · D 250→230",
    mode: "combined" as const,
    speed1: 1480,
    speed2: 1780,
    diameter1: 250,
    diameter2: 230,
    flow1: 50,
    flowUnit: "m3h" as const,
    head1: 25,
    power1: 5.5,
  },
];

const IMPERIAL_PRESETS = [
  {
    label: "VFD 1750→1450 · 200 GPM",
    mode: "speed" as const,
    speed1: 1750,
    speed2: 1450,
    diameter1: 10,
    diameter2: 10,
    flow1: 200,
    flowUnit: "gpm" as const,
    head1: 80,
    power1: 10,
  },
  {
    label: "Trim 10→9 in · 200 GPM",
    mode: "diameter" as const,
    speed1: 1750,
    speed2: 1750,
    diameter1: 10,
    diameter2: 9,
    flow1: 200,
    flowUnit: "gpm" as const,
    head1: 80,
    power1: 10,
  },
  {
    label: "VFD+trim 1750→1450 · D 10→9",
    mode: "combined" as const,
    speed1: 1750,
    speed2: 1450,
    diameter1: 10,
    diameter2: 9,
    flow1: 200,
    flowUnit: "gpm" as const,
    head1: 80,
    power1: 10,
  },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </h4>
  );
}

export default function PumpAffinityCalculator({ title, standard }: Props) {
  const { inputs, setField, setInputs } = useCalculatorUrlSync<PumpAffinityInputs>(
    DEFAULT_PUMP_AFFINITY_INPUTS,
    PUMP_AFFINITY_URL_CONFIG,
    { type: "pump-affinity" },
  );

  const output = useMemo(() => calculatePumpAffinity(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const headUnit = inputs.unitSystem === "imperial" ? "ft" : "m";
  const dimUnit = inputs.unitSystem === "imperial" ? "in" : "mm";
  const powerUnit = inputs.unitSystem === "imperial" ? "HP" : "kW";
  const flowUnitLabel = inputs.flowUnit === "gpm" ? "GPM" : "m³/h";
  const presets =
    inputs.unitSystem === "imperial" ? IMPERIAL_PRESETS : METRIC_PRESETS;

  const modeShort =
    AFFINITY_MODE_OPTIONS.find((m) => m.value === inputs.mode)?.shortLabel ??
    inputs.mode;

  const speedLocked = inputs.mode === "diameter";
  const diameterLocked = inputs.mode === "speed";

  function onModeChange(mode: AffinityMode) {
    setInputs((current) => applyAffinityMode(mode, current));
  }

  function onFlowUnitChange(next: AffinityFlowUnit) {
    setInputs((current) => ({
      ...current,
      flowUnit: next,
      flow1: convertFlowBetweenUnits(current.flow1, current.flowUnit, next),
    }));
  }

  function applyPreset(
    preset: (typeof METRIC_PRESETS)[number] | (typeof IMPERIAL_PRESETS)[number],
  ) {
    setInputs((current) => ({
      ...current,
      unitSystem: preset.flowUnit === "gpm" ? "imperial" : "metric",
      mode: preset.mode,
      speed1: preset.speed1,
      speed2: preset.speed2,
      diameter1: preset.diameter1,
      diameter2: preset.diameter2,
      flow1: preset.flow1,
      flowUnit: preset.flowUnit,
      head1: preset.head1,
      power1: preset.power1,
    }));
  }

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        { label: "Mode", value: modeShort },
        {
          label: "N₁→N₂",
          value: `${inputs.speed1}→${speedLocked ? inputs.speed1 : inputs.speed2}`,
        },
        {
          label: "D₁→D₂",
          value: `${inputs.diameter1}→${diameterLocked ? inputs.diameter1 : inputs.diameter2} ${dimUnit}`,
        },
        {
          label: "Q₁",
          value: `${inputs.flow1} ${flowUnitLabel}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Affinity change &amp; baseline duty
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active =
                inputs.mode === preset.mode &&
                inputs.speed1 === preset.speed1 &&
                inputs.speed2 === preset.speed2 &&
                inputs.diameter1 === preset.diameter1 &&
                inputs.diameter2 === preset.diameter2;
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

          <SectionLabel>Change type</SectionLabel>
          <FieldSelect
            label="Affinity mode"
            value={inputs.mode}
            options={AFFINITY_MODE_OPTIONS.map((m) => ({
              value: m.value,
              label: m.label,
            }))}
            onChange={(value) => onModeChange(value as AffinityMode)}
          />

          <SectionLabel>Speed (RPM)</SectionLabel>
          <FieldGroup
            label="Baseline speed N₁"
            value={inputs.speed1}
            onChange={(value) => {
              const n1 = toNumber(value, inputs.speed1);
              setInputs((current) => ({
                ...current,
                speed1: n1,
                speed2: current.mode === "diameter" ? n1 : current.speed2,
              }));
            }}
            unit="RPM"
            hint="Nameplate or current VFD setpoint."
          />
          <FieldGroup
            label="Target speed N₂"
            value={speedLocked ? inputs.speed1 : inputs.speed2}
            onChange={(value) =>
              setField("speed2", toNumber(value, inputs.speed2))
            }
            unit="RPM"
            hint={
              speedLocked
                ? "Locked to N₁ in impeller-trim mode."
                : "New VFD / pulley / gear speed."
            }
            disabled={speedLocked}
          />

          <SectionLabel>Impeller diameter</SectionLabel>
          <FieldGroup
            label="Baseline diameter D₁"
            value={inputs.diameter1}
            onChange={(value) => {
              const d1 = toNumber(value, inputs.diameter1);
              setInputs((current) => ({
                ...current,
                diameter1: d1,
                diameter2: current.mode === "speed" ? d1 : current.diameter2,
              }));
            }}
            unit={dimUnit}
            hint="Max / as-installed impeller OD."
          />
          <FieldGroup
            label="Trimmed diameter D₂"
            value={diameterLocked ? inputs.diameter1 : inputs.diameter2}
            onChange={(value) =>
              setField("diameter2", toNumber(value, inputs.diameter2))
            }
            unit={dimUnit}
            hint={
              diameterLocked
                ? "Locked to D₁ in speed / VFD mode."
                : "Shop cut OD. Soft warn if D₂/D₁ < 0.80; hard warn < 0.70."
            }
            disabled={diameterLocked}
          />

          <SectionLabel>Baseline duty (known curve point)</SectionLabel>
          <FieldGroup
            label="Baseline flow Q₁"
            value={inputs.flow1}
            onChange={(value) =>
              setField("flow1", toNumber(value, inputs.flow1))
            }
            unit={flowUnitLabel}
            hint="Same fluid / system — affinity does not change SG."
          />
          <FieldSelect
            label="Flow unit"
            value={inputs.flowUnit}
            options={[
              { value: "m3h", label: "m³/h" },
              { value: "gpm", label: "GPM" },
            ]}
            onChange={(value) => onFlowUnitChange(value as AffinityFlowUnit)}
          />
          <FieldGroup
            label="Baseline head H₁"
            value={inputs.head1}
            onChange={(value) =>
              setField("head1", toNumber(value, inputs.head1))
            }
            unit={headUnit}
            hint="Total head at Q₁ (OEM curve or TDH)."
          />
          <FieldGroup
            label="Baseline power P₁"
            value={inputs.power1}
            onChange={(value) =>
              setField("power1", toNumber(value, inputs.power1))
            }
            unit={powerUnit}
            hint="Brake / shaft power at Q₁ (not motor electrical input)."
          />

          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Need baseline H₁ / P₁? Use{" "}
            <Link
              href="/calculator/pump-tdh-power"
              className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
            >
              TDH &amp; Pump Power
            </Link>
            . After a speed-up, recheck{" "}
            <Link
              href="/calculator/pump-npsh-cavitation"
              className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
            >
              Pump NPSH
            </Link>
            .
          </p>
        </div>
      }
    />
  );
}
