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
  listSpecRoutesForSlug,
} from "@/lib/calculators/spec-routes";
import { canonicalUrl } from "@/lib/site";

type CalculationPageProps = {
  params: { panel: string; page: string };
};

export async function generateStaticParams() {
  const slugs = getLocalPublishedCalculators().map((item) => item.slug);
  return slugs.flatMap((slug) => {
    const routes = listSpecRoutesForSlug(slug);
    return routes.map((route) => ({
      panel: slug,
      page: route.spec,
    }));
  });
}

export async function generateMetadata({
  params,
}: CalculationPageProps): Promise<Metadata> {
  const calculator = await getPublishedCalculatorBySlug(params.panel);
  const specRoute = resolveSpecRoute(params.panel, params.page);

  if (!calculator || !specRoute) {
    return {
      title: "Calculator Not Found",
      robots: { index: false, follow: false },
    };
  }

  const canonical = canonicalUrl(
    `/calculation/${calculator.slug}/${specRoute.spec}`,
  );
  const title = `${specRoute.label} ${calculator.title} | Engineering Screening & Sizing`;
  const description =
    calculator.meta_description ??
    `Accurate ${specRoute.label} calculation for ${calculator.title}. Instant screening with ASME/API code verification.`;

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

export default async function DynamicCalculationPage({
  params,
}: CalculationPageProps) {
  const specRoute = resolveSpecRoute(params.panel, params.page);
  const [calculator, allCalculators] = await Promise.all([
    getPublishedCalculatorBySlug(params.panel),
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
