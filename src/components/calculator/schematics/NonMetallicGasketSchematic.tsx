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
  odLabel: string;
  idLabel: string;
  bLabel: string;
  profile: "ibc" | "full-face";
  bcdLabel?: string;
  holeCount?: number;
};

/**
 * Flat gasket plan: OD/ID annulus, effective width b, optional FF bolt circle.
 */
export default function NonMetallicGasketSchematic({
  odLabel,
  idLabel,
  bLabel,
  profile,
  bcdLabel,
  holeCount,
}: Props) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;
  const cx = 160;
  const cy = 115;
  const rOd = 78;
  const rId = 48;
  const rOuter = 96;
  const rBcd = 86;
  const fullFace = profile === "full-face";
  const rFace = fullFace ? rOuter : rOd;

  return (
    <SchematicFrame
      title="B16.21 flat gasket (plan)"
      size="large"
      caption={`${fullFace ? "Full face" : "IBC ring"} · OD ${odLabel} · ID ${idLabel} · b ${bLabel}`}
    >
      <EngineeringCanvas
        viewBox="0 0 400 230"
        label={`ASME B16.21 flat gasket diagram OD ${odLabel} ID ${idLabel} seating width ${bLabel}`}
        className="w-auto"
        style={{ height: 260, width: "auto", maxWidth: "100%" }}
      >
        {(ids: SvgIds) => (
          <>
            <title>{`B16.21 ${fullFace ? "full-face" : "IBC"} gasket OD ${odLabel} ID ${idLabel}`}</title>

            {/* Outer gasket OD */}
            <circle
              cx={cx}
              cy={cy}
              r={rFace}
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "od")}
              strokeWidth={schematicWidth(active, "od")}
              filter={`url(#${ids.shadow})`}
              className={schematicClass(active, "od")}
              opacity={0.95}
            />
            <circle
              cx={cx}
              cy={cy}
              r={rFace}
              fill={`url(#${ids.hatch})`}
              opacity={0.18}
            />
            {/* IBC RF contact ring cue */}
            {!fullFace ? (
              <circle
                cx={cx}
                cy={cy}
                r={rOd}
                fill="none"
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="4 2"
                opacity={0.7}
              />
            ) : null}
            {/* Bore */}
            <circle
              cx={cx}
              cy={cy}
              r={rId}
              fill="var(--spec-bg, #f8fafc)"
              stroke={schematicStroke(active, "id")}
              strokeWidth={schematicWidth(active, "id")}
              className={schematicClass(active, "id")}
            />

            {/* FF bolt circle + holes */}
            {fullFace ? (
              <circle
                cx={cx}
                cy={cy}
                r={rBcd}
                fill="none"
                stroke="#64748b"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.75}
              />
            ) : null}
            {fullFace
              ? Array.from({ length: Math.min(holeCount ?? 8, 12) }).map(
                  (_, i, arr) => {
                    const a = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
                    const hx = cx + Math.cos(a) * rBcd;
                    const hy = cy + Math.sin(a) * rBcd;
                    return (
                      <circle
                        key={i}
                        cx={hx}
                        cy={hy}
                        r={5}
                        fill="var(--spec-bg, #f8fafc)"
                        stroke="#64748b"
                        strokeWidth={1.2}
                      />
                    );
                  },
                )
              : null}

            {/* Dimension leaders — OD uses outer face radius */}
            <line
              x1={cx}
              y1={cy}
              x2={cx + rFace}
              y2={cy}
              stroke="#2563eb"
              strokeWidth={1.5}
            />
            <DimText
              x={cx + rFace / 2}
              y={cy - 8}
              dimKey="od"
              active={active}
              anchor="middle"
              fontSize={10}
            >
              {`OD ${odLabel}`}
            </DimText>
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - rId}
              stroke="#0f766e"
              strokeWidth={1.5}
            />
            <DimText
              x={cx + 8}
              y={cy - rId / 2}
              dimKey="id"
              active={active}
              anchor="start"
              fontSize={10}
            >
              {`ID ${idLabel}`}
            </DimText>

            {/* Callout panel */}
            <rect
              x={268}
              y={40}
              width={118}
              height={fullFace ? 100 : 78}
              rx={6}
              fill="var(--spec-panel, #fff)"
              stroke="var(--spec-border, #cbd5e1)"
              strokeWidth={1.2}
              opacity={0.96}
            />
            <DimText x={278} y={58} dimKey="prof" active={active} anchor="start" fontSize={10} emphasis>
              {fullFace ? "Full face" : "IBC ring"}
            </DimText>
            <DimText x={278} y={76} dimKey="b" active={active} anchor="start" fontSize={10}>
              {`b ${bLabel}`}
            </DimText>
            <DimText x={278} y={94} dimKey="note" active={active} anchor="start" fontSize={9}>
              VIII-1 App. 2 width
            </DimText>
            {fullFace && bcdLabel ? (
              <DimText x={278} y={112} dimKey="bcd" active={active} anchor="start" fontSize={10}>
                {`BCD ${bcdLabel}`}
              </DimText>
            ) : null}
            {fullFace && holeCount != null ? (
              <DimText x={278} y={128} dimKey="nh" active={active} anchor="start" fontSize={10}>
                {`${holeCount} bolt holes`}
              </DimText>
            ) : null}
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}
