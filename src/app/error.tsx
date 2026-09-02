"use client";

import Link from "@/components/ui/AppLink";
import { useEffect } from "react";

function isRecoverableClientError(error: Error) {
  const message = `${error.name} ${error.message}`;
  return (
    /ChunkLoadError|Loading chunk|Failed to fetch|ReadableStream|Invalid state|Connection closed/i.test(
      message,
    ) || /digest/i.test(error.message)
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // HMR / aborted RSC streams leave stale chunks — one hard reload recovers.
    if (typeof window === "undefined") return;
    if (!isRecoverableClientError(error)) return;
    const key = "fek-recover-reload";
    const last = Number(sessionStorage.getItem(key) ?? "0");
    if (Date.now() - last < 15_000) return;
    sessionStorage.setItem(key, String(Date.now()));
    window.location.reload();
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <p className="text-sm font-medium uppercase tracking-wide text-spec-danger">
        Temporary error
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-spec-text">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-spec-text2">
        A brief load interrupt occurred (common during local hot-reload). Try
        again, or return home.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            reset();
            window.location.reload();
          }}
          className="rounded-md bg-spec-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-spec-accentText"
        >
          Reload page
        </button>
        <Link
          href="/"
          className="rounded-md border border-spec-borderStrong bg-white px-5 py-2.5 text-sm font-medium text-spec-text hover:bg-spec-panel"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
