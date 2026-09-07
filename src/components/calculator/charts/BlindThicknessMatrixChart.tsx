"use client";

import { useMemo, useState } from "react";
import type { BlindDesignMode, BlindFlangeInputs } from "@/lib/calculators/engines/blind-flange";
import {
  flangeAmbientPressureMpa,
  flangeHydroPressureMpa,
  formatImperialPlateFraction,
  getRecommendedCommercialPlate,
  requiredBlindThicknessMm,
} from "@/lib/calculators/engines/blind-flange";
import { getFlangeDimensionEntry } from "@/lib/data/loaders";

type BlindThicknessMatrixChartProps = {
  inputs: BlindFlangeInputs;
  onSelectCell?: (nps: string, pressureClass: string, pressureVal?: number) => void;
};

/** Classes shown in permanent rating matrix (ambient B16.5 Group 1.1). */
const CLASSES = ["150", "300", "600", "900", "1500", "2500"] as const;

/** Ambient class pressures (MPa) — derived from FLANGE_RATING_LIMITS.ambientBar. */
const AMBIENT_PRESSURES_MPA: Record<string, number> = Object.fromEntries(
  CLASSES.map((cls) => [cls, flangeAmbientPressureMpa(cls)]),
);

/** Hydro test pressures (MPa) — 1.5 × ambient from FLANGE_RATING_LIMITS. */
const HYDRO_PRESSURES_MPA: Record<string, number> = Object.fromEntries(
  CLASSES.map((cls) => [cls, flangeHydroPressureMpa(cls)]),
);

const MATRIX_NPS_LIST = [
  { nps: "2", label: "2\"" },
  { nps: "3", label: "3\"" },
  { nps: "4", label: "4\"" },
  { nps: "6", label: "6\"" },
  { nps: "8", label: "8\"" },
  { nps: "10", label: "10\"" },
  { nps: "12", label: "12\"" },
  { nps: "14", label: "14\"" },
  { nps: "16", label: "16\"" },
  { nps: "18", label: "18\"" },
  { nps: "20", label: "20\"" },
  { nps: "24", label: "24\"" },
];

// Fallback RF diameters (mm) for ASME B16.5
const FALLBACK_RF_DIAMETERS: Record<string, number> = {
  "2": 92.1,
  "3": 127.0,
  "4": 157.2,
  "6": 215.9,
  "8": 269.9,
  "10": 323.8,
  "12": 381.0,
  "14": 412.8,
  "16": 469.9,
  "18": 533.4,
  "20": 584.2,
  "24": 692.2,
};

// Metric hydrotest plate stocks (mm / T designation)
const HYDRO_PLATES_METRIC = [
  6, 8, 10, 12, 16, 19, 22, 25, 28, 30, 32, 35, 38, 40, 45, 50, 60, 70, 80, 100,
].map((tMm) => ({
  key: `m-${tMm}`,
  tMm,
  label: `${tMm} mm (${tMm}T)`,
}));

// Imperial hydrotest plate stocks (fractional inches)
const HYDRO_PLATES_IMPERIAL = [
  0.25, 0.3125, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0,
].map((tIn) => ({
  key: `i-${tIn}`,
  tMm: tIn * 25.4,
  tIn,
  label: `${formatImperialPlateFraction(tIn)} Plate`,
}));

const MPA_TO_PSI = 145.0377377;
const BAR_TO_PSI = 14.5037738;

function formatClassPressureLabel(
  mpa: number,
  unitSystem: "metric" | "imperial",
): string {
  if (unitSystem === "imperial") {
    return `${Math.round(mpa * MPA_TO_PSI)} psi`;
  }
  return `${mpa.toFixed(2)} MPa`;
}

function formatPressureBarDual(
  bar: number,
  unitSystem: "metric" | "imperial",
): string {
  if (unitSystem === "imperial") {
    const psi = bar * BAR_TO_PSI;
    return `${psi >= 10 ? psi.toFixed(0) : psi.toFixed(1)} psi`;
  }
  return `${bar >= 100 ? bar.toFixed(0) : bar.toFixed(1)} bar`;
}

