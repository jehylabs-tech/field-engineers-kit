import { describe, expect, it } from "vitest";
import {
  calculateControlValveNoise,
  computeControlValveNoise,
  DEFAULT_CONTROL_VALVE_NOISE_INPUTS,
} from "@/lib/calculators/engines/control-valve-noise";
import {
  buildSpecSeoCopy,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";
import { barToPsi, cToF } from "@/lib/unitConverter";

function expectNoPoison(
  out: ReturnType<typeof calculateControlValveNoise>,
) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("control-valve-noise", () => {
  it("default NPS 4 Sch 40 gas Cv120 ≈ 84.6 dBA", () => {
    const c = computeControlValveNoise(DEFAULT_CONTROL_VALVE_NOISE_INPUTS);
    expect(c.invalid).toBe(false);
    expect(c.lp1mDba).toBeCloseTo(84.6, 0);
    expect(c.severity).toBe("safe");
    expect(c.mach).toBe(1);
    const out = calculateControlValveNoise(DEFAULT_CONTROL_VALVE_NOISE_INPUTS);
    expect(out.heroValue).toMatch(/84\.\d dBA/);
    expect(out.heroStatus).toMatch(/Safe Level/i);
    expect(out.heroStatus).not.toMatch(/84\.\d dBA/);
    expect(out.heroBadges?.find((b) => b.label === "Regime")?.value).toBe(
      "Choked",
    );
    expect(out.callouts?.some((x) => /IEC 60534-8-3/i.test(x.body))).toBe(
      true,
    );
    expectNoPoison(out);
  });

  it("matches pSEO duties", () => {
    const d2 = computeControlValveNoise({
      unitSystem: "metric",
      nps: "6",
      schedule: "40",
      fluidType: "gas",
      cv: 300,
      p1: 25,
      p2: 3,
      temp: 25,
      massFlow: 45_000,
    });
    expect(d2.lp1mDba).toBeCloseTo(96.2, 0);
    expect(d2.regime).toBe("choked");
    expect(d2.mach).toBe(1);
    expect(d2.severity).toBe("high");

    const d3Inputs = {
      unitSystem: "metric" as const,
      nps: "3",
      schedule: "80",
      fluidType: "liquid" as const,
      cv: 75,
      p1: 15,
      p2: 2,
      temp: 25,
      massFlow: 35_000,
    };
    const d3 = computeControlValveNoise(d3Inputs);
    expect(d3.lp1mDba).toBeCloseTo(88.1, 0);
    expect(d3.regime).toBe("cavitating");
    const out3 = calculateControlValveNoise(d3Inputs);
    expect(out3.rows.some((r) => /ΔP \/ P/i.test(r.label))).toBe(true);
    expect(out3.rows.some((r) => /Mach/i.test(r.label))).toBe(false);

    const d4 = computeControlValveNoise({
      unitSystem: "metric",
      nps: "8",
      schedule: "40",
      fluidType: "gas",
      cv: 500,
      p1: 8,
      p2: 1.5,
      temp: 25,
      massFlow: 80_000,
    });
    expect(d4.lp1mDba).toBeCloseTo(83.1, 0);
    expect(d4.severity).toBe("safe");
  });

  it("imperial gas duty matches metric Lp", () => {
    const metric = computeControlValveNoise({
      unitSystem: "metric",
      nps: "6",
      schedule: "40",
      fluidType: "gas",
      cv: 300,
      p1: 25,
      p2: 3,
      temp: 25,
      massFlow: 45_000,
    });
    const imperial = computeControlValveNoise({
      unitSystem: "imperial",
      nps: "6",
      schedule: "40",
      fluidType: "gas",
      cv: 300,
      p1: Number(barToPsi(25).toFixed(1)),
      p2: Number(barToPsi(3).toFixed(1)),
      temp: Number(cToF(25).toFixed(0)),
      massFlow: Number((45_000 / 0.45359237).toFixed(0)),
    });
    expect(imperial.lp1mDba).toBeCloseTo(metric.lp1mDba, 0);
  });

  it("resolves Pattern B specs", () => {
    expect(
      resolveSpecRoute("control-valve-noise", "4inch-sch40-gas-cv120")?.query,
    ).toMatchObject({
      nps: "4",
      schedule: "40",
      fluidType: "gas",
      cv: "120",
    });
    const routes = listSpecRoutesForSlug("control-valve-noise");
    expect(routes).toHaveLength(4);
    const copy = buildSpecSeoCopy(
      "Control Valve Noise",
      SLUG_TO_CALCULATOR_TYPE["control-valve-noise"],
      routes[0],
      "meta",
    );
    expect(copy.title).toMatch(/Control Valve Noise/i);
    expect(copy.h1).toMatch(/4"/);
  });
});
