"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, {
  FIELD_LABEL_CLASS,
  FIELD_SELECT_CLASS,
  FieldSelect,
} from "@/components/calculator/FieldGroup";
import SectionBlock from "@/components/calculator/SectionBlock";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  DEFAULT_PIPE_INPUTS,
  JOINT_QUALITY_PRESETS,
  PIPE_THICKNESS_MATERIAL_PRESETS,
  calculatePipeThickness,
  convertAllowableStress,
  defaultDesignTemperature,
  defaultMechanicalAllowance,
  formatMaterialPresetOption,
  jointEfficiencyForType,
  mapJointTypeFromEfficiency,
  minimumRequiredThickness,
  nominalRequiredThickness,
  pipeThicknessStressForMaterial,
  pressureDesignThickness,
  yCoefficientForDesign,
  type JointQualityId,
  type PipeThicknessInputs,
} from "@/lib/calculators/engines/pipe-thickness";
import PipeThicknessSchematic from "@/components/calculator/schematics/PipeThicknessSchematic";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PIPE_URL_CONFIG } from "@/lib/calculators/url-configs/pipe-thickness";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
  getPipeScheduleSize,
  listAvailableNps,
  listScheduleOptionsForNps,
  resolveScheduleOptionValue,
} from "@/lib/data/loaders";

type PipeThicknessCalculatorProps = {
  title: string;
  standard?: string;
};

const NPS_MIN = 0.5;
const NPS_MAX = 24;

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function convertLength(value: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to || !Number.isFinite(value)) return value;
  return to === "metric" ? value * 25.4 : value / 25.4;
}

