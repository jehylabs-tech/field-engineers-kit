"use client";

import { useEffect, useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import FlangePtRatingChart from "@/components/calculator/schematics/FlangePtRatingChart";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateFlangePtRating,
  classesForMaterialGroup,
  computeFlangePtRating,
  DEFAULT_FLANGE_PT_RATING_INPUTS,
  FLANGE_PT_CLASS_OPTIONS,
  FLANGE_PT_MATERIAL_OPTIONS,
  getMaterialMeta,
  type FlangePtClass,
  type FlangePtMaterialGroup,
  type FlangePtRatingInputs,
} from "@/lib/calculators/engines/flange-pressure-temperature-rating";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { FLANGE_PT_RATING_URL_CONFIG } from "@/lib/calculators/url-configs/flange-pressure-temperature-rating";

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type Props = { title: string; standard?: string };

type Preset = {
  id: string;
  label: string;
  patch: Partial<FlangePtRatingInputs>;
};

const METRIC_TEMP_CHIPS = [
  { value: "38", label: "38 °C" },
  { value: "100", label: "100 °C" },
  { value: "200", label: "200 °C" },
  { value: "300", label: "300 °C" },
  { value: "400", label: "400 °C" },
  { value: "538", label: "538 °C" },
];

const IMPERIAL_TEMP_CHIPS = [
  { value: "100", label: "100 °F" },
  { value: "200", label: "200 °F" },
  { value: "400", label: "400 °F" },
  { value: "600", label: "600 °F" },
  { value: "800", label: "800 °F" },
  { value: "1000", label: "1000 °F" },
];

