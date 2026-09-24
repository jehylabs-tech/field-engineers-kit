import { describe, expect, it } from "vitest";
import {
  computeLiftingLugRiggingCapacity,
  DEFAULT_LIFTING_LUG_INPUTS,
} from "@/lib/calculators/engines/lifting-lug-rigging-capacity";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { getCalculatorSeo } from "../data/calculatorSeoData";

const SLUG = "lifting-lug-rigging-capacity";

describe("lifting-lug-rigging-capacity engine", () => {
  it("default metric duty: P_t ≈ 99.6 kN and Pass", () => {
    const c = computeLiftingLugRiggingCapacity(DEFAULT_LIFTING_LUG_INPUTS);
    expect(c.pTensionKn).toBeCloseTo(99.59, 1);
    expect(c.pShearKn).toBeCloseTo(49.8, 1);
    expect(c.sigmaBMPa).toBeCloseTo(104.8, 0);
    expect(c.fbAllowMPa).toBeCloseTo(221.875, 1);
    expect(c.weldRatio).toBeCloseTo(0.753, 2);
    expect(c.wSafePerLugKn).toBeCloseTo(99.7, 0);
    expect(c.pass).toBe(true);
    expect(c.bearingRatio).toBeLessThan(1);
    expect(c.tearRatio).toBeLessThan(1);
    expect(c.weldRatio).toBeLessThan(1);
  });

  it("50 t · 4 lugs · 45° · S355 metric", () => {
    const c = computeLiftingLugRiggingCapacity({
      ...DEFAULT_LIFTING_LUG_INPUTS,
      liftWeight: 500,
      impactFactor: 1.2,
      lugCount: 4,
      slingAngleDeg: 45,
      plateThickness: 40,
      outerRadius: 120,
      holeDiameter: 65,
      pinDiameter: 60,
      lugHeight: 200,
      weldSize: 18,
      weldLength: 240,
    });
    expect(c.pTensionKn).toBeCloseTo(212.13, 1);
    expect(c.sigmaBMPa).toBeCloseTo(88.39, 1);
    expect(c.fbAllowMPa).toBeCloseTo(221.875, 1);
    expect(c.pass).toBe(true);
  });

  it("30 kip · 2 lugs · 0° · A36 imperial", () => {
    const c = computeLiftingLugRiggingCapacity({
      unitSystem: "imperial",
      liftWeight: 30,
      impactFactor: 1.15,
      lugCount: 2,
      slingAngleDeg: 0,
      plateThickness: 0.75,
      outerRadius: 3,
      holeDiameter: 1.375,
      pinDiameter: 1.25,
      lugHeight: 6,
      materialId: "A36",
      weldSize: 0.375,
      weldLength: 6,
      electrodeId: "E70XX",
    });
    expect(c.pTensionKn / 4.448221615).toBeCloseTo(17.25, 2);
    expect(c.sigmaBMPa / 6.894757293).toBeCloseTo(18.4, 1);
    expect(c.pass).toBe(true);
  });

  it("100 kip · 4 lugs · 30° · A572-50 imperial", () => {
    const c = computeLiftingLugRiggingCapacity({
      unitSystem: "imperial",
      liftWeight: 100,
      impactFactor: 1.25,
      lugCount: 4,
      slingAngleDeg: 30,
      plateThickness: 1.5,
      outerRadius: 4.5,
      holeDiameter: 2.125,
      pinDiameter: 2.0,
      lugHeight: 8,
      materialId: "A572-50",
      weldSize: 0.625,
      weldLength: 8,
      electrodeId: "E70XX",
    });
    expect(c.pTensionKn / 4.448221615).toBeCloseTo(36.1, 1);
    expect(c.wSafePerLugKn / 4.448221615).toBeCloseTo(32.7, 0);
    expect(c.pass).toBe(true);
  });

  it("rejects sling angle > 60°", () => {
    const c = computeLiftingLugRiggingCapacity({
      ...DEFAULT_LIFTING_LUG_INPUTS,
      slingAngleDeg: 65,
    });
    expect(c.angleWarn).toBe(true);
    expect(c.pass).toBe(false);
  });

  it("rejects pin larger than hole", () => {
    const c = computeLiftingLugRiggingCapacity({
      ...DEFAULT_LIFTING_LUG_INPUTS,
      holeDiameter: 30,
      pinDiameter: 38,
    });
    expect(c.pinInterference).toBe(true);
    expect(c.pass).toBe(false);
  });
});

describe("lifting-lug-rigging-capacity Pattern B + SEO", () => {
  it("lists Pattern B specs and resolves default metric route", () => {
    const routes = listSpecRoutesForSlug(SLUG);
    expect(routes.length).toBeGreaterThanOrEqual(4);
    expect(
      routes.some((r) => r.spec === "15ton-2lugs-30deg-s355-metric"),
    ).toBe(true);

    const resolved = resolveSpecRoute(SLUG, "15ton-2lugs-30deg-s355-metric");
    expect(resolved?.query.weight).toBe("150");
    expect(resolved?.query.lugs).toBe("2");
    expect(resolved?.query.mat).toBe("S355");
    expect(resolved?.query.units).toBe("metric");

    const found = findSpecRouteForInputs(SLUG, {
      weight: 150,
      lugs: 2,
      angle: 30,
      mat: "S355",
      units: "metric",
    });
    expect(found?.spec).toBe("15ton-2lugs-30deg-s355-metric");
  });

  it("SEO entry is full layout with engine-aligned worked example", () => {
    const seo = getCalculatorSeo(SLUG);
    expect(seo).toBeDefined();
    expect(seo?.allowancesAndTolerances).toBeDefined();
    expect(seo?.materialLimitations).toBeDefined();
    expect(seo?.workedExample).toBeDefined();
    expect(seo?.howToSteps?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.faq?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.workedExample?.conclusion).toMatch(/99\.6/);
    expect(seo?.tableRows?.[0]?.[1]).toMatch(/99\.6/);

    const route = resolveSpecRoute(SLUG, "15ton-2lugs-30deg-s355-metric");
    expect(route).toBeDefined();
    const copy = buildSpecSeoCopy(
      "Lifting Lug Design and Capacity Calculator",
      "lifting-lug-rigging-capacity",
      route!,
      null,
    );
    expect(copy.title).toContain("15 t");
    expect(copy.title).not.toMatch(/FieldEngineersKit.*FieldEngineersKit/);
    expect(copy.h2).toMatch(/lifting lug/i);
  });
});
