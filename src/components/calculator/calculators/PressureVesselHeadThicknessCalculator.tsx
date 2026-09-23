"use client";

import { useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import HeadSchematic from "@/components/calculator/schematics/HeadSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  ASME_VIII_HEAD_MATERIAL_IDS,
  ASME_VIII_HEAD_MATERIALS,
  type AsmeViiiHeadMaterialId,
} from "@/lib/calculators/data/asmeViiiDiv1AllowableStress";
import {
  ALPHA_RANGE_DEG,
  CA_RANGE_IN,
  CA_RANGE_MM,
  D_RANGE_IN,
  D_RANGE_MM,
  DEFAULT_PRESSURE_VESSEL_HEAD_THICKNESS_INPUTS,
  HEAD_TYPE_OPTIONS,
  JOINT_EFFICIENCY_OPTIONS,
  P_RANGE_MPA,
  P_RANGE_PSI,
  T_RANGE_C,
  T_RANGE_F,
  calculatePressureVesselHeadThickness,
  computePressureVesselHeadThickness,
  formatHeadLength,
  formatHeadMaterialOption,
  type HeadTypeId,
  type JointEfficiencyId,
  type PressureVesselHeadThicknessInputs,
} from "@/lib/calculators/engines/pressure-vessel-head-thickness";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PRESSURE_VESSEL_HEAD_THICKNESS_URL_CONFIG } from "@/lib/calculators/url-configs/pressure-vessel-head-thickness";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type Preset = {
  id: string;
  label: string;
  patch: Partial<PressureVesselHeadThicknessInputs>;
};

function presetMatches(
  inputs: PressureVesselHeadThicknessInputs,
  preset: Preset,
): boolean {
  const p = preset.patch;
  return (
    inputs.headType === p.headType &&
    inputs.insideDiameter === p.insideDiameter &&
    inputs.designPressure === p.designPressure &&
    inputs.materialId === p.materialId &&
    inputs.jointEfficiency === p.jointEfficiency &&
    inputs.corrosionAllowance === p.corrosionAllowance &&
    (p.headType !== "conical" || inputs.halfApexAngle === p.halfApexAngle)
  );
}

