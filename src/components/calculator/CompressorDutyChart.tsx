"use client";

type CompressorDutyChartProps = {
  rp: number;
  t2C: number;
  t1C: number;
  powerKw: number;
  imperial: boolean;
};

/**
 * Compact screening chart: pressure-ratio locus vs discharge temperature
 * with current duty marker (power annotated).
 */
export default function CompressorDutyChart({
  rp,
  t2C,
  t1C,
  powerKw,
  imperial,
}: CompressorDutyChartProps) {
  const rpMax = Math.max(8, Math.ceil(rp + 1));
  const t2F = (t2C * 9) / 5 + 32;
  const tDisp = imperial ? t2F : t2C;
  const tUnit = imperial ? "°F" : "°C";
  const tAlert = imperial ? 302 : 150;
  const powerLabel = imperial
    ? `${(powerKw * 1.34102209).toFixed(powerKw * 1.34102209 >= 100 ? 0 : 1)} hp`
    : `${powerKw >= 100 ? powerKw.toFixed(0) : powerKw.toFixed(1)} kW`;

  const t1K = t1C + 273.15;
  const t2K = t2C + 273.15;
  const ex =
    rp > 1.01 && t1K > 0 ? Math.log(t2K / t1K) / Math.log(rp) : 0.25;

  const locus: Array<{ rp: number; t: number }> = [];
  for (let r = 1.2; r <= rpMax + 0.01; r += 0.35) {
    const tK = t1K * Math.pow(r, Math.max(0.05, Math.min(0.6, ex)));
    const tC = tK - 273.15;
    locus.push({
      rp: r,
      t: imperial ? (tC * 9) / 5 + 32 : tC,
    });
  }

  const tMin = imperial ? 50 : 10;
  const tMax = Math.max(tAlert * 1.4, tDisp * 1.15, imperial ? 500 : 280);
  const w = 420;
  const h = 160;
  const padL = 42;
  const padR = 16;
  const padT = 14;
  const padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const xOf = (r: number) => padL + ((r - 1) / (rpMax - 1)) * plotW;
  const yOf = (t: number) => padT + (1 - (t - tMin) / (tMax - tMin)) * plotH;

  const pathD = locus
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${xOf(p.rp).toFixed(1)},${yOf(p.t).toFixed(1)}`,
    )
    .join(" ");

  const alertY = yOf(tAlert);
  const curX = xOf(Math.min(rp, rpMax));
  const curY = yOf(tDisp);

  return (
    <div className="mt-2 border-t border-spec-border pt-2">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-spec-text3">
        Pressure ratio vs discharge temperature
      </p>
      <div className="overflow-hidden rounded-md border border-dashed border-spec-border bg-spec-bg">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="mx-auto h-auto w-full max-w-full"
          role="img"
          aria-label={`Compressor screening chart: pressure ratio ${rp.toFixed(2)} versus discharge temperature ${tDisp.toFixed(1)} ${tUnit}, gas power ${powerLabel} per GPSA / API 617`}
        >
          <title>
            {`r_p vs T₂ chart — duty r_p=${rp.toFixed(2)}, T₂=${tDisp.toFixed(1)} ${tUnit}, ${powerLabel}`}
          </title>
          <rect
            x={padL}
            y={padT}
            width={plotW}
            height={Math.max(0, alertY - padT)}
            className="fill-amber-100/50 dark:fill-amber-900/20"
          />
          <line
            x1={padL}
            y1={alertY}
            x2={padL + plotW}
            y2={alertY}
            className="stroke-amber-500 dark:stroke-amber-400"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text
            x={padL + plotW - 4}
            y={alertY - 4}
            textAnchor="end"
            className="fill-amber-700 dark:fill-amber-300"
            style={{ fontSize: 8 }}
          >
            {`API 617 ${tAlert}${tUnit}`}
          </text>
          <line
            x1={padL}
            y1={padT + plotH}
            x2={padL + plotW}
            y2={padT + plotH}
            className="stroke-slate-400 dark:stroke-slate-500"
            strokeWidth="1"
          />
          <line
            x1={padL}
            y1={padT}
            x2={padL}
            y2={padT + plotH}
            className="stroke-slate-400 dark:stroke-slate-500"
            strokeWidth="1"
          />
          <path
            d={pathD}
            fill="none"
            className="stroke-sky-600 dark:stroke-sky-400"
            strokeWidth="2"
          />
          <circle
            cx={curX}
            cy={curY}
            r={5}
            className="fill-rose-600 stroke-white dark:fill-rose-400 dark:stroke-slate-900"
            strokeWidth="1.5"
          />
          <text
            x={Math.min(curX + 8, padL + plotW - 4)}
            y={Math.max(curY - 8, padT + 10)}
            className="fill-slate-800 dark:fill-slate-100"
            style={{ fontSize: 9, fontWeight: 600 }}
          >
            {`${powerLabel} · ${tDisp.toFixed(0)}${tUnit}`}
          </text>
          <text
            x={padL + plotW / 2}
            y={h - 6}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400"
            style={{ fontSize: 9 }}
          >
            Pressure ratio r_p
          </text>
          <text
            x={12}
            y={padT + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 12 ${padT + plotH / 2})`}
            className="fill-slate-500 dark:fill-slate-400"
            style={{ fontSize: 9 }}
          >
            {`T₂ (${tUnit})`}
          </text>
        </svg>
      </div>
    </div>
  );
}
