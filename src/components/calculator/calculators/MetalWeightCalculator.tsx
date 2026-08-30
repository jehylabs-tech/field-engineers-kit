"use client";

import { useEffect, useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import ExportButtons from "@/components/calculator/ExportButtons";
import FieldGroup, {
  FIELD_LABEL_CLASS,
  FIELD_SELECT_CLASS,
  FieldSelect,
} from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import type { CalculatorOutput, ResultRow } from "@/lib/calculators/definitions";
import {
  BWG_OPTIONS,
  METAL_CURRENCY_OPTIONS,
  METAL_DENSITIES,
  METAL_MATERIAL_ORDER,
  METAL_PRICE_BASIS_OPTIONS,
  METAL_SHAPE_OPTIONS,
  calculateMetalWeight,
  wallFromBwg,
  type MetalCurrency,
  type MetalMaterial,
  type MetalPriceBasis,
  type MetalShape,
  type MetalWallMode,
  type MetalWeightInputs,
} from "@/lib/calculators/engines/metal-weight";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import {
  DEFAULT_METAL_INPUTS,
  METAL_WEIGHT_URL_CONFIG,
} from "@/lib/calculators/url-configs/metal-weight";
import {
  getPipeScheduleEntry,
  listAvailableNps,
  listScheduleOptionsForNps,
  resolveScheduleOptionValue,
} from "@/lib/data/loaders";

type MetalWeightCalculatorProps = {
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
  unitSystem: MetalWeightInputs["unitSystem"],
): { outerDiameter: number; innerDiameter: number } | null {
  const entry = getPipeScheduleEntry(nps, schedule);
  if (!entry) return null;
  const odMm = entry.pipe.outsideDiameterMm;
  const idMm = entry.row.insideDiameterMm;
  if (unitSystem === "imperial") {
    return {
      outerDiameter: Number((odMm / 25.4).toFixed(4)),
      innerDiameter: Number((idMm / 25.4).toFixed(4)),
    };
  }
  return {
    outerDiameter: Number(odMm.toFixed(2)),
    innerDiameter: Number(idMm.toFixed(2)),
  };
}

function ValueCell({ value, emphasis }: { value: string; emphasis?: boolean }) {
  const match = value.match(/^([^\d-]*)(-?[\d.,]+)(\s*)(.*)$/);
  const tone = emphasis
    ? "text-blue-700 dark:text-blue-300"
    : "text-slate-900 dark:text-slate-100";
  if (match && match[2]) {
    const [, prefix, num, , rest] = match;
    return (
      <span className={`ml-auto flex w-full items-center justify-end gap-1 text-right ${tone}`}>
        {prefix ? <span className="font-sans text-xs">{prefix}</span> : null}
        <span className={emphasis ? "font-bold" : undefined}>{num}</span>
        {rest ? (
          <span className="font-sans text-xs font-medium text-slate-500 dark:text-slate-400">
            {rest}
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <span className={`ml-auto block w-full text-right ${tone} ${emphasis ? "font-bold" : ""}`}>
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
              className={`w-[48%] border-b border-slate-100 px-3 py-2 text-left text-xs dark:border-spec-border/60 md:text-sm ${
                row.emphasis
                  ? "font-semibold text-blue-950 dark:text-blue-100"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {row.label}
            </td>
            <td
              className="border-b border-slate-100 px-3 py-2 text-right font-mono text-xs font-semibold tabular-nums dark:border-spec-border/60 md:text-sm"
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

function DualHeroResult({ output }: { output: CalculatorOutput }) {
  const weight =
    output.summary.find((item) => /weight/i.test(item.label))?.value ??
    output.heroValue;
  const cost =
    output.summary.find((item) => /cost/i.test(item.label))?.value ?? "—";

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
      <div
        id="calc-result-hero"
        className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <div className="rounded-md border border-l-4 border-spec-border border-l-blue-600 bg-blue-50/50 p-5 dark:border-l-blue-500 dark:bg-blue-950/20">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 md:text-xs">
            Estimated Weight
          </span>
          <div className="break-words font-mono text-2xl font-extrabold leading-snug tracking-tight text-blue-800 dark:text-blue-200 md:text-3xl">
            {weight}
          </div>
        </div>
        <div className="rounded-md border border-l-4 border-spec-border border-l-emerald-600 bg-emerald-50/50 p-5 dark:border-l-emerald-500 dark:bg-emerald-950/20">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 md:text-xs">
            Total Estimated Cost
          </span>
          <div className="break-words font-mono text-2xl font-extrabold leading-snug tracking-tight text-emerald-800 dark:text-emerald-200 md:text-3xl">
            {cost}
          </div>
        </div>
      </div>
      <p className="shrink-0 truncate text-xs text-slate-500 dark:text-slate-400">
        {output.heroStatus}
      </p>
      <div className="min-h-0 flex-1 overflow-auto">
        <CompactResultTable rows={output.rows} />
      </div>
    </div>
  );
}

/** Compact controls; short numeric fields avoid full-column stretch. */
const COMPACT_FIELDS =
  "[&_.calc-field]:mb-0 [&_label]:mb-0.5 [&_label]:text-xs [&_input]:h-8 [&_input]:min-h-8 [&_input]:leading-8 [&_select]:h-8 [&_select]:min-h-8 [&_select]:leading-8";

const SHORT_NUMERIC =
  "max-w-[220px] [&_.calc-field]:max-w-[220px] [&_.calc-field>div.grid]:grid-cols-[minmax(0,1fr)_3rem]";

const INPUT_CLASS =
  "box-border h-8 min-h-8 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-sm leading-8 text-slate-900 outline-none focus:border-spec-accent focus:ring-2 focus:ring-spec-accent dark:border-slate-600 dark:bg-spec-bg dark:text-spec-text";

export default function MetalWeightCalculator({
  title,
  standard,
}: MetalWeightCalculatorProps) {
  const { inputs, setField, setInputs } = useCalculatorUrlSync<MetalWeightInputs>(
    DEFAULT_METAL_INPUTS,
    METAL_WEIGHT_URL_CONFIG,
    { type: "metal-weight" },
  );

  const npsList = useMemo(() => listAvailableNps(), []);
  const scheduleOptions = useMemo(
    () => listScheduleOptionsForNps(inputs.nps),
    [inputs.nps],
  );

  useEffect(() => {
    if (inputs.shape !== "pipe") return;
    const resolvedSch = resolveScheduleOptionValue(inputs.nps, inputs.schedule);
    if (resolvedSch && resolvedSch !== inputs.schedule) {
      setField("schedule", resolvedSch);
      return;
    }
    const dims = applyPipeDims(inputs.nps, inputs.schedule, inputs.unitSystem);
    if (!dims) return;
    if (
      dims.outerDiameter !== inputs.outerDiameter ||
      dims.innerDiameter !== inputs.innerDiameter
    ) {
      setInputs((current) => ({
        ...current,
        outerDiameter: dims.outerDiameter,
        innerDiameter: dims.innerDiameter,
      }));
    }
  }, [
    inputs.shape,
    inputs.nps,
    inputs.schedule,
    inputs.unitSystem,
    inputs.outerDiameter,
    inputs.innerDiameter,
    setField,
    setInputs,
  ]);

  useEffect(() => {
    if (inputs.shape !== "tube" || inputs.wallMode !== "bwg") return;
    const next = wallFromBwg(inputs.bwg, inputs.unitSystem);
    if (next !== inputs.thickness) {
      setField("thickness", next);
    }
  }, [
    inputs.shape,
    inputs.wallMode,
    inputs.bwg,
    inputs.unitSystem,
    inputs.thickness,
    setField,
  ]);

  const output = useMemo(() => calculateMetalWeight(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const lengthUnit = inputs.unitSystem === "metric" ? "mm" : "in";
  const pipeEntry =
    inputs.shape === "pipe"
      ? getPipeScheduleEntry(inputs.nps, inputs.schedule)
      : undefined;

  const materialOptions = useMemo(() => {
    const ordered = METAL_MATERIAL_ORDER.map((id) => ({
      id,
      ...METAL_DENSITIES[id],
    }));
    if (inputs.shape === "tube") {
      return [
        ...ordered.filter((m) => m.group === "hx"),
        ...ordered.filter((m) => m.group === "general"),
      ];
    }
    return [
      ...ordered.filter((m) => m.group === "general"),
      ...ordered.filter((m) => m.group === "hx"),
    ];
  }, [inputs.shape]);

  const inputRows = [
    {
      label: "Shape",
      value:
        METAL_SHAPE_OPTIONS.find((o) => o.value === inputs.shape)?.label ??
        inputs.shape,
    },
    { label: "Material", value: METAL_DENSITIES[inputs.material].label },
    { label: "Length", value: `${inputs.length} ${lengthUnit}` },
    { label: "Quantity", value: String(inputs.quantity) },
  ];

  function selectNps(nps: string) {
    const options = listScheduleOptionsForNps(nps);
    const schedule =
      resolveScheduleOptionValue(nps, inputs.schedule) ||
      options[0]?.value ||
      "40";
    const dims = applyPipeDims(nps, schedule, inputs.unitSystem);
    setInputs((current) => ({
      ...current,
      nps,
      schedule,
      ...(dims ?? {}),
    }));
  }

  function selectSchedule(schedule: string) {
    const dims = applyPipeDims(inputs.nps, schedule, inputs.unitSystem);
    setInputs((current) => ({
      ...current,
      schedule,
      ...(dims ?? {}),
    }));
  }

  function selectShape(shape: MetalShape) {
    setInputs((current) => {
      const next: MetalWeightInputs = { ...current, shape };
      if (shape === "tube" && current.material === "carbon-steel") {
        next.material = "ss316l";
      }
      if (shape === "tube" && current.wallMode === "bwg") {
        next.thickness = wallFromBwg(current.bwg, current.unitSystem);
      }
      return next;
    });
  }

  function selectWallMode(wallMode: MetalWallMode) {
    setInputs((current) => {
      if (wallMode === "bwg") {
        return {
          ...current,
          wallMode,
          thickness: wallFromBwg(current.bwg, current.unitSystem),
        };
      }
      return { ...current, wallMode };
    });
  }

  function selectBwg(bwgRaw: string) {
    const bwg = Math.round(toNumber(bwgRaw, inputs.bwg));
    setInputs((current) => ({
      ...current,
      bwg,
      wallMode: "bwg",
      thickness: wallFromBwg(bwg, current.unitSystem),
    }));
  }

  const pricePackage = `${inputs.currency}|${inputs.priceBasis}`;
  const pricePackageOptions = useMemo(
    () =>
      METAL_CURRENCY_OPTIONS.flatMap((currency) =>
        METAL_PRICE_BASIS_OPTIONS.map((basis) => ({
          value: `${currency.value}|${basis.value}`,
          label: `${currency.value} (${currency.symbol}${basis.label})`,
        })),
      ),
    [],
  );

  function selectPricePackage(value: string) {
    const [currency, priceBasis] = value.split("|") as [
      MetalCurrency,
      MetalPriceBasis,
    ];
    if (!currency || !priceBasis) return;
    setInputs((current) => ({ ...current, currency, priceBasis }));
  }

  return (
    <CalculatorBaseLayout
      layout="formula"
      columnRatio="6-6"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      resultHeaderActions={
        <ExportButtons
          variant="inline"
          title={title}
          standard={standard}
          inputRows={inputRows}
          resultRows={output.exportRows}
        />
      }
      resultPanel={<DualHeroResult output={output} />}
      inputPanel={
        <div
          className={`grid w-full min-w-0 grid-cols-1 items-start gap-x-4 gap-y-3 sm:grid-cols-2 ${COMPACT_FIELDS}`}
        >
          <FieldSelect
            label="Shape"
            value={inputs.shape}
            onChange={(value) => selectShape(value as MetalShape)}
          >
            {METAL_SHAPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FieldSelect>

          <FieldSelect
            label="Material"
            value={inputs.material}
            onChange={(value) => setField("material", value as MetalMaterial)}
          >
            {materialOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} ({item.density} kg/m³)
              </option>
            ))}
          </FieldSelect>

          <div className={SHORT_NUMERIC}>
            <FieldGroup
              label="Length (L)"
              value={inputs.length}
              onChange={(value) =>
                setField("length", toNumber(value, inputs.length))
              }
              unit={lengthUnit}
            />
          </div>

          <div className={SHORT_NUMERIC}>
            <FieldGroup
              label="Quantity"
              value={inputs.quantity}
              onChange={(value) =>
                setField(
                  "quantity",
                  Math.max(1, toNumber(value, inputs.quantity)),
                )
              }
              unit="pcs"
            />
          </div>

          {inputs.shape === "pipe" ? (
            <>
              <FieldSelect
                label="NPS"
                value={inputs.nps}
                onChange={selectNps}
              >
                {npsList.map((pipe) => (
                  <option key={pipe.nps} value={pipe.nps}>
                    {pipe.npsLabel}
                  </option>
                ))}
              </FieldSelect>
              <FieldSelect
                label="Schedule"
                value={resolveScheduleOptionValue(inputs.nps, inputs.schedule)}
                onChange={selectSchedule}
              >
                {scheduleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FieldSelect>
              {pipeEntry ? (
                <p className="col-span-full text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                  ASME B36.10/19 · OD {pipeEntry.pipe.outsideDiameterMm.toFixed(1)} mm ·
                  ID {pipeEntry.row.insideDiameterMm.toFixed(2)} mm · WT{" "}
                  {pipeEntry.row.wallThicknessMm.toFixed(2)} mm
                </p>
              ) : null}
            </>
          ) : null}

          {inputs.shape === "tube" ? (
            <>
              <div className={SHORT_NUMERIC}>
                <FieldGroup
                  label="Tube OD"
                  value={inputs.outerDiameter}
                  onChange={(value) =>
                    setField(
                      "outerDiameter",
                      toNumber(value, inputs.outerDiameter),
                    )
                  }
                  unit={lengthUnit}
                />
              </div>
              <div className="calc-field w-full max-w-[280px] min-w-0">
                <label className={FIELD_LABEL_CLASS}>
                  <span>Wall thickness</span>
                </label>
                <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-1.5">
                  <select
                    value={inputs.wallMode}
                    onChange={(event) =>
                      selectWallMode(event.target.value as MetalWallMode)
                    }
                    className={FIELD_SELECT_CLASS}
                    aria-label="Wall thickness mode"
                  >
                    <option value="dim">{lengthUnit}</option>
                    <option value="bwg">BWG</option>
                  </select>
                  {inputs.wallMode === "bwg" ? (
                    <select
                      value={String(inputs.bwg)}
                      onChange={(event) => selectBwg(event.target.value)}
                      className={FIELD_SELECT_CLASS}
                      aria-label="BWG"
                    >
                      {BWG_OPTIONS.map((gauge) => (
                        <option key={gauge} value={gauge}>
                          BWG {gauge} (
                          {wallFromBwg(gauge, inputs.unitSystem)} {lengthUnit})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={inputs.thickness}
                      onChange={(event) =>
                        setField(
                          "thickness",
                          toNumber(event.target.value, inputs.thickness),
                        )
                      }
                      className={INPUT_CLASS}
                      aria-label="Wall thickness"
                    />
                  )}
                </div>
              </div>
            </>
          ) : null}

          {inputs.shape === "plate" || inputs.shape === "structural" ? (
            <>
              <div className={SHORT_NUMERIC}>
                <FieldGroup
                  label={
                    inputs.shape === "structural" ? "Section width" : "Width (W)"
                  }
                  value={inputs.width}
                  onChange={(value) =>
                    setField("width", toNumber(value, inputs.width))
                  }
                  unit={lengthUnit}
                />
              </div>
              <div className={SHORT_NUMERIC}>
                <FieldGroup
                  label={
                    inputs.shape === "structural"
                      ? "Web / flange thk"
                      : "Thickness (T)"
                  }
                  value={inputs.thickness}
                  onChange={(value) =>
                    setField("thickness", toNumber(value, inputs.thickness))
                  }
                  unit={lengthUnit}
                />
              </div>
            </>
          ) : null}

          {inputs.shape === "bar" ? (
            <div className={SHORT_NUMERIC}>
              <FieldGroup
                label="Diameter"
                value={inputs.outerDiameter}
                onChange={(value) =>
                  setField(
                    "outerDiameter",
                    toNumber(value, inputs.outerDiameter),
                  )
                }
                unit={lengthUnit}
              />
            </div>
          ) : null}

          <div className="calc-field w-full min-w-0 sm:col-span-2">
            <label className={FIELD_LABEL_CLASS}>
              <span>Unit price</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={inputs.unitPrice}
                onChange={(event) =>
                  setField(
                    "unitPrice",
                    toNumber(event.target.value, inputs.unitPrice),
                  )
                }
                className={`${INPUT_CLASS} max-w-[200px]`}
                aria-label="Unit price"
              />
              <select
                value={pricePackage}
                onChange={(event) => selectPricePackage(event.target.value)}
                className={`${FIELD_SELECT_CLASS} max-w-[160px]`}
                aria-label="Currency and unit"
              >
                {pricePackageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      }
    />
  );
}
