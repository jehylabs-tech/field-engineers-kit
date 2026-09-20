import { describe, expect, it } from "vitest";
import {
  api520GasConstantC,
  calculatePsvPrvScreening,
  computePsvPrvScreening,
  DEFAULT_PSV_PRV_INPUTS,
} from "@/lib/calculators/engines/psv-prv-screening";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";

function expectNoPoison(out: ReturnType<typeof calculatePsvPrvScreening>) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("psv-prv-screening", () => {
  it("gas default 10 barg · 5000 kg/h air → orifice H", () => {
    const c = computePsvPrvScreening(DEFAULT_PSV_PRV_INPUTS);
    expect(c.invalid).toBe(false);
    expect(c.p1BarAbs).toBeCloseTo(12.013, 2);
    expect(c.aReqMm2).toBeCloseTo(506, 0);
    expect(c.letter).toBe("H");
    expect(api520GasConstantC(1.4)).toBeCloseTo(356.06, 1);
    const out = calculatePsvPrvScreening(DEFAULT_PSV_PRV_INPUTS);
    expect(out.heroValue).toMatch(/“H”|"H"|H/);
    expect(out.callouts).toHaveLength(1);
    expect(out.rows.length).toBeLessThanOrEqual(4);
    expectNoPoison(out);
  });

  it("gas 20 barg · 10000 kg/h → orifice J", () => {
    const c = computePsvPrvScreening({
      ...DEFAULT_PSV_PRV_INPUTS,
      setPressure: 20,
      requiredCapacity: 10000,
    });
    expect(c.letter).toBe("J");
    expect(c.aReqMm2).toBeCloseTo(528, 0);
  });

  it("liquid 15 barg · 1000 L/min water → orifice H", () => {
    const c = computePsvPrvScreening({
      ...DEFAULT_PSV_PRV_INPUTS,
      fluidType: "liquid",
      setPressure: 15,
      requiredCapacity: 1000,
      liquidDensity: 1,
    });
    expect(c.letter).toBe("H");
    expect(c.aReqMm2).toBeCloseTo(446, 0);
  });

  it("gas 5 barg · 20000 kg/h → orifice P", () => {
    const c = computePsvPrvScreening({
      ...DEFAULT_PSV_PRV_INPUTS,
      setPressure: 5,
      requiredCapacity: 20000,
    });
    expect(c.letter).toBe("P");
    expect(c.aReqMm2).toBeGreaterThan(3700);
  });

  it("wires pSEO routes and findSpec", () => {
    expect(SLUG_TO_CALCULATOR_TYPE["psv-prv-screening"]).toBe(
      "psv-prv-screening",
    );
    const routes = listSpecRoutesForSlug("psv-prv-screening");
    expect(routes).toHaveLength(4);
    expect(
      resolveSpecRoute("psv-prv-screening", "gas-p10barg-w5000kgh")?.query
        .fluidType,
    ).toBe("gas");
    expect(
      findSpecRouteForInputs("psv-prv-screening", {
        fluidType: "gas",
        setPressure: 10,
        requiredCapacity: 5000,
        units: "metric",
      })?.spec,
    ).toBe("gas-p10barg-w5000kgh");
    const seo = buildSpecSeoCopy(
      "PSV / PRV Orifice Screening",
      "psv-prv-screening",
      routes[0],
      "API 520 / 526 PSV sizing.",
    );
    expect(seo.title).toMatch(/PSV/i);
  });
});
