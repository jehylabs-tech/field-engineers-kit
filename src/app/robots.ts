import type { MetadataRoute } from "next";
import { PRODUCTION_SITE_URL, getSiteUrl } from "@/lib/site";

/**
 * Serves /robots.txt via App Router.
 *
 * - Allow all public calculator paths (`/calculator/*`) including programmatic
 *   SpecRoutes so Googlebot can crawl Pattern B self-canonical pages.
 * - Disallow private / API surfaces. Legacy `/calculation/` workspaces are
 *   noindex and excluded from the sitemap; block crawl budget here too.
 * - Query-param calculator variants remain crawlable so bots can follow the
 *   Dynamic Canonical tag back to the clean path.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const sitemapUrl = `${PRODUCTION_SITE_URL}/sitemap.xml`;

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/ads.txt",
          "/calculator/",
          "/calculators",
          "/docs/",
          "/category/",
          "/standards",
          "/about",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/auth/",
          "/private/",
          "/calculation/",
        ],
      },
      {
        userAgent: "AdsBot-Google",
        allow: "/",
      },
      {
        userAgent: "Mediapartners-Google",
        allow: "/",
      },
    ],
    sitemap: sitemapUrl,
    host: siteUrl.includes("localhost") ? PRODUCTION_SITE_URL : siteUrl,
  };
}
