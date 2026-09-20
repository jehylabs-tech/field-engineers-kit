"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  ALLOWABLE_DEFLECTION_RANGE_IN,
  ALLOWABLE_DEFLECTION_RANGE_MM,
  calculatePipeSupportSpan,
  DEFAULT_PIPE_SUPPORT_SPAN_INPUTS,
  INSULATION_THICKNESS_RANGE,
  PIPE_SUPPORT_FLUID_OPTIONS,
  PIPE_SUPPORT_MATERIAL_OPTIONS,
  type PipeSupportFluidType,
  type PipeSupportMaterial,
  type PipeSupportSpanInputs,
} from "@/lib/calculators/engines/pipe-support-span";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PIPE_SUPPORT_SPAN_URL_CONFIG } from "@/lib/calculators/url-configs/pipe-support-span";
import {
  defaultScheduleForNps,
  listAvailableNps,
  listScheduleOptionsForNps,
} from "@/lib/data/loaders";

type Props = { title: string; standard?: string };

type DraftKey = "insulationThickness" | "allowableDeflection";

function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function PipeSupportSpanCalculator({ title, standard }: Props) {
  const { inputs, setField } = useCalculatorUrlSync<PipeSupportSpanInputs>(
    DEFAULT_PIPE_SUPPORT_SPAN_INPUTS,
    PIPE_SUPPORT_SPAN_URL_CONFIG,
    { type: "pipe-support-span" },
  );

  const [drafts, setDrafts] = useState<Partial<Record<DraftKey, string>>>({});

  useEffect(() => {
    const options = listScheduleOptionsForNps(inputs.nps);
    if (
      options.length > 0 &&
      !options.some((o) => o.value === inputs.schedule)
    ) {
      setField(
        "schedule",
        defaultScheduleForNps(inputs.nps) ?? options[0].value,
      );
    }
  }, [inputs.nps, inputs.schedule, setField]);

  useEffect(() => {
    setDrafts({});
  }, [inputs.unitSystem]);

  const output = useMemo(() => calculatePipeSupportSpan(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const thickUnit = imperial ? "in" : "mm";
  const defRange = imperial
    ? ALLOWABLE_DEFLECTION_RANGE_IN
    : ALLOWABLE_DEFLECTION_RANGE_MM;
  const insMax = imperial
    ? Number((INSULATION_THICKNESS_RANGE.max / 25.4).toFixed(2))
    : INSULATION_THICKNESS_RANGE.max;

  const npsOptions = useMemo(
    () =>
      listAvailableNps()
        .filter((p) => {
          const n = Number.parseFloat(p.nps);
          return Number.isFinite(n) && n >= 0.5 && n <= 24;
        })
        .map((p) => ({
          value: p.nps,
          label: imperial ? `NPS ${p.nps}` : `DN ${p.dn} (NPS ${p.nps})`,
        })),
    [imperial],
  );

  const scheduleOptions = useMemo(
    () =>
      listScheduleOptionsForNps(inputs.nps).map((o) => ({
        value: o.value,
        label: o.label,
      })),
    [inputs.nps],
  );

  function display(key: DraftKey): string {
    return drafts[key] ?? String(inputs[key]);
  }

  function onNumChange(key: DraftKey, raw: string, min: number, max: number) {
    setDrafts((prev) => ({ ...prev, [key]: raw }));
    const parsed = parseDraft(raw);
    if (parsed != null) {
      setField(key, Math.min(max, Math.max(min, parsed)));
    }
  }

  function onNumBlur(key: DraftKey, min: number, max: number) {
    setDrafts((prev) => {
      const raw = prev[key];
      if (raw !== undefined) {
        const parsed = parseDraft(raw);
        if (parsed != null) {
          setField(key, Math.min(max, Math.max(min, parsed)));
        }
      }
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const npsLabel =
    npsOptions.find((o) => o.value === inputs.nps)?.label ??
    `NPS ${inputs.nps}`;
  const fluidLabel =
    PIPE_SUPPORT_FLUID_OPTIONS.find((f) => f.id === inputs.fluidType)?.label ??
    inputs.fluidType;
  const matLabel =
    PIPE_SUPPORT_MATERIAL_OPTIONS.find((m) => m.id === inputs.material)
      ?.label ?? inputs.material;

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputNaturalHeight
      inputRows={[
        {
          label: imperial ? "NPS / Sch" : "DN / Sch",
          value: `${npsLabel} · Sch ${inputs.schedule}`,
        },
        {
          label: "Fluid",
          value: fluidLabel.replace(/\s*\(.*?\)\s*/g, " ").trim(),
        },
        {
          label: "y_max",
          value: `${inputs.allowableDeflection} ${thickUnit}`,
        },
        {
          label: "Material",
          value: matLabel.replace(/\s*\(.*?\)\s*/g, " ").trim(),
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSelect
              label={imperial ? "Pipe NPS" : "Pipe size"}
              value={inputs.nps}
              options={npsOptions}
              onChange={(value) => setField("nps", value)}
              hint="ASME B36.10M / B36.19M OD, ID, and steel weight"
            />
            <FieldSelect
              label="Schedule"
              value={inputs.schedule}
              options={scheduleOptions}
              onChange={(value) => setField("schedule", value)}
              hint="Sets wall, ID, and pipe linear weight"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSelect
              label="Fluid contents"
              value={inputs.fluidType}
              options={PIPE_SUPPORT_FLUID_OPTIONS.map((f) => ({
                value: f.id,
                label: f.label,
              }))}
              onChange={(value) =>
                setField("fluidType", value as PipeSupportFluidType)
              }
              hint="Adds fluid mass to w_total (empty / gas / steam / water)"
            />
            <FieldSelect
              label="Pipe material"
              value={inputs.material}
              options={PIPE_SUPPORT_MATERIAL_OPTIONS.map((m) => ({
                value: m.id,
                label: m.label,
              }))}
              onChange={(value) =>
                setField("material", value as PipeSupportMaterial)
              }
              hint="Sets E and S_allow = 0.5 S_h for L_str"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Insulation thickness"
              unit={thickUnit}
              compactUnit
              value={display("insulationThickness")}
              allowZero
              onChange={(v) =>
                onNumChange("insulationThickness", v, 0, insMax)
              }
              onBlur={() => onNumBlur("insulationThickness", 0, insMax)}
              hint={`0–${insMax} ${thickUnit} · mineral-wool ρ = 120 kg/m³ screening`}
              chips={
                imperial
                  ? [
                      { label: "0", value: "0" },
                      { label: "1\"", value: "1" },
                      { label: "2\"", value: "2" },
                      { label: "3\"", value: "3" },
                    ]
                  : [
                      { label: "0", value: "0" },
                      { label: "25", value: "25" },
                      { label: "50", value: "50" },
                      { label: "100", value: "100" },
                    ]
              }
            />
            <FieldGroup
              label="Allowable mid-span deflection y_max"
              unit={thickUnit}
              compactUnit
              value={display("allowableDeflection")}
              allowZero={false}
              onChange={(v) =>
                onNumChange(
                  "allowableDeflection",
                  v,
                  defRange.min,
                  defRange.max,
                )
              }
              onBlur={() =>
                onNumBlur(
                  "allowableDeflection",
                  defRange.min,
                  defRange.max,
                )
              }
              hint={`Standard limit 0.5 in / 12.7 mm · range ${defRange.min}–${defRange.max} ${thickUnit}`}
              chips={
                imperial
                  ? [
                      { label: '0.25"', value: "0.25" },
                      { label: '0.5"', value: "0.5" },
                      { label: '0.75"', value: "0.75" },
                    ]
                  : [
                      { label: "6.4", value: "6.4" },
                      { label: "12.7", value: "12.7" },
                      { label: "19", value: "19" },
                    ]
              }
            />
          </div>
        </div>
      }
    />
  );
}
