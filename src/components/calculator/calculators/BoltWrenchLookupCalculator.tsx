"use client";

import { useEffect, useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import BoltCircleDiagram from "@/components/calculator/BoltCircleDiagram";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateBoltWrenchLookup,
  DEFAULT_BOLT_WRENCH_LOOKUP_INPUTS,
  listBoltWrenchChartForClass,
  type BoltWrenchLookupInputs,
} from "@/lib/calculators/engines/bolt-wrench-lookup";
import {
  isRtjClass,
  resolveFacing,
} from "@/lib/calculators/engines/flange-options";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { BOLT_WRENCH_LOOKUP_URL_CONFIG } from "@/lib/calculators/url-configs/bolt-wrench-lookup";
import {
  FieldChipRadio,
  FieldSelect,
  fieldLabelHint,
} from "@/components/calculator/FieldGroup";
import {
  FACING_CHIPS,
  COMMON_CLASS_CHIPS,
  chipsInOptions,
  COMMON_NPS_CHIPS,
} from "@/components/calculator/presets";
import {
  getFlangeDimensionEntry,
  listFlangeClassesForNps,
  listFlangeNps,
} from "@/lib/data/loaders";

type BoltWrenchLookupCalculatorProps = {
  title: string;
  standard?: string;
};

const RTJ_DISABLED_HINT =
  "RTJ facing is available for Class 300 and above per ASME B16.5";

