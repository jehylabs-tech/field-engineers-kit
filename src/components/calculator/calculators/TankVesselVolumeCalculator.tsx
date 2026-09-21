"use client";

import { useMemo, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import TankLevelSchematic from "@/components/calculator/schematics/TankLevelSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  buildDipstickTable,
  calculateTankVesselVolume,
  computeTankVesselVolume,
  DEFAULT_TANK_VESSEL_VOLUME_INPUTS,
  M3_TO_US_GAL,
  TANK_FLUID_OPTIONS,
  TANK_HEAD_TYPE_OPTIONS,
  TANK_ORIENTATION_OPTIONS,
  type TankFluid,
  type TankHeadType,
  type TankOrientation,
  type TankVesselVolumeInputs,
} from "@/lib/calculators/engines/tank-vessel-volume";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { TANK_VESSEL_VOLUME_URL_CONFIG } from "@/lib/calculators/url-configs/tank-vessel-volume";
import { kgM3ToLbFt3, lbFt3ToKgM3 } from "@/lib/unitConverter";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dualDimLabel(m: number, unitSystem: "metric" | "imperial"): string {
  const mm = m * 1000;
  const inch = m / 0.0254;
  if (unitSystem === "imperial") {
    return `${inch.toFixed(2)} in · ${mm.toFixed(0)} mm`;
  }
  return `${mm.toFixed(0)} mm · ${inch.toFixed(2)} in`;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </h4>
  );
}

type Preset = {
  id: string;
  label: string;
  patch: Partial<TankVesselVolumeInputs>;
};

