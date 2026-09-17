"use client";

import { useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import PipeSlopeDiagram from "@/components/calculator/schematics/PipeSlopeDiagram";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculatePipeSlope,
  computePipeSlope,
  DEFAULT_PIPE_SLOPE_INPUTS,
  RISE_RANGE,
  RUN_RANGE,
  type PipeSlopeInputs,
} from "@/lib/calculators/engines/pipe-slope-calculator";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PIPE_SLOPE_URL_CONFIG } from "@/lib/calculators/url-configs/pipe-slope-calculator";
import { listAvailableNps } from "@/lib/data/loaders";

type Props = { title: string; standard?: string };

function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function PipeSlopeCalculator({ title, standard }: Props) {
  const { inputs, setField } = useCalculatorUrlSync<PipeSlopeInputs>(
    DEFAULT_PIPE_SLOPE_INPUTS,
    PIPE_SLOPE_URL_CONFIG,
    { type: "pipe-slope-calculator" },
  );

  const [drafts, setDrafts] = useState<Partial<Record<"rise" | "run", string>>>(
    {},
  );

  const output = useMemo(() => calculatePipeSlope(inputs), [inputs]);
  const computed = useMemo(() => computePipeSlope(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const riseUnit = imperial ? "in" : "mm";
  const runUnit = imperial ? "ft" : "m";

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

  const diagram = (
    <PipeSlopeDiagram
      riseLabel={`${computed.riseDisplay} ${computed.riseUnit}`}
      runLabel={`${computed.runDisplay} ${computed.runUnit}`}
      angleDeg={computed.slopeAngleDeg}
      slopeLabel={
        computed.invalid
          ? "—"
          : imperial
            ? `${computed.slopePercent.toFixed(2)}%`
            : `${computed.slopeMmPerM.toFixed(1)} mm/m`
      }
      invalid={computed.invalid}
    />
  );

  function display(key: "rise" | "run"): string {
    return drafts[key] ?? String(inputs[key]);
  }

  function onNumChange(key: "rise" | "run", raw: string, min: number, max: number) {
    setDrafts((prev) => ({ ...prev, [key]: raw }));
    const parsed = parseDraft(raw);
    if (parsed != null) {
      setField(key, Math.min(max, Math.max(min, parsed)));
    }
  }

  function onNumBlur(key: "rise" | "run", min: number, max: number) {
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

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputNaturalHeight
      afterHero={diagram}
      inputRows={[
        {
          label: imperial ? "NPS" : "DN / NPS",
          value: (() => {
            const opt = npsOptions.find((o) => o.value === inputs.pipeNps);
            return opt?.label ?? `NPS ${inputs.pipeNps}`;
          })(),
        },
        {
          label: "Rise / Run",
          value: `${inputs.rise} ${riseUnit} / ${inputs.run} ${runUnit}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3">
          <FieldSelect
            label="Pipe NPS"
            value={inputs.pipeNps}
            options={npsOptions}
            onChange={(value) => setField("pipeNps", value)}
            hint="Sets IPC Table 704.1–style minimum slope band"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Rise (drop) ΔH"
              unit={riseUnit}
              compactUnit
              value={display("rise")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("rise", v, RISE_RANGE.min, RISE_RANGE.max)
              }
              onBlur={() => onNumBlur("rise", RISE_RANGE.min, RISE_RANGE.max)}
              hint={`${RISE_RANGE.min}–${RISE_RANGE.max} ${riseUnit}`}
            />
            <FieldGroup
              label="Run (length) L"
              unit={runUnit}
              compactUnit
              value={display("run")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("run", v, RUN_RANGE.min, RUN_RANGE.max)
              }
              onBlur={() => onNumBlur("run", RUN_RANGE.min, RUN_RANGE.max)}
              hint={`${RUN_RANGE.min}–${RUN_RANGE.max} ${runUnit}`}
            />
          </div>
        </div>
      }
    />
  );
}
