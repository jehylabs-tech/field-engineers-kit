import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CalculatorSeoContent from "@/components/calculator/CalculatorSeoContent";
import CalculatorShell from "@/components/calculator/CalculatorShell";
import SpecProgrammaticPanel from "@/components/calculator/SpecProgrammaticPanel";
import { getLocalPublishedCalculators } from "@/lib/calculators/local-seed";
import {
  getPublishedCalculatorBySlug,
  getPublishedCalculators,
} from "@/lib/calculators/queries";
import {
  buildSpecSeoCopy,
  listAllSpecRoutes,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";
import { canonicalUrl } from "@/lib/site";

type SpecPageProps = {
  params: { slug: string; spec: string };
  /** Present when users share stateful URLs; ignored for SEO canonical. */
  searchParams?: Record<string, string | string[] | undefined>;
};

/** Only listed SpecRoutes are indexable SSG pages (Pattern B sitemap set). */
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = getLocalPublishedCalculators().map((item) => item.slug);
  return listAllSpecRoutes(slugs).map((route) => ({
    slug: route.slug,
    spec: route.spec,
  }));
}

/**
 * Canonical uses clean path only (slug + spec). Query params are never included.
 */
export async function generateMetadata({
  params,
}: SpecPageProps): Promise<Metadata> {
  const { slug, spec } = params;
  const calculator = await getPublishedCalculatorBySlug(slug);
  const specRoute = resolveSpecRoute(slug, spec);

  if (!calculator || !specRoute) {
    return {
      title: "Calculator Not Found",
      robots: { index: false, follow: false },
    };
  }

  const copy = buildSpecSeoCopy(
    calculator.title,
    SLUG_TO_CALCULATOR_TYPE[slug],
    specRoute,
    calculator.meta_description,
  );
  const canonical = canonicalUrl(
    `/calculator/${calculator.slug}/${specRoute.spec}`,
  );

  return {
    title: copy.title,
    description: copy.description,
    // Pattern B: self-referencing canonical for THIS spec path (never the root).
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonical,
      type: "website",
      siteName: "FieldEngineersKit",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: copy.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function CalculatorSpecPage({ params }: SpecPageProps) {
  const specRoute = resolveSpecRoute(params.slug, params.spec);
  const [calculator, allCalculators] = await Promise.all([
    getPublishedCalculatorBySlug(params.slug),
    getPublishedCalculators(),
  ]);

  if (!calculator || !specRoute) {
    notFound();
  }

  const copy = buildSpecSeoCopy(
    calculator.title,
    SLUG_TO_CALCULATOR_TYPE[params.slug],
    specRoute,
    calculator.meta_description,
  );

  return (
    <CalculatorShell
      calculator={calculator}
      allCalculators={allCalculators}
      specSeed={specRoute.query}
      specLabel={specRoute.label}
      pageHeading={copy.h1}
    >
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
        <Link
          href={`/calculator/${calculator.slug}`}
          className="font-medium text-spec-accent underline-offset-2 hover:underline"
        >
          ← All indexable specifications for this calculator
        </Link>
        {specRoute.label ? (
          <span className="ml-2 text-slate-500 dark:text-slate-400">
            · Current spec:{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {specRoute.label}
            </span>
          </span>
        ) : null}
      </p>
      <SpecProgrammaticPanel h2={copy.h2} route={specRoute} />
      <CalculatorSeoContent
        slug={calculator.slug}
        title={copy.h1}
        description={copy.description}
        spec={specRoute.spec}
        pagePath={`/calculator/${calculator.slug}/${specRoute.spec}`}
      />
    </CalculatorShell>
  );
}
