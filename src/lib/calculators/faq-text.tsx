import type { ReactNode } from "react";
import { flattenUnitTokens } from "@/lib/units/unit-aware-text";

/** Strip **bold** markers from FAQ copy for JSON-LD / plain text. */
export function stripFaqMarkdown(text: string): string {
  return flattenUnitTokens(sanitizeFaqInlineMath(text), "metric").replace(
    /\*\*/g,
    "",
  );
}

/** Convert leftover TeX \(...\) / \\(...\\) sequences into readable unicode/plain text. */
function sanitizeFaqInlineMath(text: string): string {
  return text.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner: string) =>
    inner
      .replace(/\\text\{([^}]+)\}/g, "$1")
      .replace(/\\sqrt\{([^}]+)\}/g, "√$1")
      .replace(/\\propto/g, "∝")
      .replace(/\\Delta/g, "Δ")
      .replace(/\\rho/g, "ρ")
      .replace(/\^2/g, "²")
      .replace(/[_^{}\\]/g, ""),
  );
}

/** Render copy with optional **bold** and *italic* markers for field scanning. */
export function renderFaqAnswer(text: string): ReactNode {
  const sanitized = sanitizeFaqInlineMath(text);
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = sanitized.split(pattern).filter((part) => part.length > 0);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong
          key={index}
          className="font-semibold text-slate-800 dark:text-slate-100"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={index} className="italic text-slate-700 dark:text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