const METRIC_PRESETS: Preset[] = [
  {
    id: "h-2to1-2000",
    label: "H · 2:1 · Ø2000",
    patch: {
      unitSystem: "metric",
      orientation: "horizontal",
      headType: "2to1-ellipsoidal",
      diameter: 2000,
      length: 6000,
      liquidLevel: 1200,
      fluid: "water",
      densityKgM3: 998,
    },
  },
  {
    id: "v-hemi-3000",
    label: "V · hemi · Ø3000",
    patch: {
      unitSystem: "metric",
      orientation: "vertical",
      headType: "hemispherical",
      diameter: 3000,
      length: 8000,
      liquidLevel: 5000,
      fluid: "water",
      densityKgM3: 998,
    },
  },
  {
    id: "h-fd-2500",
    label: "H · F&D · Ø2500",
    patch: {
      unitSystem: "metric",
      orientation: "horizontal",
      headType: "torispherical-klopper",
      diameter: 2500,
      length: 8000,
      liquidLevel: 1250,
      fluid: "diesel",
      densityKgM3: 850,
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "h-flat-96",
    label: 'H · flat · 96"',
    patch: {
      unitSystem: "imperial",
      orientation: "horizontal",
      headType: "flat",
      diameter: 96,
      length: 240,
      liquidLevel: 48,
      fluid: "water",
      densityKgM3: 998,
    },
  },
  {
    id: "v-2to1-120",
    label: 'V · 2:1 · 120"',
    patch: {
      unitSystem: "imperial",
      orientation: "vertical",
      headType: "2to1-ellipsoidal",
      diameter: 120,
      length: 360,
      liquidLevel: 200,
      fluid: "water",
      densityKgM3: 998,
    },
  },
];

export default function TankVesselVolumeCalculator({ title, standard }: Props) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<TankVesselVolumeInputs>(
      DEFAULT_TANK_VESSEL_VOLUME_INPUTS,
      TANK_VESSEL_VOLUME_URL_CONFIG,
      { type: "tank-vessel-volume" },
    );

  const output = useMemo(() => calculateTankVesselVolume(inputs), [inputs]);
  const computed = useMemo(() => computeTankVesselVolume(inputs), [inputs]);
  const dipstick = useMemo(() => buildDipstickTable(inputs, 11), [inputs]);
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const dimUnit = imperial ? "in" : "mm";
  const densUnit = imperial ? "lb/ft³" : "kg/m³";
  const densDisplay = imperial
    ? Number(kgM3ToLbFt3(inputs.densityKgM3).toFixed(2))
    : inputs.densityKgM3;
  const headMeta =
    TANK_HEAD_TYPE_OPTIONS.find((h) => h.value === inputs.headType) ??
    TANK_HEAD_TYPE_OPTIONS[1];
  const fluidMeta =
    TANK_FLUID_OPTIONS.find((f) => f.value === inputs.fluid) ??
    TANK_FLUID_OPTIONS[0];

  const presets = imperial ? IMPERIAL_PRESETS : METRIC_PRESETS;

  function applyPreset(
    preset: (typeof METRIC_PRESETS)[number] | (typeof IMPERIAL_PRESETS)[number],
  ) {
    setInputs({
      ...DEFAULT_TANK_VESSEL_VOLUME_INPUTS,
      ...preset.patch,
    });
  }

  const vesselHeightM =
    inputs.orientation === "vertical"
      ? 2 * computed.headDepthM + computed.lengthM
      : computed.diM;

  const fillFraction = vesselHeightM > 0 ? computed.hM / vesselHeightM : 0;

  const diDual = dualDimLabel(computed.diM, inputs.unitSystem);
  const lengthDual = dualDimLabel(computed.lengthM, inputs.unitSystem);
  const levelDual = dualDimLabel(computed.hM, inputs.unitSystem);
  const headDepthDual =
    computed.headDepthM > 0
      ? dualDimLabel(computed.headDepthM, inputs.unitSystem)
      : "0 (flat)";
  const fillPctLabel = computed.invalid
    ? "—"
    : `${computed.fillPct.toFixed(1)}%`;

  const calibrationChart = (
    <div className="mt-2 overflow-hidden rounded-md border border-slate-200 dark:border-spec-border">
      <div className="border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-spec-border dark:bg-spec-bg">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Dipstick calibration (screening)
        </p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          Geometric chart — no internals. Click a row to set liquid level h.
        </p>
      </div>
      <div className="max-h-[280px] overflow-auto">
        <table className="w-full min-w-[280px] border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-white dark:bg-spec-card">
            <tr className="border-b border-slate-200 dark:border-spec-border">
              <th className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-300">
                Dip ({dimUnit})
              </th>
              <th className="px-2 py-1.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                Volume
              </th>
              <th className="px-2 py-1.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                Fill %
              </th>
            </tr>
          </thead>
          <tbody>
            {dipstick.map((row) => {
              const active =
                Math.abs(row.dip - inputs.liquidLevel) <
                (imperial ? 0.05 : 1);
              const volPrimary = imperial
                ? `${(row.volumeM3 * M3_TO_US_GAL).toFixed(0)} gal`
                : `${row.volumeM3.toFixed(2)} m³`;
              const volSecondary = imperial
                ? `${row.volumeM3.toFixed(2)} m³`
                : `${(row.volumeM3 * M3_TO_US_GAL).toFixed(0)} gal`;
              return (
                <tr
                  key={row.dip}
                  className={`cursor-pointer border-b border-slate-100 last:border-b-0 dark:border-spec-border ${
                    active
                      ? "bg-blue-50/80 dark:bg-blue-950/30"
                      : "hover:bg-slate-50 dark:hover:bg-spec-bg/80"
                  }`}
                  onClick={() => setField("liquidLevel", row.dip)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setField("liquidLevel", row.dip);
                    }
                  }}
                  tabIndex={0}
                  aria-selected={active}
                >
                  <td className="px-2 py-1.5 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {row.dip}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {volPrimary}
                    <span className="ml-1 text-[10px] text-slate-500 dark:text-slate-400">
                      · {volSecondary}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold tabular-nums text-blue-800 dark:text-blue-200">
                    {row.fillPct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputNaturalHeight
      inputRows={[
        {
          label: "Setup",
          value: `${inputs.orientation === "horizontal" ? "H" : "V"} · ${headMeta.shortLabel}`,
        },
        { label: "Di × L", value: `${inputs.diameter} × ${inputs.length} ${dimUnit}` },
        { label: "Level h", value: `${inputs.liquidLevel} ${dimUnit}` },
        { label: "Fluid", value: fluidMeta.label },
      ]}
      afterHero={
        !computed.invalid ? (
          <>
            <TankLevelSchematic
              orientation={inputs.orientation}
              headType={inputs.headType}
              fillFraction={fillFraction}
              diameterLabel={diDual}
              lengthLabel={lengthDual}
              levelLabel={levelDual}
              headLabel={headMeta.shortLabel}
              fillPctLabel={fillPctLabel}
              headDepthLabel={headDepthDual}
            />
            {calibrationChart}
          </>
        ) : null
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active =
                inputs.orientation === preset.patch.orientation &&
                inputs.headType === preset.patch.headType &&
                inputs.diameter === preset.patch.diameter &&
                inputs.length === preset.patch.length &&
                inputs.unitSystem === preset.patch.unitSystem;
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

          <SectionLabel>Vessel geometry</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSelect
              label="Orientation"
              value={inputs.orientation}
              options={TANK_ORIENTATION_OPTIONS}
              onChange={(value) =>
                setField("orientation", value as TankOrientation)
              }
            />
            <FieldSelect
              label="Head type"
              value={inputs.headType}
              options={TANK_HEAD_TYPE_OPTIONS.map((h) => ({
                value: h.value,
                label: h.label,
              }))}
              onChange={(value) => setField("headType", value as TankHeadType)}
              hint={
                computed.headDepthM > 0
                  ? `Depth ≈ ${headDepthDual}`
                  : "Flat cover · depth = 0"
              }
            />
            <FieldGroup
              label="Inside diameter Di"
              unit={dimUnit}
              compactUnit
              value={inputs.diameter}
              onChange={(value) =>
                setField("diameter", toNumber(value, inputs.diameter))
              }
            />
            <FieldGroup
              label="Shell straight length L"
              unit={dimUnit}
              compactUnit
              value={inputs.length}
              onChange={(value) =>
                setField("length", toNumber(value, inputs.length))
              }
              hint="TT length between head tangent lines"
            />
          </div>

          <SectionLabel>Level &amp; fluid</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Liquid level h"
              unit={dimUnit}
              compactUnit
              allowZero
              value={inputs.liquidLevel}
              onChange={(value) =>
                setField("liquidLevel", toNumber(value, inputs.liquidLevel))
              }
              hint={
                inputs.orientation === "horizontal"
                  ? "From bottom · 0–Di"
                  : "From vessel bottom · 0–(2·head + L)"
              }
            />
            <FieldSelect
              label="Fluid"
              value={inputs.fluid}
              options={TANK_FLUID_OPTIONS.map((f) => ({
                value: f.value,
                label: f.label,
              }))}
              onChange={(value) => {
                const next = value as TankFluid;
                const dens =
                  TANK_FLUID_OPTIONS.find((f) => f.value === next)
                    ?.densityKgM3 ?? inputs.densityKgM3;
                setInputs((current) => ({
                  ...current,
                  fluid: next,
                  densityKgM3: next === "custom" ? current.densityKgM3 : dens,
                }));
              }}
            />
            <FieldGroup
              label="Density"
              unit={densUnit}
              compactUnit
              value={densDisplay}
              onChange={(value) => {
                const raw = toNumber(value, densDisplay);
                const dens = imperial ? lbFt3ToKgM3(raw) : raw;
                setInputs((current) => ({
                  ...current,
                  densityKgM3: dens,
                  fluid: "custom",
                }));
              }}
              hint={
                inputs.fluid === "custom"
                  ? "Custom density at duty temperature"
                  : `${fluidMeta.label} preset — edit to switch Custom`
              }
            />
          </div>
        </div>
      }
    />
  );
}
