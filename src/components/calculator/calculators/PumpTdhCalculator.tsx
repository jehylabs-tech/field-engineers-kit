"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  applyFluidPreset,
  calculatePumpTdh,
  convertFlowBetweenUnits,
  DEFAULT_PUMP_TDH_INPUTS,
  TDH_FLUID_OPTIONS,
  type PumpTdhInputs,
  type TdhFluid,
  type TdhFlowUnit,
} from "@/lib/calculators/engines/pump-tdh";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PUMP_TDH_URL_CONFIG } from "@/lib/calculators/url-configs/pump-tdh";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toEfficiency(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  // Allow users to type 70 for 70% or 0.70 for fraction.
  if (parsed > 1) return Math.min(1, parsed / 100);
  return Math.max(0.05, parsed);
}

const METRIC_PRESETS = [
  {
    label: "Water 50 m³/h · Hs 20 m",
    fluid: "water" as const,
    flow: 50,
    flowUnit: "m3h" as const,
    staticHead: 20,
    frictionHead: 5,
    pumpEfficiency: 0.7,
  },
  {
    label: "Water 100 m³/h · Hs 40 m",
    fluid: "water" as const,
    flow: 100,
    flowUnit: "m3h" as const,
    staticHead: 40,
    frictionHead: 10,
    pumpEfficiency: 0.75,
  },
  {
    label: "Seawater 50 m³/h · Hs 15 m",
    fluid: "seawater" as const,
    flow: 50,
    flowUnit: "m3h" as const,
    staticHead: 15,
    frictionHead: 5,
    pumpEfficiency: 0.7,
  },
];

const IMPERIAL_PRESETS = [
  {
    label: "Water 100 GPM · Hs 60 ft",
    fluid: "water" as const,
    flow: 100,
    flowUnit: "gpm" as const,
    staticHead: 60,
    frictionHead: 15,
    pumpEfficiency: 0.7,
  },
  {
    label: "Water 200 GPM · Hs 80 ft",
    fluid: "water" as const,
    flow: 200,
    flowUnit: "gpm" as const,
    staticHead: 80,
    frictionHead: 20,
    pumpEfficiency: 0.75,
  },
  {
    label: "Seawater 150 GPM · Hs 50 ft",
    fluid: "seawater" as const,
    flow: 150,
    flowUnit: "gpm" as const,
    staticHead: 50,
    frictionHead: 15,
    pumpEfficiency: 0.7,
  },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </h4>
  );
}

