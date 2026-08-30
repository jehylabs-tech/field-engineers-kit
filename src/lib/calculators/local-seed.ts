import localSeedRaw from "../../../data/calculators/localSeed.json";
import type { Calculator } from "@/lib/calculators/types";

const localCalculators = localSeedRaw as Calculator[];

export function getLocalPublishedCalculators(): Calculator[] {
  return localCalculators.filter((calculator) => calculator.is_published);
}

export function getLocalPublishedCalculatorBySlug(slug: string): Calculator | null {
  return (
    getLocalPublishedCalculators().find((calculator) => calculator.slug === slug) ??
    null
  );
}

export function getLocalPublishedCalculatorsByCategory(
  category: string,
): Calculator[] {
  return getLocalPublishedCalculators().filter(
    (calculator) => calculator.category === category,
  );
}

export function isUsingLocalCalculatorFallback(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
