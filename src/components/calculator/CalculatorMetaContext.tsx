"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CalculatorType } from "@/lib/calculators/definitions";
import {
  resolveWorkstationLayout,
  type WorkstationLayout,
} from "@/lib/calculators/workstation-layout";

type CalculatorMeta = {
  standard?: string;
  formulaBasis?: string;
  slug?: string;
  type?: CalculatorType;
  layout?: WorkstationLayout | "datasheet";
};

const CalculatorMetaContext = createContext<CalculatorMeta>({});

export function CalculatorMetaProvider({
  value,
  children,
}: {
  value: CalculatorMeta;
  children: ReactNode;
}) {
  const layout = resolveWorkstationLayout(value.layout, value.type);
  return (
    <CalculatorMetaContext.Provider value={{ ...value, layout }}>
      {children}
    </CalculatorMetaContext.Provider>
  );
}

export function useCalculatorMeta() {
  return useContext(CalculatorMetaContext);
}

export function useWorkstationLayout(): WorkstationLayout {
  const meta = useContext(CalculatorMetaContext);
  return resolveWorkstationLayout(meta.layout, meta.type);
}
