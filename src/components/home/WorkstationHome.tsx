"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { navigateToHref } from "@/lib/navigation/navigate";
import Link from "@/components/ui/AppLink";
import {
  orderedWorkstationDomains,
  searchWorkstationTools,
  WORKSTATION_DOMAIN_TABS,
  WORKSTATION_DOMAINS,
  WORKSTATION_SHORTCUTS,
  type WorkstationDomain,
} from "@/lib/home/workstation";
import type { UnitSystem } from "@/lib/calculators/definitions";
import {
  readPreferredUnitSystem,
  withPreferredUnits,
} from "@/lib/units/preferred-system";
import { usePrefetchCalculators } from "@/hooks/usePrefetchCalculators";
import { useSearchShortcutLabel } from "@/hooks/useSearchShortcutLabel";
import { useZeroResultSearchTracking } from "@/hooks/useZeroResultSearchTracking";
import { trackCalculatorRequested } from "@/lib/analytics/events";
import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  Disc,
  GitCommit,
  ShieldCheck,
  Sliders,
  Wrench,
} from "lucide-react";

const DOMAIN_ICONS: Record<string, LucideIcon> = {
  piping: GitCommit,
  mechanical: Wrench,
  procurement: Calculator,
  "valves-fittings": Sliders,
  gaskets: Disc,
  inspection: ShieldCheck,
};

function usePreferredUnits() {
  const [units, setUnits] = useState<UnitSystem>("metric");
  useEffect(() => {
    setUnits(readPreferredUnitSystem());
    function onUnits(event: Event) {
      const detail = (event as CustomEvent<UnitSystem>).detail;
      if (detail === "metric" || detail === "imperial") setUnits(detail);
    }
    window.addEventListener("fek-units-change", onUnits);
    return () => window.removeEventListener("fek-units-change", onUnits);
  }, []);
  return units;
}

function ToolLink({
  href,
  className,
  children,
  label,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  label: string;
}) {
  const units = usePreferredUnits();
  return (
    <Link
      href={withPreferredUnits(href, units)}
      className={className}
      aria-label={label}
      title={label}
    >
      {children}
    </Link>
  );
}

