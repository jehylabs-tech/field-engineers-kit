import { describe, expect, it } from "vitest";
import {
  calculateControlValveChoked,
  computeControlValveChoked,
  DEFAULT_CONTROL_VALVE_CHOKED_INPUTS,
} from "@/lib/calculators/engines/control-valve-choked-screening";
import {
  buildSpecSeoCopy,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";
import { barToPsi } from "@/lib/unitConverter";

function expectNoPoison(
  out: ReturnType<typeof calculateControlValveChoked>,
) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("control-valve-choked-screening", () => {
  it("gas default — non-choked x=0.60 < x_choked=0.70", () => {
    const c = computeControlValveChoked(DEFAULT_CONTROL_VALVE_CHOKED_INPUTS);
    expect(c.invalid).toBe(false);
    expect(c.x).toBeCloseTo(0.6, 3);
    expect(c.xChoked).toBeCloseTo(0.7, 3);
    expect(c.choked).toBe(false);
    expect(c.flowState).toBe("subsonic");
    const out = calculateControlValveChoked(DEFAULT_CONTROL_VALVE_CHOKED_INPUTS);
    expect(out.heroValue).toMatch(/Non-choked/i);
    expect(out.heroValue).toMatch(/0\.8[56]/);
    expect(out.heroStatus).toMatch(/Near limit|OK/i);
    expect(out.callouts).toHaveLength(1);
    expect(out.rows).toHaveLength(3);
    expect(out.rows.some((r) => /Risk/i.test(r.label))).toBe(false);
    expect(out.heroBadges?.some((b) => b.label === "Headroom")).toBe(true);
    expectNoPoison(out);
  });

  it("gas P2=2 bar — choked x=0.80 ≥ 0.70, ΔP_max=7 bar", () => {
    const c = computeControlValveChoked({
      ...DEFAULT_CONTROL_VALVE_CHOKED_INPUTS,
      p2: 2,
    });
    expect(c.x).toBeCloseTo(0.8, 3);
    expect(c.choked).toBe(true);
    expect(c.deltaPMaxGasBar).toBeCloseTo(7.0, 2);
    expect(c.flowState).toBe("choked");
    const out = calculateControlValveChoked({
      ...DEFAULT_CONTROL_VALVE_CHOKED_INPUTS,
      p2: 2,
    });
    expect(out.heroValue).toMatch(/Choked/i);
    expect(out.heroStatusLevel).toBe("fail");
  });

  it("liquid P1=15 P2=2 FL=0.90 — cavitation hazard", () => {
    const c = computeControlValveChoked({
      ...DEFAULT_CONTROL_VALVE_CHOKED_INPUTS,
      fluidState: "liquid",
      p1: 15,
      p2: 2,
      flFactor: 0.9,
      vaporPressure: 0.0317,
      criticalPressure: 220.64,
    });
    expect(c.deltaPBar).toBeCloseTo(13.0, 1);
    expect(c.deltaPCavBar).toBeCloseTo(12.1, 1);
    expect(c.choked).toBe(true);
    expect(c.flowState).toBe("cavitating");
    const out = calculateControlValveChoked({
      ...DEFAULT_CONTROL_VALVE_CHOKED_INPUTS,
      fluidState: "liquid",
      p1: 15,
      p2: 2,
      flFactor: 0.9,
      vaporPressure: 0.0317,
      criticalPressure: 220.64,
    });
    expect(out.heroValue).toMatch(/Cavitation/i);
    expect(out.rows).toHaveLength(2);
    expect(out.rows.some((r) => /Max effective/i.test(r.label))).toBe(false);
  });

  it("liquid P1=8 P2=5 FL=0.85 — normal liquid", () => {
    const c = computeControlValveChoked({
      ...DEFAULT_CONTROL_VALVE_CHOKED_INPUTS,
      fluidState: "liquid",
      p1: 8,
      p2: 5,
      flFactor: 0.85,
      vaporPressure: 0.0317,
      criticalPressure: 220.64,
    });
    expect(c.deltaPBar).toBeCloseTo(3.0, 1);
    expect(c.deltaPCavBar).toBeCloseTo(5.76, 1);
    expect(c.choked).toBe(false);
    expect(c.flowState).toBe("normal_liquid");
  });

  it("imperial absolute pressures match metric gas choke", () => {
    const metric = computeControlValveChoked({
      ...DEFAULT_CONTROL_VALVE_CHOKED_INPUTS,
      p2: 2,
    });
    const imperial = computeControlValveChoked({
      ...DEFAULT_CONTROL_VALVE_CHOKED_INPUTS,
      unitSystem: "imperial",
      p1: Number(barToPsi(10).toFixed(2)),
      p2: Number(barToPsi(2).toFixed(2)),
    });
    expect(imperial.x).toBeCloseTo(metric.x, 2);
    expect(imperial.choked).toBe(true);
  });

  it("wires pSEO routes and SEO copy", () => {
    expect(SLUG_TO_CALCULATOR_TYPE["control-valve-choked-screening"]).toBe(
      "control-valve-choked-screening",
    );
    const routes = listSpecRoutesForSlug("control-valve-choked-screening");
    expect(routes).toHaveLength(4);
    expect(
      resolveSpecRoute(
        "control-valve-choked-screening",
        "gas-p1-10bar-p2-4bar-xt070",
      )?.query.fluidState,
    ).toBe("gas");
    const seo = buildSpecSeoCopy(
      "Control Valve Choked Flow",
      "control-valve-choked-screening",
      routes[0],
      "ISA-75.01 choked flow screening.",
    );
    expect(seo.title).toMatch(/Control Valve Choked/i);
  });
});
