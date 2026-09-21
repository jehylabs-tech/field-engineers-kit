import { describe, expect, it } from "vitest";
import {
  calculateCompressorPolytropicPower,
  computeCompressorPolytropicPower,
  DEFAULT_COMPRESSOR_POLYTROPIC_POWER_INPUTS,
} from "@/lib/calculators/engines/compressor-polytropic-power";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";
import { getCalculatorSeo } from "../data/calculatorSeoData";

const SLUG = "compressor-polytropic-power";

function expectNoPoison(
  out: ReturnType<typeof calculateCompressorPolytropicPower>,
) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("compressor-polytropic-power", () => {
  it("default NG 5→25 bar · 5000 m³/h → H_p≈270.2 · T₂≈219.6 °C · P≈1902 kW", () => {
    const c = computeCompressorPolytropicPower(
      DEFAULT_COMPRESSOR_POLYTROPIC_POWER_INPUTS,
    );
    expect(c.invalid).toBe(false);
    expect(c.rp).toBeCloseTo(5, 5);
    expect(c.hpKjKg).toBeCloseTo(270.2, 0);
    expect(c.t2C).toBeCloseTo(219.6, 0);
    expect(c.powerKw).toBeCloseTo(1902, -1);
    expect(c.highTemp).toBe(true);
    expect(c.highRp).toBe(true);

    const out = calculateCompressorPolytropicPower(
      DEFAULT_COMPRESSOR_POLYTROPIC_POWER_INPUTS,
    );
    expect(out.heroValue).toMatch(/190[12]|219/);
    expect(out.heroStatusLevel).toBe("warn");
    expect(out.callouts?.length).toBe(1);
    expect(out.callouts?.[0]?.tone).toBe("warn");
    expect(out.callouts?.[0]?.title).toMatch(/Temperature|Pressure Ratio/i);
    expect(out.rows.some((r) => /API 617/i.test(r.label))).toBe(true);
    expect(out.rows.every((r) => !/T₂ \/ r_p/i.test(r.label))).toBe(true);
    expect(out.rows.length).toBeLessThanOrEqual(4);
    expect(out.summary.some((s) => /head|H_p/i.test(s.label))).toBe(true);
    expectNoPoison(out);
  });

  it("imperial heroStatus / callout use °F for T₂ alert", () => {
    const out = calculateCompressorPolytropicPower({
      unitSystem: "imperial",
      gasType: "natural_gas",
      molecularWeight: 18.5,
      kRatio: 1.28,
      zFactor: 0.95,
      suctionPress: 70,
      dischargePress: 350,
      suctionTemp: 95,
      volFlow: 3000,
      polytropicEff: 75,
    });
    expect(out.heroStatus).toMatch(/°F/);
    expect(out.heroStatus).not.toMatch(/°C/);
    expect(out.callouts?.[0]?.body).toMatch(/°F/);
  });

  it("air 1.013→7 bar · 1000 m³/h · 72% → P≈114 kW · T₂≈358 °C", () => {
    const c = computeCompressorPolytropicPower({
      ...DEFAULT_COMPRESSOR_POLYTROPIC_POWER_INPUTS,
      gasType: "air",
      molecularWeight: 28.97,
      kRatio: 1.4,
      zFactor: 1,
      suctionPress: 1.013,
      dischargePress: 7,
      suctionTemp: 20,
      volFlow: 1000,
      polytropicEff: 72,
    });
    expect(c.invalid).toBe(false);
    expect(c.hpKjKg).toBeCloseTo(244.5, 0);
    expect(c.t2C).toBeCloseTo(358.1, 0);
    expect(c.powerKw).toBeCloseTo(113.6, 0);
  });

  it("imperial NG 70→350 psia · 3000 ICFM · 75%", () => {
    const c = computeCompressorPolytropicPower({
      unitSystem: "imperial",
      gasType: "natural_gas",
      molecularWeight: 18.5,
      kRatio: 1.28,
      zFactor: 0.95,
      suctionPress: 70,
      dischargePress: 350,
      suctionTemp: 95,
      volFlow: 3000,
      polytropicEff: 75,
    });
    expect(c.invalid).toBe(false);
    expect(c.rp).toBeCloseTo(5, 2);
    expect(c.hpKjKg).toBeCloseTo(270.2, 0);
    expect(c.t2C).toBeCloseTo(219.6, 0);
    expect(c.powerKw * 1.34102209).toBeCloseTo(2510, -1);
  });

  it("imperial N₂ 15→90 psia · 1500 ICFM · 70%", () => {
    const c = computeCompressorPolytropicPower({
      unitSystem: "imperial",
      gasType: "nitrogen",
      molecularWeight: 28.01,
      kRatio: 1.4,
      zFactor: 1,
      suctionPress: 15,
      dischargePress: 90,
      suctionTemp: 70,
      volFlow: 1500,
      polytropicEff: 70,
    });
    expect(c.invalid).toBe(false);
    expect(c.rp).toBeCloseTo(6, 5);
    expect(c.powerKw * 1.34102209).toBeCloseTo(370, 0);
    expect((c.t2C * 9) / 5 + 32).toBeCloseTo(641, 0);
  });

  it("Pattern B: list / resolve / findSpec / SEO triad", () => {
    expect(SLUG_TO_CALCULATOR_TYPE[SLUG]).toBe("compressor-polytropic-power");
    const routes = listSpecRoutesForSlug(SLUG);
    expect(routes.length).toBeGreaterThanOrEqual(4);
    expect(routes.some((r) => r.spec === "natural-gas-5bar-to-25bar-5000m3h")).toBe(
      true,
    );

    const resolved = resolveSpecRoute(SLUG, "natural-gas-5bar-to-25bar-5000m3h");
    expect(resolved?.query.gas).toBe("natural_gas");
    expect(resolved?.query.p1).toBe("5");
    expect(resolved?.query.p2).toBe("25");

    const found = findSpecRouteForInputs(SLUG, {
      gas: "natural_gas",
      p1: 5,
      p2: 25,
      flow: 5000,
      units: "metric",
    });
    expect(found?.spec).toBe("natural-gas-5bar-to-25bar-5000m3h");

    const seo = buildSpecSeoCopy(
      "Compressor Gas Power & Polytropic Screening Calculator",
      "compressor-polytropic-power",
      resolved!,
    );
    expect(seo.title).toContain("FieldEngineersKit");
    expect(seo.title).not.toMatch(/\?/);
    expect(seo.description.length).toBeGreaterThan(40);
    expect(seo.description.length).toBeLessThanOrEqual(160);

    const entry = getCalculatorSeo(SLUG);
    expect(entry?.allowancesAndTolerances).toBeTruthy();
    expect(entry?.materialLimitations).toBeTruthy();
    expect(entry?.workedExample).toBeTruthy();
    expect(entry?.howToSteps?.length).toBeGreaterThanOrEqual(3);
    expect(entry?.faq?.length).toBeGreaterThanOrEqual(3);
    expect(entry?.workedExample?.conclusion).toMatch(/1902/);
  });
});
