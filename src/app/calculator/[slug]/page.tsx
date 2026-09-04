import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CalculatorSeoContent from "@/components/calculator/CalculatorSeoContent";
import CalculatorShell from "@/components/calculator/CalculatorShell";
import { getLocalPublishedCalculators } from "@/lib/calculators/local-seed";
import {
  getPublishedCalculatorBySlug,
  getPublishedCalculators,
} from "@/lib/calculators/queries";
import { canonicalUrl } from "@/lib/site";

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

  return {
    title,
    description,
    keywords: calculatorKeywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${title} | FieldEngineersKit`,
      description,
      url: canonical,
      type: "website",
      siteName: "FieldEngineersKit",
      locale: "en_US",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${title} - FieldEngineersKit`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | FieldEngineersKit`,
      description,
      images: ["/opengraph-image"],
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
        <CalculatorSeoContent
          slug={calculator.slug}
          title={calculator.title}
          description={calculator.meta_description ?? undefined}
        />
      </CalculatorShell>
  );
}
