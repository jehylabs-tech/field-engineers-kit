"use client";

import { useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculatePumpNpsh,
  DEFAULT_PUMP_NPSH_INPUTS,
  defaultSurfacePressureAbs,
  NPSH_ARRANGEMENT_OPTIONS,
  NPSH_FLUID_OPTIONS,
  type NpshFluid,
  type PumpNpshInputs,
  type SuctionArrangement,
} from "@/lib/calculators/engines/pump-npsh";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PUMP_NPSH_URL_CONFIG } from "@/lib/calculators/url-configs/pump-npsh";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const METRIC_PRESETS = [
  {
    label: "Water 20 °C · flooded 2 m",
    fluid: "water" as const,
    temperature: 20,
    arrangement: "flooded" as const,
    staticHeight: 2,
    frictionLoss: 1,
    npshr: 3.5,
  },
  {
    label: "Water 20 °C · lift 3 m",
    fluid: "water" as const,
    temperature: 20,
    arrangement: "lift" as const,
    staticHeight: 3,
    frictionLoss: 1.5,
    npshr: 4,
  },
  {
    label: "Water 80 °C · flooded 2 m",
    fluid: "water" as const,
    temperature: 80,
    arrangement: "flooded" as const,
    staticHeight: 2,
    frictionLoss: 1,
    npshr: 4,
  },
  {
    label: "Condensate 90 °C · flooded 1 m",
    fluid: "condensate" as const,
    temperature: 90,
    arrangement: "flooded" as const,
    staticHeight: 1,
    frictionLoss: 0.5,
    npshr: 3,
  },
  {
    label: "Light HC 40 °C · flooded 3 m",
    fluid: "light-hc" as const,
    temperature: 40,
    arrangement: "flooded" as const,
    staticHeight: 3,
    frictionLoss: 1,
    npshr: 3.5,
  },
];

const IMPERIAL_PRESETS = [
  {
    label: "Water 68 °F · flooded 6 ft",
    fluid: "water" as const,
    temperature: 68,
    arrangement: "flooded" as const,
    staticHeight: 6,
    frictionLoss: 3,
    npshr: 11,
  },
  {
    label: "Water 68 °F · lift 10 ft",
    fluid: "water" as const,
    temperature: 68,
    arrangement: "lift" as const,
    staticHeight: 10,
    frictionLoss: 5,
    npshr: 13,
  },
  {
    label: "Water 176 °F · flooded 6 ft",
    fluid: "water" as const,
    temperature: 176,
    arrangement: "flooded" as const,
    staticHeight: 6,
    frictionLoss: 3,
    npshr: 13,
  },
];

export default function PumpNpshCalculator({ title, standard }: Props) {
  const { inputs, setField, setInputs } = useCalculatorUrlSync<PumpNpshInputs>(
    DEFAULT_PUMP_NPSH_INPUTS,
    PUMP_NPSH_URL_CONFIG,
    { type: "pump-npsh" },
  );

  const output = useMemo(() => calculatePumpNpsh(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const tempUnit = inputs.unitSystem === "imperial" ? "°F" : "°C";
  const headUnit = inputs.unitSystem === "imperial" ? "ft" : "m";
  const pressureUnit = inputs.unitSystem === "imperial" ? "psi a" : "bar a";
  const presets =
    inputs.unitSystem === "imperial" ? IMPERIAL_PRESETS : METRIC_PRESETS;

  const fluidLabel =
    NPSH_FLUID_OPTIONS.find((f) => f.value === inputs.fluid)?.shortLabel ??
    inputs.fluid;

  function applyPreset(preset: (typeof METRIC_PRESETS)[number]) {
    setInputs((current) => ({
      ...current,
      fluid: preset.fluid,
      temperature: preset.temperature,
      arrangement: preset.arrangement,
      staticHeight: preset.staticHeight,
      frictionLoss: preset.frictionLoss,
      npshr: preset.npshr,
      surfacePressureAbs: defaultSurfacePressureAbs(current.unitSystem),
    }));
  }

  function setAtmSurface() {
    setField("surfacePressureAbs", defaultSurfacePressureAbs(inputs.unitSystem));
  }

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        { label: "Fluid", value: fluidLabel },
        {
          label: "T",
          value: `${inputs.temperature} ${tempUnit}`,
        },
        {
          label: "zs",
          value: `${inputs.arrangement === "lift" ? "−" : "+"}${inputs.staticHeight} ${headUnit}`,
        },
        {
          label: "NPSHr",
          value: `${inputs.npshr} ${headUnit}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Suction conditions &amp; pump NPSHr
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active =
                inputs.fluid === preset.fluid &&
                inputs.temperature === preset.temperature &&
                inputs.arrangement === preset.arrangement &&
                inputs.staticHeight === preset.staticHeight;
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

          <FieldSelect
            label="Fluid"
            value={inputs.fluid}
            options={NPSH_FLUID_OPTIONS.map((f) => ({
              value: f.value,
              label: f.label,
            }))}
            onChange={(value) => setField("fluid", value as NpshFluid)}
          />
          <FieldGroup
            label="Liquid temperature"
            value={inputs.temperature}
            onChange={(value) =>
              setField("temperature", toNumber(value, inputs.temperature))
            }
            unit={tempUnit}
            hint="Sets density and vapor pressure (Pv). Hot water / light ends raise Hvp and cut NPSHa."
          />
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <FieldGroup
                label="Surface pressure (absolute)"
                value={inputs.surfacePressureAbs}
                onChange={(value) =>
                  setField(
                    "surfacePressureAbs",
                    toNumber(value, inputs.surfacePressureAbs),
                  )
                }
                unit={pressureUnit}
                hint="Open tank ≈ 1.013 bar a / 14.7 psi a. Pressurized suction drums use higher Ps."
              />
            </div>
            <button
              type="button"
              onClick={setAtmSurface}
              className="mb-0.5 shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-spec-border dark:bg-spec-bg dark:text-slate-300"
            >
              Set atm
            </button>
          </div>

          <FieldSelect
            label="Suction arrangement"
            value={inputs.arrangement}
            options={NPSH_ARRANGEMENT_OPTIONS.map((a) => ({
              value: a.value,
              label: a.label,
            }))}
            onChange={(value) =>
              setField("arrangement", value as SuctionArrangement)
            }
          />
          <FieldGroup
            label={
              inputs.arrangement === "lift"
                ? "Suction lift height |z|"
                : "Flooded static head |z|"
            }
            value={inputs.staticHeight}
            onChange={(value) =>
              setField("staticHeight", toNumber(value, inputs.staticHeight))
            }
            unit={headUnit}
            hint="Distance from liquid free surface to pump centerline (positive magnitude)."
          />
          <FieldGroup
            label="Suction losses hf"
            value={inputs.frictionLoss}
            onChange={(value) =>
              setField("frictionLoss", toNumber(value, inputs.frictionLoss))
            }
            unit={headUnit}
            hint="Pipe friction + fittings + strainer. Use the pressure-drop tool for a Darcy estimate."
          />
          <FieldGroup
            label="Pump NPSHr"
            value={inputs.npshr}
            onChange={(value) =>
              setField("npshr", toNumber(value, inputs.npshr))
            }
            unit={headUnit}
            hint="Required NPSH from the OEM curve at the operating flow — not a code default."
          />
        </div>
      }
    />
  );
}
