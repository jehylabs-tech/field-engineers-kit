"use client";

import { Suspense } from "react";
import CommandPalette from "@/components/search/CommandPalette";
import { SearchProvider } from "@/components/search/SearchProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import QuickUnitDock from "@/components/home/QuickUnitDock";
import { QuickUnitProvider } from "@/components/layout/QuickUnitProvider";
import FeedbackModal from "@/components/feedback/FeedbackModal";
import type { Calculator } from "@/lib/calculators/types";
import ChunkErrorRecovery from "@/components/providers/ChunkErrorRecovery";

export default function AppProviders({
  calculators,
  children,
}: {
  calculators: Calculator[];
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SearchProvider calculators={calculators}>
          <QuickUnitProvider>
            <ChunkErrorRecovery />
            {children}
            <CommandPalette />
            <Suspense fallback={null}>
              <QuickUnitDock />
            </Suspense>
            <FeedbackModal calculators={calculators} />
          </QuickUnitProvider>
        </SearchProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