const METRIC_PRESETS: Preset[] = [
  {
    id: "cs-150-38",
    label: "A105 · 150# · 38 °C",
    patch: {
      unitSystem: "metric",
      materialGroup: "1.1",
      flangeClass: "150",
      designTemperature: 38,
    },
  },
  {
    id: "cs-300-200",
    label: "A105 · 300# · 200 °C",
    patch: {
      unitSystem: "metric",
      materialGroup: "1.1",
      flangeClass: "300",
      designTemperature: 200,
    },
  },
  {
    id: "ss-150-100",
    label: "316 · 150# · 100 °C",
    patch: {
      unitSystem: "metric",
      materialGroup: "2.2",
      flangeClass: "150",
      designTemperature: 100,
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "cs-150-100f",
    label: "A105 · 150# · 100 °F",
    patch: {
      unitSystem: "imperial",
      materialGroup: "1.1",
      flangeClass: "150",
      designTemperature: 100,
    },
  },
  {
    id: "cs-600-400f",
    label: "A105 · 600# · 400 °F",
    patch: {
      unitSystem: "imperial",
      materialGroup: "1.1",
      flangeClass: "600",
      designTemperature: 400,
    },
  },
  {
    id: "ss-300-400f",
    label: "316 · 300# · 400 °F",
    patch: {
      unitSystem: "imperial",
      materialGroup: "2.2",
      flangeClass: "300",
      designTemperature: 400,
    },
  },
];

/** Static GSC quick table — Group 1.1 Class 150/300/600 at key temperatures. */
function SeoQuickTable() {
  return (
    <div className="mb-1 overflow-x-auto rounded-lg border border-slate-200 dark:border-spec-border">
      <table className="w-full min-w-[28rem] border-collapse text-left text-xs">
        <caption className="border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-700 dark:border-spec-border dark:bg-slate-900/60 dark:text-slate-300">
          ASME B16.5 Group 1.1 MAWP quick table (bar) — Class 150 / 300 / 600
        </caption>
        <thead>
          <tr className="border-b border-slate-200 bg-white text-slate-600 dark:border-spec-border dark:bg-spec-bg dark:text-slate-400">
            <th className="px-2 py-1.5 font-semibold">T (°C)</th>
            <th className="px-2 py-1.5 font-semibold tabular-nums">Cl 150</th>
            <th className="px-2 py-1.5 font-semibold tabular-nums">Cl 300</th>
            <th className="px-2 py-1.5 font-semibold tabular-nums">Cl 600</th>
          </tr>
        </thead>
        <tbody className="tabular-nums text-slate-800 dark:text-slate-200">
          {[
            ["−29…38", "19.6", "51.1", "102.1"],
            ["100", "17.7", "46.4", "92.8"],
            ["200", "14.0", "43.8", "87.6"],
            ["300", "10.2", "39.8", "79.6"],
            ["400", "6.5", "34.7", "69.4"],
            ["500", "2.8", "11.3", "22.5"],
            ["538", "1.4", "5.6", "11.3"],
          ].map((row) => (
            <tr
              key={row[0]}
              className="border-b border-slate-100 last:border-0 dark:border-spec-border/60"
            >
              <td className="px-2 py-1 font-medium">{row[0]}</td>
              <td className="px-2 py-1">{row[1]}</td>
              <td className="px-2 py-1">{row[2]}</td>
              <td className="px-2 py-1">{row[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="m-0 border-t border-slate-100 px-2.5 py-1 text-[10px] text-slate-500 dark:border-spec-border/60 dark:text-slate-400">
        Metric bar values · Phase-1 Table 2-1.1 extract · use live inputs for
        interpolation / Group 2.2
      </p>
    </div>
  );
}

export default function FlangePressureTemperatureRatingCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<FlangePtRatingInputs>(
      DEFAULT_FLANGE_PT_RATING_INPUTS,
      FLANGE_PT_RATING_URL_CONFIG,
      { type: "flange-pressure-temperature-rating" },
    );

  const allowedClasses = classesForMaterialGroup(inputs.materialGroup);

  // URL may carry Class 900 with Group 2.2 — coerce to a Phase-1 class.
  useEffect(() => {
    if (
      allowedClasses.length > 0 &&
      !allowedClasses.includes(inputs.flangeClass)
    ) {
      setField("flangeClass", allowedClasses[0]);
    }
  }, [allowedClasses, inputs.flangeClass, setField]);

  const output = useMemo(() => calculateFlangePtRating(inputs), [inputs]);
  const computed = useMemo(() => computeFlangePtRating(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const isImperial = inputs.unitSystem === "imperial";
  const tempUnit = isImperial ? "°F" : "°C";
  const meta = getMaterialMeta(inputs.materialGroup);
  const classOptions = FLANGE_PT_CLASS_OPTIONS.filter((o) =>
    allowedClasses.includes(o.value),
  );
  const selectClass = allowedClasses.includes(inputs.flangeClass)
    ? inputs.flangeClass
    : (allowedClasses[0] ?? inputs.flangeClass);
  const presets = isImperial ? IMPERIAL_PRESETS : METRIC_PRESETS;
  const tempChips = isImperial ? IMPERIAL_TEMP_CHIPS : METRIC_TEMP_CHIPS;

  function applyPreset(preset: Preset) {
    setInputs((current) => ({ ...current, ...preset.patch }));
  }

  function onMaterialGroupChange(value: FlangePtMaterialGroup) {
    setInputs((current) => {
      const nextClasses = classesForMaterialGroup(value);
      const flangeClass = nextClasses.includes(current.flangeClass)
        ? current.flangeClass
        : nextClasses[0];
      return { ...current, materialGroup: value, flangeClass };
    });
  }

  const chart = computed.curve ? (
    <FlangePtRatingChart
      points={computed.curve}
      designTC={computed.tC}
      designPBar={computed.pBar}
      classLabel={selectClass}
      groupLabel={meta?.shortLabel ?? inputs.materialGroup}
      unitSystem={inputs.unitSystem}
    />
  ) : null;

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      afterHero={chart}
      inputRows={[
        { label: "Group", value: meta?.shortLabel ?? inputs.materialGroup },
        { label: "Class", value: selectClass },
        {
          label: "T",
          value: `${inputs.designTemperature} ${tempUnit}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <SeoQuickTable />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Material group, class &amp; temperature
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active =
                inputs.materialGroup === preset.patch.materialGroup &&
                inputs.flangeClass === preset.patch.flangeClass &&
                inputs.designTemperature === preset.patch.designTemperature;
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
            label="Material group"
            value={inputs.materialGroup}
            options={FLANGE_PT_MATERIAL_OPTIONS}
            onChange={(value) =>
              onMaterialGroupChange(value as FlangePtMaterialGroup)
            }
          />
          <FieldSelect
            label="Flange class"
            value={selectClass}
            options={classOptions}
            onChange={(value) =>
              setField("flangeClass", value as FlangePtClass)
            }
          />
          <FieldGroup
            label="Design temperature"
            unit={tempUnit}
            hint={
              isImperial
                ? "Table nodes ≈ −20…1000 °F (Group 1.1). Linear interpolation between published temperatures."
                : "Table nodes −29…538 °C. Linear interpolation between published temperatures."
            }
            chips={tempChips}
            value={inputs.designTemperature}
            onChange={(value) =>
              setField(
                "designTemperature",
                toNumber(value, inputs.designTemperature),
              )
            }
          />
        </div>
      }
    />
  );
}
