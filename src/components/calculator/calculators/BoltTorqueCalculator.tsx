"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import BoltCircleDiagram from "@/components/calculator/BoltCircleDiagram";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import CopyValueButton from "@/components/calculator/CopyValueButton";
import ExportButtons from "@/components/calculator/ExportButtons";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  BOLT_GRADE_OPTIONS,
  BOLT_LUBRICANT_OPTIONS,
  calculateBoltTorque,
  DEFAULT_BOLT_TORQUE_INPUTS,
  type BoltGradeId,
  type BoltLubricantId,
  type BoltTorqueInputs,
} from "@/lib/calculators/engines/bolt-torque";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { BOLT_TORQUE_URL_CONFIG } from "@/lib/calculators/url-configs/bolt-torque";
import { FieldSelect, fieldLabelHint } from "@/components/calculator/FieldGroup";
import {
  chipsInOptions,
  COMMON_CLASS_CHIPS,
  COMMON_NPS_CHIPS,
} from "@/components/calculator/presets";
import {
  getBoltTorqueEntry,
  listBoltTorqueClassesForNps,
  listBoltTorqueNps,
} from "@/lib/data/loaders";
import type { CalculatorOutput, ResultRow } from "@/lib/calculators/definitions";
import { RESULT_HERO_ID } from "@/components/calculator/SummaryBar";

type BoltTorqueCalculatorProps = {
  title: string;
  standard?: string;
};

type ResultTabId = "torque" | "sequence" | "joint";

