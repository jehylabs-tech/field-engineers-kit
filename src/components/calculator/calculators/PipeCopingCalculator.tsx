"use client";

import { useEffect, useMemo, useRef } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import ExportButtons from "@/components/calculator/ExportButtons";
import FieldGroup, {
  FieldSelect,
  fieldLabelHint,
} from "@/components/calculator/FieldGroup";
import { RESULT_HERO_ID } from "@/components/calculator/SummaryBar";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import { useToast } from "@/components/ui/ToastProvider";
import {
  calculatePipeCoping,
  computePipeCopingOrdinates,
  isBranchNpsValid,
  listPipeCopingNpsOptions,
  maxOffsetAllowed,
  PIPE_COPING_CUT_OPTIONS,
  PIPE_COPING_POINT_OPTIONS,
  resolveCopingSchedule,
  type PipeCopingCutType,
  type PipeCopingInputs,
  type PipeCopingPoints,
} from "@/lib/calculators/engines/pipe-coping";
import { listScheduleOptionsForNps } from "@/lib/data/loaders";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import {
  DEFAULT_PIPE_COPING_INPUTS,
  PIPE_COPING_URL_CONFIG,
} from "@/lib/calculators/url-configs/pipe-coping";

type PipeCopingCalculatorProps = {
  title: string;
  standard?: string;
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function CopingPatternSvg({
  points,
  unit,
}: {
  points: { phiDeg: number; s: number; zRel: number; isQuadrant: boolean }[];
  unit: string;
}) {
  if (points.length === 0) return null;
  const padX = 48;
  const padY = 28;
  const W = 800;
  const H = 250;
  const sMax = Math.max(...points.map((p) => p.s), 1e-9);
  const zMax = Math.max(...points.map((p) => p.zRel), 1e-9);
  const plotW = W - padX * 2;
  const plotH = H - padY * 2;

  const coords = points.map((p) => {
    const x = padX + (p.s / sMax) * plotW;
    const y = padY + plotH - (p.zRel / zMax) * plotH;
    return { ...p, x, y };
  });
  // Close template wrap for a continuous shop curve feel
  const closed = [...coords, { ...coords[0], x: padX + plotW, y: coords[0].y }];
  const d = closed
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full rounded-md border border-slate-200 bg-white dark:border-spec-border dark:bg-spec-bg"
      role="img"
      aria-label="Unwrapped branch cut flat pattern"
    >
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={`h-${f}`}
          x1={padX}
          x2={W - padX}
          y1={padY + plotH * (1 - f)}
          y2={padY + plotH * (1 - f)}
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth={1}
        />
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={`v-${f}`}
          x1={padX + plotW * f}
          x2={padX + plotW * f}
          y1={padY}
          y2={H - padY}
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth={1}
        />
      ))}
      <path
        d={d}
        fill="none"
        className="stroke-blue-600 dark:stroke-blue-400"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {coords.map((c) => (
        <g key={`pt-${c.phiDeg}`}>
          <circle
            cx={c.x}
            cy={c.y}
            r={c.isQuadrant ? 4.5 : 2.5}
            className={
              c.isQuadrant
                ? "fill-amber-500 dark:fill-amber-400"
                : "fill-blue-700 dark:fill-blue-300"
            }
          />
          {c.isQuadrant ? (
            <text
              x={c.x}
              y={Math.max(12, c.y - 10)}
              textAnchor="middle"
              className="fill-slate-700 text-[10px] font-semibold dark:fill-slate-200"
            >
              {Math.round(c.phiDeg)}°
            </text>
          ) : null}
        </g>
      ))}
      <text
        x={padX}
        y={H - 8}
        className="fill-slate-500 text-[11px] dark:fill-slate-400"
      >
        S → (unwrapped) · {unit}
      </text>
      <text
        x={12}
        y={padY + 8}
        className="fill-slate-500 text-[11px] dark:fill-slate-400"
        transform={`rotate(-90 12 ${padY + 40})`}
      >
        z_rel
      </text>
    </svg>
  );
}

