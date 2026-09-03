"use client";

import Image from "next/image";
import Link from "@/components/ui/AppLink";
import DocsNavLink from "@/components/layout/DocsNavLink";
import CleanZoneFlag from "@/components/calculator/CleanZoneFlag";
import ThemeToggle from "@/components/ui/ThemeToggle";
import UnitSwitcher from "@/components/layout/UnitSwitcher";
import { QuickUnitButton } from "@/components/layout/QuickUnitProvider";
import { useSearch } from "@/components/search/SearchProvider";
import { useSearchShortcutLabel } from "@/hooks/useSearchShortcutLabel";

export default function SpecHeader({
  onOpenMenu,
}: {
  onOpenMenu?: () => void;
}) {
  const { open } = useSearch();
  const shortcutLabel = useSearchShortcutLabel();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md dark:border-slate-200 dark:bg-slate-900/95">
      <div className="mx-auto flex h-12 w-full items-center gap-2 px-6 md:h-14 md:gap-3">
        {onOpenMenu ? (
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-spec-border bg-spec-panel text-base text-spec-text lg:hidden focus:outline-none focus:ring-2 focus:ring-spec-accent"
            aria-label="Open calculator menu"
          >
            ☰
          </button>
        ) : null}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-base font-semibold tracking-tight text-spec-text"
        >
          <Image
            src="/icon.svg"
            alt="FieldEngineersKit Logo"
            width={20}
            height={20}
            className="h-4 w-4 rounded object-contain"
            priority
          />
          FieldEngineersKit
        </Link>

        <button
          type="button"
          onClick={open}
          className="hidden h-9 max-w-[320px] flex-1 items-center gap-2 rounded-md border border-spec-border bg-spec-panel px-3 text-left text-sm text-spec-text3 md:flex"
        >
          Search tools…
          <kbd className="ml-auto rounded border border-spec-borderStrong bg-spec-bg px-1.5 py-0.5 font-mono text-sm text-spec-text2">
            {shortcutLabel}
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1 md:gap-1.5">
          <UnitSwitcher alwaysShow />
          <QuickUnitButton />
          <div className="hidden items-center gap-1.5 rounded-full bg-spec-successBg px-2.5 py-1 text-sm font-medium text-spec-success sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-spec-success" />
            Offline
          </div>
          <DocsNavLink
            className="text-sm font-medium text-spec-text2 transition-colors hover:text-spec-accent"
            activeClassName="font-semibold text-spec-accent"
          />
          <CleanZoneFlag />
          <ThemeToggle />
          <button
            type="button"
            onClick={open}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-spec-border bg-spec-panel text-base text-spec-text3 md:hidden"
            aria-label="Search"
          >
            ⌕
          </button>
        </div>
      </div>
    </header>
  );
}
