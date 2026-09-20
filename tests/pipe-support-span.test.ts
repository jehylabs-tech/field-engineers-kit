import { describe, expect, it } from "vitest";
import {
  calculatePipeSupportSpan,
  computePipeSupportSpan,
  DEFAULT_PIPE_SUPPORT_SPAN_INPUTS,
} from "@/lib/calculators/engines/pipe-support-span";
import {
  buildSpecSeoCopy,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";

function expectNoPoison(out: ReturnType<typeof calculatePipeSupportSpan>) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("pipe-support-span", () => {
  it("default NPS 4 Sch 40 water — chart governs layout at 4.27 m", () => {
    const c = computePipeSupportSpan(DEFAULT_PIPE_SUPPORT_SPAN_INPUTS);
    expect(c.invalid).toBe(false);
    expect(c.odMm).toBeCloseTo(114.3, 1);
    expect(c.idMm).toBeCloseTo(102.26, 2);
    expect(c.wTotalKgM).toBeCloseTo(24.28, 1);
    expect(c.beamGoverning).toBe("deflection");
    expect(c.lBeamM).toBeCloseTo(7.05, 1);
    expect(c.lChartM).toBeCloseTo(4.27, 2);
    expect(c.lRecommendM).toBeCloseTo(4.27, 2);
    expect(c.governing).toBe("chart");
    const out = calculatePipeSupportSpan(DEFAULT_PIPE_SUPPORT_SPAN_INPUTS);
    expect(out.heroValue).toMatch(/4\.2\d m/);
    expect(out.heroStatus).toMatch(/Chart/i);
    expect(out.callouts).toHaveLength(1);
    expect(out.callouts?.[0].tone).toBe("warn");
    expect(out.rows).toHaveLength(5);
    expect(out.rows.some((r) => /L_beam/i.test(r.label))).toBe(false);
    expect(out.rows.some((r) => /w_pipe$/i.test(r.label))).toBe(false);
    expect(out.rows.some((r) => /Z · E/i.test(r.label))).toBe(false);
    expect(out.heroBadges?.some((b) => b.label === "L_beam")).toBe(true);
    expectNoPoison(out);
  });

  it("2inch-sch40-water duty", () => {
    const c = computePipeSupportSpan({
      ...DEFAULT_PIPE_SUPPORT_SPAN_INPUTS,
      nps: "2",
      schedule: "40",
      fluidType: "water",
    });
    expect(c.wTotalKgM).toBeCloseTo(7.61, 1);
    expect(c.lBeamM).toBeCloseTo(5.19, 1);
    expect(c.lChartM).toBeCloseTo(3.05, 2);
    expect(c.lRecommendM).toBeCloseTo(3.05, 2);
    expect(c.governing).toBe("chart");
  });

  it("6inch-sch40-water duty", () => {
    const c = computePipeSupportSpan({
      ...DEFAULT_PIPE_SUPPORT_SPAN_INPUTS,
      nps: "6",
      schedule: "40",
      fluidType: "water",
    });
    expect(c.wTotalKgM).toBeCloseTo(46.9, 1);
    expect(c.lBeamM).toBeCloseTo(8.4, 1);
    expect(c.lRecommendM).toBeCloseTo(5.18, 2);
  });

  it("8inch-sch40-gas duty", () => {
    const c = computePipeSupportSpan({
      ...DEFAULT_PIPE_SUPPORT_SPAN_INPUTS,
      nps: "8",
      schedule: "40",
      fluidType: "gas",
    });
    expect(c.beamGoverning).toBe("deflection");
    expect(c.lBeamM).toBeCloseTo(10.9, 1);
    expect(c.lChartM).toBeCloseTo(7.32, 2);
    expect(c.lRecommendM).toBeCloseTo(7.32, 2);
  });

  it("scales stainless pipe weight above B36 CS table", () => {
    const cs = computePipeSupportSpan(DEFAULT_PIPE_SUPPORT_SPAN_INPUTS);
    const ss = computePipeSupportSpan({
      ...DEFAULT_PIPE_SUPPORT_SPAN_INPUTS,
      material: "stainless_304",
    });
    expect(ss.wPipeKgM / cs.wPipeKgM).toBeCloseTo(8000 / 7850, 3);
    expect(ss.lBeamM).toBeLessThan(cs.lBeamM);
  });

  it("imperial 0.5 in deflection matches metric 12.7 mm", () => {
    const metric = computePipeSupportSpan(DEFAULT_PIPE_SUPPORT_SPAN_INPUTS);
    const imperial = computePipeSupportSpan({
      ...DEFAULT_PIPE_SUPPORT_SPAN_INPUTS,
      unitSystem: "imperial",
      allowableDeflection: 0.5,
      insulationThickness: 0,
    });
    expect(imperial.lRecommendM).toBeCloseTo(metric.lRecommendM, 2);
    expect(imperial.lBeamM).toBeCloseTo(metric.lBeamM, 2);
  });

  it("wires pSEO routes and SEO copy", () => {
    expect(SLUG_TO_CALCULATOR_TYPE["pipe-support-span"]).toBe(
      "pipe-support-span",
    );
    const routes = listSpecRoutesForSlug("pipe-support-span");
    expect(routes.some((r) => r.spec === "4inch-sch40-water")).toBe(true);
    const hit = resolveSpecRoute("pipe-support-span", "4inch-sch40-water");
    expect(hit?.query.fluidType).toBe("water");
    expect(hit?.query.nps).toBe("4");
    const seo = buildSpecSeoCopy(
      "Pipe Support Span",
      "pipe-support-span",
      routes[0],
      "ASME B31.3 / B31.1 chart pipe support span calculator.",
    );
    expect(seo.title).toMatch(/Pipe Support Span/i);
    expect(seo.description.length).toBeGreaterThan(20);
  });
});
