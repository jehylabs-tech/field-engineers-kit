"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateDarby3kFittingLoss,
  DARBY_3K_FITTING_OPTIONS,
  DEFAULT_DARBY_3K_FITTING_LOSS_INPUTS,
  QUANTITY_RANGE,
  REYNOLDS_RANGE,
  type Darby3kFittingLossInputs,
  type Darby3kFittingType,
} from "@/lib/calculators/engines/darby-3k-fitting-loss";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { DARBY_3K_FITTING_LOSS_URL_CONFIG } from "@/lib/calculators/url-configs/darby-3k-fitting-loss";
import {
  defaultScheduleForNps,
  listAvailableNps,
  listScheduleOptionsForNps,
} from "@/lib/data/loaders";

type Props = { title: string; standard?: string };

type DraftKey = "reynoldsNumber" | "quantity";

function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function Darby3kFittingLossCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField } = useCalculatorUrlSync<Darby3kFittingLossInputs>(
    DEFAULT_DARBY_3K_FITTING_LOSS_INPUTS,
    DARBY_3K_FITTING_LOSS_URL_CONFIG,
    { type: "darby-3k-fitting-loss" },
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

  const output = useMemo(
    () => calculateDarby3kFittingLoss(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";

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

  const fittingOptions = useMemo(
    () =>
      DARBY_3K_FITTING_OPTIONS.map((f) => ({
        value: f.value,
        label: `${f.label} · ${f.k1}/${f.ki}/${f.kd}`,
      })),
    [],
  );

  function display(key: DraftKey): string {
    return drafts[key] ?? String(inputs[key]);
  }

  function onNumChange(
    key: DraftKey,
    raw: string,
    min: number,
    max: number,
    round = false,
  ) {
    setDrafts((prev) => ({ ...prev, [key]: raw }));
    const parsed = parseDraft(raw);
    if (parsed != null) {
      const n = round ? Math.round(parsed) : parsed;
      setField(key, Math.min(max, Math.max(min, n)));
    }
  }

  function onNumBlur(key: DraftKey, min: number, max: number, round = false) {
    setDrafts((prev) => {
      const raw = prev[key];
      if (raw !== undefined) {
        const parsed = parseDraft(raw);
        if (parsed != null) {
          const n = round ? Math.round(parsed) : parsed;
          setField(key, Math.min(max, Math.max(min, n)));
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
  const fittingLabel =
    DARBY_3K_FITTING_OPTIONS.find((f) => f.value === inputs.fittingType)
      ?.label ?? inputs.fittingType;
  const reDisplay = Number.isFinite(inputs.reynoldsNumber)
    ? Math.round(inputs.reynoldsNumber).toLocaleString("en-US")
    : String(inputs.reynoldsNumber);

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
          label: "Fitting",
          value: fittingLabel.replace(/\s*\(.*?\)\s*/g, " ").trim(),
        },
        {
          label: "Re",
          value: reDisplay,
        },
        {
          label: "Qty",
          value: String(inputs.quantity),
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
              hint="Sets B36 D_i and Crane f_T for L_eq"
            />
            <FieldSelect
              label="Schedule"
              value={inputs.schedule}
              options={scheduleOptions}
              onChange={(value) => setField("schedule", value)}
              hint="Inside diameter D_i from ASME B36"
            />
          </div>

          <FieldSelect
            label="Fitting / valve"
            value={inputs.fittingType}
            options={fittingOptions}
            onChange={(value) =>
              setField("fittingType", value as Darby3kFittingType)
            }
            hint="Loads Darby K₁, Kᵢ, K_d for the selected fitting"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Reynolds number Re"
              value={display("reynoldsNumber")}
              allowZero={false}
              onChange={(v) =>
                onNumChange(
                  "reynoldsNumber",
                  v,
                  REYNOLDS_RANGE.min,
                  REYNOLDS_RANGE.max,
                )
              }
              onBlur={() =>
                onNumBlur(
                  "reynoldsNumber",
                  REYNOLDS_RANGE.min,
                  REYNOLDS_RANGE.max,
                )
              }
              hint="Re = ρ v D_i / μ · laminar < 2000 · turbulent > 4000"
              chips={[
                { label: "500", value: "500" },
                { label: "2k", value: "2000" },
                { label: "50k", value: "50000" },
                { label: "100k", value: "100000" },
              ]}
            />
            <FieldGroup
              label="Quantity"
              unit="ea"
              compactUnit
              value={display("quantity")}
              allowZero={false}
              onChange={(v) =>
                onNumChange(
                  "quantity",
                  v,
                  QUANTITY_RANGE.min,
                  QUANTITY_RANGE.max,
                  true,
                )
              }
              onBlur={() =>
                onNumBlur(
                  "quantity",
                  QUANTITY_RANGE.min,
                  QUANTITY_RANGE.max,
                  true,
                )
              }
              hint="Scales total K and L_eq"
              chips={[
                { label: "1", value: "1" },
                { label: "2", value: "2" },
                { label: "4", value: "4" },
                { label: "10", value: "10" },
              ]}
            />
          </div>
        </div>
      }
    />
  );
}
