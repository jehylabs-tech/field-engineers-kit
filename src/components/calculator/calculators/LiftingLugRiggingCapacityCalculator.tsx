"use client";

import { useMemo, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import LiftingLugSchematic from "@/components/calculator/schematics/LiftingLugSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  DEFAULT_LIFTING_LUG_INPUTS,
  DEFAULT_LIFTING_LUG_INPUTS_IMPERIAL,
  ELECTRODE_OPTIONS,
  LUG_COUNT_OPTIONS,
  LUG_MATERIAL_OPTIONS,
  calculateLiftingLugRiggingCapacity,
  computeLiftingLugRiggingCapacity,
  electrodeOptionLabel,
  knToForce,
  type ElectrodeId,
  type LugCount,
  type LugSteelId,
  type LiftingLugRiggingCapacityInputs,
} from "@/lib/calculators/engines/lifting-lug-rigging-capacity";
import { LIFTING_LUG_RIGGING_CAPACITY_URL_CONFIG } from "@/lib/calculators/url-configs/lifting-lug-rigging-capacity";
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
  patch: Partial<LiftingLugRiggingCapacityInputs>;
};

const METRIC_PRESETS: Preset[] = [
  {
    id: "15t-2-30",
    label: "15 t · 2 lugs · 30° · S355",
    patch: { ...DEFAULT_LIFTING_LUG_INPUTS },
  },
  {
    id: "50t-4-45",
    label: "50 t · 4 lugs · 45° · S355",
    patch: {
      unitSystem: "metric",
      liftWeight: 500,
      impactFactor: 1.2,
      lugCount: 4,
      slingAngleDeg: 45,
      plateThickness: 40,
      outerRadius: 120,
      holeDiameter: 65,
      pinDiameter: 60,
      lugHeight: 200,
      materialId: "S355",
      weldSize: 18,
      weldLength: 240,
      electrodeId: "E70XX",
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "30kip-2-0",
    label: "30 kip · 2 lugs · 0° · A36",
    patch: { ...DEFAULT_LIFTING_LUG_INPUTS_IMPERIAL },
  },
  {
    id: "100kip-4-30",
    label: "100 kip · 4 lugs · 30° · A572",
    patch: {
      unitSystem: "imperial",
      liftWeight: 100,
      impactFactor: 1.25,
      lugCount: 4,
      slingAngleDeg: 30,
      plateThickness: 1.5,
      outerRadius: 4.5,
      holeDiameter: 2.125,
      pinDiameter: 2,
      lugHeight: 8,
      materialId: "A572-50",
      weldSize: 0.625,
      weldLength: 8,
      electrodeId: "E70XX",
    },
  },
];

function presetMatches(
  inputs: LiftingLugRiggingCapacityInputs,
  preset: Preset,
): boolean {
  const p = preset.patch;
  return (
    inputs.unitSystem === (p.unitSystem ?? inputs.unitSystem) &&
    inputs.liftWeight === p.liftWeight &&
    inputs.lugCount === p.lugCount &&
    inputs.slingAngleDeg === p.slingAngleDeg &&
    inputs.materialId === p.materialId &&
    inputs.plateThickness === p.plateThickness
  );
}

export default function LiftingLugRiggingCapacityCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setInputs, setField } =
    useCalculatorUrlSync<LiftingLugRiggingCapacityInputs>(
      DEFAULT_LIFTING_LUG_INPUTS,
      LIFTING_LUG_RIGGING_CAPACITY_URL_CONFIG,
      { type: "lifting-lug-rigging-capacity" },
    );

  const output = useMemo(
    () => calculateLiftingLugRiggingCapacity(inputs),
    [inputs],
  );
  const computed = useMemo(
    () => computeLiftingLugRiggingCapacity(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const metric = inputs.unitSystem === "metric";
  const forceUnit = metric ? "kN" : "kip";
  const lenUnit = metric ? "mm" : "in";

  const presets =
    inputs.unitSystem === "imperial" ? IMPERIAL_PRESETS : METRIC_PRESETS;

  const applyPreset = (
    preset: (typeof METRIC_PRESETS)[number] | (typeof IMPERIAL_PRESETS)[number],
  ) => {
    setInputs({
      ...inputs,
      ...preset.patch,
      unitSystem:
        preset.patch.unitSystem ??
        (preset.id.includes("kip") ? "imperial" : "metric"),
    });
  };

  const schematic = (
    <LiftingLugSchematic
      thicknessLabel={`${Number(inputs.plateThickness).toFixed(metric ? 0 : 2)} ${lenUnit}`}
      holeLabel={`${Number(inputs.holeDiameter).toFixed(metric ? 0 : 2)} ${lenUnit}`}
      pinLabel={`${Number(inputs.pinDiameter).toFixed(metric ? 0 : 2)} ${lenUnit}`}
      angleLabel={`${Number(inputs.slingAngleDeg).toFixed(0)}°`}
      weldLabel={`${Number(inputs.weldSize).toFixed(metric ? 0 : 2)} ${lenUnit}`}
      ptLabel={`${knToForce(computed.pTensionKn, inputs.unitSystem).toFixed(1)} ${forceUnit}`}
      psLabel={`${knToForce(computed.pShearKn, inputs.unitSystem).toFixed(1)} ${forceUnit}`}
    />
  );

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      afterHero={schematic}
      inputRows={[
        {
          label: "W × IF",
          value: `${inputs.liftWeight} ${forceUnit} × ${inputs.impactFactor}`,
        },
        {
          label: "Lugs · θ",
          value: `${inputs.lugCount} · ${inputs.slingAngleDeg}°`,
        },
        {
          label: "Plate",
          value: `${inputs.materialId} · t ${inputs.plateThickness} ${lenUnit}`,
        },
        {
          label: "Pin / hole",
          value: `${inputs.pinDiameter} / ${inputs.holeDiameter} ${lenUnit}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Lift duty &amp; lug geometry
          </h3>
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

          <SectionLabel>Lift duty</SectionLabel>
          <FieldGroup
            label="Total lift weight (W)"
            value={inputs.liftWeight}
            onChange={(value) =>
              setField("liftWeight", toNumber(value, inputs.liftWeight))
            }
            unit={forceUnit}
            highlight="PT"
          />
          <FieldGroup
            label="Dynamic impact factor (IF)"
            value={inputs.impactFactor}
            onChange={(value) =>
              setField("impactFactor", toNumber(value, inputs.impactFactor))
            }
            unit="—"
            allowZero={false}
          />
          <FieldSelect
            label="Acting lugs (N)"
            value={String(inputs.lugCount)}
            onChange={(v) => setField("lugCount", Number(v) as LugCount)}
            options={LUG_COUNT_OPTIONS.map((o) => ({
              value: String(o.value),
              label: o.label,
            }))}
          />
          <FieldGroup
            label="Sling angle from vertical (θ)"
            value={inputs.slingAngleDeg}
            onChange={(value) =>
              setField("slingAngleDeg", toNumber(value, inputs.slingAngleDeg))
            }
            unit="deg"
            allowZero
            highlight="ANGLE"
          />

          <SectionLabel>Lug plate &amp; pin</SectionLabel>
          <FieldSelect
            label="Plate material"
            value={inputs.materialId}
            onChange={(v) => setField("materialId", v as LugSteelId)}
            options={LUG_MATERIAL_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
          <FieldGroup
            label="Plate thickness (t)"
            value={inputs.plateThickness}
            onChange={(value) =>
              setField(
                "plateThickness",
                toNumber(value, inputs.plateThickness),
              )
            }
            unit={lenUnit}
            highlight="T"
          />
          <FieldGroup
            label="Outer radius (R)"
            value={inputs.outerRadius}
            onChange={(value) =>
              setField("outerRadius", toNumber(value, inputs.outerRadius))
            }
            unit={lenUnit}
          />
          <FieldGroup
            label="Pin hole diameter (D_hole)"
            value={inputs.holeDiameter}
            onChange={(value) =>
              setField("holeDiameter", toNumber(value, inputs.holeDiameter))
            }
            unit={lenUnit}
            highlight="HOLE"
          />
          <FieldGroup
            label="Shackle pin diameter (D_pin)"
            value={inputs.pinDiameter}
            onChange={(value) =>
              setField("pinDiameter", toNumber(value, inputs.pinDiameter))
            }
            unit={lenUnit}
            highlight="PIN"
          />
          <FieldGroup
            label="Hole height above weld (h)"
            value={inputs.lugHeight}
            onChange={(value) =>
              setField("lugHeight", toNumber(value, inputs.lugHeight))
            }
            unit={lenUnit}
          />

          <SectionLabel>Base fillet weld</SectionLabel>
          <FieldGroup
            label="Fillet leg size (w)"
            value={inputs.weldSize}
            onChange={(value) =>
              setField("weldSize", toNumber(value, inputs.weldSize))
            }
            unit={lenUnit}
            highlight="WELD"
          />
          <FieldGroup
            label="Weld length per face (L)"
            value={inputs.weldLength}
            onChange={(value) =>
              setField("weldLength", toNumber(value, inputs.weldLength))
            }
            unit={lenUnit}
            highlight="WELD"
          />
          <FieldSelect
            label="Electrode (F_EXX)"
            value={inputs.electrodeId}
            onChange={(v) => setField("electrodeId", v as ElectrodeId)}
            options={ELECTRODE_OPTIONS.map((o) => ({
              value: o.value,
              label: electrodeOptionLabel(o.value, inputs.unitSystem),
            }))}
          />
        </div>
      }
    />
  );
}
