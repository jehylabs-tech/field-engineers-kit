"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import SectionBlock from "@/components/calculator/SectionBlock";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateOletFittingDimensions,
  DEFAULT_OLET_FITTING_DIMENSIONS_INPUTS,
  OLET_MATERIAL_OPTIONS,
  OLET_TYPE_OPTIONS,
  ratingsForOletType,
  defaultRatingForType,
  type OletFittingDimensionsInputs,
  type OletType,
} from "@/lib/calculators/engines/olet-fitting-dimensions";
import { listOletOutletNps } from "@/lib/calculators/data/oletDimensionsMssSp97";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { OLET_FITTING_DIMENSIONS_URL_CONFIG } from "@/lib/calculators/url-configs/olet-fitting-dimensions";
import FieldGroup, {
  FieldSelect,
  fieldLabelHint,
} from "@/components/calculator/FieldGroup";
import { chipsInOptions, COMMON_NPS_CHIPS } from "@/components/calculator/presets";
import { listAvailableNps } from "@/lib/data/loaders";

type Props = {
  title: string;
  standard?: string;
};

function toNumber(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const WELDOLET_RATING_CHIPS = [
  { value: "STD", label: "STD" },
  { value: "XS", label: "XS" },
  { value: "160", label: "160" },
];

const CLASS_RATING_CHIPS = [
  { value: "3000", label: "3000" },
  { value: "6000", label: "6000" },
];

export default function OletFittingDimensionsCalculator({
  title,
  standard,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { inputs, setField } = useCalculatorUrlSync<OletFittingDimensionsInputs>(
    DEFAULT_OLET_FITTING_DIMENSIONS_INPUTS,
    OLET_FITTING_DIMENSIONS_URL_CONFIG,
    { type: "olet-fitting-dimensions" },
  );

  const ratingOptions = useMemo(() => {
    return ratingsForOletType(inputs.oletType).map((r) => ({
      value: r,
      label:
        inputs.oletType === "weldolet"
          ? r === "160"
            ? "Sch 160"
            : r
          : `Class ${r}`,
    }));
  }, [inputs.oletType]);

  const ratingChips = useMemo(
    () =>
      chipsInOptions(
        inputs.oletType === "weldolet"
          ? WELDOLET_RATING_CHIPS
          : CLASS_RATING_CHIPS,
        ratingOptions,
      ),
    [inputs.oletType, ratingOptions],
  );

  const outletOptions = useMemo(() => {
    const rating =
      ratingsForOletType(inputs.oletType).find((r) => r === inputs.rating) ??
      defaultRatingForType(inputs.oletType);
    return listOletOutletNps(inputs.oletType, rating).map((nps) => ({
      value: nps,
      label: `NPS ${nps}`,
    }));
  }, [inputs.oletType, inputs.rating]);

  const runOptions = useMemo(() => {
    return listAvailableNps()
      .map((pipe) => pipe.nps)
      .filter((nps) => {
        const v = Number(nps);
        return Number.isFinite(v) && v >= 0.5 && v <= 36;
      })
      .map((nps) => ({ value: nps, label: `NPS ${nps}` }));
  }, []);

  useEffect(() => {
    const allowed = ratingsForOletType(inputs.oletType);
    if (!allowed.includes(inputs.rating as (typeof allowed)[number])) {
      setField("rating", defaultRatingForType(inputs.oletType));
    }
  }, [inputs.oletType, inputs.rating, setField]);

  useEffect(() => {
    if (
      outletOptions.length > 0 &&
      !outletOptions.some((o) => o.value === inputs.branchNps)
    ) {
      setField("branchNps", outletOptions[0]!.value);
    }
  }, [outletOptions, inputs.branchNps, setField]);

  const output = useMemo(
    () => calculateOletFittingDimensions(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const pressureUnit = imperial ? "psi" : "MPa";
  const tempUnit = imperial ? "°F" : "°C";
  const typeLabel =
    OLET_TYPE_OPTIONS.find((t) => t.value === inputs.oletType)?.label ??
    inputs.oletType;

  const inputRows = [
    { label: "Olet type", value: typeLabel },
    {
      label: "Run × outlet",
      value: `NPS ${inputs.runNps} × ${inputs.branchNps}`,
    },
    { label: "Rating", value: inputs.rating },
    { label: "Material", value: inputs.material },
    { label: "Unit system", value: inputs.unitSystem },
  ];

  const advancedSummary = [
    inputs.material,
    `${inputs.designPressure} ${pressureUnit}`,
    `${Math.round(inputs.designTemperature)}${tempUnit}`,
  ].join(" · ");

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard ?? "MSS SP-97"}
      inputRows={inputRows}
      layout="formula"
      columnRatio="5-7"
      inputPanel={
        <>
          <SectionBlock number={1} title="Olet Selection">
            <FieldSelect
              label="Olet type"
              value={inputs.oletType}
              options={OLET_TYPE_OPTIONS}
              onChange={(value) => setField("oletType", value as OletType)}
              hint={fieldLabelHint("Olet type")}
            />
            <FieldSelect
              label="Header (run) NPS"
              value={inputs.runNps}
              options={runOptions}
              chips={chipsInOptions(COMMON_NPS_CHIPS, runOptions)}
              onChange={(value) => setField("runNps", value)}
              hint={fieldLabelHint("Header NPS")}
            />
            <FieldSelect
              label="Branch outlet NPS"
              value={inputs.branchNps}
              options={outletOptions}
              chips={chipsInOptions(COMMON_NPS_CHIPS, outletOptions)}
              onChange={(value) => setField("branchNps", value)}
              hint={fieldLabelHint("Branch NPS")}
            />
            <FieldSelect
              label={
                inputs.oletType === "weldolet"
                  ? "Outlet schedule / rating"
                  : "Pressure class"
              }
              value={inputs.rating}
              options={ratingOptions}
              chips={ratingChips}
              onChange={(value) => setField("rating", value)}
              hint={
                inputs.oletType === "weldolet"
                  ? "STD ≈ Sch 40 · XS ≈ Sch 80 · Sch 160"
                  : "Forged class 3000 / 6000"
              }
            />
          </SectionBlock>

          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 dark:border-slate-800/90 dark:bg-slate-900/30">
            <button
              type="button"
              onClick={() => setShowAdvanced((open) => !open)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-200/80 px-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  1.2
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Advanced (material · P · T → t_b export)
                </span>
                {!showAdvanced ? (
                  <span className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {advancedSummary}
                  </span>
                ) : null}
              </div>
              <span className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {showAdvanced ? "▲ Hide" : "▼ Edit"}
              </span>
            </button>

            {showAdvanced ? (
              <div className="space-y-2.5 border-t border-slate-200/80 p-3.5 dark:border-slate-800">
                <FieldSelect
                  label="Forging material"
                  value={inputs.material}
                  options={OLET_MATERIAL_OPTIONS.map((m) => ({
                    value: m.value,
                    label: m.label,
                  }))}
                  onChange={(value) =>
                    setField(
                      "material",
                      value as OletFittingDimensionsInputs["material"],
                    )
                  }
                  hint="Screening S for optional branch t_b in export only."
                />
                <div className="grid grid-cols-2 gap-2">
                  <FieldGroup
                    label="Design pressure (P)"
                    value={inputs.designPressure}
                    onChange={(value) =>
                      setField(
                        "designPressure",
                        toNumber(value, inputs.designPressure),
                      )
                    }
                    unit={pressureUnit}
                    highlight="P"
                    hint="Used only for export t_b (B31.3 §304.1.2)."
                  />
                  <FieldGroup
                    label="Design temperature (T)"
                    value={Math.round(inputs.designTemperature)}
                    onChange={(value) =>
                      setField(
                        "designTemperature",
                        toNumber(value, inputs.designTemperature),
                      )
                    }
                    unit={tempUnit}
                    hint="Duty context — S uses forging screening defaults."
                  />
                </div>
              </div>
            ) : null}
          </div>
        </>
      }
    />
  );
}
