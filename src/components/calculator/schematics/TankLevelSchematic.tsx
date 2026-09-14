"use client";

import SchematicFrame from "@/components/calculator/schematics/SchematicFrame";

type TankLevelSchematicProps = {
  orientation: "horizontal" | "vertical";
  headType: "flat" | "2to1-ellipsoidal" | "torispherical-klopper" | "hemispherical";
  fillFraction: number;
  /** Prefer dual-unit strings, e.g. `2000 mm · 78.74 in`. */
  diameterLabel: string;
  lengthLabel: string;
  levelLabel: string;
  headLabel: string;
  /** Optional fill % for the caption strip, e.g. `62.6%`. */
  fillPctLabel?: string;
  /** Optional one-head depth dual label. */
  headDepthLabel?: string;
};

function headPath(
  side: "left" | "right" | "bottom" | "top",
  headType: TankLevelSchematicProps["headType"],
  x0: number,
  y0: number,
  span: number,
  depth: number,
): string {
  // Returns an open path from one rim to the other for the head silhouette.
  if (headType === "flat") {
    if (side === "left") return `M ${x0} ${y0} L ${x0} ${y0 + span}`;
    if (side === "right") return `M ${x0} ${y0} L ${x0} ${y0 + span}`;
    if (side === "bottom") return `M ${x0} ${y0} L ${x0 + span} ${y0}`;
    return `M ${x0} ${y0} L ${x0 + span} ${y0}`;
  }

  if (headType === "hemispherical") {
    if (side === "left") {
      return `M ${x0} ${y0} A ${depth} ${span / 2} 0 0 0 ${x0} ${y0 + span}`;
    }
    if (side === "right") {
      return `M ${x0} ${y0} A ${depth} ${span / 2} 0 0 1 ${x0} ${y0 + span}`;
    }
    if (side === "bottom") {
      return `M ${x0} ${y0} A ${span / 2} ${depth} 0 0 0 ${x0 + span} ${y0}`;
    }
    return `M ${x0} ${y0} A ${span / 2} ${depth} 0 0 1 ${x0 + span} ${y0}`;
  }

  // 2:1 SE and F&D — shallower elliptical bulge (F&D slightly shallower)
  const k = headType === "torispherical-klopper" ? 0.72 : 1;
  const d = depth * k;
  if (side === "left") {
    return `M ${x0} ${y0} C ${x0 - d} ${y0 + span * 0.15}, ${x0 - d} ${y0 + span * 0.85}, ${x0} ${y0 + span}`;
  }
  if (side === "right") {
    return `M ${x0} ${y0} C ${x0 + d} ${y0 + span * 0.15}, ${x0 + d} ${y0 + span * 0.85}, ${x0} ${y0 + span}`;
  }
  if (side === "bottom") {
    return `M ${x0} ${y0} C ${x0 + span * 0.15} ${y0 + d}, ${x0 + span * 0.85} ${y0 + d}, ${x0 + span} ${y0}`;
  }
  return `M ${x0} ${y0} C ${x0 + span * 0.15} ${y0 - d}, ${x0 + span * 0.85} ${y0 - d}, ${x0 + span} ${y0}`;
}

