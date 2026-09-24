import { describe, expect, it } from "vitest";
import {
  calculateSteamTurbinePowerSsc,
  computeSteamTurbinePowerSsc,
  DEFAULT_STEAM_TURBINE_POWER_SSC_INPUTS,
} from "@/lib/calculators/engines/steam-turbine-power-ssc";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { getCalculatorSeo } from "../data/calculatorSeoData";

const SLUG = "steam-turbine-power-ssc";

describe("steam-turbine-power-ssc engine", () => {
  it("default metric: W_elec ≈ 12.84 MW · SSC ≈ 3.90 kg/kWh", () => {
    const c = computeSteamTurbinePowerSsc(DEFAULT_STEAM_TURBINE_POWER_SSC_INPUTS);
    expect(c.invalid).toBe(false);
    expect(c.wElecMw).toBeCloseTo(12.84, 1);
    expect(c.sscKgPerKwh).toBeCloseTo(3.9, 1);
    expect(c.h1KjKg).toBeCloseTo(3375, 0);
    expect(c.dhIdealKjKg).toBeCloseTo(1215, 0);
    expect(c.exhaustMoisture).toBeLessThan(0.12);
  });

  it("100 bar · 540 °C · 100 t/h metric", () => {
    const c = computeSteamTurbinePowerSsc({
      ...DEFAULT_STEAM_TURBINE_POWER_SSC_INPUTS,
      inletPressure: 100,
      inletTemperature: 540,
      exhaustPressure: 0.08,
      massFlow: 100,
      etaIsentropicPct: 84,
      etaMechPct: 98.5,
      etaGenPct: 97.5,
    });
    expect(c.invalid).toBe(false);
    expect(c.wElecMw).toBeCloseTo(30.76, 1);
    expect(c.sscKgPerKwh).toBeCloseTo(3.25, 1);
  });

  it("850 psia · 850 °F · 100 klb/h imperial", () => {
    const c = computeSteamTurbinePowerSsc({
      unitSystem: "imperial",
      inletPressure: 850,
      inletTemperature: 850,
      exhaustPressure: 1.5,
      massFlow: 100000,
      etaIsentropicPct: 80,
      etaMechPct: 98,
      etaGenPct: 97,
    });
    expect(c.invalid).toBe(false);
    expect(c.wElecMw).toBeCloseTo(11.25, 1);
    expect(c.sscKgPerKwh / 0.45359237).toBeCloseTo(8.89, 1);
  });

  it("1200 psia · 950 °F · 200 klb/h imperial", () => {
    const c = computeSteamTurbinePowerSsc({
      unitSystem: "imperial",
      inletPressure: 1200,
      inletTemperature: 950,
      exhaustPressure: 2.0,
      massFlow: 200000,
      etaIsentropicPct: 82,
      etaMechPct: 98.5,
      etaGenPct: 97.5,
    });
    expect(c.invalid).toBe(false);
    expect(c.wElecMw).toBeCloseTo(24.76, 1);
    expect(c.sscKgPerKwh / 0.45359237).toBeCloseTo(8.08, 1);
  });

  it("imperial heat rate uses Btu/kWh not enthalpy factor", () => {
    const out = calculateSteamTurbinePowerSsc({
      unitSystem: "imperial",
      inletPressure: 850,
      inletTemperature: 850,
      exhaustPressure: 1.5,
      massFlow: 100000,
      etaIsentropicPct: 80,
      etaMechPct: 98,
      etaGenPct: 97,
    });
    const hr = out.summary.find((s) => s.label === "Heat rate")?.value ?? "";
    expect(hr).toMatch(/Btu\/kWh/);
    // ~11–13k Btu/kWh class for this duty — enthalpy-factor bug would show ~5k
    const n = Number(hr.replace(/[^\d.]/g, ""));
    expect(n).toBeGreaterThan(8000);
  });

  it("rejects wet inlet below Tsat", () => {
    const c = computeSteamTurbinePowerSsc({
      ...DEFAULT_STEAM_TURBINE_POWER_SSC_INPUTS,
      inletTemperature: 200,
      inletPressure: 60,
    });
    expect(c.invalid).toBe(true);
  });
});

describe("steam-turbine-power-ssc Pattern B + SEO", () => {
  it("lists Pattern B specs and resolves default metric route", () => {
    const routes = listSpecRoutesForSlug(SLUG);
    expect(routes.length).toBeGreaterThanOrEqual(4);
    expect(routes.some((r) => r.spec === "60bar-480c-50th-metric")).toBe(true);

    const resolved = resolveSpecRoute(SLUG, "60bar-480c-50th-metric");
    expect(resolved?.query.p1).toBe("60");
    expect(resolved?.query.t1).toBe("480");
    expect(resolved?.query.units).toBe("metric");

    const found = findSpecRouteForInputs(SLUG, {
      p1: 60,
      t1: 480,
      flow: 50,
      units: "metric",
    });
    expect(found?.spec).toBe("60bar-480c-50th-metric");
  });

  it("SEO entry is full layout with engine-aligned worked example", () => {
    const seo = getCalculatorSeo(SLUG);
    expect(seo).toBeDefined();
    expect(seo?.allowancesAndTolerances).toBeDefined();
    expect(seo?.materialLimitations).toBeDefined();
    expect(seo?.workedExample).toBeDefined();
    expect(seo?.howToSteps?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.faq?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.workedExample?.conclusion).toMatch(/12\.8/);
    expect(seo?.tableRows?.[0]?.[1]).toMatch(/12\.8/);

    const route = resolveSpecRoute(SLUG, "60bar-480c-50th-metric");
    expect(route).toBeDefined();
    const copy = buildSpecSeoCopy(
      "Steam Turbine Power Output and SSC Calculator",
      "steam-turbine-power-ssc",
      route!,
      null,
    );
    expect(copy.title).toContain("60 bar");
    expect(copy.h2).toMatch(/steam turbine|SSC|power/i);
  });
});
