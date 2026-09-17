"use client";

import {
  NC_FREQUENCIES_HZ,
  NC_LEVELS,
  ncCurveLimits,
} from "@/lib/calculators/engines/noise-criterion";

type Props = {
  spectrum: number[];
  ncRating: number;
  tangentBandIndex: number;
  spaceMaxNc: number;
  invalid?: boolean;
};

const CHART_NC = [25, 35, 45, 55, 65] as const;

export default function NcRatingChart({
  spectrum,
  ncRating,
  tangentBandIndex,
  spaceMaxNc,
  invalid,
}: Props) {
  const w = 520;
  const h = 260;
  const pad = { l: 44, r: 14, t: 20, b: 40 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  const freqs = NC_FREQUENCIES_HZ;
  const yMin = 0;
  const yMax = 90;

  const xOf = (i: number) =>
    pad.l + (i / Math.max(1, freqs.length - 1)) * plotW;
  const yOf = (db: number) =>
    pad.t + plotH - ((db - yMin) / (yMax - yMin)) * plotH;

  function pathFor(values: number[]) {
    return values
      .map((db, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(db).toFixed(1)}`)
      .join(" ");
  }

  const ratedNc = Number.isFinite(ncRating)
    ? Math.min(
        NC_LEVELS[NC_LEVELS.length - 1],
        Math.max(NC_LEVELS[0], Math.round(ncRating / 5) * 5),
      )
    : 35;
  const ratedCurve = ncCurveLimits(ratedNc) ?? ncCurveLimits(35)!;
  const spaceCurve = ncCurveLimits(spaceMaxNc);

  const yTicks = [0, 20, 40, 60, 80];

  return (
    <div className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-2 dark:border-spec-border dark:bg-spec-bg">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Octave band sound pressure spectrum versus Noise Criterion curves NC-15 to NC-65 per ANSI/ASA S12.2. Rated ${Number.isFinite(ncRating) ? `NC-${ncRating}` : "—"}.`}
      >
        <title>
          {`NC octave-band spectrum vs NC curves — rated NC-${Number.isFinite(ncRating) ? ncRating : "—"}`}
        </title>

        {yTicks.map((db) => (
          <g key={db}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={yOf(db)}
              y2={yOf(db)}
              className="stroke-slate-200 dark:stroke-spec-border"
              strokeWidth={1}
            />
            <text
              x={pad.l - 6}
              y={yOf(db) + 3}
              textAnchor="end"
              className="fill-slate-500 text-[10px] dark:fill-slate-400"
            >
              {db}
            </text>
          </g>
        ))}

        {CHART_NC.map((nc) => {
          const curve = ncCurveLimits(nc);
          if (!curve) return null;
          const isRated = nc === ratedNc && !invalid;
          return (
            <path
              key={nc}
              d={pathFor(curve)}
              fill="none"
              className={
                isRated
                  ? "stroke-blue-600 dark:stroke-blue-400"
                  : "stroke-slate-300 dark:stroke-slate-600"
              }
              strokeWidth={isRated ? 2.25 : 1}
              strokeDasharray={isRated ? undefined : "4 3"}
              opacity={isRated ? 1 : 0.75}
            />
          );
        })}

        {spaceCurve && spaceMaxNc !== ratedNc ? (
          <path
            d={pathFor(spaceCurve)}
            fill="none"
            className="stroke-emerald-600 dark:stroke-emerald-400"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
        ) : null}

        {!invalid ? (
          <>
            <path
              d={pathFor(spectrum)}
              fill="none"
              className="stroke-amber-600 dark:stroke-amber-400"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {spectrum.map((db, i) => (
              <circle
                key={freqs[i]}
                cx={xOf(i)}
                cy={yOf(db)}
                r={i === tangentBandIndex ? 4.5 : 3}
                className={
                  i === tangentBandIndex
                    ? "fill-amber-600 dark:fill-amber-400"
                    : "fill-white stroke-amber-600 dark:fill-spec-bg dark:stroke-amber-400"
                }
                strokeWidth={i === tangentBandIndex ? 0 : 1.5}
              />
            ))}
          </>
        ) : null}

        {freqs.map((f, i) => (
          <text
            key={f}
            x={xOf(i)}
            y={h - 12}
            textAnchor="middle"
            className="fill-slate-500 text-[9px] dark:fill-slate-400"
          >
            {f >= 1000 ? `${f / 1000}k` : f}
          </text>
        ))}

        <text
          x={pad.l}
          y={12}
          className="fill-slate-600 text-[10px] font-medium dark:fill-slate-300"
        >
          L_p (dB)
        </text>
        <text
          x={w / 2}
          y={h - 2}
          textAnchor="middle"
          className="fill-slate-500 text-[9px] dark:fill-slate-400"
        >
          Octave band center frequency (Hz)
        </text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 px-1 text-[10px] text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 bg-amber-600" /> Measured
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 bg-blue-600" /> Rated NC
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 bg-emerald-600" /> Space max NC
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 border-t border-dashed border-slate-400" />{" "}
          NC-25…65
        </span>
      </div>
    </div>
  );
}
