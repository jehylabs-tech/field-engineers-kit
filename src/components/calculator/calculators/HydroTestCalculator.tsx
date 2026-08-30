"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import HydroStressChart from "@/components/calculator/charts/HydroStressChart";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import CopyValueButton from "@/components/calculator/CopyValueButton";
import ExportButtons from "@/components/calculator/ExportButtons";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import SectionBlock from "@/components/calculator/SectionBlock";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import type { CalculatorOutput, ResultRow } from "@/lib/calculators/definitions";
import {
  calculateHydroTest,
  clampStressRatio,
  DEFAULT_HYDRO_TEST_INPUTS,
  HYDRO_NPS_OPTIONS,
  STRESS_RATIO_MAX,
  type HydroTestInputs,
  type TestFluid,
} from "@/lib/calculators/engines/hydro-test";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { HYDRO_TEST_URL_CONFIG } from "@/lib/calculators/url-configs/hydro-test";

type HydroTestCalculatorProps = {
  title: string;
  standard?: string;
};

type ResultTabId = "summary" | "safety" | "chart";

const RESULT_TABS: { id: ResultTabId; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "safety", label: "Safety & Codes" },
  { id: "chart", label: "Chart" },
];

const FORMULA_HINT =
  "Pt = 1.5 × P × (St/S) hydrostatic, or 1.1 × P × (St/S) pneumatic. St is allowable stress at test temperature; S is allowable at design temperature (ASME B31.3 para. 345.4.2). Default 1.0. Cap applies as a field yield-limit screen.";

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function FormulaInfoButton({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="ASME B31.3 formula help"
        aria-expanded={open}
        aria-controls={tipId}
        title={text}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-bold leading-none text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-spec-border dark:text-slate-400 dark:hover:text-slate-200"
      >
        ?
      </button>
      {open ? (
        <div
          id={tipId}
          role="tooltip"
          className="absolute right-0 top-full z-30 mt-1.5 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-xs leading-relaxed text-slate-600 shadow-lg dark:border-spec-border dark:bg-spec-panel dark:text-slate-300"
        >
          <p className="mb-1 font-semibold text-slate-800 dark:text-slate-100">
            Formula (B31.3 345.4.2)
          </p>
          <p>{text}</p>
        </div>
      ) : null}
    </div>
  );
}

function ValueCell({
  value,
  emphasis,
  align = "right",
}: {
  value: string;
  emphasis?: boolean;
  align?: "left" | "right";
}) {
  const match = value.match(/^(-?[\d.,]+)\s+(.+)$/);
  const tone = emphasis
    ? "text-blue-700 dark:text-blue-300"
    : "text-slate-900 dark:text-slate-100";
  const alignClass =
    align === "right"
      ? "ml-auto flex w-full items-center justify-end gap-1 text-right"
      : "inline-flex items-center gap-1";
  if (match) {
    return (
      <span className={`${alignClass} ${tone}`}>
        <span className={emphasis ? "font-bold" : undefined}>{match[1]}</span>
        <span className="font-sans text-xs font-medium text-slate-500 dark:text-slate-400">
          {match[2]}
        </span>
      </span>
    );
  }

  const lines = value.split("\n");
  if (lines.length > 1) {
    return (
      <span
        className={`${
          align === "right" ? "ml-auto flex w-full flex-col items-end text-right" : "flex flex-col"
        } gap-0.5 font-sans text-sm font-medium leading-snug ${tone} ${emphasis ? "font-bold" : ""}`}
      >
        {lines.map((line, index) => (
          <span
            key={`${index}-${line.slice(0, 12)}`}
            className={index === 0 ? "whitespace-nowrap" : undefined}
          >
            {line}
          </span>
        ))}
      </span>
    );
  }

  const keepNpsPhrase = value.includes("(NPS");

  return (
    <span
      className={`${
        align === "right" ? "ml-auto block w-full text-right" : ""
      } font-sans text-sm font-medium leading-snug ${
        keepNpsPhrase ? "whitespace-nowrap" : ""
      } ${tone} ${emphasis ? "font-bold" : ""}`}
    >
      {value}
    </span>
  );
}

