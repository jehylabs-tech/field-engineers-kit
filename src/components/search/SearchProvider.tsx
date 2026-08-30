"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Calculator } from "@/lib/calculators/types";

type SearchContextValue = {
  calculators: Calculator[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({
  calculators,
  children,
}: {
  calculators: Calculator[];
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const value = useMemo(
    () => ({ calculators, isOpen, open, close }),
    [calculators, isOpen, open, close],
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}
