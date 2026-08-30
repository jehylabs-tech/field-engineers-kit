"use client";

import Link from "@/components/ui/AppLink";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import type { CalculatorType, RelatedCalculator } from "@/lib/calculators/definitions";
import type { Calculator } from "@/lib/calculators/types";
import { trackEvent } from "@/lib/analytics/events";
import { CONTACT_EMAIL } from "@/lib/legal/constants";
import { prefetchCalculatorHref } from "@/lib/navigation/prefetch-calculators";
import {
  getNextActions,
  parsePlantContextFromSearchParams,
} from "@/lib/plant-context";

type NextActionsSectionProps = {
  currentType: CalculatorType;
  calculators: Pick<Calculator, "slug" | "title">[];
  related?: RelatedCalculator[];
  sponsor?: {
    title: string;
    description: string;
  };
};

export default function NextActionsSection({
  currentType,
  calculators,
  related = [],
  sponsor,
}: NextActionsSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plant = parsePlantContextFromSearchParams(searchParams);
  const actions = getNextActions(currentType, plant, calculators);

  const fallback = actions.length === 0
    ? related.map((item) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("carried", "1");
        const query = params.toString();
        return {
          slug: item.slug,
          title: item.title,
          href: query ? `/calculator/${item.slug}?${query}` : `/calculator/${item.slug}`,
          carry: item.carry ?? "Carry current inputs",
        };
      })
    : [];

  const cards = actions.length > 0 ? actions : fallback;
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Technical inquiry / RFQ — FieldEngineersKit")}`;

  useEffect(() => {
    for (const card of cards) {
      prefetchCalculatorHref(router, card.href);
    }
  }, [cards, router]);

  return (
    <section className="pt-2">
      <div className="border border-slate-200 rounded-xl bg-white shadow-sm p-6 dark:bg-slate-900">
        <h2 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          5. Next actions
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {currentType === "butt-weld-fitting"
            ? "Open the next job with size, schedule, and material carried over. No re-entry. Values are already in the URL."
            : "Open the next job with size, class, and pressure carried over. No re-entry. Values are already in the URL."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((item) => (
          <Link
            key={item.slug}
            href={item.href}
            onClick={() =>
              trackEvent("select_content", {
                content_type: "calculator",
                item_id: item.slug,
              })
            }
            className="min-h-11 rounded-[10px] border border-spec-border bg-spec-bg p-4 transition-colors hover:border-spec-accent/30"
          >
            <div className="mb-2 text-base font-semibold text-spec-text">
              {item.title}
            </div>
            {item.carry ? (
              <span className="inline-block rounded-full bg-spec-accentBg px-2.5 py-1 text-sm text-spec-accentText">
                Carry {item.carry}
              </span>
            ) : null}
          </Link>
        ))}

        {sponsor ? (
          <article className="flex flex-col rounded-[10px] border border-spec-sponBorder bg-spec-sponBg p-4">
            <span className="mb-2 inline-flex self-start rounded bg-[#FBEBC8] px-2.5 py-1 text-sm font-semibold tracking-wide text-spec-sponText">
              SPONSORED
            </span>
            <div className="text-base font-semibold text-spec-sponText">
              {sponsor.title}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[#9C7A3C]">
              {sponsor.description}
            </p>
          </article>
        ) : null}

        <a
          href={mailto}
          onClick={() =>
            trackEvent("select_content", {
              content_type: "contact",
              item_id: "rfq",
            })
          }
          className="flex min-h-11 flex-col rounded-[10px] border border-spec-border bg-spec-bg p-4 transition-colors hover:border-spec-accent/30"
        >
          <div className="mb-2 text-base font-semibold text-spec-text">
            Technical inquiry / RFQ
          </div>
          <span className="inline-flex min-h-10 w-fit items-center rounded-md bg-spec-accent px-3 text-sm font-medium text-white">
            Request expert review
          </span>
        </a>
        </div>
      </div>
    </section>
  );
}
