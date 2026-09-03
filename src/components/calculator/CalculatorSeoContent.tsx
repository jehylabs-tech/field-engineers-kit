import EngineeringFaqAccordion from "@/components/calculator/EngineeringFaqAccordion";
import FittingValveReferenceSections from "@/components/calculator/FittingValveReferenceSections";
import SeoLookupTable from "@/components/calculator/SeoLookupTable";
import UnitConverterReferenceSections from "@/components/calculator/UnitConverterReferenceSections";
import {
  renderFaqAnswer,
  stripFaqMarkdown,
} from "@/lib/calculators/faq-text";
import { looksLikeLatex, renderKatexHtml } from "@/lib/calculators/katex-html";
import { getCalculatorSeo } from "../../../data/calculatorSeoData";
import { getSiteUrl } from "@/lib/site";
import { formatCodeStandard } from "@/lib/calculators/format-standard";
import { Suspense } from "react";

type CalculatorSeoContentProps = {
  slug: string;
  title: string;
  description?: string;
};

function stripStepNumber(name: string) {
  return name.replace(/^\d+\.\s*/, "").trim();
}

const GUIDE_CARD =
  "mb-4 border border-slate-200 rounded-xl bg-white shadow-sm p-6 dark:bg-slate-900";

function renderMaybeKatex(value: string, displayMode = false) {
  if (!looksLikeLatex(value)) return null;
  return { __html: renderKatexHtml(value, displayMode) };
}

