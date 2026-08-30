import type { Metadata } from "next";
import { LegalDocument, legalPageMetadata } from "@/components/legal/LegalDocument";
import { CONTACT_EMAIL } from "@/lib/legal/constants";
import { buildSiteMetadata } from "@/lib/metadata/site-metadata";

export const metadata: Metadata = buildSiteMetadata({
  canonicalPath: "/privacy",
  title: legalPageMetadata.privacy.title,
  description: legalPageMetadata.privacy.description,
});

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updatedAt="August 17, 2026"
      intro="Field Engineer Kit respects your privacy. This policy explains what information we collect, how we use cookies and similar technologies (including for Google AdSense), and your choices."
      sections={[
        {
          title: "Information We Collect",
          paragraphs: [
            "We may collect information you provide directly (such as when signing in with Google for admin access) and information collected automatically when you use the site.",
          ],
          list: [
            "Access logs: IP address, browser type, device information, pages visited, and timestamps.",
            "Usage data: calculator pages viewed, referral URLs, and approximate interaction events.",
            "Authentication data (admin only): email address and session tokens via Supabase Auth when you sign in.",
            "Cookies and local storage: preferences, session state, and advertising identifiers where applicable.",
          ],
        },
        {
          title: "Cookies and Similar Technologies",
          paragraphs: [
            "We use essential cookies required for site functionality and security (including authentication sessions). With your consent where required, we may use analytics and advertising cookies.",
            "Google AdSense and its partners may use cookies to serve ads based on your prior visits to this website or other websites. You can learn more about how Google uses data at https://policies.google.com/technologies/partner-sites.",
          ],
          list: [
            "Essential cookies: required for login, security, and core site features.",
            "Analytics cookies: help us understand traffic and improve calculators (if enabled).",
            "Advertising cookies: used by Google AdSense to deliver and measure ads (if enabled).",
          ],
        },
        {
          title: "Google AdSense & Third-Party Cookie Policy",
          paragraphs: [
            "This site uses Google AdSense to display advertising. Google, as a third-party vendor, uses cookies to serve ads on Field Engineer Kit. Google's use of advertising cookies enables it and its partners to serve ads based on your visit to this site and/or other sites on the internet.",
            "Users may opt out of personalized advertising by visiting Google Ads Settings (https://adssettings.google.com) and may learn how Google uses data from partner sites at https://policies.google.com/technologies/partner-sites and https://policies.google.com/technologies/ads. Third-party vendors, including Google, may use cookies (including the former DART cookie and current advertising cookies) and web beacons to collect data for ad measurement and to serve ads.",
            "We do not control third-party cookies set by Google or its advertising partners. Disabling cookies in your browser, or using a consent banner where required by law, may limit ad personalization but will not remove every advertising cookie already stored on your device.",
          ],
        },
        {
          title: "How We Use Information",
          paragraphs: [
            "We use collected information to operate and improve the service, maintain security, respond to inquiries, comply with legal obligations, and—where enabled—display relevant advertisements through Google AdSense.",
          ],
        },
        {
          title: "Third-Party Services",
          paragraphs: [
            "We use trusted processors including Vercel (hosting), Supabase (database and authentication), and Google (OAuth sign-in and AdSense). These providers process data according to their own privacy policies.",
          ],
          list: [
            "Vercel: hosting, CDN, and server logs.",
            "Supabase: database, authentication, and session management.",
            "Google: OAuth for admin login and AdSense/ad measurement (if enabled).",
          ],
        },
        {
          title: "Your Choices",
          paragraphs: [
            "You may disable non-essential cookies through your browser settings or applicable consent tools. You may opt out of personalized advertising via Google Ads Settings (https://adssettings.google.com). EU/EEA users may also visit https://www.youronlinechoices.eu/.",
            `For privacy-related requests, contact us at ${CONTACT_EMAIL}.`,
          ],
        },
        {
          title: "Data Retention and Security",
          paragraphs: [
            "We retain access logs and operational data only as long as necessary for security, analytics, and legal compliance. We implement reasonable administrative and technical safeguards; however, no online service is completely secure.",
          ],
        },
        {
          title: "Children's Privacy",
          paragraphs: [
            "Field Engineer Kit is intended for professional and industrial users. We do not knowingly collect personal information from children under 13.",
          ],
        },
        {
          title: "Changes to This Policy",
          paragraphs: [
            "We may update this Privacy Policy from time to time. The 'Last updated' date at the top will reflect the latest version. Continued use of the site after changes constitutes acceptance of the updated policy.",
          ],
        },
      ]}
    />
  );
}
