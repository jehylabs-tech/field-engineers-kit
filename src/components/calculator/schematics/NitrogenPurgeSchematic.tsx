"use client";

import SchematicFrame from "@/components/calculator/schematics/SchematicFrame";

type NitrogenPurgeSchematicProps = {
  geometryType: "piping" | "vessel" | "custom-volume";
  methodLabel: string;
  /** Residual O₂ fraction 0–1 for fill indicator (target/initial scale). */
  oxygenFraction: number;
  volumeLabel: string;
  o2Label: string;
  n2Label: string;
};

/** Side-view purge schematic: N₂ sweep displacing O₂ toward vent. */
export default function NitrogenPurgeSchematic({
  geometryType,
  methodLabel,
  oxygenFraction,
  volumeLabel,
  o2Label,
  n2Label,
}: NitrogenPurgeSchematicProps) {
  const f = Math.min(1, Math.max(0, oxygenFraction));
  const isPipe = geometryType === "piping";
  const titleGeom =
    geometryType === "piping"
      ? "piping"
      : geometryType === "vessel"
        ? "vessel"
        : "custom volume";

  return (
    <SchematicFrame
      title={`N₂ purge · ${titleGeom} · ${methodLabel}`}
      size="large"
      caption="NFPA 69 Ch.7 screening — dilution / pressure / vacuum inerting (continuous O₂ monitoring required)."
    >
      <svg
        viewBox="0 0 420 240"
        className="h-full w-full max-w-full"
        role="img"
        aria-label={`${titleGeom} nitrogen purge diagram, ${methodLabel}, system ${volumeLabel}, oxygen ${o2Label}, nitrogen ${n2Label}`}
      >
        <title>
          {`Nitrogen purge — ${titleGeom}, ${methodLabel}, V ${volumeLabel}, O₂ ${o2Label}`}
        </title>
        <defs>
          <linearGradient id="n2-flow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="o2-rem" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0.2" />
          </linearGradient>
          <marker
            id="n2-arrow"
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path
              d="M0,0 L7,3.5 L0,7 Z"
              className="fill-sky-600 dark:fill-sky-400"
            />
          </marker>
        </defs>

        {/* Body */}
        {isPipe ? (
          <rect
            x={70}
            y={70}
            width={280}
            height={80}
            rx={8}
            className="fill-slate-100 stroke-slate-600 dark:fill-spec-bg dark:stroke-slate-300"
            strokeWidth="2"
          />
        ) : (
          <rect
            x={110}
            y={50}
            width={200}
            height={120}
            rx={geometryType === "vessel" ? 40 : 6}
            className="fill-slate-100 stroke-slate-600 dark:fill-spec-bg dark:stroke-slate-300"
            strokeWidth="2"
          />
        )}

        {/* Remaining O₂ band (right → shrinks as purged) */}
        <rect
          x={isPipe ? 70 + 280 * (1 - f) : 110 + 200 * (1 - f)}
          y={isPipe ? 70 : 50}
          width={(isPipe ? 280 : 200) * f}
          height={isPipe ? 80 : 120}
          fill="url(#o2-rem)"
          opacity={0.85}
        />

        {/* N₂ inlet arrow */}
        <line
          x1={30}
          y1={110}
          x2={68}
          y2={110}
          className="stroke-sky-600 dark:stroke-sky-400"
          strokeWidth="2.5"
          markerEnd="url(#n2-arrow)"
        />
        <text
          x={28}
          y={98}
          className="fill-sky-700 dark:fill-sky-300"
          style={{ fontSize: 11 }}
        >
          N₂ in
        </text>

        {/* Vent */}
        <line
          x1={352}
          y1={110}
          x2={390}
          y2={110}
          className="stroke-orange-600 dark:stroke-orange-400"
          strokeWidth="2.5"
          markerEnd="url(#n2-arrow)"
        />
        <text
          x={355}
          y={98}
          className="fill-orange-700 dark:fill-orange-300"
          style={{ fontSize: 11 }}
        >
          Vent / O₂
        </text>

        <text
          x={210}
          y={28}
          textAnchor="middle"
          className="fill-slate-600 dark:fill-slate-300"
          style={{ fontSize: 11 }}
        >
          V_sys = {volumeLabel}
        </text>
        <text
          x={210}
          y={200}
          textAnchor="middle"
          className="fill-orange-700 dark:fill-orange-300"
          style={{ fontSize: 11 }}
        >
          O₂ {o2Label}
        </text>
        <text
          x={210}
          y={218}
          textAnchor="middle"
          className="fill-sky-700 dark:fill-sky-300"
          style={{ fontSize: 11 }}
        >
          N₂ req. {n2Label}
        </text>
      </svg>
    </SchematicFrame>
  );
}
