"use client";

import SchematicFrame from "@/components/calculator/schematics/SchematicFrame";

type ThermalLoopSchematicProps = {
  hLabel: string;
  wLabel: string;
  g1Label: string;
  g2Label: string;
  deltaLLabel: string;
  npsLabel: string;
};

/** Interactive U-loop layout with H, W, G1, G2, ΔL callouts. */
export default function ThermalLoopSchematic({
  hLabel,
  wLabel,
  g1Label,
  g2Label,
  deltaLLabel,
  npsLabel,
}: ThermalLoopSchematicProps) {
  return (
    <SchematicFrame
      title={`U-loop layout · ${npsLabel}`}
      size="large"
      caption="Guided-cantilever screening geometry — confirm with formal flexibility analysis for equipment nozzles."
    >
      <svg
        viewBox="0 0 420 220"
        className="h-full w-full max-w-full"
        role="img"
        aria-label="U-loop expansion diagram with anchors, guides, and dimension labels"
      >
        <defs>
          <marker
            id="thermal-arrow"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" className="fill-blue-600 dark:fill-blue-400" />
          </marker>
        </defs>

        {/* Pipe rack baseline */}
        <line
          x1="28"
          y1="168"
          x2="392"
          y2="168"
          className="stroke-slate-300 dark:stroke-slate-600"
          strokeWidth="1"
          strokeDasharray="4 3"
        />

        {/* Main run + U-loop */}
        <path
          d="M40 150 H130 V48 H290 V150 H380"
          fill="none"
          className="stroke-slate-800 dark:stroke-slate-100"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Anchors */}
        <rect x="32" y="142" width="16" height="16" className="fill-slate-700 dark:fill-slate-200" />
        <rect x="372" y="142" width="16" height="16" className="fill-slate-700 dark:fill-slate-200" />
        <text x="40" y="190" textAnchor="middle" className="fill-slate-600 text-[9px] dark:fill-slate-300">
          Anchor
        </text>
        <text x="380" y="190" textAnchor="middle" className="fill-slate-600 text-[9px] dark:fill-slate-300">
          Anchor
        </text>

        {/* Guides G1 / G2 (left of loop) */}
        <line x1="108" y1="138" x2="108" y2="162" className="stroke-emerald-600" strokeWidth="2.5" />
        <line x1="78" y1="138" x2="78" y2="162" className="stroke-emerald-600" strokeWidth="2.5" />
        <text x="108" y="178" textAnchor="middle" className="fill-emerald-700 text-[8px] font-semibold dark:fill-emerald-300">
          G₁ {g1Label}
        </text>
        <text x="78" y="205" textAnchor="middle" className="fill-emerald-700 text-[8px] font-semibold dark:fill-emerald-300">
          G₂ {g2Label}
        </text>

        {/* Guides right of loop (mirror) */}
        <line x1="312" y1="138" x2="312" y2="162" className="stroke-emerald-600" strokeWidth="2.5" />
        <line x1="342" y1="138" x2="342" y2="162" className="stroke-emerald-600" strokeWidth="2.5" />

        {/* H dimension (loop height) */}
        <line
          x1="300"
          y1="48"
          x2="300"
          y2="150"
          className="stroke-blue-500"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
        <text x="312" y="100" className="fill-blue-700 text-[9px] font-bold dark:fill-blue-300">
          H = {hLabel}
        </text>

        {/* W dimension (loop width) */}
        <line
          x1="130"
          y1="36"
          x2="290"
          y2="36"
          className="stroke-blue-500"
          strokeWidth="1"
          markerStart="url(#thermal-arrow)"
          markerEnd="url(#thermal-arrow)"
        />
        <text x="210" y="28" textAnchor="middle" className="fill-blue-700 text-[9px] font-bold dark:fill-blue-300">
          W = {wLabel}
        </text>

        {/* Expansion arrows ΔL */}
        <line
          x1="50"
          y1="128"
          x2="95"
          y2="128"
          className="stroke-amber-600"
          strokeWidth="1.5"
          markerEnd="url(#thermal-arrow)"
        />
        <line
          x1="370"
          y1="128"
          x2="325"
          y2="128"
          className="stroke-amber-600"
          strokeWidth="1.5"
          markerEnd="url(#thermal-arrow)"
        />
        <text x="210" y="165" textAnchor="middle" className="fill-amber-700 text-[9px] font-semibold dark:fill-amber-300">
          ΔL = {deltaLLabel} (into loop)
        </text>
      </svg>
    </SchematicFrame>
  );
}
