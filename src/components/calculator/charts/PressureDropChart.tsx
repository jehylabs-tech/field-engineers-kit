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

  const dynamicLimit = Math.max(0.5, current.dpBar * 0.8); // Dynamic threshold based on current point
  const dynamicLimitY = mapY(dynamicLimit, 0, yMax);

  return (
    <ChartFrame
      title="Friction drop vs flow"
      legend={`Operating point: ${current.dpBar.toFixed(3)} bar at ${inputs.flow} ${flowUnit}. Hover for values.`}
    >
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Pressure drop versus flow curve with operating point"
      >
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="15" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 15" fill="none" stroke="var(--spec-border)" strokeWidth="0.5" opacity="0.3"/>
          </pattern>
        </defs>
        <rect x={plotLeft} y={CHART.top} width={plotRight - plotLeft} height={bottom - CHART.top} fill="url(#grid)"/>
        
        {/* Background zones */}
        <rect
          x={plotLeft}
          y={dynamicLimitY}
          width={plotRight - plotLeft}
          height={bottom - dynamicLimitY}
          fill="var(--spec-success-bg)"
          opacity="0.3"
        />
        <rect
          x={plotLeft}
          y={CHART.top}
          width={plotRight - plotLeft}
          height={Math.max(0, dynamicLimitY - CHART.top)}
          fill="var(--spec-warning-bg)"
          opacity="0.3"
        />
        
        {/* Threshold line */}
        <line
          x1={plotLeft}
          y1={dynamicLimitY}
          x2={plotRight}
          y2={dynamicLimitY}
          stroke="var(--spec-warning)"
          strokeDasharray="3 2"
          strokeWidth="1.5"
        />
        
        {/* Main curve */}
        <polyline fill="none" stroke="var(--spec-accent)" strokeWidth="2.5" points={points} />
        
        {/* Operating point */}
        <circle
          cx={opX}
          cy={opY}
          r="6"
          fill={current.dpBar > dynamicLimit ? "var(--spec-warning)" : "var(--spec-success)"}
          stroke="var(--spec-bg)"
          strokeWidth="2.5"
        >
          <title>{`Q: ${inputs.flow} ${flowUnit}, ΔP: ${current.dpBar.toFixed(3)} bar`}</title>
        </circle>
        
        {/* Axis labels */}
        <text x={plotLeft} y={CHART.height - 8} fill="var(--spec-text3)" fontSize="11" fontWeight="500">
          Flow Rate ({flowUnit})
        </text>
        <text 
          x={12} 
          y={CHART.top + 40} 
          fill="var(--spec-text3)" 
          fontSize="11" 
          fontWeight="500"
          transform={`rotate(-90, 12, ${CHART.top + 40})`}
        >
          ΔP (bar)
        </text>
        
        {/* Value labels */}
        <text x={plotRight - 60} y={dynamicLimitY - 4} fill="var(--spec-warning)" fontSize="10" fontWeight="600">
          {dynamicLimit.toFixed(1)} bar
        </text>
        <text x={opX + 8} y={opY - 8} fill="var(--spec-text)" fontSize="10" fontWeight="600">
          {current.dpBar.toFixed(3)}
        </text>
      </svg>
    </ChartFrame>
  );
}