function computeCellData(
  dMm: number,
  pressureMpa: number,
  stressMpa: number,
  corrosionMm: number,
  unitSystem: "metric" | "imperial" = "metric",
) {
  if (dMm <= 0 || pressureMpa <= 0 || stressMpa <= 0) {
    return { ptMpa: pressureMpa, tm: 0, plate: "—", plateNum: 0, label: "—" };
  }
  const ratio = (0.3 * pressureMpa) / stressMpa;
  const tmMm = dMm * Math.sqrt(Math.max(0, ratio)) + corrosionMm;
  const tmFinal = unitSystem === "imperial" ? tmMm / 25.4 : tmMm;
  const rec = getRecommendedCommercialPlate(tmFinal, unitSystem);
  return {
    ptMpa: pressureMpa,
    tm: Number(tmFinal.toFixed(2)),
    plate:
      unitSystem === "imperial"
        ? formatImperialPlateFraction(rec.value)
        : `${rec.value}T`,
    plateNum: rec.value,
    label: rec.label,
  };
}

/**
 * Calculates Maximum Allowable Test Pressure (bar) for a given Plate Thickness t (mm) and Gasket Dia d (mm)
 * ASME B31.3 Para. 304.4.1 / ASME VIII-1 UG-34:
 *   t_m = d * sqrt(C * P / (S * E)) with C = 0.30
 *   => P = (S * E / 0.30) * (t / d)^2
 */
function computeMaxTestPressureBar(
  tMm: number,
  dMm: number,
  stressMpa = 138.0,
  weldEff = 1.0,
) {
  if (dMm <= 0 || tMm <= 0 || stressMpa <= 0) return 0;
  const stressBar = stressMpa * 10;
  const pBar = ((stressBar * weldEff) / 0.3) * Math.pow(tMm / dMm, 2);
  return pBar;
}

