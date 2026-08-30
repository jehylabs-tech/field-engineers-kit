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
  schematicStroke,
  schematicWidth,
  useSchematicHighlight,
} from "@/components/calculator/schematics/SchematicHighlight";
import type { FacingId, FlangeTypeId } from "@/lib/calculators/engines/flange-options";

export type FlangeDiagramProps = {
  npsLabel: string;
  classLabel: string;
  odLabel: string;
  thicknessLabel: string;
  pcdLabel: string;
  holeLabel: string;
  boreLabel: string;
  odMm?: number;
  thicknessMm?: number;
  pcdMm?: number;
  holeMm?: number;
  boreMm?: number;
  holeCount?: number;
  flangeType?: FlangeTypeId;
  facing?: FacingId;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function FlangeDiagram({
  npsLabel,
  classLabel,
  odLabel,
  thicknessLabel,
  pcdLabel,
  holeLabel,
  boreLabel,
  odMm = 228.6,
  thicknessMm = 23.8,
  pcdMm = 190.5,
  holeMm = 19.1,
  boreMm = 102.26,
  holeCount = 8,
  flangeType = "wn",
  facing = "rf",
}: FlangeDiagramProps) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;

  const cx = 108;
  const cy = 98;
  const maxR = 74;
  const scale = maxR / Math.max(odMm / 2, 1);
  const rOd = (odMm / 2) * scale;
  const rPcd = (pcdMm / 2) * scale;
  const rBore =
    flangeType === "bl"
      ? 0
      : (Math.max(boreMm, flangeType === "wn" ? 8 : 20) / 2) * scale;
  const rHole = clamp((holeMm / 2) * scale, 2.4, 7.5);
  const bolts = Math.max(1, Math.round(holeCount));
  const title =
    flangeType === "bl"
      ? `Blind ${facing.toUpperCase()} flange (B16.5)`
      : flangeType === "so"
        ? `Slip-on ${facing.toUpperCase()} flange (B16.5)`
        : flangeType === "sw"
          ? `Socket-weld ${facing.toUpperCase()} flange (B16.5)`
          : `Weld-neck ${facing.toUpperCase()} flange (B16.5)`;

  const sectionX = 232;
  const sectionH = rOd * 2;
  const sectionY = cy - rOd;
  const tPx = clamp(thicknessMm * 0.85, 12, 38);
  const boreH = rBore * 2;
  const boreY = cy - rBore;
  const hubW =
    flangeType === "wn" ? 28 : flangeType === "so" ? 14 : flangeType === "sw" ? 18 : 0;
  const faceBump = facing === "rf" ? 4 : 0;
  const groove = facing === "rtj" ? 3.5 : 0;

  return (
    <SchematicFrame title={title}>
      <EngineeringCanvas
        viewBox="0 0 340 196"
        label={`${title}: face and section with OD, thickness, PCD, and bore`}
      >
        {(ids: SvgIds) => (
          <>
            <circle
              cx={cx}
              cy={cy}
              r={rOd}
              fill={`url(#${ids.metal})`}
              filter={`url(#${ids.shadow})`}
              stroke={schematicStroke(active, "od")}
              strokeWidth={schematicWidth(active, "od")}
              className={active === "od" ? "schematic-hot" : undefined}
            />
            <circle
              cx={cx}
              cy={cy}
              r={rPcd}
              fill="none"
              stroke={schematicStroke(active, "pcd")}
              strokeWidth={schematicWidth(active, "pcd")}
              strokeDasharray="3 3"
              className={active === "pcd" ? "schematic-hot" : undefined}
            />
            {flangeType === "bl" ? (
              <circle
                cx={cx}
                cy={cy}
                r={10}
                fill={`url(#${ids.hatch})`}
                stroke={schematicStroke(active, "bore")}
                strokeWidth={1}
              />
            ) : (
              <circle
                cx={cx}
                cy={cy}
                r={Math.max(rBore, 4)}
                fill="var(--spec-bg)"
                stroke={schematicStroke(active, "bore")}
                strokeWidth={schematicWidth(active, "bore")}
                className={active === "bore" ? "schematic-hot" : undefined}
              />
            )}
            {Array.from({ length: bolts }, (_, index) => {
              const angle = (index / bolts) * Math.PI * 2 - Math.PI / 2;
              return (
                <circle
                  key={index}
                  cx={cx + rPcd * Math.cos(angle)}
                  cy={cy + rPcd * Math.sin(angle)}
                  r={rHole}
                  fill="var(--spec-bg)"
                  stroke={schematicStroke(active, "hole")}
                  strokeWidth={schematicWidth(active, "hole")}
                />
              );
            })}

            <rect
              x={sectionX}
              y={sectionY}
              width={tPx}
              height={sectionH}
              fill={`url(#${ids.hatch})`}
              filter={`url(#${ids.shadow})`}
              stroke={schematicStroke(active, "T")}
              strokeWidth={schematicWidth(active, "T")}
              className={active === "T" ? "schematic-hot" : undefined}
            />
            <rect
              x={sectionX}
              y={sectionY}
              width={tPx}
              height={sectionH}
              fill={`url(#${ids.metal})`}
              opacity="0.45"
            />
            {flangeType !== "bl" ? (
              <rect
                x={sectionX - 1}
                y={boreY}
                width={tPx + hubW + 2}
                height={boreH}
                fill="var(--spec-bg)"
                stroke={schematicStroke(active, "bore")}
                strokeWidth={schematicWidth(active, "bore")}
              />
            ) : null}
            {hubW > 0 && flangeType === "wn" ? (
              <polygon
                points={`${sectionX + tPx},${sectionY + 10} ${sectionX + tPx + hubW},${boreY} ${sectionX + tPx + hubW},${boreY + boreH} ${sectionX + tPx},${sectionY + sectionH - 10}`}
                fill={`url(#${ids.metal})`}
                stroke={schematicStroke(active, "T")}
                strokeWidth={1.1}
              />
            ) : null}
            {hubW > 0 && flangeType === "so" ? (
              <rect
                x={sectionX + tPx}
                y={sectionY + 16}
                width={hubW}
                height={sectionH - 32}
                fill={`url(#${ids.metal})`}
                stroke={schematicStroke(active, "T")}
              />
            ) : null}
            {hubW > 0 && flangeType === "sw" ? (
              <>
                <rect
                  x={sectionX + tPx}
                  y={sectionY + 14}
                  width={hubW}
                  height={sectionH - 28}
                  fill={`url(#${ids.metal})`}
                  stroke={schematicStroke(active, "T")}
                />
                <rect
                  x={sectionX + tPx - 1}
                  y={boreY - 6}
                  width={10}
                  height={boreH + 12}
                  fill="var(--spec-bg)"
                />
              </>
            ) : null}
            {faceBump > 0 ? (
              <rect
                x={sectionX - faceBump}
                y={cy - rPcd * 0.55}
                width={faceBump}
                height={rPcd * 1.1}
                fill={`url(#${ids.metal})`}
                stroke={schematicStroke(active, "T")}
              />
            ) : null}
            {groove > 0 ? (
              <rect
                x={sectionX + 2}
                y={cy - 10}
                width={groove}
                height={20}
                fill="var(--spec-bg)"
                stroke={schematicStroke(active, "T")}
              />
            ) : null}

            <HDimension
              x1={cx - rOd}
              x2={cx + rOd}
              y={18}
              fromY1={cy - rOd}
              fromY2={cy - rOd}
              label={`OD ${odLabel}`}
              dimKey="od"
              active={active}
              ids={ids}
            />
            <VDimension
              y1={sectionY}
              y2={sectionY + sectionH}
              x={sectionX + tPx + hubW + 16}
              fromX1={sectionX + tPx}
              label={`T ${thicknessLabel}`}
              dimKey="T"
              active={active}
              ids={ids}
            />
            <DimText x={8} y={188} dimKey="pcd" active={active} anchor="start">
              PCD {pcdLabel}
            </DimText>
            <DimText x={8} y={36} dimKey="nps" active={active} anchor="start">
              {npsLabel} · {classLabel}
            </DimText>
            <DimText x={cx - 22} y={cy + 4} dimKey="bore" active={active} anchor="start">
              {flangeType === "bl" ? "Solid" : "Bore"}
            </DimText>
            <DimText x={120} y={188} dimKey="hole" active={active} anchor="start">
              Hole {holeLabel}
            </DimText>
            <DimText x={232} y={188} dimKey="bore" active={active} anchor="start">
              {flangeType === "bl" ? "Blind" : `ID ${boreLabel}`}
            </DimText>
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}