/** Inline code highlight for SEO body copy. */
function CodeMark({ children }: { children: React.ReactNode }) {
  return (
    <strong className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-800 dark:bg-spec-panel dark:text-slate-200">
      {children}
    </strong>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8.5 14.5a6 6 0 1 1 0-12 6 6 0 0 1 0 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M13.2 13.2 17 17"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WorkstationSearch() {
  const router = useRouter();
  const units = usePreferredUnits();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const shortcutLabel = useSearchShortcutLabel();

  const hits = useMemo(() => searchWorkstationTools(query, 8), [query]);
  const trimmedQuery = query.trim();
  const noResults = trimmedQuery.length > 0 && hits.length === 0;
  useZeroResultSearchTracking(query, hits.length, "home-search");

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      navigateToHref(router, withPreferredUnits(href, units));
    },
    [router, units],
  );

  const requestCalculator = useCallback(() => {
    if (!trimmedQuery) return;
    trackCalculatorRequested(trimmedQuery, "home-search");
    setOpen(false);
  }, [trimmedQuery]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <label className="sr-only" htmlFor="workstation-search">
        Search calculators and standards
      </label>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <input
        id="workstation-search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (noResults) {
            if (event.key === "Enter") {
              event.preventDefault();
              requestCalculator();
            } else if (event.key === "Escape") {
              setOpen(false);
            }
            return;
          }
          if (!open && hits.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter" && hits[active]) {
            event.preventDefault();
            go(hits[active].href);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search by NPS, ASME Code (e.g. B16.5, B31.3), Component, Torque…"
        className="h-10 w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-14 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-spec-borderStrong dark:bg-spec-bg dark:text-slate-100 dark:placeholder:text-slate-400 md:h-11"
        autoComplete="off"
        role="combobox"
        aria-expanded={open && (hits.length > 0 || noResults)}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center rounded-md border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-600 dark:border-spec-borderStrong dark:bg-spec-panel dark:text-slate-300 sm:inline-flex">
        {shortcutLabel}
      </kbd>
      {open && trimmedQuery ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-spec-border dark:bg-spec-bg"
        >
          {noResults ? (
            <li role="option" aria-selected>
              <button
                type="button"
                onClick={requestCalculator}
                className="flex min-h-[48px] w-full items-center justify-between gap-3 bg-blue-50 px-4 py-2.5 text-left transition-colors dark:bg-spec-accentBg"
              >
                <span>
                  <span className="text-sm font-semibold leading-normal text-slate-800 dark:text-slate-100 md:text-base">
                    Can&apos;t find &apos;{trimmedQuery}&apos;? Click to request
                    this calculator.
                  </span>
                  <span className="mt-0.5 block text-xs leading-normal text-slate-500 dark:text-slate-400">
                    High-priority feature request
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-blue-600 dark:text-spec-accentText">
                  Request
                </span>
              </button>
            </li>
          ) : (
            hits.map((hit, index) => (
              <li key={hit.id} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  title={hit.seoLabel}
                  aria-label={hit.seoLabel}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(hit.href)}
                  className={`flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                    index === active
                      ? "bg-blue-50 dark:bg-spec-accentBg"
                      : "hover:bg-slate-50 dark:hover:bg-spec-panel"
                  }`}
                >
                  <span>
                    <span className="text-sm font-semibold leading-normal text-slate-800 dark:text-slate-100 md:text-base">
                      {hit.title}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs leading-normal text-slate-500 dark:text-slate-400">
                      {hit.domain} · {hit.standard}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium text-blue-600 dark:text-spec-accentText">
                    Open
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function DomainColumn({ domain }: { domain: WorkstationDomain }) {
  const Icon = DOMAIN_ICONS[domain.id] ?? GitCommit;

  return (
    <section
      id={`domain-${domain.id}`}
      aria-labelledby={`domain-heading-${domain.id}`}
      className="scroll-mt-28 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-150 hover:border-blue-300 hover:shadow-md dark:border-spec-border dark:bg-spec-bg dark:hover:border-blue-400"
    >
      <h2
        id={`domain-heading-${domain.id}`}
        className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-50"
      >
        <Icon
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
          strokeWidth={2.25}
        />
        {domain.label}
      </h2>
      <nav aria-label={`${domain.label} calculators`} className="flex-1">
        <ul>
          {domain.tools.map((tool) => (
            <li key={tool.id}>
              <ToolLink
                href={tool.href}
                label={tool.seoLabel}
                className="group flex items-center gap-2 rounded-lg px-0.5 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-spec-panel"
              >
                <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-slate-800 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400 md:text-[15px]">
                  {tool.title}
                </span>
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-right font-mono text-[11px] font-medium text-slate-500 dark:bg-spec-panel dark:text-slate-400">
                  {tool.standard}
                </span>
                <span
                  aria-hidden="true"
                  className="inline-block w-3 shrink-0 text-sm font-medium text-blue-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:text-blue-400"
                >
                  →
                </span>
              </ToolLink>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

/** Always-visible structured engineering knowledge & FAQ section for Home SEO. */
function StandardsSeoSection() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Which codes govern the calculations in FieldEngineersKit?",
      a: "Calculations strictly reference published international engineering standards: ASME B31.3 (Process Piping), ASME B16.5 & B16.47 (Flanges), ASME B16.9 (Butt-Weld Fittings), ASME B16.20 (Gaskets), ASME PCC-1 (Flange Bolting Torque), ISA S75.01 / IEC 60534 (Control Valve Cv), API RP 14E (Piping Erosion Velocity), and ASME B36.10M / B36.19M (Pipe Schedules).",
    },
    {
      q: "Can FieldEngineersKit replace formal CAESAR II or FEA analysis?",
      a: "No. FieldEngineersKit provides deterministic preliminary screening and field engineering verification tools. While equations precisely follow code rules (e.g., ASME B31.3 ¶304.1.2), they do not replace formal 3D computer-aided pipe stress analysis (e.g., CAESAR II, AutoPIPE) or PE-stamped engineering deliverables.",
    },
    {
      q: "How does the offline PWA mode and Plant Data Bus work?",
      a: "FEK is built as an offline-first Progressive Web App (PWA) with client-side execution. Your confidential plant process pressures and pipe dimensions never leave your browser. Furthermore, common piping parameters (NPS, Schedule, Rating, Material) seamlessly transfer between calculators via URL parameters without repetitive data entry.",
    },
    {
      q: "How are metric and imperial conversions handled?",
      a: "All unit conversions adhere to ISO 80000-1 and NIST SP 811 standards. The global unit toggle converts values in real time (e.g., mm ↔ in, bar ↔ psi, °C ↔ °F, kg/m ↔ lb/ft) while preserving underlying precision for calculations.",
    },
  ];

  return (
    <section
      id="engineering-standards"
      aria-labelledby="standards-heading"
      className="mt-12 border-t border-slate-200/80 px-4 pb-20 pt-10 dark:border-spec-border md:px-6 md:pb-16"
    >
      <div className="mx-auto max-w-6xl space-y-10">
        {/* 1. Header & Architecture Overview */}
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
            Engineering Ecosystem &amp; Verification
          </div>
          <h2
            id="standards-heading"
            className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-3xl"
          >
            Verified Engineering Standards &amp; Calculation Core
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
            FieldEngineersKit replaces error-prone spreadsheets with deterministic, code-audited calculation workstations designed specifically for process piping, mechanical reliability, and plant procurement.
          </p>
        </div>

        {/* 2. Structured Domain Cards (4 Pillars) */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-spec-border dark:bg-spec-panel">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-black text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Piping &amp; Pressure Design
            </h3>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              ASME B31.3 wall thickness screening (¶304.1.2) with mill tolerances (-12.5%), corrosion allowance, and temperature derated allowable stresses.
            </p>
            <div className="mt-3 font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              ASME B31.3 · B36.10M
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-spec-border dark:bg-spec-panel">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-black text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Flanges, Fittings &amp; Bolting
            </h3>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Class 150–2500# dimensions, ASME B16.20 SWG/RTJ gaskets, B16.9 butt-weld envelopes, and ASME PCC-1 target torque &amp; bolt tensioning.
            </p>
            <div className="mt-3 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              B16.5 · B16.9 · PCC-1
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-spec-border dark:bg-spec-panel">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 font-black text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Valves &amp; Hydraulics
            </h3>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              ISA S75.01 / IEC 60534 control valve Cv sizing for liquids/gases, Darcy-Weisbach pressure drop, and API RP 14E erosion velocity limits.
            </p>
            <div className="mt-3 font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              ISA 75.01 · API 14E · B16.10
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-spec-border dark:bg-spec-panel">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 font-black text-sm">
              04
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Hydrotest &amp; Plant MTO
            </h3>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              ASME B31.3 / API 570 1.5× hydro test pressure checks, ASME UG-34 blank plate sizing, and multi-shape metal weight &amp; procurement estimators.
            </p>
            <div className="mt-3 font-mono text-[11px] font-semibold text-purple-600 dark:text-purple-400">
              API 570 · UG-34 · ISO 80000-1
            </div>
          </div>
        </div>

        {/* 3. Standards Matrix Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-spec-border dark:bg-spec-panel">
          <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 dark:border-spec-border dark:bg-slate-800/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              International Engineering Code Coverage Matrix
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-spec-panel dark:text-slate-400">
                <tr className="border-b border-slate-200 dark:border-spec-border">
                  <th className="px-5 py-3 font-semibold">Standard Code</th>
                  <th className="px-5 py-3 font-semibold">Governing Subject</th>
                  <th className="px-5 py-3 font-semibold">Key Equation / Parameter Basis</th>
                  <th className="px-5 py-3 font-semibold">Target Tool</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-spec-border/60">
                <tr>
                  <td className="px-5 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">ASME B31.3</td>
                  <td className="px-5 py-2.5">Process Piping Code</td>
                  <td className="px-5 py-2.5 font-mono">t = (P·D) / [2(S·E + P·Y)] + c</td>
                  <td className="px-5 py-2.5 font-medium">Pipe Wall Thickness</td>
                </tr>
                <tr className="bg-slate-50/40 dark:bg-slate-800/20">
                  <td className="px-5 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">ASME B16.5</td>
                  <td className="px-5 py-2.5">Pipe Flanges &amp; Fittings</td>
                  <td className="px-5 py-2.5">PCD, Bolt Circle, Hub Bore, RF Dimensions</td>
                  <td className="px-5 py-2.5 font-medium">Flange Dimension &amp; Weight</td>
                </tr>
                <tr>
                  <td className="px-5 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">ASME B16.9</td>
                  <td className="px-5 py-2.5">Wrought Butt-Welding Fittings</td>
                  <td className="px-5 py-2.5">Center-to-End (C), Take-off envelopes</td>
                  <td className="px-5 py-2.5 font-medium">BW Fitting Dimensions</td>
                </tr>
                <tr className="bg-slate-50/40 dark:bg-slate-800/20">
                  <td className="px-5 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">ASME PCC-1</td>
                  <td className="px-5 py-2.5">Flanged Joint Assembly</td>
                  <td className="px-5 py-2.5 font-mono">T = (K·F_p·d) / 1000 (Target Stress)</td>
                  <td className="px-5 py-2.5 font-medium">Bolt Torque &amp; Tensioning</td>
                </tr>
                <tr>
                  <td className="px-5 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">ISA S75.01</td>
                  <td className="px-5 py-2.5">Flow Equations for Sizing Valves</td>
                  <td className="px-5 py-2.5 font-mono">Cv = Q · √(SG / ΔP) [Liquid / Gas expansion]</td>
                  <td className="px-5 py-2.5 font-medium">Valve Cv Sizing</td>
                </tr>
                <tr className="bg-slate-50/40 dark:bg-slate-800/20">
                  <td className="px-5 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">API RP 14E</td>
                  <td className="px-5 py-2.5">Offshore Piping Erosion Limits</td>
                  <td className="px-5 py-2.5 font-mono">V_e = C / √ρ (Empirical c-factor)</td>
                  <td className="px-5 py-2.5 font-medium">Flow Velocity &amp; Erosion</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Interactive Engineering FAQ Accordion */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-spec-border dark:bg-spec-panel">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Frequently Asked Questions (Engineering &amp; Platform)
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {faqs.length} Answers
            </span>
          </div>
          <div className="space-y-3">
            {faqs.map((item, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={item.q}
                  className="rounded-lg border border-slate-200/80 transition-colors dark:border-spec-border"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
                  >
                    <span>{item.q}</span>
                    <span className="ml-2 font-mono text-base font-bold text-slate-400">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600 dark:border-spec-border/60 dark:text-slate-300 md:text-sm">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Footer Navigation & Authority Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200/60 bg-blue-50/50 px-6 py-4 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="text-xs text-blue-950 dark:text-blue-200 md:text-sm">
            Need comprehensive formula notes, tolerance tables, or worked examples?
          </div>
          <div className="flex gap-3 text-xs font-bold md:text-sm">
            <Link
              href="/standards"
              className="text-blue-700 hover:underline dark:text-blue-300"
            >
              Standards Index →
            </Link>
            <Link
              href="/about"
              className="text-blue-700 hover:underline dark:text-blue-300"
            >
              Editorial Standards →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function WorkstationHome() {
  usePrefetchCalculators();
  const [filter, setFilter] = useState<string>("all");
  const catalogRef = useRef<HTMLElement>(null);

  const focusDomain = useCallback((domainId: string) => {
    if (!WORKSTATION_DOMAINS.some((domain) => domain.id === domainId)) return;
    setFilter(domainId);
    requestAnimationFrame(() => {
      const el = document.getElementById(`domain-${domainId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash.replace(/^#domain-/, "");
      if (hash && WORKSTATION_DOMAINS.some((domain) => domain.id === hash)) {
        focusDomain(hash);
      }
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);

    function onDomainNav(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string") focusDomain(detail);
    }
    window.addEventListener("fek-domain-nav", onDomainNav);

    return () => {
      window.removeEventListener("hashchange", applyHash);
      window.removeEventListener("fek-domain-nav", onDomainNav);
    };
  }, [focusDomain]);

  const domains =
    filter === "all"
      ? orderedWorkstationDomains()
      : orderedWorkstationDomains().filter((domain) => domain.id === filter);

  function selectDomainTab(tabId: string) {
    setFilter(tabId);
    if (tabId !== "all") {
      window.history.replaceState(null, "", `#domain-${tabId}`);
      requestAnimationFrame(() => {
        document
          .getElementById(`domain-${tabId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      window.history.replaceState(null, "", window.location.pathname);
      catalogRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  return (
    <div className="bg-slate-50 dark:bg-spec-bg">
      {/* 1. Search-focused hero — title, subtitle, search, quick chips only */}
      <section
        aria-labelledby="workstation-heading"
        className="border-b border-slate-200/80 bg-slate-50 px-4 py-6 dark:border-spec-border dark:bg-spec-bg md:px-6"
      >
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-stretch lg:gap-5">
            <div className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200/80 bg-white px-6 py-6 shadow-sm dark:border-spec-border dark:bg-spec-bg">
              <h1
                id="workstation-heading"
                className="mb-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-4xl"
              >
                Plant Engineering & Procurement Workstation
              </h1>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400 md:text-base">
                Live ASME / API calculators for piping, flanges, valves, gaskets,
                torque, and plant procurement — searchable by code and NPS.
              </p>
              <WorkstationSearch />
              <nav
                aria-label="Frequently used calculators"
                className="mt-4 flex flex-wrap gap-2"
              >
                {WORKSTATION_SHORTCUTS.map((chip) => (
                  <ToolLink
                    key={chip.id}
                    href={chip.href}
                    label={chip.seoLabel}
                    className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:bg-blue-50 hover:text-blue-600 dark:bg-spec-panel dark:text-slate-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 md:text-sm"
                  >
                    {chip.label}
                  </ToolLink>
                ))}
              </nav>
            </div>
            <aside
              data-ad-slot="workstation"
              aria-label="B2B sponsorship"
              className="flex h-full min-h-[120px] flex-col justify-center rounded-xl border border-dashed border-slate-200/80 bg-white px-4 py-4 shadow-sm dark:border-spec-border dark:bg-spec-bg"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                B2B sponsor
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                Spec tables, MRO catalogs, and plant software — reach field
                engineers here.
              </p>
              <Link
                href="/advertise"
                className="mt-3 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400"
              >
                Advertise →
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {/* 2. Standalone category filter + high-density card grid */}
      <section
        ref={catalogRef}
        aria-labelledby="catalog-heading"
        className="px-4 py-6 md:px-6 md:py-8"
      >
        <div className="mx-auto w-full max-w-7xl">
          <h2 id="catalog-heading" className="sr-only">
            Live engineering calculator catalog
          </h2>
          <div
            role="tablist"
            aria-label="Filter by engineering domain"
            className="mb-5 flex flex-wrap gap-2 overflow-x-auto pb-1"
          >
            {WORKSTATION_DOMAIN_TABS.map((tab) => {
              const selected = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => selectDomainTab(tab.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs transition-all md:text-sm ${
                    selected
                      ? "bg-blue-600 font-bold text-white shadow-sm"
                      : "bg-slate-100 font-semibold text-slate-700 hover:bg-slate-200 dark:bg-spec-panel dark:text-slate-300 dark:hover:bg-spec-border"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4">
            {domains.map((domain) => (
              <DomainColumn key={domain.id} domain={domain} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. Subordinate SEO + standards context */}
      <StandardsSeoSection />
    </div>
  );
}
