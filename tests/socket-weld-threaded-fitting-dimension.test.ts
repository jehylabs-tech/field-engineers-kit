import { describe, expect, it } from "vitest";
import {
  calculateSocketWeldThreadedFittingDimension,
  computeSocketWeldThreadedFittingDimension,
  DEFAULT_SOCKET_WELD_THREADED_FITTING_DIMENSION_INPUTS,
} from "@/lib/calculators/engines/socket-weld-threaded-fitting-dimension";
import { computeNptL2In } from "@/lib/calculators/data/b1611ForgedFittings";
import {
  findSpecRouteForInputs,
  resolveSpecRoute,
} from "@/lib/calculators/spec-routes";

describe("socket-weld-threaded-fitting-dimension engine", () => {
  it("SW 90° elbow NPS1 Class 3000 — A≈28.4 mm, J≈12.7 mm, G≈4.98 mm", () => {
    const c = computeSocketWeldThreadedFittingDimension(
      DEFAULT_SOCKET_WELD_THREADED_FITTING_DIMENSION_INPUTS,
    );
    expect(c.invalid).toBe(false);
    expect(c.primaryMm).toBeCloseTo(28.45, 1);
    expect(c.socketJMm).toBeCloseTo(12.7, 1);
    expect(c.wallGMm).toBeCloseTo(4.98, 1);

    const out = calculateSocketWeldThreadedFittingDimension(
      DEFAULT_SOCKET_WELD_THREADED_FITTING_DIMENSION_INPUTS,
    );
    expect(out.heroValue).toMatch(/28\.4|1\.12/);
  });

  it("Threaded tee NPS2 Class 3000 — A≈47.8 mm, L2≈19.3 mm", () => {
    const c = computeSocketWeldThreadedFittingDimension({
      unitSystem: "metric",
      connection: "threaded-npt",
      fitting: "tee",
      nps: "2",
      rating: "3000",
    });
    expect(c.invalid).toBe(false);
    expect(c.primaryMm).toBeCloseTo(47.75, 1);
    expect(c.l2Mm).toBeCloseTo(19.35, 1);
    expect(computeNptL2In("2")).toBeCloseTo(0.7617, 3);
  });

  it("SW coupling NPS1.5 Class 6000 — W=2.88 in, G=0.315 in", () => {
    const c = computeSocketWeldThreadedFittingDimension({
      unitSystem: "imperial",
      connection: "socket-weld",
      fitting: "coupling",
      nps: "1.5",
      rating: "6000",
    });
    expect(c.invalid).toBe(false);
    expect(c.primaryMm / 25.4).toBeCloseTo(2.88, 2);
    expect(c.wallGMm / 25.4).toBeCloseTo(0.315, 3);
  });

  it("Threaded cap NPS0.75 Class 2000 — W=1.44 in, band=1.46 in", () => {
    const c = computeSocketWeldThreadedFittingDimension({
      unitSystem: "imperial",
      connection: "threaded-npt",
      fitting: "cap",
      nps: "0.75",
      rating: "2000",
    });
    expect(c.invalid).toBe(false);
    expect(c.primaryMm / 25.4).toBeCloseTo(1.44, 2);
    expect(c.bandOdMm / 25.4).toBeCloseTo(1.46, 2);
  });

  it("rejects Class 2000 on socket weld", () => {
    const c = computeSocketWeldThreadedFittingDimension({
      ...DEFAULT_SOCKET_WELD_THREADED_FITTING_DIMENSION_INPUTS,
      rating: "2000",
    });
    expect(c.invalid).toBe(true);
  });
});

describe("socket-weld-threaded-fitting-dimension Pattern B", () => {
  it("resolves featured specs", () => {
    expect(
      resolveSpecRoute(
        "socket-weld-threaded-fitting-dimension",
        "sw-elbow90-nps1-class3000-metric",
      )?.query,
    ).toMatchObject({
      conn: "socket-weld",
      fitting: "elbow-90",
      nps: "1",
      rating: "3000",
      units: "metric",
    });
    expect(
      resolveSpecRoute(
        "socket-weld-threaded-fitting-dimension",
        "threaded-tee-nps2-class3000-metric",
      )?.spec,
    ).toBe("threaded-tee-nps2-class3000-metric");
    expect(
      resolveSpecRoute(
        "socket-weld-threaded-fitting-dimension",
        "sw-coupling-nps1.5-class6000-imperial",
      )?.query.units,
    ).toBe("imperial");
  });

  it("findSpecRouteForInputs matches path-owned keys", () => {
    const hit = findSpecRouteForInputs(
      "socket-weld-threaded-fitting-dimension",
      {
        conn: "socket-weld",
        fitting: "elbow-90",
        nps: "1",
        rating: "3000",
        units: "metric",
      },
    );
    expect(hit?.spec).toBe("sw-elbow90-nps1-class3000-metric");

    const cap = findSpecRouteForInputs(
      "socket-weld-threaded-fitting-dimension",
      {
        connection: "threaded-npt",
        fitting: "cap",
        nps: "0.75",
        rating: "2000",
        units: "imperial",
      },
    );
    expect(cap?.spec).toBe("threaded-cap-nps0.75-class2000-imperial");
  });
});
