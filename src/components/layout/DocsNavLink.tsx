"use client";

import Link from "@/components/ui/AppLink";
import {
  DOCS_BASE_PATH,
  DOCS_NAV_LABEL,
  isDocsPath,
} from "@/lib/docs/constants";
import { usePathname } from "next/navigation";

type DocsNavLinkProps = {
  className?: string;
  activeClassName?: string;
};

export default function DocsNavLink({
  className = "text-sm font-medium text-slate-700 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400",
  activeClassName = "text-blue-600 dark:text-blue-400",
}: DocsNavLinkProps) {
  const pathname = usePathname();
  const active = isDocsPath(pathname);

  return (
    <Link
      href={DOCS_BASE_PATH}
      className={`${className} ${active ? activeClassName : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {DOCS_NAV_LABEL}
    </Link>
  );
}
