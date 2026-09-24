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

type ValveBodySchematicProps = {
  dLabel: string;
  tmLabel: string;
  classLabel: string;
  npsLabel: string;
};

/**
 * Valve body section: port ID d and body wall t_m (neck allowance is OEM — not quantified).
 */
export default function ValveBodySchematic({
  dLabel,
  tmLabel,
  classLabel,
  npsLabel,
}: ValveBodySchematicProps) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;
  const cx = 180;
  const cy = 100;
  const rOut = 58;
  const rIn = 36;
  const wall = rOut - rIn;

  return (
    <SchematicFrame
      title="Valve body wall (ASME B16.34)"
      size="large"
      caption={`${npsLabel} · ${classLabel} · port d · body t_m · neck (OEM)`}
    >
      <EngineeringCanvas
        viewBox="0 0 380 210"
        label={`ASME B16.34 valve body section ${npsLabel} ${classLabel} diameter ${dLabel} wall ${tmLabel}`}
        className="w-auto"
        style={{ height: 250, width: "auto", maxWidth: "100%" }}
      >
        {(ids: SvgIds) => (
          <>
            <title>{`Valve body ${npsLabel} ${classLabel} d ${dLabel} t_m ${tmLabel}`}</title>

            <circle
              cx={cx}
              cy={cy}
              r={rOut}
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "tm")}
              strokeWidth={schematicWidth(active, "tm")}
              filter={`url(#${ids.shadow})`}
              className={schematicClass(active, "tm")}
            />
            <circle
              cx={cx}
              cy={cy}
              r={rOut}
              fill={`url(#${ids.hatch})`}
              opacity={0.15}
            />
            <circle
              cx={cx}
              cy={cy}
              r={rIn}
              fill="var(--spec-bg, #f8fafc)"
              stroke={schematicStroke(active, "d")}
              strokeWidth={schematicWidth(active, "d")}
              className={schematicClass(active, "d")}
            />

            {/* Neck stub — geometry only; thickness is OEM detail */}
            <rect
              x={cx + rOut - 4}
              y={cy - 18}
              width={70}
              height={36}
              rx={2}
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "tn")}
              strokeWidth={schematicWidth(active, "tn")}
              className={schematicClass(active, "tn")}
            />
            <rect
              x={cx + rOut - 4}
              y={cy - 10}
              width={70}
              height={20}
              fill="var(--spec-bg, #f8fafc)"
            />
            <rect
              x={cx + rOut + 62}
              y={cy - 28}
              width={10}
              height={56}
              rx={1}
              fill={`url(#${ids.metal})`}
              stroke="#64748b"
              strokeWidth={1.2}
            />

            <line
              x1={cx}
              y1={cy - rIn}
              x2={cx}
              y2={cy - rOut}
              stroke="#2563eb"
              strokeWidth={2}
            />
            <DimText
              x={cx + 14}
              y={cy - rIn - wall / 2 + 4}
              dimKey="tm"
              active={active}
              anchor="start"
              fontSize={11}
            >
              {`t_m ${tmLabel}`}
            </DimText>

            <line
              x1={cx - rIn}
              y1={cy + 8}
              x2={cx + rIn}
              y2={cy + 8}
              stroke="#0f766e"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
            <DimText
              x={cx}
              y={cy + 28}
              dimKey="d"
              active={active}
              anchor="middle"
              fontSize={11}
            >
              {`d ${dLabel}`}
            </DimText>

            <DimText
              x={cx + rOut + 36}
              y={cy - 34}
              dimKey="tn"
              active={active}
              anchor="middle"
              fontSize={10}
            >
              neck (OEM)
            </DimText>
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}
