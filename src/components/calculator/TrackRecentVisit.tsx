"use client";

import { useEffect } from "react";
import { RECENT_STORAGE_KEY, type RecentCalculatorItem } from "@/lib/home/ui";

type TrackRecentVisitProps = {
  slug: string;
  title: string;
  category: string;
};

export default function TrackRecentVisit({
  slug,
  title,
  category,
}: TrackRecentVisitProps) {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
      const existing = raw ? (JSON.parse(raw) as RecentCalculatorItem[]) : [];
      const next: RecentCalculatorItem[] = [
        {
          slug,
          title,
          category,
          visitedAt: Date.now(),
        },
        ...existing.filter((item) => item.slug !== slug),
      ].slice(0, 8);
      window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }, [slug, title, category]);

  return null;
}
