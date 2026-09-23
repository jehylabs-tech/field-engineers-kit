import { describe, expect, it } from "vitest";
import {
  calculateOletFittingDimensions,
  computeOletFittingDimensions,
  DEFAULT_OLET_FITTING_DIMENSIONS_INPUTS,
} from "@/lib/calculators/engines/olet-fitting-dimensions";
import {
  findSpecRouteForInputs,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";

describe("olet-fitting-dimensions engine", () => {
  it("Weldolet NPS6×2 STD metric — A≈38.1 mm, B≈58.7 mm", () => {
    const c = computeOletFittingDimensions({
      ...DEFAULT_OLET_FITTING_DIMENSIONS_INPUTS,
      oletType: "weldolet",
      runNps: "6",
      branchNps: "2",
      rating: "STD",
      unitSystem: "metric",
    });
    expect(c.invalid).toBe(false);
    expect(c.runCompatible).toBe(true);
    expect(c.A_mm).toBeCloseTo(38.1, 1);
    expect(c.B_mm).toBeCloseTo(58.7, 1);
  });

  it("Sockolet NPS8×1.5 Class 3000 metric — A≈33.3 mm, J≈12.7 mm", () => {
    const c = computeOletFittingDimensions({
      ...DEFAULT_OLET_FITTING_DIMENSIONS_INPUTS,
      oletType: "sockolet",
      runNps: "8",
      branchNps: "1.5",
      rating: "3000",
      unitSystem: "metric",
    });
    expect(c.invalid).toBe(false);
    expect(c.runCompatible).toBe(true);
    expect(c.A_mm).toBeCloseTo(33.3, 1);
    expect(c.J_mm).toBeCloseTo(12.7, 1);
  });

  it("Weldolet NPS12×4 XS imperial — A≈2.25 in, B≈4.88 in", () => {
    const c = computeOletFittingDimensions({
      ...DEFAULT_OLET_FITTING_DIMENSIONS_INPUTS,
      oletType: "weldolet",
      runNps: "12",
      branchNps: "4",
      rating: "XS",
      unitSystem: "imperial",
    });
    expect(c.invalid).toBe(false);
    expect(c.runCompatible).toBe(true);
    expect(c.A_mm / 25.4).toBeCloseTo(2.25, 2);
    expect(c.B_mm / 25.4).toBeCloseTo(4.88, 2);
  });

  it("Threadolet NPS4×1 Class 3000 imperial — A≈1.31 in", () => {
    const c = computeOletFittingDimensions({
      ...DEFAULT_OLET_FITTING_DIMENSIONS_INPUTS,
      oletType: "threadolet",
      runNps: "4",
      branchNps: "1",
      rating: "3000",
      unitSystem: "imperial",
    });
    expect(c.invalid).toBe(false);
    expect(c.runCompatible).toBe(true);
    expect(c.A_mm / 25.4).toBeCloseTo(1.31, 2);
    const out = calculateOletFittingDimensions({
      ...DEFAULT_OLET_FITTING_DIMENSIONS_INPUTS,
      oletType: "threadolet",
      runNps: "4",
      branchNps: "1",
      rating: "3000",
      unitSystem: "imperial",
    });
    expect(out.heroValue).toMatch(/1\.31/);
    expect(out.heroStatus).toMatch(/NPT 1 in/i);
  });

  it("flags run size outside consolidated range", () => {
    const c = computeOletFittingDimensions({
      ...DEFAULT_OLET_FITTING_DIMENSIONS_INPUTS,
      oletType: "weldolet",
      runNps: "2",
      branchNps: "2",
      rating: "STD",
    });
    expect(c.invalid).toBe(false);
    expect(c.runCompatible).toBe(false);
  });
});

describe("olet-fitting-dimensions Pattern B", () => {
  it("resolves featured specs", () => {
    expect(
      resolveSpecRoute(
        "olet-fitting-dimensions",
        "weldolet-nps6-nps2-std-metric",
      )?.query,
    ).toMatchObject({
      type: "weldolet",
      runSize: "6",
      branchSize: "2",
      rating: "STD",
      units: "metric",
    });
    expect(
      resolveSpecRoute(
        "olet-fitting-dimensions",
        "sockolet-nps8-nps1.5-class3000-metric",
      )?.spec,
    ).toBe("sockolet-nps8-nps1.5-class3000-metric");
    expect(
      resolveSpecRoute(
        "olet-fitting-dimensions",
        "weldolet-nps12-nps4-xs-imperial",
      )?.query.units,
    ).toBe("imperial");
    expect(
      resolveSpecRoute(
        "olet-fitting-dimensions",
        "threadolet-nps4-nps1-class3000-imperial",
      )?.query.type,
    ).toBe("threadolet");
  });

  it("findSpecRouteForInputs matches path-owned keys", () => {
    expect(
      findSpecRouteForInputs("olet-fitting-dimensions", {
        type: "weldolet",
        runSize: "6",
        branchSize: "2",
        rating: "STD",
        units: "metric",
      })?.spec,
    ).toBe("weldolet-nps6-nps2-std-metric");
  });
});
