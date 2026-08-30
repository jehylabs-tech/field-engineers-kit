"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { CalculatorOutput } from "@/lib/calculators/definitions";

type CalculatorOutputContextValue = {
  output: CalculatorOutput | null;
  setOutput: (output: CalculatorOutput | null) => void;
};

const CalculatorOutputContext =
  createContext<CalculatorOutputContextValue | null>(null);

export function CalculatorOutputProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [output, setOutputState] = useState<CalculatorOutput | null>(null);
  const setOutput = useCallback((next: CalculatorOutput | null) => {
    setOutputState((prev) => {
      if (prev === next) return prev;
      if (
        prev &&
        next &&
        prev.heroValue === next.heroValue &&
        prev.heroLabel === next.heroLabel &&
        prev.heroStatus === next.heroStatus &&
        prev.heroStatusLevel === next.heroStatusLevel &&
        prev.summary.length === next.summary.length &&
        prev.summary.every(
          (item, i) =>
            item.label === next.summary[i]?.label &&
            item.value === next.summary[i]?.value,
        )
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ output, setOutput }),
    [output, setOutput],
  );

  return (
    <CalculatorOutputContext.Provider value={value}>
      {children}
    </CalculatorOutputContext.Provider>
  );
}

export function useCalculatorOutput() {
  const context = useContext(CalculatorOutputContext);
  if (!context) {
    throw new Error(
      "useCalculatorOutput must be used within CalculatorOutputProvider",
    );
  }
  return context;
}