export default function CalculatorSeoContent({
  slug,
  title,
  description,
}: CalculatorSeoContentProps) {
  const data = getCalculatorSeo(slug);
  if (!data) return null;

  const articleDescription =
    description ?? data.formulaNotes ?? `Engineering calculator: ${title}`;
  const pageUrl = `${getSiteUrl()}/calculator/${slug}`;
  const isUnitConverter = slug === "unit-converter";
  const isFittingValve = slug === "fitting-valve-dimension";
  const useDynamicReference = isUnitConverter || isFittingValve;

  const faqMainEntity = data.faq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: stripFaqMarkdown(item.answer),
    },
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        headline: `${title} - Standard Engineering Calculation`,
        description: articleDescription,
        proficiencyLevel: "Expert",
        articleSection: "Engineering Calculators",
        url: pageUrl,
        inLanguage: "en-US",
        about: data.standards.map((s) => ({
          "@type": "Thing",
          name: s,
        })),
      },
      {
        "@type": "SoftwareApplication",
        name: title,
        applicationCategory: "EngineeringApplication",
        operatingSystem: "Web",
        url: pageUrl,
        description: articleDescription,
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      {
        "@type": "HowTo",
        name: data.howToName,
        description: `Step-by-step field engineering guide and calculation procedure for ${title}.`,
        step: data.howToSteps.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: stripStepNumber(step.name),
          text: step.text,
        })),
      },
    ],
  };

  const faqPageLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: faqMainEntity,
  };

  const formulaBoxClass = [
    "eng-formula flex flex-col items-center justify-center rounded-lg px-4 py-5 text-center",
    data.formulaHighlight
      ? "border border-blue-100 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-950/20"
      : "border border-slate-200 bg-slate-50 dark:border-spec-border dark:bg-spec-bg",
    data.formulaBadges && data.formulaBadges.length > 0 ? "" : "mb-3",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      id="engineering-reference"
      aria-label={`${title} engineering reference`}
      className="border-t border-spec-border bg-spec-bg py-4 md:py-6"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageLd) }}
      />

      <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-spec-success">
        Engineering Reference &amp; ASME Code Basis
      </p>

      {data.allowancesAndTolerances && data.materialLimitations && data.workedExample ? (
        <>
          {/* Section 1: Core Formula & Variable Definitions */}
          <section className={GUIDE_CARD} aria-labelledby="section-1-heading">
            <h2 id="section-1-heading" className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              1. Core Formula &amp; Variable Definitions
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {data.standards
                .map((item) => formatCodeStandard(item) ?? item)
                .join(" · ")}
            </p>
            <div className={formulaBoxClass}>
              {data.slug === "thermal-expansion-loop" ? (
                <div className="space-y-3 text-slate-900 dark:text-slate-50">
                  {[
                    String.raw`\Delta L = \alpha \cdot L \cdot \Delta T`,
                    String.raw`L_{\text{leg}} = \sqrt{\frac{3 \cdot E_h \cdot D \cdot \Delta L_{\text{leg}}}{S_A}}`,
                    String.raw`F_{\text{anchor,total}} = F_{\text{bending}} + F_{\text{friction}}, \quad F_{\text{friction}} = \mu \cdot W_{\text{pipe,operating}}`,
                  ].map((latex) => (
                    <div
                      key={latex}
                      className="flex justify-center rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
                      dangerouslySetInnerHTML={{ __html: renderKatexHtml(latex, true) }}
                    />
                  ))}
                  <p className="eng-plain">ASME B31.3 Appendix C &amp; guided-cantilever thermal flexibility sizing</p>
                </div>
              ) : data.slug === "pressure-drop-friction" ? (
                <div className="space-y-3 text-slate-900 dark:text-slate-50">
                  {[
                    String.raw`\Delta P = f \cdot \frac{L_{\text{total}}}{D} \cdot \frac{1}{2}\rho v^2`,
                    String.raw`h_f = \frac{\Delta P}{\rho \cdot g}`,
                    String.raw`\frac{1}{\sqrt{f}} = -1.8 \log_{10} \left[ \left(\frac{\varepsilon / D}{3.7}\right)^{1.11} + \frac{6.9}{Re} \right]`,
                    String.raw`Re = \frac{\rho \cdot v \cdot D}{\mu}`,
                  ].map((latex) => (
                    <div
                      key={latex}
                      className="flex justify-center rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
                      dangerouslySetInnerHTML={{ __html: renderKatexHtml(latex, true) }}
                    />
                  ))}
                  <p className="eng-plain">Darcy-Weisbach Equation, Haaland Explicit Friction &amp; Crane TP-410 Fitting Equivalents</p>
                </div>
              ) : (
                <div
                  className="eng-formula-html text-xl font-semibold tracking-wide text-slate-900 dark:text-slate-50 md:text-2xl"
                  dangerouslySetInnerHTML={{ __html: data.formulaHtml }}
                />
              )}
            </div>
            {data.slug === "pipe-wall-thickness" && data.formulaLatex ? (
              <div
                className="mb-3 mt-3 rounded-lg border border-slate-200 bg-white/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40"
                aria-label="ASME B31.3 LaTeX formula reference"
              >
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  LaTeX (Para. 304.1.2)
                </p>
                <div className="eng-formula-html space-y-2 text-lg text-slate-900 dark:text-slate-100">
                  <p className="eng-eq m-0">
                    <i>t</i> ={" "}
                    <span className="eng-frac">
                      <span className="eng-num">
                        <i>P</i> · <i>D</i>
                      </span>
                      <span className="eng-den">
                        2(<i>S</i> · <i>E</i> + <i>P</i> · <i>Y</i>)
                      </span>
                    </span>
                  </p>
                  <p className="eng-eq m-0">
                    <i>t</i>
                    <sub>m</sub> = <i>t</i> + <i>c</i>
                  </p>
                </div>
              </div>
            ) : null}
            {data.formulaBadges && data.formulaBadges.length > 0 ? (
              <div className="mb-3 mt-3 flex flex-wrap items-center justify-center gap-2">
                {data.formulaBadges.map((badge) => (
                  <span
                    key={`${badge.label}-${badge.value ?? ""}`}
                    className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-xs tabular-nums text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {badge.value ? `${badge.label} ${badge.value}` : badge.label}
                  </span>
                ))}
              </div>
            ) : null}
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
          </section>

          {/* Section 2: Allowances, Tolerances & Standards */}
          <section className={GUIDE_CARD} aria-labelledby="section-2-heading">
            <h2 id="section-2-heading" className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              2. Allowances, Tolerances &amp; Standards
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {data.allowancesAndTolerances.summary}
            </p>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.allowancesAndTolerances.items.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.label}
                    </span>
                    {item.value ? (
                      <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-xs font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                        {item.value}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick Reference Lookup Table
              </h3>
              <SeoLookupTable
                caption={data.tableCaption}
                headers={data.tableHeaders}
                rows={data.tableRows}
                footnote={data.tableFootnote}
                allNumeric={data.tableAllNumeric}
                torqueNmColumns={data.tableTorqueNmColumns}
                boldColumns={data.tableBoldColumns}
              />
            </div>
          </section>

          {/* Section 3: Material & Code Limitations */}
          <section className={GUIDE_CARD} aria-labelledby="section-3-heading">
            <h2 id="section-3-heading" className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              3. Material &amp; Code Limitations
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {data.materialLimitations.summary}
            </p>
            <div className="mb-5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-3.5 py-2.5">Material Group</th>
                    <th className="px-3.5 py-2.5">Temperature Range</th>
                    <th className="px-3.5 py-2.5">Allowable Stress / Limit</th>
                    <th className="px-3.5 py-2.5">Engineering Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {data.materialLimitations.items.map((mat) => (
                    <tr key={mat.materialGroup} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-3.5 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        {mat.materialGroup}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-600 dark:text-slate-300">
                        {mat.temperatureLimit ?? "—"}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-700 dark:text-slate-300">
                        {mat.stressLimit ?? "—"}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400">
                        {mat.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.materialLimitations.codeRestrictions &&
            data.materialLimitations.codeRestrictions.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  Code Applicability &amp; Safety Boundaries
                </h3>
                <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                  {data.materialLimitations.codeRestrictions.map((crit, idx) => (
                    <li key={idx}>{crit}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {/* Section 4: Step-by-Step Worked Example */}
          <section className={GUIDE_CARD} aria-labelledby="section-4-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 id="section-4-heading" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                4. Step-by-Step Worked Example
              </h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                Field Verification
              </span>
            </div>
            <p className="mb-3 text-sm font-medium text-slate-800 dark:text-slate-200">
              {data.workedExample.scenario}
            </p>
            {data.workedExample.designConditions && (
              <div className="mb-4 flex flex-wrap gap-2">
                {data.workedExample.designConditions.map((cond) => (
                  <span
                    key={cond.label}
                    className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <span className="text-slate-500 dark:text-slate-400">{cond.label}:</span>
                    <strong className="font-mono text-slate-900 dark:text-slate-100">{cond.value}</strong>
                  </span>
                ))}
              </div>
            )}
            <div className="space-y-3">
              {data.workedExample.steps.map((step, idx) => (
                <div
                  key={step.name}
                  className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white dark:bg-blue-500">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {step.name}
                    </h3>
                  </div>
                  {step.formula ? (
                    renderMaybeKatex(step.formula, true) ? (
                      <div
                        className="mt-2 flex justify-center rounded bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                        dangerouslySetInnerHTML={renderMaybeKatex(step.formula, true)!}
                      />
                    ) : (
                      <div className="mt-2 rounded bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                        Formula: {step.formula}
                      </div>
                    )
                  ) : null}
                  {step.calculation ? (
                    <div className="mt-1.5 rounded bg-slate-100/70 px-3 py-1.5 font-mono text-xs text-slate-800 dark:bg-slate-800/50 dark:text-slate-200">
                      {step.calculation}
                    </div>
                  ) : null}
                  {step.result ? (
                    <div className="mt-2 flex flex-col gap-1.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-medium text-slate-500 dark:text-slate-400">Result:</span>
                      {renderMaybeKatex(step.result, false) ? (
                        <span
                          className="inline-block rounded bg-emerald-50 px-2 py-1 font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          dangerouslySetInnerHTML={renderMaybeKatex(step.result, false)!}
                        />
                      ) : (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {step.result}
                        </span>
                      )}
                    </div>
                  ) : null}
                  {step.note ? (
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {step.note}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            {data.workedExample.conclusion ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs leading-relaxed text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                <strong>Conclusion: </strong> {data.workedExample.conclusion}
              </div>
            ) : null}
          </section>

          {/* Section 5: Code Limitations & FAQ */}
          <section className={GUIDE_CARD} id="faq" aria-labelledby="section-5-heading">
            <h2 id="section-5-heading" className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
              5. Code Limitations &amp; FAQ
            </h2>
            <EngineeringFaqAccordion items={data.faq} />
          </section>
        </>
      ) : (
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
            <div className={formulaBoxClass}>
              <div
                className="eng-formula-html text-xl font-semibold tracking-wide text-slate-900 dark:text-slate-50 md:text-2xl"
                dangerouslySetInnerHTML={{ __html: data.formulaHtml }}
              />
            </div>
            {data.formulaBadges && data.formulaBadges.length > 0 ? (
              <div className="mb-3 mt-3 flex flex-wrap items-center justify-center gap-2">
                {data.formulaBadges.map((badge) => (
                  <span
                    key={`${badge.label}-${badge.value ?? ""}`}
                    className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-xs tabular-nums text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {badge.value ? `${badge.label} ${badge.value}` : badge.label}
                  </span>
                ))}
              </div>
            ) : null}
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
              allNumeric={data.tableAllNumeric}
              torqueNmColumns={data.tableTorqueNmColumns}
              boldColumns={data.tableBoldColumns}
            />
          </div>

          <div className={GUIDE_CARD}>
            <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
              3. How to use this calculator
            </h2>
            <ol className="space-y-2.5">
              {data.howToSteps.map((step, index) => (
                <li key={step.name} className="flex gap-2.5">
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
            <EngineeringFaqAccordion items={data.faq} />
          </div>
        </>
      )}
    </article>
  );
}
