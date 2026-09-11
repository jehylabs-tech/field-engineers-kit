/**
 * Programmatic SEO path table for Pneumatic Test Safety Distance.
 * Kept separate from the calculation engine so Turbopack / client chunks
 * do not share a mutable graph with generateStaticParams route listing.
 */

export const PNEUMATIC_PSEO_BAR = [5, 10, 15, 20, 25] as const;
export const PNEUMATIC_PSEO_M3 = [0.5, 1, 2, 5, 10] as const;
export const PNEUMATIC_PSEO_PSI = [75, 100, 150, 200, 300] as const;
export const PNEUMATIC_PSEO_FT3 = [10, 25, 50, 100, 200] as const;

/**
 * Paths: `{P}-bar-{V}-m3` / `{P}-psi-{V}-ft3`
 * (0.5 m³ → `0p5` in the path segment)
 */
export function listPneumaticSafetyPseoRoutes(slug: string): {
  slug: string;
  spec: string;
  query: Record<string, string>;
  label: string;
}[] {
  const routes: {
    slug: string;
    spec: string;
    query: Record<string, string>;
    label: string;
  }[] = [];

  for (const bar of PNEUMATIC_PSEO_BAR) {
    for (const m3 of PNEUMATIC_PSEO_M3) {
      const volLabel = String(m3);
      const specVol = volLabel.replace(".", "p");
      routes.push({
        slug,
        spec: `${bar}-bar-${specVol}-m3`,
        query: {
          units: "metric",
          pt: String(bar),
          vol: String(m3),
          mode: "volume",
          gas: "air",
        },
        label: `${bar} bar · ${m3} m³`,
      });
    }
  }

  for (const psi of PNEUMATIC_PSEO_PSI) {
    for (const ft3 of PNEUMATIC_PSEO_FT3) {
      routes.push({
        slug,
        spec: `${psi}-psi-${ft3}-ft3`,
        query: {
          units: "imperial",
          pt: String(psi),
          vol: String(ft3),
          mode: "volume",
          gas: "air",
        },
        label: `${psi} psi · ${ft3} ft³`,
      });
    }
  }

  return routes;
}
