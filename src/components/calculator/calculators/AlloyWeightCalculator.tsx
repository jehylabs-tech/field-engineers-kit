"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import ExportButtons from "@/components/calculator/ExportButtons";
import FieldGroup, {
  FieldSelect,
  FIELD_LABEL_CLASS,
  FIELD_SELECT_CLASS,
  fieldLabelHint,
} from "@/components/calculator/FieldGroup";
import { RESULT_HERO_ID } from "@/components/calculator/SummaryBar";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import type { ResultRow } from "@/lib/calculators/definitions";
import {
  ALLOY_GROUP_LABEL,
  ALLOY_MATERIALS,
  ALLOY_SHAPE_OPTIONS,
  calculateAlloyWeight,
  densityGPerCm3,
  filterAlloyMaterials,
  type AlloyMaterialGroup,
  type AlloyMaterialId,
  type AlloyShape,
  type AlloyWeightInputs,
} from "@/lib/calculators/engines/alloy-weight";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
  listAvailableNps,
  listScheduleOptionsForNps,
  resolveScheduleOptionValue,
} from "@/lib/data/loaders";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import {
  ALLOY_WEIGHT_URL_CONFIG,
  DEFAULT_ALLOY_WEIGHT_INPUTS,
} from "@/lib/calculators/url-configs/alloy-weight";

