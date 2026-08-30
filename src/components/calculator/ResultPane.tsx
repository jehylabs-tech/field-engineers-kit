"use client";

import CalculatorResultNotice from "@/components/calculator/CalculatorResultNotice";
import CopyValueButton from "@/components/calculator/CopyValueButton";
import DiagramDrawer, {
  ViewDiagramButton,
} from "@/components/calculator/DiagramDrawer";
import { useCalculatorMeta } from "@/components/calculator/CalculatorMetaContext";
import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
} from "@/lib/calculators/definitions";
import ExportButtons from "@/components/calculator/ExportButtons";
import ThicknessGaugeBar from "@/components/calculator/ThicknessGaugeBar";
import {
  schematicKeyFromLabel,
  useSchematicHighlight,
} from "@/components/calculator/schematics/SchematicHighlight";
import { useState, type ReactNode } from "react";
import type { WorkstationLayout } from "@/lib/calculators/workstation-layout";
import { formatCodeStandard } from "@/lib/calculators/format-standard";

/** Split "12.50 MPa" into number + unit with gap; always flush-right in the value column. */
function ResultValueCell({
  value,
  warn,
  emphasis,
}: {
  value: string;
  warn?: boolean;
  emphasis?: boolean;
}) {
  const match = value.match(/^(-?[\d.,]+)\s+(.+)$/);
  const tone = warn
    ? "text-spec-danger"
    : emphasis
      ? "text-blue-700 dark:text-blue-300"
      : "text-slate-900 dark:text-slate-100";

  if (match) {
    return (
      <span
        className={`ml-auto flex w-full items-center justify-end gap-1 text-right ${tone}`}
      >
        <span className={emphasis ? "font-bold" : undefined}>{match[1]}</span>
        <span
          className={`font-sans text-xs font-medium ${
            emphasis
              ? "text-blue-600/80 dark:text-blue-300/80"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {match[2]}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`ml-auto block w-full text-right ${tone} ${emphasis ? "font-bold" : ""}`}
    >
      {value}
    </span>
  );
}

function ResultCallouts({ callouts }: { callouts: ResultCallout[] }) {
  if (callouts.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {callouts.map((callout) => {
        const isWarn = callout.tone === "warn";
        return (
          <aside
            key={callout.title}
            className={`rounded-lg border border-l-4 px-3.5 py-2.5 ${
              isWarn
                ? "border-amber-200 border-l-amber-500 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:border-l-amber-400 dark:bg-amber-950/30 dark:text-amber-100"
                : "border-blue-200 border-l-blue-500 bg-blue-50 text-blue-950 dark:border-blue-500/40 dark:border-l-blue-400 dark:bg-blue-950/30 dark:text-blue-100"
            }`}
          >
            <p className="text-sm font-semibold leading-snug">{callout.title}</p>
            <p className="mt-1 text-sm leading-relaxed opacity-90">{callout.body}</p>
            {callout.items && callout.items.length > 0 ? (
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm leading-relaxed opacity-90">
                {callout.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </aside>
        );
      })}
    </div>
  );
}

type ResultPaneProps = {
  output: CalculatorOutput;
  exportTitle: string;
  standard?: string;
  inputRows: { label: string; value: string }[];
  visual?: ReactNode;
  compact?: boolean;
  layout?: WorkstationLayout;
  wideResult?: boolean;
  /** Split result tables: dimensions left; bolt + procurement right. */
  resultDashboard?: boolean;
  /** When true, diagram renders inline; when false+visual, use drawer toggle. */
  embedDiagram?: boolean;
  /** Place View CAD Diagram on this result section header instead of the hero. */
  diagramSection?: string;
  diagramVariant?: "drawer" | "modal";
};

const statusColor: Record<StatusLevel, string> = {
  pass: "text-spec-success",
  fail: "text-spec-danger",
  warn: "text-spec-sponText",
  neutral: "text-spec-text2",
};

const statusDot: Record<StatusLevel, string> = {
  pass: "bg-spec-success",
  fail: "bg-spec-danger",
  warn: "bg-spec-sponText",
  neutral: "bg-spec-text3",
};

const gaugeFill: Record<StatusLevel, string> = {
  pass: "bg-spec-success",
  fail: "bg-spec-danger",
  warn: "bg-spec-sponText",
  neutral: "bg-spec-accent",
};

function groupRows(rows: ResultRow[]) {
  const groups: { section: string | null; rows: ResultRow[] }[] = [];
  for (const row of rows) {
    const section = row.section ?? null;
    const last = groups[groups.length - 1];
    if (!last || last.section !== section) {
      groups.push({ section, rows: [row] });
    } else {
      last.rows.push(row);
    }
  }
  return groups;
}

/** Compact 2-column parameter cards for screening calculators. */
function ParamPairGrid({
  rows,
  fill = "columns",
}: {
  rows: ResultRow[];
  /** columns = left/right stacks; rows = left-right pairing per row */
  fill?: "columns" | "rows";
}) {
  function renderCard(row: ResultRow) {
    const highlight =
      /total expansion|total Δp|velocity v|^status$/i.test(row.label) ||
      /^total Δp\b/i.test(row.label);
    return (
      <div
        key={row.label}
        className={`min-w-0 rounded-lg border px-3 py-2 dark:bg-spec-bg ${
          highlight
            ? "border-blue-300 bg-blue-50/70 dark:border-blue-500/50 dark:bg-blue-950/30"
            : "border-slate-200 bg-white dark:border-spec-border"
        }`}
      >
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {row.label}
        </div>
        <div
          className={`mt-0.5 font-mono text-sm tabular-nums ${
            highlight
              ? "font-bold text-blue-800 dark:text-blue-200"
              : "font-semibold text-slate-900 dark:text-slate-100"
          }`}
        >
          {row.value}
        </div>
      </div>
    );
  }

  if (fill === "rows") {
    return (
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {rows.map(renderCard)}
      </div>
    );
  }

  const left = rows.slice(0, Math.ceil(rows.length / 2));
  const right = rows.slice(Math.ceil(rows.length / 2));

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-2.5">{left.map(renderCard)}</div>
      <div className="flex min-w-0 flex-col gap-2.5">{right.map(renderCard)}</div>
    </div>
  );
}

function DataSheetTable({
  section,
  rows,
  interactive,
  compact = false,
  diagramSection,
  onOpenDiagram,
  dashboardCompact = false,
}: {
  section: string | null;
  rows: ResultRow[];
  interactive: boolean;
  compact?: boolean;
  diagramSection?: string;
  onOpenDiagram?: () => void;
  dashboardCompact?: boolean;
}) {
  const schematic = useSchematicHighlight();
  const cellPad = dashboardCompact
    ? "px-3 py-1.5"
    : compact
      ? "px-2.5 py-1"
      : "px-4 py-3";
  const cellText = dashboardCompact || compact ? "text-sm" : "text-base";
  const showDiagramBtn =
    Boolean(section) &&
    Boolean(diagramSection) &&
    section === diagramSection &&
    onOpenDiagram;

  return (
    <table className="w-full min-w-0 table-fixed border-collapse rounded-sm border border-slate-200 text-base dark:border-spec-border">
      {section ? (
        <thead>
          <tr className="border-b border-slate-200 dark:border-spec-border">
            <th
              colSpan={2}
              className={`${cellPad} bg-slate-100/80 text-left ${cellText} font-bold text-slate-700 dark:bg-spec-panel dark:text-slate-300`}
            >
              <div className="flex items-center justify-between gap-2">
                <span>{section}</span>
                {showDiagramBtn ? (
                  <ViewDiagramButton onClick={onOpenDiagram!} compact />
                ) : null}
              </div>
            </th>
          </tr>
        </thead>
      ) : null}
      <tbody>
        {rows.map((row, index) => {
          const dimKey = schematicKeyFromLabel(row.label, row.highlight);
          const zebra = index % 2 === 1;
          return (
            <tr
              key={row.label}
              tabIndex={interactive && dimKey ? 0 : undefined}
              onMouseEnter={() => {
                if (interactive && dimKey) schematic?.setActive(dimKey);
              }}
              onMouseLeave={() => {
                if (interactive && dimKey) schematic?.setActive(null);
              }}
              onFocus={() => {
                if (interactive && dimKey) schematic?.setActive(dimKey);
              }}
              onBlur={() => {
                if (interactive && dimKey) schematic?.setActive(null);
              }}
              className={`border-b border-slate-100 last:border-b-0 outline-none dark:border-spec-border/60 ${
                row.emphasis
                  ? "bg-blue-50/70 dark:bg-blue-950/30"
                  : zebra
                    ? "bg-slate-50/60 dark:bg-spec-panel/30"
                    : "bg-white dark:bg-spec-bg"
              } ${
                interactive && dimKey
                  ? "cursor-pointer hover:bg-spec-accentBg/40 focus:bg-spec-accentBg/40"
                  : ""
              }`}
            >
              <td
                className={`w-[55%] max-w-[55%] ${cellPad} align-middle text-left ${cellText} leading-snug ${
                  row.emphasis
                    ? "font-semibold text-blue-950 dark:text-blue-100"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {row.label}
              </td>
              <td
                className={`${cellPad} text-right align-middle font-mono ${cellText} font-semibold tabular-nums leading-snug`}
              >
                <div className="flex w-full justify-end text-right">
                  <ResultValueCell
                    value={row.value}
                    warn={row.warn}
                    emphasis={row.emphasis}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ResultPane({
  output,
  exportTitle,
  standard,
  inputRows,
  visual,
  compact = false,
  layout = "formula",
  wideResult = false,
  resultDashboard = false,
  embedDiagram = false,
  diagramSection,
  diagramVariant = "drawer",
}: ResultPaneProps) {
  const meta = useCalculatorMeta();
  const [diagramOpen, setDiagramOpen] = useState(false);
  const basisStandard = formatCodeStandard(standard ?? meta.standard);
  const formulaBasis = meta.formulaBasis;
  const basisLine = [basisStandard, formulaBasis].filter(Boolean).join(" — ");
  const copyContext = [basisStandard, output.heroStatus]
    .filter(Boolean)
    .join(" · ");
  const groups = groupRows(output.rows);
  const useDrawer = Boolean(visual) && !embedDiagram;
  const heroDiagramBtn = useDrawer && !diagramSection;
  const compactTables = layout === "lookup" || wideResult || resultDashboard;
  const weightHero = meta.type === "flange-dimension";
  const isFittingValve = meta.type === "fitting-valve-dimension";
  const isButtWeldFitting = meta.type === "butt-weld-fitting";
  const isHydro = meta.type === "hydro-test";
  const isGasket = meta.type === "gasket-dimension";
  const isThermal = meta.type === "thermal-expansion";
  const isPressureDrop = meta.type === "pressure-drop";
  const isFlowVelocity = meta.type === "flow-velocity";
  const isBlind = meta.type === "blind-flange";
  const useParamGrid =
    isThermal || isPressureDrop || isFlowVelocity || isGasket;
  const panePad = "";
  const heroPad = resultDashboard || useParamGrid
    ? "px-3 py-2.5"
    : wideResult
      ? "p-4"
      : compact
        ? "px-3 py-2"
        : "p-5";
  const cardMax = "calc-result-card";
  const heroAccent = weightHero || isHydro || isFittingValve || isButtWeldFitting;

  function copyText(value: string, itemLabel?: string) {
    const suffix = itemLabel
      ? `${itemLabel} · ${copyContext || exportTitle}`
      : copyContext || exportTitle;
    return suffix ? `${value} (${suffix})` : value;
  }

  const hero = (
    <div
      id="calc-result-hero"
      className={`scroll-mt-20 rounded border border-spec-border ${heroPad} ${
        heroAccent
          ? "border-l-4 border-l-blue-600 bg-blue-50/50 dark:border-l-blue-500 dark:bg-blue-950/20"
          : "bg-spec-panel"
      }`}
    >
      <div className={`flex flex-wrap items-center justify-between gap-2 ${resultDashboard || wideResult ? "mb-1.5" : "mb-3"}`}>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {output.heroLabel}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {heroDiagramBtn ? (
            <ViewDiagramButton onClick={() => setDiagramOpen(true)} />
          ) : null}
          <ExportButtons
            variant="inline"
            title={exportTitle}
            standard={standard ?? basisStandard}
            inputRows={inputRows}
            resultRows={output.exportRows}
          />
          <CopyValueButton
            text={copyText(output.heroValue, output.heroLabel)}
            ariaLabel="Copy result"
          />
        </div>
      </div>
      <div
        className={`font-mono leading-snug tracking-tight ${
          heroAccent
            ? resultDashboard
              ? "text-2xl font-extrabold text-blue-800 dark:text-blue-200"
              : "text-3xl font-extrabold text-blue-800 dark:text-blue-200"
            : isGasket
              ? "break-words text-xl font-bold text-slate-900 dark:text-slate-50 md:text-2xl"
              : "text-3xl font-bold text-slate-900 dark:text-slate-50"
        }`}
      >
        {isHydro ? (
          <ResultValueCell value={output.heroValue} emphasis />
        ) : (
          output.heroValue
        )}
      </div>
      <div
        className={`mt-1.5 inline-flex items-center gap-1.5 text-sm ${statusColor[output.heroStatusLevel]}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${statusDot[output.heroStatusLevel]}`}
        />
        {output.heroStatus}
      </div>
      {!compact && basisLine ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{basisLine}</p>
      ) : null}
      {compact && useParamGrid && basisStandard ? (
        <p className="mt-1.5 truncate text-xs text-slate-500">{basisStandard}</p>
      ) : null}
      {output.gauge?.variant === "thickness-margin" ? (
        <ThicknessGaugeBar
          tMin={output.gauge.tMin ?? 0}
          tActual={output.gauge.tActual ?? 0}
          unit={output.gauge.unit ?? "mm"}
          caption={output.gauge.caption}
        />
      ) : output.gauge ? (
        <div className="mt-3">
          <div className="relative h-1.5 rounded bg-spec-border">
            <div
              className={`absolute left-0 top-0 h-full rounded ${gaugeFill[output.heroStatusLevel]}`}
              style={{ width: `${output.gauge.fillPercent}%` }}
            />
            <div
              className="absolute top-[-2px] h-2.5 w-0.5 bg-spec-text"
              style={{ left: `${output.gauge.limitPercent}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );

  const tables = (() => {
    const tableProps = {
      interactive: Boolean(visual) || layout === "lookup",
      compact: compactTables,
      dashboardCompact: resultDashboard,
      diagramSection,
      onOpenDiagram: useDrawer ? () => setDiagramOpen(true) : undefined,
    };

    const renderGroup = (group: (typeof groups)[number], i: number) => (
      <DataSheetTable
        key={group.section ?? `group-${i}`}
        section={group.section}
        rows={group.rows}
        {...tableProps}
      />
    );

    if (isGasket) {
      const selection = groups.find((g) => g.section === "Selection");
      const dimRows = groups
        .filter((g) => g.section && g.section !== "Selection")
        .flatMap((g) => g.rows);
      return (
        <div className="space-y-2.5">
          {selection ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 sm:grid-cols-3 lg:grid-cols-5 dark:border-spec-border dark:bg-spec-bg/60">
              {selection.rows.map((row) => (
                <div key={row.label} className="min-w-0">
                  <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                    {row.label}
                  </div>
                  <div className="truncate font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {dimRows.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {groups.find((g) => g.section && g.section !== "Selection")
                  ?.section ?? "Dimensions"}
              </div>
              <ParamPairGrid rows={dimRows} fill="rows" />
            </div>
          ) : null}
        </div>
      );
    }

    if (isThermal) {
      return <ParamPairGrid rows={output.rows} fill="columns" />;
    }

    if (isPressureDrop || isFlowVelocity) {
      return <ParamPairGrid rows={output.rows} fill="rows" />;
    }

    if (resultDashboard) {
      const dimSection = "Flange dimensions";
      const rightSections = new Set([
        "Field bolt & tool specs",
        "Procurement & rigging weight",
      ]);
      const leftGroups = groups.filter((g) => g.section === dimSection);
      const rightGroups = groups.filter((g) =>
        rightSections.has(g.section ?? ""),
      );
      const otherGroups = groups.filter(
        (g) =>
          g.section !== dimSection && !rightSections.has(g.section ?? ""),
      );

      return (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:items-start">
            <div className="min-w-0 space-y-2.5">
              {leftGroups.map(renderGroup)}
            </div>
            <div className="min-w-0 space-y-2.5">
              {rightGroups.map(renderGroup)}
            </div>
          </div>
          {otherGroups.length > 0 ? (
            <div className="space-y-2.5">{otherGroups.map(renderGroup)}</div>
          ) : null}
        </div>
      );
    }

    return (
      <div className={compactTables ? "space-y-3" : "space-y-4"}>
        {groups.map(renderGroup)}
      </div>
    );
  })();

  const callouts =
    output.callouts && output.callouts.length > 0 ? (
      <ResultCallouts callouts={output.callouts} />
    ) : null;

  if (!compact) {
    return (
      <div className={`relative flex w-full flex-col space-y-4 p-5 ${cardMax}`}>
        {hero}
        {tables}
        {callouts}
        {embedDiagram && visual ? (
          <div className="rounded border border-dashed border-spec-border p-3">
            {visual}
          </div>
        ) : null}
        {useDrawer ? (
          <DiagramDrawer
            open={diagramOpen}
            onClose={() => setDiagramOpen(false)}
            title="CAD Diagram"
          >
            {visual}
          </DiagramDrawer>
        ) : null}
        <ExportButtons
          title={exportTitle}
          standard={standard ?? basisStandard}
          inputRows={inputRows}
          resultRows={output.exportRows}
        />
        <CalculatorResultNotice className="mt-2" />
      </div>
    );
  }

  return (
    <div
      className={`relative flex w-full min-w-0 max-w-full flex-col ${
        resultDashboard ? "space-y-2.5" : compact ? "space-y-2" : "space-y-3"
      } ${panePad} ${cardMax}`}
    >
      {hero}
      {tables}
      {callouts}
      {embedDiagram && visual ? (
        <div className="rounded border border-dashed border-spec-border p-3 [&_svg]:mx-auto [&_svg]:w-full">
          {visual}
        </div>
      ) : null}
      {useDrawer ? (
        <DiagramDrawer
          open={diagramOpen}
          onClose={() => setDiagramOpen(false)}
          title="CAD Diagram"
          variant={diagramVariant}
        >
          {visual}
        </DiagramDrawer>
      ) : null}
    </div>
  );
}
