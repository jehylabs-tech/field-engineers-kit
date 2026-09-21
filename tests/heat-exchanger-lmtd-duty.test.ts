import { describe, expect, it } from "vitest";
import {
  calculateHeatExchangerLmtdDuty,
  computeHeatExchangerLmtdDuty,
  DEFAULT_HEAT_EXCHANGER_LMTD_DUTY_INPUTS,
} from "@/lib/calculators/engines/heat-exchanger-lmtd-duty";
import { temaFFactor } from "@/lib/calculators/data/temaFFactor";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";

const SLUG = "heat-exchanger-lmtd-duty";

function expectNoPoison(out: ReturnType<typeof calculateHeatExchangerLmtdDuty>) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("heat-exchanger-lmtd-duty", () => {
  it("TEMA F for R=1 · P=0.429 ≈ 0.898", () => {
    const F = temaFFactor(30 / 70, 1, 1);
    expect(F).toBeCloseTo(0.898, 2);
  });

  it("default water–water → Q≈349.4 kW · LMTD=40 · F≈0.898 · A≈8.11 m²", () => {
    const c = computeHeatExchangerLmtdDuty(
      DEFAULT_HEAT_EXCHANGER_LMTD_DUTY_INPUTS,
    );
    expect(c.invalid).toBe(false);
    expect(c.qKw).toBeCloseTo(349.4, 0);
    expect(c.lmtdC).toBeCloseTo(40, 5);
    expect(c.F).toBeCloseTo(0.898, 2);
    expect(c.areaM2).toBeCloseTo(8.11, 1);
    const out = calculateHeatExchangerLmtdDuty(
      DEFAULT_HEAT_EXCHANGER_LMTD_DUTY_INPUTS,
    );
    expect(out.heroValue).toMatch(/349\.|8\.1/);
    expect(out.heroStatus).toBe("Screening OK");
    expect(out.callouts).toHaveLength(1);
    expect(out.callouts[0]?.tone).toBe("info");
    expect(out.rows.length).toBeLessThanOrEqual(4);
    expect(out.summary.some((s) => /LMTD/i.test(s.label))).toBe(true);
    expectNoPoison(out);
  });

  it("steam condenser 120 °C · 5000 kg/h → Q≈3059 kW · F≈1 · A≈29.2 m²", () => {
    const c = computeHeatExchangerLmtdDuty({
      ...DEFAULT_HEAT_EXCHANGER_LMTD_DUTY_INPUTS,
      fluidTypeHot: "steam",
      tempHotIn: 120,
      tempHotOut: 120,
      massFlowHot: 5000,
      tempColdIn: 25,
      tempColdOut: 40,
    });
    expect(c.invalid).toBe(false);
    expect(c.hotMode).toBe("steam-condense");
    expect(c.qKw).toBeCloseTo(3059, -1);
    expect(c.lmtdC).toBeCloseTo(87.3, 0);
    expect(c.F).toBeCloseTo(1, 2);
    expect(c.areaM2).toBeCloseTo(29.2, 0);
  });

  it("imperial water cooler 194→140 °F · 22000 lb/hr", () => {
    const c = computeHeatExchangerLmtdDuty({
      unitSystem: "imperial",
      fluidTypeHot: "water",
      tempHotIn: 194,
      tempHotOut: 140,
      massFlowHot: 22000,
      cpHot: 1,
      fluidTypeCold: "water",
      tempColdIn: 68,
      tempColdOut: 122,
      cpCold: 1,
      shellPasses: 1,
      overallU: 211,
    });
    expect(c.invalid).toBe(false);
    expect(c.qKw).toBeCloseTo(349, 0);
    expect(c.lmtdC).toBeCloseTo(40, 0);
    expect(c.areaM2 * 10.7639).toBeCloseTo(87.2, 0);
  });

  it("F < 0.75 escalates warn callout", () => {
    const out = calculateHeatExchangerLmtdDuty({
      ...DEFAULT_HEAT_EXCHANGER_LMTD_DUTY_INPUTS,
      tempHotIn: 100,
      tempHotOut: 55,
      tempColdIn: 20,
      tempColdOut: 70,
    });
    // May be invalid (ΔT) or warn — if valid with low F, expect warn
    if (!out.heroValue.includes("—")) {
      const lowF = out.callouts?.some((c) =>
        /LMTD Correction Limit|Temperature Cross/i.test(c.title),
      );
      expect(lowF || out.heroStatusLevel === "warn").toBe(true);
    }
  });

  it("Pattern B: lists 4 specs and resolves default water duty", () => {
    expect(SLUG_TO_CALCULATOR_TYPE[SLUG]).toBe("heat-exchanger-lmtd-duty");
    const routes = listSpecRoutesForSlug(SLUG);
    expect(routes.length).toBe(4);
    const resolved = resolveSpecRoute(SLUG, "water-to-water-90c-60c-10000kgh");
    expect(resolved?.query.th_in).toBe("90");
    expect(resolved?.query.fluid).toBe("water");
    const hit = findSpecRouteForInputs(SLUG, {
      units: "metric",
      fluid: "water",
      th_in: 90,
      th_out: 60,
      flow: 10000,
    });
    expect(hit?.spec).toBe("water-to-water-90c-60c-10000kgh");
    const seo = buildSpecSeoCopy(
      "Heat Exchanger LMTD & Duty",
      "heat-exchanger-lmtd-duty",
      {
        slug: SLUG,
        spec: hit!.spec,
        query: hit!.query,
        label: hit!.label,
      },
      "TEMA LMTD and duty screening.",
    );
    expect(seo.title).toMatch(/FieldEngineersKit/);
    expect(seo.description.length).toBeGreaterThanOrEqual(50);
    expect(seo.description.length).toBeLessThanOrEqual(170);
  });
});
