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
  thicknessLabel: string;
  holeLabel: string;
  pinLabel: string;
  angleLabel: string;
  weldLabel: string;
  ptLabel: string;
  psLabel: string;
};

/**
 * Side view of a lifting lug plate with pin hole, both-face fillet at base,
 * sling angle from vertical, and P_t / P_s load vectors.
 */
export default function LiftingLugSchematic({
  thicknessLabel,
  holeLabel,
  pinLabel,
  angleLabel,
  weldLabel,
  ptLabel,
  psLabel,
}: Props) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;

  return (
    <SchematicFrame
      title="Lifting lug & sling load diagram (BTH-1 / AISC)"
      size="large"
      caption="θ from vertical · P_t along sling · P_s horizontal · fillet at base"
    >
      <EngineeringCanvas
        viewBox="0 0 420 280"
        label={`Lifting lug diagram with plate thickness ${thicknessLabel}, pin hole ${holeLabel}, sling angle ${angleLabel} per ASME BTH-1`}
        className="w-auto"
        style={{ height: 300, width: "auto", maxWidth: "100%" }}
      >
        {(ids: SvgIds) => (
          <>
            <title>{`Lifting lug — t=${thicknessLabel}, D_hole=${holeLabel}, D_pin=${pinLabel}, θ=${angleLabel}, weld=${weldLabel}`}</title>

            {/* Base / parent plate */}
            <rect
              x={40}
              y={210}
              width={340}
              height={28}
              rx={2}
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "BASE")}
              strokeWidth={schematicWidth(active, "BASE")}
              filter={`url(#${ids.shadow})`}
              className={schematicClass(active, "BASE")}
            />

            {/* Lug plate body */}
            <path
              d="M175 210 L175 95 Q175 55 210 55 L250 55 Q285 55 285 95 L285 210 Z"
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "T")}
              strokeWidth={schematicWidth(active, "T")}
              filter={`url(#${ids.shadow})`}
              className={schematicClass(active, "T")}
            />
            <path
              d="M175 210 L175 95 Q175 55 210 55 L250 55 Q285 55 285 95 L285 210 Z"
              fill={`url(#${ids.hatch})`}
              opacity={0.14}
            />

            {/* Pin hole */}
            <circle
              cx={230}
              cy={100}
              r={22}
              fill="#0f172a"
              stroke={schematicStroke(active, "HOLE")}
              strokeWidth={schematicWidth(active, "HOLE")}
              className={schematicClass(active, "HOLE")}
            />
            {/* Pin */}
            <circle
              cx={230}
              cy={100}
              r={14}
              fill={`url(#${ids.metal})`}
              stroke={schematicStroke(active, "PIN")}
              strokeWidth={schematicWidth(active, "PIN")}
              className={schematicClass(active, "PIN")}
            />

            {/* Fillet weld symbols at base (both faces) */}
            <path
              d="M175 210 L162 198 L175 198 Z"
              fill={schematicStroke(active, "WELD")}
              className={schematicClass(active, "WELD")}
              opacity={0.85}
            />
            <path
              d="M285 210 L298 198 L285 198 Z"
              fill={schematicStroke(active, "WELD")}
              className={schematicClass(active, "WELD")}
              opacity={0.85}
            />

            {/* Vertical reference */}
            <line
              x1={230}
              y1={100}
              x2={230}
              y2={28}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="4 3"
            />

            {/* Sling line at angle */}
            <line
              x1={230}
              y1={100}
              x2={290}
              y2={28}
              stroke={schematicStroke(active, "ANGLE")}
              strokeWidth={schematicWidth(active, "ANGLE")}
              className={schematicClass(active, "ANGLE")}
            />

            {/* P_t arrow along sling */}
            <defs>
              <marker
                id={`${ids.metal}-pt`}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#2563eb" />
              </marker>
              <marker
                id={`${ids.metal}-ps`}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" />
              </marker>
            </defs>
            <line
              x1={230}
              y1={100}
              x2={275}
              y2={46}
              stroke="#2563eb"
              strokeWidth={2.2}
              markerEnd={`url(#${ids.metal}-pt)`}
              className={schematicClass(active, "PT")}
            />
            {/* P_s horizontal */}
            <line
              x1={230}
              y1={100}
              x2={310}
              y2={100}
              stroke="#dc2626"
              strokeWidth={2.2}
              markerEnd={`url(#${ids.metal}-ps)`}
              className={schematicClass(active, "PS")}
            />

            <DimText x={300} y={40} dimKey="ANGLE" active={active}>
              θ {angleLabel}
            </DimText>
            <DimText x={300} y={58} dimKey="PT" active={active} emphasis>
              P_t {ptLabel}
            </DimText>
            <DimText x={318} y={96} dimKey="PS" active={active} emphasis>
              P_s {psLabel}
            </DimText>
            <DimText x={100} y={100} dimKey="HOLE" active={active}>
              D_h {holeLabel}
            </DimText>
            <DimText x={100} y={118} dimKey="PIN" active={active}>
              D_pin {pinLabel}
            </DimText>
            <DimText x={100} y={168} dimKey="T" active={active}>
              t {thicknessLabel}
            </DimText>
            <DimText x={200} y={248} dimKey="WELD" active={active}>
              weld {weldLabel}
            </DimText>
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}
