"use client";

import { useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import InsulationCrossSection from "@/components/calculator/schematics/InsulationCrossSection";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateInsulationHeatLoss,
  computeInsulationHeatLoss,
  DEFAULT_INSULATION_HEAT_LOSS_INPUTS,
  INSULATION_MATERIAL_OPTIONS,
  type InsulationHeatLossInputs,
  type InsulationMaterial,
} from "@/lib/calculators/engines/insulation-heat-loss";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { INSULATION_HEAT_LOSS_URL_CONFIG } from "@/lib/calculators/url-configs/insulation-heat-loss";
import { listAvailableNps } from "@/lib/data/loaders";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type Preset = {
  id: string;
  label: string;
  patch: Partial<InsulationHeatLossInputs>;
};

const EMISSIVITY_CHIPS = [
  { value: "0.1", label: "0.10 Bright Al" },
  { value: "0.4", label: "0.40 Weathered Al" },
  { value: "0.9", label: "0.90 Painted" },
];

const METRIC_PRESETS: Preset[] = [
  {
    id: "mw-4-50",
    label: "4\" · 50 mm MW",
    patch: {
      unitSystem: "metric",
      nps: "4",
      material: "mineral-wool",
      insulationThickness: 50,
      operatingTemp: 200,
      ambientTemp: 25,
      windSpeed: 2,
      emissivity: 0.9,
    },
  },
  {
    id: "cs-6-75",
    label: "6\" · 75 mm CaSi",
    patch: {
      unitSystem: "metric",
      nps: "6",
      material: "calcium-silicate",
      insulationThickness: 75,
      operatingTemp: 350,
      ambientTemp: 25,
      windSpeed: 2,
      emissivity: 0.9,
    },
  },
  {
    id: "cg-8-75",
    label: "8\" · 75 mm CG",
    patch: {
      unitSystem: "metric",
      nps: "8",
      material: "cellular-glass",
      insulationThickness: 75,
      operatingTemp: 150,
      ambientTemp: 20,
      windSpeed: 1,
      emissivity: 0.9,
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "mw-3-2in",
    label: "3\" · 2 in MW",
    patch: {
      unitSystem: "imperial",
      nps: "3",
      material: "mineral-wool",
      insulationThickness: 2,
      operatingTemp: 400,
      ambientTemp: 77,
      windSpeed: 4.5,
      emissivity: 0.9,
    },
  },
  {
    id: "cg-8-3in",
    label: "8\" · 3 in CG",
    patch: {
      unitSystem: "imperial",
      nps: "8",
      material: "cellular-glass",
      insulationThickness: 3,
      operatingTemp: 500,
      ambientTemp: 77,
      windSpeed: 4.5,
      emissivity: 0.9,
    },
  },
];

export default function InsulationHeatLossCalculator({ title, standard }: Props) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<InsulationHeatLossInputs>(
      DEFAULT_INSULATION_HEAT_LOSS_INPUTS,
      INSULATION_HEAT_LOSS_URL_CONFIG,
      { type: "insulation-heat-loss" },
    );

  const output = useMemo(() => calculateInsulationHeatLoss(inputs), [inputs]);
  const computed = useMemo(() => computeInsulationHeatLoss(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const tempUnit = inputs.unitSystem === "imperial" ? "°F" : "°C";
  const thickUnit = inputs.unitSystem === "imperial" ? "in" : "mm";
  const windUnit = inputs.unitSystem === "imperial" ? "mph" : "m/s";

  const materialMeta =
    INSULATION_MATERIAL_OPTIONS.find((m) => m.value === inputs.material) ??
    INSULATION_MATERIAL_OPTIONS[0];

  const materialOptions = useMemo(
    () =>
      INSULATION_MATERIAL_OPTIONS.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    [],
  );

  const npsOptions = useMemo(
    () =>
      listAvailableNps().map((pipe) => ({
        value: pipe.nps,
        label: `${pipe.npsLabel} (DN ${pipe.dn})`,
      })),
    [],
  );

  const presets =
    inputs.unitSystem === "imperial" ? IMPERIAL_PRESETS : METRIC_PRESETS;

  function applyPreset(preset: Preset) {
    setInputs((current) => ({
      ...current,
      ...preset.patch,
    }));
  }

  const thicknessLabel = `${inputs.insulationThickness} ${thickUnit}`;
  const odDual = `B36 OD = ${computed.odMm.toFixed(1)} mm / ${(computed.odMm / 25.4).toFixed(3)} in`;
  const tsLabel = computed.invalid
    ? "—"
    : `${computed.tsC.toFixed(1)} °C · ${((computed.tsC * 9) / 5 + 32).toFixed(1)} °F`;
  const qBtu = computed.qWm * 1.040014;
  const qLabel = computed.invalid
    ? "—"
    : inputs.unitSystem === "imperial"
      ? `${qBtu.toFixed(1)} Btu/hr·ft · ${computed.qWm.toFixed(1)} W/m`
      : `${computed.qWm.toFixed(1)} W/m · ${qBtu.toFixed(1)} Btu/hr·ft`;

  const thickHint =
    inputs.unitSystem === "imperial"
      ? "Typical pipe insulation 0.5–8 in. Presets seed common field thicknesses."
      : "Typical pipe insulation 12.5–200 mm. Presets seed common field thicknesses.";
  const emissivityHint =
    "ε 0.05–1. Painted metal jacket ≈ 0.9; bright aluminum ≈ 0.1–0.4; weathered aluminum ≈ 0.4.";

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        { label: "NPS", value: `${inputs.nps}"` },
        { label: "Material", value: materialMeta.shortLabel },
        { label: "Thickness", value: thicknessLabel },
        {
          label: "T_h / T_a",
          value: `${inputs.operatingTemp} / ${inputs.ambientTemp} ${tempUnit}`,
        },
        { label: "Wind", value: `${inputs.windSpeed} ${windUnit}` },
        { label: "ε", value: inputs.emissivity.toFixed(2) },
      ]}
      visual={
        <InsulationCrossSection
          npsLabel={`NPS ${inputs.nps}`}
          thicknessLabel={thicknessLabel}
          materialLabel={materialMeta.shortLabel}
          tsLabel={tsLabel}
          qLabel={qLabel}
          unitSystem={inputs.unitSystem}
        />
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Pipe, insulation &amp; duty
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active =
                inputs.nps === preset.patch.nps &&
                inputs.material === preset.patch.material &&
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
              setField("material", value as InsulationMaterial)
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
            label="Operating temperature T_h"
            unit={tempUnit}
            value={inputs.operatingTemp}
            onChange={(value) =>
              setField("operatingTemp", toNumber(value, inputs.operatingTemp))
            }
          />
          <FieldGroup
            label="Ambient temperature T_a"
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
            hint="Outdoor cross-flow screening. Still air ≈ 0; light breeze ≈ 1–2 m/s (≈2–4.5 mph)."
            value={inputs.windSpeed}
            onChange={(value) =>
              setField("windSpeed", toNumber(value, inputs.windSpeed))
            }
          />
          <FieldGroup
            label="Surface emissivity ε"
            unit="—"
            hint={emissivityHint}
            chips={EMISSIVITY_CHIPS}
            value={inputs.emissivity}
            onChange={(value) =>
              setField("emissivity", toNumber(value, inputs.emissivity))
            }
          />
        </div>
      }
    />
  );
}
