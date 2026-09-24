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

type ShaftKeywaySchematicProps = {
  dLabel: string;
  bLabel: string;
  hLabel: string;
  h1Label: string;
  h2Label: string;
  tLabel: string;
};

/**
 * Shaft cross-section with parallel key / keyway and torque direction.
 * DIN 6885-1 / ASME B17.1 screening diagram (h₁ shaft seat · h₂ hub seat).
 */
export default function ShaftKeywaySchematic({
  dLabel,
  bLabel,
  hLabel,
  h1Label,
  h2Label,
  tLabel,
}: ShaftKeywaySchematicProps) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;
  const cx = 200;
  const cy = 118;
  const r = 68;
  const keyHalfW = 13;
  const h1 = 12;
  const h2 = 14;
  const keyTop = cy - r - h2;
  const keyBottom = cy - r + h1;

  return (
    <SchematicFrame
      title="Shaft & parallel key (DIN 6885 / ASME B17.1)"
      size="large"
      caption="Cross-section · shear faces (red) · torque T — pure torsion screening"
    >
      <EngineeringCanvas
        viewBox="0 0 400 250"
        label={`Shaft keyway diagram diameter ${dLabel} key ${bLabel}×${hLabel} h1 ${h1Label} h2 ${h2Label} torque ${tLabel} per DIN 6885`}
        className="w-auto"
        style={{ height: 270, width: "auto", maxWidth: "100%" }}
      >
        {(ids: SvgIds) => (
          <>
            <title>{`Shaft Ø${dLabel} · key ${bLabel}×${hLabel} · h₁=${h1Label} · h₂=${h2Label} · T=${tLabel}`}</title>

            {/* Hub outline (outer) */}
            <circle
              cx={cx}
              cy={cy}
              r={r + h2 + 6}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={1.25}
              strokeDasharray="4 3"
              opacity={0.7}
            />

            {/* Shaft OD */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "d")}
              strokeWidth={schematicWidth(active, "d")}
              filter={`url(#${ids.shadow})`}
              className={schematicClass(active, "d")}
            />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={`url(#${ids.hatch})`}
              opacity={0.1}
            />

            {/* Shaft keyseat (h₁) */}
            <rect
              x={cx - keyHalfW}
              y={cy - r}
              width={keyHalfW * 2}
              height={h1}
              fill="#0f172a"
              opacity={0.3}
            />

            {/* Parallel key spanning shaft seat + hub seat */}
            <rect
              x={cx - keyHalfW}
              y={keyTop}
              width={keyHalfW * 2}
              height={h1 + h2}
              rx={1.5}
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "key")}
              strokeWidth={schematicWidth(active, "key")}
              className={schematicClass(active, "key")}
            />
            <rect
              x={cx - keyHalfW}
              y={keyTop}
              width={keyHalfW * 2}
              height={h1 + h2}
              fill={`url(#${ids.hatch})`}
              opacity={0.18}
            />

            {/* Shear planes on key flanks (shaft engagement) */}
            <line
              x1={cx - keyHalfW}
              y1={cy - r}
              x2={cx - keyHalfW}
              y2={keyBottom}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="3 2"
            />
            <line
              x1={cx + keyHalfW}
              y1={cy - r}
              x2={cx + keyHalfW}
              y2={keyBottom}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="3 2"
            />

            {/* Shaft / hub interface line */}
            <line
              x1={cx - keyHalfW - 6}
              y1={cy - r}
              x2={cx + keyHalfW + 6}
              y2={cy - r}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="2 2"
            />

            {/* Torque arc */}
            <defs>
              <marker
                id="arrowHeadShaftKey"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#2563eb" />
              </marker>
            </defs>
            <path
              d={`M ${cx + r + 10} ${cy - 20} A ${r + 16} ${r + 16} 0 0 1 ${cx + r + 10} ${cy + 20}`}
              fill="none"
              stroke={schematicStroke(active, "T")}
              strokeWidth={schematicWidth(active, "T")}
              markerEnd="url(#arrowHeadShaftKey)"
              className={schematicClass(active, "T")}
            />

            <DimText
              x={cx + r + 30}
              y={cy + 4}
              dimKey="T"
              active={active}
              anchor="start"
            >
              {`T ${tLabel}`}
            </DimText>
            <DimText
              x={cx}
              y={cy + r + 20}
              dimKey="d"
              active={active}
              anchor="middle"
            >
              {`d ${dLabel}`}
            </DimText>
            <DimText
              x={cx + keyHalfW + 16}
              y={keyTop + 10}
              dimKey="key"
              active={active}
              anchor="start"
            >
              {`b×h ${bLabel}×${hLabel}`}
            </DimText>
            <DimText
              x={cx - keyHalfW - 8}
              y={cy - r + h1 / 2 + 4}
              dimKey="h1"
              active={active}
              anchor="end"
              fontSize={11}
            >
              {`h₁ ${h1Label}`}
            </DimText>
            <DimText
              x={cx - keyHalfW - 8}
              y={keyTop + h2 / 2 + 4}
              dimKey="h2"
              active={active}
              anchor="end"
              fontSize={11}
            >
              {`h₂ ${h2Label}`}
            </DimText>
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}
