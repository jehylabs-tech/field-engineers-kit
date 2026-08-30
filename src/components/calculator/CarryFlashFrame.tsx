"use client";

import type { ReactNode } from "react";
import { useCarryOver } from "@/components/calculator/CarryOverContext";

export function CarryFlashFrame({ children }: { children: ReactNode }) {
  const carryOver = useCarryOver();
  return (
    <div
      className={`flex w-full min-w-0 flex-1 flex-col ${carryOver?.active ? "carry-flash" : ""}`}
    >
      {children}
    </div>
  );
}
