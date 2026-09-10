import Link from "next/link";
import { listSpecRoutesForSlug } from "@/lib/calculators/spec-routes";

type SpecRouteLinkGridProps = {
  slug: string;
  /** When set, highlight the active programmatic URL. */
  activeSpec?: string;
  /** Override section heading. */
  heading?: string;
};

/**
 * Crawlable HTML hub of every programmatic SpecRoute for a calculator.
 * Renders plain <Link> anchors so Googlebot can discover /calculator/:slug/:spec.
 */
export default function SpecRouteLinkGrid({
  slug,
  activeSpec,
  heading = "Indexable specification URLs",
}: SpecRouteLinkGridProps) {
  const routes = listSpecRoutesForSlug(slug);
  if (routes.length === 0) return null;

  return (
    <section
      className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-spec-border dark:bg-spec-panel md:p-5"
      aria-labelledby={`spec-hub-${slug}`}
    >
      <h2
        id={`spec-hub-${slug}`}
        className="m-0 text-base font-semibold text-slate-800 dark:text-slate-100 md:text-lg"
      >
        {heading}
      </h2>
      <p className="mt-1.5 mb-3 text-[13px] leading-snug text-spec-text2">
        Self-referencing canonical pages for common field sizes and ratings.
        Each link is a clean path (no query string) included in{" "}
        <code className="font-mono text-[12px]">sitemap.xml</code>.
      </p>
      <ul className="m-0 grid list-none grid-cols-1 gap-1.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((route) => {
          const href = `/calculator/${route.slug}/${route.spec}`;
          const active = activeSpec === route.spec;
          return (
            <li key={route.spec} className="min-w-0">
              <Link
                href={href}
                className={`block truncate rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-blue-300 bg-blue-50 font-semibold text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-100"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:border-spec-accent hover:bg-white dark:border-spec-border dark:bg-spec-bg dark:text-slate-200 dark:hover:bg-spec-panel"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {route.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
