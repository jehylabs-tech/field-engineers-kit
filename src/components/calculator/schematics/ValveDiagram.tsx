"use client";

import SchematicFrame from "@/components/calculator/schematics/SchematicFrame";
import {
  EngineeringCanvas,
  HDimension,
  type SvgIds,
} from "@/components/calculator/schematics/EngineeringSvg";
import { useSchematicHighlight } from "@/components/calculator/schematics/SchematicHighlight";

export type FittingDiagramKind =
  | "valve"
  | "check"
  | "butterfly"
  | "elbow90"
  | "elbow45"
  | "tee"
  | "reducer";

type ValveDiagramProps = {
  kind?: FittingDiagramKind;
  componentId: string;
  dimLabel: string;
  dimValue: string;
  npsLabel: string;
  classLabel: string;
  nps?: string;
  pressureClass?: string;
  dimensionMm?: number;
  caption?: string | null;
  size?: "default" | "large";
};

export function fittingDiagramKind(componentId: string): FittingDiagramKind {
  if (componentId === "check_valve") return "check";
  if (componentId === "butterfly_valve") return "butterfly";
  if (componentId === "elbow_90_lr") return "elbow90";
  if (componentId === "elbow_45_lr") return "elbow45";
  if (componentId === "tee_equal") return "tee";
  if (componentId === "reducer_concentric") return "reducer";
  return "valve";
}

function dimKey(kind: FittingDiagramKind): string {
  if (kind === "elbow90" || kind === "elbow45") return "A";
  if (kind === "tee") return "M";
  if (kind === "reducer") return "E";
  return "L";
}

export default function ValveDiagram({
  kind: kindProp,
  componentId,
  dimLabel,
  dimValue,
  npsLabel,
  classLabel,
  caption = null,
  size = "default",
}: ValveDiagramProps) {
  const highlight = useSchematicHighlight();
  const active = highlight?.active ?? null;
  const kind = kindProp ?? fittingDiagramKind(componentId);
  const key = dimKey(kind);
  const title =
    kind === "elbow90" || kind === "elbow45"
      ? "ASME B16.9 long-radius elbow"
      : kind === "tee" || kind === "reducer"
        ? "ASME B16.9 fitting envelope"
        : "ASME B16.10 face-to-face";
  const tall = size === "large";

  return (
    <SchematicFrame title={title} caption={caption} size={size}>
      <EngineeringCanvas
        viewBox={tall ? "0 0 340 208" : "0 0 340 188"}
        label={`${npsLabel} ${classLabel} ${dimLabel} ${dimValue}`}
      >
        {(ids: SvgIds) => (
          <>
            {kind === "check" ? (
              <CheckBody ids={ids} dimValue={dimValue} active={active} dimKey={key} />
            ) : null}
            {kind === "valve" ? (
              <ValveBody
                ids={ids}
                dimValue={dimValue}
                active={active}
                dimKey={key}
                style={
                  componentId === "globe_valve"
                    ? "globe"
                    : componentId === "ball_valve"
                      ? "ball"
                      : "gate"
                }
              />
            ) : null}
            {kind === "butterfly" ? (
              <ButterflyBody ids={ids} dimValue={dimValue} active={active} dimKey={key} />
            ) : null}
            {kind === "elbow90" ? (
              <ElbowBody ids={ids} angle={90} dimValue={dimValue} active={active} dimKey={key} />
            ) : null}
            {kind === "elbow45" ? (
              <ElbowBody ids={ids} angle={45} dimValue={dimValue} active={active} dimKey={key} />
            ) : null}
            {kind === "tee" ? (
              <TeeBody ids={ids} dimValue={dimValue} active={active} dimKey={key} />
            ) : null}
            {kind === "reducer" ? (
              <ReducerBody ids={ids} dimValue={dimValue} active={active} dimKey={key} />
            ) : null}
            <text
              x="12"
              y="18"
              fill="var(--spec-text3)"
              fontSize="11"
              fontFamily="ui-monospace, monospace"
            >
              {npsLabel} · {classLabel}
            </text>
            <text
              x="12"
              y={tall ? 198 : 176}
              fill="var(--spec-text3)"
              fontSize="11"
              fontFamily="ui-monospace, monospace"
            >
              {dimLabel}
            </text>
          </>
        )}
      </EngineeringCanvas>
    </SchematicFrame>
  );
}

