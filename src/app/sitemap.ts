import type { MetadataRoute } from "next";
import { getPublishedCalculators } from "@/lib/calculators/queries";
import { getLocalPublishedCalculators } from "@/lib/calculators/local-seed";
import { listAllSpecRoutes } from "@/lib/calculators/spec-routes";
import { getVisibleCategories } from "@/lib/menu/config";
import { getAllPosts } from "@/lib/blog/posts";
import { docsPath } from "@/lib/docs/constants";
import { canonicalUrl } from "@/lib/site";

type SitemapEntry = MetadataRoute.Sitemap[number];

function publishedCalculatorSlugs(remoteSlugs: string[]): string[] {
  return Array.from(
    new Set([
      ...getLocalPublishedCalculators().map((item) => item.slug),
      ...remoteSlugs,
    ]),
  ).sort();
}

/**
 * Deduplicate and drop any accidental query-string / non-public URLs.
 * Spec routes come from listAllSpecRoutes — new calculator SpecRoute data
 * is included automatically on the next Vercel build.
 */
function finalizeEntries(entries: SitemapEntry[]): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];
  for (const entry of entries) {
    const url = entry.url.split("?")[0].replace(/\/$/, "") || entry.url;
    if (!url.startsWith("http")) continue;
    if (url.includes("/api/") || url.includes("/admin/") || url.includes("/auth/")) {
      continue;
    }
    if (url.includes("/calculation/")) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ ...entry, url });
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const calculators = await getPublishedCalculators();
  const slugs = publishedCalculatorSlugs(calculators.map((item) => item.slug));

  const nowIso = new Date().toISOString();
  const postCutoff = new Date();
  postCutoff.setDate(postCutoff.getDate() - 30);

  const staticRoutes: MetadataRoute.Sitemap = [
    { path: "/", changeFrequency: "daily" as const, priority: 1.0 },
    { path: "/calculators", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/standards", changeFrequency: "weekly" as const, priority: 0.8 },
    { path: "/about", changeFrequency: "weekly" as const, priority: 0.8 },
    { path: "/docs", changeFrequency: "weekly" as const, priority: 0.85 },
    { path: "/advertise", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/disclaimer", changeFrequency: "monthly" as const, priority: 0.3 },
    { path: "/privacy", changeFrequency: "monthly" as const, priority: 0.3 },
    { path: "/terms", changeFrequency: "monthly" as const, priority: 0.3 },
  ].map((item) => ({
    url: canonicalUrl(item.path),
    lastModified: nowIso,
    changeFrequency: item.changeFrequency,
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

  const calculatorRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: canonicalUrl(`/calculator/${slug}`),
    lastModified: nowIso,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  // Auto-expands when listSpecRoutesForSlug gains new NPS/class/material rows.
  const allSpecs = listAllSpecRoutes(slugs);
  const specRoutes: MetadataRoute.Sitemap = allSpecs.map((route) => ({
    url: canonicalUrl(`/calculator/${route.slug}/${route.spec}`),
    lastModified: nowIso,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  const blogRoutes: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: canonicalUrl(docsPath(post.slug)),
    lastModified: post.date || nowIso,
    changeFrequency:
      post.date && new Date(post.date) >= postCutoff
        ? ("daily" as const)
        : ("weekly" as const),
    priority: 0.8,
  }));

  return finalizeEntries([
    ...staticRoutes,
    ...categoryRoutes,
    ...blogRoutes,
    ...calculatorRoutes,
    ...specRoutes,
  ]);
}
