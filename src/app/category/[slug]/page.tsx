import Link from "@/components/ui/AppLink";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import { CATEGORY_UI } from "@/lib/home/ui";
import { getPublishedCalculatorsByCategory } from "@/lib/calculators/queries";
import { getCategoryById, getVisibleCategories } from "@/lib/menu/config";
import { buildSiteMetadata } from "@/lib/metadata/site-metadata";

type CategoryPageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return getVisibleCategories().map((category) => ({ slug: category.id }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const category = getCategoryById(params.slug);
  if (!category || !category.isVisible) {
    return { robots: { index: false, follow: false } };
  }
  const ui = CATEGORY_UI[category.id];
  const title = ui?.label ?? category.label;
  return buildSiteMetadata({
    canonicalPath: `/category/${category.id}`,
    title,
    description: category.description,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const category = getCategoryById(params.slug);

  if (!category || !category.isVisible) {
    notFound();
  }

  const calculators = await getPublishedCalculatorsByCategory(params.slug);
  const ui = CATEGORY_UI[category.id];

  return (
    <div className="mx-auto max-w-home px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={ui?.label ?? category.label}
        description={category.description}
      />

      {calculators.length === 0 ? (
        <section className="mt-8 rounded-xl border border-dashed border-spec-border bg-spec-panel px-6 py-10 text-center">
          <p className="text-base font-medium text-spec-text">
            No published calculators yet
          </p>
          <p className="mt-2 text-[15px] text-spec-text2">
            Publish calculators in the admin dashboard, or run Supabase seed SQL
            if using a remote database.
          </p>
        </section>
      ) : (
        <section className="mt-8 overflow-hidden rounded-xl border border-spec-border">
          {calculators.map((calculator) => (
            <Link
              key={calculator.id}
              href={`/calculator/${calculator.slug}`}
              className="flex items-center gap-3 border-b border-spec-border px-4 py-3.5 last:border-b-0 hover:bg-spec-panel/60"
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-medium text-spec-text md:text-lg">
                  {calculator.title}
                </h2>
                <p className="mt-1 line-clamp-1 text-sm text-spec-text2 md:text-base">
                  {calculator.meta_description}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-spec-accentText md:text-base">
                Open →
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
