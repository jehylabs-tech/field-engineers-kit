"use client";

import { useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import CopyValueButton from "@/components/calculator/CopyValueButton";
import ExportButtons from "@/components/calculator/ExportButtons";
import SectionBlock from "@/components/calculator/SectionBlock";
import UnitConverterPanel from "@/components/calculator/UnitConverterPanel";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateUnitConverter,
  DEFAULT_UNIT_CONVERTER_INPUTS,
  type UnitConverterInputs,
} from "@/lib/calculators/engines/unit-converter";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { UNIT_CONVERTER_URL_CONFIG } from "@/lib/calculators/url-configs/unit-converter";
import { type UnitCategory } from "@/lib/units/engineering";

type Props = { title: string; standard?: string };

export default function UnitConverterCalculator({ title, standard }: Props) {
  const { inputs, setField } = useCalculatorUrlSync<UnitConverterInputs>(
    DEFAULT_UNIT_CONVERTER_INPUTS,
    UNIT_CONVERTER_URL_CONFIG,
    { type: "unit-converter" },
  );

  const output = useMemo(() => calculateUnitConverter(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const inputRows = [
    { label: "Category", value: inputs.category },
    { label: "Input", value: `${inputs.value} ${inputs.from}` },
    { label: "Output", value: output.heroValue },
  ];

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      resultPanel={
        <div className="rounded-lg border border-l-4 border-spec-border border-l-blue-600 bg-blue-50/50 p-5 dark:border-spec-border dark:border-l-blue-500 dark:bg-blue-950/20">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {output.heroLabel}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-1">
              <ExportButtons
                variant="inline"
                title={title}
                standard={standard}
                inputRows={inputRows}
                resultRows={output.exportRows}
              />
              <CopyValueButton
                text={`${output.heroValue} (${output.heroLabel} · ${title})`}
                ariaLabel="Copy result"
              />
            </div>
          </div>
          <div className="break-words font-mono text-3xl font-extrabold leading-snug tracking-tight text-blue-800 dark:text-blue-200 md:text-4xl">
            {output.heroValue}
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {output.summaryStatus.label}
          </p>
        </div>
      }
      inputPanel={
        <SectionBlock number={1} title="Convert">
          <UnitConverterPanel
            category={inputs.category}
            value={inputs.value}
            from={inputs.from}
            to={inputs.to}
            density={inputs.density}
            digits={inputs.digits}
            onCategory={(category: UnitCategory) => setField("category", category)}
            onValue={(value) => setField("value", value)}
            onFrom={(unit) => setField("from", unit)}
            onTo={(unit) => setField("to", unit)}
            onDensity={(value) => setField("density", value)}
            onDigits={(digits) => setField("digits", digits)}
          />
        </SectionBlock>
      }
    />
  );
}
