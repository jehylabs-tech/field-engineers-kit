"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BoltCircleDiagram from "@/components/calculator/BoltCircleDiagram";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import CopyValueButton from "@/components/calculator/CopyValueButton";
import ExportButtons from "@/components/calculator/ExportButtons";
import FieldGroup, {
  FieldSelect,
  fieldLabelHint,
} from "@/components/calculator/FieldGroup";
import {
  chipsInOptions,
  COMMON_CLASS_CHIPS,
  COMMON_NPS_CHIPS,
} from "@/components/calculator/presets";
import { RESULT_HERO_ID } from "@/components/calculator/SummaryBar";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import { useUnitSystemOptional } from "@/components/units/UnitContext";
import {
  BOLT_SEQUENCE_COUNTS,
  calculateBoltSequence,
  formatSequenceArrowText,
  generateBoltSequence,
  PCC1_ROUNDS,
  sequenceTitle,
  type BoltSequenceInputs,
  type BoltSequencePattern,
} from "@/lib/calculators/engines/bolt-sequence";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import {
  BOLT_SEQUENCE_URL_CONFIG,
  DEFAULT_BOLT_SEQUENCE_INPUTS,
} from "@/lib/calculators/url-configs/bolt-sequence";
import {
  getBoltTorqueEntry,
  listBoltTorqueClassesForNps,
  listBoltTorqueNps,
} from "@/lib/data/loaders";
import { formatTorque } from "@/utils/unitConverter";

type BoltSequenceCalculatorProps = {
  title: string;
  standard?: string;
};

const NM_TO_FT_LB = 0.737562;

const BOLT_COUNT_OPTIONS = BOLT_SEQUENCE_COUNTS.map((n) => ({
  value: String(n),
  label: `${n} bolts`,
}));

const PATTERN_OPTIONS: { value: BoltSequencePattern; label: string }[] = [
  { value: "star", label: "Star / cross (ASME PCC-1)" },
  { value: "circular", label: "Circular / sequential" },
];

function torqueDisplayFromNm(nm: number, imperial: boolean): string {
  if (!(nm > 0)) return "";
  if (imperial) return String(Number((nm * NM_TO_FT_LB).toFixed(1)));
  return String(Number(nm.toFixed(1)));
}

function torqueNmFromDisplay(raw: string, imperial: boolean): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return imperial ? n / NM_TO_FT_LB : n;
}

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

