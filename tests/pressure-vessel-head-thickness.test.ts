import { describe, expect, it } from "vitest";
import {
  calculatePressureVesselHeadThickness,
  computePressureVesselHeadThickness,
  DEFAULT_PRESSURE_VESSEL_HEAD_THICKNESS_INPUTS,
  mawpForHeadThickness,
  requiredHeadThickness,
} from "@/lib/calculators/engines/pressure-vessel-head-thickness";
import { getAsmeViiiAllowableStress } from "@/lib/calculators/data/asmeViiiDiv1AllowableStress";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";
import { getCalculatorSeo } from "../data/calculatorSeoData";

const SLUG = "pressure-vessel-head-thickness";

describe("pressure-vessel-head-thickness", () => {
  it("SA-516-70 S at 150 °C ≈ 137.9 MPa (20.0 ksi)", () => {
    expect(getAsmeViiiAllowableStress("SA-516-70", 150, "metric")).toBeCloseTo(
      137.9,
      1,
    );
    expect(getAsmeViiiAllowableStress("SA-516-70", 300, "imperial")).toBe(20000);
  });

  it("default Metric 2:1 SE → t_req≈8.17 mm · t_nom≈11.17 mm", () => {
    const c = computePressureVesselHeadThickness(
      DEFAULT_PRESSURE_VESSEL_HEAD_THICKNESS_INPUTS,
    );
    expect(c.invalid).toBe(false);
    expect(c.tReq).toBeCloseTo(8.17, 2);
    expect(c.tNom).toBeCloseTo(11.17, 2);
    expect(c.mawp).toBeCloseTo(1.5, 2);

    const out = calculatePressureVesselHeadThickness(
      DEFAULT_PRESSURE_VESSEL_HEAD_THICKNESS_INPUTS,
    );
    expect(out.heroValue).toMatch(/11\.1/);
    expect(out.heroBadges?.[0]?.value).toMatch(/8\.1/);
    expect(out.heroStatus).toMatch(/PASS/);
    expect(out.heroStatus).not.toMatch(/t_req/);
    expect(out.callouts?.length).toBeLessThanOrEqual(2);
    expect(out.rows.length).toBeLessThanOrEqual(4);
    expect(out.rows.some((r) => /MAWP/i.test(r.label))).toBe(true);
    expect(out.rows.some((r) => /Allowable stress/i.test(r.label))).toBe(true);
  });

  it("torispherical UG-32(e) L=D → t_req≈30.25 mm (not ellipsoidal formula)", () => {
    const c = computePressureVesselHeadThickness({
      unitSystem: "metric",
      headType: "torispherical",
      insideDiameter: 2000,
      designPressure: 2,
      designTemperature: 200,
      materialId: "SA-516-70",
      jointEfficiency: 0.85,
      corrosionAllowance: 3,
      halfApexAngle: 30,
    });
    expect(c.invalid).toBe(false);
    expect(c.tReq).toBeCloseTo(30.25, 1);
    expect(c.tNom).toBeCloseTo(33.25, 1);
  });

  it("hemispherical imperial → t_req≈0.225 in · t_nom≈0.350 in", () => {
    const c = computePressureVesselHeadThickness({
      unitSystem: "imperial",
      headType: "hemispherical",
      insideDiameter: 60,
      designPressure: 300,
      designTemperature: 300,
      materialId: "SA-516-70",
      jointEfficiency: 1,
      corrosionAllowance: 0.125,
      halfApexAngle: 30,
    });
    expect(c.tReq).toBeCloseTo(0.225, 3);
    expect(c.tNom).toBeCloseTo(0.35, 3);
  });

  it("conical imperial 316L α=30° → t_req≈0.295 in", () => {
    const c = computePressureVesselHeadThickness({
      unitSystem: "imperial",
      headType: "conical",
      insideDiameter: 48,
      designPressure: 150,
      designTemperature: 200,
      materialId: "SA-240-316L",
      jointEfficiency: 0.85,
      corrosionAllowance: 0,
      halfApexAngle: 30,
    });
    expect(c.invalid).toBe(false);
    expect(c.tReq).toBeCloseTo(0.295, 2);
    expect(c.tNom).toBeCloseTo(0.295, 2);
  });

  it("same duty: torispherical thicker than 2:1 SE; hemi thinnest", () => {
    const base = {
      unitSystem: "metric" as const,
      insideDiameter: 1500,
      designPressure: 1.5,
      designTemperature: 150,
      materialId: "SA-516-70" as const,
      jointEfficiency: 1 as const,
      corrosionAllowance: 3,
      halfApexAngle: 30,
    };
    const se = computePressureVesselHeadThickness({
      ...base,
      headType: "ellipsoidal-2-1",
    });
    const tori = computePressureVesselHeadThickness({
      ...base,
      headType: "torispherical",
    });
    const hemi = computePressureVesselHeadThickness({
      ...base,
      headType: "hemispherical",
    });
    expect(tori.tReq).toBeGreaterThan(se.tReq);
    expect(hemi.tReq).toBeLessThan(se.tReq);
  });

  it("MAWP round-trip matches design pressure for ellipsoidal", () => {
    const D = 1500;
    const P = 1.5;
    const S = getAsmeViiiAllowableStress("SA-516-70", 150, "metric");
    const { tReq } = requiredHeadThickness({
      headType: "ellipsoidal-2-1",
      insideDiameter: D,
      designPressure: P,
      allowableStress: S,
      jointEfficiency: 1,
    });
    const mawp = mawpForHeadThickness({
      headType: "ellipsoidal-2-1",
      insideDiameter: D,
      thickness: tReq,
      allowableStress: S,
      jointEfficiency: 1,
    });
    expect(mawp).toBeCloseTo(P, 5);
  });

  it("α > 30° conical without knuckle fails", () => {
    const c = computePressureVesselHeadThickness({
      ...DEFAULT_PRESSURE_VESSEL_HEAD_THICKNESS_INPUTS,
      headType: "conical",
      halfApexAngle: 45,
    });
    expect(c.invalid).toBe(true);
    expect(c.invalidReason).toMatch(/30/);
  });

  it("Pattern B: list / resolve / findSpec / SEO triad", () => {
    expect(SLUG_TO_CALCULATOR_TYPE[SLUG]).toBe(
      "pressure-vessel-head-thickness",
    );
    const routes = listSpecRoutesForSlug(SLUG);
    expect(routes.length).toBeGreaterThanOrEqual(4);

    const spec = "2to1-ellipsoidal-id1500-1.5mpa-metric";
    const resolved = resolveSpecRoute(SLUG, spec);
    expect(resolved?.query.head).toBe("ellipsoidal-2-1");
    expect(resolved?.query.id).toBe("1500");

    const hit = findSpecRouteForInputs(SLUG, {
      head: "ellipsoidal-2-1",
      id: 1500,
      p: 1.5,
      units: "metric",
    });
    expect(hit?.spec).toBe(spec);

    const seo = getCalculatorSeo(SLUG);
    expect(seo?.allowancesAndTolerances).toBeTruthy();
    expect(seo?.materialLimitations).toBeTruthy();
    expect(seo?.workedExample).toBeTruthy();
    expect(seo?.howToSteps?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.faq?.length).toBeGreaterThanOrEqual(3);
    expect(
      seo?.workedExample?.steps.some((s) => /8\.17/.test(s.result ?? "")),
    ).toBe(true);

    const copy = buildSpecSeoCopy(
      "Pressure Vessel Head Thickness & Design (ASME VIII-1 UG-32)",
      "pressure-vessel-head-thickness",
      resolved!,
    );
    expect(copy.title).toMatch(/FieldEngineersKit/);
    expect(copy.description.length).toBeGreaterThan(40);
    expect(copy.description.length).toBeLessThanOrEqual(160);
    expect(copy.h1).toBeTruthy();
  });
});
