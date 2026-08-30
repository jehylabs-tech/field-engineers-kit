"use client";

import SchematicFrame from "@/components/calculator/schematics/SchematicFrame";
import {
  DimText,
  EngineeringCanvas,
  HDimension,
  type SvgIds,
} from "@/components/calculator/schematics/EngineeringSvg";
import {
  schematicStroke,
  schematicWidth,
  useSchematicHighlight,
} from "@/components/calculator/schematics/SchematicHighlight";

type PipeThicknessSchematicProps = {
  odLabel: string;
  tminLabel: string;
  actualLabel: string;
  caLabel: string;
  pressureLabel: string;
};

export default function PipeThicknessSchematic({
  odLabel,
  tminLabel,
  actualLabel,
  caLabel,
  pressureLabel,
}: PipeThicknessSchematicProps) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;

  return (
    <SchematicFrame title="Pipe wall section (ASME B31.3)">
      <EngineeringCanvas
        viewBox="0 0 320 176"
        label="Pipe wall cross-section with D, t, CA, and P"
      >
        {(ids: SvgIds) => (
          <>
            <circle
              cx="118"
              cy="88"
              r="62"
              fill={`url(#${ids.hatch})`}
              filter={`url(#${ids.shadow})`}
              stroke={schematicStroke(active, "D")}
              strokeWidth={schematicWidth(active, "D")}
              className={active === "D" ? "schematic-hot" : undefined}
            />
            <circle
              cx="118"
              cy="88"
              r="62"
              fill={`url(#${ids.metal})`}
              opacity="0.35"
            />
            <circle
              cx="118"
              cy="88"
              r="44"
              fill="none"
              stroke={schematicStroke(active, "t")}
              strokeWidth={schematicWidth(active, "t")}
              className={active === "t" ? "schematic-hot" : undefined}
            />
            <circle
              cx="118"
              cy="88"
              r="38"
              fill="var(--spec-accent-bg)"
              stroke={schematicStroke(active, "c")}
              strokeWidth={schematicWidth(active, "c")}
            />
            <circle
              cx="118"
              cy="88"
              r="32"
              fill="var(--spec-bg)"
              stroke="var(--spec-border)"
            />
            <HDimension
              x1={56}
              x2={180}
              y={20}
              fromY1={88}
              fromY2={88}
              label={`D ${odLabel}`}
              dimKey="D"
              active={active}
              ids={ids}
            />
            <DimText x={200} y={78} dimKey="t" active={active} anchor="start">
              tmin {tminLabel}
            </DimText>
            <DimText x={200} y={100} dimKey="tact" active={active} anchor="start">
              tact {actualLabel}
            </DimText>
            <DimText x={200} y={122} dimKey="c" active={active} anchor="start">
              CA {caLabel}
            </DimText>
            <DimText x={96} y={48} dimKey="P" active={active} anchor="start">
              P {pressureLabel}
            </DimText>
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}
