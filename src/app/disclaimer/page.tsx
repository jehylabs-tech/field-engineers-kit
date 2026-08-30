import type { Metadata } from "next";
import { LegalDocument, legalPageMetadata } from "@/components/legal/LegalDocument";
import { buildSiteMetadata } from "@/lib/metadata/site-metadata";

export const metadata: Metadata = buildSiteMetadata({
  canonicalPath: "/disclaimer",
  title: legalPageMetadata.disclaimer.title,
  description: legalPageMetadata.disclaimer.description,
});

export default function DisclaimerPage() {
  return (
    <LegalDocument
      title="Engineering Disclaimer"
      updatedAt="August 12, 2026"
      intro="Field Engineer Kit provides calculations based on ASME/API standards for reference only. Users must verify all engineering logic with certified professional engineers prior to physical implementation. Results do not constitute professional engineering advice, design approval, or fitness-for-service certification."
      sections={[
        {
          title: "No Professional Relationship",
          paragraphs: [
            "Use of this website does not create an engineer-client, contractor-client, or fiduciary relationship between you and Field Engineer Kit or its operators.",
          ],
        },
        {
          title: "Accuracy and Code Compliance",
          paragraphs: [
            "Formulas, default values, unit conversions, and assumptions may be simplified for field use. Applicable codes (ASME, API, ISA, local regulations) vary by jurisdiction, project phase, and asset condition.",
            "You are solely responsible for verifying inputs, selecting appropriate standards, and validating outputs with qualified engineers before maintenance, procurement, or operational decisions.",
          ],
          list: [
            "Always cross-check critical results against licensed engineering calculations.",
            "Do not use outputs as the sole basis for safety-critical or regulatory submissions.",
            "Site conditions, material certificates, and inspection data may override calculator defaults.",
          ],
        },
        {
          title: "Limitation of Liability",
          paragraphs: [
            'To the fullest extent permitted by law, Field Engineer Kit disclaims all warranties, express or implied, including merchantability and fitness for a particular purpose. In no event shall Field Engineer Kit be liable for direct, indirect, incidental, consequential, or special damages arising from use of or reliance on calculator results.',
          ],
        },
        {
          title: "Third-Party Content and Advertising",
          paragraphs: [
            "Sponsored cards, external links, and advertisements are provided for convenience. Field Engineer Kit does not endorse third-party products or guarantee availability, pricing, or compliance of advertised materials.",
          ],
        },
      ]}
    />
  );
}
