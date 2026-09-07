"use client";

import { useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateValveCv,
  type ValveCvFluid,
  type ValveCvInputs,
} from "@/lib/calculators/engines/valve-cv";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import {
  DEFAULT_VALVE_CV_INPUTS,
  VALVE_CV_URL_CONFIG,
} from "@/lib/calculators/url-configs/valve-cv";

type ValveCvCalculatorProps = {
  title: string;
  standard?: string;
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function ValveCvCalculator({
  title,
  standard,
}: ValveCvCalculatorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { inputs, setField } = useCalculatorUrlSync<ValveCvInputs>(
    DEFAULT_VALVE_CV_INPUTS,
    VALVE_CV_URL_CONFIG,
    { type: "valve-cv" },
  );

  const output = useMemo(() => calculateValveCv(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  function updateField<K extends keyof ValveCvInputs>(
    key: K,
    value: ValveCvInputs[K],
  ) {
    setField(key, value);
  }

  const imperial = inputs.unitSystem === "imperial";
  const flowUnit = imperial
    ? inputs.fluid === "liquid"
      ? "GPM"
      : "SCFH"
    : inputs.fluid === "liquid"
      ? "m³/h"
      : "Nm³/h";
  const pressureUnit = imperial ? "psig" : "bar g";
  const tempUnit = imperial ? "°F" : "°C";

  const inputRows = [
    { label: "Fluid type", value: inputs.fluid },
    { label: "Flow rate (Q)", value: `${inputs.flowRate} ${flowUnit}` },
    {
      label: "Inlet pressure (P1)",
      value: `${inputs.inletPressure} ${pressureUnit}`,
    },
    {
      label: "Outlet pressure (P2)",
      value: `${inputs.outletPressure} ${pressureUnit}`,
    },
    { label: "Specific gravity (SG)", value: String(inputs.specificGravity) },
    { label: "Temperature (T)", value: `${inputs.temperature} ${tempUnit}` },
    { label: "Catalog Cv,sel", value: String(inputs.requiredCv) },
  ];

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      inputPanel={
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3 [&_.calc-field]:max-w-none">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="grid grid-cols-2 gap-1.5">
              {(["liquid", "gas"] as ValveCvFluid[]).map((fluid) => (
                <button
                  key={fluid}
                  type="button"
                  onClick={() => updateField("fluid", fluid)}
                  className={`flex flex-col items-center justify-center rounded-lg px-3 py-2 text-center transition-all ${
                    inputs.fluid === fluid
                      ? "border border-blue-200 bg-white shadow-sm dark:border-blue-900/50 dark:bg-slate-800"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span
                    className={`text-xs font-bold capitalize md:text-sm ${
                      inputs.fluid === fluid
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {fluid === "liquid"
                      ? "Incompressible (Liquid)"
                      : "Compressible (Gas / Vapor)"}
                  </span>
                  <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {fluid === "liquid"
                      ? "Water, Oil, Chemicals"
                      : "Air, Steam, Natural Gas"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Under 1. Input Parameters — no duplicate top-level section number */}
          <div className="w-full min-w-0 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Operating process conditions
            </h3>
            <FieldGroup
              label="Volumetric flow rate (Q)"
              value={
                imperial
                  ? Number(inputs.flowRate.toFixed(2))
                  : inputs.flowRate
              }
              onChange={(value) =>
                updateField("flowRate", toNumber(value, inputs.flowRate))
              }
              unit={flowUnit}
              highlight="Q"
              autoFocus
            />

            <div className="grid grid-cols-2 gap-2">
              <FieldGroup
                label="Inlet pressure (P1, gauge)"
                hint={
                  inputs.fluid === "gas"
                    ? "Gauge pressure. Gas Cv converts to absolute with +1 atm (1.01325 bar / 14.696 psi)."
                    : "Gauge pressure. Liquid ΔP uses the gauge differential directly."
                }
                value={
                  imperial
                    ? Number(inputs.inletPressure.toFixed(1))
                    : inputs.inletPressure
                }
                onChange={(value) =>
                  updateField(
                    "inletPressure",
                    toNumber(value, inputs.inletPressure),
                  )
                }
                unit={pressureUnit}
                highlight="P1"
              />
              <FieldGroup
                label="Outlet pressure (P2, gauge)"
                hint={
                  inputs.fluid === "gas"
                    ? "Gauge pressure. Converted to absolute with the same +1 atm offset."
                    : "Gauge pressure. Units follow the metric / imperial toggle."
                }
                value={
                  imperial
                    ? Number(inputs.outletPressure.toFixed(1))
                    : inputs.outletPressure
                }
                onChange={(value) =>
                  updateField(
                    "outletPressure",
                    toNumber(value, inputs.outletPressure),
                  )
                }
                unit={pressureUnit}
                highlight="P2"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 dark:border-slate-800/90 dark:bg-slate-900/30">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-200/80 px-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  1.2
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Fluid properties &amp; catalog Cv,sel
                </span>
                {!showAdvanced ? (
                  <span className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    SG={inputs.specificGravity} · Cv,sel=
                    {inputs.requiredCv}
                  </span>
                ) : null}
              </div>
              <span className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {showAdvanced ? "▲ Hide" : "▼ Edit"}
              </span>
            </button>

            {showAdvanced ? (
              <div className="space-y-3 border-t border-slate-200/80 p-3.5 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <FieldGroup
                    label="Specific gravity (SG)"
                    hint="Dimensionless. Water = 1.0; air ≈ 1.0 relative to air."
                    value={inputs.specificGravity}
                    onChange={(value) =>
                      updateField(
                        "specificGravity",
                        toNumber(value, inputs.specificGravity),
                      )
                    }
                    unit="dim."
                    highlight="SG"
                  />
                  <FieldGroup
                    label="Temperature (T)"
                    hint={
                      inputs.fluid === "gas"
                        ? "Used in the gas Cv equation."
                        : "Not used for liquid US Cv screening (shown for documentation)."
                    }
                    value={
                      imperial
                        ? Math.round(inputs.temperature)
                        : inputs.temperature
                    }
                    onChange={(value) =>
                      updateField(
                        "temperature",
                        toNumber(value, inputs.temperature),
                      )
                    }
                    unit={tempUnit}
                    highlight="T"
                  />
                </div>
                <FieldGroup
                  label="Catalog valve Cv,sel (headroom check)"
                  hint="Manufacturer full-open rated Cv. Adequate when calculated Cv ≤ Cv,sel. Gauge shows calculated / Cv,sel."
                  value={inputs.requiredCv}
                  onChange={(value) =>
                    updateField(
                      "requiredCv",
                      toNumber(value, inputs.requiredCv),
                    )
                  }
                  unit="Cv"
                  highlight="Cv,sel"
                />
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
