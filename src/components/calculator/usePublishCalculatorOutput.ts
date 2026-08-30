"use client";

import { useEffect, useRef } from "react";
import { useCalculatorOutput } from "@/components/calculator/CalculatorOutputContext";
import { useCalculatorMeta } from "@/components/calculator/CalculatorMetaContext";
import { trackCalculate } from "@/lib/analytics/events";
import type { CalculatorOutput } from "@/lib/calculators/definitions";

/**
 * Keeps the sticky SummaryBar in lockstep with the calculator's live output.
 * useLayoutEffect publishes before paint; cleanup only runs on unmount so the
 * bar never flashes null / stale values between input updates.
 */
export function usePublishCalculatorOutput(output: CalculatorOutput) {
  const { setOutput } = useCalculatorOutput();
  const meta = useCalculatorMeta();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRun = useRef(true);

  useEffect(() => {
    setOutput(output);

    const calcId = meta.slug || meta.type;
    if (calcId) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        trackCalculate(calcId, {
          is_initial: isFirstRun.current,
          summary_status: output.summaryStatus?.level,
        });
        isFirstRun.current = false;
      }, 600);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [output, setOutput, meta.slug, meta.type]);

  useEffect(() => {
    return () => setOutput(null);
  }, [setOutput]);
}
