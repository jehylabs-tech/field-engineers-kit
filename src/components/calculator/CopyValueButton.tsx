"use client";

import { useToast } from "@/components/ui/ToastProvider";
import { useCalculatorMeta } from "@/components/calculator/CalculatorMetaContext";
import { trackCopyResult } from "@/lib/analytics/events";

type CopyValueButtonProps = {
  text: string;
  ariaLabel?: string;
};

export default function CopyValueButton({
  text,
  ariaLabel = "Copy result",
}: CopyValueButtonProps) {
  const { showToast } = useToast();
  const meta = useCalculatorMeta();

  async function handleCopy() {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
    trackCopyResult(meta.slug || meta.type || "unknown", {
      content_type: "calculator_value",
      label: ariaLabel,
      value_preview: text.length > 50 ? text.slice(0, 50) + "..." : text,
    });
    showToast("Copied to clipboard");
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md border border-spec-border bg-spec-bg text-sm text-spec-text2 hover:border-spec-accent/40 hover:text-spec-text focus:outline-none focus:ring-2 focus:ring-spec-accent"
    >
      ⧉
    </button>
  );
}
