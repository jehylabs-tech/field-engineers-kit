import { describe, expect, it } from "vitest";
import {
  buildWaterThermoSpec,
  calculateWaterThermo,
  computeWaterThermo,
  DEFAULT_WATER_THERMO_INPUTS,
} from "@/lib/calculators/engines/water-thermodynamic-properties";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";

function expectNoPoison(out: ReturnType<typeof calculateWaterThermo>) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("water-thermodynamic-properties", () => {
  it("defaults ≈ 998.2 kg/m³ · 4.182 kJ/kg·K at 20 °C · 1.013 bar", () => {
    const c = computeWaterThermo(DEFAULT_WATER_THERMO_INPUTS);
    expect(c.invalid).toBe(false);
    expect(c.densityKgM3).toBeCloseTo(998.2, 0);
    expect(c.cpKjKgK).toBeCloseTo(4.182, 2);
    const out = calculateWaterThermo(DEFAULT_WATER_THERMO_INPUTS);
    expect(out.heroLabel).toMatch(/density/i);
    expect(out.heroValue).toMatch(/998\.2/);
    expect(out.heroValue).toMatch(/4\.182/);
    expect(out.callouts?.some((x) => /IAPWS-IF97/i.test(x.body))).toBe(true);
    expectNoPoison(out);
  });

  it("matches pSEO metric / imperial hero duties", () => {
    const m20 = computeWaterThermo({
      unitSystem: "metric",
      temperature: 20,
      pressure: 1,
    });
    expect(m20.densityKgM3).toBeCloseTo(998.2, 0);
    expect(m20.cpKjKgK).toBeCloseTo(4.182, 2);

    const m100 = computeWaterThermo({
      unitSystem: "metric",
      temperature: 100,
      pressure: 1,
    });
    expect(m100.invalid).toBe(false);
    expect(m100.densityKgM3).toBeCloseTo(958.4, 0);
    expect(m100.cpKjKgK).toBeCloseTo(4.216, 2);

    const i68 = computeWaterThermo({
      unitSystem: "imperial",
      temperature: 68,
      pressure: 14.7,
    });
    expect(i68.densityKgM3 * 0.0624279606).toBeCloseTo(62.3, 0);
    expect(i68.cpKjKgK * 0.2388458966).toBeCloseTo(1.0, 2);

    const i212 = computeWaterThermo({
      unitSystem: "imperial",
      temperature: 212,
      pressure: 14.7,
    });
    expect(i212.invalid).toBe(false);
    expect(i212.densityKgM3 * 0.0624279606).toBeCloseTo(59.8, 0);
    expect(i212.cpKjKgK * 0.2388458966).toBeCloseTo(1.007, 2);
  });

  it("builds listed SpecRoute tokens", () => {
    expect(buildWaterThermoSpec(20, 1, "metric")).toBe("20c-1bar");
    expect(buildWaterThermoSpec(68, 14.7, "imperial")).toBe("68f-14p7psi");
    expect(buildWaterThermoSpec(212, 14.7, "imperial")).toBe("212f-14p7psi");
  });

  it("resolves Pattern B specs and findSpecRouteForInputs", () => {
    expect(
      resolveSpecRoute("water-thermodynamic-properties", "20c-1bar")?.query,
    ).toMatchObject({
      units: "metric",
      temp: "20",
      pressure: "1",
    });
    expect(
      resolveSpecRoute("water-thermodynamic-properties", "68f-14p7psi")?.query,
    ).toMatchObject({
      units: "imperial",
      temp: "68",
      pressure: "14.7",
    });
    expect(
      findSpecRouteForInputs("water-thermodynamic-properties", {
        units: "metric",
        temp: "100",
        pressure: "1",
      })?.spec,
    ).toBe("100c-1bar");

    const routes = listSpecRoutesForSlug("water-thermodynamic-properties");
    expect(routes.length).toBeGreaterThanOrEqual(4);
    const copy = buildSpecSeoCopy(
      "Water Density & Thermodynamic Properties Calculator",
      SLUG_TO_CALCULATOR_TYPE["water-thermodynamic-properties"],
      routes[0],
      null,
    );
    expect(copy.title).toMatch(/FieldEngineersKit/);
    expect(copy.description.length).toBeLessThanOrEqual(160);
  });
});
