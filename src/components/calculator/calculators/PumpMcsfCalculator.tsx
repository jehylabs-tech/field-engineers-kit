"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  applyMcsfFluidPreset,
  calculatePumpMcsf,
  convertFlowBetweenUnits,
  DEFAULT_PUMP_MCSF_INPUTS,
  MCSF_FLUID_OPTIONS,
  sgFromDensityKgM3,
  type McsfFlowUnit,
  type McsfFluid,
  type PumpMcsfInputs,
} from "@/lib/calculators/engines/pump-mcsf";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PUMP_MCSF_URL_CONFIG } from "@/lib/calculators/url-configs/pump-mcsf";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toRatio(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed > 1) return Math.min(1, parsed / 100);
  return Math.max(0.05, parsed);
}

const METRIC_PRESETS = [
  {
    label: "Water 200 m³/h · 110 kW",
    fluid: "water" as const,
    flowBep: 200,
    flowUnit: "m3h" as const,
    headShutoff: 150,
    powerRated: 110,
    deltaTMax: 5,
    mcsfRatio: 0.35,
    soPowerRatio: 0.5,
    bypassDp: 10,
    bypassVmax: 3,
    flowOp: 0,
  },
  {
    label: "BFW 150 m³/h · 200 kW",
    fluid: "water-hot" as const,
    flowBep: 150,
    flowUnit: "m3h" as const,
    headShutoff: 300,
    powerRated: 200,
    deltaTMax: 5,
    mcsfRatio: 0.4,
    soPowerRatio: 0.5,
    bypassDp: 15,
    bypassVmax: 3,
    flowOp: 0,
  },
  {
    label: "Naphtha 350 m³/h · 160 kW",
    fluid: "naphtha" as const,
    flowBep: 350,
    flowUnit: "m3h" as const,
    headShutoff: 180,
    powerRated: 160,
    deltaTMax: 5,
    mcsfRatio: 0.35,
    soPowerRatio: 0.5,
    bypassDp: 12,
    bypassVmax: 3,
    flowOp: 0,
  },
];

const IMPERIAL_PRESETS = [
  {
    label: "Crude 1200 GPM · 250 HP",
    fluid: "crude" as const,
    flowBep: 1200,
    flowUnit: "gpm" as const,
    headShutoff: 450,
    powerRated: 250,
    deltaTMax: 9,
    mcsfRatio: 0.35,
    soPowerRatio: 0.5,
    bypassDp: 145,
    bypassVmax: 10,
    flowOp: 0,
  },
  {
    label: "Amine 800 GPM · 300 HP",
    fluid: "amine" as const,
    flowBep: 800,
    flowUnit: "gpm" as const,
    headShutoff: 650,
    powerRated: 300,
    deltaTMax: 9,
    mcsfRatio: 0.4,
    soPowerRatio: 0.5,
    bypassDp: 200,
    bypassVmax: 10,
    flowOp: 0,
  },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </h4>
  );
}

