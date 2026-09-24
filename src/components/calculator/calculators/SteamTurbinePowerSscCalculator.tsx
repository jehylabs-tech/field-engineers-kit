"use client";

import { useMemo, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup from "@/components/calculator/FieldGroup";
import SteamTurbineSchematic from "@/components/calculator/schematics/SteamTurbineSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  DEFAULT_STEAM_TURBINE_POWER_SSC_INPUTS,
  DEFAULT_STEAM_TURBINE_POWER_SSC_INPUTS_IMPERIAL,
  calculateSteamTurbinePowerSsc,
  computeSteamTurbinePowerSsc,
  type SteamTurbinePowerSscInputs,
} from "@/lib/calculators/engines/steam-turbine-power-ssc";
import { STEAM_TURBINE_POWER_SSC_URL_CONFIG } from "@/lib/calculators/url-configs/steam-turbine-power-ssc";
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
  patch: Partial<SteamTurbinePowerSscInputs>;
};

const METRIC_PRESETS: Preset[] = [
  {
    id: "60bar-50th",
    label: "60 bar · 480 °C · 50 t/h",
    patch: { ...DEFAULT_STEAM_TURBINE_POWER_SSC_INPUTS },
  },
  {
    id: "100bar-100th",
    label: "100 bar · 540 °C · 100 t/h",
    patch: {
      unitSystem: "metric",
      inletPressure: 100,
      inletTemperature: 540,
      exhaustPressure: 0.08,
      massFlow: 100,
      etaIsentropicPct: 84,
      etaMechPct: 98.5,
      etaGenPct: 97.5,
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "850psi-100k",
    label: "850 psia · 850 °F · 100 klb/h",
    patch: { ...DEFAULT_STEAM_TURBINE_POWER_SSC_INPUTS_IMPERIAL },
  },
  {
    id: "1200psi-200k",
    label: "1200 psia · 950 °F · 200 klb/h",
    patch: {
      unitSystem: "imperial",
      inletPressure: 1200,
      inletTemperature: 950,
      exhaustPressure: 2.0,
      massFlow: 200000,
      etaIsentropicPct: 82,
      etaMechPct: 98.5,
      etaGenPct: 97.5,
    },
  },
];

function presetMatches(
  inputs: SteamTurbinePowerSscInputs,
  preset: Preset,
): boolean {
  const p = preset.patch;
  return (
    inputs.unitSystem === (p.unitSystem ?? inputs.unitSystem) &&
    inputs.inletPressure === p.inletPressure &&
    inputs.inletTemperature === p.inletTemperature &&
    inputs.massFlow === p.massFlow
  );
}

export default function SteamTurbinePowerSscCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setInputs, setField } =
    useCalculatorUrlSync<SteamTurbinePowerSscInputs>(
      DEFAULT_STEAM_TURBINE_POWER_SSC_INPUTS,
      STEAM_TURBINE_POWER_SSC_URL_CONFIG,
      { type: "steam-turbine-power-ssc" },
    );

  const output = useMemo(
    () => calculateSteamTurbinePowerSsc(inputs),
    [inputs],
  );
  const computed = useMemo(
    () => computeSteamTurbinePowerSsc(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const metric = inputs.unitSystem === "metric";
  const pUnit = metric ? "barA" : "psia";
  const tUnit = metric ? "°C" : "°F";
  const flowUnit = metric ? "t/h" : "lb/h";

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
        (preset.id.includes("psi") ? "imperial" : "metric"),
    });
  };

  const schematic = (
    <SteamTurbineSchematic
      p1Label={`${Number(inputs.inletPressure).toFixed(metric ? 1 : 0)} ${pUnit}`}
      t1Label={`${Number(inputs.inletTemperature).toFixed(0)} ${tUnit}`}
      p2Label={`${Number(inputs.exhaustPressure).toFixed(metric ? 2 : 1)} ${pUnit}`}
      powerLabel={computed.invalid ? "—" : `${computed.wElecMw.toFixed(2)} MW`}
      sscLabel={
        computed.invalid
          ? "—"
          : metric
            ? `${computed.sscKgPerKwh.toFixed(2)} kg/kWh`
            : `${(computed.sscKgPerKwh / 0.45359237).toFixed(2)} lb/kWh`
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
          label: "P₁ / T₁",
          value: `${inputs.inletPressure} ${pUnit} · ${inputs.inletTemperature} ${tUnit}`,
        },
        {
          label: "P₂",
          value: `${inputs.exhaustPressure} ${pUnit}`,
        },
        {
          label: "ṁ",
          value: `${inputs.massFlow} ${flowUnit}`,
        },
        {
          label: "η_is / η_m / η_g",
          value: `${inputs.etaIsentropicPct} / ${inputs.etaMechPct} / ${inputs.etaGenPct} %`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Steam duty &amp; efficiencies
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

          <SectionLabel>Inlet / exhaust</SectionLabel>
          <FieldGroup
            label="Inlet steam pressure (P₁)"
            value={inputs.inletPressure}
            onChange={(value) =>
              setField("inletPressure", toNumber(value, inputs.inletPressure))
            }
            unit={pUnit}
            highlight="P1"
          />
          <FieldGroup
            label="Inlet steam temperature (T₁)"
            value={inputs.inletTemperature}
            onChange={(value) =>
              setField(
                "inletTemperature",
                toNumber(value, inputs.inletTemperature),
              )
            }
            unit={tUnit}
            highlight="T1"
          />
          <FieldGroup
            label="Exhaust / condensing pressure (P₂)"
            value={inputs.exhaustPressure}
            onChange={(value) =>
              setField(
                "exhaustPressure",
                toNumber(value, inputs.exhaustPressure),
              )
            }
            unit={pUnit}
            highlight="P2"
            allowZero={false}
          />
          <FieldGroup
            label="Steam mass flow (ṁ)"
            value={inputs.massFlow}
            onChange={(value) =>
              setField("massFlow", toNumber(value, inputs.massFlow))
            }
            unit={flowUnit}
          />

          <SectionLabel>Efficiencies</SectionLabel>
          <FieldGroup
            label="Isentropic efficiency (η_is)"
            value={inputs.etaIsentropicPct}
            onChange={(value) =>
              setField(
                "etaIsentropicPct",
                toNumber(value, inputs.etaIsentropicPct),
              )
            }
            unit="%"
            highlight="TURB"
          />
          <FieldGroup
            label="Mechanical efficiency (η_mech)"
            value={inputs.etaMechPct}
            onChange={(value) =>
              setField("etaMechPct", toNumber(value, inputs.etaMechPct))
            }
            unit="%"
          />
          <FieldGroup
            label="Generator efficiency (η_gen)"
            value={inputs.etaGenPct}
            onChange={(value) =>
              setField("etaGenPct", toNumber(value, inputs.etaGenPct))
            }
            unit="%"
            highlight="PWR"
          />
        </div>
      }
    />
  );
}