function CompactResultTable({ rows }: { rows: ResultRow[] }) {
  return (
    <table className="w-full min-w-0 border-collapse rounded-md border border-slate-200 text-sm dark:border-spec-border">
      <tbody>
        {rows.map((row, index) => (
          <tr
            key={row.label}
            className={
              row.emphasis
                ? "bg-blue-50/70 dark:bg-blue-950/30"
                : index % 2 === 1
                  ? "bg-slate-50/60 dark:bg-spec-panel/30"
                  : "bg-white dark:bg-spec-bg"
            }
          >
            <td
              className={`w-[52%] border-b border-slate-100 px-2.5 py-1.5 text-left dark:border-spec-border/60 ${
                row.emphasis
                  ? "font-semibold text-blue-950 dark:text-blue-100"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {row.label}
            </td>
            <td
              className={`border-b border-slate-100 px-2.5 py-1.5 text-right font-mono text-sm font-semibold tabular-nums dark:border-spec-border/60 ${
                row.warn ? "text-spec-danger" : ""
              }`}
            >
              <div className="flex w-full justify-end">
                <ValueCell value={row.value} emphasis={row.emphasis} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function YieldStatusBadge({
  invalid,
  capped,
}: {
  invalid: boolean;
  capped: boolean;
}) {
  if (invalid) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
        Enter a positive design pressure to compute Pt
      </div>
    );
  }
  if (capped) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
        ⚠ St/S capped at {STRESS_RATIO_MAX} — verify yield at test temperature
      </div>
    );
  }
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-100">
      ✅ Safe: Within Yield Limit (Cap {STRESS_RATIO_MAX})
    </div>
  );
}

function HydroResultTabs({
  output,
  exportTitle,
  standard,
  inputRows,
  inputs,
  capped,
  invalid,
}: {
  output: CalculatorOutput;
  exportTitle: string;
  standard?: string;
  inputRows: { label: string; value: string }[];
  inputs: HydroTestInputs;
  capped: boolean;
  invalid: boolean;
}) {
  const [tab, setTab] = useState<ResultTabId>("summary");
  const copyContext = [standard, output.heroStatus].filter(Boolean).join(" · ");
  const safetyNotes =
    output.callouts?.find((c) => c.title === "Safety notes")?.items ?? [];
  const yieldBody =
    output.callouts?.find((c) => c.title === "Yield limit")?.body ??
    "Pt shall not produce stress above yield at test temperature (ASME B31.3 para. 345.4.2).";

  const panels: { id: ResultTabId; node: ReactNode }[] = [
    {
      id: "summary",
      node: (
        <div className="space-y-2.5">
          <div
            id="calc-result-hero"
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
            <div className="font-mono text-2xl font-extrabold leading-tight tracking-tight text-blue-800 dark:text-blue-200 md:text-3xl">
              <ValueCell value={output.heroValue} emphasis align="left" />
            </div>
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
              {output.heroStatus}
            </p>
          </div>
          <CompactResultTable rows={output.rows} />
          <YieldStatusBadge invalid={invalid} capped={capped} />
        </div>
      ),
    },
    {
      id: "safety",
      node: (
        <div className="space-y-2.5">
          <aside className="rounded-lg border border-l-4 border-amber-200 border-l-amber-500 bg-amber-50 px-3.5 py-2.5 text-amber-950 dark:border-amber-500/40 dark:border-l-amber-400 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="text-sm font-semibold">Yield limit</p>
            <p className="mt-1 text-sm leading-relaxed opacity-90">{yieldBody}</p>
          </aside>
          <aside className="rounded-lg border border-l-4 border-blue-200 border-l-blue-500 bg-blue-50 px-3.5 py-2.5 text-blue-950 dark:border-blue-500/40 dark:border-l-blue-400 dark:bg-blue-950/30 dark:text-blue-100">
            <p className="text-sm font-semibold">Safety notes</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm leading-relaxed opacity-90">
              {safetyNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </aside>
          <aside className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-spec-border dark:bg-spec-bg">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              ASME B31.3 para. 345.4.2
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {FORMULA_HINT} Field screening cap St/S ≤ {STRESS_RATIO_MAX}. Confirm
              hoop stress stays below yield at the test temperature before
              pressurization.
            </p>
          </aside>
        </div>
      ),
    },
    {
      id: "chart",
      node: (
        <div className="-mx-0.5">
          <HydroStressChart inputs={inputs} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2">
      <div
        role="tablist"
        aria-label="Hydro test result views"
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
              id={`hydro-result-tab-${item.id}`}
              aria-controls={`hydro-result-panel-${item.id}`}
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

      <div className="relative min-h-[18rem] flex-1">
        {panels.map((panel) => {
          const active = tab === panel.id;
          return (
            <div
              key={panel.id}
              role="tabpanel"
              id={`hydro-result-panel-${panel.id}`}
              aria-labelledby={`hydro-result-tab-${panel.id}`}
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

export default function HydroTestCalculator({
  title,
  standard,
}: HydroTestCalculatorProps) {
  const { inputs, setField, setInputs } = useCalculatorUrlSync<HydroTestInputs>(
    DEFAULT_HYDRO_TEST_INPUTS,
    HYDRO_TEST_URL_CONFIG,
    { type: "hydro-test" },
  );

  const output = useMemo(() => calculateHydroTest(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const pressureUnit = inputs.unitSystem === "metric" ? "MPa" : "psi";
  const stressUnit = inputs.unitSystem === "metric" ? "MPa" : "psi";
  const rawRatio = Number.isFinite(inputs.stressRatio)
    ? inputs.stressRatio
    : 1;
  const capped = rawRatio > STRESS_RATIO_MAX;
  const invalid = output.heroValue === "—";

  const inputRows = [
    {
      label: "Test fluid",
      value: inputs.testFluid === "hydrostatic" ? "Hydrostatic" : "Pneumatic",
    },
    { label: "Design pressure", value: `${inputs.designPressure} ${pressureUnit}` },
    {
      label: "Stress ratio St/S",
      value: clampStressRatio(inputs.stressRatio).toFixed(3),
    },
    {
      label: "NPS",
      value:
        HYDRO_NPS_OPTIONS.find((opt) => opt.value === inputs.nps)?.label ??
        `${inputs.nps}"`,
    },
  ];

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      resultPanel={
        <HydroResultTabs
          output={output}
          exportTitle={title}
          standard={standard}
          inputRows={inputRows}
          inputs={inputs}
          capped={capped}
          invalid={invalid}
        />
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3 [&_.calc-field]:mb-0">
          <SectionBlock number={1} title="Test Conditions" compact twoColumn={false}>
            <FieldSelect
              label="Test fluid type"
              value={inputs.testFluid}
              onChange={(value) => setField("testFluid", value as TestFluid)}
            >
              <option value="hydrostatic">Hydrostatic</option>
              <option value="pneumatic">Pneumatic</option>
            </FieldSelect>

            <FieldGroup
              label="Design pressure (P)"
              value={inputs.designPressure}
              onChange={(value) =>
                setField("designPressure", toNumber(value, inputs.designPressure))
              }
              unit={pressureUnit}
              hint="Enter gauge design pressure. Units follow the metric / imperial toggle."
            />

            <FieldSelect
              label="Nominal pipe size (NPS)"
              labelNote="(holding time guide)"
              value={inputs.nps}
              onChange={(value) => setField("nps", value)}
            >
              {HYDRO_NPS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </FieldSelect>
          </SectionBlock>

          <SectionBlock
            number={2}
            title="ASME B31.3 St/S stress ratio & yield limit check"
            compact
            twoColumn={false}
            headerExtra={<FormulaInfoButton text={FORMULA_HINT} />}
          >
            <FieldGroup
              label="Stress Ratio (St/S)"
              value={inputs.stressRatio}
              onChange={(value) =>
                setField("stressRatio", toNumber(value, inputs.stressRatio))
              }
              hint={undefined}
              error={
                Number.isFinite(inputs.stressRatio) &&
                inputs.stressRatio > STRESS_RATIO_MAX
                  ? `Maximum guide limit is ${STRESS_RATIO_MAX}. Calculation uses ${STRESS_RATIO_MAX}.`
                  : undefined
              }
            />
            <FieldGroup
              label="Allowable stress at design temp (S)"
              value={inputs.designStress}
              onChange={(value) => {
                const designStress = toNumber(value, inputs.designStress);
                const nextRatio =
                  designStress > 0
                    ? clampStressRatio(inputs.testStress / designStress)
                    : inputs.stressRatio;
                setInputs((current) => ({
                  ...current,
                  designStress,
                  stressRatio: nextRatio,
                  applyTempCorrection: true,
                }));
              }}
              unit={stressUnit}
            />
            <FieldGroup
              label="Allowable stress at test temp (St)"
              value={inputs.testStress}
              onChange={(value) => {
                const testStress = toNumber(value, inputs.testStress);
                const nextRatio =
                  inputs.designStress > 0
                    ? clampStressRatio(testStress / inputs.designStress)
                    : inputs.stressRatio;
                setInputs((current) => ({
                  ...current,
                  testStress,
                  stressRatio: nextRatio,
                  applyTempCorrection: true,
                }));
              }}
              unit={stressUnit}
            />
          </SectionBlock>
        </div>
      }
    />
  );
}
