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

type BlindFlangeSchematicProps = {
  diameterLabel: string;
  thicknessLabel: string;
  corrosionLabel: string;
  pressureLabel: string;
};

export default function BlindFlangeSchematic({
  diameterLabel,
  thicknessLabel,
  corrosionLabel,
  pressureLabel,
}: BlindFlangeSchematicProps) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;

  return (
    <SchematicFrame title="Blind / flat cover section">
      <EngineeringCanvas
        viewBox="0 0 340 176"
        label="Blind flange cross-section with d, t, c, and P"
      >
        {(ids: SvgIds) => (
          <>
            <rect
              x="22"
              y="48"
              width="168"
              height="80"
              rx="3"
              fill={`url(#${ids.metal})`}
              stroke="var(--spec-border-strong)"
              strokeWidth="1.2"
              filter={`url(#${ids.shadow})`}
            />
            <rect x="22" y="48" width="168" height="80" fill={`url(#${ids.hatch})`} opacity="0.28" />
            <rect
              x="190"
              y="40"
              width="32"
              height="96"
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "t")}
              strokeWidth={schematicWidth(active, "t")}
              filter={`url(#${ids.shadow})`}
              className={schematicClass(active, "t")}
            />
            <rect x="190" y="40" width="32" height="96" fill={`url(#${ids.hatch})`} opacity="0.35" />
            <rect
              x="178"
              y="48"
              width="12"
              height="80"
              fill="var(--spec-accent-bg)"
              stroke={schematicStroke(active, "c")}
              strokeWidth={schematicWidth(active, "c")}
              className={schematicClass(active, "c")}
            />
            <rect x="178" y="48" width="12" height="80" fill={`url(#${ids.hatch})`} opacity="0.2" />
            {[62, 88, 114].map((y) => (
              <line
                key={y}
                x1="46"
                y1={y}
                x2="164"
                y2={y}
                stroke={schematicStroke(active, "P")}
                strokeWidth={schematicWidth(active, "P")}
                markerEnd={`url(#${active === "P" ? ids.arrowHot : ids.arrow})`}
                className={schematicClass(active, "P")}
              />
            ))}
            <HDimension
              x1={190}
              x2={222}
              y={154}
              fromY1={136}
              label={`t ${thicknessLabel}`}
              dimKey="t"
              active={active}
              ids={ids}
            />
            <VDimension
              y1={48}
              y2={128}
              x={248}
              fromX1={222}
              label={`d ${diameterLabel}`}
              dimKey="d"
              active={active}
              ids={ids}
            />
            <DimText x={184} y={42} dimKey="c" active={active} anchor="end">
              c {corrosionLabel}
            </DimText>
            <DimText x={48} y={38} dimKey="P" active={active} anchor="start">
              P {pressureLabel}
            </DimText>
            <text x="26" y="168" fill="var(--spec-text3)" fontSize="10">
              Process side
            </text>
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}