export default function PumpMcsfCalculator({ title, standard }: Props) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<PumpMcsfInputs>(
      DEFAULT_PUMP_MCSF_INPUTS,
      PUMP_MCSF_URL_CONFIG,
      { type: "pump-mcsf" },
    );

  const output = useMemo(() => calculatePumpMcsf(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const headUnit = inputs.unitSystem === "imperial" ? "ft" : "m";
  const powerUnit = inputs.unitSystem === "imperial" ? "HP" : "kW";
  const densUnit = inputs.unitSystem === "imperial" ? "lb/ft³" : "kg/m³";
  const cpUnit =
    inputs.unitSystem === "imperial" ? "Btu/lb·°F" : "kJ/kg·°C";
  const tempUnit = inputs.unitSystem === "imperial" ? "°F" : "°C";
  const dTUnit = tempUnit;
  const dpUnit = inputs.unitSystem === "imperial" ? "psi" : "bar";
  const velUnit = inputs.unitSystem === "imperial" ? "ft/s" : "m/s";
  const flowUnitLabel = inputs.flowUnit === "gpm" ? "GPM" : "m³/h";
  const presets =
    inputs.unitSystem === "imperial" ? IMPERIAL_PRESETS : METRIC_PRESETS;
  const fluidShort =
    MCSF_FLUID_OPTIONS.find((f) => f.value === inputs.fluid)?.shortLabel ??
    inputs.fluid;

  function onFluidChange(fluid: McsfFluid) {
    setInputs((current) => applyMcsfFluidPreset(fluid, current));
  }

  function onFlowUnitChange(next: McsfFlowUnit) {
    setInputs((current) => ({
      ...current,
      flowUnit: next,
      flowBep: convertFlowBetweenUnits(
        current.flowBep,
        current.flowUnit,
        next,
      ),
      flowOp:
        current.flowOp > 0
          ? convertFlowBetweenUnits(
              current.flowOp,
              current.flowUnit,
              next,
            )
          : 0,
    }));
  }

  function applyPreset(preset: (typeof METRIC_PRESETS)[number]) {
    setInputs((current) => {
      const withDuty: PumpMcsfInputs = {
        ...current,
        ...preset,
      };
      return applyMcsfFluidPreset(preset.fluid, withDuty);
    });
  }

  function syncSgFromDensity(density: number) {
    const rhoKg =
      inputs.unitSystem === "imperial" ? density / 0.06242796 : density;
    setInputs((current) => ({
      ...current,
      density,
      sg: Number(sgFromDensityKgM3(rhoKg).toFixed(3)),
      fluid: "custom",
    }));
  }

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        { label: "Fluid", value: fluidShort },
        {
          label: "Q_BEP",
          value: `${inputs.flowBep} ${flowUnitLabel}`,
        },
        {
          label: "H_so",
          value: `${inputs.headShutoff} ${headUnit}`,
        },
        {
          label: "P_rated",
          value: `${inputs.powerRated} ${powerUnit}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Duty, fluid &amp; MCSF limits
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active =
                inputs.fluid === preset.fluid &&
                inputs.flowBep === preset.flowBep &&
                inputs.headShutoff === preset.headShutoff &&
                inputs.powerRated === preset.powerRated;
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

          <SectionLabel>Pump duty</SectionLabel>
          <FieldSelect
            label="Fluid preset"
            value={inputs.fluid}
            options={MCSF_FLUID_OPTIONS.map((f) => ({
              value: f.value,
              label: f.label,
            }))}
            onChange={(value) => onFluidChange(value as McsfFluid)}
          />
          <FieldGroup
            label="Best efficiency flow Q_BEP"
            value={inputs.flowBep}
            onChange={(value) =>
              setField("flowBep", toNumber(value, inputs.flowBep))
            }
            unit={flowUnitLabel}
            hint="Published BEP capacity from OEM curve / datasheet."
          />
          <FieldSelect
            label="Flow unit"
            value={inputs.flowUnit}
            options={[
              { value: "m3h", label: "m³/h" },
              { value: "gpm", label: "GPM" },
            ]}
            onChange={(value) => onFlowUnitChange(value as McsfFlowUnit)}
          />
          <FieldGroup
            label="Operating flow Q_op (optional)"
            value={inputs.flowOp}
            onChange={(value) =>
              setField("flowOp", toNumber(value, inputs.flowOp))
            }
            unit={flowUnitLabel}
            allowZero
            hint="Leave 0 if unused. If Q_op < Q_MCSF the tool flags continuous low-flow risk."
          />
          <FieldGroup
            label="Shut-off head H_so"
            value={inputs.headShutoff}
            onChange={(value) =>
              setField("headShutoff", toNumber(value, inputs.headShutoff))
            }
            unit={headUnit}
            hint="Zero-flow head from the pump curve (or max impeller shut-off)."
          />
          <FieldGroup
            label="Rated driver power P_rated"
            value={inputs.powerRated}
            onChange={(value) =>
              setField("powerRated", toNumber(value, inputs.powerRated))
            }
            unit={powerUnit}
            hint="Motor / turbine nameplate. >300 kW triggers high-energy ARC alert."
          />

          <SectionLabel>Fluid properties</SectionLabel>
          <FieldGroup
            label="Operating temperature"
            value={inputs.fluidTemp}
            onChange={(value) =>
              setField("fluidTemp", toNumber(value, inputs.fluidTemp))
            }
            unit={tempUnit}
            allowZero
            allowNegative
            hint="Context for hot service — does not replace vapor-pressure / NPSH checks."
          />
          <FieldGroup
            label="Density ρ"
            value={inputs.density}
            onChange={(value) =>
              syncSgFromDensity(toNumber(value, inputs.density))
            }
            unit={densUnit}
            hint="Editing density switches to Custom and refreshes SG."
          />
          <FieldGroup
            label="Specific heat Cp"
            value={inputs.cp}
            onChange={(value) => {
              const cp = toNumber(value, inputs.cp);
              setInputs((current) => ({
                ...current,
                cp,
                fluid: "custom",
              }));
            }}
            unit={cpUnit}
            hint="Metric water ≈ 4.18 kJ/kg·°C; imperial water ≈ 1.0 Btu/lb·°F."
          />
          <FieldGroup
            label="Specific gravity SG"
            value={inputs.sg}
            onChange={(value) => {
              const sg = toNumber(value, inputs.sg);
              setInputs((current) => ({
                ...current,
                sg,
                fluid: "custom",
              }));
            }}
            unit="—"
            hint="Used for ARC liquid Cv. Default SG = ρ / 1000 kg/m³."
          />

          <SectionLabel>MCSF &amp; thermal limits</SectionLabel>
          <FieldGroup
            label="Max allowable ΔT"
            value={inputs.deltaTMax}
            onChange={(value) =>
              setField("deltaTMax", toNumber(value, inputs.deltaTMax))
            }
            unit={dTUnit}
            hint="Common screening default 5 °C (9 °F). Tighten for flashing / seal limits."
          />
          <FieldGroup
            label="Hydro MCSF ratio (of Q_BEP)"
            value={Number((inputs.mcsfRatio * 100).toFixed(1))}
            onChange={(value) =>
              setField("mcsfRatio", toRatio(value, inputs.mcsfRatio))
            }
            unit="%"
            hint="Typical API/OEM band ~30–60% of Q_BEP (Ns-dependent). Enter 35 for 35%."
          />
          <FieldGroup
            label="Shut-off power ratio P_so/P_rated"
            value={Number((inputs.soPowerRatio * 100).toFixed(0))}
            onChange={(value) =>
              setField("soPowerRatio", toRatio(value, inputs.soPowerRatio))
            }
            unit="%"
            hint="API 610 centrifugals often ~40–60% at shut-off. Default 50%."
          />
          <FieldGroup
            label="Low-flow η_min (HI ΔT check)"
            value={Number((inputs.etaMin * 100).toFixed(0))}
            onChange={(value) =>
              setField("etaMin", toRatio(value, inputs.etaMin))
            }
            unit="%"
            hint="Only for ΔT = g·H·(1−η)/(Cp·η) comparison — not used in Q_min,th."
          />

          <SectionLabel>Bypass / ARC sizing</SectionLabel>
          <FieldGroup
            label="Bypass pressure drop ΔP"
            value={inputs.bypassDp}
            onChange={(value) =>
              setField("bypassDp", toNumber(value, inputs.bypassDp))
            }
            unit={dpUnit}
            hint="Differential across ARC / min-flow valve (pump discharge − recycle destination)."
          />
          <FieldGroup
            label="Max bypass velocity"
            value={inputs.bypassVmax}
            onChange={(value) =>
              setField("bypassVmax", toNumber(value, inputs.bypassVmax))
            }
            unit={velUnit}
            hint="Sch 40 line pick target. Default 3 m/s (≈ 10 ft/s)."
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
              href="/calculator/pump-npsh-cavitation"
              className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
            >
              Pump NPSH
            </Link>
            ,{" "}
            <Link
              href="/calculator/pressure-drop-friction"
              className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
            >
              Pressure Drop
            </Link>
            , and{" "}
            <Link
              href="/calculator/flow-velocity-erosion"
              className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
            >
              Flow Velocity
            </Link>
            .
          </p>
        </div>
      }
    />
  );
}