export default function PumpTdhCalculator({ title, standard }: Props) {
  const { inputs, setField, setInputs } = useCalculatorUrlSync<PumpTdhInputs>(
    DEFAULT_PUMP_TDH_INPUTS,
    PUMP_TDH_URL_CONFIG,
    { type: "pump-tdh" },
  );

  const output = useMemo(() => calculatePumpTdh(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const headUnit = inputs.unitSystem === "imperial" ? "ft" : "m";
  const densityUnit = inputs.unitSystem === "imperial" ? "lb/ft³" : "kg/m³";
  const flowUnitLabel = inputs.flowUnit === "gpm" ? "GPM" : "m³/h";
  const presets =
    inputs.unitSystem === "imperial" ? IMPERIAL_PRESETS : METRIC_PRESETS;

  const fluidLabel =
    TDH_FLUID_OPTIONS.find((f) => f.value === inputs.fluid)?.shortLabel ??
    inputs.fluid;

  function onFluidChange(fluid: TdhFluid) {
    if (fluid === "custom") {
      setField("fluid", fluid);
      return;
    }
    const preset = applyFluidPreset(fluid, inputs.unitSystem);
    setInputs((current) => ({
      ...current,
      fluid,
      density: preset.density,
      viscosityCp: preset.viscosityCp,
    }));
  }

  function onFlowUnitChange(next: TdhFlowUnit) {
    setInputs((current) => ({
      ...current,
      flowUnit: next,
      flow: convertFlowBetweenUnits(current.flow, current.flowUnit, next),
    }));
  }

  function applyPreset(preset: (typeof METRIC_PRESETS)[number]) {
    const fluidPreset = applyFluidPreset(preset.fluid, inputs.unitSystem);
    setInputs((current) => ({
      ...current,
      fluid: preset.fluid,
      flow: preset.flow,
      flowUnit: preset.flowUnit,
      staticHead: preset.staticHead,
      frictionHead: preset.frictionHead,
      pressureHead: 0,
      pumpEfficiency: preset.pumpEfficiency,
      density: fluidPreset.density,
      viscosityCp: fluidPreset.viscosityCp,
    }));
  }

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        { label: "Fluid", value: fluidLabel },
        { label: "Q", value: `${inputs.flow} ${flowUnitLabel}` },
        {
          label: "Hs / Hf",
          value: `${inputs.staticHead} / ${inputs.frictionHead} ${headUnit}`,
        },
        {
          label: "η_p / SF",
          value: `${(inputs.pumpEfficiency * 100).toFixed(0)}% / ${inputs.serviceFactor.toFixed(2)}×`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Duty, TDH terms &amp; motor sizing
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active =
                inputs.fluid === preset.fluid &&
                inputs.flow === preset.flow &&
                inputs.staticHead === preset.staticHead;
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

          <SectionLabel>Fluid &amp; flow</SectionLabel>
          <FieldSelect
            label="Fluid"
            value={inputs.fluid}
            options={TDH_FLUID_OPTIONS.map((f) => ({
              value: f.value,
              label: f.label,
            }))}
            onChange={(value) => onFluidChange(value as TdhFluid)}
          />
          <FieldGroup
            label="Flow rate Q"
            value={inputs.flow}
            onChange={(value) => setField("flow", toNumber(value, inputs.flow))}
            unit={flowUnitLabel}
            hint="Operating capacity for power sizing (same point as OEM η_p)."
          />
          <FieldSelect
            label="Flow unit"
            value={inputs.flowUnit}
            options={[
              { value: "m3h", label: "m³/h" },
              { value: "gpm", label: "GPM" },
            ]}
            onChange={(value) => onFlowUnitChange(value as TdhFlowUnit)}
          />
          <FieldGroup
            label="Density ρ"
            value={inputs.density}
            onChange={(value) => {
              setInputs((current) => ({
                ...current,
                fluid: "custom",
                density: toNumber(value, current.density),
              }));
            }}
            unit={densityUnit}
          />
          <FieldGroup
            label="Viscosity μ"
            value={inputs.viscosityCp}
            onChange={(value) => {
              setInputs((current) => ({
                ...current,
                fluid: "custom",
                viscosityCp: toNumber(value, current.viscosityCp),
              }));
            }}
            unit="cP"
            hint="Screening only — HI viscosity corrections not applied."
          />

          <SectionLabel>TDH = Hs + Hf + Hp</SectionLabel>
          <FieldGroup
            label="Static head Hs"
            value={inputs.staticHead}
            onChange={(value) =>
              setField("staticHead", toNumber(value, inputs.staticHead))
            }
            unit={headUnit}
            hint="Discharge elevation − suction elevation (negative if downhill)."
          />
          <FieldGroup
            label="Friction head Hf"
            value={inputs.frictionHead}
            onChange={(value) =>
              setField("frictionHead", toNumber(value, inputs.frictionHead))
            }
            unit={headUnit}
            hint="Pipe + fittings + strainer. Convert ΔP → head via Hf = ΔP/(ρ g)."
          />
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Estimate Hf in{" "}
            <Link
              href="/calculator/pressure-drop-friction"
              className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
            >
              Pressure Drop &amp; Friction
            </Link>
            , then enter the head here.
          </p>
          <FieldGroup
            label="Pressure head Hp"
            value={inputs.pressureHead}
            onChange={(value) =>
              setField("pressureHead", toNumber(value, inputs.pressureHead))
            }
            unit={headUnit}
            hint="(Pd − Ps)/(ρ g). Open tanks at the same atmosphere ≈ 0."
          />

          <SectionLabel>Efficiencies &amp; motor SF</SectionLabel>
          <FieldGroup
            label="Pump efficiency η_p"
            value={Number((inputs.pumpEfficiency * 100).toFixed(1))}
            onChange={(value) =>
              setField(
                "pumpEfficiency",
                toEfficiency(value, inputs.pumpEfficiency),
              )
            }
            unit="%"
            hint="From OEM curve at this Q (not BEP if off-duty)."
          />
          <FieldGroup
            label="Motor efficiency η_m"
            value={Number((inputs.motorEfficiency * 100).toFixed(1))}
            onChange={(value) =>
              setField(
                "motorEfficiency",
                toEfficiency(value, inputs.motorEfficiency),
              )
            }
            unit="%"
            hint="Nameplate / IE-class efficiency at load."
          />
          <FieldGroup
            label="Motor service factor SF"
            value={inputs.serviceFactor}
            onChange={(value) =>
              setField(
                "serviceFactor",
                Math.min(1.5, Math.max(1, toNumber(value, inputs.serviceFactor))),
              )
            }
            unit="×"
            hint="Applied to motor input before IEC/NEMA pick (typical 1.0–1.15)."
          />
        </div>
      }
    />
  );
}
