"use client";

type Props = {
  riseLabel: string;
  runLabel: string;
  angleDeg: number;
  slopeLabel: string;
  invalid?: boolean;
};

/**
 * Side-elevation schematic: run (L), rise (ΔH), angle θ, flow direction.
 */
export default function PipeSlopeDiagram({
  riseLabel,
  runLabel,
  angleDeg,
  slopeLabel,
  invalid,
}: Props) {
  const w = 520;
  const h = 220;
  const pad = { l: 48, r: 28, t: 28, b: 36 };
  const x0 = pad.l;
  const y0 = h - pad.b;
  const runPx = w - pad.l - pad.r - 40;
  const maxRisePx = h - pad.t - pad.b - 24;
  const safeAngle = Number.isFinite(angleDeg)
    ? Math.min(35, Math.max(0.5, angleDeg))
    : 8;
  const risePx = Math.min(
    maxRisePx,
    Math.max(28, runPx * Math.tan((safeAngle * Math.PI) / 180)),
  );
  const x1 = x0 + runPx;
  const y1 = y0 - risePx;

  return (
    <div className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-2 dark:border-spec-border dark:bg-spec-bg">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Pipe slope diagram: run ${runLabel}, rise ${riseLabel}, slope ${slopeLabel}, angle ${Number.isFinite(angleDeg) ? angleDeg.toFixed(2) : "—"} degrees.`}
      >
        <title>{`Pipe slope — ${slopeLabel}`}</title>

        {/* Ground / run baseline */}
        <line
          x1={x0}
          y1={y0}
          x2={x1}
          y2={y0}
          className="stroke-slate-300 dark:stroke-slate-600"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {/* Vertical rise guide */}
        <line
          x1={x1}
          y1={y0}
          x2={x1}
          y2={y1}
          className="stroke-slate-300 dark:stroke-slate-600"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {/* Pipe centerline */}
        <line
          x1={x0}
          y1={y0}
          x2={x1}
          y2={y1}
          className={
            invalid
              ? "stroke-slate-400 dark:stroke-slate-500"
              : "stroke-blue-600 dark:stroke-blue-400"
          }
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* Flow arrow along pipe */}
        {!invalid ? (
          <polygon
            points={`${x0 + runPx * 0.55},${y0 - risePx * 0.55} ${x0 + runPx * 0.55 - 14},${y0 - risePx * 0.55 + 6} ${x0 + runPx * 0.55 - 14},${y0 - risePx * 0.55 - 6}`}
            className="fill-amber-600 dark:fill-amber-400"
            transform={`rotate(${-safeAngle} ${x0 + runPx * 0.55} ${y0 - risePx * 0.55})`}
          />
        ) : null}

        {/* Dimension: Run */}
        <text
          x={(x0 + x1) / 2}
          y={y0 + 22}
          textAnchor="middle"
          className="fill-slate-600 text-[11px] dark:fill-slate-300"
        >
          {`Run L = ${runLabel}`}
        </text>

        {/* Dimension: Rise */}
        <text
          x={x1 + 8}
          y={(y0 + y1) / 2}
          textAnchor="start"
          className="fill-slate-600 text-[11px] dark:fill-slate-300"
        >
          {`ΔH = ${riseLabel}`}
        </text>

        {/* Angle label */}
        <text
          x={x0 + 36}
          y={y0 - 10}
          textAnchor="start"
          className="fill-slate-700 text-[12px] font-semibold dark:fill-slate-200"
        >
          {Number.isFinite(angleDeg) ? `θ = ${angleDeg.toFixed(2)}°` : "θ = —"}
        </text>

        <text
          x={w / 2}
          y={pad.t - 6}
          textAnchor="middle"
          className="fill-slate-500 text-[11px] dark:fill-slate-400"
        >
          {invalid ? "Enter rise & run" : `Slope ${slopeLabel} · flow →`}
        </text>
      </svg>
    </div>
  );
}
