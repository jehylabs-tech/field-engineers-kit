import { describe, expect, it } from "vitest";
import {
  calculateNaturalGasZDensity,
  computeNaturalGasZDensity,
  DEFAULT_NATURAL_GAS_Z_DENSITY_INPUTS,
  hallYarboroughZ,
  PRESSURE_RANGE_PSIA,
  standingPseudoCriticals,
} from "@/lib/calculators/engines/natural-gas-z-density";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";

function expectNoPoison(out: ReturnType<typeof calculateNaturalGasZDensity>) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("natural-gas-z-density", () => {
  it("Standing SG=0.6 → Tpc≈358.5 °R · Ppc≈672.5 psia", () => {
    const pc = standingPseudoCriticals(0.6);
    expect(pc.tpcR).toBeCloseTo(358.5, 0);
    expect(pc.ppcPsia).toBeCloseTo(672.5, 0);
  });

  it("default 30 bar · 25 °C · SG 0.60 → Z≈0.935 · ρ≈22.5 kg/m³", () => {
    const c = computeNaturalGasZDensity(DEFAULT_NATURAL_GAS_Z_DENSITY_INPUTS);
    expect(c.invalid).toBe(false);
    expect(c.usedCnga).toBe(false);
    expect(c.z).toBeCloseTo(0.935, 2);
    expect(c.rhoKgM3).toBeCloseTo(22.5, 0);
    expect(c.pr).toBeCloseTo(0.65, 1);
    expect(c.tr).toBeCloseTo(1.5, 1);
    const out = calculateNaturalGasZDensity(
      DEFAULT_NATURAL_GAS_Z_DENSITY_INPUTS,
    );
    expect(out.heroValue).toMatch(/Z = 0\.93/);
    expect(out.heroStatus).toBe("Screening OK");
    expect(out.callouts).toHaveLength(1);
    expect(out.callouts?.[0]?.tone).toBe("info");
    expect(out.rows.length).toBeLessThanOrEqual(4);
    expect(out.rows.some((r) => /Ideal density/i.test(r.label))).toBe(true);
    expectNoPoison(out);
  });

  it("imperial 725 psia is inside PRESSURE_RANGE_PSIA (not clamped to 250)", () => {
    expect(PRESSURE_RANGE_PSIA.max).toBeGreaterThan(1160);
    const c = computeNaturalGasZDensity({
      unitSystem: "imperial",
      pressure: 725.19,
      temperature: 104,
      specificGravity: 0.65,
      co2MolePercent: 0,
      n2MolePercent: 0,
    });
    expect(c.invalid).toBe(false);
    expect(c.pBarAbs).toBeCloseTo(50, 0);
    expect(c.z).toBeGreaterThan(0.7);
  });

  it("P > 150 bar escalates callout to warn", () => {
    const out = calculateNaturalGasZDensity({
      ...DEFAULT_NATURAL_GAS_Z_DENSITY_INPUTS,
      pressure: 160,
      temperature: 40,
      specificGravity: 0.6,
    });
    expect(out.heroStatusLevel).toBe("warn");
    expect(out.callouts?.[0]?.tone).toBe("warn");
    expect(out.callouts?.[0]?.title).toMatch(/High-pressure/i);
  });

  it("50 bar · 40 °C · SG 0.65", () => {
    const c = computeNaturalGasZDensity({
      ...DEFAULT_NATURAL_GAS_Z_DENSITY_INPUTS,
      pressure: 50,
      temperature: 40,
      specificGravity: 0.65,
    });
    expect(c.invalid).toBe(false);
    expect(c.z).toBeGreaterThan(0.7);
    expect(c.z).toBeLessThan(1);
    expect(c.rhoKgM3).toBeGreaterThan(30);
  });

  it("10 bar · 15 °C · SG 0.55 near-ideal", () => {
    const c = computeNaturalGasZDensity({
      ...DEFAULT_NATURAL_GAS_Z_DENSITY_INPUTS,
      pressure: 10,
      temperature: 15,
      specificGravity: 0.55,
    });
    expect(c.z).toBeGreaterThan(0.95);
    expect(c.rhoKgM3).toBeLessThan(10);
  });

  it("80 bar · 50 °C · SG 0.60 transmission", () => {
    const c = computeNaturalGasZDensity({
      ...DEFAULT_NATURAL_GAS_Z_DENSITY_INPUTS,
      pressure: 80,
      temperature: 50,
      specificGravity: 0.6,
    });
    expect(c.invalid).toBe(false);
    expect(c.z).toBeLessThan(0.95);
    expect(c.rhoKgM3).toBeGreaterThan(40);
  });

  it("Hall-Yarborough converges at Tr=1.5 Pr=0.65", () => {
    expect(hallYarboroughZ(0.65, 1.5)).toBeCloseTo(0.935, 2);
  });

  it("wires pSEO routes", () => {
    expect(SLUG_TO_CALCULATOR_TYPE["natural-gas-z-density"]).toBe(
      "natural-gas-z-density",
    );
    const routes = listSpecRoutesForSlug("natural-gas-z-density");
    expect(routes).toHaveLength(4);
    expect(
      resolveSpecRoute("natural-gas-z-density", "30bar-25c-sg060")?.query
        .pressure,
    ).toBe("30");
    expect(
      findSpecRouteForInputs("natural-gas-z-density", {
        pressure: 30,
        temperature: 25,
        specificGravity: 0.6,
        units: "metric",
      })?.spec,
    ).toBe("30bar-25c-sg060");
    const seo = buildSpecSeoCopy(
      "Natural Gas Z & Density",
      "natural-gas-z-density",
      routes[0],
      "Natural gas Z-factor screening.",
    );
    expect(seo.title).toMatch(/Natural Gas|Z/i);
  });
});
