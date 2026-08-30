"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/ui/AppLink";
import UnitConverterPanel from "@/components/calculator/UnitConverterPanel";
import { useQuickUnit } from "@/components/layout/QuickUnitProvider";
import { calculateUnitConverter } from "@/lib/calculators/engines/unit-converter";
import type { UnitCategory } from "@/lib/units/engineering";

export default function QuickUnitDock() {
  const pathname = usePathname();
  const titleId = useId();
  const { open, setOpen } = useQuickUnit();
  const [category, setCategory] = useState<UnitCategory>("pressure");
  const [value, setValue] = useState(20);
  const [from, setFrom] = useState("bar");
  const [to, setTo] = useState("psi");
  const [density, setDensity] = useState(1000);
  const [digits, setDigits] = useState<2 | 3>(3);

  const hidden =
    pathname.startsWith("/admin") || pathname === "/calculator/unit-converter";

  useEffect(() => {
    if (hidden && open) setOpen(false);
  }, [hidden, open, setOpen]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  const output = useMemo(
    () => calculateUnitConverter({ category, value, from, to, density, digits }),
    [category, value, from, to, density, digits],
  );

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close unit converter"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-slate-900/40 transition-opacity duration-200 print:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        id="quick-unit-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-[61] flex w-full max-w-sm flex-col overflow-y-auto border-l border-spec-border bg-spec-bg shadow-2xl transition-transform duration-200 print:hidden ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-spec-border px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-spec-text">
            Quick unit convert
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-spec-text2 hover:bg-spec-panel hover:text-spec-text"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-5">
          <UnitConverterPanel
            compact
            category={category}
            value={value}
            from={from}
            to={to}
            density={density}
            digits={digits}
            resultLabel={output.heroValue}
            onCategory={setCategory}
            onValue={setValue}
            onFrom={setFrom}
            onTo={setTo}
            onDensity={setDensity}
            onDigits={setDigits}
          />
          <Link
            href="/calculator/unit-converter"
            className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-spec-accentText"
            onClick={() => setOpen(false)}
          >
            Open full converter →
          </Link>
        </div>
      </aside>
    </>
  );
}
