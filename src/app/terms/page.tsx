import type { Metadata } from "next";
import { LegalDocument, legalPageMetadata } from "@/components/legal/LegalDocument";
import { CONTACT_EMAIL } from "@/lib/legal/constants";
import { buildSiteMetadata } from "@/lib/metadata/site-metadata";

export const metadata: Metadata = buildSiteMetadata({
  canonicalPath: "/terms",
  title: legalPageMetadata.terms.title,
  description: legalPageMetadata.terms.description,
});

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      updatedAt="August 12, 2026"
      intro="By accessing or using Field Engineer Kit, you agree to these Terms of Service. If you do not agree, do not use the website."
      sections={[
        {
          title: "Service Description",
          paragraphs: [
            "Field Engineer Kit provides web-based engineering and procurement calculators, documentation, and related tools for plant maintenance professionals. Features may change without notice.",
          ],
        },
        {
          title: "Acceptable Use",
          paragraphs: ["You agree not to:"],
          list: [
            "Attempt unauthorized access to admin areas, databases, or user accounts.",
            "Scrape, reverse engineer, or overload the service in a manner that harms availability.",
            "Use the service for unlawful purposes or to misrepresent professional certifications.",
            "Upload malicious code or interfere with security controls.",
          ],
        },
        {
          title: "Intellectual Property",
          paragraphs: [
            "The Field Engineer Kit name, UI, calculator layouts, and original content are protected by applicable intellectual property laws. You may share calculator URLs and export reports for legitimate work purposes, but may not republish the service as your own product without permission.",
          ],
        },
        {
          title: "Admin Accounts",
          paragraphs: [
            "Administrative access is restricted to authorized personnel. You are responsible for safeguarding credentials used to access admin features and for content published through the dashboard.",
          ],
        },
        {
          title: "Disclaimer of Warranties",
          paragraphs: [
            'The service is provided "as is" and "as available" without warranties of any kind. See our Engineering Disclaimer for additional limitations regarding calculator outputs.',
          ],
        },
        {
          title: "Limitation of Liability",
          paragraphs: [
            "To the maximum extent permitted by law, Field Engineer Kit and its operators shall not be liable for any damages arising from use of the service, including reliance on calculator results, downtime, or third-party links.",
          ],
        },
        {
          title: "Termination",
          paragraphs: [
            "We may suspend or terminate access to the service at any time for violation of these terms, security concerns, or operational reasons.",
          ],
        },
        {
          title: "Governing Law and Contact",
          paragraphs: [
            "These terms are governed by applicable laws in the jurisdiction of the service operator, without regard to conflict-of-law principles.",
            `Questions about these Terms: ${CONTACT_EMAIL}`,
          ],
        },
      ]}
    />
  );
}
