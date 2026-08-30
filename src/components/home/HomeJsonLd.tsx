import { getSiteUrl } from "@/lib/site";

type HomeJsonLdProps = {
  calculators?: { slug: string; title: string }[];
};

export default function HomeJsonLd({ calculators = [] }: HomeJsonLdProps) {
  const siteUrl = getSiteUrl();
  const description =
    "Verified ASME B31.3 wall checks, ASME B16.5 flange lookups, and hydrotest pressure calculators with auto carry-over.";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["WebApplication", "SoftwareApplication"],
        name: "FieldEngineersKit",
        url: siteUrl,
        description,
        applicationCategory: "EngineeringApplication",
        operatingSystem: "All",
        image: `${siteUrl}/opengraph-image`,
        screenshot: `${siteUrl}/opengraph-image`,
        isAccessibleForFree: true,
        browserRequirements: "Requires JavaScript. Works offline as a PWA.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "ASME B31.3 pipe wall thickness",
          "ASME B16.5 flange dimensions",
          "ASME B16.9 butt-weld fittings",
          "ASME B16.20 metallic gaskets",
          "Hydrotest pressure screening",
          "ISA control valve Cv sizing",
          "API RP 14E erosion screening",
          "URL carry-over and PDF export",
        ],
      },
      {
        "@type": "WebSite",
        name: "FieldEngineersKit",
        url: siteUrl,
        description,
      },
      {
        "@type": "Organization",
        name: "FieldEngineersKit",
        url: siteUrl,
        logo: `${siteUrl}/icon.svg`,
        sameAs: [],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "Customer Support",
          email: "contact@fieldengineerskit.com",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Which codes govern the calculations in FieldEngineersKit?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Calculations strictly reference published international engineering standards: ASME B31.3 (Process Piping), ASME B16.5 & B16.47 (Flanges), ASME B16.9 (Butt-Weld Fittings), ASME B16.20 (Gaskets), ASME PCC-1 (Flange Bolting Torque), ISA S75.01 / IEC 60534 (Control Valve Cv), API RP 14E (Piping Erosion Velocity), and ASME B36.10M / B36.19M (Pipe Schedules).",
            },
          },
          {
            "@type": "Question",
            name: "Can FieldEngineersKit replace formal CAESAR II or FEA analysis?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. FieldEngineersKit provides deterministic preliminary screening and field engineering verification tools. While equations precisely follow code rules (e.g., ASME B31.3 ¶304.1.2), they do not replace formal 3D computer-aided pipe stress analysis (e.g., CAESAR II, AutoPIPE) or PE-stamped engineering deliverables.",
            },
          },
          {
            "@type": "Question",
            name: "How does the offline PWA mode and Plant Data Bus work?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "FEK is built as an offline-first Progressive Web App (PWA) with client-side execution. Your confidential plant process pressures and pipe dimensions never leave your browser. Furthermore, common piping parameters (NPS, Schedule, Rating, Material) seamlessly transfer between calculators via URL parameters without repetitive data entry.",
            },
          },
          {
            "@type": "Question",
            name: "How are metric and imperial conversions handled?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "All unit conversions adhere to ISO 80000-1 and NIST SP 811 standards. The global unit toggle converts values in real time (e.g., mm ↔ in, bar ↔ psi, °C ↔ °F, kg/m ↔ lb/ft) while preserving underlying precision for calculations.",
            },
          },
        ],
      },
      ...(calculators.length > 0
        ? [
            {
              "@type": "ItemList",
              name: "Plant engineering and piping calculators",
              numberOfItems: calculators.length,
              itemListElement: calculators.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.title,
                url: `${siteUrl}/calculator/${item.slug}`,
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
