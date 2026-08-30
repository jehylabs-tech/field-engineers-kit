"use client";

import { createContext, useContext, type ReactNode } from "react";

const SpecSeedContext = createContext<Record<string, string> | null>(null);

export function SpecSeedProvider({
  seed,
  children,
}: {
  seed?: Record<string, string>;
  children: ReactNode;
}) {
  return (
    <SpecSeedContext.Provider value={seed ?? null}>
      {children}
    </SpecSeedContext.Provider>
  );
}

export function useSpecSeed() {
  return useContext(SpecSeedContext);
}
