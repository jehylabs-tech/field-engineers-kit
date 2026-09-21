"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import TankShellCoursePanel from "@/components/calculator/TankShellCoursePanel";
import TankShellCourseSchematic from "@/components/calculator/schematics/TankShellCourseSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  API650_MATERIALS,
  type Api650MaterialId,
} from "@/lib/calculators/data/api650Materials";
import {
  calculateApi650TankShellThickness,
  computeApi650TankShellThickness,
  CA_RANGE_IN,
  CA_RANGE_MM,
  COURSE_RANGE_FT,
  COURSE_RANGE_M,
  D_RANGE_FT,
  D_RANGE_M,
  DEFAULT_API650_TANK_SHELL_THICKNESS_INPUTS,
  G_RANGE,
  H_RANGE_FT,
  H_RANGE_M,
  type Api650JointEfficiency,
  type Api650TankShellThicknessInputs,
} from "@/lib/calculators/engines/api650-tank-shell-thickness";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { API650_TANK_SHELL_THICKNESS_URL_CONFIG } from "@/lib/calculators/url-configs/api650-tank-shell-thickness";
import {
  ceilToCommercialPlateIn,
  ceilToCommercialPlateMm,
} from "@/lib/calculators/data/commercialPlateSizes";
import { mmToIn } from "@/lib/unitConverter";

type Props = { title: string; standard?: string };

type DraftKey =
  | "tankDiameter"
  | "tankHeight"
  | "courseHeight"
  | "specificGravity"
  | "corrosionAllowance";

function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </h4>
  );
}

type DutyPreset = {
  id: string;
  label: string;
  patch: Partial<Api650TankShellThicknessInputs>;
};

const METRIC_PRESETS: DutyPreset[] = [
  {
    id: "20m-a36",
    label: "20 m · A36",
    patch: {
      unitSystem: "metric",
      tankDiameter: 20,
      tankHeight: 15,
      courseHeight: 2.5,
      specificGravity: 0.85,
      materialGrade: "A36",
      jointEfficiency: 0.85,
      corrosionAllowance: 2,
    },
  },
  {
    id: "40m-a516",
    label: "40 m · A516-70",
    patch: {
      unitSystem: "metric",
      tankDiameter: 40,
      tankHeight: 18,
      courseHeight: 2.5,
      specificGravity: 1,
      materialGrade: "A516-70",
      jointEfficiency: 1,
      corrosionAllowance: 3,
    },
  },
];

const IMPERIAL_PRESETS: DutyPreset[] = [
  {
    id: "60ft-a36",
    label: "60 ft · A36",
    patch: {
      unitSystem: "imperial",
      tankDiameter: 60,
      tankHeight: 48,
      courseHeight: 8,
      specificGravity: 0.85,
      materialGrade: "A36",
      jointEfficiency: 0.85,
      corrosionAllowance: 0.0625,
    },
  },
  {
    id: "100ft-a283",
    label: "100 ft · A283-C",
    patch: {
      unitSystem: "imperial",
      tankDiameter: 100,
      tankHeight: 50,
      courseHeight: 8,
      specificGravity: 1,
      materialGrade: "A283-C",
      jointEfficiency: 1,
      corrosionAllowance: 0.125,
    },
  },
];

function presetMatches(
  inputs: Api650TankShellThicknessInputs,
  preset: DutyPreset,
): boolean {
  const p = preset.patch;
  return (
    (p.tankDiameter == null || inputs.tankDiameter === p.tankDiameter) &&
    (p.tankHeight == null || inputs.tankHeight === p.tankHeight) &&
    (p.materialGrade == null || inputs.materialGrade === p.materialGrade) &&
    (p.unitSystem == null || inputs.unitSystem === p.unitSystem)
  );
}

