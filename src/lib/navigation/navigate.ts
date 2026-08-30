"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function navigateToHref(router: AppRouterInstance, href: string) {
  router.push(href);
}