type AlloyWeightCalculatorProps = {
  title: string;
  standard?: string;
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function applyPipeDims(
  nps: string,
  schedule: string,
  unitSystem: AlloyWeightInputs["unitSystem"],
): { outerDiameter: number; thickness: number } | null {
  const entry = getPipeScheduleEntry(nps, schedule);
  if (!entry) return null;
  const odMm = entry.pipe.outsideDiameterMm;
  const wallMm = entry.row.wallThicknessMm;
  if (unitSystem === "imperial") {
    return {
      outerDiameter: Number((odMm / 25.4).toFixed(4)),
      thickness: Number((wallMm / 25.4).toFixed(4)),
    };
  }
  return {
    outerDiameter: Number(odMm.toFixed(2)),
    thickness: Number(wallMm.toFixed(2)),
  };
}

function ValueCell({ value, emphasis }: { value: string; emphasis?: boolean }) {
  const tone = emphasis
    ? "text-blue-700 dark:text-blue-300"
    : "text-slate-900 dark:text-slate-100";
  return (
    <span
      className={`ml-auto block w-full whitespace-nowrap text-right font-mono text-sm tabular-nums ${tone} ${
        emphasis ? "font-bold" : ""
      }`}
    >
      {value}
    </span>
  );
}

function CompactResultTable({ rows }: { rows: ResultRow[] }) {
  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-md border border-slate-200 dark:border-spec-border">
      <table className="w-full min-w-[18rem] border-collapse text-sm">
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className="border-b border-slate-200 last:border-b-0 dark:border-spec-border"
            >
              <th className="w-[42%] bg-slate-50 px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 dark:bg-spec-bg dark:text-slate-400">
                {row.label}
              </th>
              <td className="whitespace-nowrap px-2.5 py-1.5 pr-4 text-right">
                <ValueCell value={row.value} emphasis={row.emphasis} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const GROUP_ORDER: AlloyMaterialGroup[] = [
  "stainless",
  "duplex",
  "nickel",
  "other",
];

const FIELD_WRAP = "calc-field mb-0 w-full max-w-[300px] min-w-0";

function MaterialPicker({
  value,
  onChange,
  filtered,
}: {
  value: AlloyMaterialId;
  onChange: (id: AlloyMaterialId) => void;
  filtered: typeof ALLOY_MATERIALS;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<Record<string, number | string>>(
    {},
  );

  const selected =
    ALLOY_MATERIALS.find((m) => m.id === value) ?? ALLOY_MATERIALS[0];

  const placeMenu = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 280);
    const left = Math.min(
      rect.left,
      Math.max(8, window.innerWidth - width - 8),
    );
    // Always open below the trigger (bottom-start). Cap height to remaining viewport.
    const spaceBelow = Math.max(96, window.innerHeight - rect.bottom - 12);
    const maxHeight = Math.min(256, spaceBelow); // ~max-h-64
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left,
      width,
      maxHeight,
      zIndex: 50,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    placeMenu();
    function onScrollOrResize() {
      placeMenu();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open, placeMenu]);

  const hint = fieldLabelHint("Material");
  const menu: ReactNode =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Material grades"
            style={menuStyle}
            className="max-h-64 overflow-y-auto rounded-lg border border-slate-300 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-spec-panel"
          >
            {GROUP_ORDER.map((group) => {
              const items = filtered.filter((m) => m.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group} role="group" aria-label={ALLOY_GROUP_LABEL[group]}>
                  <div className="sticky top-0 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-spec-bg dark:text-slate-400">
                    {ALLOY_GROUP_LABEL[group]}
                  </div>
                  {items.map((m) => {
                    const active = m.id === value;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-spec-accentBg/50 ${
                          active
                            ? "bg-spec-accentBg/40 font-semibold text-slate-900 dark:text-slate-100"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                        onClick={() => {
                          onChange(m.id);
                          setOpen(false);
                        }}
                      >
                        <span>{m.label}</span>
                        <span className="shrink-0 font-mono text-xs text-slate-500">
                          {densityGPerCm3(m.densityKgM3).toFixed(2)} g/cm³
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {filtered.length === 0 ? (
              <p className="px-2.5 py-2 text-sm text-slate-500">No matches</p>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`${FIELD_WRAP} relative`}>
      <label className={FIELD_LABEL_CLASS}>
        <span>Material</span>
        {hint ? (
          <span
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-sm font-bold leading-none text-slate-500"
            title={hint}
            aria-label={hint}
          >
            ?
          </span>
        ) : null}
      </label>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${FIELD_SELECT_CLASS} flex items-center justify-between gap-2 text-left`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="min-w-0 truncate">
          {selected.label} ({densityGPerCm3(selected.densityKgM3).toFixed(2)}{" "}
          g/cm³)
        </span>
        <span className="shrink-0 text-slate-400" aria-hidden>
          ▾
        </span>
      </button>
      {menu}
    </div>
  );
}

export default function AlloyWeightCalculator({
  title,
  standard,
}: AlloyWeightCalculatorProps) {
  const { inputs, setField, setInputs } = useCalculatorUrlSync<AlloyWeightInputs>(
    DEFAULT_ALLOY_WEIGHT_INPUTS,
    ALLOY_WEIGHT_URL_CONFIG,
    { type: "alloy-weight" },
  );
  const [materialQuery, setMaterialQuery] = useState("");
  const [pipeNps, setPipeNps] = useState("4");
  const [pipeSchedule, setPipeSchedule] = useState("40S");

  const output = useMemo(() => calculateAlloyWeight(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const filtered = useMemo(() => {
    const list = filterAlloyMaterials(materialQuery);
    if (list.some((m) => m.id === inputs.material)) return list;
    const current = ALLOY_MATERIALS.find((m) => m.id === inputs.material);
    return current ? [current, ...list] : list;
  }, [materialQuery, inputs.material]);

  const npsList = useMemo(() => listAvailableNps(), []);
  const scheduleOptions = useMemo(
    () => listScheduleOptionsForNps(pipeNps),
    [pipeNps],
  );

  useEffect(() => {
    if (inputs.shape !== "pipe") return;
    const resolved = defaultScheduleForNps(pipeNps, pipeSchedule);
    if (resolved && resolved !== pipeSchedule) {
      setPipeSchedule(resolved);
    }
  }, [inputs.shape, pipeNps, pipeSchedule]);

  const lenUnit = inputs.unitSystem === "imperial" ? "in" : "mm";
  const priceUnit = inputs.unitSystem === "imperial" ? "$/lb" : "$/kg";

  const inputRows = [
    {
      label: "Material",
      value:
        ALLOY_MATERIALS.find((m) => m.id === inputs.material)?.label ??
        inputs.material,
    },
    {
      label: "Shape",
      value:
        ALLOY_SHAPE_OPTIONS.find((s) => s.value === inputs.shape)?.label ??
        inputs.shape,
    },
    { label: "Quantity", value: String(inputs.quantity) },
  ];

  const showOd =
    inputs.shape === "pipe" || inputs.shape === "round-bar";
  const showWidth =
    inputs.shape === "plate" ||
    inputs.shape === "rect-bar" ||
    inputs.shape === "structural";
  const showThickness =
    inputs.shape === "pipe" ||
    inputs.shape === "plate" ||
    inputs.shape === "rect-bar" ||
    inputs.shape === "structural";

  function applyNpsSchedule(nps: string, schedule: string) {
    const resolved = resolveScheduleOptionValue(nps, schedule) || schedule;
    const dims = applyPipeDims(nps, resolved, inputs.unitSystem);
    setPipeNps(nps);
    setPipeSchedule(resolved);
    if (!dims) return;
    setInputs((current) => ({
      ...current,
      outerDiameter: dims.outerDiameter,
      thickness: dims.thickness,
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
            <p className="mt-2 rounded-md border border-slate-200/80 bg-white/70 px-2 py-1.5 text-[11px] leading-snug text-slate-600 dark:border-slate-600/60 dark:bg-spec-bg/60 dark:text-slate-300">
              Catalog screening densities (e.g. SS316 ρ = 8.00 g/cm³). Actual
              shipping weight may vary ±1–2% with heat chemistry / mill
              tolerances — confirm against the mill certificate.
            </p>
          </div>

          <CompactResultTable rows={output.rows} />

          {output.callouts
            ?.filter((c) => c.title !== "Mill / heat chemistry tolerance")
            .map((callout) => (
            <aside
              key={callout.title}
              className="rounded-lg border border-l-4 border-blue-200 border-l-blue-500 bg-blue-50 px-3.5 py-2.5 text-sm text-blue-950 dark:border-blue-500/40 dark:border-l-blue-400 dark:bg-blue-950/30 dark:text-blue-100"
            >
              <p className="font-semibold">{callout.title}</p>
              <p className="mt-1 leading-relaxed opacity-90">{callout.body}</p>
            </aside>
          ))}
        </div>
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3 [&_.calc-field]:mb-0">
          <div className="w-full min-w-0 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Material &amp; form
            </h3>
            <label className="calc-field block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Filter materials
              </span>
              <input
                type="search"
                value={materialQuery}
                onChange={(e) => setMaterialQuery(e.target.value)}
                placeholder="e.g. 316, inconel, duplex…"
                className="box-border h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-sm text-slate-900 outline-none focus:border-spec-accent focus:ring-2 focus:ring-spec-accent dark:border-slate-600 dark:bg-spec-bg dark:text-spec-text"
              />
            </label>
            <MaterialPicker
              value={inputs.material}
              filtered={filtered}
              onChange={(id) => setField("material", id)}
            />
            <FieldSelect
              label="Shape / form"
              value={inputs.shape}
              options={ALLOY_SHAPE_OPTIONS}
              onChange={(value) => {
                const shape = value as AlloyShape;
                setField("shape", shape);
                if (shape === "pipe") {
                  applyNpsSchedule(
                    pipeNps,
                    defaultScheduleForNps(pipeNps, pipeSchedule) || pipeSchedule,
                  );
                }
              }}
              hint={fieldLabelHint("Shape")}
            />
          </div>

          <div className="w-full min-w-0 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Dimensions
            </h3>
            {inputs.shape === "pipe" ? (
              <>
                <FieldSelect
                  label="NPS (ASME B36)"
                  value={pipeNps}
                  onChange={(next) => {
                    const schedule = defaultScheduleForNps(next, pipeSchedule);
                    applyNpsSchedule(next, schedule);
                  }}
                  hint="ASME B36.10M / B36.19M outside diameter lookup."
                >
                  {npsList.map((pipe) => (
                    <option key={pipe.nps} value={pipe.nps}>
                      {pipe.npsLabel}
                    </option>
                  ))}
                </FieldSelect>
                <FieldSelect
                  label="Schedule"
                  value={
                    scheduleOptions.some((opt) => opt.value === pipeSchedule)
                      ? pipeSchedule
                      : (scheduleOptions[0]?.value ?? pipeSchedule)
                  }
                  onChange={(next) => applyNpsSchedule(pipeNps, next)}
                  hint="Selecting a schedule autofills OD and wall thickness."
                >
                  {scheduleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </FieldSelect>
                <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                  Autofilled OD {inputs.outerDiameter} {lenUnit} · wall{" "}
                  {inputs.thickness} {lenUnit} (editable below if needed).
                </p>
              </>
            ) : null}
            <FieldGroup
              label="Length"
              value={String(inputs.length)}
              unit={lenUnit}
              onChange={(raw) =>
                setField("length", toNumber(raw, inputs.length))
              }
            />
            {showOd ? (
              <FieldGroup
                label={
                  inputs.shape === "round-bar"
                    ? "Diameter"
                    : "Outside diameter (OD)"
                }
                value={String(inputs.outerDiameter)}
                unit={lenUnit}
                onChange={(raw) =>
                  setField("outerDiameter", toNumber(raw, inputs.outerDiameter))
                }
              />
            ) : null}
            {showWidth ? (
              <FieldGroup
                label="Width"
                value={String(inputs.width)}
                unit={lenUnit}
                onChange={(raw) =>
                  setField("width", toNumber(raw, inputs.width))
                }
              />
            ) : null}
            {showThickness ? (
              <FieldGroup
                label={
                  inputs.shape === "pipe"
                    ? "Wall thickness"
                    : inputs.shape === "rect-bar"
                      ? "Height / thickness"
                      : "Thickness"
                }
                value={String(inputs.thickness)}
                unit={lenUnit}
                onChange={(raw) =>
                  setField("thickness", toNumber(raw, inputs.thickness))
                }
              />
            ) : null}
            <FieldGroup
              label="Quantity"
              value={String(inputs.quantity)}
              unit="pcs"
              allowZero={false}
              onChange={(raw) =>
                setField("quantity", Math.max(1, toNumber(raw, 1)))
              }
            />
          </div>

          <div className="w-full min-w-0 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Cost (optional)
            </h3>
            <div className="calc-field mb-0 w-full max-w-[300px] min-w-0">
              <label className={FIELD_LABEL_CLASS}>
                <span>Unit price</span>
                <span
                  className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-sm font-bold leading-none text-slate-500"
                  title="Optional procurement screen. Leave blank to skip cost."
                >
                  ?
                </span>
              </label>
              <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_72px] items-stretch gap-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={inputs.unitPrice > 0 ? String(inputs.unitPrice) : ""}
                  placeholder="0"
                  onChange={(event) => {
                    const raw = event.target.value;
                    setField(
                      "unitPrice",
                      raw.trim() === "" ? 0 : toNumber(raw, 0),
                    );
                  }}
                  className="box-border flex h-10 min-h-10 w-full min-w-0 items-center rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-sm text-slate-900 outline-none focus:border-spec-accent focus:ring-2 focus:ring-spec-accent dark:border-slate-600 dark:bg-spec-bg dark:text-spec-text"
                />
                <div className="box-border flex h-10 min-h-10 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-spec-bg dark:text-spec-text2">
                  {priceUnit}
                </div>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Optional procurement screen. Leave blank to skip cost.
              </p>
            </div>
          </div>
        </div>
      }
    />
  );
}
