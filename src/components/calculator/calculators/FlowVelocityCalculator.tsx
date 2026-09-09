"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateFlowVelocity,
  DEFAULT_FLOW_VELOCITY_INPUTS,
  defaultErosionC,
  defaultScheduleForMaterial,
  FLOW_VELOCITY_MATERIALS,
  liquidVelocityCapMs,
  listSchedulesForMaterial,
  materialShortLabel,
  type FlowVelocityInputs,
  type FlowVelocityMaterial,
  type VelocityFlowUnit,
} from "@/lib/calculators/engines/flow-velocity";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { FLOW_VELOCITY_URL_CONFIG } from "@/lib/calculators/url-configs/flow-velocity";
import { listAvailableNps } from "@/lib/data/loaders";

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

  const material: FlowVelocityMaterial =
    inputs.materialFamily === "ss" ? "ss" : "cs";
  const scheduleOptions = useMemo(
    () => listSchedulesForMaterial(inputs.nps, material),
    [inputs.nps, material],
  );
  const liquidCap = liquidVelocityCapMs(material);
  const matShort = materialShortLabel(material);

  useEffect(() => {
    if (
      scheduleOptions.length > 0 &&
      !scheduleOptions.some((row) => row.schedule === inputs.schedule)
    ) {
      setField(
        "schedule",
        defaultScheduleForMaterial(inputs.nps, material, inputs.schedule),
      );
    }
  }, [inputs.nps, inputs.schedule, material, scheduleOptions, setField]);

  const output = useMemo(() => calculateFlowVelocity(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const flowUnitLabel = inputs.flowUnit === "gpm" ? "GPM" : "m³/h";
  const densityUnit =
    inputs.unitSystem === "imperial" ? "lb/ft³" : "kg/m³";
  const velUnit = inputs.unitSystem === "imperial" ? "ft/s" : "m/s";
  const liquidCapDisplay =
    inputs.unitSystem === "imperial"
      ? (liquidCap * 3.280839895).toFixed(1)
      : liquidCap.toFixed(1);
  const materialMeta =
    FLOW_VELOCITY_MATERIALS.find((item) => item.value === material) ??
    FLOW_VELOCITY_MATERIALS[0];

  function applyMaterial(next: FlowVelocityMaterial) {
    setField("materialFamily", next);
    setField("erosionC", defaultErosionC(next));
    setField(
      "schedule",
      defaultScheduleForMaterial(inputs.nps, next, inputs.schedule),
    );
  }

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        {
          label: "Material",
          value: `${matShort} | Sch ${inputs.schedule} | C=${inputs.erosionC}`,
        },
        { label: "Pipe", value: `NPS ${inputs.nps}" Sch ${inputs.schedule}` },
        { label: "Flow (Q)", value: `${inputs.flow} ${flowUnitLabel}` },
        { label: "Density (ρ)", value: `${inputs.density} ${densityUnit}` },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          {/* Under 1. Input Parameters — no duplicate top-level section number */}
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Pipe geometry &amp; flow
          </h3>
          <FieldSelect
            label="Material family"
            value={material}
            onChange={(value) => applyMaterial(value as FlowVelocityMaterial)}
            hint={`${materialMeta.standard} schedules · default C=${defaultErosionC(material)} · liquid warning cap ${liquidCapDisplay} ${velUnit}`}
          >
            {FLOW_VELOCITY_MATERIALS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </FieldSelect>

          <div className="grid grid-cols-2 gap-2">
            <FieldSelect
              label="NPS"
              value={inputs.nps}
              onChange={(value) => {
                const nextNps = value;
                setField("nps", nextNps);
                setField(
                  "schedule",
                  defaultScheduleForMaterial(
                    nextNps,
                    material,
                    inputs.schedule,
                  ),
                );
              }}
            >
              {listAvailableNps().map((pipe) => (
                <option key={pipe.nps} value={pipe.nps}>
                  {pipe.npsLabel}
                </option>
              ))}
            </FieldSelect>
            <FieldSelect
              label="Schedule"
              value={
                scheduleOptions.some((row) => row.schedule === inputs.schedule)
                  ? inputs.schedule
                  : (scheduleOptions[0]?.schedule ?? inputs.schedule)
              }
              onChange={(value) => setField("schedule", value)}
              hint={
                material === "ss"
                  ? "ASME B36.19M (5S / 10S / 40S / 80S)"
                  : "ASME B36.10M carbon & alloy schedules"
              }
            >
              {scheduleOptions.map((row) => (
                <option key={row.schedule} value={row.schedule}>
                  Sch {row.schedule}
                </option>
              ))}
            </FieldSelect>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FieldGroup
              label="Flow rate (Q)"
              value={inputs.flow}
              onChange={(value) =>
                setField("flow", toNumber(value, inputs.flow))
              }
              unit={flowUnitLabel}
              highlight="Q"
              hint="v = Q / A using schedule ID."
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

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowAdvanced((open) => !open)}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-slate-100 px-1.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  1.2
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Density ρ &amp; API C
                </span>
                <span className="truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {matShort} · C={inputs.erosionC} · cap {liquidCapDisplay}{" "}
                  {velUnit}
                </span>
              </div>
              <span className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {showAdvanced ? "▲ Hide" : "▼ Edit"}
              </span>
            </button>

            {showAdvanced ? (
              <div className="space-y-2.5 border-t border-slate-200/80 p-3.5 dark:border-slate-800">
                <FieldGroup
                  label="Fluid density (ρ)"
                  hint={
                    inputs.unitSystem === "imperial"
                      ? "Water ≈ 62.4 lb/ft³ · hydrocarbons ~ 44–56 lb/ft³. Used as ρ in vc = C / √ρ (lb/ft³)."
                      : "Water ≈ 998–1000 kg/m³ · hydrocarbons ~ 700–900 kg/m³. Converted to lb/ft³ inside vc."
                  }
                  value={inputs.density}
                  onChange={(value) =>
                    setField("density", toNumber(value, inputs.density))
                  }
                  unit={densityUnit}
                />
                <FieldGroup
                  label="API RP 14E factor (C)"
                  hint={
                    material === "ss"
                      ? "CRA default C = 150. Adjust up to ~200 for continuous CRA service."
                      : "CS continuous solids-free C = 100. Intermittent often 125–150."
                  }
                  value={inputs.erosionC}
                  onChange={(value) =>
                    setField("erosionC", toNumber(value, inputs.erosionC))
                  }
                  highlight="c"
                />
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  vc = C / √ρ (API RP 14E, ρ in lb/ft³). Warning if v ≥ 0.8·vc
                  or liquid v exceeds {liquidCapDisplay} {velUnit}. Erosion Risk
                  if v ≥ vc.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
