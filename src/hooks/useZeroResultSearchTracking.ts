"use client";

import { useEffect, useRef } from "react";
import { trackSearchNoResults } from "@/lib/analytics/events";

const DEBOUNCE_MS = 1500;
const MIN_QUERY_LENGTH = 2;

/**
 * Fires search_no_results after the query stays at 0 matches for 1.5s.
 * Intermediate keystrokes are ignored via debounce + last-fired dedupe.
 */
export function useZeroResultSearchTracking(
  query: string,
  resultCount: number,
  source: string,
) {
  const lastLogged = useRef("");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH || resultCount > 0) {
      if (resultCount > 0) lastLogged.current = "";
      return;
    }

    const timer = window.setTimeout(() => {
      if (lastLogged.current === trimmed) return;
      lastLogged.current = trimmed;
      trackSearchNoResults(trimmed, source);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, resultCount, source]);
}
