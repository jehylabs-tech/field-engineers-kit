/**
 * Crawlable bolt-sequence SEO chart metadata + SVG poster builder.
 * Static files live under public/images/diagrams/bolt-sequence/.
 */

import { layoutBoltCircle } from "@/lib/calculators/bolt-circle-layout";
import {
  BOLT_SEQUENCE_COUNTS,
  formatSequenceArrowText,
  generateBoltSequence,
  sequenceTitle,
  type BoltSequencePattern,
} from "@/lib/calculators/engines/bolt-sequence";
import { canonicalUrl } from "@/lib/site";

/** First-wave counts prioritized for image-search demand. */
export const BOLT_SEQUENCE_SEO_COUNTS = [8, 12, 16, 20, 24] as const;

export const BOLT_SEQUENCE_SEO_PATTERNS: BoltSequencePattern[] = [
  "star",
  "circular",
];

export const BOLT_SEQUENCE_SEO_SLUG = "flange-bolt-tightening-sequence";

export type BoltSequenceSeoChartSpec = {
  boltCount: number;
  pattern: BoltSequencePattern;
  fileName: string;
  /** Site-relative path starting with / */
  src: string;
  absoluteUrl: string;
  alt: string;
  caption: string;
  title: string;
  sequence: number[];
  sequenceText: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function boltSequenceSeoFileName(
  boltCount: number,
  pattern: BoltSequencePattern,
): string {
  return `flange-bolt-tightening-sequence-${boltCount}-bolt-${pattern}-asme-pcc-1.svg`;
}

export function boltSequenceSeoSrc(
  boltCount: number,
  pattern: BoltSequencePattern,
): string {
  return `/images/diagrams/bolt-sequence/${boltSequenceSeoFileName(boltCount, pattern)}`;
}

export function parseBoltSequenceSpecSegment(
  spec: string | undefined,
): { boltCount: number; pattern: BoltSequencePattern } | null {
  if (!spec) return null;
  const m = /^(\d+)-bolt-(star|circular)$/i.exec(spec.trim());
  if (!m) return null;
  const boltCount = Number(m[1]);
  if (!Number.isFinite(boltCount) || boltCount < 4) return null;
  return {
    boltCount,
    pattern: m[2].toLowerCase() === "circular" ? "circular" : "star",
  };
}

export function getBoltSequenceSeoChartSpec(
  boltCount: number,
  pattern: BoltSequencePattern,
): BoltSequenceSeoChartSpec | null {
  const sequence = generateBoltSequence(boltCount, pattern);
  if (sequence.length !== boltCount) return null;

  const title = sequenceTitle(boltCount, pattern);
  const sequenceText = formatSequenceArrowText(sequence);
  const patternLabel =
    pattern === "circular"
      ? "circular"
      : boltCount === 4
        ? "cross"
        : "star";
  const fileName = boltSequenceSeoFileName(boltCount, pattern);
  const src = boltSequenceSeoSrc(boltCount, pattern);

  return {
    boltCount,
    pattern,
    fileName,
    src,
    absoluteUrl: canonicalUrl(src),
    alt: `${boltCount} bolt flange ${patternLabel} tightening sequence diagram according to ASME PCC-1 — FieldEngineersKit`,
    caption: `Fig. ${boltCount}-bolt ${patternLabel} pattern tightening sequence (ASME PCC-1 screening). Order: ${sequenceText}.`,
    title,
    sequence,
    sequenceText,
  };
}

/** Specs to generate / sitemap: all even B16 counts × both patterns. */
export function listBoltSequenceSeoChartSpecs(): BoltSequenceSeoChartSpec[] {
  const out: BoltSequenceSeoChartSpec[] = [];
  for (const boltCount of BOLT_SEQUENCE_COUNTS) {
    for (const pattern of BOLT_SEQUENCE_SEO_PATTERNS) {
      const spec = getBoltSequenceSeoChartSpec(boltCount, pattern);
      if (spec) out.push(spec);
    }
  }
  return out;
}

/**
 * Poster SVG: title + circle with path lines + sequence strip + site credit.
 * Matches FEK blues; not an interactive UI screenshot.
 */
export function buildBoltSequenceSeoSvg(
  boltCount: number,
  pattern: BoltSequencePattern,
): string | null {
  const meta = getBoltSequenceSeoChartSpec(boltCount, pattern);
  if (!meta) return null;

  const W = 1200;
  const H = 1400;
  const cx = 600;
  const cy = 620;
  const scale = 8.2; // viewBox 0–100 → px
  const { boltR, fontSize, ringR, guideR, strokeW } = layoutBoltCircle(boltCount);

  const positions = Array.from({ length: boltCount }, (_, index) => {
    const angle = (index / boltCount) * 2 * Math.PI - Math.PI / 2;
    return {
      number: index + 1,
      x: cx + ringR * scale * Math.cos(angle),
      y: cy + ringR * scale * Math.sin(angle),
    };
  });
  const byNum = new Map(positions.map((p) => [p.number, p]));

  const pathParts: string[] = [];
  for (let i = 0; i < meta.sequence.length - 1; i += 1) {
    const a = byNum.get(meta.sequence[i]);
    const b = byNum.get(meta.sequence[i + 1]);
    if (!a || !b) continue;
    const opacity = pattern === "star" ? 0.22 + 0.35 * (1 - i / meta.sequence.length) : 0.28;
    pathParts.push(
      `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#3D5AFE" stroke-width="${pattern === "star" ? 3.2 : 2.4}" stroke-opacity="${opacity.toFixed(2)}" stroke-linecap="round"/>`,
    );
  }

  const bolts = positions
    .map((bolt) => {
      const r = boltR * scale;
      const fs = Math.max(14, fontSize * scale * 0.95);
      return [
        `<circle cx="${bolt.x.toFixed(1)}" cy="${bolt.y.toFixed(1)}" r="${r.toFixed(1)}" fill="#EEF2FF" stroke="#3D5AFE" stroke-width="${Math.max(2, strokeW * scale * 0.55).toFixed(1)}"/>`,
        `<text x="${bolt.x.toFixed(1)}" y="${(bolt.y + fs * 0.35).toFixed(1)}" text-anchor="middle" font-size="${fs.toFixed(1)}" font-weight="700" fill="#1A1D21" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">${bolt.number}</text>`,
      ].join("");
    })
    .join("");

  const seqShort =
    meta.sequenceText.length > 72
      ? `${meta.sequence.slice(0, 12).join(" → ")} → …`
      : meta.sequenceText;

  const subtitle =
    pattern === "circular"
      ? "Circular / sequential pass · ASME PCC-1 screening"
      : "Star / cross pattern · ASME PCC-1 screening";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(meta.alt)}">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <rect x="48" y="48" width="${W - 96}" height="${H - 96}" rx="28" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2"/>
  <text x="84" y="120" font-size="42" font-weight="800" fill="#0F172A" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${escapeXml(meta.title)}</text>
  <text x="84" y="168" font-size="22" font-weight="500" fill="#64748B" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${escapeXml(subtitle)}</text>
  <circle cx="${cx}" cy="${cy}" r="${(guideR * scale).toFixed(1)}" fill="none" stroke="#CBD5E1" stroke-width="3"/>
  ${pathParts.join("\n  ")}
  ${bolts}
  <rect x="84" y="1120" width="${W - 168}" height="120" rx="16" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="2"/>
  <text x="108" y="1168" font-size="20" font-weight="700" fill="#312E81" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Sequence</text>
  <text x="108" y="1210" font-size="22" font-weight="600" fill="#1E3A8A" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">${escapeXml(seqShort)}</text>
  <text x="${W - 84}" y="${H - 72}" text-anchor="end" font-size="18" font-weight="600" fill="#94A3B8" font-family="system-ui, -apple-system, Segoe UI, sans-serif">fieldengineerskit.com</text>
</svg>
`;
}
