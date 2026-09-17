"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculatePipingEquivalentLength,
  CRANE_FITTING_OPTIONS,
  DEFAULT_PIPING_EQUIVALENT_LENGTH_INPUTS,
  QUANTITY_RANGE,
  type CraneFittingType,
  type PipingEquivalentLengthInputs,
} from "@/lib/calculators/engines/piping-equivalent-length";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PIPING_EQUIVALENT_LENGTH_URL_CONFIG } from "@/lib/calculators/url-configs/piping-equivalent-length";
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

export default function PipingEquivalentLengthCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField } = useCalculatorUrlSync<PipingEquivalentLengthInputs>(
    DEFAULT_PIPING_EQUIVALENT_LENGTH_INPUTS,
    PIPING_EQUIVALENT_LENGTH_URL_CONFIG,
    { type: "piping-equivalent-length" },
  );

  const [qtyDraft, setQtyDraft] = useState<string | undefined>(undefined);

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
    () => calculatePipingEquivalentLength(inputs),
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
      CRANE_FITTING_OPTIONS.map((f) => ({
        value: f.value,
        label: `${f.label} (L/D=${f.ldRatio})`,
      })),
    [],
  );

  function qtyDisplay(): string {
    return qtyDraft ?? String(inputs.quantity);
  }

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
          value: `NPS ${inputs.nps} · Sch ${inputs.schedule}`,
        },
        {
          label: "Fitting",
          value:
            CRANE_FITTING_OPTIONS.find((f) => f.value === inputs.fittingType)
              ?.label ?? inputs.fittingType,
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
              label="Pipe NPS"
              value={inputs.nps}
              options={npsOptions}
              onChange={(value) => setField("nps", value)}
              hint="Sets Crane f_T band and B36 ID lookup"
            />
            <FieldSelect
              label="Schedule"
              value={inputs.schedule}
              options={scheduleOptions}
              onChange={(value) => setField("schedule", value)}
              hint="Inside diameter D_i from ASME B36.10M / B36.19M"
            />
          </div>

          <FieldSelect
            label="Fitting / valve"
            value={inputs.fittingType}
            options={fittingOptions}
            onChange={(value) =>
              setField("fittingType", value as CraneFittingType)
            }
            hint="Crane TP-410 L/D (turbulent screening)"
          />

          <FieldGroup
            label="Quantity"
            unit="ea"
            compactUnit
            value={qtyDisplay()}
            allowZero={false}
            onChange={(raw) => {
              setQtyDraft(raw);
              const parsed = parseDraft(raw);
              if (parsed != null) {
                setField(
                  "quantity",
                  Math.min(
                    QUANTITY_RANGE.max,
                    Math.max(QUANTITY_RANGE.min, Math.round(parsed)),
                  ),
                );
              }
            }}
            onBlur={() => {
              setQtyDraft(undefined);
            }}
            hint={`${QUANTITY_RANGE.min}–${QUANTITY_RANGE.max}`}
          />
        </div>
      }
    />
  );
}