export default function Api650TankShellThicknessCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<Api650TankShellThicknessInputs>(
      DEFAULT_API650_TANK_SHELL_THICKNESS_INPUTS,
      API650_TANK_SHELL_THICKNESS_URL_CONFIG,
      { type: "api650-tank-shell-thickness" },
    );

  const [drafts, setDrafts] = useState<Partial<Record<DraftKey, string>>>({});

  useEffect(() => {
    setDrafts({});
  }, [inputs.unitSystem]);

  const output = useMemo(
    () => calculateApi650TankShellThickness(inputs),
    [inputs],
  );
  const computed = useMemo(
    () => computeApi650TankShellThickness(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const dUnit = imperial ? "ft" : "m";
  const caUnit = imperial ? "in" : "mm";
  const dRange = imperial ? D_RANGE_FT : D_RANGE_M;
  const hRange = imperial ? H_RANGE_FT : H_RANGE_M;
  const chRange = imperial ? COURSE_RANGE_FT : COURSE_RANGE_M;
  const caRange = imperial ? CA_RANGE_IN : CA_RANGE_MM;
  const presets = imperial ? IMPERIAL_PRESETS : METRIC_PRESETS;
  const mat = API650_MATERIALS.find((m) => m.id === inputs.materialGrade);

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

  function applyPreset(
    preset: (typeof METRIC_PRESETS)[number] | (typeof IMPERIAL_PRESETS)[number],
  ) {
    setDrafts({});
    setInputs({
      ...DEFAULT_API650_TANK_SHELL_THICKNESS_INPUTS,
      ...preset.patch,
    });
  }

  const courseVisuals = computed.courses.map((c) => ({
    course: c.course,
    tNomLabel: imperial
      ? `${ceilToCommercialPlateIn(mmToIn(c.tRequiredMm)).toFixed(3)}"`
      : `${ceilToCommercialPlateMm(c.tRequiredMm)} mm`,
    highlight: c.course === 1,
  }));

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputNaturalHeight
      inputRows={[
        {
          label: "D × H",
          value: `${inputs.tankDiameter} × ${inputs.tankHeight} ${dUnit}`,
        },
        {
          label: "Material",
          value: inputs.materialGrade,
        },
        {
          label: "G / E",
          value: `${inputs.specificGravity} / ${inputs.jointEfficiency}`,
        },
        {
          label: "CA",
          value: `${inputs.corrosionAllowance} ${caUnit}`,
        },
      ]}
      afterHero={
        !computed.invalid ? (
          <>
            <TankShellCourseSchematic
              diameterLabel={`${inputs.tankDiameter} ${dUnit}`}
              heightLabel={`${inputs.tankHeight} ${dUnit}`}
              courses={courseVisuals}
            />
            <TankShellCoursePanel
              courses={computed.courses}
              imperial={imperial}
            />
          </>
        ) : null
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => {
              const active = presetMatches(inputs, p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-spec-border dark:bg-spec-bg dark:text-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <SectionLabel>Tank geometry</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Tank inner diameter D"
              unit={dUnit}
              compactUnit
              value={display("tankDiameter")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("tankDiameter", v, dRange.min, dRange.max)
              }
              onBlur={() => onNumBlur("tankDiameter", dRange.min, dRange.max)}
              chips={
                imperial
                  ? [
                      { label: "60", value: "60" },
                      { label: "100", value: "100" },
                    ]
                  : [
                      { label: "20", value: "20" },
                      { label: "40", value: "40" },
                    ]
              }
            />
            <FieldGroup
              label="Design liquid height H"
              unit={dUnit}
              compactUnit
              value={display("tankHeight")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("tankHeight", v, hRange.min, hRange.max)
              }
              onBlur={() => onNumBlur("tankHeight", hRange.min, hRange.max)}
              chips={
                imperial
                  ? [
                      { label: "48", value: "48" },
                      { label: "50", value: "50" },
                    ]
                  : [
                      { label: "15", value: "15" },
                      { label: "18", value: "18" },
                    ]
              }
            />
            <FieldGroup
              label="Course height"
              unit={dUnit}
              compactUnit
              value={display("courseHeight")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("courseHeight", v, chRange.min, chRange.max)
              }
              onBlur={() => onNumBlur("courseHeight", chRange.min, chRange.max)}
              hint={`${chRange.min}–${chRange.max}`}
            />
            <FieldGroup
              label="Specific gravity G"
              unit="—"
              compactUnit
              value={display("specificGravity")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("specificGravity", v, G_RANGE.min, G_RANGE.max)
              }
              onBlur={() => onNumBlur("specificGravity", G_RANGE.min, G_RANGE.max)}
              chips={[
                { label: "0.85", value: "0.85" },
                { label: "1.0", value: "1" },
              ]}
            />
          </div>

          <SectionLabel>Material &amp; joint</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSelect
              label="Plate material"
              value={inputs.materialGrade}
              options={API650_MATERIALS.map((m) => ({
                value: m.id,
                label: `${m.label} (S_d ${imperial ? m.sdPsi : m.sdMpa} ${imperial ? "psi" : "MPa"})`,
              }))}
              onChange={(v) =>
                setField("materialGrade", v as Api650MaterialId)
              }
              hint={
                mat
                  ? `S_t = ${imperial ? mat.stPsi : mat.stMpa} ${imperial ? "psi" : "MPa"}`
                  : undefined
              }
            />
            <FieldSelect
              label="Joint efficiency E"
              value={String(inputs.jointEfficiency)}
              options={[
                { value: "1", label: "1.00 (full RT)" },
                { value: "0.85", label: "0.85 (spot RT)" },
                { value: "0.7", label: "0.70 (no RT)" },
              ]}
              onChange={(v) =>
                setField(
                  "jointEfficiency",
                  Number(v) as Api650JointEfficiency,
                )
              }
            />
            <FieldGroup
              label="Corrosion allowance CA"
              unit={caUnit}
              compactUnit
              value={display("corrosionAllowance")}
              onChange={(v) =>
                onNumChange(
                  "corrosionAllowance",
                  v,
                  caRange.min,
                  caRange.max,
                )
              }
              onBlur={() =>
                onNumBlur("corrosionAllowance", caRange.min, caRange.max)
              }
              chips={
                imperial
                  ? [
                      { label: '1/16"', value: "0.0625" },
                      { label: '1/8"', value: "0.125" },
                    ]
                  : [
                      { label: "0", value: "0" },
                      { label: "2", value: "2" },
                      { label: "3", value: "3" },
                    ]
              }
            />
          </div>
        </div>
      }
    />
  );
}
