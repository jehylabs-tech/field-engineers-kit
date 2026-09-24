import type { Metadata } from "next";
import { canonicalUrl, getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();
const BRAND = "FieldEngineersKit";
const BRAND_SUFFIX_RE = new RegExp(`(?:\\s*\\|\\s*${BRAND})+$`, "i");

const defaultTitle =
  "FieldEngineersKit - Industrial Piping & Procurement Calculators";
const defaultDescription =
  "Professional engineering and procurement calculators for pipe weight, cost estimation, hydrotest pressure, and ASME/ANSI standards.";

const defaultKeywords = [
  "Pipe Weight Calculator",
  "ASME B36.10",
  "ASME B31.3",
  "Hydrotest Pressure Calculator",
  "Procurement Estimator",
  "Metal Weight Estimator",
  "Flange Dimensions",
  "Valve Cv Sizing",
  "Engineering Calculators",
  "Pipe Schedule",
  "Bolt Torque",
  "Pressure Drop",
  "Flow Velocity",
  "Blind Flange Thickness",
  "Thermal Expansion & Anchor Load",
  "Pneumatic Test Safety Distance",
];

type SiteMetadataOptions = Partial<Metadata> & {
  canonicalPath?: string;
};

/** Collapse duplicate `| FieldEngineersKit` and ensure a single brand suffix. */
export function ensureBrandedTitle(title: string): string {
  const base = title.replace(BRAND_SUFFIX_RE, "").trim();
  return base.length > 0 ? `${base} | ${BRAND}` : BRAND;
}

/**
 * Document `<title>` that will not be double-suffixed by the root
 * `title.template: "%s | FieldEngineersKit"`.
 */
export function documentTitle(title: string): NonNullable<Metadata["title"]> {
  return { absolute: ensureBrandedTitle(title) };
}

function normalizeMetadataTitle(
  title: Metadata["title"] | undefined,
): Metadata["title"] | undefined {
  if (title == null) return title;
  if (typeof title === "string") {
    // String titles that already include the brand must be absolute; otherwise
    // the root template appends a second `| FieldEngineersKit`.
    if (BRAND_SUFFIX_RE.test(title)) return documentTitle(title);
    return title;
  }
  if (
    typeof title === "object" &&
    "absolute" in title &&
    typeof title.absolute === "string"
  ) {
    return { ...title, absolute: ensureBrandedTitle(title.absolute) };
  }
  return title;
}

export function buildSiteMetadata(overrides: SiteMetadataOptions = {}): Metadata {
  const googleVerification =
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const { canonicalPath, alternates, openGraph, twitter, title, ...rest } =
    overrides;
  const canonical = canonicalUrl(canonicalPath ?? "/");
  const normalizedTitle = normalizeMetadataTitle(title);

  const ogTitle =
    openGraph && "title" in openGraph && openGraph.title != null
      ? typeof openGraph.title === "string"
        ? ensureBrandedTitle(openGraph.title)
        : openGraph.title
      : undefined;
  const twitterTitle =
    twitter && "title" in twitter && typeof twitter.title === "string"
      ? ensureBrandedTitle(twitter.title)
      : twitter?.title;

  return {
    metadataBase: new URL(siteUrl),
    title: normalizedTitle ?? {
      default: defaultTitle,
      template: `%s | ${BRAND}`,
    },
    description: defaultDescription,
    keywords: defaultKeywords,
    applicationName: BRAND,
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      shortcut: [{ url: "/favicon.ico" }],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
    },
    alternates: {
      canonical,
      ...alternates,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      siteName: BRAND,
      title: defaultTitle,
      description: defaultDescription,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: defaultTitle,
        },
      ],
      ...openGraph,
      ...(ogTitle != null ? { title: ogTitle } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: defaultDescription,
      images: ["/opengraph-image"],
      ...twitter,
      ...(twitterTitle != null ? { title: twitterTitle } : {}),
    },
    verification: {
      yandex: "2bcf7f066295b824",
      ...(googleVerification ? { google: googleVerification } : {}),
    },
    ...rest,
    ...(normalizedTitle != null ? { title: normalizedTitle } : {}),
  };
}
