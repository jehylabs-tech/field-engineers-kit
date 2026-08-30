"use client";

import { useMemo, useState } from "react";
import type { BlindDesignMode, BlindFlangeInputs } from "@/lib/calculators/engines/blind-flange";
import { getRecommendedCommercialPlate } from "@/lib/calculators/engines/blind-flange";
import { getFlangeDimensionEntry } from "@/lib/data/loaders";

type BlindThicknessMatrixChartProps = {
  inputs: BlindFlangeInputs;
  onSelectCell?: (nps: string, pressureClass: string, pressureVal?: number) => void;
};

// Standard test pressures Pt = 1.5 × Ambient Rating (MPa)
const HYDRO_PRESSURES: Record<string, number> = {
  "150": 2.93,
  "300": 7.71,
  "600": 15.32,
  "900": 23.01,
  "1500": 38.31,
  "2500": 63.85,
};

// Design pressures P at ~150°C (MPa)
const DESIGN_PRESSURES: Record<string, number> = {
  "150": 1.58,
  "300": 4.14,
  "600": 8.27,
  "900": 12.41,
  "1500": 20.68,
  "2500": 34.47,
};

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

const CLASSES = ["150", "300", "600", "900", "1500", "2500"] as const;

// Common plate thicknesses (T in mm) used in hydrotest blind tables
const HYDRO_PLATE_THICKNESSES = [
  6, 8, 10, 12, 16, 19, 22, 25, 28, 30, 32, 35, 38, 40, 45, 50, 60, 70, 80, 100,
];

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
    plate: unitSystem === "imperial" ? `${rec.value}"` : `${rec.value}T`,
    plateNum: rec.value,
    label: unitSystem === "imperial" ? `${rec.value} in` : `${rec.value} mm (${rec.value}T)`,
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
  const currentPress = inputs.designPressure; // MPa or psi depending on unitSystem

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
      activeMode === "hydrotest" ? HYDRO_PRESSURES : DESIGN_PRESSURES;

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

  // Data for Mode 2: Hydrotest Pressure Capability Matrix (Plate Thickness T vs Pipe NPS -> Max Allowable Pressure in bar)
  const hydroPressureTableData = useMemo(() => {
    const npsColumns = MATRIX_NPS_LIST.map(({ nps, label }) => {
      const entry = getFlangeDimensionEntry(nps, "150");
      const rfDia =
        entry?.rating.raisedFaceDiameterMm ??
        FALLBACK_RF_DIAMETERS[nps] ??
        100;
      return { nps, label, rfDia };
    });

    const rows = HYDRO_PLATE_THICKNESSES.map((t) => {
      const pressByNps: Record<string, number> = {};
      npsColumns.forEach(({ nps, rfDia }) => {
        const pBar = computeMaxTestPressureBar(t, rfDia, currentStressMpa, currentWeldEff);
        pressByNps[nps] = pBar;
      });
      return {
        t,
        pressByNps,
      };
    });

    return { npsColumns, rows };
  }, [currentStressMpa, currentWeldEff]);

  return (
    <div className="w-full">
      {/* Header & Controls */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 md:text-sm">
              {activeMode === "hydrotest"
                ? "Hydrotest Pressure Rating by Plate Thickness (Testing Blind Table)"
                : "Permanent Blind Thickness Matrix & Rating Chart"}
            </h3>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold md:text-[11px] ${
                activeMode === "hydrotest"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
              }`}
            >
              {activeMode === "hydrotest"
                ? "Max Allowable Test (bar)"
                : "Permanent Design (c=3.0mm)"}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {activeMode === "hydrotest"
              ? "Max allowable hydrotest pressure (bar) for each plate thickness. Green highlighted cells withstand your test pressure."
              : "Click any cell to load NPS & Class. Active selection is highlighted in blue."}
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
                Current Input: <strong className="text-emerald-600 dark:text-emerald-400">{currentNps}&quot;</strong> | Test Pressure: <strong className="text-emerald-600 dark:text-emerald-400">{currentPressBar.toFixed(1)} bar</strong> ({inputs.designPressure} {inputs.unitSystem === "metric" ? "MPa" : "psi"})
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
                  <th className="py-2 px-2.5 text-left font-bold text-slate-700 dark:text-slate-200">
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
                  // Find the minimum safe thickness t for the currently selected NPS
                  const minSafeThickness = hydroPressureTableData.rows.find(
                    ({ pressByNps }) => (pressByNps[currentNps] ?? 0) >= currentPressBar && currentPressBar > 0
                  )?.t;

                  return hydroPressureTableData.rows.map(({ t, pressByNps }) => {
                    const isMinSafeRow = t === minSafeThickness;

                    return (
                      <tr
                        key={t}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                          isMinSafeRow ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                        }`}
                      >
                        <td
                          className={`py-1.5 px-2.5 text-left font-bold transition-all ${
                            isMinSafeRow
                              ? "bg-emerald-100/90 text-emerald-950 border-l-4 border-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-100 dark:border-emerald-400"
                              : "text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/40"
                          }`}
                        >
                          {inputs.unitSystem === "imperial"
                            ? `${(t / 25.4).toFixed(3)}" (${t}T)`
                            : `${t} mm (${t}T)`}
                          {isMinSafeRow && (
                            <span className="ml-1.5 rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-extrabold text-white dark:bg-emerald-500">
                              REC
                            </span>
                          )}
                        </td>
                        {hydroPressureTableData.npsColumns.map(({ nps }) => {
                          const pBar = pressByNps[nps];
                          const isColSelected = currentNps === nps;
                          const isSafe = pBar >= currentPressBar && currentPressBar > 0;
                          const isRecommendedCell = isColSelected && isMinSafeRow;

                          return (
                            <td
                              key={nps}
                              onClick={() => onSelectCell?.(nps, currentClass)}
                              className={`cursor-pointer py-1.5 px-1.5 text-[11px] transition-all ${
                                isRecommendedCell
                                  ? "relative z-10 bg-emerald-200/90 font-black text-emerald-950 ring-2 ring-emerald-600 ring-inset shadow-xs dark:bg-emerald-800/90 dark:text-emerald-50 dark:ring-emerald-400"
                                  : isColSelected
                                    ? isSafe
                                      ? "bg-emerald-100/70 font-semibold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200"
                                      : "bg-slate-100/60 text-slate-400 dark:bg-slate-800/30 dark:text-slate-500"
                                    : isSafe
                                      ? "bg-slate-50/80 font-medium text-slate-800 dark:bg-slate-800/30 dark:text-slate-200"
                                      : "text-slate-400 dark:text-slate-500"
                              }`}
                              title={`NPS ${nps}": Max Test Pressure ${pBar.toFixed(1)} bar for ${t}T plate${
                                isRecommendedCell ? " (Recommended Minimum Safe Plate)" : ""
                              }`}
                            >
                              {pBar >= 1000
                                ? pBar.toFixed(0)
                                : pBar >= 100
                                  ? pBar.toFixed(1)
                                  : pBar.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          /* Permanent Design Matrix (NPS vs Class Rating) */
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[580px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60">
                  <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200">
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
                        {DESIGN_PRESSURES[cls]} MPa
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
                          ? "bg-blue-50/40 dark:bg-blue-950/20 font-medium"
                          : ""
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {row.npsLabel}
                      </td>
                      <td className="py-2 px-2.5 text-slate-500 dark:text-slate-400">
                        {inputs.unitSystem === "imperial"
                          ? `${(row.rfDiaMm / 25.4).toFixed(2)}"`
                          : `${row.rfDiaMm} mm`}
                      </td>

                      {CLASSES.map((cls) => {
                        const key = `class${cls}` as keyof typeof row;
                        const cell = row[key] as { tm: number; plate: string };
                        const isCellActive = isRowActive && currentClass === cls;

                        return (
                          <td
                            key={cls}
                            onClick={() => onSelectCell?.(row.nps, cls)}
                            className={`cursor-pointer py-1.5 px-2 text-center transition-all ${
                              isCellActive
                                ? "bg-blue-600 text-white font-bold rounded shadow-sm dark:bg-blue-500"
                                : "hover:bg-blue-100/60 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-300"
                            }`}
                            title={`Click to select NPS ${row.npsLabel} Class ${cls}# (Std tm = ${cell.tm} ${inputs.unitSystem === "imperial" ? "in" : "mm"})`}
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
                              <span
                                className={`block text-[10px] ${
                                  isCellActive
                                    ? "text-blue-100"
                                    : "text-slate-400 dark:text-slate-500"
                                }`}
                              >
                                ({cell.tm} {inputs.unitSystem === "imperial" ? "in" : "mm"})
                              </span>
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
