"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import QrCodeModal from "@/components/calculator/QrCodeModal";
import { useToast } from "@/components/ui/ToastProvider";

export default function UrlShareBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [origin, setOrigin] = useState("");
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = useMemo(() => {
    const query = searchParams.toString();
    const base = origin ? `${origin}${pathname}` : pathname;
    return query ? `${base}?${query}` : base;
  }, [origin, pathname, searchParams]);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    showToast("Link copied with current input values");
  }

  const buttonClass =
    "inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-md border border-spec-borderStrong bg-spec-bg px-2.5 text-sm text-spec-text2 hover:bg-spec-panel md:min-h-11 md:text-base";

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button type="button" onClick={handleCopy} className={buttonClass}>
          <span className="md:hidden">⧉</span>
          <span className="hidden md:inline">⧉ Copy URL</span>
        </button>
        <button
          type="button"
          onClick={() => setShowQr(true)}
          className={buttonClass}
          aria-label="QR code"
        >
          <span className="md:hidden">▦</span>
          <span className="hidden md:inline">▦ QR</span>
        </button>
      </div>

      {showQr ? <QrCodeModal url={url} onClose={() => setShowQr(false)} /> : null}
    </>
  );
}
