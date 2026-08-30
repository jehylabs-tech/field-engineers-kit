"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ComponentProps,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  useCallback,
} from "react";
import { prefetchCalculatorHref } from "@/lib/navigation/prefetch-calculators";

type AppLinkProps = ComponentProps<typeof Link>;

function hrefToString(href: AppLinkProps["href"]): string | null {
  if (typeof href === "string") return href;
  if (href && typeof href === "object" && "pathname" in href && href.pathname) {
    const search =
      typeof href.search === "string"
        ? href.search.startsWith("?")
          ? href.search
          : `?${href.search}`
        : "";
    return `${href.pathname}${search}`;
  }
  return null;
}

/**
 * Internal links. Calculator routes warm on hover/pointer so clicks skip compile wait.
 * Default Link viewport-prefetch stays off to avoid Turbopack storms on the home grid.
 */
export default function AppLink({
  prefetch = false,
  onMouseEnter,
  onFocus,
  onPointerDown,
  href,
  ...props
}: AppLinkProps) {
  const router = useRouter();

  const warm = useCallback(() => {
    prefetchCalculatorHref(router, hrefToString(href));
  }, [router, href]);

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      warm();
      onMouseEnter?.(event);
    },
    [warm, onMouseEnter],
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLAnchorElement>) => {
      warm();
      onFocus?.(event);
    },
    [warm, onFocus],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLAnchorElement>) => {
      warm();
      onPointerDown?.(event);
    },
    [warm, onPointerDown],
  );

  return (
    <Link
      prefetch={prefetch}
      href={href}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      onPointerDown={handlePointerDown}
      {...props}
    />
  );
}
