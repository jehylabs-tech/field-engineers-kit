"use client";

import { useEffect, useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import SectionBlock from "@/components/calculator/SectionBlock";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateButtWeldFitting,
  DEFAULT_BUTT_WELD_FITTING_INPUTS,
  type ButtWeldFittingInputs,
} from "@/lib/calculators/engines/butt-weld-fitting";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { BUTT_WELD_FITTING_URL_CONFIG } from "@/lib/calculators/url-configs/butt-weld-fitting";
import { FieldSelect, fieldLabelHint } from "@/components/calculator/FieldGroup";
import {
  chipsInOptions,
  COMMON_NPS_CHIPS,
  COMMON_SCHEDULE_CHIPS,
} from "@/components/calculator/presets";
import {
  getButtWeldFittingComponent,
  getButtWeldFittingData,
  listButtWeldFittingComponents,
  listButtWeldFittingNps,
  listScheduleOptionsForNps,
  resolveScheduleOptionValue,
} from "@/lib/data/loaders";

type ButtWeldFittingCalculatorProps = {
  title: string;
  standard?: string;
};

const COMPONENT_ORDER = [
  "elbow_90_lr",
  "elbow_90_sr",
  "elbow_45_lr",
  "tee_equal",
  "reducer_concentric",
  "reducer_eccentric",
  "cap",
];

const BW_SCHEDULE_CHIPS = [
  { value: "40", label: "STD / 40" },
  { value: "80", label: "XS / 80" },
  { value: "160", label: "Sch 160" },
  { value: "10", label: "10 / 10S" },
  ...COMMON_SCHEDULE_CHIPS.filter(
    (chip) => !["40", "80", "160", "10S"].includes(chip.value),
  ),
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

export default function ButtWeldFittingCalculator({
  title,
  standard,
}: ButtWeldFittingCalculatorProps) {
  const { inputs, setField } = useCalculatorUrlSync<ButtWeldFittingInputs>(
    DEFAULT_BUTT_WELD_FITTING_INPUTS,
    BUTT_WELD_FITTING_URL_CONFIG,
    { type: "butt-weld-fitting" },
  );

  const component = getButtWeldFittingComponent(inputs.componentId);
  const bevelDeg = getButtWeldFittingData().bevelAngleDeg;

  useEffect(() => {
    const sizes = listButtWeldFittingNps(inputs.componentId);
    if (sizes.length > 0 && !sizes.some((size) => size.nps === inputs.nps)) {
      setField("nps", sizes[0].nps);
    }
  }, [inputs.componentId, inputs.nps, setField]);

  useEffect(() => {
    const resolved = resolveScheduleOptionValue(inputs.nps, inputs.schedule);
    if (resolved && resolved !== inputs.schedule) {
      setField("schedule", resolved);
    }
  }, [inputs.nps, inputs.schedule, setField]);

  const componentOptions = useMemo(() => {
    const items = listButtWeldFittingComponents();
    return [...items]
      .sort((a, b) => {
        const ia = COMPONENT_ORDER.indexOf(a.id);
        const ib = COMPONENT_ORDER.indexOf(b.id);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map((item) => ({
        value: item.id,
        label: item.label,
      }));
  }, []);

  const npsOptions = useMemo(
    () =>
      listButtWeldFittingNps(inputs.componentId).map((size) => ({
        value: size.nps,
        label: `${size.npsLabel} (DN ${size.dn})`,
      })),
    [inputs.componentId],
  );

  const scheduleOptions = useMemo(
    () => listScheduleOptionsForNps(inputs.nps),
    [inputs.nps],
  );

  const resolvedInputs = useMemo(() => {
    const sizes = listButtWeldFittingNps(inputs.componentId);
    const npsExists = sizes.some((size) => size.nps === inputs.nps);
    const nps = npsExists ? inputs.nps : (sizes[0]?.nps ?? "");
    const schedule = resolveScheduleOptionValue(nps, inputs.schedule);
    return {
      ...inputs,
      nps,
      schedule: schedule || inputs.schedule,
    };
  }, [inputs]);

  const output = useMemo(
    () => calculateButtWeldFitting(resolvedInputs),
    [resolvedInputs],
  );
  usePublishCalculatorOutput(output);

  const activeComponent = getButtWeldFittingComponent(resolvedInputs.componentId);
  const selectedSize = listButtWeldFittingNps(resolvedInputs.componentId).find(
    (size) => size.nps === resolvedInputs.nps,
  );

  const inputRows = [
    {
      label: "Component",
      value: activeComponent?.label ?? resolvedInputs.componentId,
    },
    { label: "NPS", value: selectedSize?.npsLabel ?? resolvedInputs.nps },
    { label: "Schedule", value: `Sch ${resolvedInputs.schedule}` },
    { label: "Unit system", value: resolvedInputs.unitSystem },
  ];

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard ?? "ASME B16.9"}
      inputRows={inputRows}
      layout="formula"
      columnRatio="5-7"
      inputPanel={
        <>
          <SectionBlock number={1} title="Component Selection">
            <SelectField
              label="Component type"
              value={resolvedInputs.componentId}
              options={componentOptions}
              onChange={(value) => setField("componentId", value)}
            />
            <SelectField
              label="Nominal pipe size (NPS)"
              value={resolvedInputs.nps}
              options={npsOptions}
              chips={COMMON_NPS_CHIPS}
              onChange={(value) => setField("nps", value)}
            />
            <SelectField
              label="Pipe schedule / rating"
              value={resolvedInputs.schedule}
              options={scheduleOptions}
              chips={BW_SCHEDULE_CHIPS}
              onChange={(value) => setField("schedule", value)}
            />
          </SectionBlock>

          <SectionBlock number={2} title="Reference Data">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-tight text-slate-700 dark:border-spec-border dark:bg-spec-bg dark:text-slate-200">
                ASME B16.9
              </span>
              <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-tight text-slate-700 dark:border-spec-border dark:bg-spec-bg dark:text-slate-200">
                B36.10M / B36.19M
              </span>
            </div>
            <p className="mb-2 text-xs leading-snug text-spec-text2">
              Butt-weld envelopes follow ASME B16.9. Matching bevel OD and wall
              thickness come from the selected pipe schedule; ID = OD − 2t.
              Standard end bevel is {bevelDeg}°.
            </p>
            {component ? (
              <p className="text-xs text-spec-text2">
                Active dimension:{" "}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {component.dimensionLabel}
                </span>
              </p>
            ) : null}
          </SectionBlock>
        </>
      }
    />
  );
}
