import Link from "@/components/ui/AppLink";

export const legalPageMetadata = {
  disclaimer: {
    title: "Engineering Disclaimer",
    description:
      "Limitation of liability and engineering disclaimer for Field Engineer Kit calculators.",
  },
  privacy: {
    title: "Privacy Policy",
    description:
      "Privacy policy for Field Engineer Kit, including cookies, analytics, and advertising.",
  },
  terms: {
    title: "Terms of Service",
    description: "Terms of service for using Field Engineer Kit.",
  },
} as const;

type LegalSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
};

type LegalDocumentProps = {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
};

export function LegalDocument({
  title,
  updatedAt,
  intro,
  sections,
}: LegalDocumentProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-spec-border pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-spec-accentText">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-spec-text">
          {title}
        </h1>
        <p className="mt-3 text-sm text-spec-text3">Last updated: {updatedAt}</p>
      </div>

      <div className="prose prose-sm mt-8 max-w-none text-spec-text2">
        <p className="text-base leading-relaxed">{intro}</p>

        {sections.map((section) => (
          <section key={section.title} className="mt-8">
            <h2 className="text-lg font-semibold text-spec-text">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="mt-3 leading-relaxed">
                {paragraph}
              </p>
            ))}
            {section.list ? (
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-4 border-t border-spec-border pt-6 text-sm">
        <Link href="/privacy" className="text-spec-accentText hover:underline">
          Privacy Policy
        </Link>
        <Link href="/terms" className="text-spec-accentText hover:underline">
          Terms of Service
        </Link>
        <Link href="/disclaimer" className="text-spec-accentText hover:underline">
          Engineering Disclaimer
        </Link>
      </div>
    </div>
  );
}
