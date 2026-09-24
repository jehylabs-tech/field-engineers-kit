"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import TankVentingSchematic from "@/components/calculator/schematics/TankVentingSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import { useUnitSystem } from "@/components/units/UnitContext";
import {
  ENVIRONMENT_OPTIONS,
  LATITUDE_OPTIONS,
  VOLATILITY_OPTIONS,
  resolveEnvironment,
  resolveVolatility,
} from "@/lib/calculators/data/api2000VentingFactors";
import type {
  Api2000EnvironmentId,
  Api2000LatitudeId,
  Api2000VolatilityId,
} from "@/lib/calculators/data/api2000VentingFactors";
import {
  DEFAULT_API2000_TANK_VENTING_INPUTS,
  DEFAULT_API2000_TANK_VENTING_INPUTS_IMPERIAL,
  calculateApi2000TankVenting,
  computeApi2000TankVenting,
  type Api2000TankVentingInputs,
} from "@/lib/calculators/engines/api2000-tank-venting";
import { API2000_TANK_VENTING_URL_CONFIG } from "@/lib/calculators/url-configs/api2000-tank-venting";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </h4>
  );
}

type Preset = {
  id: string;
  label: string;
  patch: Partial<Api2000TankVentingInputs>;
};

const METRIC_PRESETS: Preset[] = [
  {
    id: "d15-h12",
    label: "Ø15 m · 200 m³/h",
    patch: { ...DEFAULT_API2000_TANK_VENTING_INPUTS },
  },
  {
    id: "d25-ins",
    label: "Ø25 m · insulated",
    patch: {
      unitSystem: "metric",
      tankDiameter: 25,
      tankHeight: 18,
      pumpInRate: 500,
      pumpOutRate: 600,
      volatility: "flash-point-above-37.8c",
      environment: "insulated",
      latentHeat: 310,
      molecularWeight: 100,
      latitude: "below-42-deg",
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "d50-1000gpm",
    label: "Ø50 ft · 1000 GPM",
    patch: { ...DEFAULT_API2000_TANK_VENTING_INPUTS_IMPERIAL },
  },
  {
    id: "d80-ins",
    label: "Ø80 ft · insulated",
    patch: {
      unitSystem: "imperial",
      tankDiameter: 80,
      tankHeight: 50,
      pumpInRate: 2000,
      pumpOutRate: 2500,
      volatility: "flash-point-above-37.8c",
      environment: "insulated",
      latentHeat: 135,
      molecularWeight: 110,
      latitude: "below-42-deg",
    },
  },
];

function presetMatches(
  inputs: Api2000TankVentingInputs,
  preset: Preset,
): boolean {
  const p = preset.patch;
  return (
    inputs.unitSystem === (p.unitSystem ?? inputs.unitSystem) &&
    inputs.tankDiameter === p.tankDiameter &&
    inputs.tankHeight === p.tankHeight &&
    inputs.pumpInRate === p.pumpInRate
  );
}

export default function Api2000TankVentingCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setInputs, setField } =
    useCalculatorUrlSync<Api2000TankVentingInputs>(
      DEFAULT_API2000_TANK_VENTING_INPUTS,
      API2000_TANK_VENTING_URL_CONFIG,
      { type: "api2000-tank-venting" },
    );

  const { unitSystem: navUnitSystem, setUnitSystem } = useUnitSystem();
  // Spec paths seed units in the path; keep the navbar toggle in sync so a
  // preferred-imperial user can still click Imperial and convert (not no-op).
  useEffect(() => {
    if (inputs.unitSystem === navUnitSystem) return;
    setUnitSystem(inputs.unitSystem);
  }, [inputs.unitSystem, navUnitSystem, setUnitSystem]);

  const output = useMemo(() => calculateApi2000TankVenting(inputs), [inputs]);
  const detail = useMemo(() => computeApi2000TankVenting(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const lenUnit = imperial ? "ft" : "m";
  const flowUnit = imperial ? "GPM" : "m³/h";
  const heatUnit = imperial ? "Btu/lb" : "kJ/kg";
  const presets = imperial ? IMPERIAL_PRESETS : METRIC_PRESETS;
  const ventUnit = imperial ? "SCFH" : "Nm³/h";

  function applyPreset(
    preset: (typeof METRIC_PRESETS)[number] | (typeof IMPERIAL_PRESETS)[number],
  ) {
    setInputs((current) => ({
      ...current,
      ...preset.patch,
      unitSystem: preset.patch.unitSystem ?? current.unitSystem,
    }));
  }

  const schematic = (
    <TankVentingSchematic
      dLabel={`${inputs.tankDiameter} ${lenUnit}`}
      hLabel={`${inputs.tankHeight} ${lenUnit}`}
      hWettLabel={`${(imperial ? detail.hWettedM / 0.3048 : detail.hWettedM).toFixed(imperial ? 1 : 2)} ${lenUnit}`}
      pumpInLabel={`${inputs.pumpInRate} ${flowUnit}`}
      pumpOutLabel={`${inputs.pumpOutRate} ${flowUnit}`}
      qFireLabel={
        imperial
          ? `${(detail.qFireKw * 3412.14).toFixed(0)} Btu/h`
          : `${detail.qFireKw.toFixed(0)} kW`
      }
      vOutLabel={`${(imperial ? detail.vOutTotalNm3h * 35.3147 : detail.vOutTotalNm3h).toFixed(0)} ${ventUnit}`}
      vEmerLabel={`${(imperial ? detail.vEmergencyNm3h * 35.3147 : detail.vEmergencyNm3h).toFixed(0)} ${ventUnit}`}
    />
  );

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      afterHero={schematic}
      inputRows={[
        {
          label: "Tank",
          value: `Ø${inputs.tankDiameter} × H ${inputs.tankHeight} ${lenUnit}`,
        },
        {
          label: "Pump-in / out",
          value: `${inputs.pumpInRate} / ${inputs.pumpOutRate} ${flowUnit}`,
        },
        {
          label: "Environment",
          value: resolveEnvironment(inputs.environment).label,
        },
        {
          label: "Volatility",
          value: resolveVolatility(inputs.volatility).label,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Tank geometry, transfer rates &amp; fire duty
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active = presetMatches(inputs, preset);
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

          <SectionLabel>Tank</SectionLabel>
          <FieldGroup
            label="Tank diameter (D)"
            value={inputs.tankDiameter}
            onChange={(value) =>
              setField("tankDiameter", toNumber(value, inputs.tankDiameter))
            }
            unit={lenUnit}
          />
          <FieldGroup
            label="Tank height (H)"
            value={inputs.tankHeight}
            onChange={(value) =>
              setField("tankHeight", toNumber(value, inputs.tankHeight))
            }
            unit={lenUnit}
          />

          <SectionLabel>Liquid transfer</SectionLabel>
          <FieldGroup
            label="Max pump-in rate"
            value={inputs.pumpInRate}
            onChange={(value) =>
              setField("pumpInRate", toNumber(value, inputs.pumpInRate))
            }
            unit={flowUnit}
            allowZero
          />
          <FieldGroup
            label="Max pump-out rate"
            value={inputs.pumpOutRate}
            onChange={(value) =>
              setField("pumpOutRate", toNumber(value, inputs.pumpOutRate))
            }
            unit={flowUnit}
            allowZero
          />

          <SectionLabel>Fluid &amp; site</SectionLabel>
          <FieldSelect
            label="Liquid flash / volatility"
            value={inputs.volatility}
            onChange={(v) =>
              setField("volatility", v as Api2000VolatilityId)
            }
            options={VOLATILITY_OPTIONS}
          />
          <FieldSelect
            label="Latitude"
            value={inputs.latitude}
            onChange={(v) => setField("latitude", v as Api2000LatitudeId)}
            options={LATITUDE_OPTIONS}
          />
          <FieldSelect
            label="Insulation / environment (F)"
            value={inputs.environment}
            onChange={(v) =>
              setField("environment", v as Api2000EnvironmentId)
            }
            options={ENVIRONMENT_OPTIONS}
          />
          <FieldGroup
            label="Latent heat (L_v)"
            value={inputs.latentHeat}
            onChange={(value) =>
              setField("latentHeat", toNumber(value, inputs.latentHeat))
            }
            unit={heatUnit}
          />
          <FieldGroup
            label="Vapor molecular weight (M)"
            value={inputs.molecularWeight}
            onChange={(value) =>
              setField(
                "molecularWeight",
                toNumber(value, inputs.molecularWeight),
              )
            }
            unit="g/mol"
          />
        </div>
      }
    />
  );
}
