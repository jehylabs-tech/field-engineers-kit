import { describe, expect, it } from "vitest";
import {
  calculateDarby3kFittingLoss,
  computeDarby3kFittingLoss,
  DEFAULT_DARBY_3K_FITTING_LOSS_INPUTS,
} from "@/lib/calculators/engines/darby-3k-fitting-loss";
import {
  buildSpecSeoCopy,
  listSpecRoutesForSlug,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";

function expectNoPoison(out: ReturnType<typeof calculateDarby3kFittingLoss>) {
  expect(out.heroValue).not.toMatch(/NaN|undefined|null/i);
  for (const row of out.rows) {
    expect(row.value).not.toMatch(/NaN|undefined/i);
  }
}

describe("darby-3k-fitting-loss", () => {
  it("default NPS 2 Sch 40 · 90° std elbow · Re 50k (turbulent)", () => {
    const c = computeDarby3kFittingLoss(DEFAULT_DARBY_3K_FITTING_LOSS_INPUTS);
    expect(c.invalid).toBe(false);
    expect(c.diMm).toBeCloseTo(52.51, 2);
    expect(c.regime).toBe("turbulent");
    expect(c.kSingle).toBeCloseTo(0.396, 2);
    expect(c.leqSingleM).toBeCloseTo(1.09, 1);
    const out = calculateDarby3kFittingLoss(DEFAULT_DARBY_3K_FITTING_LOSS_INPUTS);
    expect(out.heroValue).toMatch(/K = 0\.39/);
    expect(out.heroValue).toMatch(/L_eq/);
    expect(out.callouts?.some((x) => /K₁\/Re|K_d\/D_in/i.test(x.body))).toBe(true);
    expectNoPoison(out);
  });

  it("laminar Re 500 raises K via K₁/Re", () => {
    const c = computeDarby3kFittingLoss({
      ...DEFAULT_DARBY_3K_FITTING_LOSS_INPUTS,
      reynoldsNumber: 500,
    });
    expect(c.regime).toBe("laminar");
    expect(c.kSingle).toBeCloseTo(1.98, 1);
    expect(c.leqSingleM).toBeCloseTo(5.47, 1);
    expect(c.laminarPart).toBeCloseTo(1.6, 2);
  });

  it("matches pSEO globe / tee duties", () => {
    const globe = computeDarby3kFittingLoss({
      unitSystem: "metric",
      nps: "4",
      schedule: "40",
      fittingType: "globe_valve_std",
      reynoldsNumber: 100_000,
      quantity: 1,
    });
    expect(globe.kSingle).toBeCloseTo(5.74, 1);
    expect(globe.leqSingleM).toBeGreaterThan(30);

    const tee = computeDarby3kFittingLoss({
      unitSystem: "metric",
      nps: "3",
      schedule: "80",
      fittingType: "tee_branch",
      reynoldsNumber: 1500,
      quantity: 1,
    });
    expect(tee.regime).toBe("laminar");
    expect(tee.kSingle).toBeCloseTo(1.63, 1);
  });

  it("quantity > 1 shows total rows without qty=1 duplicates", () => {
    const out = calculateDarby3kFittingLoss({
      ...DEFAULT_DARBY_3K_FITTING_LOSS_INPUTS,
      quantity: 4,
    });
    expect(out.heroValue).toMatch(/K_Σ/);
    expect(out.heroBadges?.some((b) => b.label === "Qty" && b.value === "4")).toBe(
      true,
    );
    expect(out.rows.some((r) => /K total/i.test(r.label))).toBe(true);
    expect(out.rows.some((r) => /K per fitting/i.test(r.label))).toBe(true);
    expectNoPoison(out);
  });

  it("metric hero shows dual-unit L_eq; context stays in badges not rows", () => {
    const out = calculateDarby3kFittingLoss(DEFAULT_DARBY_3K_FITTING_LOSS_INPUTS);
    expect(out.heroValue).toMatch(/m · .*ft/);
    expect(out.heroBadges?.some((b) => b.label === "DN")).toBe(true);
    expect(out.heroBadges?.some((b) => b.label === "f_T")).toBe(true);
    expect(
      out.rows.some((r) =>
        /^(Pipe inside diameter|Crane f_T|K₁ · Kᵢ · K_d|Reynolds number|Flow regime)/i.test(
          r.label,
        ),
      ),
    ).toBe(false);
    expect(out.rows).toHaveLength(5);
  });

  it("resolves Pattern B specs", () => {
    expect(
      resolveSpecRoute(
        "darby-3k-fitting-loss",
        "2inch-sch40-elbow-90-std-re50000",
      )?.query,
    ).toMatchObject({
      nps: "2",
      schedule: "40",
      fittingType: "elbow_90_std",
      re: "50000",
    });
    const routes = listSpecRoutesForSlug("darby-3k-fitting-loss");
    expect(routes).toHaveLength(4);
    const copy = buildSpecSeoCopy(
      "Darby 3-K Fitting Loss",
      SLUG_TO_CALCULATOR_TYPE["darby-3k-fitting-loss"],
      routes[0],
      "meta",
    );
    expect(copy.title).toMatch(/Darby 3-K Fitting Loss/i);
  });
});
