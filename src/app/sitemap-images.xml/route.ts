import { listAllSpecRoutes } from "@/lib/calculators/spec-routes";
import {
  BOLT_SEQUENCE_SEO_SLUG,
  getBoltSequenceSeoChartSpec,
  parseBoltSequenceSpecSegment,
} from "@/lib/calculators/bolt-sequence-seo-chart";
import {
  BLIND_FLANGE_SEO_SLUG,
  listBlindFlangeSeoChartSpecs,
} from "@/lib/calculators/blind-flange-seo-chart";
import { canonicalUrl } from "@/lib/site";

export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function imageNodes(
  images: Array<{ absoluteUrl: string; title: string; caption: string }>,
): string {
  return images
    .map(
      (img) => `    <image:image>
      <image:loc>${escapeXml(img.absoluteUrl)}</image:loc>
      <image:title>${escapeXml(img.title)}</image:title>
      <image:caption>${escapeXml(img.caption)}</image:caption>
    </image:image>`,
    )
    .join("\n");
}

function urlBlock(
  pageUrl: string,
  images: Array<{ absoluteUrl: string; title: string; caption: string }>,
): string {
  return `  <url>
    <loc>${escapeXml(pageUrl)}</loc>
${imageNodes(images)}
  </url>`;
}

/**
 * Google Image sitemap for bolt-sequence + blind-flange posters.
 * Separate from /sitemap.xml so web ranking signals stay unchanged.
 */
export function GET() {
  const rows: string[] = [];

  // --- Bolt sequence ---
  const boltSpecs = listAllSpecRoutes([BOLT_SEQUENCE_SEO_SLUG]);
  const rootBolt = getBoltSequenceSeoChartSpec(8, "star");
  if (rootBolt) {
    rows.push(
      urlBlock(canonicalUrl(`/calculator/${BOLT_SEQUENCE_SEO_SLUG}`), [
        rootBolt,
      ]),
    );
  }
  for (const route of boltSpecs) {
    const parsed = parseBoltSequenceSpecSegment(route.spec);
    if (!parsed) continue;
    const chart = getBoltSequenceSeoChartSpec(parsed.boltCount, parsed.pattern);
    if (!chart) continue;
    rows.push(
      urlBlock(canonicalUrl(`/calculator/${route.slug}/${route.spec}`), [
        chart,
      ]),
    );
  }

  // --- Blind flange (4 public matrices on calculator root) ---
  const blindCharts = listBlindFlangeSeoChartSpecs();
  rows.push(
    urlBlock(
      canonicalUrl(`/calculator/${BLIND_FLANGE_SEO_SLUG}`),
      blindCharts,
    ),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${rows.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