function ValveBody({
  ids,
  dimValue,
  active,
  dimKey,
  style,
}: {
  ids: SvgIds;
  dimValue: string;
  active: string | null;
  dimKey: string;
  style: "gate" | "globe" | "ball";
}) {
  return (
    <>
      <rect
        x="42"
        y="46"
        width="18"
        height="76"
        fill={`url(#${ids.hatch})`}
        stroke="var(--spec-text3)"
        filter={`url(#${ids.shadow})`}
      />
      <rect
        x="280"
        y="46"
        width="18"
        height="76"
        fill={`url(#${ids.hatch})`}
        stroke="var(--spec-text3)"
        filter={`url(#${ids.shadow})`}
      />
      <path
        d={
          style === "globe"
            ? "M60 62 C 92 40, 248 40, 280 62 L 280 106 C 248 128, 92 128, 60 106 Z"
            : style === "ball"
              ? "M60 66 C 110 44, 230 44, 280 66 L 280 102 C 230 124, 110 124, 60 102 Z"
              : "M60 64 H 280 V 104 H 60 Z"
        }
        fill={`url(#${ids.metal})`}
        stroke="var(--spec-text3)"
        filter={`url(#${ids.shadow})`}
      />
      {style === "gate" || style === "globe" ? (
        <>
          <rect
            x="148"
            y="34"
            width="44"
            height="28"
            rx="3"
            fill={`url(#${ids.metal})`}
            stroke="var(--spec-text3)"
          />
          <line x1="170" y1="34" x2="170" y2="20" stroke="var(--spec-text3)" />
          <circle cx="170" cy="14" r="8" fill="none" stroke="var(--spec-accent)" />
          <line x1="162" y1="14" x2="178" y2="14" stroke="var(--spec-accent)" />
          <line x1="170" y1="6" x2="170" y2="22" stroke="var(--spec-accent)" />
        </>
      ) : (
        <rect
          x="168"
          y="40"
          width="52"
          height="10"
          rx="2"
          fill={`url(#${ids.metal})`}
          stroke="var(--spec-text3)"
          transform="rotate(-18 194 45)"
        />
      )}
      <HDimension
        x1={42}
        x2={298}
        y={152}
        fromY1={122}
        fromY2={122}
        label={`L ${dimValue}`}
        dimKey={dimKey}
        active={active}
        ids={ids}
        labelEmphasis
      />
    </>
  );
}

function CheckBody({
  ids,
  dimValue,
  active,
  dimKey,
}: {
  ids: SvgIds;
  dimValue: string;
  active: string | null;
  dimKey: string;
}) {
  return (
    <>
      <rect
        x="42"
        y="50"
        width="18"
        height="72"
        fill={`url(#${ids.hatch})`}
        stroke="var(--spec-text3)"
        filter={`url(#${ids.shadow})`}
      />
      <rect
        x="280"
        y="50"
        width="18"
        height="72"
        fill={`url(#${ids.hatch})`}
        stroke="var(--spec-text3)"
        filter={`url(#${ids.shadow})`}
      />
      <ellipse
        cx="170"
        cy="86"
        rx="108"
        ry="36"
        fill={`url(#${ids.metal})`}
        stroke="var(--spec-text3)"
        filter={`url(#${ids.shadow})`}
      />
      <ellipse
        cx="170"
        cy="86"
        rx="108"
        ry="36"
        fill={`url(#${ids.hatch})`}
        opacity="0.28"
      />
      <path
        d="M 118 86 A 40 40 0 0 1 198 70"
        fill="none"
        stroke="var(--spec-accent)"
        strokeWidth="2.2"
      />
      <circle cx="118" cy="86" r="3.5" fill="var(--spec-accent)" />
      <rect
        x="150"
        y="42"
        width="40"
        height="16"
        rx="2"
        fill={`url(#${ids.metal})`}
        stroke="var(--spec-text3)"
      />
      <HDimension
        x1={42}
        x2={298}
        y={156}
        fromY1={122}
        fromY2={122}
        label={`L ${dimValue}`}
        dimKey={dimKey}
        active={active}
        ids={ids}
        labelEmphasis
      />
    </>
  );
}

