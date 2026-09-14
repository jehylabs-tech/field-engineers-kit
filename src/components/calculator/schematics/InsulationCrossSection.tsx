"use client";

import SchematicFrame from "@/components/calculator/schematics/SchematicFrame";
import type { UnitSystem } from "@/lib/calculators/definitions";

type InsulationCrossSectionProps = {
  npsLabel: string;
  thicknessLabel: string;
  materialLabel: string;
  /** Prefer dual-unit strings, e.g. `29.3 °C · 84.7 °F`. */
  tsLabel: string;
  /** Prefer primary-by-unitSystem with secondary, e.g. `80.1 W/m · 83.3 Btu/hr·ft`. */
  qLabel: string;
  unitSystem?: UnitSystem;
};

/** Radial pipe + insulation jacket cross-section with outward heat-flow arrows. */
export default function InsulationCrossSection({
  npsLabel,
  thicknessLabel,
  materialLabel,
  tsLabel,
  qLabel,
  unitSystem: _unitSystem,
}: InsulationCrossSectionProps) {
  const cx = 210;
  const cy = 118;
  const rPipe = 38;
  const rIns = 72;
  const rJacket = 78;

  return (
    <SchematicFrame
      title={`Insulation cross-section · ${npsLabel}`}
      size="large"
      caption="ASTM C680 / ISO 12241 radial conduction + outer surface convection/radiation screening."
    >
      <svg
        viewBox="0 0 420 240"
        className="h-full w-full max-w-full"
        role="img"
        aria-label={`${npsLabel} piping insulation cross-section diagram with ${materialLabel} jacket, surface temperature ${tsLabel}, heat loss ${qLabel}`}
      >
        <title>
          {`${npsLabel} insulation cross-section — ${materialLabel} ${thicknessLabel}, Ts ${tsLabel}, Q ${qLabel}`}
        </title>
        <defs>
          <marker
            id="ins-heat-arrow"
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path
              d="M0,0 L7,3.5 L0,7 Z"
              className="fill-amber-600 dark:fill-amber-400"
            />
          </marker>
          <radialGradient id="ins-pipe-fill" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#475569" stopOpacity="0.95" />
          </radialGradient>
          <radialGradient id="ins-wool-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.35" />
          </radialGradient>
        </defs>

        {/* Heat arrows (outward) */}
        {[
          { x2: 210, y2: 22 },
          { x2: 340, y2: 60 },
          { x2: 355, y2: 160 },
          { x2: 80, y2: 60 },
          { x2: 65, y2: 160 },
        ].map((tip, i) => (
          <line
            key={i}
            x1={cx + (tip.x2 - cx) * 0.42}
            y1={cy + (tip.y2 - cy) * 0.42}
            x2={tip.x2}
            y2={tip.y2}
            className="stroke-amber-600 dark:stroke-amber-400"
            strokeWidth="1.6"
            markerEnd="url(#ins-heat-arrow)"
          />
        ))}

        {/* Insulation ring */}
        <circle
          cx={cx}
          cy={cy}
          r={rIns}
          fill="url(#ins-wool-fill)"
          className="stroke-amber-700/70 dark:stroke-amber-400/70"
          strokeWidth="1.5"
        />

        {/* Metal jacket */}
        <circle
          cx={cx}
          cy={cy}
          r={rJacket}
          fill="none"
          className="stroke-slate-500 dark:stroke-slate-300"
          strokeWidth="2.5"
        />

        {/* Pipe wall / bore */}
        <circle
          cx={cx}
          cy={cy}
          r={rPipe}
          fill="url(#ins-pipe-fill)"
          className="stroke-slate-800 dark:stroke-slate-100"
          strokeWidth="3"
        />
        <circle
          cx={cx}
          cy={cy}
          r={22}
          className="fill-slate-100 dark:fill-slate-900 stroke-slate-400 dark:stroke-slate-500"
          strokeWidth="1"
        />

        {/* Dimension callouts */}
        <line
          x1={cx}
          y1={cy}
          x2={cx + rPipe}
          y2={cy}
          className="stroke-blue-600 dark:stroke-blue-400"
          strokeWidth="1.2"
          strokeDasharray="3 2"
        />
        <text
          x={cx + 8}
          y={cy - 6}
          className="fill-blue-700 text-[9px] font-semibold dark:fill-blue-300"
        >
          r₁ (OD/2)
        </text>

        <line
          x1={cx}
          y1={cy + 8}
          x2={cx + rIns}
          y2={cy + 8}
          className="stroke-emerald-600 dark:stroke-emerald-400"
          strokeWidth="1.2"
          strokeDasharray="3 2"
        />
        <text
          x={cx + 20}
          y={cy + 22}
          className="fill-emerald-700 text-[9px] font-semibold dark:fill-emerald-300"
        >
          r₂ · t_ins = {thicknessLabel}
        </text>

        <text
          x={cx}
          y={cy + rJacket + 22}
          textAnchor="middle"
          className="fill-slate-700 text-[10px] font-semibold dark:fill-slate-200"
        >
          {materialLabel}
        </text>
        <text
          x={cx}
          y={cy + rJacket + 38}
          textAnchor="middle"
          className="fill-amber-700 text-[10px] font-bold dark:fill-amber-300"
        >
          T_s = {tsLabel}
        </text>
        <text
          x={20}
          y={28}
          className="fill-amber-700 text-[10px] font-semibold dark:fill-amber-300"
        >
          Q → {qLabel}
        </text>
        <text
          x={20}
          y={44}
          className="fill-slate-500 text-[9px] dark:fill-slate-400"
        >
          {npsLabel}
        </text>
      </svg>
    </SchematicFrame>
  );
}