const METRIC_PRESETS: Preset[] = [
  {
    id: "se-1500-1.5",
    label: "2:1 SE · 1500 mm · 1.5 MPa",
    patch: {
      unitSystem: "metric",
      headType: "ellipsoidal-2-1",
      insideDiameter: 1500,
      designPressure: 1.5,
      designTemperature: 150,
      materialId: "SA-516-70",
      jointEfficiency: 1,
      corrosionAllowance: 3,
      halfApexAngle: 30,
    },
  },
  {
    id: "tori-2000-2",
    label: "Torispherical · 2000 mm · 2.0 MPa",
    patch: {
      unitSystem: "metric",
      headType: "torispherical",
      insideDiameter: 2000,
      designPressure: 2,
      designTemperature: 200,
      materialId: "SA-516-70",
      jointEfficiency: 0.85,
      corrosionAllowance: 3,
      halfApexAngle: 30,
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "hemi-60-300",
    label: "Hemi · 60 in · 300 psi",
    patch: {
      unitSystem: "imperial",
      headType: "hemispherical",
      insideDiameter: 60,
      designPressure: 300,
      designTemperature: 300,
      materialId: "SA-516-70",
      jointEfficiency: 1,
      corrosionAllowance: 0.125,
      halfApexAngle: 30,
    },
  },
  {
    id: "cone-48-150",
    label: "Conical · 48 in · 150 psi · 30°",
    patch: {
      unitSystem: "imperial",
      headType: "conical",
      insideDiameter: 48,
      designPressure: 150,
      designTemperature: 200,
      materialId: "SA-240-316L",
      jointEfficiency: 0.85,
      corrosionAllowance: 0,
      halfApexAngle: 30,
    },
  },
];

export default function PressureVesselHeadThicknessCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<PressureVesselHeadThicknessInputs>(
      DEFAULT_PRESSURE_VESSEL_HEAD_THICKNESS_INPUTS,
      PRESSURE_VESSEL_HEAD_THICKNESS_URL_CONFIG,
      { type: "pressure-vessel-head-thickness" },
    );

  const output = useMemo(
    () => calculatePressureVesselHeadThickness(inputs),
    [inputs],
  );
  const computed = useMemo(
    () => computePressureVesselHeadThickness(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const unit = inputs.unitSystem === "imperial" ? "in" : "mm";
  const pressureUnit = inputs.unitSystem === "imperial" ? "psi" : "MPa";
  const tempUnit = inputs.unitSystem === "imperial" ? "°F" : "°C";

  const headOptions = useMemo(
    () =>
      HEAD_TYPE_OPTIONS.map((o) => ({
        value: o.value,
        label: `${o.label} · ${o.ugRef}`,
      })),
    [],
  );
  const materialOptions = useMemo(
    () =>
      ASME_VIII_HEAD_MATERIAL_IDS.map((id) => ({
        value: id,
        label: formatHeadMaterialOption(
          id,
          inputs.designTemperature,
          inputs.unitSystem,
        ),
      })),
    [inputs.designTemperature, inputs.unitSystem],
  );
  const jointOptions = useMemo(
    () =>
      JOINT_EFFICIENCY_OPTIONS.map((o) => ({
        value: String(o.value),
        label: o.label,
      })),
    [],
  );

  const presets =
    inputs.unitSystem === "imperial" ? IMPERIAL_PRESETS : METRIC_PRESETS;

  function applyPreset(
    preset: (typeof METRIC_PRESETS)[number] | (typeof IMPERIAL_PRESETS)[number],
  ) {
    setInputs((current) => ({
      ...current,
      ...preset.patch,
    }));
  }

  const dRange = inputs.unitSystem === "imperial" ? D_RANGE_IN : D_RANGE_MM;
  const pRange = inputs.unitSystem === "imperial" ? P_RANGE_PSI : P_RANGE_MPA;
  const tRange = inputs.unitSystem === "imperial" ? T_RANGE_F : T_RANGE_C;
  const caRange = inputs.unitSystem === "imperial" ? CA_RANGE_IN : CA_RANGE_MM;

  const headMeta =
    HEAD_TYPE_OPTIONS.find((o) => o.value === inputs.headType) ??
    HEAD_TYPE_OPTIONS[0];
  const materialMeta = ASME_VIII_HEAD_MATERIALS[inputs.materialId];

  const sLive = formatHeadMaterialOption(
    inputs.materialId,
    inputs.designTemperature,
    inputs.unitSystem,
  ).split(" — ")[1];

  const radiusLabel =
    inputs.headType === "torispherical"
      ? formatHeadLength(inputs.insideDiameter, inputs.unitSystem)
      : inputs.headType === "hemispherical"
        ? formatHeadLength(0.5 * inputs.insideDiameter, inputs.unitSystem)
        : undefined;

  const tDisplay = computed.invalid
    ? "—"
    : `${formatHeadLength(computed.tNom, inputs.unitSystem)} ${unit}`;

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        { label: "Head", value: headMeta.label },
        {
          label: "D",
          value: `${formatHeadLength(inputs.insideDiameter, inputs.unitSystem)} ${unit}`,
        },
        {
          label: "P",
          value: `${inputs.designPressure} ${pressureUnit}`,
        },
        {
          label: "T",
          value: `${inputs.designTemperature} ${tempUnit}`,
        },
        { label: "Material", value: materialMeta.shortLabel },
        { label: "E", value: inputs.jointEfficiency.toFixed(2) },
        {
          label: "C.A.",
          value: `${formatHeadLength(inputs.corrosionAllowance, inputs.unitSystem)} ${unit}`,
        },
      ]}
      visual={
        <HeadSchematic
          headType={inputs.headType}
          dLabel={`${formatHeadLength(inputs.insideDiameter, inputs.unitSystem)} ${unit}`}
          tLabel={tDisplay}
          radiusLabel={
            radiusLabel ? `${radiusLabel} ${unit}` : undefined
          }
          alphaLabel={
            inputs.headType === "conical"
              ? `${inputs.halfApexAngle}°`
              : undefined
          }
          pressureLabel={`${inputs.designPressure} ${pressureUnit}`}
        />
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
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

          <FieldSelect
            label="Head type"
            value={inputs.headType}
            options={headOptions}
            onChange={(value) => setField("headType", value as HeadTypeId)}
            hint="ASME VIII-1 UG-32 — internal pressure on concave side"
          />

          <FieldGroup
            label="Inside diameter (D)"
            hint={`${dRange.min}–${dRange.max} ${unit}`}
            value={inputs.insideDiameter}
            onChange={(value) =>
              setField("insideDiameter", toNumber(value, inputs.insideDiameter))
            }
            unit={unit}
            highlight="D"
          />

          <FieldGroup
            label="Design pressure (P)"
            hint={`${pRange.min}–${pRange.max} ${pressureUnit}`}
            value={inputs.designPressure}
            onChange={(value) =>
              setField("designPressure", toNumber(value, inputs.designPressure))
            }
            unit={pressureUnit}
            highlight="P"
          />

          <FieldGroup
            label="Design temperature (T)"
            hint={`${tRange.min}–${tRange.max} ${tempUnit}`}
            value={inputs.designTemperature}
            onChange={(value) =>
              setField(
                "designTemperature",
                toNumber(value, inputs.designTemperature),
              )
            }
            unit={tempUnit}
          />

          <FieldSelect
            label="Shell / head material"
            value={inputs.materialId}
            options={materialOptions}
            onChange={(value) =>
              setField("materialId", value as AsmeViiiHeadMaterialId)
            }
            hint="S(T) from ASME II-D Table 1A screening curve"
          />
          {sLive && !computed.invalid ? (
            <p className="m-0 -mt-1 text-xs text-slate-500 dark:text-slate-400">
              S = {sLive} at {inputs.designTemperature} {tempUnit}
            </p>
          ) : null}

          <FieldSelect
            label="Joint efficiency (E)"
            value={String(inputs.jointEfficiency)}
            options={jointOptions}
            onChange={(value) =>
              setField(
                "jointEfficiency",
                Number(value) as JointEfficiencyId,
              )
            }
          />

          <FieldGroup
            label="Corrosion allowance (C.A.)"
            hint={`${caRange.min}–${caRange.max} ${unit}`}
            value={inputs.corrosionAllowance}
            onChange={(value) =>
              setField(
                "corrosionAllowance",
                toNumber(value, inputs.corrosionAllowance),
              )
            }
            unit={unit}
            allowZero
            highlight="c"
          />

          {inputs.headType === "conical" && (
            <FieldGroup
              label="Half-apex angle (α)"
              hint={`UG-32(g) without knuckle: ${ALPHA_RANGE_DEG.min}–${ALPHA_RANGE_DEG.max}°`}
              value={inputs.halfApexAngle}
              onChange={(value) =>
                setField(
                  "halfApexAngle",
                  toNumber(value, inputs.halfApexAngle),
                )
              }
              unit="deg"
              highlight="alpha"
            />
          )}
        </div>
      }
    />
  );
}
