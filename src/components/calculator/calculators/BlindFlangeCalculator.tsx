"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, {
  FIELD_LABEL_CLASS,
  FIELD_SELECT_CLASS,
} from "@/components/calculator/FieldGroup";
import BlindFlangeSchematic from "@/components/calculator/schematics/BlindFlangeSchematic";
import BlindThicknessMatrixChart from "@/components/calculator/charts/BlindThicknessMatrixChart";
import BlindFlangeResultPanel, {
  BlindFlangeBreakdownPanel,
} from "@/components/calculator/calculators/BlindFlangeResultPanel";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateBlindFlange,
  DEFAULT_BLIND_FLANGE_INPUTS,
  formatBlindLength,
  formatBlindMaterialOption,
  getAllowableStressForMaterial,
  getStandardGasketContactDiameter,
  MATERIAL_STRESS_PRESETS,
  requiredBlindThicknessMm,
  type BlindDesignMode,
  type BlindFlangeInputs,
} from "@/lib/calculators/engines/blind-flange";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { BLIND_FLANGE_URL_CONFIG } from "@/lib/calculators/url-configs/blind-flange";
import { listFlangeClassesForNps, listFlangeNps } from "@/lib/data/loaders";

type BlindFlangeCalculatorProps = {
  title: string;
  standard?: string;
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const FLANGE_NPS_OPTIONS = [
  { value: "0.5", label: "1/2\" (DN 15)" },
  { value: "0.75", label: "3/4\" (DN 20)" },
  { value: "1", label: "1\" (DN 25)" },
  { value: "1.25", label: "1-1/4\" (DN 32)" },
  { value: "1.5", label: "1-1/2\" (DN 40)" },
  { value: "2", label: "2\" (DN 50)" },
  { value: "2.5", label: "2-1/2\" (DN 65)" },
  { value: "3", label: "3\" (DN 80)" },
  { value: "3.5", label: "3-1/2\" (DN 90)" },
  { value: "4", label: "4\" (DN 100)" },
  { value: "5", label: "5\" (DN 125)" },
  { value: "6", label: "6\" (DN 150)" },
  { value: "8", label: "8\" (DN 200)" },
  { value: "10", label: "10\" (DN 250)" },
  { value: "12", label: "12\" (DN 300)" },
  { value: "14", label: "14\" (DN 350)" },
  { value: "16", label: "16\" (DN 400)" },
  { value: "18", label: "18\" (DN 450)" },
  { value: "20", label: "20\" (DN 500)" },
  { value: "24", label: "24\" (DN 600)" },
];

const FLANGE_CLASS_OPTIONS = ["150", "300", "600", "900", "1500", "2500"];

export default function BlindFlangeCalculator({
  title,
  standard,
}: BlindFlangeCalculatorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { inputs, setField } = useCalculatorUrlSync<BlindFlangeInputs>(
    DEFAULT_BLIND_FLANGE_INPUTS,
    BLIND_FLANGE_URL_CONFIG,
    { type: "blind-flange" },
  );

  const activeMode: BlindDesignMode =
    inputs.mode === "hydrotest" ? "hydrotest" : "permanent";

  const output = useMemo(() => calculateBlindFlange(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const unit = inputs.unitSystem === "metric" ? "mm" : "in";
  const pressureUnit = inputs.unitSystem === "metric" ? "MPa" : "psi";
  const stressUnit = inputs.unitSystem === "metric" ? "MPa" : "psi";
  const tRequired = requiredBlindThicknessMm(inputs);
  const corrosionBadge =
    inputs.unitSystem === "metric" ? "c ≥ 3.0 mm" : "c ≥ 0.125 in";
  const hydroCorrosionBadge =
    inputs.unitSystem === "metric" ? "c = 0.0 mm" : "c = 0.0 in";

  // Recover from legacy bookmarks where mm d was stored under imperial units.
  useEffect(() => {
    if (inputs.unitSystem !== "imperial") return;
    if (!(inputs.insideDiameter > 48)) return;
    const mapped = getStandardGasketContactDiameter(
      inputs.nps ?? "4",
      inputs.pressureClass ?? "150",
      "imperial",
    );
    if (mapped != null && mapped > 0) {
      setField("insideDiameter", mapped);
    }
  }, [
    inputs.unitSystem,
    inputs.insideDiameter,
    inputs.nps,
    inputs.pressureClass,
    setField,
  ]);

  function handleModeChange(newMode: BlindDesignMode) {
    const currentMat = inputs.materialId ?? "a516_70";
    const newStress = getAllowableStressForMaterial(
      currentMat,
      newMode,
      inputs.unitSystem,
    );
    const newCorrosion =
      newMode === "hydrotest"
        ? 0.0
        : inputs.unitSystem === "metric"
          ? 3.0
          : 0.125;

    setField("mode", newMode);
    setField("allowableStress", newStress);
    setField("corrosionAllowance", newCorrosion);
  }

  function handleMaterialChange(materialId: string) {
    setField("materialId", materialId);
    if (materialId !== "custom") {
      setField(
        "allowableStress",
        getAllowableStressForMaterial(
          materialId,
          activeMode,
          inputs.unitSystem,
        ),
      );
    }
  }

  function handleFlangeSelection(nps: string, pressureClass: string) {
    setField("nps", nps);
    setField("pressureClass", pressureClass);
    const mappedD = getStandardGasketContactDiameter(
      nps,
      pressureClass,
      inputs.unitSystem,
    );
    if (mappedD != null && mappedD > 0) {
      setField("insideDiameter", mappedD);
    }
  }

  const inputRows = [
    {
      label: "Design Mode",
      value:
        activeMode === "hydrotest"
          ? "Hydrotest Temporary Blank"
          : "Permanent Operating Blind",
    },
    {
      label: "Flange Size & Class",
      value: `${inputs.nps ?? "4"}" #${inputs.pressureClass ?? "150"}`,
    },
    {
      label: "Gasket Contact Dia (d)",
      value: `${formatBlindLength(inputs.insideDiameter, inputs.unitSystem)} ${unit}`,
    },
    {
      label: activeMode === "hydrotest" ? "Test Pressure (Pt)" : "Design Pressure (P)",
      value: `${inputs.designPressure} ${pressureUnit}`,
    },
    {
      label: "Allowable Stress (S)",
      value: `${inputs.allowableStress} ${stressUnit}`,
    },
    {
      label: "Corrosion Allowance (c)",
      value: `${formatBlindLength(inputs.corrosionAllowance, inputs.unitSystem, "corrosion")} ${unit}`,
    },
  ];

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      inputNaturalHeight
      visual={
        <BlindFlangeSchematic
          diameterLabel={`${formatBlindLength(inputs.insideDiameter, inputs.unitSystem)} ${unit}`}
          thicknessLabel={`${formatBlindLength(tRequired, inputs.unitSystem)} ${unit}`}
          corrosionLabel={`${formatBlindLength(inputs.corrosionAllowance, inputs.unitSystem, "corrosion")} ${unit}`}
          pressureLabel={`${inputs.designPressure} ${pressureUnit}`}
        />
      }
      resultPanel={
        <BlindFlangeResultPanel
          output={output}
          chart={
            <BlindThicknessMatrixChart
              inputs={inputs}
              onSelectCell={(nps, cls) => handleFlangeSelection(nps, cls)}
            />
          }
        />
      }
      footerPanel={
        <BlindFlangeBreakdownPanel
          output={output}
          exportTitle={title}
          standard={standard}
          inputRows={inputRows}
        />
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3 [&_.calc-field]:max-w-none">
          {/* Mode Switch Tabs */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleModeChange("permanent")}
                className={`flex flex-col items-center justify-center rounded-lg px-3 py-2 text-center transition-all ${
                  activeMode === "permanent"
                    ? "border border-blue-200 bg-white shadow-sm dark:border-blue-900/50 dark:bg-slate-800"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50"
                }`}
              >
                <span
                  className={`text-xs font-bold md:text-sm ${
                    activeMode === "permanent"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Permanent Design Blind
                </span>
                <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  Operating Service ({corrosionBadge})
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("hydrotest")}
                className={`flex flex-col items-center justify-center rounded-lg px-3 py-2 text-center transition-all ${
                  activeMode === "hydrotest"
                    ? "border border-emerald-200 bg-white shadow-sm dark:border-emerald-900/50 dark:bg-slate-800"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50"
                }`}
              >
                <span
                  className={`text-xs font-bold md:text-sm ${
                    activeMode === "hydrotest"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Temporary Test Blank
                </span>
                <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  Hydrotest / Leak Test ({hydroCorrosionBadge})
                </span>
              </button>
            </div>
          </div>

          {/* Design conditions (under 1. Input Parameters — no duplicate top-level number) */}
          <div className="w-full min-w-0 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Design Conditions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={FIELD_LABEL_CLASS}>Flange Size (NPS)</label>
                <select
                  value={inputs.nps ?? "4"}
                  onChange={(e) =>
                    handleFlangeSelection(
                      e.target.value,
                      inputs.pressureClass ?? "150",
                    )
                  }
                  className={FIELD_SELECT_CLASS}
                >
                  {FLANGE_NPS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={FIELD_LABEL_CLASS}>Pressure Class</label>
                <select
                  value={inputs.pressureClass ?? "150"}
                  onChange={(e) =>
                    handleFlangeSelection(
                      inputs.nps ?? "4",
                      e.target.value,
                    )
                  }
                  className={FIELD_SELECT_CLASS}
                >
                  {FLANGE_CLASS_OPTIONS.map((cls) => (
                    <option key={cls} value={cls}>
                      Class {cls}#
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <FieldGroup
              label={
                activeMode === "hydrotest"
                  ? "Hydrotest Pressure (Pt)"
                  : "Design Pressure (P)"
              }
              value={
                inputs.unitSystem === "imperial"
                  ? Number(inputs.designPressure.toFixed(1))
                  : Number(inputs.designPressure.toFixed(2))
              }
              onChange={(value) =>
                setField(
                  "designPressure",
                  toNumber(value, inputs.designPressure),
                )
              }
              unit={pressureUnit}
              highlight="P"
            />

            <div>
              <label className={FIELD_LABEL_CLASS}>
                Plate Material ({activeMode === "hydrotest" ? "Ambient Test" : "Design Temp"})
              </label>
              <select
                value={inputs.materialId ?? "a516_70"}
                onChange={(event) => handleMaterialChange(event.target.value)}
                className={FIELD_SELECT_CLASS}
              >
                {Object.entries(MATERIAL_STRESS_PRESETS).map(([id, preset]) => (
                  <option key={id} value={id}>
                    {formatBlindMaterialOption(
                      preset,
                      inputs.unitSystem,
                      activeMode,
                    )}
                  </option>
                ))}
                <option value="custom">Custom Allowable Stress</option>
              </select>
            </div>
          </div>

          {/* 1.2 Advanced Engineering Parameters (Collapsible) */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 dark:border-slate-800/90 dark:bg-slate-900/30">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-200/80 px-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  1.2
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
                  label="Gasket contact diameter (d) [B16.20 SWG/RF]"
                  value={Number(
                    formatBlindLength(inputs.insideDiameter, inputs.unitSystem),
                  )}
                  onChange={(value) =>
                    setField(
                      "insideDiameter",
                      toNumber(value, inputs.insideDiameter),
                    )
                  }
                  unit={unit}
                  highlight="d"
                />

                <FieldGroup
                  label={`Allowable stress (S) (${activeMode === "hydrotest" ? "Ambient" : "Design"})`}
                  value={Math.round(inputs.allowableStress)}
                  onChange={(value) =>
                    setField(
                      "allowableStress",
                      toNumber(value, inputs.allowableStress),
                    )
                  }
                  unit={stressUnit}
                  highlight="S"
                  hint={
                    activeMode === "hydrotest"
                      ? "Default uses ASME II-D ambient allowable stress. B31.3 Ch. VI may permit higher temporary limits up to ~0.9 Sy — confirm owner/test procedure before raising S."
                      : "Design-temperature allowable stress from ASME II-D (or project basis)."
                  }
                />

                <div className="grid grid-cols-2 gap-2">
                  <FieldGroup
                    label="Corrosion allowance (c)"
                    value={Number(
                      formatBlindLength(
                        inputs.corrosionAllowance,
                        inputs.unitSystem,
                        "corrosion",
                      ),
                    )}
                    onChange={(value) =>
                      setField(
                        "corrosionAllowance",
                        toNumber(value, inputs.corrosionAllowance),
                      )
                    }
                    unit={unit}
                    highlight="c"
                    hint={
                      activeMode === "hydrotest"
                        ? "Temporary blanks use c = 0. Permanent design typically 3.0 mm / 0.125 in."
                        : "Permanent blinds typically use c ≥ 3.0 mm (0.125 in)."
                    }
                  />

                  <FieldGroup
                    label="Joint efficiency (E)"
                    value={inputs.weldEfficiency}
                    onChange={(value) =>
                      setField(
                        "weldEfficiency",
                        toNumber(value, inputs.weldEfficiency),
                      )
                    }
                    highlight="E"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}
