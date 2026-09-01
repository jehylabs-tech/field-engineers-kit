import type { Metadata } from "next";
import { canonicalUrl, getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();
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
  "Thermal Expansion",
];

type SiteMetadataOptions = Partial<Metadata> & {
  canonicalPath?: string;
};

export function buildSiteMetadata(overrides: SiteMetadataOptions = {}): Metadata {
  const googleVerification =
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const { canonicalPath, alternates, openGraph, twitter, ...rest } = overrides;
  const canonical = canonicalUrl(canonicalPath ?? "/");

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: defaultTitle,
      template: "%s | FieldEngineersKit",
    },
    description: defaultDescription,
    keywords: defaultKeywords,
    applicationName: "FieldEngineersKit",
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
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
      siteName: "FieldEngineersKit",
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
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: defaultDescription,
      images: ["/opengraph-image"],
      ...twitter,
    },
    verification: {
      yandex: "2bcf7f066295b824",
      ...(googleVerification ? { google: googleVerification } : {}),
    },
    ...rest,
  };
}
