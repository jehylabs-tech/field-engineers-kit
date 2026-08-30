"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";

type QuickUnitContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const QuickUnitContext = createContext<QuickUnitContextValue | null>(null);

export function QuickUnitProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((current) => !current), []);
  const value = useMemo(
    () => ({ open, setOpen, toggle }),
    [open, toggle],
  );

  return (
    <QuickUnitContext.Provider value={value}>{children}</QuickUnitContext.Provider>
  );
}

export function useQuickUnit() {
  const context = useContext(QuickUnitContext);
  if (!context) {
    throw new Error("useQuickUnit must be used within QuickUnitProvider");
  }
  return context;
}

export function QuickUnitButton({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { open, toggle } = useQuickUnit();
  const hidden =
    pathname.startsWith("/admin") || pathname === "/calculator/unit-converter";

  if (hidden) return null;

  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls="quick-unit-drawer"
      aria-label="Quick unit converter"
      title="Quick Unit"
      onClick={toggle}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 dark:border-spec-border dark:bg-spec-panel dark:text-slate-200 dark:hover:bg-spec-border ${className}`}
    >
      <Zap className="h-4 w-4" strokeWidth={2.25} />
    </button>
  );
}
