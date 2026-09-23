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

type BearingLoadSchematicProps = {
  frLabel: string;
  faLabel: string;
  nLabel: string;
  pLabel: string;
  bearingLabel: string;
  category: "ball" | "roller";
};

/**
 * Radial section of a rolling-element bearing with F_r, F_a, and rotation n.
 */
export default function BearingLoadSchematic({
  frLabel,
  faLabel,
  nLabel,
  pLabel,
  bearingLabel,
  category,
}: BearingLoadSchematicProps) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;
  const cx = 200;
  const cy = 118;

  return (
    <SchematicFrame
      title="Bearing load diagram (ISO 281 / ABMA)"
      size="large"
      caption="F_r radial · F_a axial · n rotation — P = X·F_r + Y·F_a in results"
    >
      <EngineeringCanvas
        viewBox="0 0 400 240"
        label={`${bearingLabel} bearing load diagram with F_r, F_a, and speed n per ISO 281`}
        className="w-auto"
        style={{ height: 280, width: "auto", maxWidth: "100%" }}
      >
        {(ids: SvgIds) => (
          <>
            <title>{`${bearingLabel} — F_r=${frLabel}, F_a=${faLabel}, n=${nLabel}, P=${pLabel}`}</title>

            {/* Outer ring */}
            <circle
              cx={cx}
              cy={cy}
              r={72}
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "C")}
              strokeWidth={schematicWidth(active, "C")}
              filter={`url(#${ids.shadow})`}
              className={schematicClass(active, "C")}
            />
            <circle
              cx={cx}
              cy={cy}
              r={72}
              fill={`url(#${ids.hatch})`}
              opacity={0.12}
            />

            {/* Inner ring / shaft */}
            <circle
              cx={cx}
              cy={cy}
              r={28}
              fill="var(--spec-bg)"
              stroke={schematicStroke(active, "d")}
              strokeWidth={1.2}
            />
            <circle
              cx={cx}
              cy={cy}
              r={14}
              fill={`url(#${ids.metal})`}
              stroke="var(--spec-text3)"
              strokeWidth={0.8}
            />

            {/* Rolling elements */}
            {(category === "ball"
              ? [0, 60, 120, 180, 240, 300]
              : [15, 75, 135, 195, 255, 315]
            ).map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const rx = cx + Math.cos(rad) * 50;
              const ry = cy + Math.sin(rad) * 50;
              if (category === "ball") {
                return (
                  <circle
                    key={deg}
                    cx={rx}
                    cy={ry}
                    r={10}
                    fill="#22c55e"
                    fillOpacity={0.55}
                    stroke="#16a34a"
                    strokeWidth={0.8}
                  />
                );
              }
              return (
                <rect
                  key={deg}
                  x={rx - 6}
                  y={ry - 14}
                  width={12}
                  height={28}
                  rx={2}
                  transform={`rotate(${deg + 90} ${rx} ${ry})`}
                  fill="#f59e0b"
                  fillOpacity={0.55}
                  stroke="#d97706"
                  strokeWidth={0.8}
                />
              );
            })}

            {/* F_r — vertical down; label left to clear P strip */}
            <path
              d={`M${cx} ${cy + 78} L${cx} ${cy + 108}`}
              stroke={schematicStroke(active, "P")}
              strokeWidth={schematicWidth(active, "P")}
              markerEnd={`url(#${active === "P" ? ids.arrowHot : ids.arrow})`}
              fill="none"
              className={schematicClass(active, "P")}
            />
            <DimText
              x={cx - 10}
              y={cy + 102}
              dimKey="P"
              active={active}
              anchor="end"
              fontSize={11}
            >
              {`F_r ${frLabel}`}
            </DimText>

            {/* F_a — horizontal right */}
            <path
              d={`M${cx + 78} ${cy} L${cx + 118} ${cy}`}
              stroke={schematicStroke(active, "A")}
              strokeWidth={schematicWidth(active, "A")}
              markerEnd={`url(#${active === "A" ? ids.arrowHot : ids.arrow})`}
              fill="none"
              className={schematicClass(active, "A")}
            />
            <DimText
              x={cx + 122}
              y={cy - 6}
              dimKey="A"
              active={active}
              anchor="start"
              fontSize={11}
            >
              {`F_a ${faLabel}`}
            </DimText>

            {/* Rotation arc n */}
            <path
              d={`M${cx + 22} ${cy - 38} A40 40 0 0 1 ${cx + 38} ${cy - 22}`}
              stroke={schematicStroke(active, "d")}
              strokeWidth={1.1}
              fill="none"
              markerEnd={`url(#${ids.arrow})`}
              className={schematicClass(active, "d")}
            />
            <DimText
              x={cx + 48}
              y={cy - 40}
              dimKey="d"
              active={active}
              anchor="start"
              fontSize={11}
            >
              {`n ${nLabel}`}
            </DimText>

            <DimText
              x={cx}
              y={28}
              dimKey="C"
              active={active}
              anchor="middle"
              fontSize={12}
              emphasis
            >
              {bearingLabel}
            </DimText>
            <DimText
              x={36}
              y={228}
              dimKey="P"
              active={active}
              anchor="start"
              fontSize={11}
            >
              {`P = ${pLabel}`}
            </DimText>
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}
