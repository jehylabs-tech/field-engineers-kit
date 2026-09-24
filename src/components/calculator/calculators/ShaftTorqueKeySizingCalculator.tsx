"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, {
  FieldChipRadio,
  FieldSelect,
} from "@/components/calculator/FieldGroup";
import ShaftKeywaySchematic from "@/components/calculator/schematics/ShaftKeywaySchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  lookupAsmeB171SquareKey,
  lookupDin6885Key,
  type ShaftSteelId,
} from "@/lib/calculators/data/din6885ParallelKeys";
import {
  KEY_MATERIAL_OPTIONS,
  SHAFT_MATERIAL_OPTIONS,
  calculateShaftTorqueKeySizing,
  computeShaftTorqueKeySizing,
  DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS,
  DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS_IMPERIAL,
  lengthToMm,
  mmToDisplay,
  type ShaftTorqueKeySizingInputs,
} from "@/lib/calculators/engines/shaft-torque-key-sizing";
import { SHAFT_TORQUE_KEY_SIZING_URL_CONFIG } from "@/lib/calculators/url-configs/shaft-torque-key-sizing";
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
  patch: Partial<ShaftTorqueKeySizingInputs>;
};

const METRIC_PRESETS: Preset[] = [
  {
    id: "45kw-50mm",
    label: "45 kW · Ø50 mm · 14×9",
    patch: { ...DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS },
  },
  {
    id: "110kw-65mm",
    label: "110 kW · Ø65 mm · 18×11",
    patch: {
      unitSystem: "metric",
      shaftPower: 110,
      rotationalSpeed: 3000,
      shaftDiameter: 65,
      shaftMaterial: "SCM440",
      keyMaterial: "S45C",
      keyWidth: 18,
      keyHeight: 11,
      keyLength: 70,
      safetyFactor: 2,
      autoKeySize: true,
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "60hp-2in",
    label: "60 HP · Ø2 in · ½×½",
    patch: { ...DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS_IMPERIAL },
  },
  {
    id: "200hp-2.5in",
    label: "200 HP · Ø2.5 in · ⅝×⅝",
    patch: {
      unitSystem: "imperial",
      shaftPower: 200,
      rotationalSpeed: 3600,
      shaftDiameter: 2.5,
      shaftMaterial: "AISI4140",
      keyMaterial: "AISI1045",
      keyWidth: 0.625,
      keyHeight: 0.625,
      keyLength: 3,
      safetyFactor: 2,
      autoKeySize: true,
    },
  },
];

function presetMatches(
  inputs: ShaftTorqueKeySizingInputs,
  preset: Preset,
): boolean {
  const p = preset.patch;
  return (
    inputs.unitSystem === (p.unitSystem ?? inputs.unitSystem) &&
    inputs.shaftPower === p.shaftPower &&
    inputs.rotationalSpeed === p.rotationalSpeed &&
    inputs.shaftDiameter === p.shaftDiameter
  );
}

const METRIC_SHAFT_MATS = ["S45C", "SCM440", "SUS304"] as const;
const IMPERIAL_SHAFT_MATS = ["AISI1045", "AISI4140", "SUS304"] as const;
const METRIC_KEY_MATS = ["S45C", "SUS304"] as const;
const IMPERIAL_KEY_MATS = ["AISI1045", "SUS304"] as const;

export default function ShaftTorqueKeySizingCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setInputs, setField } =
    useCalculatorUrlSync<ShaftTorqueKeySizingInputs>(
      DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS,
      SHAFT_TORQUE_KEY_SIZING_URL_CONFIG,
      { type: "shaft-torque-key-sizing" },
    );

  const imperial = inputs.unitSystem === "imperial";
  const lenUnit = imperial ? "in" : "mm";
  const powerUnit = imperial ? "HP" : "kW";
  const presets = imperial ? IMPERIAL_PRESETS : METRIC_PRESETS;

  const shaftMatIds = imperial ? IMPERIAL_SHAFT_MATS : METRIC_SHAFT_MATS;
  const keyMatIds = imperial ? IMPERIAL_KEY_MATS : METRIC_KEY_MATS;

  const shaftMatOptions = SHAFT_MATERIAL_OPTIONS.filter((o) =>
    (shaftMatIds as readonly string[]).includes(o.value),
  );
  const keyMatOptions = KEY_MATERIAL_OPTIONS.filter((o) =>
    (keyMatIds as readonly string[]).includes(o.value),
  );

  // Sync DIN / ASME key size when auto mode + diameter changes.
  useEffect(() => {
    if (!inputs.autoKeySize) return;
    if (inputs.unitSystem === "imperial") {
      const sq = lookupAsmeB171SquareKey(inputs.shaftDiameter);
      if (
        Math.abs(sq.bIn - inputs.keyWidth) < 1e-9 &&
        Math.abs(sq.hIn - inputs.keyHeight) < 1e-9
      ) {
        return;
      }
      setInputs((current) => ({
        ...current,
        keyWidth: sq.bIn,
        keyHeight: sq.hIn,
      }));
      return;
    }
    const dMm = lengthToMm(inputs.shaftDiameter, "metric");
    const din = lookupDin6885Key(dMm);
    if (
      Math.abs(din.bMm - inputs.keyWidth) < 1e-9 &&
      Math.abs(din.hMm - inputs.keyHeight) < 1e-9
    ) {
      return;
    }
    setInputs((current) => ({
      ...current,
      keyWidth: din.bMm,
      keyHeight: din.hMm,
    }));
  }, [
    inputs.autoKeySize,
    inputs.unitSystem,
    inputs.shaftDiameter,
    inputs.keyWidth,
    inputs.keyHeight,
    setInputs,
  ]);

  // Keep material ids valid for the active unit system's option list.
  useEffect(() => {
    const shaftOk = (shaftMatIds as readonly string[]).includes(
      inputs.shaftMaterial,
    );
    const keyOk = (keyMatIds as readonly string[]).includes(inputs.keyMaterial);
    if (shaftOk && keyOk) return;
    setInputs((current) => {
      let shaftMaterial = current.shaftMaterial;
      let keyMaterial = current.keyMaterial;
      if (!(shaftMatIds as readonly string[]).includes(shaftMaterial)) {
        if (current.unitSystem === "imperial") {
          if (shaftMaterial === "S45C") shaftMaterial = "AISI1045";
          else if (shaftMaterial === "SCM440") shaftMaterial = "AISI4140";
          else shaftMaterial = "AISI1045";
        } else {
          if (shaftMaterial === "AISI1045") shaftMaterial = "S45C";
          else if (shaftMaterial === "AISI4140") shaftMaterial = "SCM440";
          else shaftMaterial = "S45C";
        }
      }
      if (!(keyMatIds as readonly string[]).includes(keyMaterial)) {
        keyMaterial =
          current.unitSystem === "imperial"
            ? keyMaterial === "S45C"
              ? "AISI1045"
              : "AISI1045"
            : keyMaterial === "AISI1045"
              ? "S45C"
              : "S45C";
      }
      if (
        shaftMaterial === current.shaftMaterial &&
        keyMaterial === current.keyMaterial
      ) {
        return current;
      }
      return { ...current, shaftMaterial, keyMaterial };
    });
  }, [
    inputs.unitSystem,
    inputs.shaftMaterial,
    inputs.keyMaterial,
    shaftMatIds,
    keyMatIds,
    setInputs,
  ]);

  const output = useMemo(
    () => calculateShaftTorqueKeySizing(inputs),
    [inputs],
  );
  const detail = useMemo(
    () => computeShaftTorqueKeySizing(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  function applyPreset(
    preset: (typeof METRIC_PRESETS)[number] | (typeof IMPERIAL_PRESETS)[number],
  ) {
    setInputs((current) => ({
      ...current,
      ...preset.patch,
      unitSystem: preset.patch.unitSystem ?? current.unitSystem,
    }));
  }

  const schematic = (
    <ShaftKeywaySchematic
      dLabel={`${mmToDisplay(detail.dMm, inputs.unitSystem).toFixed(imperial ? 2 : 0)} ${lenUnit}`}
      bLabel={`${mmToDisplay(detail.bMm, inputs.unitSystem).toFixed(imperial ? 3 : 0)}`}
      hLabel={`${mmToDisplay(detail.hMm, inputs.unitSystem).toFixed(imperial ? 3 : 0)} ${lenUnit}`}
      h1Label={`${mmToDisplay(detail.h1Mm, inputs.unitSystem).toFixed(imperial ? 3 : 1)} ${lenUnit}`}
      h2Label={`${mmToDisplay(detail.t2Mm > 0 ? detail.t2Mm : detail.h1Mm, inputs.unitSystem).toFixed(imperial ? 3 : 1)} ${lenUnit}`}
      tLabel={
        imperial
          ? `${detail.torqueInLbf.toFixed(0)} in·lbf`
          : `${detail.torqueNm.toFixed(1)} N·m`
      }
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
          label: "Power",
          value: `${inputs.shaftPower} ${powerUnit}`,
        },
        { label: "Speed", value: `${inputs.rotationalSpeed} rpm` },
        {
          label: "Shaft Ø",
          value: `${inputs.shaftDiameter} ${lenUnit}`,
        },
        {
          label: "Key",
          value: `${inputs.keyWidth} × ${inputs.keyHeight} × ${inputs.keyLength} ${lenUnit}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Shaft power, diameter &amp; parallel key
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

          <SectionLabel>Duty</SectionLabel>
          <FieldGroup
            label="Shaft power (P)"
            value={inputs.shaftPower}
            onChange={(value) =>
              setField("shaftPower", toNumber(value, inputs.shaftPower))
            }
            unit={powerUnit}
          />
          <FieldGroup
            label="Rotational speed (n)"
            value={inputs.rotationalSpeed}
            onChange={(value) =>
              setField(
                "rotationalSpeed",
                toNumber(value, inputs.rotationalSpeed),
              )
            }
            unit="rpm"
          />
          <FieldGroup
            label="Shaft diameter (d)"
            value={inputs.shaftDiameter}
            onChange={(value) =>
              setField(
                "shaftDiameter",
                toNumber(value, inputs.shaftDiameter),
              )
            }
            unit={lenUnit}
          />

          <SectionLabel>Materials</SectionLabel>
          <FieldSelect
            label="Shaft material"
            value={inputs.shaftMaterial}
            onChange={(v) => setField("shaftMaterial", v as ShaftSteelId)}
            options={shaftMatOptions}
          />
          <FieldSelect
            label="Key material"
            value={inputs.keyMaterial}
            onChange={(v) => setField("keyMaterial", v as ShaftSteelId)}
            options={keyMatOptions}
          />

          <SectionLabel>Parallel key</SectionLabel>
          <FieldChipRadio
            label="Key size source"
            value={inputs.autoKeySize ? "auto" : "manual"}
            onChange={(v) => setField("autoKeySize", v === "auto")}
            options={[
              {
                value: "auto",
                label: imperial ? "ASME B17.1" : "DIN 6885",
              },
              { value: "manual", label: "Manual" },
            ]}
          />
          <FieldGroup
            label="Key width (b)"
            value={inputs.keyWidth}
            onChange={(value) => {
              const next = toNumber(value, inputs.keyWidth);
              setInputs((current) => ({
                ...current,
                autoKeySize: false,
                keyWidth: next,
              }));
            }}
            unit={lenUnit}
            disabled={inputs.autoKeySize}
          />
          <FieldGroup
            label="Key height (h)"
            value={inputs.keyHeight}
            onChange={(value) => {
              const next = toNumber(value, inputs.keyHeight);
              setInputs((current) => ({
                ...current,
                autoKeySize: false,
                keyHeight: next,
              }));
            }}
            unit={lenUnit}
            disabled={inputs.autoKeySize}
          />
          <FieldGroup
            label="Key length (L)"
            value={inputs.keyLength}
            onChange={(value) =>
              setField("keyLength", toNumber(value, inputs.keyLength))
            }
            unit={lenUnit}
            hint={
              imperial
                ? "Typical engagement ≈ 0.9·d–1.5·d (DIN guidance)."
                : "DIN 6885 recommends 0.9·d ≤ L ≤ 1.5·d."
            }
          />
          <FieldGroup
            label="Service safety factor (S.F.)"
            value={inputs.safetyFactor}
            onChange={(value) =>
              setField("safetyFactor", toNumber(value, inputs.safetyFactor))
            }
            unit="—"
          />
        </div>
      }
    />
  );
}
