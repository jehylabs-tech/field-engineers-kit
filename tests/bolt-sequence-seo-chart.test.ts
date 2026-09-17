import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateStarSequence } from "@/lib/calculators/engines/bolt-sequence";
import {
  buildBoltSequenceSeoSvg,
  getBoltSequenceSeoChartSpec,
  listBoltSequenceSeoChartSpecs,
  parseBoltSequenceSpecSegment,
} from "@/lib/calculators/bolt-sequence-seo-chart";

describe("bolt-sequence SEO charts", () => {
  it("parses Pattern B spec segments", () => {
    expect(parseBoltSequenceSpecSegment("8-bolt-star")).toEqual({
      boltCount: 8,
      pattern: "star",
    });
    expect(parseBoltSequenceSpecSegment("24-bolt-circular")).toEqual({
      boltCount: 24,
      pattern: "circular",
    });
  });

  it("8-bolt star chart matches engine sequence", () => {
    const meta = getBoltSequenceSeoChartSpec(8, "star");
    expect(meta).not.toBeNull();
    expect(meta!.sequence).toEqual(generateStarSequence(8));
    expect(meta!.src).toContain(
      "flange-bolt-tightening-sequence-8-bolt-star-asme-pcc-1.svg",
    );
    expect(meta!.alt).toMatch(/8 bolt/i);
    expect(meta!.caption).toMatch(/1 → 5 → 3 → 7/);
  });

  it("builds SVG with title, path, and credit", () => {
    const svg = buildBoltSequenceSeoSvg(8, "star");
    expect(svg).toBeTruthy();
    expect(svg!).toContain("8-Bolt Star Pattern");
    expect(svg!).toContain("fieldengineerskit.com");
    expect(svg!).toContain("<line ");
    expect(svg!).toContain("1 → 5 → 3 → 7");
  });

  it("lists assets and public files exist for priority counts", () => {
    const specs = listBoltSequenceSeoChartSpecs();
    expect(specs.length).toBeGreaterThanOrEqual(20);
    for (const n of [8, 12, 16, 20, 24]) {
      const star = getBoltSequenceSeoChartSpec(n, "star");
      expect(star).not.toBeNull();
      const abs = join(process.cwd(), "public", star!.src.replace(/^\//, ""));
      expect(existsSync(abs)).toBe(true);
    }
  });
});