const RESULT_TABS: { id: ResultTabId; label: string }[] = [
  { id: "torque", label: "Torque & Passes" },
  { id: "sequence", label: "Bolt Sequence Diagram" },
  { id: "joint", label: "Joint Details" },
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

function splitTighteningPattern(text: string): {
  sequence: string;
  rounds: string | null;
} {
  const marker = "Apply Round";
  const idx = text.indexOf(marker);
  if (idx <= 0) {
    return { sequence: text, rounds: null };
  }
  return {
    sequence: text.slice(0, idx).trim().replace(/\.$/, ""),
    rounds: text.slice(idx).trim(),
  };
}

/** Keep a phrase on one visual line even inside narrow table cells. */
function singleLine(text: string): string {
  return text.replace(/ /g, "\u00A0");
}

function CompactKvTable({
  rows,
  dense = false,
  nowrapLabels = false,
}: {
  rows: ResultRow[];
  dense?: boolean;
  nowrapLabels?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-spec-text3">No joint details for this selection.</p>
    );
  }

  const cellPad = dense ? "px-2 py-1" : "px-2.5 py-1.5";

  function renderValue(row: ResultRow) {
    if (!/^tightening sequence$/i.test(row.label)) {
      return row.value;
    }
    const parts = splitTighteningPattern(row.value);
    if (!parts.rounds) {
      return singleLine(row.value);
    }
    const sequenceLine = `${parts.sequence}${parts.sequence.endsWith(".") ? "" : "."}`;
    return (
      <span className="flex flex-col items-end gap-0.5 text-right">
        <span className="block whitespace-nowrap">{singleLine(sequenceLine)}</span>
        <span className="block whitespace-nowrap font-normal text-spec-text3">
          {singleLine(parts.rounds)}
        </span>
      </span>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <table className="w-full min-w-0 border-collapse rounded-md border border-slate-200 text-sm dark:border-spec-border">
        <tbody>
          {rows.map((row) => {
            const isSequence = /^tightening sequence$/i.test(row.label);
            return (
              <tr
                key={row.label}
                className="border-b border-slate-200 last:border-b-0 dark:border-spec-border"
              >
                <th
                  className={`whitespace-nowrap bg-slate-50 text-left align-top text-xs font-medium text-slate-600 dark:bg-spec-bg dark:text-slate-400 ${cellPad} ${
                    isSequence ? "w-[8.5rem] sm:w-[10rem]" : "w-[42%]"
                  }`}
                >
                  {row.label}
                </th>
                <td
                  className={`text-right align-top font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100 ${cellPad}`}
                >
                  {renderValue(row)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BoltTorqueResultTabs({
  output,
  exportTitle,
  standard,
  inputRows,
  sequenceText,
  boltCount,
}: {
  output: CalculatorOutput;
  exportTitle: string;
  standard?: string;
  inputRows: { label: string; value: string }[];
  sequenceText?: string;
  boltCount?: number;
}) {
  const [tab, setTab] = useState<ResultTabId>("torque");

  const jointRows = output.rows.filter(
    (row) => row.section === "Joint selection",
  );
  const passRows = output.rows.filter((row) =>
    (row.section ?? "").startsWith("Assembly torque passes"),
  );

  const copyContext = [standard, output.heroStatus].filter(Boolean).join(" · ");

  const panels: { id: ResultTabId; node: ReactNode }[] = [
    {
      id: "torque",
      node: (
        <div className="space-y-2">
          <div
            id={RESULT_HERO_ID}
            className="rounded-md border border-l-4 border-spec-border border-l-blue-600 bg-blue-50/50 px-2.5 py-2 dark:border-l-blue-500 dark:bg-blue-950/20"
          >
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {output.heroLabel}
              </span>
              <div className="flex flex-wrap items-center justify-end gap-1">
                <ExportButtons
                  variant="inline"
                  title={exportTitle}
                  standard={standard}
                  inputRows={inputRows}
                  resultRows={output.exportRows}
                />
                <CopyValueButton
                  text={
                    copyContext
                      ? `${output.heroValue} (${output.heroLabel} · ${copyContext})`
                      : `${output.heroValue} (${output.heroLabel})`
                  }
                  ariaLabel="Copy result"
                />
              </div>
            </div>
            <div className="font-mono text-3xl font-bold leading-tight tracking-tight text-blue-800 dark:text-blue-200">
              {output.heroValue}
            </div>
            {output.heroBadges && output.heroBadges.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {output.heroBadges.map((badge) => (
                  <span
                    key={`${badge.label}-${badge.value}`}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-200/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-slate-200"
                  >
                    <span className="text-slate-500 dark:text-slate-400">
                      {badge.label}:
                    </span>
                    <span className="font-semibold tabular-nums">{badge.value}</span>
                  </span>
                ))}
              </div>
            ) : null}
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
              {output.heroStatus}
            </p>
          </div>
          <CompactKvTable rows={passRows} dense nowrapLabels />
        </div>
      ),
    },
    {
      id: "sequence",
      node: (() => {
        const parts = sequenceText
          ? splitTighteningPattern(sequenceText)
          : null;
        return (
          <div className="space-y-2.5">
            {boltCount && boltCount > 0 ? (
              <BoltCircleDiagram boltCount={boltCount} />
            ) : (
              <p className="text-sm text-spec-text3">
                Select NPS and class to view the star tightening pattern.
              </p>
            )}
            {parts ? (
              <div className="space-y-1.5 overflow-x-auto text-sm leading-snug text-spec-text2 md:text-[15px]">
                <p className="whitespace-nowrap">
                  {singleLine(`${parts.sequence}.`)}
                </p>
                {parts.rounds ? (
                  <p className="whitespace-nowrap font-mono text-[13px] tabular-nums text-spec-text3 md:text-sm">
                    {singleLine(parts.rounds)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })(),
    },
    {
      id: "joint",
      node: <CompactKvTable rows={jointRows} dense />,
    },
  ];

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2">
      <div
        role="tablist"
        aria-label="Calculation result views"
        className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-spec-border dark:bg-spec-bg"
      >
        {RESULT_TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              id={`bolt-result-tab-${item.id}`}
              aria-controls={`bolt-result-panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-center text-xs font-semibold transition-colors duration-150 md:text-sm ${
                active
                  ? "bg-white text-slate-900 shadow-sm dark:bg-spec-panel dark:text-spec-text"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="relative min-h-[22rem] flex-1">
        {panels.map((panel) => {
          const active = tab === panel.id;
          return (
            <div
              key={panel.id}
              role="tabpanel"
              id={`bolt-result-panel-${panel.id}`}
              aria-labelledby={`bolt-result-tab-${panel.id}`}
              aria-hidden={!active}
              className={`absolute inset-0 overflow-auto transition-opacity duration-150 ease-out ${
                active
                  ? "z-10 opacity-100"
                  : "pointer-events-none z-0 opacity-0"
              }`}
            >
              {panel.node}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BoltTorqueCalculator({
  title,
  standard,
}: BoltTorqueCalculatorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { inputs, setField } = useCalculatorUrlSync<BoltTorqueInputs>(
    DEFAULT_BOLT_TORQUE_INPUTS,
    BOLT_TORQUE_URL_CONFIG,
    { type: "bolt-torque" },
  );

  useEffect(() => {
    const classes = listBoltTorqueClassesForNps(inputs.nps);
    if (
      classes.length > 0 &&
      !classes.some((row) => row.class === inputs.pressureClass)
    ) {
      setField("pressureClass", classes[0].class);
    }
  }, [inputs.nps, inputs.pressureClass, setField]);

  const resolvedInputs = useMemo(() => {
    const classes = listBoltTorqueClassesForNps(inputs.nps);
    const classExists = classes.some(
      (row) => row.class === inputs.pressureClass,
    );
    return {
      ...inputs,
      pressureClass: classExists
        ? inputs.pressureClass
        : (classes[0]?.class ?? ""),
    };
  }, [inputs]);

  const output = useMemo(
    () => calculateBoltTorque(resolvedInputs),
    [resolvedInputs],
  );
  usePublishCalculatorOutput(output);

  const entry = getBoltTorqueEntry(
    resolvedInputs.nps,
    resolvedInputs.pressureClass,
  );

  const gradeLabel =
    BOLT_GRADE_OPTIONS.find((o) => o.value === resolvedInputs.boltGrade)
      ?.label ?? "A193 B7";

  const inputRows = [
    { label: "NPS", value: entry?.size.npsLabel ?? resolvedInputs.nps },
    { label: "Class", value: `Class ${resolvedInputs.pressureClass}` },
    {
      label: "Lubricant K",
      value: String(
        BOLT_LUBRICANT_OPTIONS.find((o) => o.value === resolvedInputs.lubricant)
          ?.k ?? 0.13,
      ),
    },
    {
      label: "Bolt grade",
      value: gradeLabel,
    },
  ];

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      resultPanel={
        <BoltTorqueResultTabs
          output={output}
          exportTitle={title}
          standard={standard}
          inputRows={inputRows}
          sequenceText={entry?.rating.tighteningPattern}
          boltCount={entry?.rating.boltCount}
        />
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2.5 [&_.calc-field]:max-w-none">
          {/* Under 1. Input Parameters — no duplicate top-level section number */}
          <div className="w-full min-w-0 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Flange selection
            </h3>
            <SelectField
              label="Nominal pipe size (NPS)"
              value={resolvedInputs.nps}
              options={listBoltTorqueNps().map((item) => ({
                value: item.nps,
                label: `${item.npsLabel} (DN ${item.dn})`,
              }))}
              chips={COMMON_NPS_CHIPS}
              onChange={(value) => setField("nps", value)}
            />
            <SelectField
              label="Pressure class"
              value={resolvedInputs.pressureClass}
              options={listBoltTorqueClassesForNps(resolvedInputs.nps).map(
                (row) => ({
                  value: row.class,
                  label: `Class ${row.class}`,
                }),
              )}
              chips={COMMON_CLASS_CHIPS}
              onChange={(value) => setField("pressureClass", value)}
            />
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 dark:border-slate-800/90 dark:bg-slate-900/30">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-200/80 px-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  1.2
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Lubricant K &amp; bolt grade
                </span>
                {!showAdvanced ? (
                  <span className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    K=
                    {
                      BOLT_LUBRICANT_OPTIONS.find(
                        (o) => o.value === resolvedInputs.lubricant,
                      )?.k
                    }{" "}
                    · {gradeLabel}
                  </span>
                ) : null}
              </div>
              <span className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {showAdvanced ? "▲ Hide" : "▼ Edit"}
              </span>
            </button>
            {showAdvanced ? (
              <div className="space-y-2.5 border-t border-slate-200/80 px-3.5 py-3 dark:border-slate-800/80">
                <SelectField
                  label="Lubricant / Nut Factor (K)"
                  value={resolvedInputs.lubricant}
                  options={BOLT_LUBRICANT_OPTIONS.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  onChange={(value) =>
                    setField("lubricant", value as BoltLubricantId)
                  }
                />
                <SelectField
                  label="Bolt Grade / Material"
                  value={resolvedInputs.boltGrade}
                  options={BOLT_GRADE_OPTIONS.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  onChange={(value) =>
                    setField("boltGrade", value as BoltGradeId)
                  }
                />
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Table torques assume moly K = 0.13 and A193 B7. Other lubricants
                  scale T ∝ K/0.13; B8 / B8M Class 2 apply a 0.85 preload factor.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
