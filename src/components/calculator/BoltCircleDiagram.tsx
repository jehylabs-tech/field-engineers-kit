"use client";

import { layoutBoltCircle } from "@/lib/calculators/bolt-circle-layout";

type BoltCircleDiagramProps = {
  boltCount: number;
  /** Bolt number (1…N) currently highlighted; null = none. */
  activeBolt?: number | null;
  /** Optional completed bolts (dimmer highlight). */
  completedBolts?: number[];
  className?: string;
  title?: string;
};

export { layoutBoltCircle } from "@/lib/calculators/bolt-circle-layout";

/** Build the same bolt-numbering SVG used on-page (neutral, no active highlight). */
export function buildBoltNumberingSvgMarkup(boltCount: number): string | null {
  const n =
    Number.isFinite(boltCount) && boltCount > 0 ? Math.round(boltCount) : 0;
  if (n < 4) return null;

  const { boltR, fontSize, ringR, guideR, strokeW } = layoutBoltCircle(n);
  const positions = Array.from({ length: n }, (_, index) => {
    const angle = (index / n) * 2 * Math.PI - Math.PI / 2;
    return {
      number: index + 1,
      x: 50 + ringR * Math.cos(angle),
      y: 50 + ringR * Math.sin(angle),
    };
  });

  const bolts = positions
    .map((bolt) => {
      return [
        `<circle cx="${bolt.x}" cy="${bolt.y}" r="${boltR}" fill="#EEF2FF" stroke="#3D5AFE" stroke-width="${strokeW}"/>`,
        `<text x="${bolt.x}" y="${bolt.y + fontSize * 0.35}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="#1A1D21" font-family="ui-monospace, monospace">${bolt.number}</text>`,
      ].join("");
    })
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 100 100">`,
    `<rect width="100" height="100" fill="#FFFFFF"/>`,
    `<circle cx="50" cy="50" r="${guideR}" fill="none" stroke="#DDE1E6" stroke-width="1.5"/>`,
    bolts,
    `</svg>`,
  ].join("");
}

/**
 * Rasterize bolt numbering for PDF — canvas draw (no SVG Image load; more reliable in browsers).
 */
export function boltNumberingDiagramPngDataUrl(
  boltCount: number,
  pixelSize = 640,
): Promise<string | null> {
  const n =
    Number.isFinite(boltCount) && boltCount > 0 ? Math.round(boltCount) : 0;
  if (n < 4) return Promise.resolve(null);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = pixelSize;
    canvas.height = pixelSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve(null);

    const scale = pixelSize / 100;
    const { boltR, fontSize, ringR, guideR, strokeW } = layoutBoltCircle(n);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, pixelSize, pixelSize);

    ctx.beginPath();
    ctx.arc(50 * scale, 50 * scale, guideR * scale, 0, Math.PI * 2);
    ctx.strokeStyle = "#DDE1E6";
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.stroke();

    for (let index = 0; index < n; index += 1) {
      const angle = (index / n) * 2 * Math.PI - Math.PI / 2;
      const x = (50 + ringR * Math.cos(angle)) * scale;
      const y = (50 + ringR * Math.sin(angle)) * scale;
      const r = boltR * scale;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#EEF2FF";
      ctx.fill();
      ctx.strokeStyle = "#3D5AFE";
      ctx.lineWidth = Math.max(1, strokeW * scale);
      ctx.stroke();

      ctx.fillStyle = "#1A1D21";
      ctx.font = `600 ${Math.max(10, fontSize * scale)}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index + 1), x, y);
    }

    return Promise.resolve(canvas.toDataURL("image/png"));
  } catch {
    return Promise.resolve(null);
  }
}

/**
 * Clockwise bolt circle with bolt 1 at top — shared by Bolt Torque & Sequence Generator.
 */
export default function BoltCircleDiagram({
  boltCount,
  activeBolt = null,
  completedBolts = [],
  className = "",
  title = "Bolt numbering (clockwise from top)",
}: BoltCircleDiagramProps) {
  const n =
    Number.isFinite(boltCount) && boltCount > 0 ? Math.round(boltCount) : 0;
  if (n < 4) {
    return (
      <div
        className={`rounded-md border border-spec-border bg-spec-panel p-3 ${className}`}
      >
        <p className="text-sm text-spec-text3">
          Select a bolt count to view the diagram.
        </p>
      </div>
    );
  }

  const { boltR, fontSize, ringR, guideR, strokeW } = layoutBoltCircle(n);
  const completed = new Set(completedBolts);

  const positions = Array.from({ length: n }, (_, index) => {
    const angle = (index / n) * 2 * Math.PI - Math.PI / 2;
    return {
      number: index + 1,
      x: 50 + ringR * Math.cos(angle),
      y: 50 + ringR * Math.sin(angle),
    };
  });

  return (
    <div
      className={`rounded-md border border-spec-border bg-spec-panel p-3 ${className}`}
    >
      <p className="mb-2 text-sm font-medium text-spec-text2">{title}</p>
      <svg
        viewBox="0 0 100 100"
        className="mx-auto h-52 w-52 max-w-full overflow-visible sm:h-60 sm:w-60"
        role="img"
        aria-label={`${n}-bolt flange circle${activeBolt ? `, active bolt ${activeBolt}` : ""}`}
      >
        <circle
          cx="50"
          cy="50"
          r={guideR}
          fill="none"
          stroke="#DDE1E6"
          strokeWidth="1.5"
        />
        {positions.map((bolt) => {
          const isActive = activeBolt === bolt.number;
          const isDone = completed.has(bolt.number);
          const fill = isActive ? "#3D5AFE" : isDone ? "#C7D2FE" : "#EEF2FF";
          const stroke = isActive ? "#1E3A8A" : "#3D5AFE";
          const textFill = isActive ? "#FFFFFF" : "#1A1D21";
          const r = isActive ? boltR + Math.min(0.6, boltR * 0.12) : boltR;
          return (
            <g key={bolt.number}>
              <circle
                cx={bolt.x}
                cy={bolt.y}
                r={r}
                fill={fill}
                stroke={stroke}
                strokeWidth={isActive ? strokeW + 0.35 : strokeW}
              />
              <text
                x={bolt.x}
                y={bolt.y + fontSize * 0.35}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight="600"
                fill={textFill}
                fontFamily="ui-monospace, monospace"
              >
                {bolt.number}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