export default function BlindThicknessMatrixChart({
  inputs,
  onSelectCell,
}: BlindThicknessMatrixChartProps) {
  const [viewMode, setViewMode] = useState<"table" | "curve">("table");
  const activeMode: BlindDesignMode =
    inputs.mode === "hydrotest" ? "hydrotest" : "permanent";
  const currentNps = inputs.nps ?? "4";
  const currentClass = inputs.pressureClass ?? "150";
  const currentPress = inputs.designPressure;

  const customRecommendation = useMemo(() => {
    const tm = requiredBlindThicknessMm(inputs);
    const plate = getRecommendedCommercialPlate(tm, inputs.unitSystem);
    return {
      tm,
      plate,
      tmLabel:
        inputs.unitSystem === "imperial"
          ? `${tm.toFixed(3)} in`
          : `${tm.toFixed(2)} mm`,
    };
  }, [inputs]);

  // Current pressure converted to bar for hydrotest matrix comparison
  const currentPressBar = useMemo(() => {
    if (inputs.unitSystem === "imperial") {
      return (currentPress ?? 0) * 0.0689476;
    }
    return (currentPress ?? 0) * 10; // MPa -> bar
  }, [currentPress, inputs.unitSystem]);

  const currentStressMpa = useMemo(() => {
    if (inputs.unitSystem === "imperial") {
      return (inputs.allowableStress ?? 20000) * 0.00689476; // psi -> MPa
    }
    return inputs.allowableStress ?? 138.0;
  }, [inputs.allowableStress, inputs.unitSystem]);

  const currentWeldEff = inputs.weldEfficiency ?? 1.0;

  // Data for Mode 1: Class-based Matrix (Permanent & Hydro)
  const classMatrixData = useMemo(() => {
    const stress =
      activeMode === "hydrotest"
        ? currentStressMpa
        : 125.0; // Design A516-70
    const corrosion = activeMode === "hydrotest" ? 0.0 : 3.0;
    const pressTable =
      activeMode === "hydrotest" ? HYDRO_PRESSURES_MPA : AMBIENT_PRESSURES_MPA;

    return MATRIX_NPS_LIST.map(({ nps, label }) => {
      const entry = getFlangeDimensionEntry(nps, "150");
      const rfDia =
        entry?.rating.raisedFaceDiameterMm ??
        FALLBACK_RF_DIAMETERS[nps] ??
        100;

      return {
        nps,
        npsLabel: label,
        rfDiaMm: rfDia,
        class150: computeCellData(rfDia, pressTable["150"], stress, corrosion, inputs.unitSystem),
        class300: computeCellData(rfDia, pressTable["300"], stress, corrosion, inputs.unitSystem),
        class600: computeCellData(rfDia, pressTable["600"], stress, corrosion, inputs.unitSystem),
        class900: computeCellData(rfDia, pressTable["900"], stress, corrosion, inputs.unitSystem),
        class1500: computeCellData(rfDia, pressTable["1500"], stress, corrosion, inputs.unitSystem),
        class2500: computeCellData(rfDia, pressTable["2500"], stress, corrosion, inputs.unitSystem),
      };
    });
  }, [activeMode, currentStressMpa, inputs.unitSystem]);

  // Data for Mode 2: Hydrotest Pressure Capability Matrix
  const hydroPressureTableData = useMemo(() => {
    const npsColumns = MATRIX_NPS_LIST.map(({ nps, label }) => {
      const entry = getFlangeDimensionEntry(nps, "150");
      const rfDia =
        entry?.rating.raisedFaceDiameterMm ??
        FALLBACK_RF_DIAMETERS[nps] ??
        100;
      return { nps, label, rfDia };
    });

    const plates =
      inputs.unitSystem === "imperial"
        ? HYDRO_PLATES_IMPERIAL
        : HYDRO_PLATES_METRIC;

    const rows = plates.map((plate) => {
      const pressByNps: Record<string, number> = {};
      npsColumns.forEach(({ nps, rfDia }) => {
        const pBar = computeMaxTestPressureBar(
          plate.tMm,
          rfDia,
          currentStressMpa,
          currentWeldEff,
        );
        pressByNps[nps] = pBar;
      });
      return {
        key: plate.key,
        tMm: plate.tMm,
        label: plate.label,
        pressByNps,
      };
    });

    return { npsColumns, rows };
  }, [currentStressMpa, currentWeldEff, inputs.unitSystem]);

  return (
    <div className="w-full">
      {/* Header & Controls */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 md:text-sm">
              {activeMode === "hydrotest"
                ? "Hydrotest Pressure Capability by Plate Thickness"
                : "ASME B16.5 Ambient Class Rating Matrix"}
            </h3>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold md:text-[11px] ${
                activeMode === "hydrotest"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
              }`}
            >
              {activeMode === "hydrotest"
                ? inputs.unitSystem === "imperial"
                  ? "Max Allowable Test (psi)"
                  : "Max Allowable Test (bar)"
                : inputs.unitSystem === "imperial"
                  ? "Ambient −29…100 °F · c = 0.125 in"
                  : "Ambient −29…38 °C · c = 3.0 mm"}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {activeMode === "hydrotest"
              ? "Max allowable hydrotest pressure for each plate thickness. Green = meets your entered test pressure."
              : "Blue highlight = selected flange (NPS × Class) loaded into inputs — not your custom-P plate. Cell plates are sized at full Class ambient rating (Group 1.1). Your custom operating recommendation is shown above and in the note below."}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`rounded px-2 py-0.5 text-xs font-semibold transition-all ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {activeMode === "hydrotest" ? "Pressure Capability Table" : "Matrix Table"}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("curve")}
            className={`rounded px-2 py-0.5 text-xs font-semibold transition-all ${
              viewMode === "curve"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {activeMode === "hydrotest" ? "Pressure Curve" : "Growth Curve"}
          </button>
        </div>
      </div>

      {/* VIEW 1: TABLE */}
      {viewMode === "table" ? (
        activeMode === "hydrotest" ? (
          /* Hydrotest Testing Blind Table (첨부 이미지 형태: Plate Thickness (T) vs NPS -> Max Allowable Test Pressure in bar) */
          <div className="w-full overflow-x-auto">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium">
                Current Input:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {currentNps}&quot;
                </strong>{" "}
                | Test Pressure:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {formatPressureBarDual(currentPressBar, inputs.unitSystem)}
                </strong>{" "}
                ({inputs.designPressure}{" "}
                {inputs.unitSystem === "metric" ? "MPa" : "psi"})
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-5 rounded border-2 border-emerald-600 bg-emerald-200/90 shadow-xs dark:border-emerald-400 dark:bg-emerald-600/40" />
                  <span className="font-semibold text-emerald-800 dark:text-emerald-200">Recommended (Min Safe)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-emerald-400 bg-emerald-100 dark:bg-emerald-950/60" />
                  <span>Safe (P_allowable ≥ P_test)</span>
                </span>
              </div>
            </div>
            <table className="w-full min-w-[650px] border-collapse text-center text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  <th className="sticky left-0 z-20 bg-slate-100 py-2 px-2.5 text-left font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    Plate (T)
                  </th>
                  {hydroPressureTableData.npsColumns.map(({ nps, label }) => (
                    <th
                      key={nps}
                      className={`py-2 px-1.5 font-bold ${
                        currentNps === nps
                          ? "bg-emerald-100/90 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(() => {
                  const minSafeKey = hydroPressureTableData.rows.find(
                    ({ pressByNps }) =>
                      (pressByNps[currentNps] ?? 0) >= currentPressBar &&
                      currentPressBar > 0,
                  )?.key;

                  return hydroPressureTableData.rows.map(
                    ({ key, tMm, label, pressByNps }) => {
                      const isMinSafeRow = key === minSafeKey;

                      return (
                        <tr
                          key={key}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                            isMinSafeRow
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                              : ""
                          }`}
                        >
                          <td
                            className={`sticky left-0 z-10 py-1.5 px-2.5 text-left font-bold transition-all ${
                              isMinSafeRow
                                ? "border-l-4 border-emerald-600 bg-emerald-100/90 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-900/60 dark:text-emerald-100"
                                : "bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200"
                            }`}
                          >
                            {label}
                            {isMinSafeRow && (
                              <span className="ml-1.5 rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-extrabold text-white dark:bg-emerald-500">
                                REC
                              </span>
                            )}
                          </td>
                          {hydroPressureTableData.npsColumns.map(({ nps }) => {
                            const pBar = pressByNps[nps];
                            const isColSelected = currentNps === nps;
                            const isSafe =
                              pBar >= currentPressBar && currentPressBar > 0;
                            const isRecommendedCell =
                              isColSelected && isMinSafeRow;
                            const displayP =
                              inputs.unitSystem === "imperial"
                                ? pBar * BAR_TO_PSI
                                : pBar;

                            return (
                              <td
                                key={nps}
                                onClick={() =>
                                  onSelectCell?.(nps, currentClass)
                                }
                                className={`cursor-pointer py-1.5 px-1.5 text-[11px] transition-all ${
                                  isRecommendedCell
                                    ? "relative z-10 bg-emerald-200/90 font-black text-emerald-950 shadow-xs ring-2 ring-inset ring-emerald-600 dark:bg-emerald-800/90 dark:text-emerald-50 dark:ring-emerald-400"
                                    : isColSelected
                                      ? isSafe
                                        ? "bg-emerald-100/70 font-semibold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200"
                                        : "bg-slate-100/60 text-slate-400 dark:bg-slate-800/30 dark:text-slate-500"
                                      : isSafe
                                        ? "bg-slate-50/80 font-medium text-slate-800 dark:bg-slate-800/30 dark:text-slate-200"
                                        : "text-slate-400 dark:text-slate-500"
                                }`}
                                title={`NPS ${nps}": Max Test Pressure ${formatPressureBarDual(pBar, inputs.unitSystem)} for ${label}${
                                  isRecommendedCell
                                    ? " (Recommended Minimum Safe Plate)"
                                    : ""
                                }`}
                              >
                                {displayP >= 1000
                                  ? displayP.toFixed(0)
                                  : displayP >= 100
                                    ? displayP.toFixed(1)
                                    : displayP.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    },
                  );
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          /* Permanent Design Matrix (NPS vs Class Rating) */
          <div className="w-full space-y-2">
            {(() => {
              const selectedRow = classMatrixData.find(
                (row) => row.nps === currentNps,
              );
              const selectedKey = `class${currentClass}` as keyof NonNullable<
                typeof selectedRow
              >;
              const selectedCell = selectedRow
                ? (selectedRow[selectedKey] as
                    | { plate: string; label: string; plateNum: number; tm: number }
                    | undefined)
                : undefined;
              const customPlate = customRecommendation.plate.label;
              const matrixPlate = selectedCell?.label;
              const platesDiffer =
                selectedCell != null &&
                customPlate !== matrixPlate &&
                Number.isFinite(customRecommendation.tm) &&
                customRecommendation.tm > 0;

              return (
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-[11px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                  <p>
                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                      Blue cell = selected flange
                    </span>{" "}
                    ({currentNps}&quot; #{currentClass}) — click loads NPS/Class into
                    inputs. Plate in that cell is for{" "}
                    <span className="font-medium">
                      full Class ambient rating
                    </span>
                    {selectedCell
                      ? ` → ${matrixPlate} (t_m ${selectedCell.tm} ${
                          inputs.unitSystem === "imperial" ? "in" : "mm"
                        })`
                      : ""}
                    .
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      Custom operating recommendation
                    </span>{" "}
                    (your P above):{" "}
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {customPlate}
                    </span>{" "}
                    at t_m = {customRecommendation.tmLabel}.
                    {platesDiffer ? (
                      <span className="mt-0.5 block text-amber-800 dark:text-amber-200">
                        Differs from the selected matrix cell because custom P ≠
                        Class ambient rating pressure — both values are correct
                        for their purpose.
                      </span>
                    ) : null}
                  </p>
                </div>
              );
            })()}
            <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[580px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60">
                  <th className="sticky left-0 z-20 bg-slate-50 py-2.5 px-3 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    NPS
                  </th>
                  <th className="py-2.5 px-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    RF (d) [{inputs.unitSystem === "imperial" ? "in" : "mm"}]
                  </th>
                  {CLASSES.map((cls) => (
                    <th
                      key={cls}
                      className={`py-2.5 px-2.5 text-center font-semibold ${
                        currentClass === cls
                          ? "bg-blue-50/70 font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      #{cls}
                      <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500">
                        {formatClassPressureLabel(
                          AMBIENT_PRESSURES_MPA[cls],
                          inputs.unitSystem,
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {classMatrixData.map((row) => {
                  const isRowActive = currentNps === row.nps;
                  return (
                    <tr
                      key={row.nps}
                      className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                        isRowActive
                          ? "bg-blue-50/40 font-medium dark:bg-blue-950/20"
                          : ""
                      }`}
                    >
                      <td
                        className={`sticky left-0 z-10 py-2 px-3 font-bold text-slate-800 dark:text-slate-200 ${
                          isRowActive
                            ? "bg-blue-50 dark:bg-blue-950/40"
                            : "bg-white dark:bg-slate-900"
                        }`}
                      >
                        {row.npsLabel}
                      </td>
                      <td className="py-2 px-2.5 text-slate-500 dark:text-slate-400">
                        {inputs.unitSystem === "imperial"
                          ? `${(row.rfDiaMm / 25.4).toFixed(2)}"`
                          : `${row.rfDiaMm} mm`}
                      </td>

                      {CLASSES.map((cls) => {
                        const key = `class${cls}` as keyof typeof row;
                        const cell = row[key] as {
                          tm: number;
                          plate: string;
                          label: string;
                        };
                        const isCellActive =
                          isRowActive && currentClass === cls;

                        return (
                          <td
                            key={cls}
                            onClick={() => onSelectCell?.(row.nps, cls)}
                            className={`cursor-pointer py-1.5 px-2 text-center transition-all ${
                              isCellActive
                                ? "rounded bg-blue-600 font-bold text-white shadow-sm dark:bg-blue-500"
                                : "text-slate-700 hover:bg-blue-100/60 dark:text-slate-300 dark:hover:bg-blue-900/40"
                            }`}
                            title={`Selected flange ${row.npsLabel} Class ${cls}# at ambient rating → ${cell.label} (t_m ${cell.tm} ${inputs.unitSystem === "imperial" ? "in" : "mm"}). Custom-P plate is listed above the table.`}
                          >
                            <div className="leading-tight">
                              <span
                                className={
                                  isCellActive
                                    ? "text-white"
                                    : "font-bold text-slate-900 dark:text-white"
                                }
                              >
                                {cell.plate}
                              </span>
                              {isCellActive ? (
                                <span className="mt-0.5 block text-[9px] font-extrabold uppercase tracking-wide text-blue-100">
                                  Selected
                                </span>
                              ) : (
                                <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                                  ({cell.tm}{" "}
                                  {inputs.unitSystem === "imperial"
                                    ? "in"
                                    : "mm"}
                                  )
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )
      ) : (
        /* VIEW 2: VISUAL CHART */
        <div className="pt-2">
          {activeMode === "hydrotest" ? (
            /* Hydrotest Pressure Capacity Curve */
            <svg viewBox="0 0 540 220" className="h-auto w-full">
              <rect x="50" y="15" width="470" height="175" fill="none" stroke="var(--spec-border)" strokeWidth="0.8" />
              <line x1="50" y1="60" x2="520" y2="60" stroke="var(--spec-border)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="50" y1="105" x2="520" y2="105" stroke="var(--spec-border)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="50" y1="150" x2="520" y2="150" stroke="var(--spec-border)" strokeDasharray="3 3" opacity="0.6" />

              {/* Y Axis Labels (bar) */}
              <text x="42" y="193" textAnchor="end" className="text-[10px] fill-slate-400">0</text>
              <text x="42" y="153" textAnchor="end" className="text-[10px] fill-slate-400">100 bar</text>
              <text x="42" y="108" textAnchor="end" className="text-[10px] fill-slate-400">250 bar</text>
              <text x="42" y="63" textAnchor="end" className="text-[10px] fill-slate-400">500 bar</text>
              <text x="42" y="20" textAnchor="end" className="text-[10px] fill-slate-400">800 bar</text>

              {/* 12T, 25T, 40T, 60T Plate Curves */}
              {[12, 25, 40, 60].map((tVal, tIdx) => {
                const colors = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
                const pts = hydroPressureTableData.npsColumns.map(({ nps, rfDia }, idx) => {
                  const pBar = computeMaxTestPressureBar(tVal, rfDia);
                  const yNorm = Math.min(180, (pBar / 800) * 170);
                  return `${60 + idx * 38},${190 - yNorm}`;
                });
                return (
                  <polyline
                    key={tVal}
                    fill="none"
                    stroke={colors[tIdx]}
                    strokeWidth="2"
                    points={pts.join(" ")}
                  />
                );
              })}

              {/* X Axis Labels */}
              {hydroPressureTableData.npsColumns.map((d, i) => (
                <text key={d.nps} x={60 + i * 38} y="206" textAnchor="middle" className="text-[9px] fill-slate-500 font-medium">
                  {d.label}
                </text>
              ))}
            </svg>
          ) : (
            /* Permanent Mode Growth Curve */
            <svg viewBox="0 0 540 220" className="h-auto w-full">
              <rect x="50" y="15" width="470" height="175" fill="none" stroke="var(--spec-border)" strokeWidth="0.8" />
              <line x1="50" y1="60" x2="520" y2="60" stroke="var(--spec-border)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="50" y1="105" x2="520" y2="105" stroke="var(--spec-border)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="50" y1="150" x2="520" y2="150" stroke="var(--spec-border)" strokeDasharray="3 3" opacity="0.6" />

              <text x="42" y="193" textAnchor="end" className="text-[10px] fill-slate-400">0</text>
              <text x="42" y="153" textAnchor="end" className="text-[10px] fill-slate-400">30T</text>
              <text x="42" y="108" textAnchor="end" className="text-[10px] fill-slate-400">60T</text>
              <text x="42" y="63" textAnchor="end" className="text-[10px] fill-slate-400">90T</text>
              <text x="42" y="20" textAnchor="end" className="text-[10px] fill-slate-400">120T</text>

              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                points={classMatrixData.map((d, i) => `${60 + i * 38},${190 - (d.class150.plateNum / 130) * 170}`).join(" ")}
              />
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                points={classMatrixData.map((d, i) => `${60 + i * 38},${190 - (d.class300.plateNum / 130) * 170}`).join(" ")}
              />
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                points={classMatrixData.map((d, i) => `${60 + i * 38},${190 - (d.class600.plateNum / 130) * 170}`).join(" ")}
              />
              <polyline
                fill="none"
                stroke="#ec4899"
                strokeWidth="2"
                points={classMatrixData.map((d, i) => `${60 + i * 38},${190 - (d.class1500.plateNum / 130) * 170}`).join(" ")}
              />

              {classMatrixData.map((d, i) => (
                <text key={d.nps} x={60 + i * 38} y="206" textAnchor="middle" className="text-[9px] fill-slate-500 font-medium">
                  {d.npsLabel}
                </text>
              ))}
            </svg>
          )}

          {/* Curve Legends */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
            {activeMode === "hydrotest" ? (
              <div className="flex flex-wrap items-center justify-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-300">12T Plate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-full bg-blue-500" />
                  <span className="text-slate-600 dark:text-slate-300">25T Plate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-full bg-purple-500" />
                  <span className="text-slate-600 dark:text-slate-300">40T Plate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-full bg-pink-500" />
                  <span className="text-slate-600 dark:text-slate-300">60T Plate</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-full bg-sky-400" />
                  <span className="text-slate-600 dark:text-slate-300">Class 150#</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-full bg-blue-500" />
                  <span className="text-slate-600 dark:text-slate-300">Class 300#</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-full bg-indigo-500" />
                  <span className="text-slate-600 dark:text-slate-300">Class 600#</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-full bg-pink-500" />
                  <span className="text-slate-600 dark:text-slate-300">Class 1500#</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Notes */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>
          Basis: {activeMode === "hydrotest" ? "ASME B31.3 / UG-34 Ambient Test (S=138 MPa, c=0mm)" : "ASTM A516 Gr. 70, ASME UG-34 (c=3.0mm, E=1.00)"}
        </span>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {activeMode === "hydrotest"
            ? "Table values show: Maximum Allowable Hydrotest Pressure (bar)"
            : "Table values show: Recommended Plate Stock (tm required)"}
        </span>
      </div>
    </div>
  );
}
