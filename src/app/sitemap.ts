import type { MetadataRoute } from "next";
import { getPublishedCalculators } from "@/lib/calculators/queries";
import { getLocalPublishedCalculators } from "@/lib/calculators/local-seed";
import { listAllSpecRoutes } from "@/lib/calculators/spec-routes";
import { getVisibleCategories } from "@/lib/menu/config";
import { canonicalUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const calculators = await getPublishedCalculators();
  const slugs = Array.from(
    new Set([
      ...getLocalPublishedCalculators().map((item) => item.slug),
      ...calculators.map((item) => item.slug),
    ]),
  );

  const nowIso = new Date().toISOString();

  const staticRoutes: MetadataRoute.Sitemap = [
    { path: "/", changeFrequency: "weekly", priority: 1.0 },
    { path: "/calculators", changeFrequency: "weekly", priority: 0.9 },
    { path: "/standards", changeFrequency: "weekly", priority: 0.8 },
    { path: "/about", changeFrequency: "weekly", priority: 0.8 },
    { path: "/advertise", changeFrequency: "weekly", priority: 0.7 },
    { path: "/disclaimer", changeFrequency: "weekly", priority: 0.3 },
    { path: "/privacy", changeFrequency: "weekly", priority: 0.3 },
    { path: "/terms", changeFrequency: "weekly", priority: 0.3 },
  ].map((item) => ({
    url: canonicalUrl(item.path),
    lastModified: nowIso,
    changeFrequency: item.changeFrequency as "weekly" | "monthly" | "yearly",
    priority: item.priority,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = getVisibleCategories().map(
    (category) => ({
      url: canonicalUrl(`/category/${category.id}`),
      lastModified: nowIso,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }),
  );

  const calculatorRoutes: MetadataRoute.Sitemap = slugs.map((slug) => {
    return {
      url: canonicalUrl(`/calculator/${slug}`),
      lastModified: nowIso,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    };
  });

  const allSpecs = listAllSpecRoutes(slugs);

  const specRoutes: MetadataRoute.Sitemap = allSpecs.map(
    (route) => ({
      url: canonicalUrl(`/calculator/${route.slug}/${route.spec}`),
      lastModified: nowIso,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }),
  );

  const calculationRoutes: MetadataRoute.Sitemap = allSpecs.map(
    (route) => ({
      url: canonicalUrl(`/calculation/${route.slug}/${route.spec}`),
      lastModified: nowIso,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }),
  );

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...calculatorRoutes,
    ...specRoutes,
    ...calculationRoutes,
  ];
}
