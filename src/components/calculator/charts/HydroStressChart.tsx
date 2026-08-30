"use client";

import ChartFrame, {
  CHART,
  mapX,
  mapY,
} from "@/components/calculator/charts/ChartFrame";
import {
  STRESS_RATIO_MAX,
  resolveStressRatio,
  type HydroTestInputs,
  type TestFluid,
} from "@/lib/calculators/engines/hydro-test";

type HydroStressChartProps = {
  inputs: HydroTestInputs;
};

export default function HydroStressChart({ inputs }: HydroStressChartProps) {
  const multiplier = inputs.testFluid === "pneumatic" ? 1.1 : 1.5;
  const raw =
    Number.isFinite(inputs.stressRatio) && inputs.stressRatio > 0
      ? inputs.stressRatio
      : 1;
  const applied = resolveStressRatio(inputs);
  const capped = raw > STRESS_RATIO_MAX;
  const xMax = Math.max(7, raw * 1.05);
  const yMax = Math.max(multiplier * STRESS_RATIO_MAX, multiplier * raw) * 1.08;
  const xMin = 0;
  const yMin = 0;

  const line: string[] = [];
  for (let x = 0; x <= STRESS_RATIO_MAX; x += 0.25) {
    line.push(`${mapX(x, xMin, xMax)},${mapY(multiplier * x, yMin, yMax)}`);
  }
  line.push(
    `${mapX(xMax, xMin, xMax)},${mapY(multiplier * STRESS_RATIO_MAX, yMin, yMax)}`,
  );

  const opX = mapX(Math.min(raw, xMax), xMin, xMax);
  const opY = mapY(multiplier * applied, yMin, yMax);
  const safeX = mapX(STRESS_RATIO_MAX, xMin, xMax);
  const fillRight = mapX(xMax, xMin, xMax);
  const yBottom = mapY(0, yMin, yMax);
  const yTop = mapY(yMax, yMin, yMax);
  const fluid: TestFluid = inputs.testFluid;
  const pressureUnit = inputs.unitSystem === "metric" ? "MPa" : "psi";

  return (
    <ChartFrame
      title="Test factor vs yield screen"
      legend={`Green zone: St/S ≤ ${STRESS_RATIO_MAX} (yield screen). Red zone: above the field cap. Dot is Pt / P = ${multiplier} × (St/S) for ${fluid} service. Vertical guide marks Cap ${STRESS_RATIO_MAX}.`}
      legendClassName="mt-2 text-xs leading-relaxed text-gray-500 dark:text-slate-400"
    >
      <p className="mb-1.5 text-xs text-gray-500 dark:text-slate-400">
        Test Pressure Pt/P (− · {pressureUnit} scale)
      </p>
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Hydrotest stress ratio versus yield cap ${STRESS_RATIO_MAX}`}
      >
        <rect
          x={CHART.left}
          y={yTop}
          width={Math.max(0, safeX - CHART.left)}
          height={yBottom - yTop}
          fill="var(--spec-success-bg)"
        />
        <rect
          x={safeX}
          y={yTop}
          width={Math.max(0, fillRight - safeX)}
          height={yBottom - yTop}
          fill="var(--spec-danger-bg)"
        />
        <polyline
          fill="none"
          stroke="var(--spec-text2)"
          strokeWidth="1.5"
          points={line.join(" ")}
        />
        <g>
          <title>{`Yield screen cap — St/S = ${STRESS_RATIO_MAX}`}</title>
          <line
            x1={safeX}
            y1={yTop}
            x2={safeX}
            y2={yBottom}
            stroke="var(--spec-danger)"
            strokeWidth="1.75"
            strokeDasharray="4 3"
          />
          <rect
            x={safeX - 22}
            y={yTop + 2}
            width="44"
            height="14"
            rx="3"
            fill="var(--spec-bg)"
            stroke="var(--spec-danger)"
            strokeWidth="0.75"
          />
          <text
            x={safeX}
            y={yTop + 12}
            textAnchor="middle"
            fill="var(--spec-danger)"
            fontSize="9"
            fontWeight="600"
          >
            Cap {STRESS_RATIO_MAX}
          </text>
        </g>
        <circle
          cx={opX}
          cy={opY}
          r="5"
          fill={capped ? "var(--spec-danger)" : "var(--spec-success)"}
          stroke="var(--spec-bg)"
          strokeWidth="2"
        >
          <title>{`Operating point · St/S = ${applied.toFixed(3)} · Pt/P = ${(multiplier * applied).toFixed(2)}`}</title>
        </circle>

        {/* X-axis label */}
        <text
          x={(CHART.left + CHART.width - CHART.right) / 2}
          y={CHART.height - 6}
          textAnchor="middle"
          fill="var(--spec-text3)"
          fontSize="10"
          fontWeight="500"
        >
          Stress Ratio St/S (dimensionless)
        </text>
        <text
          x={CHART.left}
          y={CHART.height - 20}
          fill="var(--spec-text3)"
          fontSize="9"
        >
          0
        </text>
        <text
          x={safeX}
          y={CHART.height - 20}
          textAnchor="middle"
          fill="var(--spec-danger)"
          fontSize="9"
          fontWeight="600"
        >
          {STRESS_RATIO_MAX}
        </text>
      </svg>
    </ChartFrame>
  );
}
