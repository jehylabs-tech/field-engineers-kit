"use client";

import EngineeringFaqAccordion from "@/components/calculator/EngineeringFaqAccordion";
import {
  FLANGE_INLINE_FAQ,
  FLANGE_MATERIAL_GROUPS,
  FLANGE_TOLERANCE_NOTES,
} from "@/lib/calculators/flange-reference";

export default function FlangeReferenceNotes() {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          ASME B16.5 tolerances
        </p>
        <ul className="space-y-1.5">
          {FLANGE_TOLERANCE_NOTES.map((item) => (
            <li
              key={item.label}
              className="rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs dark:border-spec-border dark:bg-spec-bg"
            >
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {item.label}
              </span>
              <span className="mt-0.5 block font-mono text-[11px] text-slate-600 dark:text-slate-300">
                {item.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Material group MAWP (screening)
        </p>
        <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-spec-border">
          <table className="w-full min-w-0 text-left text-[11px]">
            <thead className="bg-slate-100/80 font-semibold text-slate-700 dark:bg-spec-panel dark:text-slate-300">
              <tr>
                <th className="px-2 py-1.5">Group</th>
                <th className="px-2 py-1.5">Typical Cl 150 rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-spec-border">
              {FLANGE_MATERIAL_GROUPS.map((row) => (
                <tr key={row.group} className="bg-white dark:bg-spec-bg">
                  <td className="px-2 py-1.5 font-medium text-slate-800 dark:text-slate-100">
                    {row.group}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-slate-600 dark:text-slate-300">
                    {row.rating}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Field FAQ
        </p>
        <EngineeringFaqAccordion items={[...FLANGE_INLINE_FAQ]} />
      </div>

      <p className="text-[11px] leading-snug text-spec-text2">
        Full code basis, lookup table, and worked example:{" "}
        <a
          href="#engineering-reference"
          className="font-medium text-spec-accent underline-offset-2 hover:underline"
        >
          Engineering Reference below
        </a>
        .
      </p>
    </div>
  );
}
