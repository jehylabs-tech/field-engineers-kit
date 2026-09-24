"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import ValveBodySchematic from "@/components/calculator/schematics/ValveBodySchematic";
import FlangePtRatingChart from "@/components/calculator/schematics/FlangePtRatingChart";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import { useUnitSystem } from "@/components/units/UnitContext";
import {
  B1634_CLASS_OPTIONS,
  B1634_MATERIAL_OPTIONS,
  B1634_NPS_OPTIONS,
  DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS,
  DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS_IMPERIAL,
  calculateValveWallThicknessRating,
  computeValveWallThicknessRating,
  type B1634ClassId,
  type B1634MaterialId,
  type ValveWallThicknessRatingInputs,
} from "@/lib/calculators/engines/valve-wall-thickness-rating";
import { VALVE_WALL_THICKNESS_RATING_URL_CONFIG } from "@/lib/calculators/url-configs/valve-wall-thickness-rating";
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
  patch: Partial<ValveWallThicknessRatingInputs>;
};

const METRIC_PRESETS: Preset[] = [
  {
    id: "nps4-300",
    label: "NPS 4 · 300# · WCB",
    patch: { ...DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS },
  },
  {
    id: "nps8-600",
    label: "NPS 8 · 600# · CF8M",
    patch: {
      unitSystem: "metric",
      nps: "8",
      pressureClass: "600",
      insideDiameter: 203,
      designTemperature: 300,
      workingPressure: 55,
      materialId: "group-2.2-A351-CF8M-316",
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "nps3-150",
    label: "NPS 3 · 150# · A105",
    patch: { ...DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS_IMPERIAL },
  },
  {
    id: "nps6-900",
    label: "NPS 6 · 900# · A105",
    patch: {
      unitSystem: "imperial",
      nps: "6",
      pressureClass: "900",
      insideDiameter: 6,
      designTemperature: 400,
      workingPressure: 1500,
      materialId: "group-1.1-A105-WCB",
    },
  },
];

function presetMatches(
  inputs: ValveWallThicknessRatingInputs,
  preset: Preset,
): boolean {
  const p = preset.patch;
  return (
    inputs.unitSystem === (p.unitSystem ?? inputs.unitSystem) &&
    inputs.nps === (p.nps ?? inputs.nps) &&
    inputs.pressureClass === (p.pressureClass ?? inputs.pressureClass) &&
    inputs.materialId === (p.materialId ?? inputs.materialId)
  );
}

export default function ValveWallThicknessRatingCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setInputs, setField } =
    useCalculatorUrlSync<ValveWallThicknessRatingInputs>(
      DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS,
      VALVE_WALL_THICKNESS_RATING_URL_CONFIG,
      { type: "valve-wall-thickness-rating" },
    );

  const { unitSystem: navUnitSystem, setUnitSystem } = useUnitSystem();
  useEffect(() => {
    if (inputs.unitSystem === navUnitSystem) return;
    setUnitSystem(inputs.unitSystem);
  }, [inputs.unitSystem, navUnitSystem, setUnitSystem]);

  const output = useMemo(
    () => calculateValveWallThicknessRating(inputs),
    [inputs],
  );
  const detail = useMemo(
    () => computeValveWallThicknessRating(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const lenUnit = imperial ? "in" : "mm";
  const pressUnit = imperial ? "psi" : "bar";
  const tempUnit = imperial ? "°F" : "°C";
  const presets = imperial ? IMPERIAL_PRESETS : METRIC_PRESETS;
  const MM_PER_IN = 25.4;

  function applyPreset(
    preset:
      | (typeof METRIC_PRESETS)[number]
      | (typeof IMPERIAL_PRESETS)[number],
  ) {
    setInputs((current) => ({
      ...current,
      ...preset.patch,
      unitSystem: preset.patch.unitSystem ?? current.unitSystem,
    }));
  }

  const tmDisp = imperial
    ? detail.tmGoverningMm / MM_PER_IN
    : detail.tmGoverningMm;

  const schematic = (
    <ValveBodySchematic
      dLabel={`${inputs.insideDiameter} ${lenUnit}`}
      tmLabel={`${tmDisp.toFixed(imperial ? 3 : 2)} ${lenUnit}`}
      classLabel={`Class ${inputs.pressureClass}`}
      npsLabel={`NPS ${inputs.nps}`}
    />
  );

  const chart =
    detail.curve && detail.curve.length > 0 ? (
      <FlangePtRatingChart
        points={detail.curve}
        designTC={detail.tC}
        designPBar={detail.pDesignBar}
        classLabel={`Class ${inputs.pressureClass}`}
        groupLabel={detail.groupLabel}
        unitSystem={inputs.unitSystem}
        standardLabel="ASME B16.34"
        footnote="Standard Class P-T · design point highlighted · B16.34 Table 2 (≡ B16.5 Groups 1.1 / 2.2)"
      />
    ) : null;

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      afterHero={schematic}
      chart={chart}
      inputRows={[
        {
          label: "NPS · Class",
          value: `NPS ${inputs.nps} · Class ${inputs.pressureClass}`,
        },
        {
          label: "Inside diameter",
          value: `${inputs.insideDiameter} ${lenUnit}`,
        },
        {
          label: "Material",
          value:
            B1634_MATERIAL_OPTIONS.find((m) => m.value === inputs.materialId)
              ?.label ?? inputs.materialId,
        },
        {
          label: "Duty",
          value: `${inputs.workingPressure} ${pressUnit} @ ${inputs.designTemperature} ${tempUnit}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Valve size, class, material &amp; duty
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

          <SectionLabel>Size &amp; class</SectionLabel>
          <FieldSelect
            label="Nominal pipe size (NPS)"
            value={inputs.nps}
            onChange={(v) => setField("nps", v)}
            options={B1634_NPS_OPTIONS}
          />
          <FieldSelect
            label="Pressure class"
            value={inputs.pressureClass}
            onChange={(v) => setField("pressureClass", v as B1634ClassId)}
            options={B1634_CLASS_OPTIONS}
          />
          <FieldGroup
            label="Inside / port diameter (d)"
            value={inputs.insideDiameter}
            onChange={(value) =>
              setField(
                "insideDiameter",
                toNumber(value, inputs.insideDiameter),
              )
            }
            unit={lenUnit}
          />

          <SectionLabel>Material &amp; duty</SectionLabel>
          <FieldSelect
            label="Material group (Table 1A)"
            value={inputs.materialId}
            onChange={(v) => setField("materialId", v as B1634MaterialId)}
            options={B1634_MATERIAL_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
          <FieldGroup
            label="Design / operating temperature"
            value={inputs.designTemperature}
            onChange={(value) =>
              setField(
                "designTemperature",
                toNumber(value, inputs.designTemperature),
              )
            }
            unit={tempUnit}
          />
          <FieldGroup
            label="Design / working pressure"
            value={inputs.workingPressure}
            onChange={(value) =>
              setField(
                "workingPressure",
                toNumber(value, inputs.workingPressure),
              )
            }
            unit={pressUnit}
          />
        </div>
      }
    />
  );
}
