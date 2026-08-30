"use client";

import { useEffect, useMemo, useState } from "react";
import PressureDropChart from "@/components/calculator/charts/PressureDropChart";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import SectionBlock from "@/components/calculator/SectionBlock";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculatePressureDrop,
  DEFAULT_PRESSURE_DROP_INPUTS,
  PRESSURE_DROP_FLUIDS,
  type FlowQuantityUnit,
  type PressureDropFluid,
  type PressureDropInputs,
} from "@/lib/calculators/engines/pressure-drop";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PRESSURE_DROP_URL_CONFIG } from "@/lib/calculators/url-configs/pressure-drop";
import { listAvailableNps, listSchedulesForNps } from "@/lib/data/loaders";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function PressureDropCalculator({ title, standard }: Props) {
  const [showFittings, setShowFittings] = useState(false);
  const { inputs, setField } = useCalculatorUrlSync<PressureDropInputs>(
    DEFAULT_PRESSURE_DROP_INPUTS,
    PRESSURE_DROP_URL_CONFIG,
    { type: "pressure-drop" },
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

  const output = useMemo(() => calculatePressureDrop(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const lengthUnit = inputs.unitSystem === "imperial" ? "ft" : "m";
  const flowUnitLabel =
    inputs.flowUnit === "gpm" ? "GPM" : inputs.flowUnit === "kgh" ? "kg/h" : "m³/h";

  const totalFittings = inputs.elbowCount + inputs.gateCount + inputs.globeCount;

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        { label: "Fluid", value: inputs.fluid },
        { label: "Flow", value: `${inputs.flow} ${flowUnitLabel}` },
        { label: "Pipe", value: `NPS ${inputs.nps}" Sch ${inputs.schedule}` },
        { label: "Length", value: `${inputs.length} ${lengthUnit}` },
      ]}
      chart={<PressureDropChart inputs={inputs} />}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3 [&_.calc-field]:max-w-none">
          {/* Section 1: Fluid & Pipe Conditions */}
          <SectionBlock
            number={1}
            title="Fluid & Pipe Run"
            twoColumn={false}
            compact
          >
            <FieldSelect
              label="Fluid"
              value={inputs.fluid}
              onChange={(value) =>
                setField("fluid", value as PressureDropFluid)
              }
            >
              {PRESSURE_DROP_FLUIDS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </FieldSelect>

            <div className="grid grid-cols-2 gap-2">
              <FieldGroup
                label="Flow rate"
                value={inputs.flow}
                onChange={(value) => setField("flow", toNumber(value, inputs.flow))}
                unit={flowUnitLabel}
              />
              <FieldSelect
                label="Flow unit"
                value={inputs.flowUnit}
                onChange={(value) =>
                  setField("flowUnit", value as FlowQuantityUnit)
                }
              >
                <option value="m3h">m³/h</option>
                <option value="gpm">GPM</option>
                <option value="kgh">kg/h</option>
              </FieldSelect>
            </div>

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

            <FieldGroup
              label="Straight pipe length (L)"
              value={inputs.length}
              onChange={(value) =>
                setField("length", toNumber(value, inputs.length))
              }
              unit={lengthUnit}
            />
          </SectionBlock>

          {/* Section 2: Fitting Equivalent Length (Collapsible) */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 dark:border-slate-800/90 dark:bg-slate-900/30">
            <button
              type="button"
              onClick={() => setShowFittings(!showFittings)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200/80 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  2
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Fitting &amp; Valve Equivalent Lengths (L_eq)
                </span>
                <span className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {totalFittings > 0 ? `${totalFittings} fittings added` : "Straight Pipe (0 ea)"}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {showFittings ? "▲ Hide" : "▼ Add Fittings"}
              </span>
            </button>

            {showFittings && (
              <div className="space-y-3 border-t border-slate-200/80 p-3.5 dark:border-slate-800">
                <FieldGroup
                  label="90° LR elbows"
                  hint="Standard 90-degree long-radius elbows (30 L/D)."
                  value={inputs.elbowCount}
                  onChange={(value) =>
                    setField("elbowCount", toNumber(value, inputs.elbowCount))
                  }
                  unit="ea"
                />
                <FieldGroup
                  label="Gate valves (full open)"
                  hint="Standard full-bore gate valves (8 L/D)."
                  value={inputs.gateCount}
                  onChange={(value) =>
                    setField("gateCount", toNumber(value, inputs.gateCount))
                  }
                  unit="ea"
                />
                <FieldGroup
                  label="Globe valves"
                  hint="Standard globe valves (340 L/D)."
                  value={inputs.globeCount}
                  onChange={(value) =>
                    setField("globeCount", toNumber(value, inputs.globeCount))
                  }
                  unit="ea"
                />
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}
