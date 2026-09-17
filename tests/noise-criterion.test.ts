import { describe, expect, it } from "vitest";
import {
  applySpectrumToInputs,
  calculateNoiseCriterion,
  computeNoiseCriterion,
  DEFAULT_NOISE_CRITERION_INPUTS,
  spectrumForNc,
} from "@/lib/calculators/engines/noise-criterion";
import {
  buildSpecSeoCopy,
  findSpecRouteForInputs,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";

function expectNoPoison(out: ReturnType<typeof calculateNoiseCriterion>) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("noise-criterion", () => {
  it("defaults rate NC-35 Pass for Control Room", () => {
    const c = computeNoiseCriterion(DEFAULT_NOISE_CRITERION_INPUTS);
    expect(c.invalid).toBe(false);
    expect(c.ncRating).toBe(35);
    expect(c.compliant).toBe(true);
    expect(c.spaceLabel).toBe("Control Room");
    const out = calculateNoiseCriterion(DEFAULT_NOISE_CRITERION_INPUTS);
    expect(out.heroValue).toMatch(/NC-35/);
    expect(out.heroValue).toMatch(/Pass/i);
    expect(out.callouts?.some((x) => /ANSI\/ASA S12\.2/i.test(x.body))).toBe(
      true,
    );
    expectNoPoison(out);
  });

  it("exact NC curve spectra rate to that NC and pass matching spaces", () => {
    const cases: Array<{
      nc: number;
      space: typeof DEFAULT_NOISE_CRITERION_INPUTS.spaceType;
    }> = [
      { nc: 30, space: "executive-office" },
      { nc: 35, space: "control-room" },
      { nc: 50, space: "equipment-room" },
      { nc: 55, space: "workshop" },
    ];
    for (const { nc, space } of cases) {
      const spectrum = spectrumForNc(nc)!;
      const inputs = applySpectrumToInputs(
        { ...DEFAULT_NOISE_CRITERION_INPUTS, spaceType: space },
        spectrum,
      );
      const c = computeNoiseCriterion(inputs);
      expect(c.ncRating).toBe(nc);
      expect(c.compliant).toBe(true);
      expect(c.exceedsTable).toBe(false);
    }
  });

  it("fails when NC exceeds space limit", () => {
    const spectrum = spectrumForNc(50)!;
    const inputs = applySpectrumToInputs(
      { ...DEFAULT_NOISE_CRITERION_INPUTS, spaceType: "control-room" },
      spectrum,
    );
    const c = computeNoiseCriterion(inputs);
    expect(c.ncRating).toBe(50);
    expect(c.compliant).toBe(false);
    const out = calculateNoiseCriterion(inputs);
    expect(out.heroValue).toMatch(/Fail/i);
    expectNoPoison(out);
  });

  it("rejects out-of-range SPL", () => {
    const c = computeNoiseCriterion({
      ...DEFAULT_NOISE_CRITERION_INPUTS,
      spl500Hz: 140,
    });
    expect(c.invalid).toBe(true);
  });

  it("resolves pSEO specs and SEO copy", () => {
    expect(
      resolveSpecRoute("noise-criterion", "control-room-nc35")?.query.space,
    ).toBe("control-room");
    expect(
      resolveSpecRoute("noise-criterion", "office-nc30")?.query.space,
    ).toBe("executive-office");
    expect(
      resolveSpecRoute("noise-criterion", "equipment-room-nc50")?.query.s500,
    ).toBe("54");
    expect(
      resolveSpecRoute("noise-criterion", "workshop-nc55")?.label,
    ).toMatch(/NC-55/);

    const routes = listSpecRoutesForSlug("noise-criterion");
    expect(routes.map((r) => r.spec)).toEqual([
      "control-room-nc35",
      "office-nc30",
      "equipment-room-nc50",
      "workshop-nc55",
    ]);
    expect(SLUG_TO_CALCULATOR_TYPE["noise-criterion"]).toBe("noise-criterion");

    const seo = buildSpecSeoCopy(
      "Noise Criterion Rating Calculator",
      SLUG_TO_CALCULATOR_TYPE["noise-criterion"],
      routes[1],
      null,
    );
    expect(seo.h1).toMatch(/NC-30/);
  });

  it("findSpecRouteForInputs matches space + spectrum", () => {
    const route = resolveSpecRoute("noise-criterion", "control-room-nc35")!;
    const hit = findSpecRouteForInputs("noise-criterion", {
      ...route.query,
    });
    expect(hit?.spec).toBe("control-room-nc35");
  });
});
