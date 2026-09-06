"use client";

import { unitSymbol, type UnitQuantity } from "@/lib/unitConverter";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { useUnitSystemOptional } from "@/components/units/UnitContext";

type UnitLabelProps = {
  type: UnitQuantity;
  /** Override when rendering engine output for a specific system. */
  system?: UnitSystem;
  className?: string;
};

/**
 * Dynamic unit glyph driven by global UnitContext (or an explicit system override).
 */
export default function UnitLabel({
  type,
  system,
  className,
}: UnitLabelProps) {
  const ctx = useUnitSystemOptional();
  const resolved = system ?? ctx?.unitSystem ?? "metric";
  return (
    <span className={className} data-unit={type} data-system={resolved}>
      {unitSymbol(type, resolved)}
    </span>
  );
}
