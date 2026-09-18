import { describe, expect, it } from "vitest";
import {
  calculateSteamPropertiesIapws,
  computeSteamPropertiesIapws,
  DEFAULT_STEAM_PROPERTIES_IAPWS_INPUTS,
} from "@/lib/calculators/engines/steam-properties-iapws";
import {
  buildSpecSeoCopy,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";

function expectNoPoison(
  out: ReturnType<typeof calculateSteamPropertiesIapws>,
) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("steam-properties-iapws", () => {
  it("default 10 bar sat. vapor · h ≈ 2777.1 kJ/kg · Tsat ≈ 179.88 °C", () => {
    const c = computeSteamPropertiesIapws(DEFAULT_STEAM_PROPERTIES_IAPWS_INPUTS);
    expect(c.invalid).toBe(false);
    expect(c.region).toBe("Region 4 Saturated");
    expect(c.tSatC).toBeCloseTo(179.88, 1);
    expect(c.hKjKg).toBeCloseTo(2777.1, 0);
    expect(c.rhoKgM3).toBeCloseTo(5.147, 1);
    expect(c.vM3Kg).toBeCloseTo(0.1944, 3);
    const out = calculateSteamPropertiesIapws(
      DEFAULT_STEAM_PROPERTIES_IAPWS_INPUTS,
    );
    expect(out.heroValue).toMatch(/2777/);
    expect(out.heroValue).toMatch(/Tsat/i);
    expect(out.callouts?.some((x) => /IAPWS-IF97/i.test(x.body))).toBe(true);
    // Lean results: no hero echo of h / Tsat in rows for dry saturation
    expect(out.rows.some((r) => /Specific enthalpy h$/i.test(r.label))).toBe(
      false,
    );
    expect(out.rows.some((r) => /Saturation temperature/i.test(r.label))).toBe(
      false,
    );
    expect(out.rows.some((r) => /hfg/i.test(r.label))).toBe(true);
    expectNoPoison(out);
  });

  it("matches pSEO metric duties", () => {
    const sh20 = computeSteamPropertiesIapws({
      unitSystem: "metric",
      pressure: 20,
      inputMode: "superheated",
      temperature: 300,
      steamQuality: 1,
    });
    expect(sh20.invalid).toBe(false);
    expect(sh20.region).toBe("Region 2 Superheated");
    expect(sh20.hKjKg).toBeCloseTo(3024, 0);
    expect(sh20.sKjKgK).toBeCloseTo(6.768, 2);
    expect(sh20.rhoKgM3).toBeCloseTo(7.97, 1);

    const sat3 = computeSteamPropertiesIapws({
      unitSystem: "metric",
      pressure: 3,
      inputMode: "saturation",
      temperature: 200,
      steamQuality: 1,
    });
    expect(sat3.tSatC).toBeCloseTo(133.54, 1);
    expect(sat3.hKjKg).toBeCloseTo(2724.7, 0);
    expect(sat3.vM3Kg).toBeCloseTo(0.6058, 3);

    const sh15 = computeSteamPropertiesIapws({
      unitSystem: "metric",
      pressure: 15,
      inputMode: "superheated",
      temperature: 250,
      steamQuality: 1,
    });
    expect(sh15.hKjKg).toBeCloseTo(2924, 0);
    expect(sh15.rhoKgM3).toBeCloseTo(6.58, 1);
    expect(sh15.tSatC).toBeCloseTo(198.29, 1);
  });

  it("wet steam mixes hf/hg with quality x", () => {
    const wet = computeSteamPropertiesIapws({
      ...DEFAULT_STEAM_PROPERTIES_IAPWS_INPUTS,
      steamQuality: 0.9,
    });
    expect(wet.invalid).toBe(false);
    expect(wet.hKjKg).toBeCloseTo(
      wet.hfKjKg + 0.9 * (wet.hgKjKg - wet.hfKjKg),
      5,
    );
    const out = calculateSteamPropertiesIapws({
      ...DEFAULT_STEAM_PROPERTIES_IAPWS_INPUTS,
      steamQuality: 0.9,
    });
    expect(out.heroStatus).toMatch(/Wet/i);
    expect(out.rows.some((r) => /hf · hg/i.test(r.label))).toBe(true);
  });

  it("resolves Pattern B specs", () => {
    expect(
      resolveSpecRoute("steam-properties-iapws", "10bar-saturated-steam")
        ?.query,
    ).toMatchObject({
      pressure: "10",
      inputMode: "saturation",
      steamQuality: "1",
    });
    expect(
      resolveSpecRoute("steam-properties-iapws", "20bar-superheated-300c")
        ?.query,
    ).toMatchObject({
      pressure: "20",
      inputMode: "superheated",
      temp: "300",
    });
    const routes = listSpecRoutesForSlug("steam-properties-iapws");
    expect(routes.length).toBeGreaterThanOrEqual(4);
    const copy = buildSpecSeoCopy(
      "IAPWS-IF97 Steam Thermodynamic Properties Calculator",
      SLUG_TO_CALCULATOR_TYPE["steam-properties-iapws"],
      routes[0],
      "meta",
    );
    expect(copy.title).toMatch(/Steam|IAPWS/i);
  });
});
