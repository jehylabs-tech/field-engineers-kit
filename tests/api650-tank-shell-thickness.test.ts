import { describe, expect, it } from "vitest";
import {
  calculateApi650TankShellThickness,
  computeApi650TankShellThickness,
  DEFAULT_API650_TANK_SHELL_THICKNESS_INPUTS,
  api650MinShellThicknessMm,
} from "@/lib/calculators/engines/api650-tank-shell-thickness";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";
import { getCalculatorSeo } from "../data/calculatorSeoData";

const SLUG = "api650-tank-shell-thickness";

describe("api650-tank-shell-thickness", () => {
  it("Table 5.2a minimum thickness by diameter", () => {
    expect(api650MinShellThicknessMm(10)).toBe(5);
    expect(api650MinShellThicknessMm(20)).toBe(6);
    expect(api650MinShellThicknessMm(40)).toBe(8);
    expect(api650MinShellThicknessMm(70)).toBe(10);
  });

  it("default 20 m · 15 m · A36 → t_d≈11.00 · t_nom=12 mm · mass≈61.7 t", () => {
    const c = computeApi650TankShellThickness(
      DEFAULT_API650_TANK_SHELL_THICKNESS_INPUTS,
    );
    expect(c.invalid).toBe(false);
    expect(c.bottom?.tdMm).toBeCloseTo(11.0, 1);
    expect(c.bottom?.ttMm).toBeCloseTo(10.42, 1);
    expect(c.bottom?.tNomMm).toBe(12);
    expect(c.courseCount).toBe(6);
    expect(c.totalMassKg / 1000).toBeCloseTo(61.7, 0);

    const out = calculateApi650TankShellThickness(
      DEFAULT_API650_TANK_SHELL_THICKNESS_INPUTS,
    );
    expect(out.heroValue).toMatch(/12\s*mm/);
    expect(out.heroValue).toMatch(/61\.|62\./);
    expect(out.callouts?.length).toBe(1);
    expect(out.rows.length).toBeLessThanOrEqual(4);
    expect(out.summary.some((s) => /t_d/i.test(s.label))).toBe(true);
  });

  it("40 m · A516-70 → t_d≈22.0 · t_nom=22 mm", () => {
    const c = computeApi650TankShellThickness({
      unitSystem: "metric",
      tankDiameter: 40,
      tankHeight: 18,
      courseHeight: 2.5,
      specificGravity: 1,
      materialGrade: "A516-70",
      jointEfficiency: 1,
      corrosionAllowance: 3,
    });
    expect(c.bottom?.tdMm).toBeCloseTo(21.96, 1);
    expect(c.bottom?.tNomMm).toBe(22);
  });

  it("imperial 60 ft · A36 → t_nom 0.500 in", () => {
    const c = computeApi650TankShellThickness({
      unitSystem: "imperial",
      tankDiameter: 60,
      tankHeight: 48,
      courseHeight: 8,
      specificGravity: 0.85,
      materialGrade: "A36",
      jointEfficiency: 0.85,
      corrosionAllowance: 0.0625,
    });
    expect(c.invalid).toBe(false);
    expect((c.bottom?.tdMm ?? 0) / 25.4).toBeCloseTo(0.378, 2);
    const out = calculateApi650TankShellThickness({
      unitSystem: "imperial",
      tankDiameter: 60,
      tankHeight: 48,
      courseHeight: 8,
      specificGravity: 0.85,
      materialGrade: "A36",
      jointEfficiency: 0.85,
      corrosionAllowance: 0.0625,
    });
    expect(out.heroValue).toMatch(/0\.500/);
  });

  it("D > 60 m warns Variable-Design-Point", () => {
    const out = calculateApi650TankShellThickness({
      ...DEFAULT_API650_TANK_SHELL_THICKNESS_INPUTS,
      tankDiameter: 70,
    });
    expect(out.heroStatusLevel).toBe("warn");
    expect(out.callouts?.[0]?.title).toMatch(/1-Foot Method Diameter/i);
  });

  it("Pattern B: list / resolve / findSpec / SEO triad", () => {
    expect(SLUG_TO_CALCULATOR_TYPE[SLUG]).toBe("api650-tank-shell-thickness");
    const routes = listSpecRoutesForSlug(SLUG);
    expect(routes.length).toBe(4);
    const resolved = resolveSpecRoute(SLUG, "20m-diameter-15m-height-a36");
    expect(resolved?.query.d).toBe("20");
    expect(resolved?.query.material).toBe("A36");
    const hit = findSpecRouteForInputs(SLUG, {
      units: "metric",
      d: 20,
      h: 15,
      material: "A36",
    });
    expect(hit?.spec).toBe("20m-diameter-15m-height-a36");
    const seo = buildSpecSeoCopy(
      "API 650 Tank Shell Thickness Calculator (1-Foot Method)",
      "api650-tank-shell-thickness",
      resolved!,
    );
    expect(seo.title).toContain("FieldEngineersKit");
    expect(seo.description.length).toBeLessThanOrEqual(160);
    const entry = getCalculatorSeo(SLUG);
    expect(entry?.allowancesAndTolerances).toBeTruthy();
    expect(entry?.materialLimitations).toBeTruthy();
    expect(entry?.workedExample).toBeTruthy();
    expect(entry?.howToSteps?.length).toBeGreaterThanOrEqual(3);
    expect(entry?.faq?.length).toBeGreaterThanOrEqual(3);
    expect(entry?.workedExample?.conclusion).toMatch(/61\.7/);
  });
});
