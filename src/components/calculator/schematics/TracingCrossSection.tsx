"use client";

import SchematicFrame from "@/components/calculator/schematics/SchematicFrame";

type TracingCrossSectionProps = {
  npsLabel: string;
  thicknessLabel: string;
  materialLabel: string;
  tracerLabel: string;
  tracerCount: number;
  steamLabel: string;
  qLabel: string;
};

/** Short label for diagram chrome (full NPS string is long). */
function shortTracerLabel(label: string): string {
  if (label.includes("⅜") || label.includes("0.375")) return "⅜ in";
  if (label.includes("¾") || label.includes("0.75")) return "¾ in";
  return "½ in";
}

/** Pipe + insulation jacket with steam tracer tubes on the pipe OD. */
export default function TracingCrossSection({
  npsLabel,
  thicknessLabel,
  materialLabel,
  tracerLabel,
  tracerCount,
  steamLabel,
  qLabel,
}: TracingCrossSectionProps) {
  const cx = 210;
  const cy = 118;
  const rPipe = 36;
  const rIns = 70;
  const rJacket = 76;
  const rTracer = 7;
  const count = Math.min(Math.max(tracerCount, 1), 6);
  const tracers = Array.from({ length: count }, (_, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    // Sit tracers in the insulation annulus at the pipe OD (under insulation).
    const r = rPipe + rTracer * 0.15;
    return {
      x: cx + r * Math.cos(ang),
      y: cy + r * Math.sin(ang),
    };
  });
  const tracerShort = shortTracerLabel(tracerLabel);

  return (
    <SchematicFrame
      title={`Steam tracing cross-section · ${npsLabel}`}
      size="large"
      caption="ISO 12241 insulated pipe heat loss · saturated steam tracer tubes (bare contact screening)."
    >
      <svg
        viewBox="0 0 420 240"
        className="h-full w-full max-w-full"
        role="img"
        aria-label={`${npsLabel} steam tracing cross-section with ${materialLabel} insulation ${thicknessLabel}, ${count} ${tracerShort} tracer tube${count === 1 ? "" : "s"} at ${steamLabel}, heat loss ${qLabel}`}
      >
        <title>
          {`${npsLabel} steam tracing — ${materialLabel} ${thicknessLabel}, ${count}× ${tracerShort}, ${steamLabel}, Q ${qLabel}`}
        </title>
        <defs>
          <radialGradient id="trc-pipe-fill" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#475569" stopOpacity="0.95" />
          </radialGradient>
          <radialGradient id="trc-wool-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.35" />
          </radialGradient>
        </defs>

        {/* Insulation annulus */}
        <circle
          cx={cx}
          cy={cy}
          r={rJacket}
          className="fill-slate-200/40 stroke-slate-400 dark:fill-slate-700/30 dark:stroke-slate-500"
          strokeWidth="1.5"
        />
        <circle cx={cx} cy={cy} r={rIns} fill="url(#trc-wool-fill)" />
        <circle
          cx={cx}
          cy={cy}
          r={rPipe}
          fill="url(#trc-pipe-fill)"
          className="stroke-slate-600 dark:stroke-slate-300"
          strokeWidth="1.5"
        />
        <circle
          cx={cx}
          cy={cy}
          r={rPipe * 0.55}
          className="fill-slate-100/80 dark:fill-slate-900/50"
        />

        {/* Tracer tubes */}
        {tracers.map((t, i) => (
          <g key={i}>
            <circle
              cx={t.x}
              cy={t.y}
              r={rTracer}
              className="fill-rose-400/90 stroke-rose-700 dark:fill-rose-500/80 dark:stroke-rose-300"
              strokeWidth="1.25"
            />
            <circle
              cx={t.x}
              cy={t.y}
              r={rTracer * 0.35}
              className="fill-rose-100/90 dark:fill-rose-200/40"
            />
          </g>
        ))}

        <text
          x={16}
          y={28}
          className="fill-slate-700 text-[11px] font-semibold dark:fill-slate-200"
        >
          {npsLabel} · {materialLabel} {thicknessLabel}
        </text>
        <text
          x={16}
          y={46}
          className="fill-slate-600 text-[10px] dark:fill-slate-300"
        >
          {count}× {tracerShort} · {steamLabel}
        </text>
        <text
          x={16}
          y={220}
          className="fill-slate-600 text-[10px] dark:fill-slate-300"
        >
          Q_loss {qLabel}
        </text>
      </svg>
    </SchematicFrame>
  );
}
