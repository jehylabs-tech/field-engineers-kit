"use client";

type PtPoint = { tC: number; pBar: number };

type Props = {
  points: PtPoint[];
  designTC: number;
  designPBar: number;
  classLabel: string;
  groupLabel: string;
  unitSystem: "metric" | "imperial";
};

const BAR_TO_PSI = 14.5037738;

export default function FlangePtRatingChart({
  points,
  designTC,
  designPBar,
  classLabel,
  groupLabel,
  unitSystem,
}: Props) {
  const w = 440;
  const h = 220;
  const pad = { l: 48, r: 16, t: 16, b: 36 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  if (!points.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-500 dark:border-spec-border dark:text-slate-400">
        No P-T curve for this selection
      </div>
    );
  }

  const tMin = Math.min(...points.map((p) => p.tC));
  const tMax = Math.max(...points.map((p) => p.tC));
  const pMax = Math.max(...points.map((p) => p.pBar), designPBar) * 1.08;

  const xOf = (t: number) =>
    pad.l + ((t - tMin) / Math.max(1e-9, tMax - tMin)) * plotW;
  const yOf = (p: number) => pad.t + plotH - (p / Math.max(1e-9, pMax)) * plotH;

  const path = points
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${xOf(pt.tC).toFixed(1)} ${yOf(pt.pBar).toFixed(1)}`)
    .join(" ");

  const designX = xOf(Math.min(tMax, Math.max(tMin, designTC)));
  const designY = yOf(designPBar);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => pMax * f);
  const xTicks = [tMin, (tMin + tMax) / 2, tMax];

  const fmtP = (bar: number) => {
    const v = unitSystem === "imperial" ? bar * BAR_TO_PSI : bar;
    if (v >= 100) return Math.round(v).toString();
    if (v >= 10) return v.toFixed(0);
    return v.toFixed(1);
  };
  const fmtT = (tC: number) =>
    unitSystem === "imperial"
      ? `${Math.round(tC * 1.8 + 32)}`
      : `${Math.round(tC)}`;
  const pUnit = unitSystem === "imperial" ? "psi" : "bar";
  const tUnit = unitSystem === "imperial" ? "°F" : "°C";

  return (
    <div className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-2 dark:border-spec-border dark:bg-spec-bg">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${groupLabel} Class ${classLabel} flange pressure-temperature rating curve per ASME B16.5`}
      >
        <title>
          {`ASME B16.5 ${groupLabel} Class ${classLabel} P-T rating curve`}
        </title>
        {/* axes */}
        <line
          x1={pad.l}
          y1={pad.t}
          x2={pad.l}
          y2={pad.t + plotH}
          stroke="currentColor"
          className="text-slate-300 dark:text-slate-600"
        />
        <line
          x1={pad.l}
          y1={pad.t + plotH}
          x2={pad.l + plotW}
          y2={pad.t + plotH}
          stroke="currentColor"
          className="text-slate-300 dark:text-slate-600"
        />
        {yTicks.map((p) => (
          <g key={`y-${p}`}>
            <line
              x1={pad.l}
              y1={yOf(p)}
              x2={pad.l + plotW}
              y2={yOf(p)}
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
            />
            <text
              x={pad.l - 6}
              y={yOf(p) + 3}
              textAnchor="end"
              className="fill-slate-500 text-[10px] dark:fill-slate-400"
            >
              {fmtP(p)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text
            key={`x-${t}`}
            x={xOf(t)}
            y={h - 8}
            textAnchor="middle"
            className="fill-slate-500 text-[10px] dark:fill-slate-400"
          >
            {fmtT(t)}
          </text>
        ))}
        <text
          x={12}
          y={pad.t + plotH / 2}
          transform={`rotate(-90 12 ${pad.t + plotH / 2})`}
          textAnchor="middle"
          className="fill-slate-500 text-[10px] dark:fill-slate-400"
        >
          {`P (${pUnit})`}
        </text>
        <text
          x={pad.l + plotW / 2}
          y={h - 2}
          textAnchor="middle"
          className="fill-slate-500 text-[10px] dark:fill-slate-400"
        >
          {`T (${tUnit})`}
        </text>
        <path
          d={path}
          fill="none"
          stroke="#2563eb"
          strokeWidth={2.25}
          strokeLinejoin="round"
        />
        {points.map((pt) => (
          <circle
            key={`${pt.tC}-${pt.pBar}`}
            cx={xOf(pt.tC)}
            cy={yOf(pt.pBar)}
            r={2.5}
            className="fill-blue-600 dark:fill-blue-400"
          />
        ))}
        <circle
          cx={designX}
          cy={designY}
          r={5}
          className="fill-amber-500 stroke-white stroke-2 dark:stroke-slate-900"
        />
      </svg>
      <p className="m-0 px-1 pb-1 text-center text-[11px] text-slate-500 dark:text-slate-400">
        P-T rating curve · design point highlighted · ASME B16.5 Phase-1 table
      </p>
    </div>
  );
}
