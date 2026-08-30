import Link from "@/components/ui/AppLink";
import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import { getPublishedCalculators } from "@/lib/calculators/queries";
import { parseCalculatorDefinition } from "@/lib/calculators/definitions";
import { buildSiteMetadata } from "@/lib/metadata/site-metadata";

export const metadata: Metadata = buildSiteMetadata({
  canonicalPath: "/calculators",
  title: "Engineering Calculators",
  description:
    "The live Field Engineer Kit set. Each tool reads plant context from the URL: size, schedule, material, pressure, temperature, and class.",
});

export default async function CalculatorsIndexPage() {
  const calculators = await getPublishedCalculators();

  return (
    <div className="mx-auto max-w-home px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={`${calculators.length} verified engineering calculators`}
        description="The live set only. Each tool reads the same plant context from the URL: size, schedule, material, pressure, temperature, and class."
      />
      <section className="mt-8 overflow-hidden rounded-xl border border-spec-border">
        {calculators.map((calculator) => {
          const definition = parseCalculatorDefinition(calculator.formula_json);
          return (
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
                  {definition.standard ?? calculator.meta_description}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-spec-accentText md:text-base">
                Open →
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
