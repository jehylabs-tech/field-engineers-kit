import { describe, expect, it } from "vitest";
import {
  calculateValveWallThicknessRating,
  computeValveWallThicknessRating,
  DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS,
  DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS_IMPERIAL,
} from "@/lib/calculators/engines/valve-wall-thickness-rating";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { syncCompanionUnits } from "@/lib/unitConverter";
import { getCalculatorSeo } from "../data/calculatorSeoData";

const SLUG = "valve-wall-thickness-rating";

describe("valve-wall-thickness-rating engine", () => {
  it("default metric duty: t_m ≈ 5.91 mm, p_max = 43.8 bar (Pass)", () => {
    const c = computeValveWallThicknessRating(
      DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS,
    );
    expect(c.tmGoverningMm).toBeCloseTo(5.91, 1);
    expect(c.pMaxBar).toBeCloseTo(43.8, 1);
    expect(c.pHydroBar).toBeCloseTo(76.65, 1);
    expect(c.passPressure).toBe(true);

    const out = calculateValveWallThicknessRating(
      DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS,
    );
    expect(out.heroValue).toMatch(/5\.9/);
    expect(out.heroBadges?.some((b) => /43\.8/.test(b.value))).toBe(true);
    expect(out.heroBadges?.some((b) => /P_c/i.test(b.label))).toBe(true);
    expect(out.summary?.some((s) => /Pass/.test(s.value))).toBe(true);
    expect(out.rows?.some((r) => /Geometry/i.test(r.section ?? ""))).toBe(
      false,
    );
    expect(out.rows?.length).toBe(2);
  });

  it("NPS 8 Class 600 CF8M · 300 °C · 55 bar", () => {
    const c = computeValveWallThicknessRating({
      unitSystem: "metric",
      nps: "8",
      pressureClass: "600",
      insideDiameter: 203,
      designTemperature: 300,
      workingPressure: 55,
      materialId: "group-2.2-A351-CF8M-316",
    });
    expect(c.tmGoverningMm).toBeCloseTo(16.3, 1);
    expect(c.pMaxBar).toBeCloseTo(63.3, 1);
    expect(c.passPressure).toBe(true);
  });

  it("imperial NPS 3 Class 150 · 100 °F · 200 psi", () => {
    const c = computeValveWallThicknessRating(
      DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS_IMPERIAL,
    );
    expect(c.tmGoverningMm / 25.4).toBeCloseTo(0.149, 2);
    expect((c.pMaxBar ?? 0) * 14.5037738).toBeCloseTo(284, 0);
    expect(c.passPressure).toBe(true);
  });

  it("imperial NPS 6 Class 900 · 400 °F · 1500 psi", () => {
    const c = computeValveWallThicknessRating({
      unitSystem: "imperial",
      nps: "6",
      pressureClass: "900",
      insideDiameter: 6,
      designTemperature: 400,
      workingPressure: 1500,
      materialId: "group-1.1-A105-WCB",
    });
    expect(c.tmGoverningMm / 25.4).toBeCloseTo(0.727, 2);
    expect((c.pMaxBar ?? 0) * 14.5037738).toBeCloseTo(1898, 0);
    expect(c.passPressure).toBe(true);
  });

  it("syncCompanionUnits converts ID mm↔in and pressure bar↔psi", () => {
    const imperial = syncCompanionUnits(
      { ...DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS },
      "imperial",
    ) as typeof DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS;
    expect(imperial.unitSystem).toBe("imperial");
    expect(imperial.insideDiameter).toBeCloseTo(102 / 25.4, 2);
    expect(imperial.workingPressure).toBeCloseTo(35 * 14.5037738, 0);
    expect(imperial.designTemperature).toBeCloseTo(392, 0);

    const back = syncCompanionUnits(
      imperial,
      "metric",
    ) as typeof DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS;
    expect(back.insideDiameter).toBeCloseTo(102, 0);
    expect(back.workingPressure).toBeCloseTo(35, 0);
  });

  it("leans to a single warn callout on default duty", () => {
    const out = calculateValveWallThicknessRating(
      DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS,
    );
    expect(out.callouts?.length).toBe(1);
    expect(out.callouts?.[0]?.tone).toBe("warn");
    expect(out.rows?.length).toBeLessThanOrEqual(4);
    expect(out.summary?.some((s) => /p_amb/i.test(s.label))).toBe(true);
    expect(out.summary?.some((s) => /Hydro/i.test(s.label))).toBe(true);
    expect(out.heroBadges?.some((b) => b.label === "P_c")).toBe(true);
  });
});

describe("valve-wall-thickness-rating Pattern B + SEO", () => {
  it("lists Pattern B specs and resolves default metric route", () => {
    const routes = listSpecRoutesForSlug(SLUG);
    expect(routes.length).toBeGreaterThanOrEqual(4);
    expect(routes.some((r) => r.spec === "nps4-class300-wcb-200c-metric")).toBe(
      true,
    );

    const resolved = resolveSpecRoute(SLUG, "nps4-class300-wcb-200c-metric");
    expect(resolved?.query.nps).toBe("4");
    expect(resolved?.query.class).toBe("300");
    expect(resolved?.query.units).toBe("metric");

    const found = findSpecRouteForInputs(SLUG, {
      nps: "4",
      class: "300",
      matGroup: "group-1.1-A105-WCB",
      temp: "200",
      units: "metric",
    });
    expect(found?.spec).toBe("nps4-class300-wcb-200c-metric");
  });

  it("SEO entry is full layout with engine-aligned worked example", () => {
    const seo = getCalculatorSeo(SLUG);
    expect(seo).toBeDefined();
    expect(seo?.allowancesAndTolerances).toBeDefined();
    expect(seo?.materialLimitations).toBeDefined();
    expect(seo?.workedExample).toBeDefined();
    expect(seo?.howToSteps?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.faq?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.workedExample?.conclusion).toMatch(/5\.91/);
    expect(seo?.workedExample?.conclusion).toMatch(/43\.8/);

    const route = resolveSpecRoute(SLUG, "nps4-class300-wcb-200c-metric");
    expect(route).toBeDefined();
    const copy = buildSpecSeoCopy(
      "ASME B16.34 Valve Wall Thickness Calculator",
      "valve-wall-thickness-rating",
      route!,
      null,
    );
    expect(copy.h1).toContain("NPS 4");
    expect(copy.h2).toMatch(/valve wall/i);
  });
});
