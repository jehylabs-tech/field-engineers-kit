/**
 * Programmatic SEO path table for Tank & Pressure Vessel Volume.
 * Pattern B: /calculator/tank-vessel-volume/{spec}
 *
 * Spec token `2inch1-ellipsoidal` maps to headType `2to1-ellipsoidal`.
 */

import type { TankHeadType, TankOrientation } from "@/lib/calculators/engines/tank-vessel-volume";

type Route = {
  slug: string;
  spec: string;
  query: Record<string, string>;
  label: string;
};

function headSpecToken(headType: TankHeadType): string {
  if (headType === "2to1-ellipsoidal") return "2inch1-ellipsoidal";
  return headType;
}

function headLabel(headType: TankHeadType): string {
  switch (headType) {
    case "flat":
      return "flat";
    case "2to1-ellipsoidal":
      return "2:1 SE";
    case "torispherical-klopper":
      return "F&D / Klöpper";
    case "hemispherical":
      return "hemi";
    default:
      return headType;
  }
}

function metricRoute(
  slug: string,
  orientation: TankOrientation,
  headType: TankHeadType,
  diameterMm: number,
  lengthMm: number,
  liquidLevelMm: number,
  fluid = "water",
): Route {
  const unit = "mm";
  return {
    slug,
    spec: `${orientation}-${headSpecToken(headType)}-${diameterMm}${unit}-${lengthMm}${unit}`,
    query: {
      units: "metric",
      orientation,
      headType,
      diameter: String(diameterMm),
      length: String(lengthMm),
      liquidLevel: String(liquidLevelMm),
      fluid,
      dens: fluid === "water" ? "998" : "998",
    },
    label: `${orientation} · ${headLabel(headType)} · Di ${diameterMm} mm · L ${lengthMm} mm`,
  };
}

function imperialRoute(
  slug: string,
  orientation: TankOrientation,
  headType: TankHeadType,
  diameterIn: number,
  lengthIn: number,
  liquidLevelIn: number,
  fluid = "water",
): Route {
  const unit = "in";
  return {
    slug,
    spec: `${orientation}-${headSpecToken(headType)}-${diameterIn}${unit}-${lengthIn}${unit}`,
    query: {
      units: "imperial",
      orientation,
      headType,
      diameter: String(diameterIn),
      length: String(lengthIn),
      liquidLevel: String(liquidLevelIn),
      fluid,
      dens: "998",
    },
    label: `${orientation} · ${headLabel(headType)} · Di ${diameterIn} in · L ${lengthIn} in`,
  };
}

export function listTankVesselVolumePseoRoutes(slug: string): Route[] {
  return [
    // Required pSEO cases
    metricRoute(slug, "horizontal", "2to1-ellipsoidal", 2000, 6000, 1200),
    metricRoute(slug, "vertical", "hemispherical", 3000, 8000, 5000),
    imperialRoute(slug, "horizontal", "flat", 96, 240, 48),
    imperialRoute(slug, "vertical", "2to1-ellipsoidal", 120, 360, 200),
    // Extra metric
    metricRoute(slug, "horizontal", "hemispherical", 1500, 4000, 750),
    metricRoute(slug, "vertical", "torispherical-klopper", 2500, 5000, 3000),
    metricRoute(slug, "horizontal", "flat", 2500, 8000, 1250),
    // Extra imperial
    imperialRoute(slug, "horizontal", "2to1-ellipsoidal", 72, 180, 36),
    imperialRoute(slug, "vertical", "flat", 96, 300, 120),
    imperialRoute(slug, "horizontal", "torispherical-klopper", 120, 300, 60),
  ];
}
