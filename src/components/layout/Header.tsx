"use client";

import Image from "next/image";
import Link from "@/components/ui/AppLink";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSearch } from "@/components/search/SearchProvider";
import ThemeToggle from "@/components/ui/ThemeToggle";
import UnitSwitcher from "@/components/layout/UnitSwitcher";
import { QuickUnitButton } from "@/components/layout/QuickUnitProvider";
import { getVisibleCategories } from "@/lib/menu/config";
import { useSearchShortcutLabel } from "@/hooks/useSearchShortcutLabel";

const utilityPill =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-200 dark:border-spec-border dark:bg-spec-panel dark:text-slate-200 dark:hover:bg-spec-border md:text-sm";

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { open } = useSearch();
  const visibleCategories = getVisibleCategories();
  const isHome = pathname === "/";
  const shortcutLabel = useSearchShortcutLabel();

  if (pathname.startsWith("/admin") || pathname.startsWith("/calculator")) {
    return null;
  }

  return (
    <header className="relative sticky top-0 z-20 border-b border-slate-200/80 bg-white dark:border-spec-border dark:bg-spec-bg">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-4 md:gap-3 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-lg"
          onClick={() => setMenuOpen(false)}
        >
          <Image
            src="/icon.svg"
            alt="FieldEngineersKit Logo"
            width={22}
            height={22}
            className="h-5 w-5 rounded object-contain"
            priority
          />
          FieldEngineersKit
        </Link>

        {!isHome ? (
          <nav className="ml-3 hidden items-center gap-2.5 text-sm font-medium text-slate-700 lg:flex">
            {visibleCategories.map((category) => (
              <Link
                key={category.id}
                href={category.href}
                className={`rounded-md px-1.5 py-1 transition-colors hover:text-slate-900 dark:hover:text-slate-100 ${
                  pathname.startsWith(category.href)
                    ? "text-slate-900 dark:text-slate-50"
                    : "dark:text-slate-300"
                }`}
              >
                {category.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-1.5 md:gap-2">
          {!isHome ? (
            <button
              type="button"
              onClick={open}
              className={`hidden max-w-[240px] lg:inline-flex ${utilityPill}`}
            >
              Search tools…
              <kbd className="ml-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600 dark:border-spec-borderStrong dark:bg-spec-bg dark:text-slate-300">
                {shortcutLabel}
              </kbd>
            </button>
          ) : null}
          <UnitSwitcher alwaysShow />
          <QuickUnitButton />
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-400 sm:inline-flex">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            Offline ready
          </div>
          <span
            className="h-2 w-2 rounded-full border border-emerald-200 bg-emerald-600 sm:hidden"
            title="Offline ready / PWA"
          />
          <Link
            href="/advertise"
            className="hidden text-sm font-medium text-slate-700 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 md:inline"
          >
            Advertise
          </Link>
          <ThemeToggle className="inline-flex" />
          {!isHome ? (
            <button
              type="button"
              onClick={open}
              className={`lg:hidden ${utilityPill} min-h-8 min-w-8 justify-center px-2`}
              aria-label="Open search"
            >
              ⌕
            </button>
          ) : null}
          {!isHome ? (
            <button
              type="button"
              className="inline-flex min-h-8 min-w-8 items-center justify-center text-sm font-medium text-slate-700 md:hidden"
              aria-expanded={menuOpen}
              aria-controls="home-nav"
              onClick={() => setMenuOpen((value) => !value)}
            >
              ☰
            </button>
          ) : null}
        </div>
      </div>

      {menuOpen && !isHome ? (
        <div
          id="home-nav"
          className="absolute left-0 right-0 top-full border-b border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-spec-border dark:bg-spec-bg md:hidden"
        >
          <div className="mx-auto flex max-w-[1600px] flex-col gap-1 lg:px-10">
            {visibleCategories.map((category) => (
              <Link
                key={category.id}
                href={category.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                {category.label}
              </Link>
            ))}
            <Link
              href="/advertise"
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              Advertise
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
