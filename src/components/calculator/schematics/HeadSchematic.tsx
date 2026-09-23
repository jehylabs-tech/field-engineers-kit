"use client";

import SchematicFrame from "@/components/calculator/schematics/SchematicFrame";
import {
  DimText,
  EngineeringCanvas,
  type SvgIds,
} from "@/components/calculator/schematics/EngineeringSvg";
import {
  schematicStroke,
  schematicWidth,
  useSchematicHighlight,
} from "@/components/calculator/schematics/SchematicHighlight";
import type { HeadTypeId } from "@/lib/calculators/engines/pressure-vessel-head-thickness";

type HeadSchematicProps = {
  headType: HeadTypeId;
  dLabel: string;
  tLabel: string;
  /** Crown radius L (torispherical) or inside radius R (hemispherical). */
  radiusLabel?: string;
  /** Half-apex angle α for conical. */
  alphaLabel?: string;
  pressureLabel: string;
};

function headTitle(headType: HeadTypeId): string {
  switch (headType) {
    case "ellipsoidal-2-1":
      return "2:1 Semi-Ellipsoidal Head (UG-32(d))";
    case "torispherical":
      return "Torispherical Head · 6% Knuckle (UG-32(e))";
    case "hemispherical":
      return "Hemispherical Head (UG-32(f))";
    case "conical":
      return "Conical Head without Knuckle (UG-32(g))";
    default:
      return "Formed Head (UG-32)";
  }
}

function ariaFor(headType: HeadTypeId): string {
  switch (headType) {
    case "ellipsoidal-2-1":
      return "2:1 ellipsoidal pressure vessel head diagram with D and t per ASME VIII-1 UG-32(d)";
    case "torispherical":
      return "Torispherical flanged and dished head diagram with D, L, and t per ASME VIII-1 UG-32(e)";
    case "hemispherical":
      return "Hemispherical head diagram with D, R, and t per ASME VIII-1 UG-32(f)";
    case "conical":
      return "Conical head diagram with D, alpha, and t per ASME VIII-1 UG-32(g)";
    default:
      return "Pressure vessel head thickness diagram per ASME VIII-1 UG-32";
  }
}