function npsInRange(nps: string): boolean {
  const value = Number.parseFloat(nps);
  return Number.isFinite(value) && value >= NPS_MIN && value <= NPS_MAX;
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

  const yCoeff = useMemo(
    () =>
      inputs.yCoefficient ??
      yCoefficientForDesign(
        inputs.designTemperature,
        inputs.unitSystem,
        inputs.material,
      ),
    [
      inputs.yCoefficient,
      inputs.designTemperature,
      inputs.unitSystem,
      inputs.material,
    ],
  );

  const calcCore = useMemo(
    () => ({
      designPressure: inputs.designPressure,
      outsideDiameter: inputs.outsideDiameter,
      allowableStress: inputs.allowableStress,
      weldEfficiency: inputs.weldEfficiency,
      yCoefficient: yCoeff,
      corrosionAllowance: inputs.corrosionAllowance,
    }),
    [
      inputs.designPressure,
      inputs.outsideDiameter,
      inputs.allowableStress,
      inputs.weldEfficiency,
      yCoeff,
      inputs.corrosionAllowance,
    ],
  );

  const output = useMemo(() => calculatePipeThickness(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const unit = inputs.unitSystem === "metric" ? "mm" : "in";
  const pressureUnit = inputs.unitSystem === "metric" ? "MPa" : "psi";
  const tempUnit = inputs.unitSystem === "metric" ? "°C" : "°F";
  const materialValue = inputs.material ?? "custom";
  const presetSelected = PIPE_THICKNESS_MATERIAL_PRESETS.some(
    (item) => item.id === materialValue,
  );

  const npsOptions = useMemo(
    () =>
      listAvailableNps()
        .filter((pipe) => npsInRange(pipe.nps))
        .map((pipe) => ({
          value: pipe.nps,
          label: pipe.npsLabel,
        })),
    [],
  );

  const scheduleOptions = useMemo(
    () =>
      listScheduleOptionsForNps(inputs.nps).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [inputs.nps],
  );

  function updateField<K extends keyof PipeThicknessInputs>(
    key: K,
    value: PipeThicknessInputs[K],
  ) {
    setField(key, value);
  }

  function applyNpsAndSchedule(nps: string, schedule: string) {
    const pipe = getPipeScheduleSize(nps);
    if (!pipe) return;
    const resolvedSchedule = resolveScheduleOptionValue(nps, schedule);
    const entry = getPipeScheduleEntry(nps, resolvedSchedule);
    const od =
      inputs.unitSystem === "metric"
        ? pipe.outsideDiameterMm
        : pipe.outsideDiameterIn;
    const wall = entry
      ? inputs.unitSystem === "metric"
        ? entry.row.wallThicknessMm
        : entry.row.wallThicknessMm / 25.4
      : inputs.actualThickness;

    setInputs((current) => ({
      ...current,
      nps,
      schedule: resolvedSchedule,
      outsideDiameter: od,
      actualThickness: wall,
    }));
  }

  function handleNpsChange(nps: string) {
    const nextSchedule = defaultScheduleForNps(nps, inputs.schedule);
    applyNpsAndSchedule(nps, nextSchedule);
  }

  function handleScheduleChange(schedule: string) {
    applyNpsAndSchedule(inputs.nps, schedule);
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
      yCoefficient: undefined,
    }));
  }

  function applyJointType(jointType: JointQualityId) {
    if (jointType === "custom") {
      setField("jointType", "custom");
      return;
    }
    const efficiency = jointEfficiencyForType(jointType);
    if (efficiency == null) return;
    setInputs((current) => ({
      ...current,
      jointType,
      weldEfficiency: efficiency,
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

  function changeWeldEfficiency(raw: string) {
    const nextEfficiency = toNumber(raw, inputs.weldEfficiency);
    setInputs((current) => ({
      ...current,
      weldEfficiency: nextEfficiency,
      jointType: mapJointTypeFromEfficiency(nextEfficiency),
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
            : convertAllowableStress(current.allowableStress, from, next);

        const pipe = getPipeScheduleSize(current.nps);
        const entry = getPipeScheduleEntry(
          current.nps,
          resolveScheduleOptionValue(current.nps, current.schedule),
        );
        const outsideDiameter = pipe
          ? next === "metric"
            ? pipe.outsideDiameterMm
            : pipe.outsideDiameterIn
          : convertLength(current.outsideDiameter, from, next);
        const actualThickness = entry
          ? next === "metric"
            ? entry.row.wallThicknessMm
            : entry.row.wallThicknessMm / 25.4
          : convertLength(current.actualThickness, from, next);

        return {
          ...current,
          unitSystem: next,
          allowableStress,
          outsideDiameter,
          actualThickness,
          designTemperature: defaultDesignTemperature(next),
          corrosionAllowance: defaultMechanicalAllowance(next),
          yCoefficient: undefined,
        };
      });
    }
    window.addEventListener("fek-units-change", onUnits);
    return () => window.removeEventListener("fek-units-change", onUnits);
  }, [setInputs]);

  useEffect(() => {
    const nextSchedule = defaultScheduleForNps(inputs.nps, inputs.schedule);
    if (nextSchedule && nextSchedule !== inputs.schedule) {
      handleScheduleChange(nextSchedule);
    }
  }, [inputs.nps]);

  const thicknessError =
    output.heroStatusLevel === "fail"
      ? "Selected schedule wall is below required nominal thickness (t_nom_req)"
      : undefined;

  const tPressure = pressureDesignThickness(calcCore);
  const tMin = minimumRequiredThickness(calcCore);
  const tNomReq = nominalRequiredThickness(calcCore);

  const inputRows = [
    { label: "NPS", value: inputs.nps ? `${inputs.nps}"` : "—" },
    { label: "Schedule", value: inputs.schedule ? `Sch ${inputs.schedule}` : "—" },
    { label: "Outside diameter", value: `${inputs.outsideDiameter} ${unit}` },
    { label: "Design pressure", value: `${inputs.designPressure} ${pressureUnit}` },
    {
      label: "Design temperature",
      value: `${inputs.designTemperature} ${tempUnit}`,
    },
    {
      label: "Material",
      value:
        PIPE_THICKNESS_MATERIAL_PRESETS.find((item) => item.id === inputs.material)?.label ??
        "Custom",
    },
    { label: "Allowable stress", value: `${inputs.allowableStress} ${pressureUnit}` },
    { label: "Joint quality (E)", value: String(inputs.weldEfficiency) },
    {
      label: "Mechanical / corrosion allowance",
      value: `${inputs.corrosionAllowance} ${unit}`,
    },
    { label: "Schedule wall", value: `${inputs.actualThickness} ${unit}` },
  ];

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      visual={
        <PipeThicknessSchematic
          odLabel={`${inputs.outsideDiameter} ${unit}`}
          tminLabel={`${tNomReq.toFixed(2)} ${unit}`}
          actualLabel={`${inputs.actualThickness} ${unit}`}
          caLabel={`${inputs.corrosionAllowance} ${unit}`}
          pressureLabel={`${inputs.designPressure} ${pressureUnit}`}
        />
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3 [&_.calc-field]:max-w-none">
          <SectionBlock number={1} title="Input Parameters" twoColumn={false} compact>
            <FieldSelect
              label="Nominal pipe size (NPS)"
              value={inputs.nps}
              options={npsOptions}
              onChange={handleNpsChange}
              hint="ASME B36.10M / B36.19M — NPS 0.5 in to 24 in"
            />

            <FieldSelect
              label="Pipe schedule"
              value={resolveScheduleOptionValue(inputs.nps, inputs.schedule)}
              options={scheduleOptions}
              onChange={handleScheduleChange}
              hint="Nominal wall thickness from standard tables — compared against t_nom_req"
            />

            <FieldGroup
              label="Design pressure (P)"
              hint="Internal design gauge pressure P — ASME B31.3 Para. 304.1.2(a)."
              value={inputs.designPressure}
              onChange={(value) =>
                updateField("designPressure", toNumber(value, inputs.designPressure))
              }
              unit={pressureUnit}
              highlight="P"
              autoFocus
            />

            <FieldGroup
              label="Outside diameter (D)"
              hint="Pipe OD D per ASME B36.10M — auto-mapped from selected NPS."
              value={inputs.outsideDiameter}
              onChange={(value) =>
                updateField("outsideDiameter", toNumber(value, inputs.outsideDiameter))
              }
              unit={unit}
              highlight="D"
            />

            <FieldGroup
              label="Corrosion / mechanical allowance (c)"
              hint="Primary design allowance c in t_m = t + c — default 1.5 mm (0.063 in), step 0.1."
              value={inputs.corrosionAllowance}
              onChange={(value) =>
                updateField(
                  "corrosionAllowance",
                  toNumber(value, inputs.corrosionAllowance),
                )
              }
              unit={unit}
              highlight="c"
              allowZero
            />

            <div>
              <label className={FIELD_LABEL_CLASS}>
                Pipe material (ASME B31.3 Table A-1)
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

            <FieldGroup
              label="Design temperature (T)"
              hint="Auto-adjusts coefficient Y per ASME B31.3 Table 304.1.1-1 (ferritic ≤482 °C / 900 °F → Y = 0.4)."
              value={inputs.designTemperature}
              onChange={(value) => {
                const nextTemp = toNumber(value, inputs.designTemperature);
                setInputs((current) => ({
                  ...current,
                  designTemperature: nextTemp,
                  yCoefficient: undefined,
                }));
              }}
              unit={tempUnit}
            />

            <div>
              <label className={FIELD_LABEL_CLASS}>
                Joint quality factor (E)
              </label>
              <select
                value={inputs.jointType}
                onChange={(event) =>
                  applyJointType(event.target.value as JointQualityId)
                }
                className={FIELD_SELECT_CLASS}
              >
                {JOINT_QUALITY_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
                <option value="custom">Custom (enter E manually)</option>
              </select>
            </div>
          </SectionBlock>

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
                  Manual Override
                </span>
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {showAdvanced ? "▲ Hide" : "▼ Edit"}
              </span>
            </button>

            {showAdvanced && (
              <div className="space-y-3 border-t border-slate-200/80 p-3.5 dark:border-slate-800">
                <FieldGroup
                  label="Schedule nominal wall (t)"
                  hint="From selected schedule — compared against t_nom_req for PASS/FAIL."
                  value={inputs.actualThickness}
                  onChange={(value) =>
                    updateField(
                      "actualThickness",
                      toNumber(value, inputs.actualThickness),
                    )
                  }
                  unit={unit}
                  error={thicknessError}
                  highlight="tact"
                />
                <FieldGroup
                  label="Allowable stress (S)"
                  hint="Table A-1 S at design temperature — manual edits switch material to Custom."
                  value={inputs.allowableStress}
                  onChange={changeAllowableStress}
                  unit={pressureUnit}
                  highlight="S"
                />
                <FieldGroup
                  label="Weld joint efficiency (E)"
                  hint="Longitudinal joint efficiency E per ASME B31.3 Table 302.4."
                  value={inputs.weldEfficiency}
                  onChange={changeWeldEfficiency}
                  highlight="E"
                />
                <FieldGroup
                  label="Coefficient Y"
                  hint={`Auto from temperature: ${yCoeff.toFixed(2)} — override if needed.`}
                  value={yCoeff}
                  onChange={(value) =>
                    updateField("yCoefficient", toNumber(value, yCoeff))
                  }
                />
                <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                  <p>
                    <span className="font-semibold">t</span> (pressure design) ={" "}
                    {tPressure.toFixed(3)} {unit}
                  </p>
                  <p>
                    <span className="font-semibold">t_m</span> (t + c) ={" "}
                    {tMin.toFixed(3)} {unit}
                  </p>
                  <p>
                    <span className="font-semibold">t_nom_req</span> (t_min / 0.875) ={" "}
                    {tNomReq.toFixed(3)} {unit}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}
