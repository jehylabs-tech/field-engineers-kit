"use client";

import SchematicFrame from "@/components/calculator/schematics/SchematicFrame";

type CompressorSchematicProps = {
  p1Label: string;
  p2Label: string;
  t1Label: string;
  t2Label: string;
  rp: number;
  highTemp: boolean;
  highRp: boolean;
  suggestIntercooler: boolean;
};

/** Suction → compressor → discharge with optional intercooler cue. */
export default function CompressorSchematic({
  p1Label,
  p2Label,
  t1Label,
  t2Label,
  rp,
  highTemp,
  highRp,
  suggestIntercooler,
}: CompressorSchematicProps) {
  const warn = highTemp || highRp;
  const titleDuty = `r_p ${rp.toFixed(2)} · ${p1Label} → ${p2Label}`;

  return (
    <SchematicFrame
      title={`Compressor screening · ${titleDuty}`}
      size="large"
      caption={
        suggestIntercooler
          ? "API 617 screening: high T₂ / r_p — consider intercooled multi-stage layout."
          : "GPSA polytropic head & gas power screening — confirm OEM maps / ASME PTC 10."
      }
    >
      <svg
        viewBox="0 0 460 200"
        className="h-full w-full max-w-full"
        role="img"
        aria-label={`Compressor polytropic screening diagram, suction ${p1Label} ${t1Label}, discharge ${p2Label} ${t2Label}, pressure ratio ${rp.toFixed(2)} per GPSA / API 617`}
      >
        <title>
          {`Compressor polytropic — P₁ ${p1Label}, T₁ ${t1Label} → P₂ ${p2Label}, T₂ ${t2Label}`}
        </title>
        <defs>
          <marker
            id="comp-arrow"
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path
              d="M0,0 L7,3.5 L0,7 Z"
              className="fill-slate-600 dark:fill-slate-300"
            />
          </marker>
        </defs>

        {/* Suction nozzle */}
        <rect
          x={20}
          y={70}
          width={70}
          height={50}
          rx={4}
          className="fill-sky-50 stroke-sky-700 dark:fill-sky-950/40 dark:stroke-sky-400"
          strokeWidth="2"
        />
        <text
          x={55}
          y={92}
          textAnchor="middle"
          className="fill-slate-700 dark:fill-slate-200"
          style={{ fontSize: 9, fontWeight: 600 }}
        >
          Suction
        </text>
        <text
          x={55}
          y={106}
          textAnchor="middle"
          className="fill-slate-500 dark:fill-slate-400"
          style={{ fontSize: 8 }}
        >
          {p1Label}
        </text>
        <text
          x={55}
          y={118}
          textAnchor="middle"
          className="fill-slate-500 dark:fill-slate-400"
          style={{ fontSize: 8 }}
        >
          {t1Label}
        </text>

        <line
          x1={90}
          y1={95}
          x2={130}
          y2={95}
          className="stroke-slate-500 dark:stroke-slate-400"
          strokeWidth="2"
          markerEnd="url(#comp-arrow)"
        />

        {/* Compressor body */}
        <ellipse
          cx={175}
          cy={95}
          rx={42}
          ry={48}
          className={
            warn
              ? "fill-amber-50 stroke-amber-600 dark:fill-amber-950/30 dark:stroke-amber-400"
              : "fill-slate-100 stroke-slate-600 dark:fill-spec-bg dark:stroke-slate-300"
          }
          strokeWidth="2"
        />
        <text
          x={175}
          y={90}
          textAnchor="middle"
          className="fill-slate-800 dark:fill-slate-100"
          style={{ fontSize: 10, fontWeight: 700 }}
        >
          Comp
        </text>
        <text
          x={175}
          y={106}
          textAnchor="middle"
          className="fill-slate-600 dark:fill-slate-300"
          style={{ fontSize: 8 }}
        >
          {`r_p ${rp.toFixed(2)}`}
        </text>

        {/* Intercooler stub */}
        {suggestIntercooler ? (
          <>
            <rect
              x={230}
              y={40}
              width={70}
              height={36}
              rx={3}
              className="fill-cyan-50 stroke-cyan-700 dark:fill-cyan-950/40 dark:stroke-cyan-400"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <text
              x={265}
              y={55}
              textAnchor="middle"
              className="fill-cyan-800 dark:fill-cyan-200"
              style={{ fontSize: 8, fontWeight: 600 }}
            >
              Intercooler
            </text>
            <text
              x={265}
              y={68}
              textAnchor="middle"
              className="fill-cyan-700 dark:fill-cyan-300"
              style={{ fontSize: 7 }}
            >
              recommended
            </text>
            <line
              x1={217}
              y1={70}
              x2={230}
              y2={58}
              className="stroke-cyan-600 dark:stroke-cyan-400"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          </>
        ) : null}

        <line
          x1={217}
          y1={95}
          x2={270}
          y2={95}
          className="stroke-slate-500 dark:stroke-slate-400"
          strokeWidth="2"
          markerEnd="url(#comp-arrow)"
        />

        {/* Discharge nozzle */}
        <rect
          x={270}
          y={70}
          width={80}
          height={50}
          rx={4}
          className={
            highTemp
              ? "fill-orange-50 stroke-orange-600 dark:fill-orange-950/40 dark:stroke-orange-400"
              : "fill-rose-50 stroke-rose-700 dark:fill-rose-950/40 dark:stroke-rose-400"
          }
          strokeWidth="2"
        />
        <text
          x={310}
          y={92}
          textAnchor="middle"
          className="fill-slate-700 dark:fill-slate-200"
          style={{ fontSize: 9, fontWeight: 600 }}
        >
          Discharge
        </text>
        <text
          x={310}
          y={106}
          textAnchor="middle"
          className="fill-slate-500 dark:fill-slate-400"
          style={{ fontSize: 8 }}
        >
          {p2Label}
        </text>
        <text
          x={310}
          y={118}
          textAnchor="middle"
          className="fill-slate-500 dark:fill-slate-400"
          style={{ fontSize: 8 }}
        >
          {t2Label}
        </text>

        {/* Stage cue */}
        <text
          x={400}
          y={100}
          textAnchor="middle"
          className={
            highRp
              ? "fill-amber-700 dark:fill-amber-300"
              : "fill-slate-500 dark:fill-slate-400"
          }
          style={{ fontSize: 9, fontWeight: 600 }}
        >
          {highRp ? "Multi-stage?" : "Single-stage"}
        </text>
      </svg>
    </SchematicFrame>
  );
}