export default function HeadSchematic({
  headType,
  dLabel,
  tLabel,
  radiusLabel,
  alphaLabel,
  pressureLabel,
}: HeadSchematicProps) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;

  return (
    <SchematicFrame title={headTitle(headType)}>
      <EngineeringCanvas viewBox="0 0 340 200" label={ariaFor(headType)}>
        {(ids: SvgIds) => (
          <>
            <title>{`${headTitle(headType)} — D ${dLabel}, t ${tLabel}`}</title>

            <path
              d="M170 28 L170 58"
              stroke={schematicStroke(active, "P")}
              strokeWidth={schematicWidth(active, "P")}
              markerEnd={`url(#${ids.arrow})`}
              fill="none"
            />
            <DimText x={178} y={40} active={active} dimKey="P">
              {`P ${pressureLabel}`}
            </DimText>

            {headType === "ellipsoidal-2-1" && (
              <EllipsoidalPaths ids={ids} active={active} />
            )}
            {headType === "torispherical" && (
              <TorisphericalPaths ids={ids} active={active} />
            )}
            {headType === "hemispherical" && (
              <HemisphericalPaths ids={ids} active={active} />
            )}
            {headType === "conical" && (
              <ConicalPaths ids={ids} active={active} />
            )}

            <line
              x1={70}
              y1={168}
              x2={270}
              y2={168}
              stroke={schematicStroke(active, "D")}
              strokeWidth={1.2}
              markerStart={`url(#${ids.arrowRev})`}
              markerEnd={`url(#${ids.arrow})`}
            />
            <DimText x={170} y={184} active={active} dimKey="D" anchor="middle">
              {`D = ${dLabel}`}
            </DimText>

            <DimText x={278} y={118} active={active} dimKey="t">
              {`t = ${tLabel}`}
            </DimText>

            {radiusLabel &&
              (headType === "torispherical" ||
                headType === "hemispherical") && (
                <DimText
                  x={48}
                  y={100}
                  active={active}
                  dimKey={headType === "torispherical" ? "L" : "R"}
                >
                  {headType === "torispherical"
                    ? `L = ${radiusLabel}`
                    : `R = ${radiusLabel}`}
                </DimText>
              )}

            {headType === "conical" && alphaLabel && (
              <DimText x={200} y={92} active={active} dimKey="alpha">
                {`α = ${alphaLabel}`}
              </DimText>
            )}
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}

function EllipsoidalPaths({
  ids,
  active,
}: {
  ids: SvgIds;
  active: string | null;
}) {
  return (
    <>
      <path
        d="M70 150 Q170 40 270 150"
        fill={`url(#${ids.metal})`}
        stroke={schematicStroke(active, "t")}
        strokeWidth={schematicWidth(active, "t")}
        opacity={0.85}
      />
      <path
        d="M78 150 Q170 52 262 150"
        fill="var(--spec-bg)"
        stroke={schematicStroke(active, "D")}
        strokeWidth={1}
      />
      <line
        x1={70}
        y1={150}
        x2={270}
        y2={150}
        stroke="var(--spec-border)"
        strokeWidth={1}
        strokeDasharray="3 2"
      />
    </>
  );
}

function TorisphericalPaths({
  ids,
  active,
}: {
  ids: SvgIds;
  active: string | null;
}) {
  return (
    <>
      <path
        d="M70 150 Q95 145 110 120 Q170 45 230 120 Q245 145 270 150"
        fill={`url(#${ids.metal})`}
        stroke={schematicStroke(active, "t")}
        strokeWidth={schematicWidth(active, "t")}
        opacity={0.85}
      />
      <path
        d="M78 150 Q98 146 112 122 Q170 55 228 122 Q242 146 262 150"
        fill="var(--spec-bg)"
        stroke={schematicStroke(active, "D")}
        strokeWidth={1}
      />
      <path
        d="M170 55 Q200 70 220 100"
        fill="none"
        stroke={schematicStroke(active, "L")}
        strokeWidth={1}
        strokeDasharray="3 2"
      />
      <line
        x1={70}
        y1={150}
        x2={270}
        y2={150}
        stroke="var(--spec-border)"
        strokeWidth={1}
        strokeDasharray="3 2"
      />
    </>
  );
}

function HemisphericalPaths({
  ids,
  active,
}: {
  ids: SvgIds;
  active: string | null;
}) {
  return (
    <>
      <path
        d="M70 150 A100 100 0 0 1 270 150"
        fill={`url(#${ids.metal})`}
        stroke={schematicStroke(active, "t")}
        strokeWidth={schematicWidth(active, "t")}
        opacity={0.85}
      />
      <path
        d="M78 150 A92 92 0 0 1 262 150"
        fill="var(--spec-bg)"
        stroke={schematicStroke(active, "D")}
        strokeWidth={1}
      />
      <line
        x1={170}
        y1={150}
        x2={170}
        y2={58}
        stroke={schematicStroke(active, "R")}
        strokeWidth={1}
        strokeDasharray="3 2"
      />
      <line
        x1={70}
        y1={150}
        x2={270}
        y2={150}
        stroke="var(--spec-border)"
        strokeWidth={1}
        strokeDasharray="3 2"
      />
    </>
  );
}

function ConicalPaths({
  ids,
  active,
}: {
  ids: SvgIds;
  active: string | null;
}) {
  return (
    <>
      <path
        d="M70 150 L170 55 L270 150 Z"
        fill={`url(#${ids.metal})`}
        stroke={schematicStroke(active, "t")}
        strokeWidth={schematicWidth(active, "t")}
        opacity={0.85}
      />
      <path
        d="M82 148 L170 68 L258 148 Z"
        fill="var(--spec-bg)"
        stroke={schematicStroke(active, "D")}
        strokeWidth={1}
      />
      <path
        d="M170 150 L210 110"
        fill="none"
        stroke={schematicStroke(active, "alpha")}
        strokeWidth={1.2}
      />
      <line
        x1={70}
        y1={150}
        x2={270}
        y2={150}
        stroke="var(--spec-border)"
        strokeWidth={1}
        strokeDasharray="3 2"
      />
    </>
  );
}
