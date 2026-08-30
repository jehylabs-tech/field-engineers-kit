"use client";

import { useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup from "@/components/calculator/FieldGroup";
import SectionBlock from "@/components/calculator/SectionBlock";
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

  const inputRows = [
    { label: "Fluid type", value: inputs.fluid },
    { label: "Flow rate", value: `${inputs.flowRate} m³/h` },
    { label: "Inlet pressure", value: `${inputs.inletPressure} bar` },
    { label: "Outlet pressure", value: `${inputs.outletPressure} bar` },
    { label: "Specific gravity", value: String(inputs.specificGravity) },
    { label: "Temperature", value: `${inputs.temperature} °C` },
    { label: "Selected Cv", value: String(inputs.requiredCv) },
  ];

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      inputPanel={
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3 [&_.calc-field]:max-w-none">
          {/* Fluid Phase Toggle */}
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
                    {fluid === "liquid" ? "Incompressible (Liquid)" : "Compressible (Gas / Vapor)"}
                  </span>
                  <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {fluid === "liquid" ? "Water, Oil, Chemicals" : "Air, Steam, Natural Gas"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 1: Process Flow & Pressure */}
          <SectionBlock number={1} title="Operating Process Conditions" twoColumn={false} compact>
            <FieldGroup
              label="Volumetric flow rate (Q)"
              value={inputs.flowRate}
              onChange={(value) =>
                updateField("flowRate", toNumber(value, inputs.flowRate))
              }
              unit={inputs.fluid === "liquid" ? "m³/h" : "Nm³/h"}
            />

            <div className="grid grid-cols-2 gap-2">
              <FieldGroup
                label="Inlet pressure (P1)"
                value={inputs.inletPressure}
                onChange={(value) =>
                  updateField("inletPressure", toNumber(value, inputs.inletPressure))
                }
                unit="bar"
              />
              <FieldGroup
                label="Outlet pressure (P2)"
                value={inputs.outletPressure}
                onChange={(value) =>
                  updateField("outletPressure", toNumber(value, inputs.outletPressure))
                }
                unit="bar"
              />
            </div>
          </SectionBlock>

          {/* Section 2: Fluid Properties & Catalog Sizing (Collapsible) */}
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
                  Fluid Properties &amp; Trim Headroom
                </span>
                <span className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Defaults Applied
                </span>
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {showAdvanced ? "▲ Hide" : "▼ Edit"}
              </span>
            </button>

            {showAdvanced && (
              <div className="space-y-3 border-t border-slate-200/80 p-3.5 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <FieldGroup
                    label="Specific gravity (SG)"
                    hint="Water = 1.0, Air = 1.0 (relative to base reference)."
                    value={inputs.specificGravity}
                    onChange={(value) =>
                      updateField("specificGravity", toNumber(value, inputs.specificGravity))
                    }
                  />
                  <FieldGroup
                    label="Temperature (T)"
                    hint="Process fluid temperature."
                    value={inputs.temperature}
                    onChange={(value) =>
                      updateField("temperature", toNumber(value, inputs.temperature))
                    }
                    unit="°C"
                  />
                </div>
                <FieldGroup
                  label="Rated Catalog Valve Cv (for Travel % Check)"
                  hint="Optional: Enter manufacturer full-open rated Cv to calculate valve opening travel percentage."
                  value={inputs.requiredCv}
                  onChange={(value) =>
                    updateField("requiredCv", toNumber(value, inputs.requiredCv))
                  }
                />
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}
