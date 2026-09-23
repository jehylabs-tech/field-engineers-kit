import { describe, expect, it } from "vitest";
import {
  calculateBearingLifeL10h,
  computeBearingLifeL10h,
  DEFAULT_BEARING_LIFE_L10H_INPUTS,
} from "@/lib/calculators/engines/bearing-life-l10h";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { getCalculatorSeo } from "../data/calculatorSeoData";

const SLUG = "bearing-life-l10h";

describe("bearing-life-l10h", () => {
  it("default metric deep-groove duty matches ISO 281 physics", () => {
    const c = computeBearingLifeL10h(DEFAULT_BEARING_LIFE_L10H_INPUTS);
    expect(c.invalid).toBe(false);
    expect(c.P).toBeCloseTo(4.26, 2);
    expect(c.L10).toBeCloseTo(444.04, 1);
    expect(c.L10h).toBeCloseTo(4229, 0);
    expect(c.statusLevel).toBe("warn");

    const out = calculateBearingLifeL10h(DEFAULT_BEARING_LIFE_L10H_INPUTS);
    expect(out.heroStatusLevel).toBe("warn");
    expect(out.heroValue).toMatch(/4,?229/);
  });

  it("tapered roller metric duty matches engine P and L10h", () => {
    const c = computeBearingLifeL10h({
      unitSystem: "metric",
      bearingType: "tapered-roller",
      dynamicLoadRating: 120,
      radialLoad: 25,
      axialLoad: 10,
      rotationalSpeed: 900,
      radialFactor: 0.4,
      thrustFactor: 1.5,
      xyMode: "manual",
    });
    expect(c.P).toBeCloseTo(25.0, 5);
    expect(c.p).toBeCloseTo(10 / 3, 5);
    expect(c.L10h).toBeCloseTo(3455, 0);
  });

  it("imperial ball duty matches engine P and L10h", () => {
    const c = computeBearingLifeL10h({
      unitSystem: "imperial",
      bearingType: "deep-groove-ball",
      dynamicLoadRating: 7500,
      radialLoad: 1000,
      axialLoad: 300,
      rotationalSpeed: 3600,
      radialFactor: 0.56,
      thrustFactor: 1.45,
      xyMode: "manual",
    });
    expect(c.P).toBeCloseTo(995, 5);
    expect(c.L10h).toBeCloseTo(1983, 0);
  });

  it("imperial spherical roller duty matches engine P and L10h", () => {
    const c = computeBearingLifeL10h({
      unitSystem: "imperial",
      bearingType: "spherical-roller",
      dynamicLoadRating: 45000,
      radialLoad: 8000,
      axialLoad: 2000,
      rotationalSpeed: 1200,
      radialFactor: 1.0,
      thrustFactor: 2.5,
      xyMode: "manual",
    });
    expect(c.P).toBeCloseTo(13000, 5);
    expect(c.L10h).toBeCloseTo(871, 0);
  });

  it("lists Pattern B specs and resolves default metric route", () => {
    const routes = listSpecRoutesForSlug(SLUG);
    expect(routes.length).toBeGreaterThanOrEqual(4);
    expect(routes.some((r) => r.spec === "ball-c32.5kn-fr4.5kn-1750rpm-metric")).toBe(
      true,
    );

    const resolved = resolveSpecRoute(SLUG, "ball-c32.5kn-fr4.5kn-1750rpm-metric");
    expect(resolved?.query.type).toBe("deep-groove-ball");
    expect(resolved?.query.c).toBe("32.5");
    expect(resolved?.query.units).toBe("metric");

    const found = findSpecRouteForInputs(SLUG, {
      type: "deep-groove-ball",
      c: 32.5,
      fr: 4.5,
      rpm: 1750,
      units: "metric",
    });
    expect(found?.spec).toBe("ball-c32.5kn-fr4.5kn-1750rpm-metric");
  });

  it("SEO entry is full layout with engine-aligned worked example", () => {
    const seo = getCalculatorSeo(SLUG);
    expect(seo).toBeDefined();
    expect(seo?.allowancesAndTolerances).toBeDefined();
    expect(seo?.materialLimitations).toBeDefined();
    expect(seo?.workedExample).toBeDefined();
    expect(seo?.howToSteps?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.faq?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.workedExample?.conclusion).toMatch(/4,?229/);

    const route = resolveSpecRoute(SLUG, "ball-c32.5kn-fr4.5kn-1750rpm-metric");
    expect(route).toBeDefined();
    const copy = buildSpecSeoCopy(
      "Bearing Life L10h Calculator",
      "bearing-life-l10h",
      route!,
      null,
    );
    expect(copy.title).toContain("FieldEngineersKit");
    expect(copy.h2).toMatch(/L₁₀h|L10h/i);
  });
});
