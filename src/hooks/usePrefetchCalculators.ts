"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { prefetchCalculators } from "@/lib/navigation/prefetch-calculators";

/** Warm top calculator routes after home mounts (priority-only in development). */
export function usePrefetchCalculators() {
  const router = useRouter();

  useEffect(() => {
    prefetchCalculators(router);
  }, [router]);
}
