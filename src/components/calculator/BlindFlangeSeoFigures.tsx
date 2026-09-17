import {
  BLIND_FLANGE_SEO_SLUG,
  defaultBlindFlangeSeoChart,
  getBlindFlangeSeoChartSpec,
  type BlindFlangeSeoMode,
  type BlindFlangeSeoChartSpec,
} from "@/lib/calculators/blind-flange-seo-chart";
import type { UnitSystem } from "@/lib/calculators/definitions";

type Props = {
  mode?: BlindFlangeSeoMode;
  unitSystem?: UnitSystem;
  /** When true, render all 4 charts (root page). */
  showAll?: boolean;
  className?: string;
};

function ChartFigure({
  meta,
  className,
}: {
  meta: BlindFlangeSeoChartSpec;
  className?: string;
}) {
  const imageLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: meta.absoluteUrl,
    url: meta.absoluteUrl,
    name: meta.title,
    caption: meta.caption,
    description: meta.alt,
    creditText: "FieldEngineersKit",
    creator: {
      "@type": "Organization",
      name: "FieldEngineersKit",
      url: "https://www.fieldengineerskit.com",
    },
  };

  return (
    <figure
      className={`my-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-spec-border dark:bg-spec-panel ${className ?? ""}`}
      data-seo-diagram={BLIND_FLANGE_SEO_SLUG}
      data-seo-mode={meta.mode}
      data-seo-units={meta.unitSystem}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(imageLd) }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG in /public for image-search crawlers */}
      <img
        src={meta.src}
        alt={meta.alt}
        title={meta.title}
        width={meta.mode === "ambient" ? 1400 : 1500}
        height={meta.mode === "ambient" ? 900 : 1100}
        className="mx-auto h-auto w-full max-w-4xl"
        loading="lazy"
        decoding="async"
      />
      <figcaption className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
        {meta.caption}
      </figcaption>
    </figure>
  );
}

/**
 * Crawlable static blind thickness charts — does not replace the interactive matrix.
 */
export default function BlindFlangeSeoFigures({
  mode,
  unitSystem,
  showAll = false,
  className,
}: Props) {
  if (showAll) {
    const specs = (
      [
        ["ambient", "imperial"],
        ["ambient", "metric"],
        ["hydrotest", "imperial"],
        ["hydrotest", "metric"],
      ] as const
    ).map(([m, u]) => getBlindFlangeSeoChartSpec(m, u));

    return (
      <div className={className}>
        <h2 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Blind flange thickness reference charts
        </h2>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          Public full matrices for image reference (ambient class rating and
          hydrotest plate capability). Interactive calculator chart above stays
          live for your duty.
        </p>
        {specs.map((meta) => (
          <ChartFigure key={meta.fileName} meta={meta} />
        ))}
      </div>
    );
  }

  const meta =
    mode && unitSystem
      ? getBlindFlangeSeoChartSpec(mode, unitSystem)
      : defaultBlindFlangeSeoChart();

  return <ChartFigure meta={meta} className={className} />;
}
