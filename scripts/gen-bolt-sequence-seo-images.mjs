/**
 * Generate crawlable bolt-sequence SEO poster SVGs.
 * Run: node scripts/gen-bolt-sequence-seo-images.mjs
 *
 * Sequence math mirrors src/lib/calculators/engines/bolt-sequence.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(
  __dirname,
  "..",
  "public",
  "images",
  "diagrams",
  "bolt-sequence",
);

const COUNTS = [4, 8, 12, 16, 20, 24, 32, 36, 40, 48, 56, 64];
const PATTERNS = ["star", "circular"];

function layoutBoltCircle(n) {
  const pad = 1.25;
  let boltR = Math.max(2.1, Math.min(9, 180 / n));
  let ringR = 50 - boltR - pad;
  const minGap = 1.08;
  const chord = 2 * ringR * Math.sin(Math.PI / n);
  if (chord < 2 * boltR * minGap) {
    boltR = Math.max(2.0, (ringR * Math.sin(Math.PI / n)) / minGap);
    ringR = 50 - boltR - pad;
  }
  const fontSize = Math.max(
    3.0,
    Math.min(boltR * 1.15, Math.min(9, 150 / n)),
  );
  const strokeW = n >= 32 ? 0.75 : n >= 20 ? 1.05 : 1.35;
  const guideR = Math.min(ringR * 0.92, ringR + boltR * 0.2);
  return { boltR, fontSize, ringR, guideR, strokeW };
}

function orderGroupStarts(groupCount) {
  if (groupCount <= 1) return [1];
  if (groupCount === 2) return [1, 2];
  if (groupCount === 3) return [1, 2, 3];
  if (groupCount % 4 === 0) return generateStarSequence(groupCount);
  if (groupCount % 2 === 0) {
    const half = groupCount / 2;
    const out = [];
    for (let i = 1; i <= half; i += 1) out.push(i, i + half);
    return out;
  }
  return Array.from({ length: groupCount }, (_, i) => i + 1);
}

function generateStarSequence(boltCount) {
  if (!Number.isInteger(boltCount) || boltCount < 4 || boltCount % 2 !== 0) {
    return [];
  }
  if (boltCount === 4) return [1, 3, 2, 4];
  if (boltCount % 4 !== 0) {
    const half = boltCount / 2;
    const seq = [];
    for (let i = 1; i <= half; i += 1) seq.push(i, i + half);
    return seq;
  }
  const half = boltCount / 2;
  const quarter = boltCount / 4;
  const starts = orderGroupStarts(quarter);
  const seq = [];
  for (const start of starts) {
    seq.push(start, start + half, start + quarter, start + half + quarter);
  }
  return seq;
}

function generateCircularSequence(boltCount) {
  if (!Number.isInteger(boltCount) || boltCount < 4) return [];
  return Array.from({ length: boltCount }, (_, i) => i + 1);
}

function sequenceTitle(boltCount, pattern) {
  if (pattern === "circular") return `${boltCount}-Bolt Circular Pattern`;
  return boltCount === 4
    ? `${boltCount}-Bolt Cross Pattern`
    : `${boltCount}-Bolt Star Pattern`;
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSvg(boltCount, pattern) {
  const sequence =
    pattern === "circular"
      ? generateCircularSequence(boltCount)
      : generateStarSequence(boltCount);
  if (sequence.length !== boltCount) return null;

  const title = sequenceTitle(boltCount, pattern);
  const sequenceText = sequence.join(" → ");
  const patternLabel =
    pattern === "circular" ? "circular" : boltCount === 4 ? "cross" : "star";
  const alt = `${boltCount} bolt flange ${patternLabel} tightening sequence diagram according to ASME PCC-1 — FieldEngineersKit`;
  const subtitle =
    pattern === "circular"
      ? "Circular / sequential pass · ASME PCC-1 screening"
      : "Star / cross pattern · ASME PCC-1 screening";

  const W = 1200;
  const H = 1400;
  const cx = 600;
  const cy = 620;
  const scale = 8.2;
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

  const pathParts = [];
  for (let i = 0; i < sequence.length - 1; i += 1) {
    const a = byNum.get(sequence[i]);
    const b = byNum.get(sequence[i + 1]);
    if (!a || !b) continue;
    const opacity =
      pattern === "star"
        ? 0.22 + 0.35 * (1 - i / sequence.length)
        : 0.28;
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
    sequenceText.length > 72
      ? `${sequence.slice(0, 12).join(" → ")} → …`
      : sequenceText;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(alt)}">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <rect x="48" y="48" width="${W - 96}" height="${H - 96}" rx="28" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2"/>
  <text x="84" y="120" font-size="42" font-weight="800" fill="#0F172A" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${escapeXml(title)}</text>
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

mkdirSync(OUT_DIR, { recursive: true });
let written = 0;
for (const bolts of COUNTS) {
  for (const pattern of PATTERNS) {
    const svg = buildSvg(bolts, pattern);
    if (!svg) continue;
    const name = `flange-bolt-tightening-sequence-${bolts}-bolt-${pattern}-asme-pcc-1.svg`;
    writeFileSync(join(OUT_DIR, name), svg, "utf8");
    written += 1;
  }
}
console.log(`Wrote ${written} bolt-sequence SEO SVGs → ${OUT_DIR}`);
