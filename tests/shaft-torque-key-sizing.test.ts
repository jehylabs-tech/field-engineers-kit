import { describe, expect, it } from "vitest";
import {
  calculateShaftTorqueKeySizing,
  computeShaftTorqueKeySizing,
  DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS,
  DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS_IMPERIAL,
} from "@/lib/calculators/engines/shaft-torque-key-sizing";
import { lookupDin6885Key } from "@/lib/calculators/data/din6885ParallelKeys";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { getCalculatorSeo } from "../data/calculatorSeoData";
import { syncCompanionUnits } from "@/lib/unitConverter";
import type { ShaftTorqueKeySizingInputs } from "@/lib/calculators/engines/shaft-torque-key-sizing";

const SLUG = "shaft-torque-key-sizing";

describe("shaft-torque-key-sizing engine", () => {
  it("DIN 6885 lookup matches d=50 → 14×9 and d=65 → 18×11", () => {
    const k50 = lookupDin6885Key(50);
    expect(k50.bMm).toBe(14);
    expect(k50.hMm).toBe(9);
    const k65 = lookupDin6885Key(65);
    expect(k65.bMm).toBe(18);
    expect(k65.hMm).toBe(11);
  });

  it("default metric duty: T≈245.5 N·m, L_min≈25.3 mm, Pass", () => {
    const c = computeShaftTorqueKeySizing(DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS);
    expect(c.torqueNm).toBeCloseTo(245.55, 1);
    expect(c.bMm).toBe(14);
    expect(c.hMm).toBe(9);
    expect(c.LMinMm).toBeCloseTo(25.31, 1);
    expect(c.shearUnity).toBeCloseTo(0.141, 2);
    expect(c.bearingUnity).toBeCloseTo(0.253, 2);
    expect(c.pass).toBe(true);

    const out = calculateShaftTorqueKeySizing(
      DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS,
    );
    expect(out.heroStatusLevel).toBe("pass");
    expect(out.heroValue).toMatch(/245/);
  });

  it("110 kW · Ø65 mm SCM440 metric duty", () => {
    const c = computeShaftTorqueKeySizing({
      unitSystem: "metric",
      shaftPower: 110,
      rotationalSpeed: 3000,
      shaftDiameter: 65,
      shaftMaterial: "SCM440",
      keyMaterial: "S45C",
      keyWidth: 18,
      keyHeight: 11,
      keyLength: 70,
      safetyFactor: 2,
      autoKeySize: true,
    });
    expect(c.torqueNm).toBeCloseTo(350.13, 1);
    expect(c.bMm).toBe(18);
    expect(c.hMm).toBe(11);
    expect(c.LMinMm).toBeCloseTo(22.71, 1);
    expect(c.pass).toBe(true);
  });

  it("60 HP · Ø2 in imperial duty", () => {
    const c = computeShaftTorqueKeySizing(
      DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS_IMPERIAL,
    );
    expect(c.torqueInLbf).toBeCloseTo(2160.9, 0);
    expect(c.LMinMm / 25.4).toBeCloseTo(0.69, 1);
    expect(c.pass).toBe(true);
  });

  it("200 HP · Ø2.5 in imperial duty", () => {
    const c = computeShaftTorqueKeySizing({
      unitSystem: "imperial",
      shaftPower: 200,
      rotationalSpeed: 3600,
      shaftDiameter: 2.5,
      shaftMaterial: "AISI4140",
      keyMaterial: "AISI1045",
      keyWidth: 0.625,
      keyHeight: 0.625,
      keyLength: 3,
      safetyFactor: 2,
      autoKeySize: true,
    });
    expect(c.torqueInLbf).toBeCloseTo(3501.4, 0);
    expect(c.LMinMm / 25.4).toBeCloseTo(0.72, 1);
    expect(c.pass).toBe(true);
  });

  it("navbar unit switch converts power, geometry, and steel aliases", () => {
    const metric = {
      ...DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS,
    } as ShaftTorqueKeySizingInputs & Record<string, unknown>;
    const imperial = syncCompanionUnits(metric, "imperial");
    expect(imperial.unitSystem).toBe("imperial");
    expect(imperial.shaftPower).toBeCloseTo(45 / 0.745699872, 1);
    expect(imperial.shaftDiameter).toBeCloseTo(50 / 25.4, 2);
    expect(imperial.keyWidth).toBeCloseTo(14 / 25.4, 2);
    expect(imperial.keyLength).toBeCloseTo(50 / 25.4, 2);
    expect(imperial.shaftMaterial).toBe("AISI1045");
    expect(imperial.keyMaterial).toBe("AISI1045");

    const back = syncCompanionUnits(imperial, "metric");
    expect(back.shaftPower).toBeCloseTo(45, 1);
    expect(back.shaftDiameter).toBeCloseTo(50, 1);
    expect(back.shaftMaterial).toBe("S45C");
  });

  it("lean results: no duplicate Pass badge; screen rows ≤ 6", () => {
    const out = calculateShaftTorqueKeySizing(
      DEFAULT_SHAFT_TORQUE_KEY_SIZING_INPUTS,
    );
    expect(out.heroBadges?.some((b) => /pass|fail/i.test(b.value))).toBe(
      false,
    );
    expect(out.rows.length).toBeLessThanOrEqual(6);
    expect(out.callouts?.length).toBeGreaterThanOrEqual(1);
    expect(out.callouts?.[0]?.tone).toBe("warn");
  });
});

describe("shaft-torque-key-sizing Pattern B + SEO", () => {
  it("lists Pattern B specs and resolves default metric route", () => {
    const routes = listSpecRoutesForSlug(SLUG);
    expect(routes.length).toBeGreaterThanOrEqual(4);
    expect(
      routes.some((r) => r.spec === "45kw-1750rpm-d50mm-s45c-metric"),
    ).toBe(true);

    const resolved = resolveSpecRoute(
      SLUG,
      "45kw-1750rpm-d50mm-s45c-metric",
    );
    expect(resolved?.query.power).toBe("45");
    expect(resolved?.query.d).toBe("50");
    expect(resolved?.query.units).toBe("metric");

    const found = findSpecRouteForInputs(SLUG, {
      power: 45,
      rpm: 1750,
      d: 50,
      units: "metric",
    });
    expect(found?.spec).toBe("45kw-1750rpm-d50mm-s45c-metric");
  });

  it("SEO entry is full layout with engine-aligned worked example", () => {
    const seo = getCalculatorSeo(SLUG);
    expect(seo).toBeDefined();
    expect(seo?.allowancesAndTolerances).toBeDefined();
    expect(seo?.materialLimitations).toBeDefined();
    expect(seo?.workedExample).toBeDefined();
    expect(seo?.howToSteps?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.faq?.length).toBeGreaterThanOrEqual(3);
    expect(seo?.workedExample?.conclusion).toMatch(/245\.5/);
    expect(seo?.workedExample?.conclusion).toMatch(/25\.3/);

    const route = resolveSpecRoute(SLUG, "45kw-1750rpm-d50mm-s45c-metric");
    expect(route).toBeDefined();
    const copy = buildSpecSeoCopy(
      "Shaft Power Torque and Key Sizing Calculator",
      "shaft-torque-key-sizing",
      route!,
      null,
    );
    expect(copy.h1).toContain("45 kW");
    expect(copy.h2).toMatch(/shaft torque|key sizing/i);
  });
});
