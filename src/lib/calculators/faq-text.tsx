import type { ReactNode } from "react";

/** Strip **bold** markers from FAQ copy for JSON-LD / plain text. */
export function stripFaqMarkdown(text: string): string {
  return text.replace(/\*\*/g, "");
}

/** Render copy with optional **bold** markers for field scanning. */
export function renderFaqAnswer(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
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
    return <span key={index}>{part}</span>;
  });
}
