import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildBlindFlangeSeoSvg,
  getBlindFlangeSeoChartSpec,
  listBlindFlangeSeoChartSpecs,
} from "@/lib/calculators/blind-flange-seo-chart";

describe("blind-flange SEO charts", () => {
  it("lists 4 mode × unit posters", () => {
    const specs = listBlindFlangeSeoChartSpecs();
    expect(specs).toHaveLength(4);
    expect(specs.map((s) => `${s.mode}:${s.unitSystem}`).sort()).toEqual([
      "ambient:imperial",
      "ambient:metric",
      "hydrotest:imperial",
      "hydrotest:metric",
    ]);
  });

  it("ambient imperial SVG has class headers and credit", () => {
    const svg = buildBlindFlangeSeoSvg("ambient", "imperial");
    expect(svg).toContain("Blind Flange Thickness Chart");
    expect(svg).toContain("#150");
    expect(svg).toContain("#2500");
    expect(svg).toContain("fieldengineerskit.com");
    expect(svg).not.toContain("SELECTED");
    expect(svg).not.toContain("REC");
  });

  it("hydrotest metric SVG has plate rows without user highlight", () => {
    const svg = buildBlindFlangeSeoSvg("hydrotest", "metric");
    expect(svg).toContain("Hydrotest Plate Capability");
    expect(svg).toContain("25 mm");
    expect(svg).not.toContain("REC");
    expect(svg).not.toContain("Current Input");
  });

  it("public SVG files exist", () => {
    for (const spec of listBlindFlangeSeoChartSpecs()) {
      const abs = join(process.cwd(), "public", spec.src.replace(/^\//, ""));
      expect(existsSync(abs), abs).toBe(true);
      expect(getBlindFlangeSeoChartSpec(spec.mode, spec.unitSystem).alt).toMatch(
        /blind flange/i,
      );
    }
  });
});
