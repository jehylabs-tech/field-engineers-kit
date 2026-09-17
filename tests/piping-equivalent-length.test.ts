import { describe, expect, it } from "vitest";
import {
  calculatePipingEquivalentLength,
  computePipingEquivalentLength,
  DEFAULT_PIPING_EQUIVALENT_LENGTH_INPUTS,
} from "@/lib/calculators/engines/piping-equivalent-length";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";

function expectNoPoison(out: ReturnType<typeof calculatePipingEquivalentLength>) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("piping-equivalent-length", () => {
  it("defaults NPS 2 Sch 40 · 90° std elbow ≈ 1.58 m", () => {
    const c = computePipingEquivalentLength(
      DEFAULT_PIPING_EQUIVALENT_LENGTH_INPUTS,
    );
    expect(c.invalid).toBe(false);
    expect(c.diMm).toBeCloseTo(52.51, 2);
    expect(c.ldRatio).toBe(30);
    expect(c.fT).toBeCloseTo(0.019, 3);
    expect(c.kSingle).toBeCloseTo(0.57, 2);
    expect(c.leqTotalM).toBeCloseTo(1.5753, 2);
    expect(c.leqTotalFt).toBeCloseTo(5.17, 1);
    const out = calculatePipingEquivalentLength(
      DEFAULT_PIPING_EQUIVALENT_LENGTH_INPUTS,
    );
    expect(out.heroValue).toMatch(/^1\.58 m · 5\.17 ft$/);
    expect(out.heroStatusLevel).toBe("neutral");
    expect(out.rows.some((r) => r.label === "L_eq")).toBe(true);
    expect(out.rows.some((r) => /Total L_eq/i.test(r.label))).toBe(false);
    expect(out.callouts?.some((x) => /Crane TP-410/i.test(x.body))).toBe(true);
    expectNoPoison(out);
  });

  it("imperial hero leads with feet and multi-qty splits unit/total", () => {
    const out = calculatePipingEquivalentLength({
      ...DEFAULT_PIPING_EQUIVALENT_LENGTH_INPUTS,
      unitSystem: "imperial",
      quantity: 3,
    });
    expect(out.heroValue).toMatch(/^15\.50 ft · 4\.73 m$/);
    expect(out.heroLabel).toBe("Total equivalent length");
    expect(out.rows.some((r) => /Unit L_eq/i.test(r.label))).toBe(true);
    expect(out.rows.some((r) => /Total L_eq/i.test(r.label))).toBe(true);
    expect(out.heroBadges?.find((b) => b.label === "D_i")?.value).toMatch(
      /in$/,
    );
    expect(out.heroBadges?.find((b) => b.label === "K Σ")?.value).toBe("1.71");
    expectNoPoison(out);
  });

  it("matches pSEO duties", () => {
    const gate = computePipingEquivalentLength({
      unitSystem: "imperial",
      nps: "4",
      schedule: "40",
      fittingType: "gate_valve_full",
      quantity: 1,
    });
    expect(gate.diMm).toBeCloseTo(102.26, 2);
    expect(gate.ldRatio).toBe(8);
    expect(gate.fT).toBeCloseTo(0.017, 3);
    expect(gate.kSingle).toBeCloseTo(0.14, 2);
    expect(gate.leqTotalM).toBeCloseTo(0.818, 2);

    const globe = computePipingEquivalentLength({
      unitSystem: "metric",
      nps: "6",
      schedule: "40",
      fittingType: "globe_valve_std",
      quantity: 1,
    });
    expect(globe.diMm).toBeCloseTo(154.06, 2);
    expect(globe.ldRatio).toBe(340);
    expect(globe.fT).toBeCloseTo(0.015, 3);
    expect(globe.kSingle).toBeCloseTo(5.1, 2);
    expect(globe.leqTotalM).toBeCloseTo(52.38, 2);

    const elbow45 = computePipingEquivalentLength({
      unitSystem: "imperial",
      nps: "3",
      schedule: "80",
      fittingType: "45_elbow",
      quantity: 1,
    });
    expect(elbow45.diMm).toBeCloseTo(73.66, 2);
    expect(elbow45.ldRatio).toBe(16);
    expect(elbow45.fT).toBeCloseTo(0.018, 3);
    expect(elbow45.kSingle).toBeCloseTo(0.29, 2);
    expect(elbow45.leqTotalM).toBeCloseTo(1.179, 2);
  });

  it("scales with quantity", () => {
    const c = computePipingEquivalentLength({
      ...DEFAULT_PIPING_EQUIVALENT_LENGTH_INPUTS,
      quantity: 4,
    });
    expect(c.leqTotalM).toBeCloseTo(1.5753 * 4, 2);
    expect(c.kTotal).toBeCloseTo(0.57 * 4, 2);
  });

  it("resolves Pattern B specs", () => {
    expect(
      resolveSpecRoute("piping-equivalent-length", "2inch-sch40-90-elbow-std")
        ?.query,
    ).toMatchObject({
      nps: "2",
      schedule: "40",
      fittingType: "90_elbow_std",
    });
    expect(
      findSpecRouteForInputs("piping-equivalent-length", {
        nps: "4",
        schedule: "40",
        fittingType: "gate_valve_full",
      })?.spec,
    ).toBe("4inch-sch40-gate-valve-full");

    const routes = listSpecRoutesForSlug("piping-equivalent-length");
    expect(routes.map((r) => r.spec)).toEqual([
      "2inch-sch40-90-elbow-std",
      "4inch-sch40-gate-valve-full",
      "6inch-sch40-globe-valve-std",
      "3inch-sch80-45-elbow",
    ]);
    expect(SLUG_TO_CALCULATOR_TYPE["piping-equivalent-length"]).toBe(
      "piping-equivalent-length",
    );

    const seo = buildSpecSeoCopy(
      "Piping Equivalent Length Calculator (Fittings & Valves)",
      SLUG_TO_CALCULATOR_TYPE["piping-equivalent-length"],
      routes[0],
      null,
    );
    expect(seo.h1).toMatch(/2"/);
  });
});
