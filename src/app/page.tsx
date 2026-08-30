import type { Metadata } from "next";
import HomeJsonLd from "@/components/home/HomeJsonLd";
import WorkstationHome from "@/components/home/WorkstationHome";
import { getPublishedCalculators } from "@/lib/calculators/queries";
import { buildSiteMetadata } from "@/lib/metadata/site-metadata";

export const metadata: Metadata = buildSiteMetadata({
  canonicalPath: "/",
  title: {
    absolute:
      "Field Engineers Kit | Plant Engineering & Procurement Workstation",
  },
  description:
    "ASME B31.3 pipe thickness, B16.5 flange dimensions, B16.10 valve face-to-face, B16.20 gaskets, API 570 hydrotest, and procurement weight tools with URL plant-data carry-over.",
  openGraph: {
    title:
      "Field Engineers Kit | Plant Engineering & Procurement Workstation",
    description:
      "Verified ASME B31.3, B16.5, B16.10, B16.20, and API 570 calculators for plant engineers and buyers — live tools only, offline-ready PWA.",
  },
});

export default async function HomePage() {
  const calculators = await getPublishedCalculators();

  return (
    <>
      <HomeJsonLd
        calculators={calculators.map((item) => ({
          slug: item.slug,
          title: item.title,
        }))}
      />
      <WorkstationHome />
    </>
  );
}
