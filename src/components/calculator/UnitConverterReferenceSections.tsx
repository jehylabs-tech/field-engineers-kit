"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import EngineeringFaqAccordion from "@/components/calculator/EngineeringFaqAccordion";
import SeoLookupTable from "@/components/calculator/SeoLookupTable";
import { renderFaqAnswer } from "@/lib/calculators/faq-text";
import { formatCodeStandard } from "@/lib/calculators/format-standard";
import {
  getUnitConverterCategoryReference,
  resolveUnitConverterCategory,
} from "@/lib/calculators/unit-converter-reference";

const GUIDE_CARD =
  "mb-4 border border-slate-200 rounded-xl bg-white shadow-sm p-6 dark:bg-slate-900";

const FORMULA_BOX =
  "eng-formula mb-3 flex flex-col items-center justify-center overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-center dark:border-spec-border dark:bg-spec-bg";

function stripStepNumber(name: string) {
  return name.replace(/^\d+\.\s*/, "").trim();
}

/** Sections 1–4 for Unit Converter — fully driven by URL `cat`. */
export default function UnitConverterReferenceSections() {
  const searchParams = useSearchParams();
  const category = resolveUnitConverterCategory(searchParams.get("cat"));
  const data = useMemo(
    () => getUnitConverterCategoryReference(category),
    [category],
  );

  return (
    <>
      <div className={GUIDE_CARD}>
        <h2 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          1. Formula &amp; conversion factors
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {data.standards
            .map((item) => formatCodeStandard(item) ?? item)
            .join(" · ")}
        </p>
        <div className={FORMULA_BOX}>
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {data.label}
          </p>
          <div
            className="eng-formula-html text-xl font-semibold tracking-wide text-slate-900 dark:text-slate-50 md:text-2xl"
            dangerouslySetInnerHTML={{ __html: data.formulaHtml }}
          />
        </div>
        <p className="mb-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {data.formulaNotes}
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {data.variables.map((item) => (
            <li key={item.symbol}>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                {item.symbol}
              </strong>
              {item.name ? (
                <>
                  {" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    ({item.name})
                  </span>
                </>
              ) : null}
              {" — "}
              {item.definition}
            </li>
          ))}
        </ul>
      </div>

      <div className={GUIDE_CARD}>
        <h2 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          2. Quick reference lookup table
        </h2>
        <SeoLookupTable
          caption={data.tableCaption}
          headers={data.tableHeaders}
          rows={data.tableRows}
          footnote={data.tableFootnote}
          allNumeric
        />
      </div>

      <div className={GUIDE_CARD}>
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
          3. How to use this calculator
        </h2>
        <ol className="space-y-2.5">
          {data.howToSteps.map((step, index) => (
            <li key={`${category}-${step.name}`} className="flex gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 dark:border-spec-border dark:bg-spec-bg dark:text-slate-300">
                {index + 1}
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 md:text-base">
                  {stripStepNumber(step.name)}
                </p>
                <p className="text-sm leading-snug text-slate-600 dark:text-slate-300">
                  {renderFaqAnswer(step.text)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className={GUIDE_CARD} id="faq">
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
          4. Engineering FAQ
        </h2>
        <EngineeringFaqAccordion
          key={category}
          items={data.faq}
        />
      </div>
    </>
  );
}
