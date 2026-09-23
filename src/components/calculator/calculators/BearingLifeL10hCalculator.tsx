"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import BearingLoadSchematic from "@/components/calculator/schematics/BearingLoadSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  BEARING_TYPE_OPTIONS,
  calculateBearingLifeL10h,
  computeBearingLifeL10h,
  DEFAULT_BEARING_LIFE_L10H_INPUTS,
  resolveAutoXy,
  resolveBearingFactor,
  type BearingLifeL10hInputs,
  type BearingTypeId,
  type BearingXyMode,
} from "@/lib/calculators/engines/bearing-life-l10h";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { BEARING_LIFE_L10H_URL_CONFIG } from "@/lib/calculators/url-configs/bearing-life-l10h";

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
  label: string;
  patch: Partial<BearingLifeL10hInputs>;
};

const METRIC_PRESETS: Preset[] = [
  {
    label: "Ball · C 32.5 kN · 1750 rpm",
    patch: {
      unitSystem: "metric",
      bearingType: "deep-groove-ball",
      dynamicLoadRating: 32.5,
      radialLoad: 4.5,
      axialLoad: 1.2,
      rotationalSpeed: 1750,
      radialFactor: 0.56,
      thrustFactor: 1.45,
      xyMode: "manual",
    },
  },
  {
    label: "Tapered · C 120 kN · 900 rpm",
    patch: {
      unitSystem: "metric",
      bearingType: "tapered-roller",
      dynamicLoadRating: 120,
      radialLoad: 25,
      axialLoad: 10,
      rotationalSpeed: 900,
      radialFactor: 0.4,
      thrustFactor: 1.5,
      xyMode: "manual",
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    label: "Ball · C 7500 lbf · 3600 rpm",
    patch: {
      unitSystem: "imperial",
      bearingType: "deep-groove-ball",
      dynamicLoadRating: 7500,
      radialLoad: 1000,
      axialLoad: 300,
      rotationalSpeed: 3600,
      radialFactor: 0.56,
      thrustFactor: 1.45,
      xyMode: "manual",
    },
  },
  {
    label: "Spherical · C 45000 lbf · 1200 rpm",
    patch: {
      unitSystem: "imperial",
      bearingType: "spherical-roller",
      dynamicLoadRating: 45000,
      radialLoad: 8000,
      axialLoad: 2000,
      rotationalSpeed: 1200,
      radialFactor: 1.0,
      thrustFactor: 2.5,
      xyMode: "manual",
    },
  },
];

function presetMatches(
  inputs: BearingLifeL10hInputs,
  preset: Preset,
): boolean {
  const p = preset.patch;
  return (
    (p.bearingType == null || inputs.bearingType === p.bearingType) &&
    (p.dynamicLoadRating == null ||
      inputs.dynamicLoadRating === p.dynamicLoadRating) &&
    (p.radialLoad == null || inputs.radialLoad === p.radialLoad) &&
    (p.rotationalSpeed == null ||
      inputs.rotationalSpeed === p.rotationalSpeed) &&
    (p.unitSystem == null || inputs.unitSystem === p.unitSystem)
  );
}

export default function BearingLifeL10hCalculator({ title, standard }: Props) {
  const { inputs, setField, setInputs } = useCalculatorUrlSync<BearingLifeL10hInputs>(
    DEFAULT_BEARING_LIFE_L10H_INPUTS,
    BEARING_LIFE_L10H_URL_CONFIG,
    { type: "bearing-life-l10h" },
  );

  // Keep auto X/Y in sync when loads or type change.
  useEffect(() => {
    if (inputs.xyMode !== "auto") return;
    const auto = resolveAutoXy(
      inputs.bearingType,
      inputs.radialLoad,
      inputs.axialLoad,
    );
    if (
      Math.abs(auto.x - inputs.radialFactor) < 1e-9 &&
      Math.abs(auto.y - inputs.thrustFactor) < 1e-9
    ) {
      return;
    }
    setInputs((current) => ({
      ...current,
      radialFactor: auto.x,
      thrustFactor: auto.y,
    }));
  }, [
    inputs.xyMode,
    inputs.bearingType,
    inputs.radialLoad,
    inputs.axialLoad,
    inputs.radialFactor,
    inputs.thrustFactor,
    setInputs,
  ]);

  const output = useMemo(() => calculateBearingLifeL10h(inputs), [inputs]);
  const computed = useMemo(() => computeBearingLifeL10h(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const forceUnit = inputs.unitSystem === "imperial" ? "lbf" : "kN";
  const presets =
    inputs.unitSystem === "imperial" ? IMPERIAL_PRESETS : METRIC_PRESETS;

  function applyPreset(preset: Preset) {
    setInputs((current) => ({
      ...current,
      ...preset.patch,
      unitSystem: preset.patch.unitSystem ?? current.unitSystem,
    }));
  }

  function onBearingType(next: BearingTypeId) {
    setInputs((current) => {
      if (current.xyMode === "auto") {
        const auto = resolveAutoXy(
          next,
          current.radialLoad,
          current.axialLoad,
        );
        return {
          ...current,
          bearingType: next,
          radialFactor: auto.x,
          thrustFactor: auto.y,
        };
      }
      const row = resolveBearingFactor(next);
      return {
        ...current,
        bearingType: next,
        radialFactor: row.x2,
        thrustFactor: row.y2,
      };
    });
  }

  function onXyMode(mode: BearingXyMode) {
    setInputs((current) => {
      if (mode === "auto") {
        const auto = resolveAutoXy(
          current.bearingType,
          current.radialLoad,
          current.axialLoad,
        );
        return {
          ...current,
          xyMode: mode,
          radialFactor: auto.x,
          thrustFactor: auto.y,
        };
      }
      return { ...current, xyMode: mode };
    });
  }

  const schematic = (
    <BearingLoadSchematic
      frLabel={`${computed.invalid ? "—" : inputs.radialLoad} ${forceUnit}`}
      faLabel={`${computed.invalid ? "—" : inputs.axialLoad} ${forceUnit}`}
      nLabel={`${inputs.rotationalSpeed} rpm`}
      pLabel={
        computed.invalid
          ? "—"
          : `${computed.P.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${forceUnit}`
      }
      bearingLabel={computed.typeLabel}
      category={computed.category}
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
          label: "Type",
          value:
            BEARING_TYPE_OPTIONS.find((o) => o.value === inputs.bearingType)
              ?.label ?? inputs.bearingType,
        },
        { label: "C", value: `${inputs.dynamicLoadRating} ${forceUnit}` },
        {
          label: "F_r / F_a",
          value: `${inputs.radialLoad} / ${inputs.axialLoad} ${forceUnit}`,
        },
        { label: "n", value: `${inputs.rotationalSpeed} rpm` },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Bearing duty &amp; load factors
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active = presetMatches(inputs, preset);
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

          <SectionLabel>Bearing</SectionLabel>
          <FieldSelect
            label="Bearing type"
            value={inputs.bearingType}
            onChange={(v) => onBearingType(v as BearingTypeId)}
            options={BEARING_TYPE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
          <FieldGroup
            label="Basic dynamic load rating (C)"
            value={inputs.dynamicLoadRating}
            onChange={(value) =>
              setField("dynamicLoadRating", toNumber(value, inputs.dynamicLoadRating))
            }
            unit={forceUnit}
            hint="Catalog basic dynamic load rating C."
          />

          <SectionLabel>Loads &amp; speed</SectionLabel>
          <FieldGroup
            label="Radial load (F_r)"
            value={inputs.radialLoad}
            onChange={(value) =>
              setField("radialLoad", toNumber(value, inputs.radialLoad))
            }
            unit={forceUnit}
          />
          <FieldGroup
            label="Axial / thrust load (F_a)"
            value={inputs.axialLoad}
            onChange={(value) =>
              setField("axialLoad", toNumber(value, inputs.axialLoad))
            }
            unit={forceUnit}
            allowZero
          />
          <FieldGroup
            label="Rotational speed (n)"
            value={inputs.rotationalSpeed}
            onChange={(value) =>
              setField("rotationalSpeed", toNumber(value, inputs.rotationalSpeed))
            }
            unit="rpm"
          />

          <SectionLabel>Factors X · Y</SectionLabel>
          <FieldSelect
            label="X / Y mode"
            value={inputs.xyMode}
            onChange={(v) => onXyMode(v as BearingXyMode)}
            options={[
              { value: "manual", label: "Manual (catalog X, Y)" },
              { value: "auto", label: "Auto from type (Fa/Fr vs e)" },
            ]}
            hint="Auto uses screening X₁/Y₁ or X₂/Y₂ when F_a/F_r crosses e. Confirm OEM tables for final selection."
          />
          <FieldGroup
            label="Radial factor (X)"
            value={inputs.radialFactor}
            onChange={(value) =>
              setField("radialFactor", toNumber(value, inputs.radialFactor))
            }
            unit="—"
            disabled={inputs.xyMode === "auto"}
          />
          <FieldGroup
            label="Thrust factor (Y)"
            value={inputs.thrustFactor}
            onChange={(value) =>
              setField("thrustFactor", toNumber(value, inputs.thrustFactor))
            }
            unit="—"
            allowZero
            disabled={inputs.xyMode === "auto"}
          />
        </div>
      }
    />
  );
}
