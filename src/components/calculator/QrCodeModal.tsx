"use client";

import { QRCodeSVG } from "qrcode.react";

type QrCodeModalProps = {
  url: string;
  onClose: () => void;
};

export default function QrCodeModal({ url, onClose }: QrCodeModalProps) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4">
      <button
        type="button"
        aria-label="Close QR modal"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-[111] w-full max-w-sm rounded-xl border border-spec-border bg-spec-bg p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-spec-text">Share QR Code</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-spec-text3 hover:bg-spec-panel"
          >
            Close
          </button>
        </div>

        <div className="flex justify-center rounded-lg border border-spec-border bg-spec-panel p-4">
          <QRCodeSVG value={url} size={192} level="M" includeMargin />
        </div>

        <p className="mt-4 break-all font-mono text-sm text-spec-text2 md:text-base">
          {url}
        </p>
      </div>
    </div>
  );
}
