import type { ReactNode } from "react";

type ChartFrameProps = {
  title: string;
  legend: string;
  children: ReactNode;
  legendClassName?: string;
};

export default function ChartFrame({
  title,
  legend,
  children,
  legendClassName = "mt-2 text-[12px] leading-relaxed text-spec-text3 md:text-[13px]",
}: ChartFrameProps) {
  return (
    <div className="mx-3.5 mt-3 rounded-[10px] border border-spec-border bg-spec-panel p-4 md:mx-0 md:p-[18px]">
      <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-spec-text3 md:text-[13px]">
        {title}
      </p>
      {children}
      <p className={legendClassName}>{legend}</p>
    </div>
  );
}

export const CHART = {
  left: 36,
  right: 20,
  top: 12,
  bottom: 36,
  width: 320,
  height: 176,
};

export function mapX(value: number, min: number, max: number) {
  const span = max - min || 1;
  return CHART.left + ((value - min) / span) * (CHART.width - CHART.left - CHART.right);
}

export function mapY(value: number, min: number, max: number) {
  const span = max - min || 1;
  return (
    CHART.height -
    CHART.bottom -
    ((value - min) / span) * (CHART.height - CHART.top - CHART.bottom)
  );
}
