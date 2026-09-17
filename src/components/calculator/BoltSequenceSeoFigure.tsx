import {
  BOLT_SEQUENCE_SEO_SLUG,
  getBoltSequenceSeoChartSpec,
  parseBoltSequenceSpecSegment,
  type BoltSequenceSeoChartSpec,
} from "@/lib/calculators/bolt-sequence-seo-chart";
import type { BoltSequencePattern } from "@/lib/calculators/engines/bolt-sequence";

type Props = {
  /** Spec path segment e.g. 8-bolt-star; omit for default 8-star on root. */
  spec?: string;
  boltCount?: number;
  pattern?: BoltSequencePattern;
  className?: string;
};

function resolveSpec(props: Props): BoltSequenceSeoChartSpec | null {
  const fromSegment = parseBoltSequenceSpecSegment(props.spec);
  const boltCount = props.boltCount ?? fromSegment?.boltCount ?? 8;
  const pattern = props.pattern ?? fromSegment?.pattern ?? "star";
  return getBoltSequenceSeoChartSpec(boltCount, pattern);
}

/**
 * Crawlable static sequence poster — does not replace the interactive diagram.
 * Uses a plain <img> so Google Image Search can index a stable public URL.
 */
export default function BoltSequenceSeoFigure(props: Props) {
  const meta = resolveSpec(props);
  if (!meta) return null;

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
      className={`my-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-spec-border dark:bg-spec-panel ${props.className ?? ""}`}
      data-seo-diagram={BOLT_SEQUENCE_SEO_SLUG}
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
        width={1200}
        height={1400}
        className="mx-auto h-auto w-full max-w-xl"
        loading="lazy"
        decoding="async"
      />
      <figcaption className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
        {meta.caption}
      </figcaption>
    </figure>
  );
}
