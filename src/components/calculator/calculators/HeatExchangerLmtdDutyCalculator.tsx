"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import HeatExchangerDiagram from "@/components/calculator/HeatExchangerDiagram";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateHeatExchangerLmtdDuty,
  computeHeatExchangerLmtdDuty,
  CP_RANGE_IP,
  CP_RANGE_SI,
  DEFAULT_HEAT_EXCHANGER_LMTD_DUTY_INPUTS,
  MASS_FLOW_RANGE_KG_H,
  MASS_FLOW_RANGE_LB_HR,
  TEMP_COLD_RANGE_C,
  TEMP_COLD_RANGE_F,
  TEMP_HOT_RANGE_C,
  TEMP_HOT_RANGE_F,
  U_RANGE_IP,
  U_RANGE_SI,
  type HeatExchangerLmtdDutyInputs,
  type HxFluidType,
  type HxShellPasses,
} from "@/lib/calculators/engines/heat-exchanger-lmtd-duty";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { HEAT_EXCHANGER_LMTD_DUTY_URL_CONFIG } from "@/lib/calculators/url-configs/heat-exchanger-lmtd-duty";
import { cToF } from "@/lib/unitConverter";

type Props = { title: string; standard?: string };

type DraftKey =
  | "tempHotIn"
  | "tempHotOut"
  | "massFlowHot"
  | "cpHot"
  | "tempColdIn"
  | "tempColdOut"
  | "cpCold"
  | "overallU";

function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const HOT_FLUID_OPTIONS = [
  { value: "water", label: "Water (IAPWS)" },
  { value: "steam", label: "Steam (IAPWS)" },
  { value: "custom", label: "Custom Cp" },
];

const COLD_FLUID_OPTIONS = [
  { value: "water", label: "Water (IAPWS)" },
  { value: "custom", label: "Custom Cp" },
];

const SHELL_OPTIONS = [
  { value: "1", label: "1 shell · 2n tube" },
  { value: "2", label: "2 shell" },
  { value: "4", label: "4 shell" },
];

type DutyPreset = {
  id: string;
  label: string;
  patch: Partial<HeatExchangerLmtdDutyInputs>;
};

const METRIC_PRESETS: DutyPreset[] = [
  {
    id: "ww-default",
    label: "Water 90→60",
    patch: {
      unitSystem: "metric",
      fluidTypeHot: "water",
      fluidTypeCold: "water",
      tempHotIn: 90,
      tempHotOut: 60,
      tempColdIn: 20,
      tempColdOut: 50,
      massFlowHot: 10_000,
      shellPasses: 1,
      overallU: 1200,
    },
  },
  {
    id: "steam-120",
    label: "Steam 120 °C",
    patch: {
      unitSystem: "metric",
      fluidTypeHot: "steam",
      fluidTypeCold: "water",
      tempHotIn: 120,
      tempHotOut: 120,
      tempColdIn: 25,
      tempColdOut: 40,
      massFlowHot: 5000,
      shellPasses: 1,
      overallU: 1200,
    },
  },
];

const IMPERIAL_PRESETS: DutyPreset[] = [
  {
    id: "ww-194",
    label: "Water 194→140",
    patch: {
      unitSystem: "imperial",
      fluidTypeHot: "water",
      fluidTypeCold: "water",
      tempHotIn: 194,
      tempHotOut: 140,
      tempColdIn: 68,
      tempColdOut: 122,
      massFlowHot: 22_000,
      shellPasses: 1,
      overallU: 211,
    },
  },
  {
    id: "u-200",
    label: "U = 200",
    patch: {
      unitSystem: "imperial",
      fluidTypeHot: "water",
      fluidTypeCold: "water",
      tempHotIn: 200,
      tempHotOut: 150,
      tempColdIn: 80,
      tempColdOut: 130,
      massFlowHot: 15_000,
      shellPasses: 1,
      overallU: 200,
    },
  },
];

export default function HeatExchangerLmtdDutyCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<HeatExchangerLmtdDutyInputs>(
      DEFAULT_HEAT_EXCHANGER_LMTD_DUTY_INPUTS,
      HEAT_EXCHANGER_LMTD_DUTY_URL_CONFIG,
      { type: "heat-exchanger-lmtd-duty" },
    );

  const [drafts, setDrafts] = useState<Partial<Record<DraftKey, string>>>({});

  useEffect(() => {
    setDrafts({});
  }, [inputs.unitSystem]);

  const output = useMemo(
    () => calculateHeatExchangerLmtdDuty(inputs),
    [inputs],
  );
  const computed = useMemo(
    () => computeHeatExchangerLmtdDuty(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const tUnit = imperial ? "°F" : "°C";
  const flowUnit = imperial ? "lb/hr" : "kg/h";
  const uUnit = imperial ? "Btu/h·ft²·°F" : "W/m²·K";
  const cpUnit = imperial ? "Btu/lb·°F" : "kJ/kg·K";
  const tHotRange = imperial ? TEMP_HOT_RANGE_F : TEMP_HOT_RANGE_C;
  const tColdRange = imperial ? TEMP_COLD_RANGE_F : TEMP_COLD_RANGE_C;
  const flowRange = imperial ? MASS_FLOW_RANGE_LB_HR : MASS_FLOW_RANGE_KG_H;
  const uRange = imperial ? U_RANGE_IP : U_RANGE_SI;
  const cpRange = imperial ? CP_RANGE_IP : CP_RANGE_SI;
  const presets = imperial ? IMPERIAL_PRESETS : METRIC_PRESETS;

  function display(key: DraftKey): string {
    return drafts[key] ?? String(inputs[key]);
  }

  function onNumChange(key: DraftKey, raw: string, min: number, max: number) {
    setDrafts((prev) => ({ ...prev, [key]: raw }));
    const parsed = parseDraft(raw);
    if (parsed != null) {
      setField(key, Math.min(max, Math.max(min, parsed)));
    }
  }

  function onNumBlur(key: DraftKey, min: number, max: number) {
    setDrafts((prev) => {
      const raw = prev[key];
      if (raw !== undefined) {
        const parsed = parseDraft(raw);
        if (parsed != null) {
          setField(key, Math.min(max, Math.max(min, parsed)));
        }
      }
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function applyPreset(preset: DutyPreset) {
    setDrafts({});
    setInputs({
      ...DEFAULT_HEAT_EXCHANGER_LMTD_DUTY_INPUTS,
      ...preset.patch,
    });
  }

  function onHotFluidChange(v: string) {
    const fluid = v as HxFluidType;
    setField("fluidTypeHot", fluid);
    if (fluid === "steam" && inputs.tempHotOut !== inputs.tempHotIn) {
      setField("tempHotOut", inputs.tempHotIn);
    }
  }

  const diagramTemps = imperial
    ? {
        thIn: cToF(computed.thInC),
        thOut: cToF(computed.thOutC),
        tcIn: cToF(computed.tcInC),
        tcOut: cToF(computed.tcOutC),
        unitLabel: "°F",
      }
    : {
        thIn: computed.thInC,
        thOut: computed.thOutC,
        tcIn: computed.tcInC,
        tcOut: computed.tcOutC,
        unitLabel: "°C",
      };

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputNaturalHeight
      inputRows={[
        {
          label: "Hot",
          value: `${inputs.fluidTypeHot} ${inputs.tempHotIn}→${inputs.tempHotOut} ${tUnit}`,
        },
        {
          label: "Cold",
          value: `${inputs.fluidTypeCold} ${inputs.tempColdIn}→${inputs.tempColdOut} ${tUnit}`,
        },
        {
          label: "ṁ_h / U",
          value: `${inputs.massFlowHot} ${flowUnit} · U=${inputs.overallU}`,
        },
        {
          label: "Shells",
          value: `${inputs.shellPasses}-shell`,
        },
      ]}
      afterHero={
        !computed.invalid ? (
          <HeatExchangerDiagram
            thIn={diagramTemps.thIn}
            thOut={diagramTemps.thOut}
            tcIn={diagramTemps.tcIn}
            tcOut={diagramTemps.tcOut}
            shellPasses={computed.shellPasses}
            unitLabel={diagramTemps.unitLabel}
            temperatureCross={computed.temperatureCross}
          />
        ) : null
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-spec-accent hover:text-spec-accent dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSelect
              label="Hot fluid"
              value={inputs.fluidTypeHot}
              options={HOT_FLUID_OPTIONS}
              onChange={onHotFluidChange}
            />
            <FieldSelect
              label="Cold fluid"
              value={inputs.fluidTypeCold}
              options={COLD_FLUID_OPTIONS}
              onChange={(v) =>
                setField("fluidTypeCold", v as "water" | "custom")
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Hot inlet"
              unit={tUnit}
              compactUnit
              value={display("tempHotIn")}
              onChange={(v) =>
                onNumChange("tempHotIn", v, tHotRange.min, tHotRange.max)
              }
              onBlur={() =>
                onNumBlur("tempHotIn", tHotRange.min, tHotRange.max)
              }
              hint={`${tHotRange.min}–${tHotRange.max}`}
              chips={
                imperial
                  ? [
                      { label: "194", value: "194" },
                      { label: "212", value: "212" },
                      { label: "248", value: "248" },
                    ]
                  : [
                      { label: "90", value: "90" },
                      { label: "120", value: "120" },
                      { label: "150", value: "150" },
                    ]
              }
            />
            <FieldGroup
              label="Hot outlet"
              unit={tUnit}
              compactUnit
              value={display("tempHotOut")}
              onChange={(v) =>
                onNumChange("tempHotOut", v, tHotRange.min, tHotRange.max)
              }
              onBlur={() =>
                onNumBlur("tempHotOut", tHotRange.min, tHotRange.max)
              }
              hint={
                inputs.fluidTypeHot === "steam"
                  ? "≈ inlet for condenser"
                  : undefined
              }
              chips={
                inputs.fluidTypeHot === "steam"
                  ? [
                      {
                        label: "= inlet",
                        value: String(inputs.tempHotIn),
                      },
                    ]
                  : imperial
                    ? [
                        { label: "140", value: "140" },
                        { label: "150", value: "150" },
                      ]
                    : [
                        { label: "60", value: "60" },
                        { label: "70", value: "70" },
                      ]
              }
            />
            <FieldGroup
              label="Cold inlet"
              unit={tUnit}
              compactUnit
              value={display("tempColdIn")}
              onChange={(v) =>
                onNumChange("tempColdIn", v, tColdRange.min, tColdRange.max)
              }
              onBlur={() =>
                onNumBlur("tempColdIn", tColdRange.min, tColdRange.max)
              }
              chips={
                imperial
                  ? [
                      { label: "68", value: "68" },
                      { label: "80", value: "80" },
                    ]
                  : [
                      { label: "20", value: "20" },
                      { label: "25", value: "25" },
                    ]
              }
            />
            <FieldGroup
              label="Cold outlet"
              unit={tUnit}
              compactUnit
              value={display("tempColdOut")}
              onChange={(v) =>
                onNumChange("tempColdOut", v, tColdRange.min, tColdRange.max)
              }
              onBlur={() =>
                onNumBlur("tempColdOut", tColdRange.min, tColdRange.max)
              }
              chips={
                imperial
                  ? [
                      { label: "122", value: "122" },
                      { label: "130", value: "130" },
                    ]
                  : [
                      { label: "40", value: "40" },
                      { label: "50", value: "50" },
                    ]
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Hot mass flow"
              unit={flowUnit}
              compactUnit
              value={display("massFlowHot")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("massFlowHot", v, flowRange.min, flowRange.max)
              }
              onBlur={() =>
                onNumBlur("massFlowHot", flowRange.min, flowRange.max)
              }
              chips={
                imperial
                  ? [
                      { label: "15k", value: "15000" },
                      { label: "22k", value: "22000" },
                    ]
                  : [
                      { label: "5k", value: "5000" },
                      { label: "10k", value: "10000" },
                    ]
              }
            />
            <FieldGroup
              label="Overall U"
              unit={uUnit}
              compactUnit
              value={display("overallU")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("overallU", v, uRange.min, uRange.max)
              }
              onBlur={() => onNumBlur("overallU", uRange.min, uRange.max)}
              chips={
                imperial
                  ? [
                      { label: "200", value: "200" },
                      { label: "211", value: "211" },
                    ]
                  : [
                      { label: "800", value: "800" },
                      { label: "1200", value: "1200" },
                    ]
              }
            />
            <FieldSelect
              label="Shell passes"
              value={String(inputs.shellPasses)}
              options={SHELL_OPTIONS}
              onChange={(v) =>
                setField("shellPasses", Number(v) as HxShellPasses)
              }
              hint="TEMA F for 1–2n / multi-shell"
            />
            {inputs.fluidTypeHot === "custom" ? (
              <FieldGroup
                label="Hot Cp"
                unit={cpUnit}
                compactUnit
                value={display("cpHot")}
                allowZero={false}
                onChange={(v) =>
                  onNumChange("cpHot", v, cpRange.min, cpRange.max)
                }
                onBlur={() => onNumBlur("cpHot", cpRange.min, cpRange.max)}
              />
            ) : null}
            {inputs.fluidTypeCold === "custom" ? (
              <FieldGroup
                label="Cold Cp"
                unit={cpUnit}
                compactUnit
                value={display("cpCold")}
                allowZero={false}
                onChange={(v) =>
                  onNumChange("cpCold", v, cpRange.min, cpRange.max)
                }
                onBlur={() => onNumBlur("cpCold", cpRange.min, cpRange.max)}
              />
            ) : null}
          </div>
        </div>
      }
    />
  );
}
