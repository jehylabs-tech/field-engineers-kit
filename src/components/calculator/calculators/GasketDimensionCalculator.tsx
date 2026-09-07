"use client";

import { useEffect, useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateGasketDimension,
  DEFAULT_GASKET_DIMENSION_INPUTS,
  type GasketDimensionInputs,
} from "@/lib/calculators/engines/gasket-dimension";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { GASKET_DIMENSION_URL_CONFIG } from "@/lib/calculators/url-configs/gasket-dimension";
import { FieldSelect, fieldLabelHint } from "@/components/calculator/FieldGroup";
import {
  chipsInOptions,
  COMMON_CLASS_CHIPS,
} from "@/components/calculator/presets";
import {
  listGasketClassesForNps,
  listGasketNps,
  listGasketTypes,
} from "@/lib/data/loaders";

type GasketDimensionCalculatorProps = {
  title: string;
  standard?: string;
};

const GASKET_NPS_CHIPS = [
  { value: "0.5", label: '1/2"' },
  { value: "1", label: '1"' },
  { value: "2", label: '2"' },
  { value: "4", label: '4"' },
  { value: "6", label: '6"' },
  { value: "8", label: '8"' },
  { value: "12", label: '12"' },
  { value: "16", label: '16"' },
  { value: "24", label: '24"' },
];

function SelectField({
  label,
  value,
  options,
  onChange,
  chips,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  chips?: { value: string; label: string }[];
}) {
  return (
    <FieldSelect
      label={label}
      value={value}
      options={options}
      chips={chips ? chipsInOptions(chips, options) : undefined}
      onChange={onChange}
      hint={fieldLabelHint(label)}
    />
  );
}

export default function GasketDimensionCalculator({
  title,
  standard,
}: GasketDimensionCalculatorProps) {
  const { inputs, setField } = useCalculatorUrlSync<GasketDimensionInputs>(
    DEFAULT_GASKET_DIMENSION_INPUTS,
    GASKET_DIMENSION_URL_CONFIG,
    { type: "gasket-dimension" },
  );

  useEffect(() => {
    const sizes = listGasketNps(inputs.gasketTypeId);
    if (sizes.length > 0 && !sizes.some((size) => size.nps === inputs.nps)) {
      setField("nps", sizes[0].nps);
    }
  }, [inputs.gasketTypeId, inputs.nps, setField]);

  useEffect(() => {
    const classes = listGasketClassesForNps(inputs.gasketTypeId, inputs.nps);
    if (
      classes.length > 0 &&
      !classes.some((row) => row.class === inputs.pressureClass)
    ) {
      setField("pressureClass", classes[0].class);
    }
  }, [inputs.gasketTypeId, inputs.nps, inputs.pressureClass, setField]);

  const resolvedInputs = useMemo(() => {
    const sizes = listGasketNps(inputs.gasketTypeId);
    const classes = listGasketClassesForNps(inputs.gasketTypeId, inputs.nps);
    return {
      ...inputs,
      nps: sizes.some((size) => size.nps === inputs.nps)
        ? inputs.nps
        : (sizes[0]?.nps ?? ""),
      pressureClass: classes.some((row) => row.class === inputs.pressureClass)
        ? inputs.pressureClass
        : (classes[0]?.class ?? ""),
    };
  }, [inputs]);

  const output = useMemo(
    () => calculateGasketDimension(resolvedInputs),
    [resolvedInputs],
  );
  usePublishCalculatorOutput(output);

  const typeLabel =
    listGasketTypes().find((type) => type.id === resolvedInputs.gasketTypeId)
      ?.label ?? resolvedInputs.gasketTypeId;
  const isSpiral = resolvedInputs.gasketTypeId === "spiral_wound";

  const inputRows = [
    { label: "Gasket type", value: typeLabel },
    { label: "NPS", value: `${resolvedInputs.nps}"` },
    { label: "Class", value: `Class ${resolvedInputs.pressureClass}` },
    { label: "Unit system", value: resolvedInputs.unitSystem },
  ];

  return (
    <CalculatorBaseLayout
      layout="lookup"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      inputPanel={
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          {/* Under 1. Input Parameters — no duplicate top-level section number */}
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Gasket selection
          </h3>
          <SelectField
            label="Gasket type"
            value={resolvedInputs.gasketTypeId}
            options={listGasketTypes().map((type) => ({
              value: type.id,
              label: type.label,
            }))}
            onChange={(value) => setField("gasketTypeId", value)}
          />
          <SelectField
            label="Nominal pipe size (NPS)"
            value={resolvedInputs.nps}
            options={listGasketNps(resolvedInputs.gasketTypeId).map((size) => ({
              value: size.nps,
              label: `${size.npsLabel} (DN ${size.dn})`,
            }))}
            chips={GASKET_NPS_CHIPS}
            onChange={(value) => setField("nps", value)}
          />
          <SelectField
            label="Pressure class"
            value={resolvedInputs.pressureClass}
            options={listGasketClassesForNps(
              resolvedInputs.gasketTypeId,
              resolvedInputs.nps,
            ).map((row) => ({
              value: row.class,
              label: `Class ${row.class}`,
            }))}
            chips={COMMON_CLASS_CHIPS}
            onChange={(value) => setField("pressureClass", value)}
          />

          <div className="rounded-md border border-spec-border bg-spec-panel px-2.5 py-1.5 text-xs leading-snug text-spec-text2">
            {isSpiral ? (
              <>
                Hero is{" "}
                <span className="font-mono text-spec-text">
                  ID × SE_OD × OR_OD
                </span>
                . Outer ring (OR_OD) centers on the B16.5 bolt circle.
              </>
            ) : (
              <>
                Hero is{" "}
                <span className="font-mono text-spec-text">
                  Ring No. · P · w×h
                </span>
                . Ring number must match both mating RTJ flanges.
              </>
            )}
          </div>

          <details className="group mt-auto w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
            <summary className="cursor-pointer list-none px-3.5 py-2.5 text-left marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-slate-100 px-1.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    1.2
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Reference notes
                  </span>
                </span>
                <span
                  aria-hidden
                  className="text-[11px] font-medium text-slate-500 transition-transform duration-150 group-open:rotate-180 dark:text-slate-400"
                >
                  ▾
                </span>
              </span>
            </summary>
            <div className="space-y-1.5 border-t border-slate-200/80 px-3.5 py-2.5 text-xs leading-relaxed text-spec-text2 dark:border-slate-800">
              <p>
                <span className="font-medium text-spec-text">Standard:</span>{" "}
                ASME B16.20 screening table (this app).
              </p>
              <p>
                Spiral-wound: ID / IR_OD / SE_OD / OR_OD for NPS ½–24 × Class
                150–1500. RTJ: R-series octagonal ring No., pitch P, and section
                w×h. Confirm OEM datasheet before procurement. Seating load /
                torque → PCC-1 bolt torque tool.
              </p>
            </div>
          </details>
        </div>
      }
    />
  );
}
