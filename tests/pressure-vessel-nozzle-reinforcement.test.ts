import { describe, expect, it } from "vitest";
import {
  calculatePressureVesselNozzleReinforcement,
  computePressureVesselNozzleReinforcement,
  DEFAULT_PRESSURE_VESSEL_NOZZLE_REINFORCEMENT_INPUTS,
} from "@/lib/calculators/engines/pressure-vessel-nozzle-reinforcement";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  parseSpecToQuery,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { getCalculatorSeo } from "../data/calculatorSeoData";

const SLUG = "pressure-vessel-nozzle-reinforcement";

describe("pressure-vessel-nozzle-reinforcement", () => {
  it("default metric duty Passes with pad and matches engine A / A_avail", () => {
    const c = computePressureVesselNozzleReinforcement(
      DEFAULT_PRESSURE_VESSEL_NOZZLE_REINFORCEMENT_INPUTS,
    );
    expect(c.invalid).toBe(false);
    expect(c.statusLevel).toBe("pass");
    expect(c.padRequired).toBe(true);
    expect(c.A).toBeCloseTo(1337, 0);
    expect(c.Aavail).toBeCloseTo(2664, 0);
    expect(c.tpMin).toBeCloseTo(2.88, 1);

    const out = calculatePressureVesselNozzleReinforcement(
      DEFAULT_PRESSURE_VESSEL_NOZZLE_REINFORCEMENT_INPUTS,
    );
    expect(out.heroValue).toBe("Pass");
    expect(out.heroStatusLevel).toBe("pass");
  });

  it("NPS 12 metric duty remains Repad Required at given pad", () => {
    const c = computePressureVesselNozzleReinforcement({
      unitSystem: "metric",
      shellType: "cylindrical-shell",
      shellInsideDiameter: 1500,
      designPressure: 3,
      designTemperature: 200,
      shellThickness: 18,
      shellMaterialId: "SA-516-70",
      jointEfficiency: 1,
      nozzleNps: "12",
      nozzleOutsideDiameter: 323.85,
      nozzleThickness: 12.7,
      nozzleMaterialId: "SA-106-B",
      corrosionAllowance: 3,
      padOutsideDiameter: 500,
      padThickness: 16,
      insideProjection: 0,
      weldLeg: 0,
    });
    expect(c.invalid).toBe(false);
    expect(c.statusLevel).toBe("fail");
    expect(c.A).toBeCloseTo(5033, 0);
    expect(c.A42).toBeCloseTo(2818, 0);
    expect(c.tpMin).toBeGreaterThan(16);

    const out = calculatePressureVesselNozzleReinforcement({
      unitSystem: "metric",
      shellType: "cylindrical-shell",
      shellInsideDiameter: 1500,
      designPressure: 3,
      designTemperature: 200,
      shellThickness: 18,
      shellMaterialId: "SA-516-70",
      jointEfficiency: 1,
      nozzleNps: "12",
      nozzleOutsideDiameter: 323.85,
      nozzleThickness: 12.7,
      nozzleMaterialId: "SA-106-B",
      corrosionAllowance: 3,
      padOutsideDiameter: 500,
      padThickness: 16,
      insideProjection: 0,
      weldLeg: 0,
    });
    expect(out.heroValue).toBe("Repad Required");
  });

  it("imperial NPS 4 Passes with 0.5 in pad", () => {
    const c = computePressureVesselNozzleReinforcement({
      unitSystem: "imperial",
      shellType: "cylindrical-shell",
      shellInsideDiameter: 48,
      designPressure: 300,
      designTemperature: 300,
      shellThickness: 0.625,
      shellMaterialId: "SA-516-70",
      jointEfficiency: 1,
      nozzleNps: "4",
      nozzleOutsideDiameter: 4.5,
      nozzleThickness: 0.337,
      nozzleMaterialId: "SA-106-B",
      corrosionAllowance: 0.125,
      padOutsideDiameter: 12,
      padThickness: 0.5,
      insideProjection: 0,
      weldLeg: 0,
    });
    expect(c.invalid).toBe(false);
    expect(c.statusLevel).toBe("pass");
    expect(c.A).toBeCloseTo(1.48, 2);
    expect(c.Aavail).toBeGreaterThan(c.A);
  });

  it("imperial NPS 10 SS duty is Repad Required at tp = 0.5 in", () => {
    const c = computePressureVesselNozzleReinforcement({
      unitSystem: "imperial",
      shellType: "cylindrical-shell",
      shellInsideDiameter: 60,
      designPressure: 450,
      designTemperature: 350,
      shellThickness: 0.75,
      shellMaterialId: "SA-240-316L",
      jointEfficiency: 1,
      nozzleNps: "10",
      nozzleOutsideDiameter: 10.75,
      nozzleThickness: 0.365,
      nozzleMaterialId: "SA-312-316L",
      corrosionAllowance: 0,
      padOutsideDiameter: 20,
      padThickness: 0.5,
      insideProjection: 0,
      weldLeg: 0,
    });
    expect(c.invalid).toBe(false);
    expect(c.statusLevel).toBe("fail");
    expect(c.A).toBeCloseTo(9.57, 1);
    expect(c.tpMin).toBeCloseTo(0.95, 1);
  });

  it("lists Pattern B spec routes and resolves findSpec / parseSpec", () => {
    const routes = listSpecRoutesForSlug(SLUG);
    expect(routes.length).toBeGreaterThanOrEqual(4);
    expect(routes.some((r) => r.spec === "nps6-shell1200-2mpa-metric")).toBe(
      true,
    );

    const parsed = parseSpecToQuery("nps6-shell1200-2mpa-metric");
    expect(parsed?.nps).toBe("6");
    expect(parsed?.shellId).toBe("1200");
    expect(parsed?.units).toBe("metric");

    const hit = findSpecRouteForInputs(SLUG, {
      nps: "6",
      shellId: "1200",
      p: "2.0",
      units: "metric",
    });
    expect(hit?.spec).toBe("nps6-shell1200-2mpa-metric");

    const hitImp = findSpecRouteForInputs(SLUG, {
      nps: "10",
      shellId: "60",
      p: "450",
      units: "imperial",
    });
    expect(hitImp?.spec).toBe("nps10-shell60in-450psi-imperial");
  });

  it("SEO entry has full-layout triad + howTo + faq≥3", () => {
    const seo = getCalculatorSeo(SLUG);
    expect(seo).toBeDefined();
    expect(seo?.allowancesAndTolerances).toBeDefined();
    expect(seo?.materialLimitations).toBeDefined();
    expect(seo?.workedExample).toBeDefined();
    expect(seo?.howToSteps?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.faq?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.workedExample?.conclusion).toMatch(/1337/);
  });

  it("buildSpecSeoCopy / resolveSpecRoute for representative spec", () => {
    const route = resolveSpecRoute(SLUG, "nps6-shell1200-2mpa-metric");
    expect(route?.spec).toBe("nps6-shell1200-2mpa-metric");
    const copy = buildSpecSeoCopy(
      "ASME Nozzle Reinforcement Pad Calculator",
      "pressure-vessel-nozzle-reinforcement",
      route!,
    );
    expect(copy.title).toContain("FieldEngineersKit");
    expect(copy.h2).toMatch(/UG-37/);
  });
});
