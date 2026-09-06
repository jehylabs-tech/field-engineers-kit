"use client";

import type { ReactNode } from "react";
import { useUnitSystemOptional } from "@/components/units/UnitContext";
import { renderFaqAnswer } from "@/lib/calculators/faq-text";
import { flattenUnitTokens } from "@/lib/units/unit-aware-text";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { readPreferredUnitSystem } from "@/lib/units/preferred-system";
import { useEffect, useState } from "react";

type UnitAwareCopyProps = {
  text: string;
  className?: string;
};

function useResolvedUnitSystem(): UnitSystem {
  const ctx = useUnitSystemOptional();
  const [fallback, setFallback] = useState<UnitSystem>("metric");

  useEffect(() => {
    if (ctx) return;
    setFallback(readPreferredUnitSystem());
    function onUnits(event: Event) {
      const detail = (event as CustomEvent<UnitSystem>).detail;
      if (detail === "metric" || detail === "imperial") setFallback(detail);
    }
    window.addEventListener("fek-units-change", onUnits);
    return () => window.removeEventListener("fek-units-change", onUnits);
  }, [ctx]);

  return ctx?.unitSystem ?? fallback;
}

/** Client copy that resolves {{u:…}} / {{pick:…}} against the navbar unit system. */
export default function UnitAwareCopy({
  text,
  className,
}: UnitAwareCopyProps): ReactNode {
  const system = useResolvedUnitSystem();
  const resolved = flattenUnitTokens(text, system);
  const content = renderFaqAnswer(resolved);
  if (className) {
    return <span className={className}>{content}</span>;
  }
  return content;
}
