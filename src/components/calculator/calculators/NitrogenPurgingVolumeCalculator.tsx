"use client";

import { useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import NitrogenPurgeSchematic from "@/components/calculator/schematics/NitrogenPurgeSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateNitrogenPurgingVolume,
  computeNitrogenPurgingVolume,
  DEFAULT_NITROGEN_PURGING_VOLUME_INPUTS,
  NITROGEN_GEOMETRY_OPTIONS,
  NITROGEN_NPS_OPTIONS,
  NITROGEN_PURGE_METHOD_OPTIONS,
  type NitrogenGeometryType,
  type NitrogenPurgeMethod,
  type NitrogenPurgingVolumeInputs,
} from "@/lib/calculators/engines/nitrogen-purging-volume";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { NITROGEN_PURGING_VOLUME_URL_CONFIG } from "@/lib/calculators/url-configs/nitrogen-purging-volume";

const MIXING_K_CHIPS = [
  { value: "0.25", label: "0.25 Poor" },
  { value: "0.5", label: "0.50 Fair" },
  { value: "0.75", label: "0.75 Typical" },
  { value: "1", label: "1.00 Ideal" },
];

function defaultCyclePressure(
  method: NitrogenPurgeMethod,
  unitSystem: NitrogenPurgingVolumeInputs["unitSystem"],
): number {
  if (method === "vacuum-cycle") {
    return unitSystem === "imperial" ? 2.9 : 0.2;
  }
  if (method === "pressure-cycle") {
    return unitSystem === "imperial" ? 45 : 3;
  }
  return unitSystem === "imperial" ? 45 : 3;
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type Props = { title: string; standard?: string };

type Preset = {
  id: string;
  label: string;
  patch: Partial<NitrogenPurgingVolumeInputs>;
};

const METRIC_PRESETS: Preset[] = [
  {
    id: "pipe-dilution-12",
    label: "Pipe · NPS 12 · dilution",
    patch: {
      unitSystem: "metric",
      geometryType: "piping",
      pipeNps: "12",
      pipeSchedule: "40",
      pipeLength: 100,
      purgeMethod: "dilution-sweep",
      initialO2: 21,
      targetO2: 5,
      purgeFlowRate: 50,
      mixingEfficiency: 0.75,
    },
  },
  {
    id: "vessel-pcycle",
    label: "Vessel · pressure cycle",
    patch: {
      unitSystem: "metric",
      geometryType: "vessel",
      vesselDiameter: 2000,
      vesselLength: 6000,
      purgeMethod: "pressure-cycle",
      initialO2: 21,
      targetO2: 5,
      cycleHighPressure: 3,
    },
  },
  {
    id: "custom-dilution",
    label: "Custom · 50 m³ dilution",
    patch: {
      unitSystem: "metric",
      geometryType: "custom-volume",
      customVolume: 50,
      purgeMethod: "dilution-sweep",
      initialO2: 21,
      targetO2: 2,
      purgeFlowRate: 80,
      mixingEfficiency: 0.8,
    },
  },
  {
    id: "vessel-vacuum",
    label: "Vessel · vacuum cycle",
    patch: {
      unitSystem: "metric",
      geometryType: "vessel",
      vesselDiameter: 2000,
      vesselLength: 6000,
      purgeMethod: "vacuum-cycle",
      initialO2: 21,
      targetO2: 5,
      cycleHighPressure: 0.2,
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "pipe-24-dilution",
    label: "Pipe · NPS 24 · dilution",
    patch: {
      unitSystem: "imperial",
      geometryType: "piping",
      pipeNps: "24",
      pipeSchedule: "40",
      pipeLength: 500,
      purgeMethod: "dilution-sweep",
      initialO2: 21,
      targetO2: 1,
      purgeFlowRate: 100,
      mixingEfficiency: 0.75,
    },
  },
  {
    id: "custom-pcycle",
    label: "Custom · 1000 ft³ cycle",
    patch: {
      unitSystem: "imperial",
      geometryType: "custom-volume",
      customVolume: 1000,
      purgeMethod: "pressure-cycle",
      initialO2: 21,
      targetO2: 2,
      cycleHighPressure: 45,
    },
  },
  {
    id: "custom-vacuum",
    label: "Custom · 1000 ft³ vacuum",
    patch: {
      unitSystem: "imperial",
      geometryType: "custom-volume",
      customVolume: 1000,
      purgeMethod: "vacuum-cycle",
      initialO2: 21,
      targetO2: 2,
      cycleHighPressure: 2.9,
    },
  },
];

export default function NitrogenPurgingVolumeCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<NitrogenPurgingVolumeInputs>(
      DEFAULT_NITROGEN_PURGING_VOLUME_INPUTS,
      NITROGEN_PURGING_VOLUME_URL_CONFIG,
      { type: "nitrogen-purging-volume" },
    );

  const output = useMemo(
    () => calculateNitrogenPurgingVolume(inputs),
    [inputs],
  );
  const computed = useMemo(
    () => computeNitrogenPurgingVolume(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const isImperial = inputs.unitSystem === "imperial";
  const lengthUnit =
    inputs.geometryType === "piping"
      ? isImperial
        ? "ft"
        : "m"
      : isImperial
        ? "in"
        : "mm";
  const volUnit = isImperial ? "ft³" : "m³";
  const flowUnit = isImperial ? "SCFM" : "Nm³/h";
  const pressureUnit =
    inputs.purgeMethod === "vacuum-cycle"
      ? isImperial
        ? "psia"
        : "bar(a)"
      : isImperial
        ? "psig"
        : "bar(g)";

  const methodMeta =
    NITROGEN_PURGE_METHOD_OPTIONS.find((m) => m.value === inputs.purgeMethod) ??
    NITROGEN_PURGE_METHOD_OPTIONS[0];

  const presets = isImperial ? IMPERIAL_PRESETS : METRIC_PRESETS;

  function applyPreset(preset: Preset) {
    setInputs((current) => ({ ...current, ...preset.patch }));
  }

  const volumeLabel = computed.invalid
    ? "—"
    : isImperial
      ? `${(computed.vSysM3 * 35.3146667).toFixed(1)} ft³`
      : `${computed.vSysM3.toFixed(2)} m³`;
  const o2Label = `${inputs.initialO2.toFixed(1)}% → ${inputs.targetO2.toFixed(2)}%`;
  const n2Label = computed.invalid
    ? "—"
    : isImperial
      ? `${(computed.vN2Nm3 * 35.3146667).toFixed(0)} SCF`
      : `${computed.vN2Nm3.toFixed(2)} Nm³`;

  const oxygenFraction = Math.min(1, Math.max(0, inputs.targetO2 / 21));

  const inputRows = [
    {
      label: "Geometry",
      value:
        inputs.geometryType === "piping"
          ? `NPS ${inputs.pipeNps}`
          : inputs.geometryType === "vessel"
            ? "Vessel"
            : "Custom",
    },
    { label: "Method", value: methodMeta.shortLabel },
    { label: "O₂", value: o2Label },
    ...(inputs.purgeMethod === "dilution-sweep"
      ? [{ label: "K", value: inputs.mixingEfficiency.toFixed(2) }]
      : [
          {
            label: inputs.purgeMethod === "vacuum-cycle" ? "P_vac" : "P_high",
            value: `${inputs.cycleHighPressure} ${pressureUnit}`,
          },
        ]),
  ];

  function onPurgeMethodChange(value: NitrogenPurgeMethod) {
    setInputs((current) => {
      const nextPressure = defaultCyclePressure(value, current.unitSystem);
      // Always reset when switching pressure ↔ vacuum (absolute vs gauge).
      const crossingAbsGauge =
        (current.purgeMethod === "pressure-cycle" &&
          value === "vacuum-cycle") ||
        (current.purgeMethod === "vacuum-cycle" &&
          value === "pressure-cycle");
      const enteringCycle =
        (value === "pressure-cycle" || value === "vacuum-cycle") &&
        current.purgeMethod !== value;
      return {
        ...current,
        purgeMethod: value,
        cycleHighPressure:
          crossingAbsGauge || enteringCycle
            ? nextPressure
            : current.cycleHighPressure,
      };
    });
  }

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      visual={
        <NitrogenPurgeSchematic
          geometryType={inputs.geometryType}
          methodLabel={methodMeta.shortLabel}
          oxygenFraction={oxygenFraction}
          volumeLabel={volumeLabel}
          o2Label={o2Label}
          n2Label={n2Label}
        />
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            System geometry &amp; purge duty
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active =
                inputs.geometryType === preset.patch.geometryType &&
                inputs.purgeMethod === preset.patch.purgeMethod &&
                (preset.patch.pipeNps
                  ? inputs.pipeNps === preset.patch.pipeNps
                  : true) &&
                (preset.patch.customVolume != null
                  ? inputs.customVolume === preset.patch.customVolume
                  : true) &&
                (preset.patch.vesselDiameter != null
                  ? inputs.vesselDiameter === preset.patch.vesselDiameter
                  : true);
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
            label="System geometry"
            value={inputs.geometryType}
            options={NITROGEN_GEOMETRY_OPTIONS}
            onChange={(value) =>
              setField("geometryType", value as NitrogenGeometryType)
            }
          />

          {inputs.geometryType === "piping" ? (
            <>
              <FieldSelect
                label="Nominal pipe size"
                value={inputs.pipeNps}
                options={NITROGEN_NPS_OPTIONS}
                onChange={(value) => setField("pipeNps", value)}
              />
              <FieldGroup
                label="Pipe length L"
                unit={lengthUnit}
                hint="Straight-run equivalent. Dead-legs may need lower K."
                value={inputs.pipeLength}
                onChange={(value) =>
                  setField("pipeLength", toNumber(value, inputs.pipeLength))
                }
              />
              {computed.idMm != null ? (
                <p className="m-0 -mt-1 text-xs text-slate-500 dark:text-slate-400">
                  B36 Sch {inputs.pipeSchedule || "40"} ID ={" "}
                  {computed.idMm.toFixed(2)} mm /{" "}
                  {(computed.idMm / 25.4).toFixed(3)} in
                </p>
              ) : null}
            </>
          ) : null}

          {inputs.geometryType === "vessel" ? (
            <>
              <FieldGroup
                label="Vessel inside diameter Di"
                unit={isImperial ? "in" : "mm"}
                value={inputs.vesselDiameter}
                onChange={(value) =>
                  setField(
                    "vesselDiameter",
                    toNumber(value, inputs.vesselDiameter),
                  )
                }
              />
              <FieldGroup
                label="Vessel length / height L"
                unit={isImperial ? "in" : "mm"}
                hint="Shell T/T length. Volume includes 2:1 SE head equivalent (L + 0.5·Di)."
                value={inputs.vesselLength}
                onChange={(value) =>
                  setField(
                    "vesselLength",
                    toNumber(value, inputs.vesselLength),
                  )
                }
              />
            </>
          ) : null}

          {inputs.geometryType === "custom-volume" ? (
            <FieldGroup
              label="System internal volume"
              unit={volUnit}
              value={inputs.customVolume}
              onChange={(value) =>
                setField("customVolume", toNumber(value, inputs.customVolume))
              }
            />
          ) : null}

          <FieldSelect
            label="Purging method"
            value={inputs.purgeMethod}
            options={NITROGEN_PURGE_METHOD_OPTIONS.map((m) => ({
              value: m.value,
              label: m.label,
            }))}
            onChange={(value) =>
              onPurgeMethodChange(value as NitrogenPurgeMethod)
            }
          />

          <FieldGroup
            label="Initial O₂ concentration"
            unit="%"
            value={inputs.initialO2}
            onChange={(value) =>
              setField("initialO2", toNumber(value, inputs.initialO2))
            }
          />
          <FieldGroup
            label="Target maximum O₂"
            unit="%"
            hint="NFPA 69 / site LEL policy — often ≤5% O₂ before hydrocarbons; confirm AHJ."
            value={inputs.targetO2}
            onChange={(value) =>
              setField("targetO2", toNumber(value, inputs.targetO2))
            }
          />

          {inputs.purgeMethod === "dilution-sweep" ? (
            <>
              <FieldGroup
                label="Purge N₂ flow rate Q"
                unit={flowUnit}
                value={inputs.purgeFlowRate}
                onChange={(value) =>
                  setField(
                    "purgeFlowRate",
                    toNumber(value, inputs.purgeFlowRate),
                  )
                }
              />
              <FieldGroup
                label="Mixing efficiency K"
                unit="—"
                hint="0.25 poor mixing / dead-legs · 0.75 typical · 1.0 ideal plug flow."
                chips={MIXING_K_CHIPS}
                value={inputs.mixingEfficiency}
                onChange={(value) =>
                  setField(
                    "mixingEfficiency",
                    toNumber(value, inputs.mixingEfficiency),
                  )
                }
              />
              <FieldGroup
                label="Supply N₂ O₂ impurity"
                unit="%"
                hint="Usually ≈0 for industrial N₂. Must stay below target O₂ or dilution cannot converge."
                value={inputs.supplyO2Impurity}
                onChange={(value) =>
                  setField(
                    "supplyO2Impurity",
                    toNumber(value, inputs.supplyO2Impurity),
                  )
                }
              />
            </>
          ) : (
            <FieldGroup
              label={
                inputs.purgeMethod === "vacuum-cycle"
                  ? "Vacuum floor P_vac (absolute)"
                  : "High pressure P_high (gauge)"
              }
              unit={pressureUnit}
              hint={
                inputs.purgeMethod === "vacuum-cycle"
                  ? "Absolute pressure at vacuum hold before N₂ break to atmosphere (typical 0.1–0.5 bar(a) / 1.5–7 psia)."
                  : "Must remain below equipment MAWP. Vent returns to atmosphere each cycle."
              }
              value={inputs.cycleHighPressure}
              onChange={(value) =>
                setField(
                  "cycleHighPressure",
                  toNumber(value, inputs.cycleHighPressure),
                )
              }
            />
          )}
        </div>
      }
    />
  );
}
