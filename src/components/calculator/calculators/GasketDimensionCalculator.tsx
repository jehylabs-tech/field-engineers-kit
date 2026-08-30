"use client";

import { useEffect, useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import SectionBlock from "@/components/calculator/SectionBlock";
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

  const inputRows = [
    {
      label: "Gasket type",
      value:
        listGasketTypes().find((type) => type.id === resolvedInputs.gasketTypeId)
          ?.label ?? resolvedInputs.gasketTypeId,
    },
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
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3 [&_.calc-field]:max-w-none">
          <SectionBlock
            number={1}
            title="Gasket Selection"
            twoColumn={false}
            compact
          >
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
          </SectionBlock>

          <details className="group mt-auto w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 open:bg-white dark:border-spec-border dark:bg-spec-bg dark:open:bg-spec-panel">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-slate-700 marker:content-none dark:text-slate-300 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded border border-spec-border bg-spec-panel text-sm font-semibold text-slate-500">
                    2
                  </span>
                  Reference Data
                </span>
                <span
                  aria-hidden
                  className="text-slate-400 transition-transform duration-150 group-open:rotate-180"
                >
                  ▾
                </span>
              </span>
            </summary>
            <div className="border-t border-slate-200 px-3 py-2.5 text-sm leading-relaxed text-spec-text2 dark:border-spec-border">
              <p>
                <span className="font-medium text-spec-text">Standard:</span>{" "}
                ASME B16.20 Compliant
              </p>
              <p className="mt-1.5 text-spec-text3">
                Spiral wound (inner ring / sealing element / outer ring) and RTJ
                (R / RX / BX) dimensions for NPS ½″–24″ × Class 150–1500.
                Confirm against the manufacturer datasheet before procurement.
              </p>
            </div>
          </details>
        </div>
      }
    />
  );
}
