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

type PsvReactionForceSchematicProps = {
  npsLabel: string;
  idLabel: string;
  vLabel: string;
  fMomLabel: string;
  fPressLabel: string;
  fSteadyLabel: string;
  fTotalLabel: string;
  dlfLabel: string;
  openDischarge: boolean;
  /** Screening lever arm for base moment (e.g. "1.5 m"). */
  armLabel?: string;
};

/**
 * Open-discharge PSV + vent elbow.
 * Layout rule: geometry left/center · force callout right · no overlapping labels.
 */
export default function PsvReactionForceSchematic({
  npsLabel,
  idLabel,
  vLabel,
  fMomLabel,
  fPressLabel,
  fSteadyLabel,
  fTotalLabel,
  dlfLabel,
  openDischarge,
  armLabel = "1.5 m",
}: PsvReactionForceSchematicProps) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;

  const ex = 230;
  const ey = 112;
  const exitY = 40;
  // Right-side force callout panel (clear of pipe / vectors)
  const panelX = 318;
  const panelY = 48;

  return (
    <SchematicFrame
      title="PSV reaction force (API 520 Part II)"
      size="large"
      caption={`${npsLabel} · ${openDischarge ? "open vent" : "closed header"} · (F_mom + F_press) × DLF → F_total`}
    >
      <EngineeringCanvas
        viewBox="0 0 460 250"
        label={`API 520 Part II PSV reaction force diagram ${npsLabel} velocity ${vLabel} total force ${fTotalLabel}`}
        className="w-auto"
        style={{ height: 280, width: "auto", maxWidth: "100%" }}
      >
        {(ids: SvgIds) => (
          <>
            <title>
              {`PSV ${npsLabel} · v ${vLabel} · F_steady ${fSteadyLabel} · F_total ${fTotalLabel}`}
            </title>

            <defs>
              <marker
                id={`${ids.arrow}-jet`}
                markerWidth="7"
                markerHeight="7"
                refX="6"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 7 3.5, 0 7" fill="#2563eb" />
              </marker>
              <marker
                id={`${ids.arrow}-force`}
                markerWidth="7"
                markerHeight="7"
                refX="6"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 7 3.5, 0 7" fill="#dc2626" />
              </marker>
            </defs>

            {/* —— Vessel —— */}
            <path
              d="M 28 55 Q 18 110 28 165 L 56 165 Q 48 110 56 55 Z"
              fill={`url(#${ids.metal})`}
              stroke="#64748b"
              strokeWidth={1.4}
              filter={`url(#${ids.shadow})`}
            />
            <path
              d="M 28 55 Q 18 110 28 165 L 56 165 Q 48 110 56 55 Z"
              fill={`url(#${ids.hatch})`}
              opacity={0.12}
            />
            <DimText x={42} y={48} dimKey="ves" active={active} anchor="middle" fontSize={10}>
              vessel
            </DimText>

            {/* Nozzle stub */}
            <rect
              x={54}
              y={98}
              width={20}
              height={28}
              rx={1}
              fill={`url(#${ids.metal})`}
              stroke="#64748b"
              strokeWidth={1.3}
            />
            <rect
              x={56}
              y={105}
              width={18}
              height={14}
              fill="var(--spec-bg, #f8fafc)"
            />

            {/* —— PSV —— */}
            <g className={schematicClass(active, "psv")}>
              <rect
                x={72}
                y={96}
                width={50}
                height={34}
                rx={5}
                fill={`url(#${ids.metal})`}
                stroke={schematicStroke(active, "psv")}
                strokeWidth={schematicWidth(active, "psv")}
                filter={`url(#${ids.shadow})`}
              />
              <rect
                x={76}
                y={106}
                width={42}
                height={14}
                rx={2}
                fill="var(--spec-bg, #f8fafc)"
                opacity={0.85}
              />
              <rect
                x={85}
                y={72}
                width={24}
                height={26}
                rx={3}
                fill={`url(#${ids.metal})`}
                stroke={schematicStroke(active, "psv")}
                strokeWidth={1.4}
              />
              <rect
                x={90}
                y={58}
                width={14}
                height={16}
                rx={2}
                fill="#cbd5e1"
                stroke="#64748b"
                strokeWidth={1.1}
              />
            </g>
            <DimText x={97} y={52} dimKey="psv" active={active} anchor="middle" fontSize={11}>
              PSV
            </DimText>

            {/* Flange */}
            <rect
              x={120}
              y={96}
              width={8}
              height={22}
              rx={1}
              fill={`url(#${ids.metal})`}
              stroke="#64748b"
              strokeWidth={1}
            />

            {/* —— Double-wall vent elbow —— */}
            <path
              d={`M 126 105 H ${ex - 12} Q ${ex + 2} 105 ${ex + 2} ${ey - 10} V ${exitY + 8}`}
              fill="none"
              stroke={schematicStroke(active, "pipe")}
              strokeWidth={14}
              strokeLinecap="butt"
              strokeLinejoin="round"
              className={schematicClass(active, "pipe")}
              opacity={0.35}
            />
            <path
              d={`M 126 105 H ${ex - 12} Q ${ex + 2} 105 ${ex + 2} ${ey - 10} V ${exitY + 8}`}
              fill="none"
              stroke={schematicStroke(active, "pipe")}
              strokeWidth={schematicWidth(active, "pipe") + 1}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={schematicClass(active, "pipe")}
            />
            <path
              d={`M 126 105 H ${ex - 12} Q ${ex + 2} 105 ${ex + 2} ${ey - 10} V ${exitY + 8}`}
              fill="none"
              stroke="var(--spec-bg, #f8fafc)"
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Pipe size — ABOVE run only (never under elbow forces) */}
            <DimText
              x={168}
              y={88}
              dimKey="pipe"
              active={active}
              anchor="middle"
              fontSize={10}
            >
              {`${npsLabel} · ID ${idLabel}`}
            </DimText>

            {/* Exit jet / header */}
            {openDischarge ? (
              <>
                <path
                  d={`M ${ex - 5} ${exitY + 6} L ${ex} ${exitY - 20} L ${ex + 5} ${exitY + 6} Z`}
                  fill="#3b82f6"
                  opacity={0.25}
                />
                <line
                  x1={ex}
                  y1={exitY + 4}
                  x2={ex}
                  y2={exitY - 16}
                  stroke="#2563eb"
                  strokeWidth={2.6}
                  markerEnd={`url(#${ids.arrow}-jet)`}
                />
                <DimText
                  x={ex + 12}
                  y={exitY - 8}
                  dimKey="v"
                  active={active}
                  anchor="start"
                  fontSize={11}
                  emphasis
                >
                  {`v ${vLabel}`}
                </DimText>
              </>
            ) : (
              <>
                <rect
                  x={ex - 16}
                  y={exitY - 4}
                  width={32}
                  height={12}
                  rx={2}
                  fill={`url(#${ids.metal})`}
                  stroke="#64748b"
                  strokeWidth={1.2}
                />
                <DimText
                  x={ex + 22}
                  y={exitY + 5}
                  dimKey="v"
                  active={active}
                  anchor="start"
                  fontSize={10}
                >
                  {`header · v ${vLabel}`}
                </DimText>
              </>
            )}

            {/* Elbow origin + single primary reaction vector */}
            <circle
              cx={ex}
              cy={ey}
              r={3.5}
              fill="#dc2626"
              stroke="#fff"
              strokeWidth={1}
            />
            <line
              x1={ex}
              y1={ey + 5}
              x2={ex}
              y2={ey + 68}
              stroke="#dc2626"
              strokeWidth={3}
              markerEnd={`url(#${ids.arrow}-force)`}
            />
            <DimText
              x={ex + 10}
              y={ey + 48}
              dimKey="F"
              active={active}
              anchor="start"
              fontSize={11}
              emphasis
            >
              {`F_total`}
            </DimText>

            {/* Lever arm — bottom band only */}
            <line
              x1={97}
              y1={150}
              x2={97}
              y2={222}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="3 2"
            />
            <line
              x1={97}
              y1={222}
              x2={ex}
              y2={222}
              stroke="#94a3b8"
              strokeWidth={1.2}
              markerEnd={`url(#${ids.arrow})`}
            />
            <line
              x1={ex}
              y1={222}
              x2={ex}
              y2={ey + 72}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="3 2"
            />
            <DimText
              x={(97 + ex) / 2}
              y={238}
              dimKey="arm"
              active={active}
              anchor="middle"
              fontSize={10}
            >
              {`lever ≈ ${armLabel} (screen)`}
            </DimText>

            {/* —— Force callout panel (right) — no overlap with geometry —— */}
            <rect
              x={panelX}
              y={panelY}
              width={128}
              height={openDischarge ? 128 : 112}
              rx={6}
              fill="var(--spec-panel, #ffffff)"
              stroke="var(--spec-border, #cbd5e1)"
              strokeWidth={1.2}
              opacity={0.96}
            />
            <DimText
              x={panelX + 10}
              y={panelY + 16}
              dimKey="mode"
              active={active}
              anchor="start"
              fontSize={10}
              emphasis
            >
              {openDischarge ? "Open discharge" : "Closed header"}
            </DimText>
            <DimText
              x={panelX + 10}
              y={panelY + 34}
              dimKey="Fm"
              active={active}
              anchor="start"
              fontSize={10}
            >
              {`F_mom  ${fMomLabel}`}
            </DimText>
            <DimText
              x={panelX + 10}
              y={panelY + 50}
              dimKey="Fp"
              active={active}
              anchor="start"
              fontSize={10}
            >
              {openDischarge
                ? `F_press ${fPressLabel}`
                : "F_press ≈ 0"}
            </DimText>
            <DimText
              x={panelX + 10}
              y={panelY + 66}
              dimKey="Fs"
              active={active}
              anchor="start"
              fontSize={10}
            >
              {`F_steady ${fSteadyLabel}`}
            </DimText>
            <DimText
              x={panelX + 10}
              y={panelY + 82}
              dimKey="dlf"
              active={active}
              anchor="start"
              fontSize={10}
            >
              {`× DLF ${dlfLabel}`}
            </DimText>
            <line
              x1={panelX + 10}
              y1={panelY + 90}
              x2={panelX + 118}
              y2={panelY + 90}
              stroke="var(--spec-border, #cbd5e1)"
              strokeWidth={1}
            />
            <DimText
              x={panelX + 10}
              y={panelY + 108}
              dimKey="Ft"
              active={active}
              anchor="start"
              fontSize={11}
              emphasis
            >
              {`F_total ${fTotalLabel}`}
            </DimText>
            {openDischarge ? (
              <DimText
                x={panelX + 10}
                y={panelY + 122}
                dimKey="eq"
                active={active}
                anchor="start"
                fontSize={8}
              >
                (F_mom + F_press) × DLF
              </DimText>
            ) : null}
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}
