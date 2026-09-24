"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import PsvReactionForceSchematic from "@/components/calculator/schematics/PsvReactionForceSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import { useUnitSystem } from "@/components/units/UnitContext";
import {
  API520_GAS_OPTIONS,
  DEFAULT_PSV_REACTION_FORCE_INPUTS,
  DEFAULT_PSV_REACTION_FORCE_INPUTS_IMPERIAL,
  PSV_DISCHARGE_TYPE_OPTIONS,
  PSV_OUTLET_NPS_OPTIONS,
  PSV_SCHEDULE_OPTIONS,
  calculatePsvReactionForce,
  computePsvReactionForce,
  resolveApi520Gas,
  type Api520GasId,
  type PsvDischargeType,
  type PsvOutletSchedule,
  type PsvReactionForceInputs,
} from "@/lib/calculators/engines/psv-reaction-force";
import { PSV_REACTION_FORCE_URL_CONFIG } from "@/lib/calculators/url-configs/psv-reaction-force";
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
  patch: Partial<PsvReactionForceInputs>;
};

const METRIC_PRESETS: Preset[] = [
  {
    id: "co2-25t",
    label: "CO₂ · 25 t/h · NPS 4",
    patch: { ...DEFAULT_PSV_REACTION_FORCE_INPUTS },
  },
  {
    id: "steam-50t",
    label: "Steam · 50 t/h · NPS 6",
    patch: {
      unitSystem: "metric",
      dischargeType: "open-discharge",
      massFlow: 50000,
      relievingTemperature: 250,
      gasId: "steam",
      molecularWeight: 18.02,
      specificHeatRatio: 1.33,
      outletNps: "6",
      outletSchedule: "40",
      dynamicLoadFactor: 2,
      atmosphericPressure: 1.013,
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "air-50klbh",
    label: "Air · 50k lb/h · NPS 4",
    patch: { ...DEFAULT_PSV_REACTION_FORCE_INPUTS_IMPERIAL },
  },
  {
    id: "hc-100klbh",
    label: "HC · 100k lb/h · NPS 8",
    patch: {
      unitSystem: "imperial",
      dischargeType: "open-discharge",
      massFlow: 100000,
      relievingTemperature: 400,
      gasId: "hydrocarbon",
      molecularWeight: 58.12,
      specificHeatRatio: 1.12,
      outletNps: "8",
      outletSchedule: "40",
      dynamicLoadFactor: 2,
      atmosphericPressure: 14.7,
    },
  },
];

function presetMatches(
  inputs: PsvReactionForceInputs,
  preset: Preset,
): boolean {
  const p = preset.patch;
  return (
    inputs.unitSystem === (p.unitSystem ?? inputs.unitSystem) &&
    inputs.gasId === (p.gasId ?? inputs.gasId) &&
    inputs.outletNps === (p.outletNps ?? inputs.outletNps) &&
    inputs.massFlow === (p.massFlow ?? inputs.massFlow)
  );
}

export default function PsvReactionForceCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setInputs, setField } =
    useCalculatorUrlSync<PsvReactionForceInputs>(
      DEFAULT_PSV_REACTION_FORCE_INPUTS,
      PSV_REACTION_FORCE_URL_CONFIG,
      { type: "psv-reaction-force" },
    );

  const { unitSystem: navUnitSystem, setUnitSystem } = useUnitSystem();
  useEffect(() => {
    if (inputs.unitSystem === navUnitSystem) return;
    setUnitSystem(inputs.unitSystem);
  }, [inputs.unitSystem, navUnitSystem, setUnitSystem]);

  const output = useMemo(() => calculatePsvReactionForce(inputs), [inputs]);
  const detail = useMemo(() => computePsvReactionForce(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const flowUnit = imperial ? "lb/h" : "kg/h";
  const tempUnit = imperial ? "°F" : "°C";
  const pressUnit = imperial ? "psia" : "barA";
  const lenUnit = imperial ? "in" : "mm";
  const forceUnit = imperial ? "lbf" : "kN";
  const velUnit = imperial ? "ft/s" : "m/s";
  const presets = imperial ? IMPERIAL_PRESETS : METRIC_PRESETS;
  const customGas = inputs.gasId === "custom";
  const N_PER_LBF = 4.448221615;
  const MM_PER_IN = 25.4;

  function applyPreset(
    preset:
      | (typeof METRIC_PRESETS)[number]
      | (typeof IMPERIAL_PRESETS)[number],
  ) {
    setInputs((current) => ({
      ...current,
      ...preset.patch,
      unitSystem: preset.patch.unitSystem ?? current.unitSystem,
    }));
  }

  function onGasChange(gasId: Api520GasId) {
    const gas = resolveApi520Gas(gasId);
    setInputs((current) => ({
      ...current,
      gasId,
      molecularWeight: gas.molecularWeight,
      specificHeatRatio: gas.kRatio,
    }));
  }

  const fTot = imperial
    ? detail.fTotalN / N_PER_LBF
    : detail.fTotalN / 1000;
  const fSt = imperial
    ? detail.fSteadyN / N_PER_LBF
    : detail.fSteadyN / 1000;
  const fMom = imperial
    ? detail.fMomentumN / N_PER_LBF
    : detail.fMomentumN / 1000;
  const fPr = imperial
    ? detail.fPressureN / N_PER_LBF
    : detail.fPressureN / 1000;
  const vDisp = imperial
    ? detail.velocityMs * 3.280839895
    : detail.velocityMs;
  const idDisp = imperial ? detail.idMm / MM_PER_IN : detail.idMm;
  const forceDigits = imperial ? 0 : 2;

  const schematic = !detail.invalid ? (
    <PsvReactionForceSchematic
      npsLabel={`NPS ${inputs.outletNps}`}
      idLabel={`${idDisp.toFixed(imperial ? 3 : 1)} ${lenUnit}`}
      vLabel={`${vDisp.toFixed(0)} ${velUnit}`}
      fMomLabel={`${fMom.toFixed(forceDigits)} ${forceUnit}`}
      fPressLabel={`${fPr.toFixed(forceDigits)} ${forceUnit}`}
      fSteadyLabel={`${fSt.toFixed(forceDigits)} ${forceUnit}`}
      fTotalLabel={`${fTot.toFixed(forceDigits)} ${forceUnit}`}
      dlfLabel={inputs.dynamicLoadFactor.toFixed(1)}
      openDischarge={inputs.dischargeType === "open-discharge"}
      armLabel={imperial ? "4.92 ft" : "1.5 m"}
    />
  ) : null;

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      afterHero={schematic}
      inputRows={[
        {
          label: "Duty",
          value: `${inputs.massFlow} ${flowUnit} @ ${inputs.relievingTemperature} ${tempUnit}`,
        },
        {
          label: "Gas",
          value: resolveApi520Gas(inputs.gasId).label,
        },
        {
          label: "Outlet",
          value: `NPS ${inputs.outletNps} Sch ${inputs.outletSchedule}`,
        },
        {
          label: "Mode · DLF",
          value: `${inputs.dischargeType === "open-discharge" ? "Open" : "Closed"} · ${inputs.dynamicLoadFactor}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Relieving duty, gas &amp; outlet pipe
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

          <SectionLabel>Discharge</SectionLabel>
          <FieldSelect
            label="System type"
            value={inputs.dischargeType}
            onChange={(v) =>
              setField("dischargeType", v as PsvDischargeType)
            }
            options={PSV_DISCHARGE_TYPE_OPTIONS}
          />
          <FieldGroup
            label="Nameplate relieving capacity (W)"
            value={inputs.massFlow}
            onChange={(value) =>
              setField("massFlow", toNumber(value, inputs.massFlow))
            }
            unit={flowUnit}
          />
          <FieldGroup
            label="Relieving temperature"
            value={inputs.relievingTemperature}
            onChange={(value) =>
              setField(
                "relievingTemperature",
                toNumber(value, inputs.relievingTemperature),
              )
            }
            unit={tempUnit}
          />
          <FieldGroup
            label="Dynamic load factor (DLF)"
            value={inputs.dynamicLoadFactor}
            onChange={(value) =>
              setField(
                "dynamicLoadFactor",
                toNumber(value, inputs.dynamicLoadFactor),
              )
            }
            unit="—"
          />

          <SectionLabel>Gas</SectionLabel>
          <FieldSelect
            label="Gas / vapor"
            value={inputs.gasId}
            onChange={(v) => onGasChange(v as Api520GasId)}
            options={API520_GAS_OPTIONS}
          />
          {customGas ? (
            <>
              <FieldGroup
                label="Molecular weight (M)"
                value={inputs.molecularWeight}
                onChange={(value) =>
                  setField(
                    "molecularWeight",
                    toNumber(value, inputs.molecularWeight),
                  )
                }
                unit="g/mol"
              />
              <FieldGroup
                label="Specific heat ratio (k)"
                value={inputs.specificHeatRatio}
                onChange={(value) =>
                  setField(
                    "specificHeatRatio",
                    toNumber(value, inputs.specificHeatRatio),
                  )
                }
                unit="—"
              />
            </>
          ) : (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 dark:border-spec-border dark:bg-spec-bg dark:text-slate-300">
              M = {inputs.molecularWeight.toFixed(2)} g/mol · k ={" "}
              {inputs.specificHeatRatio.toFixed(2)} (API 520–style preset)
            </p>
          )}

          <SectionLabel>Outlet pipe</SectionLabel>
          <FieldSelect
            label="Outlet NPS"
            value={inputs.outletNps}
            onChange={(v) => setField("outletNps", v)}
            options={PSV_OUTLET_NPS_OPTIONS}
          />
          <FieldSelect
            label="Outlet schedule"
            value={inputs.outletSchedule}
            onChange={(v) =>
              setField("outletSchedule", v as PsvOutletSchedule)
            }
            options={PSV_SCHEDULE_OPTIONS}
          />
          <FieldGroup
            label="Atmospheric pressure"
            value={inputs.atmosphericPressure}
            onChange={(value) =>
              setField(
                "atmosphericPressure",
                toNumber(value, inputs.atmosphericPressure),
              )
            }
            unit={pressUnit}
          />
        </div>
      }
    />
  );
}
