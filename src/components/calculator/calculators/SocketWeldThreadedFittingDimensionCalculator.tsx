"use client";

import { useEffect, useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import {
  FieldChipRadio,
  FieldSelect,
  fieldLabelHint,
} from "@/components/calculator/FieldGroup";
import B1611FittingSchematic from "@/components/calculator/schematics/B1611FittingSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import { chipsInOptions } from "@/components/calculator/presets";
import {
  B1611_CONNECTION_OPTIONS,
  B1611_FITTING_OPTIONS,
  B1611_NPS_OPTIONS,
  calculateSocketWeldThreadedFittingDimension,
  classesForConnection,
  computeSocketWeldThreadedFittingDimension,
  DEFAULT_SOCKET_WELD_THREADED_FITTING_DIMENSION_INPUTS,
  fittingsForConnection,
  listB1611NpsFor,
  type B1611Class,
  type B1611Connection,
  type B1611Fitting,
  type SocketWeldThreadedFittingDimensionInputs,
} from "@/lib/calculators/engines/socket-weld-threaded-fitting-dimension";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { SOCKET_WELD_THREADED_FITTING_DIMENSION_URL_CONFIG } from "@/lib/calculators/url-configs/socket-weld-threaded-fitting-dimension";
import { formatLength } from "@/utils/unitConverter";

type Props = { title: string; standard?: string };

/** B16.11 is NPS ≤ 4 — do not reuse large-bore COMMON_NPS_CHIPS (2–12). */
const B1611_NPS_CHIPS = [
  { value: "0.5", label: '½"' },
  { value: "0.75", label: '¾"' },
  { value: "1", label: '1"' },
  { value: "1.25", label: '1¼"' },
  { value: "1.5", label: '1½"' },
  { value: "2", label: '2"' },
  { value: "3", label: '3"' },
  { value: "4", label: '4"' },
];

const CLASS_CHIPS = [
  { value: "2000", label: "2000" },
  { value: "3000", label: "3000" },
  { value: "6000", label: "6000" },
  { value: "9000", label: "9000" },
];

const FITTING_CHIPS_SW = [
  { value: "elbow-90", label: "90° EL" },
  { value: "elbow-45", label: "45° EL" },
  { value: "tee", label: "Tee" },
  { value: "cross", label: "Cross" },
  { value: "coupling", label: "Cplg" },
  { value: "half-coupling", label: "½ Cplg" },
  { value: "cap", label: "Cap" },
];

const FITTING_CHIPS_THRD = [
  { value: "elbow-90", label: "90° EL" },
  { value: "elbow-45", label: "45° EL" },
  { value: "tee", label: "Tee" },
  { value: "cross", label: "Cross" },
  { value: "coupling", label: "Cplg" },
  { value: "cap", label: "Cap" },
  { value: "street-elbow", label: "Street" },
];

function shortLen(mm: number, unitSystem: "metric" | "imperial", digits = 2): string {
  if (!Number.isFinite(mm)) return "—";
  if (unitSystem === "imperial") {
    return `${(mm / 25.4).toFixed(digits)} in`;
  }
  return `${mm.toFixed(digits)} mm`;
}

export default function SocketWeldThreadedFittingDimensionCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField } =
    useCalculatorUrlSync<SocketWeldThreadedFittingDimensionInputs>(
      DEFAULT_SOCKET_WELD_THREADED_FITTING_DIMENSION_INPUTS,
      SOCKET_WELD_THREADED_FITTING_DIMENSION_URL_CONFIG,
      { type: "socket-weld-threaded-fitting-dimension" },
    );

  const allowedClasses = useMemo(
    () => classesForConnection(inputs.connection),
    [inputs.connection],
  );
  const allowedFittings = useMemo(
    () => fittingsForConnection(inputs.connection),
    [inputs.connection],
  );

  useEffect(() => {
    if (!allowedClasses.includes(inputs.rating)) {
      setField("rating", allowedClasses[0] ?? "3000");
    }
  }, [allowedClasses, inputs.rating, setField]);

  useEffect(() => {
    if (!allowedFittings.includes(inputs.fitting)) {
      setField("fitting", allowedFittings[0] ?? "elbow-90");
    }
  }, [allowedFittings, inputs.fitting, setField]);

  const rating = allowedClasses.includes(inputs.rating)
    ? inputs.rating
    : (allowedClasses[0] ?? "3000");
  const fitting = allowedFittings.includes(inputs.fitting)
    ? inputs.fitting
    : (allowedFittings[0] ?? "elbow-90");

  const allowedNps = useMemo(
    () => listB1611NpsFor(inputs.connection, fitting, rating),
    [inputs.connection, fitting, rating],
  );

  useEffect(() => {
    if (allowedNps.length > 0 && !allowedNps.includes(inputs.nps)) {
      setField("nps", allowedNps[0]);
    }
  }, [allowedNps, inputs.nps, setField]);

  const nps =
    allowedNps.length === 0 || allowedNps.includes(inputs.nps)
      ? inputs.nps
      : (allowedNps[0] ?? inputs.nps);

  const resolved = useMemo(
    (): SocketWeldThreadedFittingDimensionInputs => ({
      unitSystem: inputs.unitSystem,
      connection: inputs.connection,
      fitting,
      nps,
      rating,
    }),
    [inputs.unitSystem, inputs.connection, fitting, nps, rating],
  );

  const output = useMemo(
    () => calculateSocketWeldThreadedFittingDimension(resolved),
    [resolved],
  );
  const computed = useMemo(
    () => computeSocketWeldThreadedFittingDimension(resolved),
    [resolved],
  );
  usePublishCalculatorOutput(output);

  const fittingOptions = B1611_FITTING_OPTIONS.filter((f) =>
    allowedFittings.includes(f.value),
  );
  const classOptions = allowedClasses.map((c) => ({
    value: c,
    label: `Class ${c}`,
  }));
  const npsOptions = B1611_NPS_OPTIONS.filter((o) =>
    allowedNps.includes(o.value),
  ).map((o) => ({
    value: o.value,
    label: `${o.label} (DN ${o.dn})`,
  }));

  const fittingChips = chipsInOptions(
    resolved.connection === "socket-weld" ? FITTING_CHIPS_SW : FITTING_CHIPS_THRD,
    fittingOptions,
  );

  const scanRows = useMemo(() => {
    return allowedNps.map((size) => {
      const c = computeSocketWeldThreadedFittingDimension({
        ...resolved,
        nps: size,
      });
      return {
        nps: size,
        npsLabel: B1611_NPS_OPTIONS.find((o) => o.value === size)?.label ?? size,
        primary: c.invalid
          ? "—"
          : shortLen(c.primaryMm, resolved.unitSystem, 2),
        wall: c.invalid ? "—" : shortLen(c.wallGMm, resolved.unitSystem, 2),
        depth: c.invalid
          ? "—"
          : c.socketJMm != null
            ? shortLen(c.socketJMm, resolved.unitSystem, 2)
            : c.l2Mm != null
              ? shortLen(c.l2Mm, resolved.unitSystem, 2)
              : "—",
      };
    });
  }, [allowedNps, resolved]);

  const depthLabel = resolved.connection === "socket-weld" ? "J" : "L₂";
  const depthValue = computed.invalid
    ? "—"
    : computed.socketJMm != null
      ? shortLen(computed.socketJMm, resolved.unitSystem, 2)
      : computed.l2Mm != null
        ? shortLen(computed.l2Mm, resolved.unitSystem, 2)
        : "—";

  const sizeChart = (
    <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-spec-border">
      <table className="min-w-full text-left text-xs">
        <caption className="sr-only">
          ASME B16.11 size scan for current fitting and class
        </caption>
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
          <tr>
            <th className="px-2 py-1.5 font-semibold">NPS</th>
            <th className="px-2 py-1.5 text-right font-semibold">
              {computed.primarySymbol}
            </th>
            <th className="px-2 py-1.5 text-right font-semibold">G</th>
            <th className="px-2 py-1.5 text-right font-semibold">{depthLabel}</th>
          </tr>
        </thead>
        <tbody>
          {scanRows.map((row) => {
            const active = row.nps === resolved.nps;
            return (
              <tr
                key={row.nps}
                className={`cursor-pointer border-t border-slate-100 dark:border-spec-border ${
                  active
                    ? "bg-blue-50/80 dark:bg-blue-950/30"
                    : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
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
                <td className="px-2 py-1.5 text-right font-mono font-semibold tabular-nums text-blue-800 dark:text-blue-200">
                  {row.primary}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  {row.wall}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  {row.depth}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const inputRows = [
    { label: "Connection", value: computed.connectionLabel },
    { label: "Fitting", value: computed.fittingLabel },
    { label: "NPS", value: computed.npsLabel },
    { label: "Class", value: `Class ${resolved.rating}` },
  ];

  const shapeKind =
    resolved.fitting === "coupling" ||
    resolved.fitting === "half-coupling" ||
    resolved.fitting === "cap"
      ? "inline"
      : "elbow";

  return (
    <CalculatorBaseLayout
      layout="formula"
      wideResult
      resultDashboard
      inputNaturalHeight
      diagramSection="B16.11 fitting envelope"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      visual={
        <B1611FittingSchematic
          connectionLabel={computed.connectionLabel}
          fittingLabel={computed.fittingLabel}
          npsLabel={computed.npsLabel}
          classLabel={`Class ${resolved.rating}`}
          primaryLabel={computed.primarySymbol}
          primaryValue={
            computed.invalid
              ? "—"
              : shortLen(computed.primaryMm, resolved.unitSystem, 2)
          }
          wallLabel={
            computed.invalid
              ? "—"
              : shortLen(computed.wallGMm, resolved.unitSystem, 2)
          }
          depthLabel={depthLabel}
          depthValue={depthValue}
          showSocketGap={resolved.connection === "socket-weld"}
          gapLabel={shortLen(1.5, resolved.unitSystem, 2)}
          shapeKind={shapeKind}
        />
      }
      afterHero={sizeChart}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Fitting selection
          </h3>
          <FieldChipRadio
            wide
            label="Connection"
            value={resolved.connection}
            options={B1611_CONNECTION_OPTIONS}
            onChange={(value) =>
              setField("connection", value as B1611Connection)
            }
          />
          <FieldChipRadio
            wide
            label="Fitting"
            value={resolved.fitting}
            options={fittingChips}
            onChange={(value) => setField("fitting", value as B1611Fitting)}
          />
          <FieldSelect
            label="Nominal pipe size (NPS)"
            hint={fieldLabelHint("NPS")}
            value={resolved.nps}
            options={npsOptions}
            onChange={(value) => setField("nps", value)}
          />
          <FieldChipRadio
            wide
            label="Common NPS"
            value={resolved.nps}
            onChange={(value) => setField("nps", value)}
            options={chipsInOptions(B1611_NPS_CHIPS, npsOptions)}
          />
          <FieldSelect
            label="Pressure class"
            hint={
              resolved.connection === "socket-weld"
                ? "SW: 3000 / 6000 / 9000"
                : "Threaded: 2000 / 3000 / 6000"
            }
            value={resolved.rating}
            options={classOptions}
            onChange={(value) => setField("rating", value as B1611Class)}
          />
          <FieldChipRadio
            wide
            label="Class"
            value={resolved.rating}
            onChange={(value) => setField("rating", value as B1611Class)}
            options={chipsInOptions(CLASS_CHIPS, classOptions)}
          />
        </div>
      }
    />
  );
}
