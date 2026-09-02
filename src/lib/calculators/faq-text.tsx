import type { ReactNode } from "react";

/** Strip **bold** markers from FAQ copy for JSON-LD / plain text. */
export function stripFaqMarkdown(text: string): string {
  return text.replace(/\*\*/g, "");
}

/** Render copy with optional **bold** and *italic* markers for field scanning. */
export function renderFaqAnswer(text: string): ReactNode {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(pattern).filter((part) => part.length > 0);
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
