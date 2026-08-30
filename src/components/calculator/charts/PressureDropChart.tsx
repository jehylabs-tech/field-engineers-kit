"use client";

import { useMemo } from "react";
import ChartFrame, {
  CHART,
  mapX,
  mapY,
} from "@/components/calculator/charts/ChartFrame";
import {
  computePressureDrop,
  type PressureDropInputs,
} from "@/lib/calculators/engines/pressure-drop";

type PressureDropChartProps = {
  inputs: PressureDropInputs;
};

export default function PressureDropChart({ inputs }: PressureDropChartProps) {
  const samples = useMemo(() => {
    const qNow = inputs.flow > 0 ? inputs.flow : 1;
    const qs = [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6].map((factor) => qNow * factor);
    return qs.map((flow) => {
      const result = computePressureDrop({ ...inputs, flow });
      return { flow, dp: result?.dpBar ?? 0 };
    });
  }, [inputs]);

  const current = computePressureDrop(inputs);
  if (!current) {
    return (
      <ChartFrame title="ΔP vs flow" legend="Enter flow, pipe, and length to plot Darcy–Weisbach drop.">
        <div className="h-24 rounded-md bg-spec-bg" />
      </ChartFrame>
    );
  }

  const xMax = samples[samples.length - 1]?.flow || inputs.flow;
  const yMax = Math.max(1.15, current.dpBar * 1.35, ...samples.map((row) => row.dp));
  const points = samples
    .map((row) => `${mapX(row.flow, 0, xMax)},${mapY(row.dp, 0, yMax)}`)
    .join(" ");
  const limitY = mapY(1, 0, yMax);
  const bottom = mapY(0, 0, yMax);
  const plotLeft = CHART.left;
  const plotRight = mapX(xMax, 0, xMax);
  const risky = current.dpBar > 1;
  const opX = mapX(inputs.flow, 0, xMax);
  const opY = mapY(current.dpBar, 0, yMax);
  const flowUnit =
    inputs.flowUnit === "gpm" ? "GPM" : inputs.flowUnit === "kgh" ? "kg/h" : "m³/h";

  return (
    <ChartFrame
      title="Friction drop vs flow"
      legend={`Green below 1 bar total ΔP. Red zone is the field warning used on this page. Operating point ${current.dpBar.toFixed(3)} bar.`}
    >
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Pressure drop versus flow with 1 bar warning"
      >
        <rect
          x={plotLeft}
          y={limitY}
          width={plotRight - plotLeft}
          height={bottom - limitY}
          fill="var(--spec-success-bg)"
        />
        <rect
          x={plotLeft}
          y={CHART.top}
          width={plotRight - plotLeft}
          height={Math.max(0, limitY - CHART.top)}
          fill="var(--spec-danger-bg)"
        />
        <line
          x1={plotLeft}
          y1={limitY}
          x2={plotRight}
          y2={limitY}
          stroke="var(--spec-danger)"
          strokeDasharray="4 3"
        />
        <polyline fill="none" stroke="var(--spec-text)" strokeWidth="1.6" points={points} />
        <circle
          cx={opX}
          cy={opY}
          r="5"
          fill={risky ? "var(--spec-danger)" : "var(--spec-success)"}
          stroke="var(--spec-bg)"
          strokeWidth="2"
        />
        <text x={plotLeft} y={CHART.height - 8} fill="var(--spec-text3)" fontSize="10">
          Q ({flowUnit})
        </text>
        <text x={plotRight - 36} y={limitY - 4} fill="var(--spec-danger)" fontSize="10">
          1 bar
        </text>
      </svg>
    </ChartFrame>
  );
}
