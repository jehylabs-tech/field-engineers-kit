import { describe, expect, it } from "vitest";
import {
  calculatePsvReactionForce,
  computePsvReactionForce,
  DEFAULT_PSV_REACTION_FORCE_INPUTS,
  DEFAULT_PSV_REACTION_FORCE_INPUTS_IMPERIAL,
} from "@/lib/calculators/engines/psv-reaction-force";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";
import { getCalculatorSeo } from "../data/calculatorSeoData";

function expectNoPoison(out: ReturnType<typeof calculatePsvReactionForce>) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("psv-reaction-force", () => {
  it("default CO2 25000 kg/h NPS4 → F_total ≈ 5.98 kN", () => {
    const d = computePsvReactionForce(DEFAULT_PSV_REACTION_FORCE_INPUTS);
    expect(d.invalid).toBe(false);
    expect(d.velocityMs).toBeCloseTo(311, 0);
    expect(d.fSteadyN / 1000).toBeCloseTo(2.99, 1);
    expect(d.fTotalN / 1000).toBeCloseTo(5.98, 1);
    const out = calculatePsvReactionForce(DEFAULT_PSV_REACTION_FORCE_INPUTS);
    expect(out.heroValue).toMatch(/5\.9[0-9]|6\.0[0-9]/);
    expect(out.heroValue).toMatch(/kN/);
    expect(out.callouts?.length).toBeGreaterThanOrEqual(1);
    expect(out.callouts?.some((c) => c.tone === "warn")).toBe(true);
    expect(out.callouts?.some((c) => c.tone === "info")).toBe(true);
    expect(out.rows.length).toBeLessThanOrEqual(4);
    expect(out.rows.some((r) => /F_steady|F_total/.test(r.label))).toBe(false);
    expectNoPoison(out);
  });

  it("steam 50000 kg/h NPS6 open-discharge", () => {
    const d = computePsvReactionForce({
      ...DEFAULT_PSV_REACTION_FORCE_INPUTS,
      gasId: "steam",
      massFlow: 50000,
      relievingTemperature: 250,
      molecularWeight: 18.02,
      specificHeatRatio: 1.33,
      outletNps: "6",
    });
    expect(d.invalid).toBe(false);
    // Physics (not LLM hero 14.85 kN): F_total ≈ 21.8 kN
    expect(d.fSteadyN / 1000).toBeCloseTo(10.88, 1);
    expect(d.fTotalN / 1000).toBeCloseTo(21.77, 1);
    expect(d.fTotalN).toBeCloseTo(d.fSteadyN * 2, 1);
  });

  it("air and hydrocarbon imperial heroes match engine", () => {
    const air = computePsvReactionForce(
      DEFAULT_PSV_REACTION_FORCE_INPUTS_IMPERIAL,
    );
    // Spec LLM 1850/925 discarded — physics ≈ 1451 / 726 lbf
    expect(air.fSteadyN / 4.448221615).toBeCloseTo(726, -1);
    expect(air.fTotalN / 4.448221615).toBeCloseTo(1451, -1);

    const hc = computePsvReactionForce({
      ...DEFAULT_PSV_REACTION_FORCE_INPUTS_IMPERIAL,
      gasId: "hydrocarbon",
      massFlow: 100000,
      relievingTemperature: 400,
      molecularWeight: 58.12,
      specificHeatRatio: 1.12,
      outletNps: "8",
    });
    // Spec LLM 3120/1560 discarded — physics ≈ 1522 / 761 lbf
    expect(hc.fSteadyN / 4.448221615).toBeCloseTo(761, -1);
    expect(hc.fTotalN / 4.448221615).toBeCloseTo(1522, -1);
  });

  it("SEO table rows match CO₂ scan", () => {
    const seo = getCalculatorSeo("psv-reaction-force");
    const expected: Array<[string, string, string, string]> = [
      ["10 000", "3", "1.05", "2.09"],
      ["25 000", "4", "2.99", "5.98"],
      ["25 000", "6", "2.16", "4.32"],
      ["50 000", "6", "5.76", "11.51"],
      ["50 000", "8", "4.37", "8.75"],
      ["100 000", "8", "12.02", "24.04"],
    ];
    for (let i = 0; i < expected.length; i++) {
      const row = seo?.tableRows?.[i];
      expect(row?.[0]).toBe(expected[i][0]);
      expect(row?.[1]).toBe(expected[i][1]);
      expect(row?.[2]).toBe(expected[i][2]);
      expect(row?.[3]).toBe(expected[i][3]);
    }
  });

  it("force identity: F_steady = F_mom + F_press; F_total = F_steady × DLF", () => {
    const d = computePsvReactionForce(DEFAULT_PSV_REACTION_FORCE_INPUTS);
    expect(d.fSteadyN).toBeCloseTo(d.fMomentumN + d.fPressureN, 6);
    expect(d.fTotalN).toBeCloseTo(d.fSteadyN * d.dlf, 6);
    expect(d.dlf).toBe(2);
    // Displayed kN (2 dp) must sum without implying F_total = F_mom + F_press
    const mom = d.fMomentumN / 1000;
    const pr = d.fPressureN / 1000;
    const st = d.fSteadyN / 1000;
    const tot = d.fTotalN / 1000;
    expect(Number(mom.toFixed(2)) + Number(pr.toFixed(2))).toBeCloseTo(
      Number(st.toFixed(2)),
      1,
    );
    expect(Number(st.toFixed(2)) * 2).toBeCloseTo(Number(tot.toFixed(2)), 1);
  });

  it("closed-header drops pressure thrust", () => {
    const open = computePsvReactionForce(DEFAULT_PSV_REACTION_FORCE_INPUTS);
    const closed = computePsvReactionForce({
      ...DEFAULT_PSV_REACTION_FORCE_INPUTS,
      dischargeType: "closed-header",
    });
    expect(closed.fPressureN).toBe(0);
    expect(closed.fSteadyN).toBeCloseTo(open.fMomentumN, 3);
  });

  it("table scan rows stay consistent with engine", () => {
    const rows: Array<[number, string]> = [
      [10000, "3"],
      [25000, "4"],
      [25000, "6"],
      [50000, "6"],
      [50000, "8"],
      [100000, "8"],
    ];
    for (const [w, nps] of rows) {
      const d = computePsvReactionForce({
        ...DEFAULT_PSV_REACTION_FORCE_INPUTS,
        massFlow: w,
        outletNps: nps,
      });
      expect(d.invalid).toBe(false);
      expect(d.velocityMs).toBeCloseTo(311, 0);
      expect(d.fTotalN).toBeCloseTo(d.fSteadyN * 2, 1);
    }
  });

  it("SEO entry has full layout fields", () => {
    const seo = getCalculatorSeo("psv-reaction-force");
    expect(seo).toBeDefined();
    expect(seo?.allowancesAndTolerances).toBeDefined();
    expect(seo?.materialLimitations).toBeDefined();
    expect(seo?.workedExample).toBeDefined();
    expect(seo?.howToSteps?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.faq?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.workedExample?.conclusion).toMatch(/5\.98/);
  });

  it("wires Pattern B routes and findSpec", () => {
    expect(SLUG_TO_CALCULATOR_TYPE["psv-reaction-force"]).toBe(
      "psv-reaction-force",
    );
    const routes = listSpecRoutesForSlug("psv-reaction-force");
    expect(routes).toHaveLength(4);
    expect(
      resolveSpecRoute("psv-reaction-force", "co2-25000kgh-nps4-metric")?.query
        .gas,
    ).toBe("co2");
    expect(
      findSpecRouteForInputs("psv-reaction-force", {
        gas: "co2",
        flow: 25000,
        nps: "4",
        units: "metric",
      })?.spec,
    ).toBe("co2-25000kgh-nps4-metric");
    const seo = buildSpecSeoCopy(
      "PSV Reaction Force",
      "psv-reaction-force",
      routes[0],
      "API 520 Part II reaction force.",
    );
    expect(seo.title).toMatch(/PSV|Reaction/i);
    expect(seo.title).toMatch(/FieldEngineersKit/);
    expect(seo.title).not.toMatch(/Schedule 40/);
    expect(seo.h2).toMatch(/CO₂|CO2|25/);
    expect(seo.h2).not.toMatch(/4 Inch Schedule/);
  });
});
