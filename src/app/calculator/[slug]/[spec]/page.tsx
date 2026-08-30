import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CalculatorSeoContent from "@/components/calculator/CalculatorSeoContent";
import CalculatorShell from "@/components/calculator/CalculatorShell";
import { getLocalPublishedCalculators } from "@/lib/calculators/local-seed";
import {
  getPublishedCalculatorBySlug,
  getPublishedCalculators,
} from "@/lib/calculators/queries";
import {
  listAllSpecRoutes,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { canonicalUrl } from "@/lib/site";

type SpecPageProps = {
  params: { slug: string; spec: string };
};

export async function generateStaticParams() {
  const slugs = getLocalPublishedCalculators().map((item) => item.slug);
  return listAllSpecRoutes(slugs).map((route) => ({
    slug: route.slug,
    spec: route.spec,
  }));
}

export async function generateMetadata({
  params,
}: SpecPageProps): Promise<Metadata> {
  const calculator = await getPublishedCalculatorBySlug(params.slug);
  const specRoute = resolveSpecRoute(params.slug, params.spec);

  if (!calculator || !specRoute) {
    return {
      title: "Calculator Not Found",
      robots: { index: false, follow: false },
    };
  }

  const canonical = canonicalUrl(
    `/calculator/${calculator.slug}/${specRoute.spec}`,
  );
  const title = `${specRoute.label} ${calculator.title} | ASME & API Calculations`;
  const description =
    calculator.meta_description ??
    `${specRoute.label} calculation & reference data for ${calculator.title}. Verified ASME/API engineering formulas.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "FieldEngineersKit",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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

  return (
    <CalculatorShell
      calculator={calculator}
      allCalculators={allCalculators}
      specSeed={specRoute.query}
      specLabel={specRoute.label}
    >
      <CalculatorSeoContent
        slug={calculator.slug}
        title={`${specRoute.label} · ${calculator.title}`}
        description={calculator.meta_description ?? undefined}
      />
    </CalculatorShell>
  );
}
