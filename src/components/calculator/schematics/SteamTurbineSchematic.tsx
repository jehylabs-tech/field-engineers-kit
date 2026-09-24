"use client";

import SchematicFrame from "@/components/calculator/schematics/SchematicFrame";
import {
  DimText,
  EngineeringCanvas,
  type SvgIds,
} from "@/components/calculator/schematics/EngineeringSvg";
import {
  schematicClass,
  schematicStroke,
  schematicWidth,
  useSchematicHighlight,
} from "@/components/calculator/schematics/SchematicHighlight";

type Props = {
  p1Label: string;
  t1Label: string;
  p2Label: string;
  powerLabel: string;
  sscLabel: string;
};

/** Soft label plate so callouts stay readable over grid / metal fills. */
function LabelPlate({
  x,
  y,
  w,
  h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={3}
      fill="rgba(248,250,252,0.92)"
      stroke="#cbd5e1"
      strokeWidth={0.75}
    />
  );
}

/**
 * Condensing / back-pressure steam turbine + generator diagram for PTC 6
 * screening (inlet P₁/T₁, exhaust P₂, W_elec, SSC).
 */
export default function SteamTurbineSchematic({
  p1Label,
  t1Label,
  p2Label,
  powerLabel,
  sscLabel,
}: Props) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;

  return (
    <SchematicFrame
      title="Steam turbine power / SSC diagram (PTC 6)"
      size="large"
      caption="Single-pressure expansion · no reheat / extraction"
    >
      <EngineeringCanvas
        viewBox="0 0 460 270"
        label={`Steam turbine diagram with inlet ${p1Label} ${t1Label}, exhaust ${p2Label}, electrical output ${powerLabel} per ASME PTC 6`}
        className="w-auto"
        style={{ height: 300, width: "auto", maxWidth: "100%" }}
      >
        {(ids: SvgIds) => (
          <>
            <title>{`Steam turbine — P1=${p1Label}, T1=${t1Label}, P2=${p2Label}, W=${powerLabel}, SSC=${sscLabel}`}</title>

            {/* Inlet steam line */}
            <path
              d="M28 78 H105"
              stroke={schematicStroke(active, "P1")}
              strokeWidth={Math.max(2.5, schematicWidth(active, "P1"))}
              fill="none"
              strokeLinecap="round"
              className={schematicClass(active, "P1")}
            />
            <polygon
              points="105,70 124,78 105,86"
              fill={schematicStroke(active, "P1")}
              className={schematicClass(active, "P1")}
            />

            {/* Shaft (drawn first, under casing labels) */}
            <line
              x1={118}
              y1={128}
              x2={318}
              y2={128}
              stroke="#64748b"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <line
              x1={118}
              y1={128}
              x2={318}
              y2={128}
              stroke="#e2e8f0"
              strokeWidth={1.5}
              strokeLinecap="round"
            />

            {/* Turbine casing */}
            <ellipse
              cx={180}
              cy={128}
              rx={66}
              ry={52}
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "TURB")}
              strokeWidth={Math.max(2.2, schematicWidth(active, "TURB"))}
              filter={`url(#${ids.shadow})`}
              className={schematicClass(active, "TURB")}
            />
            <ellipse
              cx={180}
              cy={128}
              rx={66}
              ry={52}
              fill={`url(#${ids.hatch})`}
              opacity={0.1}
            />
            {/* Stage hint lines (no overlapping text on shaft) */}
            <path
              d="M155 95 Q180 118 205 95"
              fill="none"
              stroke="#94a3b8"
              strokeWidth={1.25}
              opacity={0.85}
            />
            <path
              d="M150 110 Q180 132 210 110"
              fill="none"
              stroke="#94a3b8"
              strokeWidth={1.25}
              opacity={0.7}
            />
            <path
              d="M150 146 Q180 124 210 146"
              fill="none"
              stroke="#94a3b8"
              strokeWidth={1.25}
              opacity={0.7}
            />

            {/* Exhaust down to condenser */}
            <path
              d="M180 180 V222 H128"
              stroke={schematicStroke(active, "P2")}
              strokeWidth={Math.max(2.5, schematicWidth(active, "P2"))}
              fill="none"
              strokeLinecap="round"
              className={schematicClass(active, "P2")}
            />
            <polygon
              points="128,214 108,222 128,230"
              fill={schematicStroke(active, "P2")}
              className={schematicClass(active, "P2")}
            />

            {/* Generator */}
            <rect
              x={318}
              y={92}
              width={108}
              height={72}
              rx={7}
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "PWR")}
              strokeWidth={Math.max(2.2, schematicWidth(active, "PWR"))}
              filter={`url(#${ids.shadow})`}
              className={schematicClass(active, "PWR")}
            />
            <text
              x={372}
              y={133}
              textAnchor="middle"
              fill="#0f172a"
              fontSize={13}
              fontFamily="ui-monospace, monospace"
              fontWeight={700}
            >
              GEN
            </text>

            {/* Turbine nameplate — above casing, clear of shaft */}
            <LabelPlate x={146} y={54} w={68} h={20} />
            <DimText
              x={180}
              y={68}
              dimKey="TURB"
              active={active}
              fontSize={12}
              emphasis
            >
              Turbine
            </DimText>

            {/* Inlet callouts */}
            <LabelPlate x={12} y={18} w={118} h={38} />
            <DimText x={20} y={34} dimKey="T1" active={active} anchor="start" fontSize={12}>
              T₁  {t1Label}
            </DimText>
            <DimText
              x={20}
              y={50}
              dimKey="P1"
              active={active}
              anchor="start"
              fontSize={12}
              emphasis
            >
              P₁  {p1Label}
            </DimText>

            {/* Exhaust callout */}
            <LabelPlate x={14} y={236} w={130} h={22} />
            <DimText
              x={22}
              y={251}
              dimKey="P2"
              active={active}
              anchor="start"
              fontSize={12}
              emphasis
            >
              P₂  {p2Label}
            </DimText>

            {/* Power / SSC callouts */}
            <LabelPlate x={318} y={58} w={120} h={22} />
            <DimText
              x={378}
              y={73}
              dimKey="PWR"
              active={active}
              fontSize={12}
              emphasis
            >
              W_elec  {powerLabel}
            </DimText>
            <LabelPlate x={318} y={178} w={120} h={22} />
            <DimText x={378} y={193} dimKey="SSC" active={active} fontSize={12}>
              SSC  {sscLabel}
            </DimText>
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}
