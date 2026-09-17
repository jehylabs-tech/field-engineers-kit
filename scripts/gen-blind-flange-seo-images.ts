/**
 * Generate blind-flange SEO chart SVGs via the shared TS module.
 * Run: npx --yes tsx --tsconfig tsconfig.json scripts/gen-blind-flange-seo-images.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildBlindFlangeSeoSvg,
  listBlindFlangeSeoChartSpecs,
} from "../src/lib/calculators/blind-flange-seo-chart";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(
  __dirname,
  "..",
  "public",
  "images",
  "diagrams",
  "blind-flange",
);

mkdirSync(OUT_DIR, { recursive: true });
let n = 0;
for (const spec of listBlindFlangeSeoChartSpecs()) {
  const svg = buildBlindFlangeSeoSvg(spec.mode, spec.unitSystem);
  writeFileSync(join(OUT_DIR, spec.fileName), svg, "utf8");
  n += 1;
  console.log("wrote", spec.fileName);
}
console.log(`Wrote ${n} blind-flange SEO SVGs → ${OUT_DIR}`);
