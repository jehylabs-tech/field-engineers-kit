import { describe, expect, it } from "vitest";
import {
  calculateApi2000TankVenting,
  computeApi2000TankVenting,
  DEFAULT_API2000_TANK_VENTING_INPUTS,
  DEFAULT_API2000_TANK_VENTING_INPUTS_IMPERIAL,
} from "@/lib/calculators/engines/api2000-tank-venting";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { syncCompanionUnits } from "@/lib/unitConverter";
import { getCalculatorSeo } from "../data/calculatorSeoData";

const SLUG = "api2000-tank-venting";

describe("api2000-tank-venting engine", () => {
  it("default metric duty: V_out ≈ 991 Nm³/h, V_emer ≈ 21,197 Nm³/h", () => {
    const c = computeApi2000TankVenting(DEFAULT_API2000_TANK_VENTING_INPUTS);
    expect(c.volumeM3).toBeCloseTo(2120.6, 0);
    expect(c.vOutLiquidNm3h).toBeCloseTo(202, 5);
    expect(c.vOutTotalNm3h).toBeCloseTo(990.7, 0);
    expect(c.vEmergencyNm3h).toBeCloseTo(21197, 0);
    expect(c.aWettedM2).toBeCloseTo(Math.PI * 15 * 9.14, 1);

    const out = calculateApi2000TankVenting(DEFAULT_API2000_TANK_VENTING_INPUTS);
    expect(out.heroValue).toMatch(/991|990/);
    expect(out.heroBadges?.some((b) => /21,?197|21,?196/.test(b.value))).toBe(
      true,
    );
  });

  it("insulated Ø25 m metric duty", () => {
    const c = computeApi2000TankVenting({
      unitSystem: "metric",
      tankDiameter: 25,
      tankHeight: 18,
      pumpInRate: 500,
      pumpOutRate: 600,
      volatility: "flash-point-above-37.8c",
      environment: "insulated",
      latentHeat: 310,
      molecularWeight: 100,
      latitude: "below-42-deg",
    });
    expect(c.yFactor).toBe(0.5);
    expect(c.fEnv).toBe(0.3);
    expect(c.vOutTotalNm3h).toBeCloseTo(1930, 0);
    expect(c.vEmergencyNm3h).toBeCloseTo(9526, 0);
  });

  it("imperial Ø50 ft · 1000 GPM duty", () => {
    const c = computeApi2000TankVenting(
      DEFAULT_API2000_TANK_VENTING_INPUTS_IMPERIAL,
    );
    expect(c.vOutTotalNm3h * 35.3147).toBeCloseTo(37173, 0);
    expect(c.vEmergencyNm3h * 35.3147).toBeCloseTo(757244, 0);
  });

  it("imperial Ø80 ft insulated duty", () => {
    const c = computeApi2000TankVenting({
      unitSystem: "imperial",
      tankDiameter: 80,
      tankHeight: 50,
      pumpInRate: 2000,
      pumpOutRate: 2500,
      volatility: "flash-point-above-37.8c",
      environment: "insulated",
      latentHeat: 135,
      molecularWeight: 110,
      latitude: "below-42-deg",
    });
    expect(c.vOutTotalNm3h * 35.3147).toBeCloseTo(57609, 0);
    expect(c.vEmergencyNm3h * 35.3147).toBeCloseTo(310244, 0);
  });

  it("syncCompanionUnits converts D/H/flow/Lv once (no double m→ft)", () => {
    const imperial = syncCompanionUnits(
      { ...DEFAULT_API2000_TANK_VENTING_INPUTS },
      "imperial",
    ) as typeof DEFAULT_API2000_TANK_VENTING_INPUTS;
    expect(imperial.unitSystem).toBe("imperial");
    expect(imperial.tankDiameter).toBeCloseTo(15 / 0.3048, 2);
    expect(imperial.tankHeight).toBeCloseTo(12 / 0.3048, 2);
    expect(imperial.pumpInRate).toBeCloseTo(200 * 4.402867513, 0);
    expect(imperial.latentHeat).toBeCloseTo(360 / 2.326, 0);

    const back = syncCompanionUnits(
      imperial,
      "metric",
    ) as typeof DEFAULT_API2000_TANK_VENTING_INPUTS;
    expect(back.tankDiameter).toBeCloseTo(15, 1);
    expect(back.tankHeight).toBeCloseTo(12, 1);
    expect(back.pumpInRate).toBeCloseTo(200, 0);
    expect(back.latentHeat).toBeCloseTo(360, 0);
  });

  it("leans to a single warn callout", () => {
    const out = calculateApi2000TankVenting(DEFAULT_API2000_TANK_VENTING_INPUTS);
    expect(out.callouts?.length).toBe(1);
    expect(out.callouts?.[0]?.tone).toBe("warn");
    expect(out.heroLabel).toMatch(/outbreathing/i);
  });
});

describe("api2000-tank-venting Pattern B + SEO", () => {
  it("lists Pattern B specs and resolves default metric route", () => {
    const routes = listSpecRoutesForSlug(SLUG);
    expect(routes.length).toBeGreaterThanOrEqual(4);
    expect(routes.some((r) => r.spec === "d15m-h12m-pumpin200-metric")).toBe(
      true,
    );

    const resolved = resolveSpecRoute(SLUG, "d15m-h12m-pumpin200-metric");
    expect(resolved?.query.dia).toBe("15");
    expect(resolved?.query.units).toBe("metric");

    const found = findSpecRouteForInputs(SLUG, {
      dia: 15,
      height: 12,
      pumpIn: 200,
      units: "metric",
    });
    expect(found?.spec).toBe("d15m-h12m-pumpin200-metric");
  });

  it("SEO entry is full layout with engine-aligned worked example", () => {
    const seo = getCalculatorSeo(SLUG);
    expect(seo).toBeDefined();
    expect(seo?.allowancesAndTolerances).toBeDefined();
    expect(seo?.materialLimitations).toBeDefined();
    expect(seo?.workedExample).toBeDefined();
    expect(seo?.howToSteps?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.faq?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.workedExample?.conclusion).toMatch(/991/);
    expect(seo?.workedExample?.conclusion).toMatch(/21,?200|21,?197/);

    const route = resolveSpecRoute(SLUG, "d15m-h12m-pumpin200-metric");
    expect(route).toBeDefined();
    const copy = buildSpecSeoCopy(
      "API 2000 Tank Venting Calculator",
      "api2000-tank-venting",
      route!,
      null,
    );
    expect(copy.h1).toContain("15 m");
    expect(copy.h2).toMatch(/tank venting/i);
  });
});
