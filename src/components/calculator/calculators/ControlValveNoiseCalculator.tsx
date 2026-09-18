"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateControlValveNoise,
  CV_RANGE,
  DEFAULT_CONTROL_VALVE_NOISE_INPUTS,
  MASS_FLOW_RANGE,
  type ControlValveNoiseFluid,
  type ControlValveNoiseInputs,
} from "@/lib/calculators/engines/control-valve-noise";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { CONTROL_VALVE_NOISE_URL_CONFIG } from "@/lib/calculators/url-configs/control-valve-noise";
import {
  defaultScheduleForNps,
  listAvailableNps,
  listScheduleOptionsForNps,
} from "@/lib/data/loaders";

type Props = { title: string; standard?: string };

function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function ControlValveNoiseCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField } = useCalculatorUrlSync<ControlValveNoiseInputs>(
    DEFAULT_CONTROL_VALVE_NOISE_INPUTS,
    CONTROL_VALVE_NOISE_URL_CONFIG,
    { type: "control-valve-noise" },
  );

  const [drafts, setDrafts] = useState<
    Partial<Record<"cv" | "p1" | "p2" | "temp" | "massFlow", string>>
  >({});

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

  const output = useMemo(
    () => calculateControlValveNoise(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const pressureUnit = imperial ? "psi g" : "bar g";
  const tempUnit = imperial ? "°F" : "°C";
  const massUnit = imperial ? "lb/h" : "kg/h";

  const npsOptions = useMemo(
    () =>
      listAvailableNps()
        .filter((p) => {
          const n = Number.parseFloat(p.nps);
          return Number.isFinite(n) && n >= 1 && n <= 24;
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

  function display(key: "cv" | "p1" | "p2" | "temp" | "massFlow"): string {
    return drafts[key] ?? String(inputs[key]);
  }

  function onNumChange(
    key: "cv" | "p1" | "p2" | "temp" | "massFlow",
    raw: string,
    min: number,
    max: number,
  ) {
    setDrafts((prev) => ({ ...prev, [key]: raw }));
    const parsed = parseDraft(raw);
    if (parsed != null) {
      setField(key, Math.min(max, Math.max(min, parsed)));
    }
  }

  function onNumBlur(
    key: "cv" | "p1" | "p2" | "temp" | "massFlow",
    min: number,
    max: number,
  ) {
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
          value: inputs.fluidType === "gas" ? "Gas" : "Liquid",
        },
        { label: "Catalog Cᵥ", value: String(inputs.cv) },
        {
          label: "P₁ / P₂",
          value: `${inputs.p1} / ${inputs.p2} ${pressureUnit}`,
        },
        {
          label: "ṁ",
          value: `${inputs.massFlow} ${massUnit}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSelect
              label="Downstream pipe NPS"
              value={inputs.nps}
              options={npsOptions}
              onChange={(value) => setField("nps", value)}
              hint="Sets B36 ID and wall for transmission loss"
            />
            <FieldSelect
              label="Schedule"
              value={inputs.schedule}
              options={scheduleOptions}
              onChange={(value) => setField("schedule", value)}
              hint="Wall t_w and inside diameter D_i"
            />
          </div>

          <FieldSelect
            label="Fluid type"
            value={inputs.fluidType}
            options={[
              { value: "gas", label: "Gas (aerodynamic · IEC 60534-8-3)" },
              {
                value: "liquid",
                label: "Liquid (hydrodynamic · IEC 60534-8-4)",
              },
            ]}
            onChange={(value) =>
              setField("fluidType", value as ControlValveNoiseFluid)
            }
            hint="Aerodynamic vs hydrodynamic screening path"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Catalog Cᵥ"
              compactUnit
              value={display("cv")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("cv", v, CV_RANGE.min, CV_RANGE.max)
              }
              onBlur={() => onNumBlur("cv", CV_RANGE.min, CV_RANGE.max)}
              hint="ISA process context · carry to Valve Cv"
            />
            <FieldGroup
              label="Mass flow ṁ"
              unit={massUnit}
              compactUnit
              value={display("massFlow")}
              allowZero={false}
              onChange={(v) =>
                onNumChange(
                  "massFlow",
                  v,
                  MASS_FLOW_RANGE.min,
                  MASS_FLOW_RANGE.max,
                )
              }
              onBlur={() =>
                onNumBlur(
                  "massFlow",
                  MASS_FLOW_RANGE.min,
                  MASS_FLOW_RANGE.max,
                )
              }
              hint={`${MASS_FLOW_RANGE.min}–${MASS_FLOW_RANGE.max}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Upstream P₁"
              unit={pressureUnit}
              compactUnit
              value={display("p1")}
              allowZero={false}
              onChange={(v) => onNumChange("p1", v, 0.01, 1000)}
              onBlur={() => onNumBlur("p1", 0.01, 1000)}
              hint="Gauge pressure"
            />
            <FieldGroup
              label="Downstream P₂"
              unit={pressureUnit}
              compactUnit
              value={display("p2")}
              allowZero
              onChange={(v) => onNumChange("p2", v, 0, 1000)}
              onBlur={() => onNumBlur("p2", 0, 1000)}
              hint="Gauge · P₁ > P₂"
            />
          </div>

          <FieldGroup
            label="Fluid temperature"
            unit={tempUnit}
            compactUnit
            value={display("temp")}
            allowZero
            onChange={(v) => onNumChange("temp", v, -50, 800)}
            onBlur={() => onNumBlur("temp", -50, 800)}
            hint="Inlet T for density / sound speed"
          />
        </div>
      }
    />
  );
}
