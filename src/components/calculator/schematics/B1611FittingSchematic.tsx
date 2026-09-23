"use client";

import SchematicFrame from "@/components/calculator/schematics/SchematicFrame";

type B1611FittingSchematicProps = {
  connectionLabel: string;
  fittingLabel: string;
  npsLabel: string;
  classLabel: string;
  primaryLabel: string;
  primaryValue: string;
  wallLabel: string;
  depthLabel: string;
  depthValue: string;
  showSocketGap: boolean;
  gapLabel: string;
  /** Elbow/tee family vs coupling/cap inline body. */
  shapeKind?: "elbow" | "inline";
};

/** Envelope sketch for B16.11 SW / threaded fittings (A/J/G + optional gap). */
export default function B1611FittingSchematic({
  connectionLabel,
  fittingLabel,
  npsLabel,
  classLabel,
  primaryLabel,
  primaryValue,
  wallLabel,
  depthLabel,
  depthValue,
  showSocketGap,
  gapLabel,
  shapeKind = "elbow",
}: B1611FittingSchematicProps) {
  return (
    <SchematicFrame
      title={`B16.11 ${fittingLabel} · ${npsLabel}`}
      size="large"
      caption="ASME B16.11 forged fitting envelope — confirm OEM chart before purchase."
    >
      <svg
        viewBox="0 0 420 240"
        className="h-full w-full max-w-full"
        role="img"
        aria-label={`${npsLabel} ${fittingLabel} ${connectionLabel} ${classLabel} fitting diagram per ASME B16.11 showing ${primaryLabel} ${primaryValue}, wall ${wallLabel}, ${depthLabel} ${depthValue}`}
      >
        <title>
          {`${npsLabel} ${fittingLabel} B16.11 diagram — ${primaryLabel} ${primaryValue}, G ${wallLabel}, ${depthLabel} ${depthValue}`}
        </title>
        <defs>
          <linearGradient id="b1611-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#475569" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {shapeKind === "inline" ? (
          <>
            <rect
              x="110"
              y="100"
              width="200"
              height="70"
              rx="6"
              fill="url(#b1611-metal)"
              className="stroke-slate-600 dark:stroke-slate-300"
              strokeWidth="1.5"
            />
            <rect
              x="118"
              y="112"
              width="55"
              height="46"
              className="fill-slate-100/90 stroke-slate-500 dark:fill-slate-900/60 dark:stroke-slate-400"
              strokeWidth="1"
            />
            <rect
              x="247"
              y="112"
              width="55"
              height="46"
              className="fill-slate-100/90 stroke-slate-500 dark:fill-slate-900/60 dark:stroke-slate-400"
              strokeWidth="1"
            />
            <rect
              x="70"
              y="124"
              width="40"
              height="22"
              className="fill-slate-400/80 dark:fill-slate-500/70"
            />
            <rect
              x="310"
              y="124"
              width="40"
              height="22"
              className="fill-slate-400/80 dark:fill-slate-500/70"
            />
            <line
              x1="110"
              y1="88"
              x2="310"
              y2="88"
              className="stroke-blue-600 dark:stroke-blue-400"
              strokeWidth="1.25"
            />
            <text
              x="180"
              y="82"
              className="fill-blue-800 text-[10px] font-semibold dark:fill-blue-200"
            >
              {primaryLabel} {primaryValue}
            </text>
            {showSocketGap ? (
              <text
                x="118"
                y="108"
                className="fill-amber-700 text-[9px] font-semibold dark:fill-amber-300"
              >
                g_sw {gapLabel}
              </text>
            ) : null}
          </>
        ) : (
          <>
            <path
              d="M70 150 H160 V90 H240 V150 H310 V175 H240 V210 H160 V175 H70 Z"
              fill="url(#b1611-metal)"
              className="stroke-slate-600 dark:stroke-slate-300"
              strokeWidth="1.5"
            />
            <rect
              x="78"
              y="158"
              width="70"
              height="28"
              className="fill-slate-100/90 stroke-slate-500 dark:fill-slate-900/60 dark:stroke-slate-400"
              strokeWidth="1"
            />
            <rect
              x="248"
              y="158"
              width="54"
              height="28"
              className="fill-slate-100/90 stroke-slate-500 dark:fill-slate-900/60 dark:stroke-slate-400"
              strokeWidth="1"
            />
            <rect
              x="40"
              y="164"
              width="38"
              height="16"
              className="fill-slate-400/80 dark:fill-slate-500/70"
            />
            <rect
              x="302"
              y="164"
              width="48"
              height="16"
              className="fill-slate-400/80 dark:fill-slate-500/70"
            />
            {showSocketGap ? (
              <>
                <line
                  x1="148"
                  y1="158"
                  x2="148"
                  y2="186"
                  className="stroke-amber-500 dark:stroke-amber-400"
                  strokeWidth="2"
                  strokeDasharray="3 2"
                />
                <text
                  x="152"
                  y="154"
                  className="fill-amber-700 text-[9px] font-semibold dark:fill-amber-300"
                >
                  g_sw {gapLabel}
                </text>
              </>
            ) : null}
            <line
              x1="200"
              y1="90"
              x2="200"
              y2="150"
              className="stroke-blue-600 dark:stroke-blue-400"
              strokeWidth="1.25"
            />
            <text
              x="206"
              y="118"
              className="fill-blue-800 text-[10px] font-semibold dark:fill-blue-200"
            >
              {primaryLabel} {primaryValue}
            </text>
          </>
        )}

        <text
          x="16"
          y="28"
          className="fill-slate-700 text-[11px] font-semibold dark:fill-slate-200"
        >
          {npsLabel} · {fittingLabel} · {classLabel}
        </text>
        <text
          x="16"
          y="46"
          className="fill-slate-600 text-[10px] dark:fill-slate-300"
        >
          {connectionLabel}
        </text>
        <text
          x="16"
          y="220"
          className="fill-slate-600 text-[10px] dark:fill-slate-300"
        >
          G {wallLabel} · {depthLabel} {depthValue}
        </text>
      </svg>
    </SchematicFrame>
  );
}
