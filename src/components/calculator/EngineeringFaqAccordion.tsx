"use client";

import { useState } from "react";
import { renderFaqAnswer } from "@/lib/calculators/faq-text";

type FaqItem = { question: string; answer: string };

function FaqChevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`ml-auto h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${
        open ? "rotate-180" : ""
      }`}
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function EngineeringFaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const open = openIndex === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;
        return (
          <div
            key={item.question}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-spec-border dark:bg-spec-bg"
          >
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-base font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-spec-panel"
              >
                <span className="min-w-0 flex-1 leading-snug">{item.question}</span>
                <FaqChevron open={open} />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:border-spec-border dark:text-slate-200"
            >
              {open ? renderFaqAnswer(item.answer) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
