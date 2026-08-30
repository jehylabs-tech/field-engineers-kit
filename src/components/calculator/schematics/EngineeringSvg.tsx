"use client";

import { useId, type ReactNode } from "react";
import {
  schematicClass,
  schematicStroke,
  schematicText,
  schematicWidth,
} from "@/components/calculator/schematics/SchematicHighlight";

export type SvgIds = {
  grid: string;
  hatch: string;
  metal: string;
  shadow: string;
  arrow: string;
  arrowRev: string;
  arrowHot: string;
  arrowHotRev: string;
};

function makeIds(prefix: string): SvgIds {
  return {
    grid: `${prefix}-grid`,
    hatch: `${prefix}-hatch`,
    metal: `${prefix}-metal`,
    shadow: `${prefix}-shadow`,
    arrow: `${prefix}-arrow`,
    arrowRev: `${prefix}-arrow-rev`,
    arrowHot: `${prefix}-arrow-hot`,
    arrowHotRev: `${prefix}-arrow-hot-rev`,
  };
}

export function EngineeringCanvas({
  viewBox = "0 0 340 196",
  label,
  children,
}: {
  viewBox?: string;
  label: string;
  children: (ids: SvgIds) => ReactNode;
}) {
  const prefix = useId().replace(/:/g, "");
  const ids = makeIds(prefix);
  const parts = viewBox.split(" ").map(Number);
  const width = parts[2] ?? 340;
  const height = parts[3] ?? 196;

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className="mx-auto block h-auto w-full max-w-full"
      role="img"
      aria-label={label}
    >
      <defs>
        <pattern
          id={ids.grid}
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 10 0 L 0 0 0 10"
            fill="none"
            stroke="var(--spec-text3)"
            strokeWidth="0.4"
          />
        </pattern>
        <pattern
          id={ids.hatch}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="6"
            stroke="var(--spec-text3)"
            strokeWidth="0.85"
          />
        </pattern>
        <linearGradient id={ids.metal} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--spec-bg)" />
          <stop offset="42%" stopColor="var(--spec-panel)" />
          <stop offset="100%" stopColor="var(--spec-border-strong)" />
        </linearGradient>
        <filter id={ids.shadow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0.6"
            dy="1.1"
            stdDeviation="1.15"
            floodColor="var(--spec-text)"
            floodOpacity="0.22"
          />
        </filter>
        <marker
          id={ids.arrow}
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 7 3.5, 0 7" fill="var(--spec-text3)" />
        </marker>
        <marker
          id={ids.arrowRev}
          markerWidth="7"
          markerHeight="7"
          refX="1"
          refY="3.5"
          orient="auto"
        >
          <polygon points="7 0, 0 3.5, 7 7" fill="var(--spec-text3)" />
        </marker>
        <marker
          id={ids.arrowHot}
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 7 3.5, 0 7" fill="var(--spec-accent)" />
        </marker>
        <marker
          id={ids.arrowHotRev}
          markerWidth="7"
          markerHeight="7"
          refX="1"
          refY="3.5"
          orient="auto"
        >
          <polygon points="7 0, 0 3.5, 7 7" fill="var(--spec-accent)" />
        </marker>
      </defs>
      <rect
        width={width}
        height={height}
        fill={`url(#${ids.grid})`}
        opacity="0.15"
      />
      {children(ids)}
    </svg>
  );
}

const MONO = "ui-monospace, monospace";

export function DimText({
  x,
  y,
  dimKey,
  active,
  children,
  anchor = "middle",
  fontSize = 11,
  emphasis = false,
}: {
  x: number;
  y: number;
  dimKey: string;
  active: string | null;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
  fontSize?: number;
  emphasis?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={emphasis ? "#1e293b" : schematicText(active, dimKey)}
      fontSize={fontSize}
      fontWeight={emphasis ? 600 : 400}
      fontFamily={MONO}
      className={schematicClass(active, dimKey)}
    >
      {children}
    </text>
  );
}

export function HDimension({
  x1,
  x2,
  y,
  fromY1,
  fromY2,
  label,
  dimKey,
  active,
  ids,
  labelEmphasis = false,
}: {
  x1: number;
  x2: number;
  y: number;
  fromY1: number;
  fromY2?: number;
  label: string;
  dimKey: string;
  active: string | null;
  ids: SvgIds;
  labelEmphasis?: boolean;
}) {
  const hot = active === dimKey;
  const stroke = schematicStroke(active, dimKey);
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);
  const ext2 = fromY2 ?? fromY1;
  return (
    <g className={schematicClass(active, dimKey)}>
      <line
        x1={start}
        y1={fromY1}
        x2={start}
        y2={y}
        stroke={stroke}
        strokeWidth="0.8"
      />
      <line
        x1={end}
        y1={ext2}
        x2={end}
        y2={y}
        stroke={stroke}
        strokeWidth="0.8"
      />
      <line
        x1={start}
        y1={y}
        x2={end}
        y2={y}
        stroke={stroke}
        strokeWidth={schematicWidth(active, dimKey)}
        markerStart={`url(#${hot ? ids.arrowHotRev : ids.arrowRev})`}
        markerEnd={`url(#${hot ? ids.arrowHot : ids.arrow})`}
      />
      <DimText
        x={(start + end) / 2}
        y={y - 5}
        dimKey={dimKey}
        active={active}
        fontSize={labelEmphasis ? 14 : 11}
        emphasis={labelEmphasis}
      >
        {label}
      </DimText>
    </g>
  );
}

export function VDimension({
  y1,
  y2,
  x,
  fromX1,
  fromX2,
  label,
  dimKey,
  active,
  ids,
}: {
  y1: number;
  y2: number;
  x: number;
  fromX1: number;
  fromX2?: number;
  label: string;
  dimKey: string;
  active: string | null;
  ids: SvgIds;
}) {
  const hot = active === dimKey;
  const stroke = schematicStroke(active, dimKey);
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);
  const ext2 = fromX2 ?? fromX1;
  return (
    <g className={schematicClass(active, dimKey)}>
      <line
        x1={fromX1}
        y1={start}
        x2={x}
        y2={start}
        stroke={stroke}
        strokeWidth="0.8"
      />
      <line
        x1={ext2}
        y1={end}
        x2={x}
        y2={end}
        stroke={stroke}
        strokeWidth="0.8"
      />
      <line
        x1={x}
        y1={start}
        x2={x}
        y2={end}
        stroke={stroke}
        strokeWidth={schematicWidth(active, dimKey)}
        markerStart={`url(#${hot ? ids.arrowHotRev : ids.arrowRev})`}
        markerEnd={`url(#${hot ? ids.arrowHot : ids.arrow})`}
      />
      <DimText x={x + 6} y={(start + end) / 2 + 4} dimKey={dimKey} active={active} anchor="start">
        {label}
      </DimText>
    </g>
  );
}
