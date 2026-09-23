import { describe, expect, it } from "vitest";
import {
  calculatePipeSteamTracingDuty,
  computePipeSteamTracingDuty,
  DEFAULT_PIPE_STEAM_TRACING_DUTY_INPUTS,
  TRACING_SAFETY_FACTOR,
} from "@/lib/calculators/engines/pipe-steam-tracing-duty";
import {
  findSpecRouteForInputs,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";

describe("pipe-steam-tracing-duty engine", () => {
  it("default NPS4 · 50 °C · 3.5 bar.g — Q≈19.9 W/m, ~4.2 kg/h·100m, 1 line", () => {
    const c = computePipeSteamTracingDuty(
      DEFAULT_PIPE_STEAM_TRACING_DUTY_INPUTS,
    );
    expect(c.invalid).toBe(false);
    expect(c.qLossWm).toBeCloseTo(19.88, 1);
    expect(c.steamKgPerHPer100m).toBeCloseTo(4.22, 1);
    expect(c.tracerCount).toBe(1);
    expect(c.safetyFactor).toBe(TRACING_SAFETY_FACTOR);
    expect(c.hfgKjKg).toBeCloseTo(2119.8, 0);

    const out = calculatePipeSteamTracingDuty(
      DEFAULT_PIPE_STEAM_TRACING_DUTY_INPUTS,
    );
    expect(out.heroValue).toMatch(/4\.2 kg\/h per 100 m/);
    expect(out.heroValue).not.toMatch(/lb\/h/);
    expect(out.heroBadges?.[0]?.value).toBe("1");
    expect(out.rows?.length).toBeLessThanOrEqual(6);
  });

  it("NPS8 · 100 °C · 7 bar.g — Q≈49.8 W/m, ~11.0 kg/h·100m, 2 lines", () => {
    const c = computePipeSteamTracingDuty({
      unitSystem: "metric",
      nps: "8",
      maintainTemp: 100,
      ambientTemp: -15,
      windSpeed: 5,
      material: "mineral-wool",
      insulationThickness: 75,
      tracerNps: "0.5",
      steamPressure: 7,
    });
    expect(c.invalid).toBe(false);
    expect(c.qLossWm).toBeCloseTo(49.8, 1);
    expect(c.steamKgPerHPer100m).toBeCloseTo(10.95, 1);
    expect(c.tracerCount).toBe(2);
  });

  it("imperial NPS3 · 120 °F · 50 psig — Q≈18.7 Btu/hr·ft, ~2.6 lb/h·100ft", () => {
    const c = computePipeSteamTracingDuty({
      unitSystem: "imperial",
      nps: "3",
      maintainTemp: 120,
      ambientTemp: 0,
      windSpeed: 11.2,
      material: "mineral-wool",
      insulationThickness: 2,
      tracerNps: "0.5",
      steamPressure: 50,
    });
    expect(c.invalid).toBe(false);
    expect(c.qLossWm * 1.040014).toBeCloseTo(18.73, 1);
    expect(c.steamLbPerHPer100ft).toBeCloseTo(2.57, 1);
    expect(c.tracerCount).toBe(1);
  });

  it("imperial NPS6 · 180 °F · 100 psig — ~4.8 lb/h·100ft, 2 lines", () => {
    const c = computePipeSteamTracingDuty({
      unitSystem: "imperial",
      nps: "6",
      maintainTemp: 180,
      ambientTemp: 10,
      windSpeed: 11.2,
      material: "mineral-wool",
      insulationThickness: 3,
      tracerNps: "0.5",
      steamPressure: 100,
    });
    expect(c.invalid).toBe(false);
    expect(c.qLossWm * 1.040014).toBeCloseTo(33.63, 1);
    expect(c.steamLbPerHPer100ft).toBeCloseTo(4.77, 1);
    expect(c.tracerCount).toBe(2);
  });

  it("flags steam Tsat below maintain temperature", () => {
    const c = computePipeSteamTracingDuty({
      ...DEFAULT_PIPE_STEAM_TRACING_DUTY_INPUTS,
      maintainTemp: 180,
      steamPressure: 1.0,
    });
    expect(c.invalid).toBe(true);
  });
});

describe("pipe-steam-tracing-duty Pattern B", () => {
  it("resolves featured specs", () => {
    expect(
      resolveSpecRoute(
        "pipe-steam-tracing-duty",
        "nps4-maintain50c-steam3.5bar-metric",
      )?.query,
    ).toMatchObject({
      nps: "4",
      tMaint: "50",
      pSteam: "3.5",
      units: "metric",
    });
    expect(
      resolveSpecRoute(
        "pipe-steam-tracing-duty",
        "nps8-maintain100c-steam7bar-metric",
      )?.spec,
    ).toBe("nps8-maintain100c-steam7bar-metric");
    expect(
      resolveSpecRoute(
        "pipe-steam-tracing-duty",
        "nps3-maintain120f-steam50psig-imperial",
      )?.query.units,
    ).toBe("imperial");
    expect(
      resolveSpecRoute(
        "pipe-steam-tracing-duty",
        "nps6-maintain180f-steam100psig-imperial",
      )?.query.pSteam,
    ).toBe("100");
  });

  it("findSpecRouteForInputs matches path-owned duty keys", () => {
    const hit = findSpecRouteForInputs("pipe-steam-tracing-duty", {
      nps: "4",
      tMaint: 50,
      pSteam: 3.5,
      insThk: 50,
      units: "metric",
    });
    expect(hit?.spec).toBe("nps4-maintain50c-steam3.5bar-metric");

    const imp = findSpecRouteForInputs("pipe-steam-tracing-duty", {
      nps: "6",
      maintainTemp: 180,
      steamPressure: 100,
      insulationThickness: 3,
      units: "imperial",
    });
    expect(imp?.spec).toBe("nps6-maintain180f-steam100psig-imperial");
  });
});
