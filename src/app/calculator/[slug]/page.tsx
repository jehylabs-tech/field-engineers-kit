import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CalculatorSeoContent from "@/components/calculator/CalculatorSeoContent";
import CalculatorShell from "@/components/calculator/CalculatorShell";
import SpecRouteLinkGrid from "@/components/calculator/SpecRouteLinkGrid";
import BoltSequenceSeoFigure from "@/components/calculator/BoltSequenceSeoFigure";
import BlindFlangeSeoFigures from "@/components/calculator/BlindFlangeSeoFigures";
import { getLocalPublishedCalculators } from "@/lib/calculators/local-seed";
import {
  getPublishedCalculatorBySlug,
  getPublishedCalculators,
} from "@/lib/calculators/queries";
import {
  BOLT_SEQUENCE_SEO_SLUG,
  getBoltSequenceSeoChartSpec,
} from "@/lib/calculators/bolt-sequence-seo-chart";
import {
  BLIND_FLANGE_SEO_SLUG,
  defaultBlindFlangeSeoChart,
} from "@/lib/calculators/blind-flange-seo-chart";
import { canonicalUrl } from "@/lib/site";
import {
  documentTitle,
  ensureBrandedTitle,
} from "@/lib/metadata/site-metadata";

type CalculatorPageProps = {
  params: { slug: string };
  /** Present when users share stateful calculator URLs; ignored for SEO canonical. */
  searchParams?: Record<string, string | string[] | undefined>;
};

export async function generateStaticParams() {
  const slugs = getLocalPublishedCalculators().map((calculator) => calculator.slug);
  return slugs.map((slug) => ({ slug }));
}

/**
 * Canonical always points at the clean calculator path (no query string).
 * Googlebot should consolidate `?size=4in&schedule=40…` variants to this URL.
 */
export async function generateMetadata({
  params,
}: CalculatorPageProps): Promise<Metadata> {
  const { slug } = params;
  const calculator = await getPublishedCalculatorBySlug(slug);

  if (!calculator) {
    return {
      title: "Calculator Not Found",
      robots: { index: false, follow: false },
    };
  }

  // searchParams intentionally unused — strip state query params for the indexable URL
  const canonical = canonicalUrl(`/calculator/${calculator.slug}`);
  const title = calculator.title.includes("Calculator")
    ? calculator.title
    : `${calculator.title} Calculator`;
  const description =
    calculator.meta_description ??
    `Professional industrial engineering calculator for ${calculator.title} per ASME, API, and ISO standards.`;

  const calculatorKeywords = [
    calculator.title,
    `${calculator.title} Calculator`,
    calculator.category,
    "ASME",
    "API",
    "FieldEngineersKit",
    "Engineering Calculator",
  ];

  const boltChart =
    calculator.slug === BOLT_SEQUENCE_SEO_SLUG
      ? getBoltSequenceSeoChartSpec(8, "star")
      : null;
  const blindChart =
    calculator.slug === BLIND_FLANGE_SEO_SLUG
      ? defaultBlindFlangeSeoChart()
      : null;
  const ogImage = boltChart
    ? {
        url: boltChart.src,
        width: 1200,
        height: 1400,
        alt: boltChart.alt,
      }
    : blindChart
      ? {
          url: blindChart.src,
          width: 1400,
          height: 900,
          alt: blindChart.alt,
        }
      : {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${title} - FieldEngineersKit`,
        };

  return {
    title: documentTitle(title),
    description,
    keywords: calculatorKeywords,
    // Pattern B: self-referencing canonical on the clean root calculator path.
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: ensureBrandedTitle(title),
      description,
      url: canonical,
      type: "website",
      siteName: "FieldEngineersKit",
      locale: "en_US",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: ensureBrandedTitle(title),
      description,
      images: [ogImage.url],
    },
  };
}

export default async function CalculatorPage({ params }: CalculatorPageProps) {
  const [calculator, allCalculators] = await Promise.all([
    getPublishedCalculatorBySlug(params.slug),
    getPublishedCalculators(),
  ]);

  if (!calculator) {
    notFound();
  }

  return (
      <CalculatorShell
        calculator={calculator}
        allCalculators={allCalculators}
      >
        <SpecRouteLinkGrid slug={calculator.slug} />
        {calculator.slug === BOLT_SEQUENCE_SEO_SLUG ? (
          <BoltSequenceSeoFigure boltCount={8} pattern="star" />
        ) : null}
        {calculator.slug === BLIND_FLANGE_SEO_SLUG ? (
          <BlindFlangeSeoFigures showAll />
        ) : null}
        <CalculatorSeoContent
          slug={calculator.slug}
          title={calculator.title}
          description={calculator.meta_description ?? undefined}
          pagePath={`/calculator/${calculator.slug}`}
        />
      </CalculatorShell>
  );
}
