"use client";

import { useCalculatorOutput } from "@/components/calculator/CalculatorOutputContext";
import { useCalculatorMeta } from "@/components/calculator/CalculatorMetaContext";
import {
  buildSpecFactRows,
  type SpecRoute,
} from "@/lib/calculators/spec-routes";

type SpecProgrammaticPanelProps = {
  h2: string;
  route: SpecRoute;
};

function panelCopy(args: {
  type?: string;
  slug?: string;
  h2: string;
  heroLabel?: string;
}): { title: string; blurb: string } {
  const { type, slug, h2, heroLabel } = args;
  const isBolt =
    type === "bolt-sequence" || slug === "flange-bolt-tightening-sequence";
  const isAlloy =
    type === "alloy-weight" || slug === "stainless-alloy-weight-density";
  const isCoping =
    type === "pipe-coping" || slug === "pipe-coping-branch-cut-layout";

  // Alloy / weight tools must never inherit bolt-sequence title templates
  // (heroLabel is often "Total weight", which used to yield
  // "Total weight sequence & PCC-1 rounds").
  if (isAlloy) {
    return {
      title: "Material Weight & Cost Summary",
      blurb:
        "Live inputs drive this summary. Material selection and volume dimensions update the calculation handoff URL.",
    };
  }

  if (isCoping) {
    return {
      title: "Branch Cut Layout Summary",
      blurb:
        "Live inputs drive this summary. Header/branch NPS, schedule, and intersection angle update the clean share URL (e.g. /4-on-6-sch-40-90deg).",
    };
  }

  const isThermal =
    type === "thermal-expansion" || slug === "thermal-expansion-loop";
  if (isThermal) {
    return {
      title: "Expansion & Anchor Load Summary",
      blurb:
        "Live inputs drive this summary. Material, NPS, and schedule update the clean share URL (e.g. /cpvc-4-sch-40, /steam-6-sch-80).",
    };
  }

  const isPneumatic =
    type === "pneumatic-safety" || slug === "pneumatic-test-safety-distance";
  if (isPneumatic) {
    return {
      title: "Pneumatic Safety Distance Summary",
      blurb:
        "Live inputs drive this summary. Test pressure and volume update the clean share URL (e.g. /10-bar-2-m3, /150-psi-50-ft3).",
    };
  }

  if (isBolt) {
    const focus =
      heroLabel && !/weight/i.test(heroLabel) ? heroLabel : "Bolt";
    return {
      title: `${focus} sequence & PCC-1 rounds`,
      blurb:
        "Live inputs drive this summary. Changing bolt count or pattern updates the clean share URL (e.g. /8-bolt-star) for indexing and handoff.",
    };
  }

  return {
    title: h2,
    blurb:
      "Pre-seeded geometry for this programmatic URL. Adjust inputs in the calculator to recalculate; primary selections update the clean path for sharing and indexing.",
  };
}

/**
 * Spec-unique block for programmatic SEO pages (H2 + fact table).
 * SSR/route facts seed the first paint; once the live calculator publishes
 * output, the table follows current inputs so screenshots stay consistent.
 */
export default function SpecProgrammaticPanel({
  h2,
  route,
}: SpecProgrammaticPanelProps) {
  const { output } = useCalculatorOutput();
  const meta = useCalculatorMeta();
  const routeRows = buildSpecFactRows(route);

  const liveRows = (() => {
    if (!output?.summary?.length) return null;
    const rows = output.summary.map((item) => ({
      label: item.label,
      value: item.value,
    }));
    if (
      meta.type === "bolt-sequence" ||
      meta.slug === "flange-bolt-tightening-sequence"
    ) {
      const sequence = output.rows.find((row) => row.label === "Sequence");
      if (sequence && sequence.value && sequence.value !== "—") {
        rows.push({ label: "Sequence", value: sequence.value });
      }
    }
    return rows;
  })();

  const rows = liveRows ?? routeRows;
  if (rows.length === 0) return null;

  const { title, blurb } = panelCopy({
    type: meta.type,
    slug: meta.slug,
    h2,
    heroLabel: output?.heroLabel,
  });

  return (
    <section
      className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-spec-border dark:bg-spec-panel md:p-5"
      aria-labelledby="pseo-spec-heading"
    >
      <h2
        id="pseo-spec-heading"
        className="m-0 text-base font-semibold text-slate-800 dark:text-slate-100 md:text-lg"
      >
        {title}
      </h2>
      <p className="mt-1.5 mb-3 text-[13px] leading-snug text-spec-text2">
        {blurb}
      </p>
      <div className="w-full overflow-x-auto rounded-md border border-slate-200 dark:border-spec-border">
        <table className="w-full min-w-[20rem] text-left text-[12px]">
          <thead className="bg-slate-100/80 font-semibold text-slate-700 dark:bg-spec-bg dark:text-slate-300">
            <tr>
              <th className="px-2.5 py-1.5" scope="col">
                Parameter
              </th>
              <th className="min-w-[12rem] px-2.5 py-1.5 pr-4 text-right" scope="col">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-spec-border">
            {rows.map((row) => (
              <tr key={row.label} className="bg-white dark:bg-spec-panel">
                <td className="whitespace-nowrap px-2.5 py-1.5 font-medium text-slate-800 dark:text-slate-100">
                  {row.label}
                </td>
                <td className="whitespace-nowrap px-2.5 py-1.5 pr-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
