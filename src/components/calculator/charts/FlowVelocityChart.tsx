"use client";

import ChartFrame, {
  CHART,
  mapX,
  mapY,
} from "@/components/calculator/charts/ChartFrame";
import {
  computeFlowVelocity,
  type FlowVelocityInputs,
} from "@/lib/calculators/engines/flow-velocity";

type FlowVelocityChartProps = {
  inputs: FlowVelocityInputs;
};

export default function FlowVelocityChart({ inputs }: FlowVelocityChartProps) {
  const computed = computeFlowVelocity(inputs);
  if (!computed) {
    return (
      <ChartFrame title="Velocity vs erosion limit" legend="Enter a valid flow and pipe to plot v against API RP 14E vc.">
        <div className="h-24 rounded-md bg-spec-bg" />
      </ChartFrame>
    );
  }

  const { velocity, vc, status } = computed;
  const qNow = inputs.flow;
  const qAtVc = vc > 0 && velocity > 0 ? qNow * (vc / velocity) : qNow * 2;
  const xMax = Math.max(qNow * 1.25, qAtVc * 1.15, 1);
  const yMax = Math.max(vc * 1.25, velocity * 1.15, 1);
  const points: string[] = [];
  for (let q = 0; q <= xMax; q += xMax / 24) {
    const v = qNow > 0 ? (q / qNow) * velocity : 0;
    points.push(`${mapX(q, 0, xMax)},${mapY(v, 0, yMax)}`);
  }

  const vcY = mapY(vc, 0, yMax);
  const warnY = mapY(0.8 * vc, 0, yMax);
  const bottom = mapY(0, 0, yMax);
  const plotLeft = CHART.left;
  const plotRight = mapX(xMax, 0, xMax);
  const opX = mapX(qNow, 0, xMax);
  const opY = mapY(velocity, 0, yMax);
  const color =
    status === "Erosion Risk"
      ? "var(--spec-danger)"
      : status === "Warning"
        ? "var(--spec-spon-text)"
        : "var(--spec-success)";
  const flowUnit = inputs.flowUnit === "gpm" ? "GPM" : "m³/h";

  return (
    <ChartFrame
      title="Mean velocity vs API RP 14E vc"
      legend={`Green under 0.8 vc, amber to vc, red above vc. Operating point ${velocity.toFixed(2)} m/s at ${qNow} ${flowUnit}.`}
    >
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Flow velocity plotted against erosional velocity"
      >
        <rect
          x={plotLeft}
          y={warnY}
          width={plotRight - plotLeft}
          height={bottom - warnY}
          fill="var(--spec-success-bg)"
        />
        <rect
          x={plotLeft}
          y={vcY}
          width={plotRight - plotLeft}
          height={Math.max(0, warnY - vcY)}
          fill="var(--spec-spon-bg)"
        />
        <rect
          x={plotLeft}
          y={CHART.top}
          width={plotRight - plotLeft}
          height={Math.max(0, vcY - CHART.top)}
          fill="var(--spec-danger-bg)"
        />
        <line
          x1={plotLeft}
          y1={vcY}
          x2={plotRight}
          y2={vcY}
          stroke="var(--spec-danger)"
          strokeWidth="1.25"
        />
        <polyline fill="none" stroke="var(--spec-text)" strokeWidth="1.6" points={points.join(" ")} />
        <circle cx={opX} cy={opY} r="5" fill={color} stroke="var(--spec-bg)" strokeWidth="2" />
        <text x={plotLeft} y={CHART.height - 8} fill="var(--spec-text3)" fontSize="10">
          Q ({flowUnit})
        </text>
        <text x={plotRight - 28} y={vcY - 4} fill="var(--spec-danger)" fontSize="10">
          vc
        </text>
      </svg>
    </ChartFrame>
  );
}
