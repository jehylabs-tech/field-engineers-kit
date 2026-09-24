"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import NonMetallicGasketSchematic from "@/components/calculator/schematics/NonMetallicGasketSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import { useUnitSystem } from "@/components/units/UnitContext";
import {
  B1621_MATERIAL_OPTIONS,
  B1621_PROFILE_OPTIONS,
  DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS,
  DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS_IMPERIAL,
  calculateNonMetallicGasketB1621,
  computeNonMetallicGasketB1621,
  listB1621ClassOptions,
  listB1621NpsOptions,
  listB1621ThicknessOptions,
  type B1621GasketProfile,
  type B1621MaterialId,
  type B1621ThicknessId,
  type NonMetallicGasketB1621Inputs,
} from "@/lib/calculators/engines/non-metallic-gasket-b1621";
import { NON_METALLIC_GASKET_B1621_URL_CONFIG } from "@/lib/calculators/url-configs/non-metallic-gasket-b1621";
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
  patch: Partial<NonMetallicGasketB1621Inputs>;
};

const METRIC_PRESETS: Preset[] = [
  {
    id: "nps4-150-ibc",
    label: "NPS 4 · 150 · IBC",
    patch: { ...DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS },
  },
  {
    id: "nps8-300-ff",
    label: "NPS 8 · 300 · FF · PTFE",
    patch: {
      unitSystem: "metric",
      flangeStandard: "b16.5",
      nps: "8",
      pressureClass: "300",
      gasketProfile: "full-face",
      materialId: "ptfe-ePTFE",
      thicknessId: "3.2",
      pressure: 20,
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "nps3-150-ibc",
    label: "NPS 3 · 150 · Graphite",
    patch: { ...DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS_IMPERIAL },
  },
  {
    id: "nps12-150-ff",
    label: "NPS 12 · 150 · FF · Rubber",
    patch: {
      unitSystem: "imperial",
      flangeStandard: "b16.5",
      nps: "12",
      pressureClass: "150",
      gasketProfile: "full-face",
      materialId: "neoprene-rubber",
      thicknessId: "3.2",
      pressure: 50,
    },
  },
];

function presetMatches(
  inputs: NonMetallicGasketB1621Inputs,
  preset: Preset,
): boolean {
  const p = preset.patch;
  return (
    inputs.unitSystem === (p.unitSystem ?? inputs.unitSystem) &&
    inputs.nps === (p.nps ?? inputs.nps) &&
    inputs.pressureClass === (p.pressureClass ?? inputs.pressureClass) &&
    inputs.gasketProfile === (p.gasketProfile ?? inputs.gasketProfile) &&
    inputs.materialId === (p.materialId ?? inputs.materialId)
  );
}

export default function NonMetallicGasketB1621Calculator({
  title,
  standard,
}: Props) {
  const { inputs, setInputs, setField } =
    useCalculatorUrlSync<NonMetallicGasketB1621Inputs>(
      DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS,
      NON_METALLIC_GASKET_B1621_URL_CONFIG,
      { type: "non-metallic-gasket-b1621" },
    );

  const { unitSystem: navUnitSystem, setUnitSystem } = useUnitSystem();
  useEffect(() => {
    if (inputs.unitSystem === navUnitSystem) return;
    setUnitSystem(inputs.unitSystem);
  }, [inputs.unitSystem, navUnitSystem, setUnitSystem]);

  useEffect(() => {
    const classes = listB1621ClassOptions(inputs.nps);
    if (
      classes.length > 0 &&
      !classes.some((c) => c.value === inputs.pressureClass)
    ) {
      setField("pressureClass", classes[0]!.value);
    }
  }, [inputs.nps, inputs.pressureClass, setField]);

  // Snap orphan B16.47 URL seeds back to B16.5 (Phase-1 scope).
  useEffect(() => {
    if (inputs.flangeStandard !== "b16.5") {
      setField("flangeStandard", "b16.5");
    }
  }, [inputs.flangeStandard, setField]);

  const output = useMemo(
    () => calculateNonMetallicGasketB1621(inputs),
    [inputs],
  );
  const detail = useMemo(
    () => computeNonMetallicGasketB1621(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const pressUnit = imperial ? "psi" : "bar";
  const lenUnit = imperial ? "in" : "mm";
  const presets = imperial ? IMPERIAL_PRESETS : METRIC_PRESETS;
  const MM_PER_IN = 25.4;
  const pressureDisplay = imperial
    ? Math.round(inputs.pressure)
    : Number(inputs.pressure.toFixed(2));

  function applyPreset(
    preset:
      | (typeof METRIC_PRESETS)[number]
      | (typeof IMPERIAL_PRESETS)[number],
  ) {
    setInputs((current) => ({
      ...current,
      ...preset.patch,
      unitSystem: preset.patch.unitSystem ?? current.unitSystem,
      flangeStandard: "b16.5",
    }));
  }

  const odDisp = imperial ? detail.odMm / MM_PER_IN : detail.odMm;
  const idDisp = imperial ? detail.idMm / MM_PER_IN : detail.idMm;
  const bDisp = imperial ? detail.bMm / MM_PER_IN : detail.bMm;
  const bcdDisp =
    detail.boltCircleMm != null
      ? imperial
        ? detail.boltCircleMm / MM_PER_IN
        : detail.boltCircleMm
      : undefined;

  const schematic = !detail.invalid ? (
    <NonMetallicGasketSchematic
      odLabel={`${odDisp.toFixed(imperial ? 2 : 1)} ${lenUnit}`}
      idLabel={`${idDisp.toFixed(imperial ? 2 : 1)} ${lenUnit}`}
      bLabel={`${bDisp.toFixed(imperial ? 3 : 2)} ${lenUnit}`}
      profile={inputs.gasketProfile}
      bcdLabel={
        bcdDisp != null
          ? `${bcdDisp.toFixed(imperial ? 2 : 1)} ${lenUnit}`
          : undefined
      }
      holeCount={detail.boltHoleCount}
    />
  ) : null;

  return (
    <CalculatorBaseLayout
      layout="formula"
      wideResult
      resultDashboard
      output={output}
      exportTitle={title}
      standard={standard}
      afterHero={schematic}
      inputRows={[
        {
          label: "NPS · Class",
          value: `NPS ${inputs.nps} · Class ${inputs.pressureClass}`,
        },
        {
          label: "Profile",
          value: inputs.gasketProfile === "ibc" ? "IBC ring" : "Full face",
        },
        {
          label: "Material",
          value:
            B1621_MATERIAL_OPTIONS.find((m) => m.value === inputs.materialId)
              ?.label ?? inputs.materialId,
        },
        {
          label: "Design P",
          value: `${pressureDisplay} ${pressUnit}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Flange size, profile &amp; material
          </h3>
          <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            ASME B16.5 NPS ½–24 · B16.47 Series A/B not in Phase-1
          </p>
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

          <SectionLabel>Flange</SectionLabel>
          <FieldSelect
            label="Nominal pipe size"
            value={inputs.nps}
            onChange={(v) => setField("nps", v)}
            options={listB1621NpsOptions()}
          />
          <FieldSelect
            label="Pressure class"
            value={inputs.pressureClass}
            onChange={(v) => setField("pressureClass", v)}
            options={listB1621ClassOptions(inputs.nps)}
          />

          <SectionLabel>Gasket</SectionLabel>
          <FieldSelect
            label="Profile"
            value={inputs.gasketProfile}
            onChange={(v) =>
              setField("gasketProfile", v as B1621GasketProfile)
            }
            options={B1621_PROFILE_OPTIONS}
          />
          <FieldSelect
            label="Material"
            value={inputs.materialId}
            onChange={(v) => setField("materialId", v as B1621MaterialId)}
            options={B1621_MATERIAL_OPTIONS}
          />
          <FieldSelect
            label="Nominal thickness"
            value={inputs.thicknessId}
            onChange={(v) => setField("thicknessId", v as B1621ThicknessId)}
            options={listB1621ThicknessOptions(inputs.unitSystem)}
          />
          <FieldGroup
            label="Design pressure (P)"
            value={pressureDisplay}
            onChange={(value) =>
              setField("pressure", toNumber(value, inputs.pressure))
            }
            unit={pressUnit}
            allowZero
          />
        </div>
      }
    />
  );
}
