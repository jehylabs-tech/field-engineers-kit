"use client";

import { useEffect } from "react";
import CalculatorNavList from "@/components/calculator/CalculatorNavList";

type CalculatorNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  activeCategory: string;
  activeSlug: string;
  calculators: { slug: string; title: string; category: string }[];
};

export default function CalculatorNavDrawer({
  open,
  onClose,
  activeCategory,
  activeSlug,
  calculators,
}: CalculatorNavDrawerProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Calculator categories"
        className="absolute left-0 top-0 flex h-full w-[min(84vw,300px)] flex-col border-r border-spec-border bg-spec-panel shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-spec-border px-3 py-3">
          <p className="text-[15px] font-semibold text-spec-text">Menu</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-spec-border text-spec-text2 focus:outline-none focus:ring-2 focus:ring-spec-accent"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-3 pt-3">
          <CalculatorNavList
            activeCategory={activeCategory}
            activeSlug={activeSlug}
            calculators={calculators}
            onNavigate={onClose}
          />
        </div>
      </aside>
    </div>
  );
}