export default function BoltSequenceCalculator({
  title,
  standard,
}: BoltSequenceCalculatorProps) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<BoltSequenceInputs>(
      DEFAULT_BOLT_SEQUENCE_INPUTS,
      BOLT_SEQUENCE_URL_CONFIG,
      { type: "bolt-sequence" },
    );

  const unitCtx = useUnitSystemOptional();
  const unitSystem = unitCtx?.unitSystem ?? "metric";
  const imperial = unitSystem === "imperial";
  const torqueUnit = imperial ? "ft-lb" : "N·m";

  const npsOptions = useMemo(
    () => [
      { value: "", label: "None (manual bolt count)" },
      ...listBoltTorqueNps().map((row) => ({
        value: row.nps,
        label: row.npsLabel,
      })),
    ],
    [],
  );

  const classOptions = useMemo(() => {
    if (!inputs.nps) {
      return [{ value: "", label: "Select NPS first" }];
    }
    const ratings = listBoltTorqueClassesForNps(inputs.nps);
    return [
      { value: "", label: "Select class" },
      ...ratings.map((row) => ({
        value: row.class,
        label: `Class ${row.class} (${row.boltCount} bolts)`,
      })),
    ];
  }, [inputs.nps]);

  const output = useMemo(
    () => calculateBoltSequence(inputs, unitSystem),
    [inputs, unitSystem],
  );
  usePublishCalculatorOutput(output);

  const sequence = useMemo(
    () => generateBoltSequence(inputs.boltCount, inputs.pattern),
    [inputs.boltCount, inputs.pattern],
  );
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setStepIndex(0);
  }, [inputs.boltCount, inputs.pattern]);

  const activeBolt =
    sequence.length > 0 ? sequence[Math.min(stepIndex, sequence.length - 1)]! : null;
  const completedBolts = sequence.slice(0, Math.max(0, stepIndex));
  const arrowText =
    sequence.length > 0 ? formatSequenceArrowText(sequence) : "—";
  const headline = sequenceTitle(inputs.boltCount, inputs.pattern);

  const inputRows = [
    { label: "Bolt count", value: String(inputs.boltCount) },
    {
      label: "Pattern",
      value: inputs.pattern === "star" ? "Star / cross" : "Circular",
    },
    {
      label: "Flange preset",
      value:
        inputs.nps && inputs.pressureClass
          ? `NPS ${inputs.nps}" Class ${inputs.pressureClass}`
          : "Manual",
    },
    ...(inputs.targetTorqueNm > 0
      ? [
          {
            label: "Target T",
            value: formatTorque(inputs.targetTorqueNm, unitSystem),
          },
        ]
      : []),
  ];
  const hasTorque = inputs.targetTorqueNm > 0;

  function applyFlangePreset(nps: string, pressureClass: string) {
    if (!nps || !pressureClass) {
      setInputs((prev) => ({ ...prev, nps, pressureClass }));
      return;
    }
    const entry = getBoltTorqueEntry(nps, pressureClass);
    if (!entry) {
      setInputs((prev) => ({ ...prev, nps, pressureClass }));
      return;
    }
    setInputs((prev) => ({
      ...prev,
      nps,
      pressureClass,
      boltCount: entry.rating.boltCount,
    }));
  }

  function handleBoltCountChange(raw: string) {
    const n = Number(raw);
    setInputs((prev) => ({
      ...prev,
      boltCount: n,
      nps: "",
      pressureClass: "",
    }));
  }

  return (
    <CalculatorBaseLayout
      layout="formula"
      columnRatio="5-7"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      inputNaturalHeight
      resultPanel={
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2.5">
          <div
            id={RESULT_HERO_ID}
            className="rounded-md border border-l-4 border-spec-border border-l-blue-600 bg-blue-50/50 px-2.5 py-2 dark:border-l-blue-500 dark:bg-blue-950/20"
          >
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {headline}
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
                  text={`${headline}: ${arrowText}`}
                  ariaLabel="Copy sequence"
                />
              </div>
            </div>
            <p className="break-words font-mono text-sm font-semibold leading-snug text-blue-900 dark:text-blue-100 md:text-base">
              {arrowText}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {output.heroStatus}
            </p>
          </div>

          <div className="grid gap-2.5 lg:grid-cols-2">
            <BoltCircleDiagram
              boltCount={inputs.boltCount}
              activeBolt={activeBolt}
              completedBolts={completedBolts}
            />
            <div className="flex flex-col gap-2 rounded-md border border-spec-border bg-spec-panel p-3">
              <p className="text-sm font-medium text-spec-text2">
                Step-through sequence
              </p>
              <p className="font-mono text-2xl font-extrabold tabular-nums text-blue-800 dark:text-blue-200">
                {activeBolt != null ? `Bolt ${activeBolt}` : "—"}
              </p>
              <p className="text-xs text-spec-text3">
                Step {sequence.length ? stepIndex + 1 : 0} of {sequence.length}
              </p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-spec-border dark:bg-spec-bg dark:text-spec-text"
                  onClick={() => setStepIndex(0)}
                  disabled={sequence.length === 0}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-spec-border dark:bg-spec-bg dark:text-spec-text"
                  onClick={() =>
                    setStepIndex((i) => Math.max(0, i - 1))
                  }
                  disabled={stepIndex <= 0}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                  onClick={() =>
                    setStepIndex((i) =>
                      Math.min(Math.max(sequence.length - 1, 0), i + 1),
                    )
                  }
                  disabled={
                    sequence.length === 0 || stepIndex >= sequence.length - 1
                  }
                >
                  Next bolt
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {sequence.map((bolt, idx) => {
                  const active = idx === stepIndex;
                  return (
                    <button
                      key={`${bolt}-${idx}`}
                      type="button"
                      onClick={() => setStepIndex(idx)}
                      className={`inline-flex h-7 min-w-7 items-center justify-center rounded border px-1.5 font-mono text-[11px] font-semibold tabular-nums ${
                        active
                          ? "border-blue-600 bg-blue-600 text-white"
                          : idx < stepIndex
                            ? "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-950/40 dark:text-indigo-100"
                            : "border-slate-200 bg-white text-slate-700 dark:border-spec-border dark:bg-spec-bg dark:text-spec-text2"
                      }`}
                      aria-label={`Step ${idx + 1}, bolt ${bolt}`}
                    >
                      {bolt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-spec-border bg-spec-panel p-3">
            <p className="mb-2 text-sm font-semibold text-spec-text">
              ASME PCC-1 tightening rounds
            </p>
            <ul className="space-y-1.5 text-sm text-spec-text2">
              {PCC1_ROUNDS.map((round) => (
                <li key={round.round} className="flex gap-2">
                  <span className="shrink-0 font-mono text-xs font-semibold text-slate-500">
                    R{round.round}
                  </span>
                  <span>
                    <span className="font-semibold">{round.torquePct}</span>
                    {hasTorque ? (
                      <>
                        {" · "}
                        <span className="font-mono font-semibold tabular-nums text-blue-800 dark:text-blue-200">
                          {formatTorque(
                            inputs.targetTorqueNm * round.fraction,
                            unitSystem,
                          )}
                        </span>
                      </>
                    ) : null}
                    {" · "}
                    {round.pattern === "star" ? "star/cross" : "circular"}
                    {" — "}
                    {round.summary}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-spec-text3">
              Percentages match FEK Bolt Torque screening (30% / 60% / 100% /
              circular 100%). Confirm against the site PCC-1 procedure.
            </p>
          </div>

          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-950 dark:border-blue-500/40 dark:bg-blue-950/30 dark:text-blue-100">
            Need precise torque &amp; stress calculations?{" "}
            <Link
              href="/calculator/bolt-torque-tensioning"
              className="font-semibold underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-200"
            >
              ASME PCC-1 Bolt Torque &amp; Tensioning Calculator
            </Link>
          </div>
        </div>
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3 [&_.calc-field]:mb-0">
          <div className="w-full min-w-0 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Bolt circle
            </h3>
            <SelectField
              label="Bolt count"
              value={String(inputs.boltCount)}
              options={BOLT_COUNT_OPTIONS}
              onChange={handleBoltCountChange}
            />
            <FieldSelect
              label="Pattern mode"
              value={inputs.pattern}
              options={PATTERN_OPTIONS}
              onChange={(value) =>
                setField("pattern", value as BoltSequencePattern)
              }
              hint={fieldLabelHint("Pattern mode")}
            />
            <FieldGroup
              label="Target assembly torque (T)"
              value={torqueDisplayFromNm(inputs.targetTorqueNm, imperial)}
              unit={torqueUnit}
              allowZero
              hint="Optional. Screens Round 1–4 wrench targets at 30% / 60% / 100% / 100%. Leave blank to show percentages only."
              onChange={(raw) =>
                setField("targetTorqueNm", torqueNmFromDisplay(raw, imperial))
              }
            />
          </div>

          <div className="w-full min-w-0 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Flange size &amp; class (optional)
            </h3>
            <p className="text-xs text-spec-text3">
              Auto-fills bolt count from ASME B16.5 / B16.47 joint tables used
              by the Bolt Torque tool.
            </p>
            <SelectField
              label="NPS"
              value={inputs.nps}
              options={npsOptions}
              chips={COMMON_NPS_CHIPS}
              onChange={(nps) => {
                if (!nps) {
                  setInputs((prev) => ({
                    ...prev,
                    nps: "",
                    pressureClass: "",
                  }));
                  return;
                }
                const ratings = listBoltTorqueClassesForNps(nps);
                const nextClass =
                  ratings.find((r) => r.class === inputs.pressureClass)?.class ??
                  ratings[0]?.class ??
                  "";
                applyFlangePreset(nps, nextClass);
              }}
            />
            <SelectField
              label="Pressure class"
              value={inputs.pressureClass}
              options={classOptions}
              chips={inputs.nps ? COMMON_CLASS_CHIPS : undefined}
              onChange={(cls) => applyFlangePreset(inputs.nps, cls)}
            />
          </div>
        </div>
      }
    />
  );
}
