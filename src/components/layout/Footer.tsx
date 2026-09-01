import Link from "@/components/ui/AppLink";
import FooterClient from "@/components/layout/FooterClient";
import {
  CONTACT_EMAIL,
  FOOTER_LEGAL_NOTICE,
} from "@/lib/legal/constants";
import { DOCS_BASE_PATH, DOCS_NAV_LABEL } from "@/lib/docs/constants";

const footerLinks = [
  { href: "/calculators", label: "Calculators" },
  { href: "/standards", label: "Standards Index" },
  { href: DOCS_BASE_PATH, label: DOCS_NAV_LABEL },
  { href: "/about", label: "About & Editorial Standards" },
  { href: "/advertise", label: "B2B Sponsorship / Media Kit" },
  { href: "/disclaimer", label: "Legal Disclaimer" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
  { href: `mailto:${CONTACT_EMAIL}`, label: "Contact" },
];

const linkClass =
  "text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100";

export default function Footer() {
  return (
    <FooterClient>
      <footer className="border-t border-slate-200/80 bg-slate-50 pb-20 dark:border-spec-border dark:bg-spec-bg md:pb-16">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <nav
            aria-label="Site links"
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            {footerLinks.map((link) =>
              link.href.startsWith("mailto:") ? (
                <a key={link.href} href={link.href} className={linkClass}>
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              ),
            )}
          </nav>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {FOOTER_LEGAL_NOTICE}
          </p>
        </div>
      </footer>
    </FooterClient>
  );
}
