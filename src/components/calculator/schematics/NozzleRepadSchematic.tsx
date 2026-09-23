"use client";

import SchematicFrame from "@/components/calculator/schematics/SchematicFrame";
import {
  DimText,
  EngineeringCanvas,
  HDimension,
  VDimension,
  type SvgIds,
} from "@/components/calculator/schematics/EngineeringSvg";
import {
  schematicClass,
  schematicStroke,
  schematicWidth,
  useSchematicHighlight,
} from "@/components/calculator/schematics/SchematicHighlight";

type NozzleRepadSchematicProps = {
  dLabel: string;
  doutLabel: string;
  dpLabel: string;
  tpLabel: string;
  /** Corroded shell thickness t = t_shell − C.A. */
  tShellLabel?: string;
  pressureLabel: string;
};

function LegendSwatch({
  x,
  y,
  fill,
  stroke,
  label,
}: {
  x: number;
  y: number;
  fill: string;
  stroke: string;
  label: string;
}) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect
        width="12"
        height="12"
        rx="2"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.8}
      />
      <text
        x="18"
        y="10"
        fill="var(--spec-text2)"
        fontSize="11"
        fontFamily="ui-monospace, monospace"
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Axial half-section of shell + nozzle + reinforcing pad (UG-37 / UG-40).
 * Top band = D_p only · mid = d_out / P · bottom = d + legend (no right-side collision).
 */