function ButterflyBody({
  ids,
  dimValue,
  active,
  dimKey,
}: {
  ids: SvgIds;
  dimValue: string;
  active: string | null;
  dimKey: string;
}) {
  return (
    <>
      <rect
        x="128"
        y="44"
        width="84"
        height="80"
        rx="4"
        fill={`url(#${ids.metal})`}
        stroke="var(--spec-text3)"
        filter={`url(#${ids.shadow})`}
      />
      <ellipse
        cx="170"
        cy="84"
        rx="24"
        ry="30"
        fill={`url(#${ids.hatch})`}
        stroke="var(--spec-accent)"
      />
      <line x1="170" y1="54" x2="170" y2="114" stroke="var(--spec-text3)" />
      <HDimension
        x1={128}
        x2={212}
        y={152}
        fromY1={124}
        label={`L ${dimValue}`}
        dimKey={dimKey}
        active={active}
        ids={ids}
        labelEmphasis
      />
    </>
  );
}

function ElbowBody({
  ids,
  angle,
  dimValue,
  active,
  dimKey,
}: {
  ids: SvgIds;
  angle: 90 | 45;
  dimValue: string;
  active: string | null;
  dimKey: string;
}) {
  const y = angle === 90 ? 84 : 92;
  const endX = angle === 90 ? 212 : 220;
  return (
    <>
      <path
        d={
          angle === 90
            ? "M 92 84 H 164 A 48 48 0 0 1 212 132"
            : "M 92 92 H 160 A 56 56 0 0 1 220 108"
        }
        fill="none"
        stroke={`url(#${ids.metal})`}
        strokeWidth="18"
        strokeLinecap="round"
        filter={`url(#${ids.shadow})`}
      />
      <path
        d={
          angle === 90
            ? "M 92 84 H 164 A 48 48 0 0 1 212 132"
            : "M 92 92 H 160 A 56 56 0 0 1 220 108"
        }
        fill="none"
        stroke={`url(#${ids.hatch})`}
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="164" cy={y} r="3" fill="var(--spec-accent)" />
      <HDimension
        x1={164}
        x2={endX}
        y={y - 16}
        fromY1={y}
        fromY2={y}
        label={`A ${dimValue}`}
        dimKey={dimKey}
        active={active}
        ids={ids}
      />
    </>
  );
}

function TeeBody({
  ids,
  dimValue,
  active,
  dimKey,
}: {
  ids: SvgIds;
  dimValue: string;
  active: string | null;
  dimKey: string;
}) {
  return (
    <>
      <rect
        x="64"
        y="70"
        width="212"
        height="28"
        rx="6"
        fill={`url(#${ids.metal})`}
        stroke="var(--spec-text3)"
        filter={`url(#${ids.shadow})`}
      />
      <rect
        x="156"
        y="70"
        width="28"
        height="64"
        rx="6"
        fill={`url(#${ids.hatch})`}
        stroke="var(--spec-text3)"
      />
      <circle cx="170" cy="84" r="10" fill={`url(#${ids.metal})`} stroke="var(--spec-text3)" />
      <HDimension
        x1={170}
        x2={276}
        y={58}
        fromY1={84}
        fromY2={84}
        label={`M ${dimValue}`}
        dimKey={dimKey}
        active={active}
        ids={ids}
      />
    </>
  );
}

function ReducerBody({
  ids,
  dimValue,
  active,
  dimKey,
}: {
  ids: SvgIds;
  dimValue: string;
  active: string | null;
  dimKey: string;
}) {
  return (
    <>
      <polygon
        points="72,56 168,68 168,108 72,120"
        fill={`url(#${ids.metal})`}
        stroke="var(--spec-text3)"
        filter={`url(#${ids.shadow})`}
      />
      <polygon
        points="168,68 268,76 268,100 168,108"
        fill={`url(#${ids.hatch})`}
        stroke="var(--spec-text3)"
      />
      <HDimension
        x1={72}
        x2={268}
        y={144}
        fromY1={120}
        fromY2={100}
        label={`E ${dimValue}`}
        dimKey={dimKey}
        active={active}
        ids={ids}
      />
    </>
  );
}
