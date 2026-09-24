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

type TankVentingSchematicProps = {
  dLabel: string;
  hLabel: string;
  hWettLabel: string;
  pumpInLabel: string;
  pumpOutLabel: string;
  qFireLabel: string;
  /** Kept for a11y title only — rates live in the result hero. */
  vOutLabel?: string;
  vEmerLabel?: string;
};

/**
 * Vertical storage tank with PVRV, liquid transfer arrows, and fire heat input.
 * API Std 2000 normal / emergency venting screening diagram.
 */
export default function TankVentingSchematic({
  dLabel,
  hLabel,
  hWettLabel,
  pumpInLabel,
  pumpOutLabel,
  qFireLabel,
  vOutLabel,
  vEmerLabel,
}: TankVentingSchematicProps) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;
  const cx = 200;
  const top = 36;
  const shellH = 150;
  const shellW = 110;
  const left = cx - shellW / 2;
  const wettY = top + shellH * 0.28;
  const rateTitle =
    vOutLabel && vEmerLabel
      ? ` · V_out ${vOutLabel} · V_emer ${vEmerLabel}`
      : "";

  return (
    <SchematicFrame
      title="Tank venting (API 2000 §3.3 / §3.4)"
      size="large"
      caption="PVRV · liquid transfer · wetted height ≤ 9.14 m · fire heat Q"
    >
      <EngineeringCanvas
        viewBox="0 0 400 250"
        label={`API 2000 tank venting diagram diameter ${dLabel} height ${hLabel} wetted ${hWettLabel} fire ${qFireLabel}`}
        className="w-auto"
        style={{ height: 270, width: "auto", maxWidth: "100%" }}
      >
        {(ids: SvgIds) => (
          <>
            <title>{`Tank Ø${dLabel} · H ${hLabel} · H_wett ${hWettLabel}${rateTitle}`}</title>

            {/* Shell */}
            <rect
              x={left}
              y={top}
              width={shellW}
              height={shellH}
              rx={4}
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "D")}
              strokeWidth={schematicWidth(active, "D")}
              filter={`url(#${ids.shadow})`}
              className={schematicClass(active, "D")}
            />
            <rect
              x={left}
              y={top}
              width={shellW}
              height={shellH}
              fill={`url(#${ids.hatch})`}
              opacity={0.12}
            />

            {/* Liquid level / wetted band */}
            <rect
              x={left + 2}
              y={wettY}
              width={shellW - 4}
              height={top + shellH - wettY - 2}
              fill="#2563eb"
              opacity={0.22}
            />
            <line
              x1={left}
              y1={wettY}
              x2={left + shellW}
              y2={wettY}
              stroke="#2563eb"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />

            {/* Roof + PVRV */}
            <path
              d={`M ${left} ${top} Q ${cx} ${top - 18} ${left + shellW} ${top}`}
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "PVRV")}
              strokeWidth={schematicWidth(active, "PVRV")}
              className={schematicClass(active, "PVRV")}
            />
            <rect
              x={cx - 8}
              y={top - 34}
              width={16}
              height={18}
              rx={2}
              fill="#e2e8f0"
              stroke={schematicStroke(active, "PVRV")}
              strokeWidth={1.5}
            />
            <DimText
              x={cx + 28}
              y={top - 22}
              dimKey="PVRV"
              active={active}
              anchor="start"
              fontSize={11}
            >
              PVRV
            </DimText>

            <defs>
              <marker
                id="arrowLiquid"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#2563eb" />
              </marker>
              <marker
                id="arrowFire"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" />
              </marker>
            </defs>

            {/* Liquid transfer — pump-in / pump-out (not vent rates) */}
            <line
              x1={left - 40}
              y1={top + shellH * 0.55}
              x2={left - 4}
              y2={top + shellH * 0.55}
              stroke="#2563eb"
              strokeWidth={2}
              markerEnd="url(#arrowLiquid)"
            />
            <DimText
              x={left - 44}
              y={top + shellH * 0.55 - 8}
              dimKey="pumpIn"
              active={active}
              anchor="end"
              fontSize={10}
            >
              {`Pump-in ${pumpInLabel}`}
            </DimText>
            <line
              x1={left + shellW + 4}
              y1={top + shellH * 0.7}
              x2={left + shellW + 40}
              y2={top + shellH * 0.7}
              stroke="#2563eb"
              strokeWidth={2}
              markerEnd="url(#arrowLiquid)"
            />
            <DimText
              x={left + shellW + 44}
              y={top + shellH * 0.7 - 8}
              dimKey="pumpOut"
              active={active}
              anchor="start"
              fontSize={10}
            >
              {`Pump-out ${pumpOutLabel}`}
            </DimText>

            {/* Fire arrows */}
            <path
              d={`M ${left + 20} ${top + shellH + 8} L ${left + 20} ${top + shellH - 20}`}
              stroke="#dc2626"
              strokeWidth={2}
              markerEnd="url(#arrowFire)"
            />
            <path
              d={`M ${cx} ${top + shellH + 8} L ${cx} ${top + shellH - 20}`}
              stroke="#dc2626"
              strokeWidth={2}
              markerEnd="url(#arrowFire)"
            />
            <path
              d={`M ${left + shellW - 20} ${top + shellH + 8} L ${left + shellW - 20} ${top + shellH - 20}`}
              stroke="#dc2626"
              strokeWidth={2}
              markerEnd="url(#arrowFire)"
            />
            <DimText
              x={cx}
              y={top + shellH + 28}
              dimKey="Q"
              active={active}
              anchor="middle"
              fontSize={11}
            >
              {`Q_fire ${qFireLabel}`}
            </DimText>

            <DimText
              x={left - 8}
              y={top + shellH / 2}
              dimKey="H"
              active={active}
              anchor="end"
              fontSize={11}
            >
              {`H ${hLabel}`}
            </DimText>
            <DimText
              x={cx}
              y={top + shellH - 8}
              dimKey="Hw"
              active={active}
              anchor="middle"
              fontSize={10}
            >
              {`H_wett ${hWettLabel}`}
            </DimText>
            <DimText
              x={cx}
              y={238}
              dimKey="D"
              active={active}
              anchor="middle"
              fontSize={11}
            >
              {`D ${dLabel}`}
            </DimText>
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}
