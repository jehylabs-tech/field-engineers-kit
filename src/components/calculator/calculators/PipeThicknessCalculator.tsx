"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FIELD_LABEL_CLASS, FIELD_SELECT_CLASS } from "@/components/calculator/FieldGroup";
import { IMPERIAL_OD_CHIPS, METRIC_OD_CHIPS } from "@/components/calculator/presets";
import SectionBlock from "@/components/calculator/SectionBlock";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  DEFAULT_PIPE_INPUTS,
  PIPE_THICKNESS_MATERIAL_PRESETS,
  calculatePipeThickness,
  convertAllowableStress,
  formatMaterialPresetOption,
  pipeThicknessStressForMaterial,
  requiredPipeWallThickness,
  type PipeThicknessInputs,
} from "@/lib/calculators/engines/pipe-thickness";
import PipeThicknessSchematic from "@/components/calculator/schematics/PipeThicknessSchematic";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PIPE_URL_CONFIG } from "@/lib/calculators/url-configs/pipe-thickness";

type PipeThicknessCalculatorProps = {
  title: string;
  standard?: string;
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function PipeThicknessCalculator({
  title,
  standard,
}: PipeThicknessCalculatorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { inputs, setField, setInputs } = useCalculatorUrlSync<PipeThicknessInputs>(
    DEFAULT_PIPE_INPUTS,
    PIPE_URL_CONFIG,
    { type: "pipe-thickness" },
  );

  const output = useMemo(() => calculatePipeThickness(inputs), [inputs]);
  usePublishCalculatorOutput(output);
  const unit = inputs.unitSystem === "metric" ? "mm" : "in";
  const pressureUnit = inputs.unitSystem === "metric" ? "MPa" : "psi";
  const materialValue = inputs.material ?? "custom";
  const presetSelected = PIPE_THICKNESS_MATERIAL_PRESETS.some(
    (item) => item.id === materialValue,
  );

  function updateField<K extends keyof PipeThicknessInputs>(
    key: K,
    value: PipeThicknessInputs[K],
  ) {
    setField(key, value);
  }

  function applyMaterial(materialId: string) {
    if (materialId === "custom") {
      setField("material", "custom");
      return;
    }
    const stress = pipeThicknessStressForMaterial(materialId, inputs.unitSystem);
    if (stress == null) return;
    setInputs((current) => ({
      ...current,
      material: materialId,
      allowableStress: stress,
    }));
  }

  function changeAllowableStress(raw: string) {
    const nextStress = toNumber(raw, inputs.allowableStress);
    const presetStress = pipeThicknessStressForMaterial(
      materialValue,
      inputs.unitSystem,
    );
    const matchesPreset =
      presetSelected &&
      presetStress != null &&
      Math.abs(nextStress - presetStress) < 0.05;

    setInputs((current) => ({
      ...current,
      allowableStress: nextStress,
      material: matchesPreset ? materialValue : "custom",
    }));
  }

  const unitSystemRef = useRef(inputs.unitSystem);
  useEffect(() => {
    unitSystemRef.current = inputs.unitSystem;
  }, [inputs.unitSystem]);

  useEffect(() => {
    function onUnits(event: Event) {
      const next = (event as CustomEvent<UnitSystem>).detail;
      if (next !== "metric" && next !== "imperial") return;
      setInputs((current) => {
        const from = unitSystemRef.current;
        if (from === next) return current;
        unitSystemRef.current = next;
        const presetStress = pipeThicknessStressForMaterial(
          current.material ?? "",
          next,
        );
        const allowableStress =
          current.material && current.material !== "custom" && presetStress != null
            ? presetStress
            : convertAllowableStress(
                current.allowableStress,
                from,
                next,
              );
        return {
          ...current,
          unitSystem: next,
          allowableStress,
        };
      });
    }
    window.addEventListener("fek-units-change", onUnits);
    return () => window.removeEventListener("fek-units-change", onUnits);
  }, [setInputs]);

  const thicknessError =
    output.heroStatusLevel === "fail"
      ? "Actual thickness is below the required minimum"
      : undefined;

  const inputRows = [
    { label: "Outside diameter", value: `${inputs.outsideDiameter} ${unit}` },
    { label: "Design pressure", value: `${inputs.designPressure} ${pressureUnit}` },
    { label: "Material", value: PIPE_THICKNESS_MATERIAL_PRESETS.find((item) => item.id === inputs.material)?.label ?? "Custom" },
    { label: "Allowable stress", value: `${inputs.allowableStress} ${pressureUnit}` },
    { label: "Weld efficiency", value: String(inputs.weldEfficiency) },
    { label: "Corrosion / mechanical allowance", value: `${inputs.corrosionAllowance} ${unit}` },
    { label: "Actual thickness", value: `${inputs.actualThickness} ${unit}` },
  ];

  const tmin = requiredPipeWallThickness(inputs);

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      visual={
        <PipeThicknessSchematic
          odLabel={`${inputs.outsideDiameter} ${unit}`}
          tminLabel={`${tmin.toFixed(2)} ${unit}`}
          actualLabel={`${inputs.actualThickness} ${unit}`}
          caLabel={`${inputs.corrosionAllowance} ${unit}`}
          pressureLabel={`${inputs.designPressure} ${pressureUnit}`}
        />
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3 [&_.calc-field]:max-w-none">
          {/* Section 1: Primary Design Conditions */}
          <SectionBlock number={1} title="Design Conditions" twoColumn={false} compact>
            <FieldGroup
              label="Outside diameter (D)"
              hint="Pipe OD D in t = PD / [2(SE + PY)] + c — ASME B31.3 §304.1.2(a)."
              value={inputs.outsideDiameter}
              onChange={(value) =>
                updateField("outsideDiameter", toNumber(value, inputs.outsideDiameter))
              }
              unit={unit}
              highlight="D"
              autoFocus
              chips={inputs.unitSystem === "metric" ? METRIC_OD_CHIPS : IMPERIAL_OD_CHIPS}
            />

            <FieldGroup
              label="Actual wall thickness (t)"
              hint="Nominal or measured wall t compared against required minimum t_min."
              value={inputs.actualThickness}
              onChange={(value) =>
                updateField("actualThickness", toNumber(value, inputs.actualThickness))
              }
              unit={unit}
              error={thicknessError}
              highlight="tact"
            />

            <FieldGroup
              label="Design pressure (P)"
              hint="Internal design gauge pressure P in t = PD / [2(SE + PY)] + c."
              value={inputs.designPressure}
              onChange={(value) =>
                updateField("designPressure", toNumber(value, inputs.designPressure))
              }
              unit={pressureUnit}
              highlight="P"
            />

            <div>
              <label className={FIELD_LABEL_CLASS}>
                Pipe Material (ASME B31.3 Table A-1)
              </label>
              <select
                value={presetSelected ? materialValue : "custom"}
                onChange={(event) => applyMaterial(event.target.value)}
                className={FIELD_SELECT_CLASS}
              >
                {PIPE_THICKNESS_MATERIAL_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {formatMaterialPresetOption(preset)}
                  </option>
                ))}
                <option value="custom">Custom (enter S manually)</option>
              </select>
            </div>
          </SectionBlock>

          {/* Section 2: Advanced Engineering Parameters (Collapsible) */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 dark:border-slate-800/90 dark:bg-slate-900/30">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200/80 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  2
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Advanced Engineering Parameters
                </span>
                <span className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Auto-Calculated
                </span>
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {showAdvanced ? "▲ Hide" : "▼ Edit"}
              </span>
            </button>

            {showAdvanced && (
              <div className="space-y-3 border-t border-slate-200/80 p-3.5 dark:border-slate-800">
                <FieldGroup
                  label="Allowable stress (S)"
                  hint="Table A-1 S at ambient from preset, or enter S at your design temperature — manual edits switch to Custom."
                  value={inputs.allowableStress}
                  onChange={changeAllowableStress}
                  unit={pressureUnit}
                  highlight="S"
                />
                <FieldGroup
                  label="Weld joint efficiency (E)"
                  hint="Longitudinal joint efficiency E per ASME B31.3 Table 302.4 (Seamless = 1.0, ERW = 0.85)."
                  value={inputs.weldEfficiency}
                  onChange={(value) =>
                    updateField("weldEfficiency", toNumber(value, inputs.weldEfficiency))
                  }
                  highlight="E"
                />
                <FieldGroup
                  label="Corrosion / mechanical allowance (c)"
                  hint="Corrosion and mechanical allowance c added after the pressure term — B31.3 §302.4."
                  value={inputs.corrosionAllowance}
                  onChange={(value) =>
                    updateField(
                      "corrosionAllowance",
                      toNumber(value, inputs.corrosionAllowance),
                    )
                  }
                  unit={unit}
                  highlight="c"
                />
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}
