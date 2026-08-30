"use client";

import { useEffect } from "react";

/**
 * Recovers from stale Turbopack/HMR chunk failures that surface as
 * "Application error: a client-side exception has occurred".
 */
export default function ChunkErrorRecovery() {
  useEffect(() => {
    function recover() {
      const key = "fek-chunk-reload";
      const last = Number(sessionStorage.getItem(key) ?? "0");
      if (Date.now() - last < 15_000) return;
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }

    function onError(event: ErrorEvent) {
      const msg = String(event.message ?? event.error?.message ?? "");
      if (
        /ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/i.test(
          msg,
        )
      ) {
        recover();
      }
    }

    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const msg =
        typeof reason === "string"
          ? reason
          : String(reason?.message ?? reason ?? "");
      if (
        /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|ReadableStream is already closed/i.test(
          msg,
        )
      ) {
        event.preventDefault();
        recover();
      }
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
