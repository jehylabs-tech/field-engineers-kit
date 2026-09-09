import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getPublishedCalculatorBySlug } from "@/lib/calculators/queries";
import {
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { getLocalPublishedCalculators } from "@/lib/calculators/local-seed";
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

/**
 * Legacy /calculation/* URLs consolidate to /calculator/* for indexing.
 */
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
    `/calculator/${calculator.slug}/${specRoute.spec}`,
  );

  return {
    title: `${specRoute.label} ${calculator.title}`,
    alternates: { canonical },
    robots: { index: false, follow: true },
  };
}

export default async function DynamicCalculationPage({
  params,
}: CalculationPageProps) {
  const specRoute = resolveSpecRoute(params.panel, params.page);
  if (!specRoute) {
    permanentRedirect(`/calculator/${params.panel}`);
  }
  permanentRedirect(`/calculator/${params.panel}/${specRoute.spec}`);
}
