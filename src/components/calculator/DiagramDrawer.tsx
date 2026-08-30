"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

type DiagramDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  variant?: "drawer" | "modal";
};

export default function DiagramDrawer({
  open,
  onClose,
  children,
  title = "CAD Diagram",
  variant = "drawer",
}: DiagramDrawerProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/45"
          aria-label="Close diagram"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-spec-border dark:bg-spec-bg"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-spec-border">
            <h2 id={titleId} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center rounded border border-spec-borderStrong bg-spec-panel px-2.5 text-sm font-medium text-spec-text hover:bg-spec-bg"
            >
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="[&_.schematic-frame>div>div]:max-h-none [&_.schematic-frame>div>div]:overflow-visible [&_.schematic-frame]:mt-0 [&_.schematic-frame]:border-0 [&_.schematic-frame]:pt-0 [&_img]:mx-auto [&_img]:h-auto [&_img]:w-full [&_img]:object-contain [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full [&_svg]:object-contain">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-slate-900/40">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close diagram"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full max-w-lg flex-col border-l border-spec-border bg-spec-bg shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-spec-border px-3 py-2">
          <h2 id={titleId} className="text-sm font-semibold uppercase tracking-wide text-spec-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded border border-spec-borderStrong bg-spec-panel px-2.5 text-sm font-medium text-spec-text hover:bg-spec-bg"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3 [&_.schematic-frame]:mt-0 [&_.schematic-frame]:border-0 [&_.schematic-frame]:pt-0 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-h-[min(70vh,420px)] [&_svg]:w-full">
          {children}
        </div>
      </aside>
    </div>
  );
}

type ViewDiagramButtonProps = {
  onClick: () => void;
  label?: string;
  compact?: boolean;
};

function RulerIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M3 5.5A1.5 1.5 0 014.5 4h11A1.5 1.5 0 0117 5.5v9a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 14.5v-9zM5 6v1h1V6H5zm2 0v1h1V6H7zm2 0v1h1V6H9zm2 0v1h1V6h-1zm2 0v1h1V6h-1zM5 9v1h1V9H5zm2 0v1h1V9H7zm2 0v1h1V9H9zm2 0v1h1V9h-1zm2 0v1h1V9h-1zM5 12v1h1v-1H5zm2 0v1h1v-1H7zm2 0v1h1v-1H9zm2 0v1h1v-1h-1zm2 0v1h1v-1h-1z" />
    </svg>
  );
}

export function ViewDiagramButton({
  onClick,
  label = "View CAD Diagram",
  compact = false,
}: ViewDiagramButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded border border-slate-300 bg-white font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-spec-borderStrong dark:bg-spec-bg dark:text-slate-200 dark:hover:bg-spec-panel ${
        compact ? "h-7 px-2 text-xs" : "h-8 px-2.5 text-sm"
      }`}
    >
      <RulerIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      {label}
    </button>
  );
}

export function useDiagramOpen() {
  const [open, setOpen] = useState(false);
  return {
    open,
    openDiagram: () => setOpen(true),
    closeDiagram: () => setOpen(false),
  };
}
