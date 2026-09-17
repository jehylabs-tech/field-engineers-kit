import { describe, expect, it } from "vitest";
import {
  calculatePipeSlope,
  computePipeSlope,
  DEFAULT_PIPE_SLOPE_INPUTS,
  DEFAULT_PIPE_SLOPE_INPUTS_METRIC,
  ipcMinSlopeInPerFt,
} from "@/lib/calculators/engines/pipe-slope-calculator";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";

function expectNoPoison(out: ReturnType<typeof calculatePipeSlope>) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("pipe-slope-calculator", () => {
  it("defaults ≈ 2.08% (1/4 in/ft) Pass for 4 in · 10 ft · 2.5 in", () => {
    const c = computePipeSlope(DEFAULT_PIPE_SLOPE_INPUTS);
    expect(c.invalid).toBe(false);
    expect(c.slopePercent).toBeCloseTo(2.0833, 2);
    expect(c.slopeInPerFt).toBeCloseTo(0.25, 3);
    expect(c.compliant).toBe(true);
    const out = calculatePipeSlope(DEFAULT_PIPE_SLOPE_INPUTS);
    expect(out.heroValue).toMatch(/2\.08%/);
    expect(out.heroStatus).toBe("Pass");
    expect(out.summary.some((r) => /IPC min/i.test(r.label))).toBe(true);
    expect(out.callouts?.some((x) => /Manning/i.test(x.body))).toBe(false);
    expectNoPoison(out);
  });

  it("matches pSEO imperial / metric hero duties", () => {
    const four = computePipeSlope({
      unitSystem: "imperial",
      pipeNps: "4",
      rise: 2.5,
      run: 10,
    });
    expect(four.slopePercent).toBeCloseTo(2.08, 1);
    expect(four.compliant).toBe(true);

    const six = computePipeSlope({
      unitSystem: "imperial",
      pipeNps: "6",
      rise: 1.25,
      run: 10,
    });
    expect(six.slopePercent).toBeCloseTo(1.04, 1);
    expect(six.slopeInPerFt).toBeCloseTo(0.125, 3);
    expect(six.compliant).toBe(true);

    const m100 = computePipeSlope(DEFAULT_PIPE_SLOPE_INPUTS_METRIC);
    expect(m100.slopePercent).toBeCloseTo(2.0, 1);
    expect(m100.slopeMmPerM).toBeCloseTo(20, 0);

    const m150 = computePipeSlope({
      unitSystem: "metric",
      pipeNps: "6",
      rise: 30,
      run: 3,
    });
    expect(m150.slopePercent).toBeCloseTo(1.0, 1);
    expect(m150.slopeMmPerM).toBeCloseTo(10, 0);
    expect(m150.compliant).toBe(false);
  });

  it("IPC minima by NPS band", () => {
    expect(ipcMinSlopeInPerFt("2")).toBe(0.25);
    expect(ipcMinSlopeInPerFt("4")).toBe(0.125);
    expect(ipcMinSlopeInPerFt("8")).toBe(0.0625);
  });

  it("metric 1% on NPS 6 screens below IPC 1/8 in/ft", () => {
    const m150 = computePipeSlope({
      unitSystem: "metric",
      pipeNps: "6",
      rise: 30,
      run: 3,
    });
    expect(m150.compliant).toBe(false);
  });

  it("fails when below IPC min", () => {
    const c = computePipeSlope({
      ...DEFAULT_PIPE_SLOPE_INPUTS,
      rise: 0.5,
      run: 10,
    });
    expect(c.slopeInPerFt).toBeCloseTo(0.05, 2);
    expect(c.compliant).toBe(false);
    const out = calculatePipeSlope({
      ...DEFAULT_PIPE_SLOPE_INPUTS,
      rise: 0.5,
      run: 10,
    });
    expect(out.heroStatusLevel).toBe("fail");
    expect(out.heroStatus).toBe("Below IPC min");
    expectNoPoison(out);
  });

  it("resolves Pattern B specs", () => {
    expect(
      resolveSpecRoute("pipe-slope-calculator", "4inch-drainage-slope")?.query,
    ).toMatchObject({
      units: "imperial",
      nps: "4",
      rise: "2.5",
      run: "10",
    });
    expect(
      resolveSpecRoute("pipe-slope-calculator", "4inch-drainage-slope")?.query
        .mat,
    ).toBeUndefined();
    expect(
      resolveSpecRoute("pipe-slope-calculator", "100a-2percent-slope")?.query
        .units,
    ).toBe("metric");
    expect(
      findSpecRouteForInputs("pipe-slope-calculator", {
        units: "imperial",
        nps: "6",
        rise: "1.25",
        run: "10",
      })?.spec,
    ).toBe("6inch-drainage-slope");

    const routes = listSpecRoutesForSlug("pipe-slope-calculator");
    expect(routes.map((r) => r.spec)).toEqual([
      "4inch-drainage-slope",
      "6inch-drainage-slope",
      "100a-2percent-slope",
      "150a-1percent-slope",
    ]);
    expect(SLUG_TO_CALCULATOR_TYPE["pipe-slope-calculator"]).toBe(
      "pipe-slope-calculator",
    );

    const seo = buildSpecSeoCopy(
      "Pipe Slope & Drainage Ratio Calculator",
      SLUG_TO_CALCULATOR_TYPE["pipe-slope-calculator"],
      routes[0],
      null,
    );
    expect(seo.h1).toMatch(/4"/);
  });
});
