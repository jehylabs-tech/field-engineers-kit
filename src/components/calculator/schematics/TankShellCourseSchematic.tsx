"use client";

import SchematicFrame from "@/components/calculator/schematics/SchematicFrame";

export type TankShellCourseVisual = {
  course: number;
  tNomLabel: string;
  highlight?: boolean;
};

type TankShellCourseSchematicProps = {
  diameterLabel: string;
  heightLabel: string;
  courses: TankShellCourseVisual[];
};

/** Stacked shell-course elevation for API 650 1-foot screening. */
export default function TankShellCourseSchematic({
  diameterLabel,
  heightLabel,
  courses,
}: TankShellCourseSchematicProps) {
  const n = Math.max(1, courses.length);
  const bodyH = 140;
  const courseH = bodyH / n;
  const x0 = 80;
  const w = 200;

  return (
    <SchematicFrame
      title={`API 650 shell courses · ${diameterLabel} · ${heightLabel}`}
      size="large"
      caption="1-foot method course stack — bottom course governs product / hydro head. Wind girders out of scope."
    >
      <svg
        viewBox="0 0 420 200"
        className="h-full w-full max-w-full"
        role="img"
        aria-label={`API 650 tank shell course diagram, ${n} courses, diameter ${diameterLabel}, height ${heightLabel} per API 650 Section 5.6.3`}
      >
        <title>
          {`Tank shell courses — ${n} rings, D ${diameterLabel}, H ${heightLabel}`}
        </title>
        {/* Ground */}
        <line
          x1={40}
          y1={175}
          x2={380}
          y2={175}
          className="stroke-slate-400 dark:stroke-slate-500"
          strokeWidth="1.5"
        />
        {[...courses].reverse().map((c, revIdx) => {
          const idxFromTop = revIdx;
          const y = 30 + idxFromTop * courseH;
          const isBottom = c.course === 1;
          return (
            <g key={c.course}>
              <rect
                x={x0}
                y={y}
                width={w}
                height={courseH - 1}
                className={
                  isBottom
                    ? "fill-sky-100 stroke-sky-700 dark:fill-sky-950/50 dark:stroke-sky-400"
                    : "fill-slate-50 stroke-slate-500 dark:fill-spec-bg dark:stroke-slate-400"
                }
                strokeWidth="1.5"
              />
              <text
                x={x0 + w / 2}
                y={y + courseH / 2 + 3}
                textAnchor="middle"
                className="fill-slate-700 dark:fill-slate-200"
                style={{ fontSize: 9, fontWeight: isBottom ? 700 : 500 }}
              >
                {`C${c.course} · ${c.tNomLabel}`}
              </text>
            </g>
          );
        })}
        <text
          x={x0 + w / 2}
          y={20}
          textAnchor="middle"
          className="fill-slate-500 dark:fill-slate-400"
          style={{ fontSize: 9 }}
        >
          {`D = ${diameterLabel}`}
        </text>
        <text
          x={300}
          y={100}
          className="fill-slate-600 dark:fill-slate-300"
          style={{ fontSize: 9 }}
        >
          {`H = ${heightLabel}`}
        </text>
        <text
          x={x0 + w / 2}
          y={190}
          textAnchor="middle"
          className="fill-slate-500 dark:fill-slate-400"
          style={{ fontSize: 8 }}
        >
          Bottom = Course 1
        </text>
      </svg>
    </SchematicFrame>
  );
}
