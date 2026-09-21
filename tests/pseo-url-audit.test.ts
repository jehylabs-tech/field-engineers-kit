import { describe, expect, it } from "vitest";
import { PATH_OWNED_PARAMS } from "@/lib/calculators/url-sync-path-owned";
import { listAllSpecRoutes } from "@/lib/calculators/spec-routes";
import { getLocalPublishedCalculators } from "@/lib/calculators/local-seed";

/** Keys allowed to remain in ?query even on Pattern B paths. */
const AUX_OK = new Set([
  "units",
  "pressure",
  "targetBoltStress",
  "carried",
  "from",
  "to",
]);

describe("pSEO URL hygiene audit", () => {
  const slugs = getLocalPublishedCalculators()
    .map((c) => c.slug)
    .sort();
  const routes = listAllSpecRoutes(slugs);

  it("emits only clean /calculator/{slug}/{spec} paths (no ? in spec)", () => {
    const bad = routes.filter(
      (r) =>
        r.spec.includes("?") ||
        r.spec.includes("&") ||
        r.spec.includes("=") ||
        r.spec.includes(" "),
    );
    expect(bad).toEqual([]);
  });

  it("has no duplicate slug+spec pairs", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const r of routes) {
      const key = `${r.slug}::${r.spec}`;
      if (seen.has(key)) dupes.push(key);
      seen.add(key);
    }
    expect(dupes).toEqual([]);
  });

  it("covers path-owned query keys for every SpecRoute duty (except aux)", () => {
    const missing: Record<string, string[]> = {};
    for (const r of routes) {
      for (const key of Object.keys(r.query ?? {})) {
        if (AUX_OK.has(key)) continue;
        if (!PATH_OWNED_PARAMS.has(key)) {
          missing[r.slug] ??= [];
          if (!missing[r.slug].includes(key)) missing[r.slug].push(key);
        }
      }
    }
    expect(missing).toEqual({});
  });

  it("registers recent Pattern B calculators with listed duties", () => {
    const bySlug = new Map<string, number>();
    for (const r of routes) {
      bySlug.set(r.slug, (bySlug.get(r.slug) ?? 0) + 1);
    }
    expect(bySlug.get("api650-tank-shell-thickness")).toBeGreaterThanOrEqual(4);
    expect(bySlug.get("compressor-polytropic-power")).toBeGreaterThanOrEqual(4);
    expect(bySlug.get("heat-exchanger-lmtd-duty")).toBeGreaterThanOrEqual(4);
  });

  it("reports totals for visibility", () => {
    const bySlug = new Map<string, number>();
    for (const r of routes) {
      bySlug.set(r.slug, (bySlug.get(r.slug) ?? 0) + 1);
    }
    expect(
      routes.length,
      `spec routes=${routes.length}; pseo slugs=${bySlug.size}`,
    ).toBeGreaterThan(50);
    expect(bySlug.size).toBeGreaterThan(10);
  });
});
