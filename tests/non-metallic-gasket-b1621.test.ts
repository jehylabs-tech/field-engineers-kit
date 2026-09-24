import { describe, expect, it } from "vitest";
import {
  calculateNonMetallicGasketB1621,
  computeNonMetallicGasketB1621,
  DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS,
  DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS_IMPERIAL,
  effectiveSeatingWidthMm,
} from "@/lib/calculators/engines/non-metallic-gasket-b1621";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";
import { getCalculatorSeo } from "../data/calculatorSeoData";

const SLUG = "non-metallic-gasket-b1621";

describe("non-metallic-gasket-b1621", () => {
  it("default NPS4 Class150 IBC → OD×ID from B16.5 RF × pipe OD; Wm2 ≈ 100.9 kN", () => {
    const d = computeNonMetallicGasketB1621(
      DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS,
    );
    expect(d.invalid).toBe(false);
    // Spec LLM 174.6 mm discarded — table RF OD
    expect(d.odMm).toBeCloseTo(157.2, 1);
    expect(d.idMm).toBeCloseTo(114.3, 1);
    expect(d.wm2N / 1000).toBeCloseTo(100.9, 0);
    const out = calculateNonMetallicGasketB1621(
      DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS,
    );
    expect(out.heroValue).toMatch(/157/);
    expect(out.heroValue).toMatch(/114/);
    expect(out.rows.length).toBeLessThanOrEqual(3);
    expect(out.callouts?.some((c) => c.tone === "info")).toBe(true);
    expect(out.callouts?.every((c) => c.tone !== "warn")).toBe(true);
  });

  it("NPS8 Class300 full-face PTFE uses flange OD", () => {
    const d = computeNonMetallicGasketB1621({
      ...DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS,
      nps: "8",
      pressureClass: "300",
      gasketProfile: "full-face",
      materialId: "ptfe-ePTFE",
      thicknessId: "3.2",
      pressure: 20,
    });
    expect(d.invalid).toBe(false);
    expect(d.odMm).toBeCloseTo(381.0, 0);
    expect(d.idMm).toBeCloseTo(219.1, 0);
    expect(d.boltHoleCount).toBeGreaterThan(0);
    expect(d.boltCircleMm).toBeGreaterThan(0);
    // Spec LLM Wm2 368.5 kN discarded — physics with y=1600 psi
    expect(d.wm2N / 1000).toBeCloseTo(841.8, 0);
    const out = calculateNonMetallicGasketB1621({
      ...DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS,
      nps: "8",
      pressureClass: "300",
      gasketProfile: "full-face",
      materialId: "ptfe-ePTFE",
      thicknessId: "3.2",
      pressure: 20,
    });
    expect(out.callouts?.some((c) => c.tone === "warn")).toBe(true);
  });

  it("imperial graphite NPS3 IBC", () => {
    const d = computeNonMetallicGasketB1621(
      DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS_IMPERIAL,
    );
    expect(d.invalid).toBe(false);
    expect(d.odMm / 25.4).toBeCloseTo(5.0, 1);
    expect(d.idMm / 25.4).toBeCloseTo(3.5, 1);
    expect(d.yPsi).toBe(900);
  });

  it("soft rubber y=0 → Wm2=0", () => {
    const d = computeNonMetallicGasketB1621({
      ...DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS_IMPERIAL,
      nps: "12",
      gasketProfile: "full-face",
      materialId: "neoprene-rubber",
      thicknessId: "3.2",
      pressure: 50,
    });
    expect(d.odMm / 25.4).toBeCloseTo(19.09, 1);
    expect(d.wm2N).toBe(0);
  });

  it("B16.47 selection is invalid in Phase-1", () => {
    const d = computeNonMetallicGasketB1621({
      ...DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS,
      flangeStandard: "b16.47-a",
    });
    expect(d.invalid).toBe(true);
  });

  it("App. 2 effective width switches at 1/4 in", () => {
    const narrow = effectiveSeatingWidthMm(10); // N=10 → b0=5 mm < 6.35
    expect(narrow.bMm).toBeCloseTo(narrow.b0Mm, 5);
    const wide = effectiveSeatingWidthMm(42.9);
    expect(wide.b0Mm).toBeGreaterThan(6.35);
    expect(wide.bMm).toBeLessThan(wide.b0Mm);
  });

  it("SEO full layout + table matches Class 150 IBC scan", () => {
    const seo = getCalculatorSeo(SLUG);
    expect(seo?.allowancesAndTolerances).toBeDefined();
    expect(seo?.materialLimitations).toBeDefined();
    expect(seo?.workedExample).toBeDefined();
    expect(seo?.howToSteps?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.faq?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.workedExample?.conclusion).toMatch(/100\.9|157\.2/);
    const row4 = seo?.tableRows?.find((r) => r[0] === "4");
    expect(row4?.[1]).toBe("157.2");
    expect(row4?.[3]).toBe("100.9");
  });

  it("wires Pattern B routes and findSpec", () => {
    expect(SLUG_TO_CALCULATOR_TYPE[SLUG]).toBe("non-metallic-gasket-b1621");
    const routes = listSpecRoutesForSlug(SLUG);
    expect(routes).toHaveLength(4);
    expect(
      resolveSpecRoute(SLUG, "nps4-class150-ibc-metric")?.query.type,
    ).toBe("ibc");
    expect(
      findSpecRouteForInputs(SLUG, {
        nps: "4",
        class: "150",
        type: "ibc",
        units: "metric",
      })?.spec,
    ).toBe("nps4-class150-ibc-metric");
    const seo = buildSpecSeoCopy(
      "B16.21 Flat Gasket",
      "non-metallic-gasket-b1621",
      routes[0],
      "ASME B16.21 flat gasket dimensions.",
    );
    expect(seo.title).toMatch(/FieldEngineersKit/);
    expect(seo.h2).not.toMatch(/Schedule 40/);
    expect(seo.h2).toMatch(/NPS 4|IBC/i);
  });
});
