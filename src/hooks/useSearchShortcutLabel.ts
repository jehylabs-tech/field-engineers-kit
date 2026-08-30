"use client";

import { useEffect, useState } from "react";

/** ⌘ on Apple platforms, Ctrl elsewhere (Windows/Linux). */
export function useSearchShortcutLabel(): string {
  const [label, setLabel] = useState("Ctrl+K");

  useEffect(() => {
    const platform =
      typeof navigator !== "undefined"
        ? navigator.platform || navigator.userAgent || ""
        : "";
    const isApple = /Mac|iPhone|iPad|iPod/i.test(platform);
    setLabel(isApple ? "⌘K" : "Ctrl+K");
  }, []);

  return label;
}
