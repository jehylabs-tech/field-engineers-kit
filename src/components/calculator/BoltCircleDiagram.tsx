"use client";

type BoltCircleDiagramProps = {
  boltCount: number;
  /** Bolt number (1…N) currently highlighted; null = none. */
  activeBolt?: number | null;
  /** Optional completed bolts (dimmer highlight). */
  completedBolts?: number[];
  className?: string;
  title?: string;
};

/** Layout math so discs never overlap on the bolt circle (viewBox 0–100). */
export function layoutBoltCircle(n: number): {
  boltR: number;
  fontSize: number;
  ringR: number;
  guideR: number;
  strokeW: number;
} {
  const pad = 1.25;
  // Initial guess from N; shrink further if chord spacing is too tight.
  let boltR = Math.max(2.1, Math.min(9, 180 / n));
  let ringR = 50 - boltR - pad;
  const minGap = 1.08; // require slight clearance between discs
  const chord = 2 * ringR * Math.sin(Math.PI / n);
  if (chord < 2 * boltR * minGap) {
    boltR = Math.max(2.0, (ringR * Math.sin(Math.PI / n)) / minGap);
    ringR = 50 - boltR - pad;
  }
  const fontSize = Math.max(
    3.0,
    Math.min(boltR * 1.15, Math.min(9, 150 / n)),
  );
  const strokeW = n >= 32 ? 0.75 : n >= 20 ? 1.05 : 1.35;
  const guideR = Math.min(ringR * 0.92, ringR + boltR * 0.2);
  return { boltR, fontSize, ringR, guideR, strokeW };
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
