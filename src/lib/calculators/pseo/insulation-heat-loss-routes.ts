/**
 * Programmatic SEO path table for Piping Insulation Thickness & Heat Loss.
 * Pattern B: /calculator/insulation-heat-loss/{spec}
 *
 * Specs: `{nps}inch-{material}-{thickness}{mm|in}`
 */

import type { InsulationMaterial } from "@/lib/calculators/engines/insulation-heat-loss";

type Route = {
  slug: string;
  spec: string;
  query: Record<string, string>;
  label: string;
};

function materialLabel(material: InsulationMaterial): string {
  switch (material) {
    case "mineral-wool":
      return "Mineral wool";
    case "calcium-silicate":
      return "Calcium silicate";
    case "cellular-glass":
      return "Cellular glass";
    case "polyurethane":
      return "Polyurethane";
    default:
      return material;
  }
}

function metricRoute(
  slug: string,
  nps: string,
  material: InsulationMaterial,
  thicknessMm: number,
  operatingTemp = 200,
  ambientTemp = 25,
  windSpeed = 2,
): Route {
  return {
    slug,
    spec: `${nps}inch-${material}-${thicknessMm}mm`,
    query: {
      units: "metric",
      nps,
      material,
      insulationThickness: String(thicknessMm),
      operatingTemp: String(operatingTemp),
      ambientTemp: String(ambientTemp),
      windSpeed: String(windSpeed),
      emissivity: "0.9",
    },
    label: `NPS ${nps} · ${materialLabel(material)} · ${thicknessMm} mm`,
  };
}

function imperialRoute(
  slug: string,
  nps: string,
  material: InsulationMaterial,
  thicknessIn: number,
  operatingTempF = 392,
  ambientTempF = 77,
  windSpeedMph = 4.5,
): Route {
  const thickLabel =
    Number.isInteger(thicknessIn) ? String(thicknessIn) : String(thicknessIn).replace(".", "p");
  return {
    slug,
    spec: `${nps}inch-${material}-${thickLabel}in`,
    query: {
      units: "imperial",
      nps,
      material,
      insulationThickness: String(thicknessIn),
      operatingTemp: String(operatingTempF),
      ambientTemp: String(ambientTempF),
      windSpeed: String(windSpeedMph),
      emissivity: "0.9",
    },
    label: `NPS ${nps} · ${materialLabel(material)} · ${thicknessIn} in`,
  };
}

export function listInsulationHeatLossPseoRoutes(slug: string): Route[] {
  return [
    // Required metric (temps match published pSEO cases)
    metricRoute(slug, "4", "mineral-wool", 50, 200, 25, 2),
    metricRoute(slug, "6", "calcium-silicate", 75, 350, 25, 2),
    // Required imperial
    imperialRoute(slug, "3", "mineral-wool", 2, 400, 77, 4.5),
    imperialRoute(slug, "8", "cellular-glass", 3, 500, 77, 4.5),
    // Additional metric
    metricRoute(slug, "2", "mineral-wool", 40),
    metricRoute(slug, "8", "calcium-silicate", 100, 250, 25, 2),
    metricRoute(slug, "10", "cellular-glass", 75, 150, 20, 1),
    metricRoute(slug, "4", "polyurethane", 40, 80, 25, 1),
    // Additional imperial
    imperialRoute(slug, "4", "mineral-wool", 2),
    imperialRoute(slug, "6", "calcium-silicate", 3, 482, 77, 4.5),
    imperialRoute(slug, "2", "polyurethane", 1.5, 176, 77, 2),
  ];
}
