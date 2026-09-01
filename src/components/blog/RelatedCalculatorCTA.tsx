import Link from "@/components/ui/AppLink";
import { Calculator } from "lucide-react";

type RelatedCalculatorCTAProps = {
  calculatorUrl: string;
  calculatorName: string;
  variant?: "sidebar" | "embedded";
};

export default function RelatedCalculatorCTA({
  calculatorUrl,
  calculatorName,
  variant = "sidebar",
}: RelatedCalculatorCTAProps) {
  const isSidebar = variant === "sidebar";

  return (
    <div
      className={`rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm dark:border-blue-900/50 dark:from-blue-950/40 dark:to-indigo-950/30 ${
        isSidebar ? "" : "my-8"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white dark:bg-blue-500"
          aria-hidden
        >
          <Calculator className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            Live FEK Calculator
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            {calculatorName}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Run deterministic, code-aligned calculations with the same inputs
            discussed in this article.
          </p>
          <Link
            href={calculatorUrl}
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Open Calculator →
          </Link>
        </div>
      </div>
    </div>
  );
}
