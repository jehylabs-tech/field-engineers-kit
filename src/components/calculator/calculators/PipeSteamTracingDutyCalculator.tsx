"use client";

import { useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import TracingCrossSection from "@/components/calculator/schematics/TracingCrossSection";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculatePipeSteamTracingDuty,
  computePipeSteamTracingDuty,
  DEFAULT_PIPE_STEAM_TRACING_DUTY_INPUTS,
  TRACING_MATERIAL_OPTIONS,
  TRACER_NPS_OPTIONS,
  type PipeSteamTracingDutyInputs,
  type TracerNps,
  type TracingInsulationMaterial,
} from "@/lib/calculators/engines/pipe-steam-tracing-duty";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PIPE_STEAM_TRACING_DUTY_URL_CONFIG } from "@/lib/calculators/url-configs/pipe-steam-tracing-duty";
import { listAvailableNps } from "@/lib/data/loaders";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type Preset = {
  id: string;
  label: string;
  patch: Partial<PipeSteamTracingDutyInputs>;
};

const METRIC_PRESETS: Preset[] = [
  {
    id: "nps4-50c-3p5",
    label: '4" · 50 °C · 3.5 bar.g',
    patch: {
      unitSystem: "metric",
      nps: "4",
      maintainTemp: 50,
      ambientTemp: -10,
      windSpeed: 5,
      material: "mineral-wool",
      insulationThickness: 50,
      tracerNps: "0.5",
      steamPressure: 3.5,
    },
  },
  {
    id: "nps8-100c-7",
    label: '8" · 100 °C · 7 bar.g',
    patch: {
      unitSystem: "metric",
      nps: "8",
      maintainTemp: 100,
      ambientTemp: -15,
      windSpeed: 5,
      material: "mineral-wool",
      insulationThickness: 75,
      tracerNps: "0.5",
      steamPressure: 7,
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "nps3-120f-50",
    label: '3" · 120 °F · 50 psig',
    patch: {
      unitSystem: "imperial",
      nps: "3",
      maintainTemp: 120,
      ambientTemp: 0,
      windSpeed: 11.2,
      material: "mineral-wool",
      insulationThickness: 2,
      tracerNps: "0.5",
      steamPressure: 50,
    },
  },
  {
    id: "nps6-180f-100",
    label: '6" · 180 °F · 100 psig',
    patch: {
      unitSystem: "imperial",
      nps: "6",
      maintainTemp: 180,
      ambientTemp: 10,
      windSpeed: 11.2,
      material: "mineral-wool",
      insulationThickness: 3,
      tracerNps: "0.5",
      steamPressure: 100,
    },
  },
];

export default function PipeSteamTracingDutyCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<PipeSteamTracingDutyInputs>(
      DEFAULT_PIPE_STEAM_TRACING_DUTY_INPUTS,
      PIPE_STEAM_TRACING_DUTY_URL_CONFIG,
      { type: "pipe-steam-tracing-duty" },
    );

  const output = useMemo(() => calculatePipeSteamTracingDuty(inputs), [inputs]);
  const computed = useMemo(() => computePipeSteamTracingDuty(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const tempUnit = inputs.unitSystem === "imperial" ? "°F" : "°C";
  const thickUnit = inputs.unitSystem === "imperial" ? "in" : "mm";
  const windUnit = inputs.unitSystem === "imperial" ? "mph" : "m/s";
  const pressUnit = inputs.unitSystem === "imperial" ? "psig" : "bar.g";

  const materialMeta =
    TRACING_MATERIAL_OPTIONS.find((m) => m.value === inputs.material) ??
    TRACING_MATERIAL_OPTIONS[0];
  const tracerMeta =
    TRACER_NPS_OPTIONS.find((t) => t.value === inputs.tracerNps) ??
    TRACER_NPS_OPTIONS[1];

  const materialOptions = useMemo(
    () =>
      TRACING_MATERIAL_OPTIONS.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    [],
  );
  const tracerOptions = useMemo(
    () =>
      TRACER_NPS_OPTIONS.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    [],
  );
  const npsOptions = useMemo(
    () =>
      listAvailableNps()
        .filter((pipe) => {
          const n = Number(pipe.nps);
          return Number.isFinite(n) && n >= 0.5 && n <= 48;
        })
        .map((pipe) => ({
          value: pipe.nps,
          label: `${pipe.npsLabel} (DN ${pipe.dn})`,
        })),
    [],
  );

  const presets =
    inputs.unitSystem === "imperial" ? IMPERIAL_PRESETS : METRIC_PRESETS;

  function applyPreset(
    preset: (typeof METRIC_PRESETS)[number] | (typeof IMPERIAL_PRESETS)[number],
  ) {
    setInputs((current) => ({
      ...current,
      ...preset.patch,
    }));
  }

  const thicknessLabel = `${inputs.insulationThickness} ${thickUnit}`;
  const steamLabel = `${inputs.steamPressure} ${pressUnit}`;
  const odDual = `B36 OD = ${computed.odMm.toFixed(1)} mm / ${(computed.odMm / 25.4).toFixed(3)} in`;
  const qBtu = computed.qLossWm * 1.040014;
  const qLabel = computed.invalid
    ? "—"
    : inputs.unitSystem === "imperial"
      ? `${qBtu.toFixed(1)} Btu/hr·ft`
      : `${computed.qLossWm.toFixed(1)} W/m`;

  const thickHint =
    inputs.unitSystem === "imperial"
      ? "Typical tracer jacket 0.75–6 in."
      : "Typical tracer jacket 20–150 mm.";

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        { label: "NPS", value: `${inputs.nps}"` },
        { label: "Maintain", value: `${inputs.maintainTemp} ${tempUnit}` },
        { label: "Ambient", value: `${inputs.ambientTemp} ${tempUnit}` },
        {
          label: "Insulation",
          value: `${materialMeta.shortLabel} ${thicknessLabel}`,
        },
        { label: "Tracer", value: tracerMeta.label },
        { label: "Steam", value: steamLabel },
      ]}
      visual={
        <TracingCrossSection
          npsLabel={`NPS ${inputs.nps}`}
          thicknessLabel={thicknessLabel}
          materialLabel={materialMeta.shortLabel}
          tracerLabel={tracerMeta.label}
          tracerCount={computed.invalid ? 1 : computed.tracerCount}
          steamLabel={steamLabel}
          qLabel={qLabel}
        />
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Pipe, insulation &amp; steam tracer
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active =
                inputs.nps === preset.patch.nps &&
                inputs.maintainTemp === preset.patch.maintainTemp &&
                inputs.steamPressure === preset.patch.steamPressure &&
                inputs.insulationThickness ===
                  preset.patch.insulationThickness;
              return (
                <button
                  key={preset.id}
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

          <FieldSelect
            label="NPS"
            value={inputs.nps}
            options={npsOptions}
            onChange={(value) => setField("nps", value)}
          />
          <p className="m-0 -mt-1 text-xs text-slate-500 dark:text-slate-400">
            {odDual}
          </p>
          <FieldSelect
            label="Insulation material"
            value={inputs.material}
            options={materialOptions}
            onChange={(value) =>
              setField("material", value as TracingInsulationMaterial)
            }
          />
          <FieldGroup
            label="Insulation thickness"
            unit={thickUnit}
            hint={thickHint}
            value={inputs.insulationThickness}
            onChange={(value) =>
              setField(
                "insulationThickness",
                toNumber(value, inputs.insulationThickness),
              )
            }
          />
          <FieldGroup
            label="Maintain temperature T_maint"
            unit={tempUnit}
            value={inputs.maintainTemp}
            onChange={(value) =>
              setField("maintainTemp", toNumber(value, inputs.maintainTemp))
            }
          />
          <FieldGroup
            label="Min ambient temperature T_amb"
            unit={tempUnit}
            value={inputs.ambientTemp}
            onChange={(value) =>
              setField("ambientTemp", toNumber(value, inputs.ambientTemp))
            }
          />
          <FieldGroup
            label="Wind speed"
            unit={windUnit}
            allowZero
            hint={
              inputs.unitSystem === "imperial"
                ? "Outdoor cross-flow. Still air ≈ 0; light breeze ≈ 2–5 mph."
                : "Outdoor cross-flow. Still air ≈ 0; light breeze ≈ 1–2 m/s."
            }
            value={inputs.windSpeed}
            onChange={(value) =>
              setField("windSpeed", toNumber(value, inputs.windSpeed))
            }
          />
          <FieldSelect
            label="Tracer tube diameter"
            value={inputs.tracerNps}
            options={tracerOptions}
            onChange={(value) => setField("tracerNps", value as TracerNps)}
          />
          <FieldGroup
            label="Steam supply pressure (gauge)"
            unit={pressUnit}
            hint="Saturated steam. Absolute = gauge + atm for IAPWS h_fg."
            value={inputs.steamPressure}
            onChange={(value) =>
              setField("steamPressure", toNumber(value, inputs.steamPressure))
            }
          />
        </div>
      }
    />
  );
}
