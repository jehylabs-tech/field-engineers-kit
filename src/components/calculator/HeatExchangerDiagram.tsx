"use client";

type Props = {
  thIn: number;
  thOut: number;
  tcIn: number;
  tcOut: number;
  shellPasses: number;
  unitLabel: string;
  temperatureCross: boolean;
};

/**
 * Compact shell-and-tube / counterflow temperature sketch for afterHero.
 */
export default function HeatExchangerDiagram({
  thIn,
  thOut,
  tcIn,
  tcOut,
  shellPasses,
  unitLabel,
  temperatureCross,
}: Props) {
  const label = `Shell-and-tube heat exchanger temperature sketch · ${shellPasses}-shell pass · hot ${thIn.toFixed(0)}→${thOut.toFixed(0)} ${unitLabel} · cold ${tcIn.toFixed(0)}→${tcOut.toFixed(0)} ${unitLabel}`;

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40">
      <svg
        role="img"
        aria-label={label}
        viewBox="0 0 420 160"
        className="h-auto w-full max-w-xl"
      >
        <title>{label}</title>
        {/* Shell outline */}
        <rect
          x="60"
          y="40"
          width="300"
          height="80"
          rx="12"
          fill="#f8fafc"
          stroke="#64748b"
          strokeWidth="2"
        />
        {/* Tube bundle hint */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1="80"
            y1={55 + i * 12}
            x2="340"
            y2={55 + i * 12}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray={i % 2 === 0 ? undefined : "4 3"}
          />
        ))}
        {/* Hot arrows */}
        <path
          d="M20 55 H55"
          stroke="#dc2626"
          strokeWidth="2.5"
          markerEnd="url(#hx-hot)"
        />
        <path
          d="M365 55 H400"
          stroke="#dc2626"
          strokeWidth="2.5"
          markerEnd="url(#hx-hot)"
        />
        <text x="20" y="48" fontSize="11" fill="#b91c1c" fontFamily="system-ui">
          Hot in {thIn.toFixed(0)}
          {unitLabel}
        </text>
        <text x="310" y="48" fontSize="11" fill="#b91c1c" fontFamily="system-ui">
          Hot out {thOut.toFixed(0)}
          {unitLabel}
        </text>
        {/* Cold arrows (counterflow) */}
        <path
          d="M400 105 H365"
          stroke="#2563eb"
          strokeWidth="2.5"
          markerEnd="url(#hx-cold)"
        />
        <path
          d="M55 105 H20"
          stroke="#2563eb"
          strokeWidth="2.5"
          markerEnd="url(#hx-cold)"
        />
        <text x="290" y="128" fontSize="11" fill="#1d4ed8" fontFamily="system-ui">
          Cold in {tcIn.toFixed(0)}
          {unitLabel}
        </text>
        <text x="20" y="128" fontSize="11" fill="#1d4ed8" fontFamily="system-ui">
          Cold out {tcOut.toFixed(0)}
          {unitLabel}
        </text>
        <text
          x="210"
          y="28"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="#334155"
          fontFamily="system-ui"
        >
          {shellPasses}-shell / 2n-tube · counterflow LMTD
          {temperatureCross ? " · TEMP CROSS" : ""}
        </text>
        <defs>
          <marker
            id="hx-hot"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" />
          </marker>
          <marker
            id="hx-cold"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="#2563eb" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