export default function NozzleRepadSchematic({
  dLabel,
  doutLabel,
  dpLabel,
  tpLabel,
  tShellLabel,
  pressureLabel,
}: NozzleRepadSchematicProps) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;

  const cx = 200;
  // Geometry shifted down so D_p / nozzle tip clear the frame.
  const nozTop = 64;
  const padOuter = 122;
  const shellOuter = 140;
  const shellInner = 168;
  const halfD = 26;
  const halfDout = 40;
  const halfDp = 78;
  const shellLeft = 56;
  const shellRight = 344;

  return (
    <SchematicFrame
      title="Nozzle reinforcement half-section (UG-37 / UG-40)"
      size="xl"
      caption="A₁ shell excess · A₂ nozzle wall · A₄₂ pad — numeric areas in the results table"
    >
      <EngineeringCanvas
        viewBox="0 0 420 320"
        label="Pressure vessel nozzle reinforcement half-section with d, d_out, D_p, t_p per ASME VIII-1 UG-37"
        className="w-auto"
        style={{ height: 440, width: "auto", maxWidth: "100%" }}
      >
        {(ids: SvgIds) => (
          <>
            <title>{`UG-37 nozzle reinforcement — d=${dLabel}, d_out=${doutLabel}, D_p=${dpLabel}, t_p=${tpLabel}`}</title>

            {/* ---- D_p (dedicated top band, clear of frame edge) ---- */}
            <HDimension
              x1={cx - halfDp}
              x2={cx + halfDp}
              y={36}
              fromY1={padOuter}
              fromY2={padOuter}
              label={`D_p = ${dpLabel}`}
              dimKey="A"
              active={active}
              ids={ids}
            />

            {/* Shell */}
            <g className={schematicClass(active, "t")}>
              <path
                d={`M${shellLeft} ${shellOuter} H${cx - halfDout} V${shellInner} H${shellLeft} Z
                    M${cx + halfDout} ${shellOuter} H${shellRight} V${shellInner} H${cx + halfDout} Z`}
                fill={`url(#${ids.metal})`}
                stroke={schematicStroke(active, "t")}
                strokeWidth={schematicWidth(active, "t")}
                filter={`url(#${ids.shadow})`}
              />
              <path
                d={`M${shellLeft} ${shellOuter} H${cx - halfDout} V${shellInner} H${shellLeft} Z
                    M${cx + halfDout} ${shellOuter} H${shellRight} V${shellInner} H${cx + halfDout} Z`}
                fill={`url(#${ids.hatch})`}
                opacity={0.25}
              />
              <path
                d={`M${cx - halfDp} ${shellOuter} H${cx - halfDout} V${shellOuter + 12} H${cx - halfDp} Z
                    M${cx + halfDout} ${shellOuter} H${cx + halfDp} V${shellOuter + 12} H${cx + halfDout} Z`}
                fill="#3b82f6"
                fillOpacity={0.4}
                stroke="#2563eb"
                strokeWidth={0.75}
              />
            </g>

            {/* Pad */}
            <g className={schematicClass(active, "A")}>
              <path
                d={`M${cx - halfDp} ${padOuter} H${cx - halfDout} V${shellOuter} H${cx - halfDp} Z
                    M${cx + halfDout} ${padOuter} H${cx + halfDp} V${shellOuter} H${cx + halfDout} Z`}
                fill={`url(#${ids.metal})`}
                stroke={schematicStroke(active, "A")}
                strokeWidth={schematicWidth(active, "A")}
                filter={`url(#${ids.shadow})`}
              />
              <path
                d={`M${cx - halfDp} ${padOuter} H${cx - halfDout} V${shellOuter} H${cx - halfDp} Z
                    M${cx + halfDout} ${padOuter} H${cx + halfDp} V${shellOuter} H${cx + halfDout} Z`}
                fill="#f59e0b"
                fillOpacity={0.45}
              />
              <path
                d={`M${cx - halfDp} ${padOuter} H${cx - halfDout} V${shellOuter} H${cx - halfDp} Z
                    M${cx + halfDout} ${padOuter} H${cx + halfDp} V${shellOuter} H${cx + halfDout} Z`}
                fill={`url(#${ids.hatch})`}
                opacity={0.16}
              />
            </g>

            {/* Nozzle */}
            <g className={schematicClass(active, "d")}>
              <path
                d={`M${cx - halfDout} ${nozTop} H${cx - halfD} V${shellInner} H${cx - halfDout} Z
                    M${cx + halfD} ${nozTop} H${cx + halfDout} V${shellInner} H${cx + halfD} Z`}
                fill={`url(#${ids.metal})`}
                stroke={schematicStroke(active, "d")}
                strokeWidth={schematicWidth(active, "d")}
                filter={`url(#${ids.shadow})`}
              />
              <path
                d={`M${cx - halfDout} ${nozTop} H${cx - halfD} V${padOuter} H${cx - halfDout} Z
                    M${cx + halfD} ${nozTop} H${cx + halfDout} V${padOuter} H${cx + halfD} Z`}
                fill="#22c55e"
                fillOpacity={0.45}
              />
              <path
                d={`M${cx - halfDout} ${nozTop} H${cx - halfD} V${shellInner} H${cx - halfDout} Z
                    M${cx + halfD} ${nozTop} H${cx + halfDout} V${shellInner} H${cx + halfD} Z`}
                fill={`url(#${ids.hatch})`}
                opacity={0.18}
              />
            </g>

            <rect
              x={cx - halfD}
              y={nozTop}
              width={halfD * 2}
              height={shellInner - nozTop}
              fill="var(--spec-bg)"
              opacity={0.96}
            />

            <path
              d={`M${cx - halfDp} ${shellOuter} l-7 7 h7 Z`}
              fill="#ef4444"
              fillOpacity={0.55}
            />
            <path
              d={`M${cx + halfDp} ${shellOuter} l7 7 h-7 Z`}
              fill="#ef4444"
              fillOpacity={0.55}
            />

            {/* Centerline — starts below D_p band */}
            <line
              x1={cx}
              y1={48}
              x2={cx}
              y2={shellInner + 4}
              stroke="var(--spec-text3)"
              strokeWidth={0.85}
              strokeDasharray="4 3"
            />
            <DimText
              x={cx + 8}
              y={58}
              dimKey="d"
              active={active}
              anchor="start"
              fontSize={10}
            >
              CL
            </DimText>

            {/* P — left of CL so it never collides with d_out */}
            <path
              d={`M${cx - 10} ${nozTop + 6} L${cx - 10} ${nozTop + 34}`}
              stroke={schematicStroke(active, "P")}
              strokeWidth={schematicWidth(active, "P")}
              markerEnd={`url(#${active === "P" ? ids.arrowHot : ids.arrow})`}
              fill="none"
              className={schematicClass(active, "P")}
            />
            <DimText
              x={cx - 14}
              y={nozTop + 22}
              dimKey="P"
              active={active}
              anchor="end"
              fontSize={11}
            >
              {`P ${pressureLabel}`}
            </DimText>

            {/* d_out — mid nozzle height, clear of P */}
            <HDimension
              x1={cx - halfDout}
              x2={cx + halfDout}
              y={102}
              fromY1={nozTop + 28}
              fromY2={nozTop + 28}
              label={`d_out = ${doutLabel}`}
              dimKey="d"
              active={active}
              ids={ids}
            />

            {/* d — below shell bore */}
            <HDimension
              x1={cx - halfD}
              x2={cx + halfD}
              y={shellInner + 28}
              fromY1={shellInner}
              fromY2={shellInner}
              label={`d = ${dLabel}`}
              dimKey="d"
              active={active}
              ids={ids}
              labelEmphasis
            />

            {/* t — left of shell */}
            {tShellLabel ? (
              <VDimension
                y1={shellOuter}
                y2={shellInner}
                x={36}
                fromX1={shellLeft}
                fromX2={shellLeft}
                label={`t = ${tShellLabel}`}
                dimKey="t"
                active={active}
                ids={ids}
              />
            ) : null}

            {/* t_p — right of pad OD only (legend is below, not beside) */}
            <VDimension
              y1={padOuter}
              y2={shellOuter}
              x={cx + halfDp + 28}
              fromX1={cx + halfDp}
              label={`t_p = ${tpLabel}`}
              dimKey="A"
              active={active}
              ids={ids}
            />

            {/* Legend strip — below metal, full width */}
            <line
              x1={36}
              y1={236}
              x2={384}
              y2={236}
              stroke="var(--spec-border)"
              strokeWidth={0.6}
            />
            <LegendSwatch
              x={40}
              y={248}
              fill="rgba(59,130,246,0.45)"
              stroke="#2563eb"
              label="A1 shell"
            />
            <LegendSwatch
              x={140}
              y={248}
              fill="rgba(34,197,94,0.45)"
              stroke="#16a34a"
              label="A2 nozzle"
            />
            <LegendSwatch
              x={250}
              y={248}
              fill="rgba(245,158,11,0.5)"
              stroke="#d97706"
              label="A42 pad"
            />
            <LegendSwatch
              x={340}
              y={248}
              fill="rgba(239,68,68,0.55)"
              stroke="#dc2626"
              label="weld"
            />
            <text
              x={40}
              y={288}
              fill="var(--spec-text3)"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
            >
              {"t = shell thickness less C.A."}
            </text>
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}
