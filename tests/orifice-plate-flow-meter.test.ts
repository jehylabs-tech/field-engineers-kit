import { describe, expect, it } from "vitest";
import {
  calculateOrificePlateFlow,
  computeOrificePlateFlow,
  DEFAULT_ORIFICE_PLATE_FLOW_INPUTS,
} from "@/lib/calculators/engines/orifice-plate-flow-meter";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";

function expectNoPoison(out: ReturnType<typeof calculateOrificePlateFlow>) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("orifice-plate-flow-meter", () => {
  it("default NPS 4 Sch 40 · d50 · Δp 25 kPa (ISO 5167)", () => {
    const c = computeOrificePlateFlow(DEFAULT_ORIFICE_PLATE_FLOW_INPUTS);
    expect(c.invalid).toBe(false);
    expect(c.diMm).toBeCloseTo(102.26, 2);
    expect(c.beta).toBeCloseTo(0.489, 2);
    expect(c.C).toBeCloseTo(0.606, 2);
    expect(c.permanentLossKpa).toBeCloseTo(18.6, 0);
    expect(c.qM3h).toBeCloseTo(31.2, 0);
    const out = calculateOrificePlateFlow(DEFAULT_ORIFICE_PLATE_FLOW_INPUTS);
    expect(out.heroValue).toMatch(/31\.\d m³\/h/);
    expect(out.heroStatusLevel).toBe("neutral");
    expect(out.rows.some((r) => /Differential pressure/i.test(r.label))).toBe(
      false,
    );
    expect(out.rows.some((r) => /Permanent pressure loss/i.test(r.label))).toBe(
      true,
    );
    expect(out.callouts?.some((x) => /ISO 5167-2/i.test(x.body))).toBe(true);
    expectNoPoison(out);
  });

  it("warns when density looks like gas (ε = 1 screening)", () => {
    const out = calculateOrificePlateFlow({
      ...DEFAULT_ORIFICE_PLATE_FLOW_INPUTS,
      fluidDensity: 1.225,
      dynamicViscosity: 0.018,
    });
    expect(out.callouts?.some((x) => /ε held at 1\.0/i.test(x.title))).toBe(
      true,
    );
    expectNoPoison(out);
  });

  it("rejects orifice bore larger than pipe ID", () => {
    const out = calculateOrificePlateFlow({
      ...DEFAULT_ORIFICE_PLATE_FLOW_INPUTS,
      unitSystem: "imperial",
      orificeDiameter: 19.685,
      deltaP: 3.626,
      fluidDensity: 62.3,
    });
    expect(out.heroValue).toBe("—");
    expect(out.heroStatusLevel).toBe("fail");
    expect(out.callouts?.[0]?.body).toMatch(/smaller than pipe inside diameter/i);
  });

  it("does not rematch orifice duty on NPS alone", () => {
    const hit = findSpecRouteForInputs("orifice-plate-flow-meter", {
      nps: "4",
      schedule: "40",
      sch: "40",
      orificeDiameter: "1.969",
      deltaP: "3.626",
      units: "imperial",
    });
    expect(hit).toBeUndefined();
  });

  it("matches listed orifice duty when units and bore agree", () => {
    const hit = findSpecRouteForInputs("orifice-plate-flow-meter", {
      nps: "4",
      schedule: "40",
      sch: "40",
      orificeDiameter: "50",
      deltaP: "25",
      units: "metric",
    });
    expect(hit?.spec).toBe("4inch-sch40-d50mm-dp25kpa");
  });

  it("matches pSEO geometry / loss duties", () => {
    const d2 = computeOrificePlateFlow({
      unitSystem: "metric",
      nps: "6",
      schedule: "40",
      orificeDiameter: 80,
      deltaP: 40,
      fluidDensity: 998.2,
      dynamicViscosity: 1,
      tapType: "flange",
    });
    expect(d2.beta).toBeCloseTo(0.519, 2);
    expect(d2.C).toBeCloseTo(0.605, 2);
    expect(d2.permanentLossKpa).toBeCloseTo(28.5, 0);
    expect(d2.qM3h).toBeCloseTo(101.8, 0);

    const d3 = computeOrificePlateFlow({
      unitSystem: "metric",
      nps: "2",
      schedule: "40",
      orificeDiameter: 25,
      deltaP: 15,
      fluidDensity: 998.2,
      dynamicViscosity: 1,
      tapType: "flange",
    });
    expect(d3.beta).toBeCloseTo(0.476, 2);
    expect(d3.permanentLossKpa).toBeCloseTo(11.3, 0);
    expect(d3.qM3h).toBeCloseTo(6.0, 0);

    const d4 = computeOrificePlateFlow({
      unitSystem: "metric",
      nps: "8",
      schedule: "40",
      orificeDiameter: 100,
      deltaP: 30,
      fluidDensity: 998.2,
      dynamicViscosity: 1,
      tapType: "flange",
    });
    expect(d4.beta).toBeCloseTo(0.493, 2);
    expect(d4.permanentLossKpa).toBeCloseTo(22.2, 0);
    expect(d4.qM3h).toBeCloseTo(136.6, 0);
  });

  it("resolves Pattern B specs", () => {
    expect(
      resolveSpecRoute(
        "orifice-plate-flow-meter",
        "4inch-sch40-d50mm-dp25kpa",
      )?.query,
    ).toMatchObject({
      nps: "4",
      schedule: "40",
      orificeDiameter: "50",
      deltaP: "25",
    });
    const routes = listSpecRoutesForSlug("orifice-plate-flow-meter");
    expect(routes).toHaveLength(4);
    const copy = buildSpecSeoCopy(
      "Orifice Plate Flow",
      SLUG_TO_CALCULATOR_TYPE["orifice-plate-flow-meter"],
      routes[0],
      "meta",
    );
    expect(copy.title).toMatch(/Orifice Plate Flow/i);
  });
});