export default function PipeCopingCalculator({
  title,
  standard,
}: PipeCopingCalculatorProps) {
  const { inputs, setField, setInputs } = useCalculatorUrlSync<PipeCopingInputs>(
    DEFAULT_PIPE_COPING_INPUTS,
    PIPE_COPING_URL_CONFIG,
    { type: "pipe-coping" },
  );
  const { showToast } = useToast();
  const branchWarnRef = useRef<string>("");

  const npsOptions = useMemo(() => listPipeCopingNpsOptions(), []);
  const headerSchOptions = useMemo(
    () => listScheduleOptionsForNps(inputs.headerNps),
    [inputs.headerNps],
  );
  const branchSchOptions = useMemo(
    () => listScheduleOptionsForNps(inputs.branchNps),
    [inputs.branchNps],
  );

  useEffect(() => {
    const resolved = resolveCopingSchedule(
      inputs.headerNps,
      inputs.headerSchedule,
    );
    if (resolved && resolved !== inputs.headerSchedule) {
      setField("headerSchedule", resolved);
    }
  }, [inputs.headerNps, inputs.headerSchedule, setField]);

  useEffect(() => {
    const resolved = resolveCopingSchedule(
      inputs.branchNps,
      inputs.branchSchedule,
    );
    if (resolved && resolved !== inputs.branchSchedule) {
      setField("branchSchedule", resolved);
    }
  }, [inputs.branchNps, inputs.branchSchedule, setField]);

  useEffect(() => {
    if (isBranchNpsValid(inputs.headerNps, inputs.branchNps)) {
      branchWarnRef.current = "";
      return;
    }
    // Auto-heal invalid state (e.g. plant-context / stale URL) by clamping.
    const key = `${inputs.branchNps}>${inputs.headerNps}`;
    if (branchWarnRef.current === key) return;
    branchWarnRef.current = key;
    showToast("Branch NPS must be ≤ Header NPS — clamped to header size.");
    setInputs((current) => ({
      ...current,
      branchNps: current.headerNps,
      branchSchedule: resolveCopingSchedule(
        current.headerNps,
        current.branchSchedule,
      ),
    }));
  }, [inputs.branchNps, inputs.headerNps, setInputs, showToast]);

  const geom = useMemo(() => computePipeCopingOrdinates(inputs), [inputs]);
  const output = useMemo(() => calculatePipeCoping(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const lenUnit = inputs.unitSystem === "imperial" ? "in" : "mm";
  const eMax = geom ? maxOffsetAllowed(geom.dims) : 0;

  const inputRows = [
    {
      label: "Header",
      value: `NPS ${inputs.headerNps}" Sch ${inputs.headerSchedule}`,
    },
    {
      label: "Branch",
      value: `NPS ${inputs.branchNps}" Sch ${inputs.branchSchedule}`,
    },
    { label: "Angle θ", value: `${inputs.angleDeg}°` },
    { label: "Offset e", value: `${inputs.offset} ${lenUnit}` },
    { label: "Cut type", value: inputs.cutType },
    { label: "Points", value: String(inputs.points) },
  ];

  async function copyOrdinateTable() {
    if (!geom) return;
    const header = ["Point #", "Angle φ (°)", `S (${lenUnit})`, `z_rel (${lenUnit})`, `z_cut (${lenUnit})`];
    const lines = [
      header.join("\t"),
      ...geom.points.map((p) =>
        [
          p.index,
          p.phiDeg.toFixed(2),
          p.s.toFixed(4),
          p.zRel.toFixed(4),
          p.zCut.toFixed(4),
        ].join("\t"),
      ),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    showToast("Ordinate table copied to clipboard");
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
                {output.heroLabel}
              </span>
              <ExportButtons
                variant="inline"
                title={title}
                standard={standard}
                inputRows={inputRows}
                resultRows={output.exportRows}
              />
            </div>
            <p className="font-mono text-2xl font-extrabold tabular-nums text-blue-800 dark:text-blue-200 md:text-3xl">
              {output.heroValue}
            </p>
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
                    <span className="font-semibold tabular-nums">
                      {badge.value}
                    </span>
                  </span>
                ))}
              </div>
            ) : null}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {output.heroStatus}
            </p>
          </div>

          {geom && geom.valid && geom.points.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Flat pattern (unwrapped cut line)
              </h3>
              <CopingPatternSvg points={geom.points} unit={lenUnit} />
            </div>
          ) : null}

          {geom && geom.valid && geom.points.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Layout marking table ({geom.points.length} points)
                </h3>
                <button
                  type="button"
                  onClick={() => void copyOrdinateTable()}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-spec-border dark:bg-spec-bg dark:text-spec-text"
                >
                  Copy ordinate table
                </button>
              </div>
              <div className="max-h-72 overflow-auto rounded-md border border-slate-200 dark:border-spec-border">
                <table className="w-full min-w-[28rem] border-collapse text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-left text-xs font-semibold text-slate-700 dark:bg-spec-bg dark:text-slate-300">
                    <tr>
                      <th className="px-2 py-1.5">#</th>
                      <th className="px-2 py-1.5">φ (°)</th>
                      <th className="px-2 py-1.5">S ({lenUnit})</th>
                      <th className="px-2 py-1.5">z_rel ({lenUnit})</th>
                      <th className="px-2 py-1.5">z_cut ({lenUnit})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geom.points.map((p) => (
                      <tr
                        key={p.index}
                        className={`border-t border-slate-100 dark:border-spec-border/60 ${
                          p.isQuadrant
                            ? "bg-amber-50/80 dark:bg-amber-950/25"
                            : "bg-white dark:bg-spec-panel"
                        }`}
                      >
                        <td className="px-2 py-1 font-mono tabular-nums">
                          {p.index}
                        </td>
                        <td className="px-2 py-1 font-mono tabular-nums">
                          {p.phiDeg.toFixed(1)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1 font-mono tabular-nums">
                          {p.s.toFixed(3)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1 font-mono tabular-nums">
                          {p.zRel.toFixed(3)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1 pr-3 font-mono tabular-nums">
                          {p.zCut.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {output.callouts?.map((callout) => (
            <blockquote
              key={callout.title}
              className="rounded-lg border border-l-4 border-blue-200 border-l-blue-500 bg-blue-50 px-3.5 py-2.5 text-sm text-blue-950 dark:border-blue-500/40 dark:border-l-blue-400 dark:bg-blue-950/30 dark:text-blue-100"
            >
              <p className="font-semibold">{callout.title}</p>
              <p className="mt-1 leading-relaxed opacity-90">{callout.body}</p>
            </blockquote>
          ))}
        </div>
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3 [&_.calc-field]:mb-0">
          <div className="w-full min-w-0 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Header pipe
            </h3>
            <FieldSelect
              label="Header NPS"
              value={inputs.headerNps}
              onChange={(value) => {
                setInputs((current) => {
                  const next = { ...current, headerNps: value };
                  if (!isBranchNpsValid(value, current.branchNps)) {
                    next.branchNps = value;
                  }
                  next.headerSchedule = resolveCopingSchedule(
                    value,
                    current.headerSchedule,
                  );
                  return next;
                });
              }}
              hint="ASME B36.10M / B36.19M header run (NPS ½–24)."
            >
              {npsOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </FieldSelect>
            <FieldSelect
              label="Header schedule"
              value={
                headerSchOptions.some((o) => o.value === inputs.headerSchedule)
                  ? inputs.headerSchedule
                  : (headerSchOptions[0]?.value ?? inputs.headerSchedule)
              }
              onChange={(value) => setField("headerSchedule", value)}
              hint={fieldLabelHint("Schedule")}
            >
              {headerSchOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </FieldSelect>
          </div>

          <div className="w-full min-w-0 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Branch pipe
            </h3>
            <FieldSelect
              label="Branch NPS"
              value={inputs.branchNps}
              onChange={(value) => {
                if (!isBranchNpsValid(inputs.headerNps, value)) {
                  showToast(
                    "Branch NPS must be ≤ Header NPS — clamped to header size.",
                  );
                  setInputs((current) => ({
                    ...current,
                    branchNps: current.headerNps,
                    branchSchedule: resolveCopingSchedule(
                      current.headerNps,
                      current.branchSchedule,
                    ),
                  }));
                  return;
                }
                setInputs((current) => ({
                  ...current,
                  branchNps: value,
                  branchSchedule: resolveCopingSchedule(
                    value,
                    current.branchSchedule,
                  ),
                }));
              }}
              hint="Must be ≤ header NPS. Larger selections are clamped."
            >
              {npsOptions
                .filter((opt) => isBranchNpsValid(inputs.headerNps, opt.value))
                .map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
            </FieldSelect>
            {!isBranchNpsValid(inputs.headerNps, inputs.branchNps) ? (
              <p className="text-xs font-semibold text-spec-danger">
                Branch NPS must be ≤ Header NPS. Choose a smaller branch (or
                larger header).
              </p>
            ) : null}
            <FieldSelect
              label="Branch schedule"
              value={
                branchSchOptions.some((o) => o.value === inputs.branchSchedule)
                  ? inputs.branchSchedule
                  : (branchSchOptions[0]?.value ?? inputs.branchSchedule)
              }
              onChange={(value) => setField("branchSchedule", value)}
              hint={fieldLabelHint("Schedule")}
            >
              {branchSchOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </FieldSelect>
          </div>

          <div className="w-full min-w-0 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Branch geometry
            </h3>
            <FieldGroup
              label="Intersection angle (θ)"
              value={String(inputs.angleDeg)}
              unit="deg"
              onChange={(raw) =>
                setField(
                  "angleDeg",
                  Math.min(90, Math.max(30, toNumber(raw, inputs.angleDeg))),
                )
              }
              hint="30°–90°. 90° = orthogonal tee."
            />
            <FieldGroup
              label="Branch offset / eccentricity (e)"
              value={String(inputs.offset)}
              unit={lenUnit}
              allowZero
              onChange={(raw) => {
                const next = Math.max(0, toNumber(raw, 0));
                setField("offset", eMax > 0 ? Math.min(next, eMax) : next);
              }}
              hint={`Concentric tee = 0. Max ≈ (OD_H − OD_B)/2 = ${eMax.toFixed(3)} ${lenUnit}.`}
            />
            <FieldSelect
              label="Cut type / joint fitting"
              value={inputs.cutType}
              options={PIPE_COPING_CUT_OPTIONS}
              onChange={(value) =>
                setField("cutType", value as PipeCopingCutType)
              }
            />
            <FieldSelect
              label="Layout ordinates resolution"
              value={String(inputs.points)}
              options={PIPE_COPING_POINT_OPTIONS}
              onChange={(value) =>
                setField("points", (value === "32" ? 32 : 16) as PipeCopingPoints)
              }
            />
          </div>
        </div>
      }
    />
  );
}
