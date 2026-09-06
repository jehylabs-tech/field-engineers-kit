import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * Serves /robots.txt via App Router.
 * Query-param and /calculation/ paths are intentionally crawlable so Googlebot
 * can read Dynamic Canonical tags on calculator URLs with state query strings.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/ads.txt", "/calculator/", "/docs/", "/category/"],
        disallow: ["/api/", "/admin/", "/auth/", "/private/"],
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
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
