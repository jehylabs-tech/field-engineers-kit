"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type CarryOverContextValue = {
  active: boolean;
  triggerCarryOver: (message?: string) => void;
};

const CarryOverContext = createContext<CarryOverContextValue | null>(null);

export function CarryOverProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const triggerCarryOver = useCallback((message?: string) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    setActive(true);
    timeoutRef.current = window.setTimeout(() => setActive(false), 1800);
    void message;
  }, []);

  const value = useMemo(
    () => ({ active, triggerCarryOver }),
    [active, triggerCarryOver],
  );

  return (
    <CarryOverContext.Provider value={value}>
      {children}
    </CarryOverContext.Provider>
  );
}

export function useCarryOver() {
  return useContext(CarryOverContext);
}
