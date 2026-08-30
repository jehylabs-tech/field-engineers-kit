"use client";

import { useEffect, useMemo, useState } from "react";
import FlowVelocityChart from "@/components/calculator/charts/FlowVelocityChart";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import SectionBlock from "@/components/calculator/SectionBlock";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateFlowVelocity,
  DEFAULT_FLOW_VELOCITY_INPUTS,
  type FlowVelocityInputs,
  type VelocityFlowUnit,
} from "@/lib/calculators/engines/flow-velocity";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { FLOW_VELOCITY_URL_CONFIG } from "@/lib/calculators/url-configs/flow-velocity";
import { listAvailableNps, listSchedulesForNps } from "@/lib/data/loaders";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function FlowVelocityCalculator({ title, standard }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { inputs, setField } = useCalculatorUrlSync<FlowVelocityInputs>(
    DEFAULT_FLOW_VELOCITY_INPUTS,
    FLOW_VELOCITY_URL_CONFIG,
    { type: "flow-velocity" },
  );

  useEffect(() => {
    const schedules = listSchedulesForNps(inputs.nps);
    if (
      schedules.length > 0 &&
      !schedules.some((row) => row.schedule === inputs.schedule)
    ) {
      setField("schedule", schedules[0].schedule);
    }
  }, [inputs.nps, inputs.schedule, setField]);

  const output = useMemo(() => calculateFlowVelocity(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const flowUnitLabel = inputs.flowUnit === "gpm" ? "GPM" : "m³/h";

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        { label: "Pipe", value: `NPS ${inputs.nps}" Sch ${inputs.schedule}` },
        { label: "Flow", value: `${inputs.flow} ${flowUnitLabel}` },
        { label: "Density", value: `${inputs.density} kg/m³` },
        { label: "API RP 14E c", value: String(inputs.erosionC) },
      ]}
      chart={<FlowVelocityChart inputs={inputs} />}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3 [&_.calc-field]:max-w-none">
          {/* Section 1: Pipe Geometry & Flow Rate */}
          <SectionBlock
            number={1}
            title="Pipe Geometry & Flow Rate"
            twoColumn={false}
            compact
          >
            <div className="grid grid-cols-2 gap-2">
              <FieldSelect
                label="NPS"
                value={inputs.nps}
                onChange={(value) => setField("nps", value)}
              >
                {listAvailableNps().map((pipe) => (
                  <option key={pipe.nps} value={pipe.nps}>
                    {pipe.npsLabel}
                  </option>
                ))}
              </FieldSelect>
              <FieldSelect
                label="Schedule"
                value={inputs.schedule}
                onChange={(value) => setField("schedule", value)}
              >
                {listSchedulesForNps(inputs.nps).map((row) => (
                  <option key={row.schedule} value={row.schedule}>
                    Sch {row.schedule}
                  </option>
                ))}
              </FieldSelect>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FieldGroup
                label="Flow rate"
                value={inputs.flow}
                onChange={(value) => setField("flow", toNumber(value, inputs.flow))}
                unit={flowUnitLabel}
                highlight="Q"
              />
              <FieldSelect
                label="Flow unit"
                value={inputs.flowUnit}
                onChange={(value) =>
                  setField("flowUnit", value as VelocityFlowUnit)
                }
              >
                <option value="m3h">m³/h</option>
                <option value="gpm">GPM</option>
              </FieldSelect>
            </div>
          </SectionBlock>

          {/* Section 2: Fluid Density & Erosion Constants (Collapsible) */}
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
                  Fluid Density &amp; API RP 14E Erosion Constants
                </span>
                <span className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Water / c=100
                </span>
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {showAdvanced ? "▲ Hide" : "▼ Edit"}
              </span>
            </button>

            {showAdvanced && (
              <div className="space-y-3 border-t border-slate-200/80 p-3.5 dark:border-slate-800">
                <FieldGroup
                  label="Fluid density (ρ)"
                  hint="Liquid water = 1000 kg/m³, Hydrocarbon liquids ~ 700–900 kg/m³."
                  value={inputs.density}
                  onChange={(value) =>
                    setField("density", toNumber(value, inputs.density))
                  }
                  unit="kg/m³"
                />
                <FieldGroup
                  label="API RP 14E empirical c-factor"
                  hint="Continuous solids-free service c = 100. Intermittent / non-corrosive service c = 125 ~ 150."
                  value={inputs.erosionC}
                  onChange={(value) =>
                    setField("erosionC", toNumber(value, inputs.erosionC))
                  }
                  highlight="c"
                />
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Erosional velocity formula: v_e = c / √ρ (per API RP 14E).
                </p>
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}