/** 2D side-view tank with liquid fill and head silhouette by type. */
export default function TankLevelSchematic({
  orientation,
  headType,
  fillFraction,
  diameterLabel,
  lengthLabel,
  levelLabel,
  headLabel,
  fillPctLabel,
  headDepthLabel,
}: TankLevelSchematicProps) {
  const f = Math.min(1, Math.max(0, fillFraction));
  const isH = orientation === "horizontal";
  const fillNote = fillPctLabel ? ` · fill ${fillPctLabel}` : "";

  return (
    <SchematicFrame
      title={`Tank level · ${isH ? "horizontal" : "vertical"} · ${headLabel}${fillNote}`}
      size="large"
      caption="ASME VIII Div 1 head geometry · API 650 / ISO 7507 level–capacity screening (no internals)."
    >
      <svg
        viewBox="0 0 420 240"
        className="h-full w-full max-w-full"
        role="img"
        aria-label={`${orientation} tank vessel ${headLabel} heads diagram, diameter ${diameterLabel}, length ${lengthLabel}, liquid level ${levelLabel}${fillNote}`}
      >
        <title>
          {`${orientation} tank — ${headLabel}, Di ${diameterLabel}, L ${lengthLabel}, h ${levelLabel}${fillNote}`}
        </title>
        <defs>
          <linearGradient id="tank-liq" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.35" />
          </linearGradient>
          <clipPath id="tank-clip-h">
            <path d="M 70 55 L 350 55 L 350 185 L 70 185 Z" />
          </clipPath>
          <clipPath id="tank-clip-v">
            <path d="M 145 40 L 275 40 L 275 200 L 145 200 Z" />
          </clipPath>
        </defs>

        {isH ? (
          <>
            {/* Liquid fill (shell band) */}
            <rect
              x={70}
              y={185 - 130 * f}
              width={280}
              height={130 * f}
              fill="url(#tank-liq)"
              clipPath="url(#tank-clip-h)"
            />
            {/* Shell rectangle */}
            <rect
              x={70}
              y={55}
              width={280}
              height={130}
              className="fill-none stroke-slate-600 dark:stroke-slate-300"
              strokeWidth="2"
            />
            {/* Left / right heads */}
            <path
              d={headPath("left", headType, 70, 55, 130, 42)}
              className="fill-none stroke-slate-600 dark:stroke-slate-300"
              strokeWidth="2"
            />
            <path
              d={headPath("right", headType, 350, 55, 130, 42)}
              className="fill-none stroke-slate-600 dark:stroke-slate-300"
              strokeWidth="2"
            />
            {/* Level line */}
            <line
              x1={55}
              y1={185 - 130 * f}
              x2={365}
              y2={185 - 130 * f}
              className="stroke-blue-600 dark:stroke-blue-400"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={210}
              y={48}
              textAnchor="middle"
              className="fill-slate-600 dark:fill-slate-300"
              style={{ fontSize: 11 }}
            >
              L = {lengthLabel}
            </text>
            <text
              x={30}
              y={125}
              textAnchor="middle"
              className="fill-slate-600 dark:fill-slate-300"
              style={{ fontSize: 11 }}
              transform="rotate(-90 30 125)"
            >
              Di = {diameterLabel}
            </text>
            <text
              x={380}
              y={185 - 130 * f + 4}
              className="fill-blue-700 dark:fill-blue-300"
              style={{ fontSize: 10 }}
            >
              h = {levelLabel}
            </text>
            {headDepthLabel ? (
              <text
                x={210}
                y={228}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400"
                style={{ fontSize: 10 }}
              >
                Head depth ≈ {headDepthLabel}
              </text>
            ) : null}
          </>
        ) : (
          <>
            <rect
              x={145}
              y={200 - 160 * f}
              width={130}
              height={160 * f}
              fill="url(#tank-liq)"
              clipPath="url(#tank-clip-v)"
            />
            <rect
              x={145}
              y={40}
              width={130}
              height={160}
              className="fill-none stroke-slate-600 dark:stroke-slate-300"
              strokeWidth="2"
            />
            <path
              d={headPath("bottom", headType, 145, 200, 130, 36)}
              className="fill-none stroke-slate-600 dark:stroke-slate-300"
              strokeWidth="2"
            />
            <path
              d={headPath("top", headType, 145, 40, 130, 36)}
              className="fill-none stroke-slate-600 dark:stroke-slate-300"
              strokeWidth="2"
            />
            <line
              x1={130}
              y1={200 - 160 * f}
              x2={290}
              y2={200 - 160 * f}
              className="stroke-blue-600 dark:stroke-blue-400"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={210}
              y={28}
              textAnchor="middle"
              className="fill-slate-600 dark:fill-slate-300"
              style={{ fontSize: 11 }}
            >
              Di = {diameterLabel}
            </text>
            <text
              x={300}
              y={120}
              className="fill-slate-600 dark:fill-slate-300"
              style={{ fontSize: 11 }}
            >
              L = {lengthLabel}
            </text>
            <text
              x={300}
              y={200 - 160 * f + 4}
              className="fill-blue-700 dark:fill-blue-300"
              style={{ fontSize: 10 }}
            >
              h = {levelLabel}
            </text>
            {headDepthLabel ? (
              <text
                x={210}
                y={228}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400"
                style={{ fontSize: 10 }}
              >
                Head depth ≈ {headDepthLabel}
              </text>
            ) : null}
          </>
        )}
      </svg>
    </SchematicFrame>
  );
}
