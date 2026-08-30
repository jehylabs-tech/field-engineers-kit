"use client";

import { useEffect, useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import SectionBlock from "@/components/calculator/SectionBlock";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateFittingValveDimension,
  DEFAULT_FITTING_VALVE_DIMENSION_INPUTS,
  DEFAULT_GASKET_JOINTS,
  DEFAULT_GASKET_THICKNESS_MM,
  type FittingValveDimensionInputs,
} from "@/lib/calculators/engines/fitting-valve-dimension";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { FITTING_VALVE_DIMENSION_URL_CONFIG } from "@/lib/calculators/url-configs/fitting-valve-dimension";
import { FieldSelect, fieldLabelHint } from "@/components/calculator/FieldGroup";
import {
  chipsInOptions,
  COMMON_CLASS_CHIPS,
  FITTING_VALVE_NPS_CHIPS,
} from "@/components/calculator/presets";
import {
  getFittingValveComponent,
  listFittingValveClassesForNps,
  listFittingValveComponents,
  listFittingValveNps,
} from "@/lib/data/loaders";

type FittingValveDimensionCalculatorProps = {
  title: string;
  standard?: string;
};

const COMPONENT_ORDER = [
  "gate_valve",
  "globe_valve",
  "check_valve",
  "ball_valve",
  "butterfly_valve",
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

function StandardBadges({ standards }: { standards: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {standards.map((item) => (
        <span
          key={item}
          className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-tight text-slate-700 dark:border-spec-border dark:bg-spec-bg dark:text-slate-200"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function FittingValveDimensionCalculator({
  title,
  standard,
}: FittingValveDimensionCalculatorProps) {
  const { inputs, setField } = useCalculatorUrlSync<FittingValveDimensionInputs>(
    DEFAULT_FITTING_VALVE_DIMENSION_INPUTS,
    FITTING_VALVE_DIMENSION_URL_CONFIG,
    { type: "fitting-valve-dimension" },
  );

  const component = getFittingValveComponent(inputs.componentId);

  useEffect(() => {
    if (!COMPONENT_ORDER.includes(inputs.componentId)) {
      setField("componentId", "gate_valve");
    }
  }, [inputs.componentId, setField]);

  useEffect(() => {
    const sizes = listFittingValveNps(inputs.componentId);
    if (sizes.length > 0 && !sizes.some((size) => size.nps === inputs.nps)) {
      setField("nps", sizes[0].nps);
    }
  }, [inputs.componentId, inputs.nps, setField]);

  useEffect(() => {
    const classes = listFittingValveClassesForNps(inputs.componentId, inputs.nps);
    if (
      classes.length > 0 &&
      !classes.some((row) => row.class === inputs.pressureClass)
    ) {
      setField("pressureClass", classes[0].class);
    }
  }, [inputs.componentId, inputs.nps, inputs.pressureClass, setField]);

  const componentOptions = useMemo(() => {
    const items = listFittingValveComponents().filter((item) =>
      COMPONENT_ORDER.includes(item.id),
    );
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
      listFittingValveNps(inputs.componentId).map((size) => ({
        value: size.nps,
        label: `${size.npsLabel} (DN ${size.dn})`,
      })),
    [inputs.componentId],
  );

  const classOptions = useMemo(() => {
    return listFittingValveClassesForNps(inputs.componentId, inputs.nps).map(
      (row) => ({
        value: row.class,
        label: row.class === "STD" ? "Standard (STD)" : `Class ${row.class}`,
      }),
    );
  }, [inputs.componentId, inputs.nps]);

  const resolvedInputs = useMemo(() => {
    const sizes = listFittingValveNps(inputs.componentId);
    const classes = listFittingValveClassesForNps(inputs.componentId, inputs.nps);
    const npsExists = sizes.some((size) => size.nps === inputs.nps);
    const classExists = classes.some((row) => row.class === inputs.pressureClass);

    return {
      ...inputs,
      nps: npsExists ? inputs.nps : (sizes[0]?.nps ?? ""),
      pressureClass: classExists
        ? inputs.pressureClass
        : (classes[0]?.class ?? ""),
      gasketThicknessMm:
        Number.isFinite(inputs.gasketThicknessMm) && inputs.gasketThicknessMm >= 0
          ? inputs.gasketThicknessMm
          : DEFAULT_GASKET_THICKNESS_MM,
      gasketJoints:
        Number.isFinite(inputs.gasketJoints) && inputs.gasketJoints >= 0
          ? inputs.gasketJoints
          : DEFAULT_GASKET_JOINTS,
    };
  }, [inputs]);

  const output = useMemo(
    () => calculateFittingValveDimension(resolvedInputs),
    [resolvedInputs],
  );
  usePublishCalculatorOutput(output);

  const activeComponent = getFittingValveComponent(resolvedInputs.componentId);
  const selectedSize = listFittingValveNps(resolvedInputs.componentId).find(
    (size) => size.nps === resolvedInputs.nps,
  );

  const inputRows = [
    { label: "Component", value: activeComponent?.label ?? resolvedInputs.componentId },
    { label: "NPS", value: selectedSize?.npsLabel ?? resolvedInputs.nps },
    {
      label: "Rating",
      value:
        resolvedInputs.pressureClass === "STD"
          ? "Standard"
          : `Class ${resolvedInputs.pressureClass}`,
    },
    {
      label: "Gasket takeout",
      value: resolvedInputs.includeGasketTakeout
        ? `${resolvedInputs.gasketThicknessMm} mm × ${resolvedInputs.gasketJoints}`
        : "Off",
    },
    { label: "Unit system", value: resolvedInputs.unitSystem },
  ];

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard}
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
              chips={FITTING_VALVE_NPS_CHIPS}
              onChange={(value) => setField("nps", value)}
            />
            <SelectField
              label="Pressure class / rating"
              value={resolvedInputs.pressureClass}
              options={classOptions}
              chips={COMMON_CLASS_CHIPS}
              onChange={(value) => setField("pressureClass", value)}
            />
            <div className="calc-field mb-0 w-full min-w-0">
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-spec-accent focus:ring-spec-accent"
                  checked={resolvedInputs.includeGasketTakeout}
                  onChange={(event) =>
                    setField("includeGasketTakeout", event.target.checked)
                  }
                />
                <span>Include gasket takeout (1.5 mm × 2)</span>
              </label>
              <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                Adds default RF gasket stack to Total Installation Length for
                spool / isometrics. Confirm facing and gasket type before issue.
              </p>
            </div>
          </SectionBlock>

          <SectionBlock number={2} title="Reference Data">
            <p className="mb-2 text-xs leading-snug text-spec-text2">
              Valves use face-to-face lengths; fittings use center-to-end
              (elbows / tees) or end-to-end (reducers).
            </p>
            <StandardBadges standards={["ASME B16.10"]} />
            {component ? (
              <p className="mt-2 text-xs text-spec-text2">
                Active:{" "}
                <span className="font-mono font-semibold text-spec-text">
                  {component.standard}
                </span>
                {" · "}
                {component.dimensionLabel}
              </p>
            ) : null}
          </SectionBlock>
        </>
      }
    />
  );
}