export default function BoltWrenchLookupCalculator({
  title,
  standard,
}: BoltWrenchLookupCalculatorProps) {
  const { inputs, setField } = useCalculatorUrlSync<BoltWrenchLookupInputs>(
    DEFAULT_BOLT_WRENCH_LOOKUP_INPUTS,
    BOLT_WRENCH_LOOKUP_URL_CONFIG,
    { type: "bolt-wrench-lookup" },
  );

  useEffect(() => {
    const classes = listFlangeClassesForNps(inputs.nps);
    if (
      classes.length > 0 &&
      !classes.some((row) => row.class === inputs.pressureClass)
    ) {
      setField("pressureClass", classes[0].class);
    }
    if (inputs.facing === "rtj" && !isRtjClass(inputs.pressureClass)) {
      setField("facing", "rf");
    }
  }, [inputs.nps, inputs.pressureClass, inputs.facing, setField]);

  const npsOptions = useMemo(
    () =>
      listFlangeNps().map((flange) => ({
        value: flange.nps,
        label: `${flange.npsLabel} (DN ${flange.dn})`,
      })),
    [],
  );

  const classOptions = useMemo(() => {
    return listFlangeClassesForNps(inputs.nps).map((row) => ({
      value: String(row.class),
      label: `Class ${row.class}`,
    }));
  }, [inputs.nps]);

  const resolvedFacing = resolveFacing(inputs.facing, inputs.pressureClass);
  const entry = getFlangeDimensionEntry(inputs.nps, inputs.pressureClass);

  const chartRows = useMemo(
    () => listBoltWrenchChartForClass(inputs.pressureClass),
    [inputs.pressureClass],
  );

  const resolvedInputs = useMemo(
    () => ({
      ...inputs,
      facing: resolvedFacing,
    }),
    [inputs, resolvedFacing],
  );

  const output = useMemo(
    () => calculateBoltWrenchLookup(resolvedInputs),
    [resolvedInputs],
  );
  usePublishCalculatorOutput(output);

  const inputRows = [
    { label: "NPS", value: `${inputs.nps}"` },
    { label: "Class", value: `${inputs.pressureClass}#` },
    { label: "Facing", value: resolvedFacing.toUpperCase() },
    {
      label: "Units",
      value: inputs.unitSystem === "metric" ? "Metric" : "Imperial",
    },
  ];

  const facingChips = FACING_CHIPS.map((chip) => {
    if (chip.value === "rtj" && !isRtjClass(inputs.pressureClass)) {
      return { ...chip, disabled: true, title: RTJ_DISABLED_HINT };
    }
    return chip;
  });

  const wrenchChart = (
    <div className="rounded-md border border-slate-200 bg-white p-2.5 dark:border-spec-border dark:bg-spec-panel">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Class {inputs.pressureClass} wrench chart by NPS
        </h3>
        <p className="text-xs text-spec-text3">
          Tap a row to select NPS. Facing changes stud length only — not wrench
          size.
        </p>
      </div>
      {chartRows.length === 0 ? (
        <p className="text-sm text-spec-text3">
          No B16.5 rows for Class {inputs.pressureClass}.
        </p>
      ) : (
        <div className="w-full min-w-0 overflow-x-auto rounded-md border border-slate-200 dark:border-spec-border">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-600 dark:border-spec-border dark:bg-spec-bg dark:text-slate-400">
                <th className="px-2 py-1.5">NPS</th>
                <th className="px-2 py-1.5 text-right">Bolts</th>
                <th className="px-2 py-1.5 text-right">Stud Ø</th>
                <th className="px-2 py-1.5 text-right">Wrench AF</th>
                <th className="px-2 py-1.5 text-right">Metric</th>
              </tr>
            </thead>
            <tbody>
              {chartRows.map((row) => {
                const active = row.nps === inputs.nps;
                return (
                  <tr
                    key={row.nps}
                    className={`cursor-pointer border-b border-slate-100 last:border-b-0 dark:border-spec-border ${
                      active
                        ? "bg-blue-50/80 dark:bg-blue-950/30"
                        : "hover:bg-slate-50 dark:hover:bg-spec-bg/80"
                    }`}
                    onClick={() => setField("nps", row.nps)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setField("nps", row.nps);
                      }
                    }}
                    tabIndex={0}
                    aria-selected={active}
                  >
                    <td className="px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200">
                      {row.npsLabel}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {row.boltCount}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {row.studDiameterIn}&quot;
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold tabular-nums text-blue-800 dark:text-blue-200">
                      {row.wrenchAfIn}&quot;
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold tabular-nums text-blue-800 dark:text-blue-200">
                      {row.wrenchAfMm} mm
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <CalculatorBaseLayout
      layout="formula"
      wideResult
      resultDashboard
      inputNaturalHeight
      diagramSection="Flange bolt pattern"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      visual={
        <BoltCircleDiagram
          boltCount={entry?.rating.boltHoleCount ?? 0}
          title="Bolt numbering (clockwise from top)"
        />
      }
      afterHero={wrenchChart}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Flange selection
          </h3>
          <FieldSelect
            label="Nominal pipe size (NPS)"
            hint={fieldLabelHint("NPS")}
            value={inputs.nps}
            onChange={(value) => setField("nps", value)}
            options={npsOptions}
          />
          <FieldChipRadio
            label="Common NPS"
            value={inputs.nps}
            onChange={(value) => setField("nps", value)}
            options={chipsInOptions(COMMON_NPS_CHIPS, npsOptions)}
          />
          <FieldSelect
            label="Pressure class"
            hint={fieldLabelHint("Class")}
            value={inputs.pressureClass}
            onChange={(value) => setField("pressureClass", value)}
            options={classOptions}
          />
          <FieldChipRadio
            label="Common class"
            value={inputs.pressureClass}
            onChange={(value) => setField("pressureClass", value)}
            options={chipsInOptions(COMMON_CLASS_CHIPS, classOptions)}
          />
          <FieldChipRadio
            label="Flange facing"
            value={resolvedFacing}
            onChange={(value) => setField("facing", value)}
            options={facingChips}
          />
          <FieldChipRadio
            label="Display units"
            value={inputs.unitSystem}
            onChange={(value) =>
              setField("unitSystem", value as "imperial" | "metric")
            }
            options={[
              { value: "imperial", label: "Imperial" },
              { value: "metric", label: "Metric" },
            ]}
          />
        </div>
      }
    />
  );
}
