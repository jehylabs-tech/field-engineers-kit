/**
 * Crawlable blind-flange thickness SEO charts (full public matrices).
 * Modes: ambient class rating · hydrotest plate capability
 * Units: imperial · metric  → 4 static SVG posters
 */

import type { UnitSystem } from "@/lib/calculators/definitions";
import {
  flangeAmbientPressureMpa,
  formatImperialPlateFraction,
  getRecommendedCommercialPlate,
} from "@/lib/calculators/engines/blind-flange";
import { getFlangeDimensionEntry } from "@/lib/data/loaders";
import { canonicalUrl } from "@/lib/site";

export const BLIND_FLANGE_SEO_SLUG = "blind-flange-thickness";

export type BlindFlangeSeoMode = "ambient" | "hydrotest";

export type BlindFlangeSeoChartSpec = {
  mode: BlindFlangeSeoMode;
  unitSystem: UnitSystem;
  fileName: string;
  src: string;
  absoluteUrl: string;
  alt: string;
  caption: string;
  title: string;
};

const CLASSES = ["150", "300", "600", "900", "1500", "2500"] as const;

const AMBIENT_NPS = ["2", "3", "4", "6", "8", "10", "12", "14", "16"] as const;
const HYDRO_NPS = [
  "2",
  "3",
  "4",
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "18",
  "20",
] as const;

const FALLBACK_RF_DIAMETERS_MM: Record<string, number> = {
  "2": 92.1,
  "3": 127.0,
  "4": 157.2,
  "6": 215.9,
  "8": 269.9,
  "10": 323.8,
  "12": 381.0,
  "14": 412.8,
  "16": 469.9,
  "18": 533.4,
  "20": 584.2,
  "24": 692.2,
};

const HYDRO_PLATES_METRIC_MM = [
  6, 8, 10, 12, 16, 19, 22, 25, 28, 30, 32, 35, 38, 40, 45, 50, 60, 70, 80, 100,
];
const HYDRO_PLATES_IMPERIAL_IN = [
  0.25, 0.3125, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5,
];

const MPA_TO_PSI = 145.0377377;
const BAR_TO_PSI = 14.5037738;
/** Permanent matrix design stress (A516-70 screening), MPa. */
const AMBIENT_STRESS_MPA = 125.0;
/** Hydrotest blank ambient stress screening, MPa. */
const HYDRO_STRESS_MPA = 138.0;
const AMBIENT_CORROSION_MM = 3.0;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rfDiaMm(nps: string): number {
  const entry = getFlangeDimensionEntry(nps, "150");
  return (
    entry?.rating.raisedFaceDiameterMm ??
    FALLBACK_RF_DIAMETERS_MM[nps] ??
    100
  );
}

function computeRequiredPlate(
  dMm: number,
  pressureMpa: number,
  stressMpa: number,
  corrosionMm: number,
  unitSystem: UnitSystem,
): { plate: string; detail: string } {
  if (dMm <= 0 || pressureMpa <= 0 || stressMpa <= 0) {
    return { plate: "—", detail: "" };
  }
  const tmMm =
    dMm * Math.sqrt(Math.max(0, (0.3 * pressureMpa) / stressMpa)) +
    corrosionMm;
  const tmFinal = unitSystem === "imperial" ? tmMm / 25.4 : tmMm;
  const rec = getRecommendedCommercialPlate(tmFinal, unitSystem);
  if (unitSystem === "imperial") {
    return {
      plate: formatImperialPlateFraction(rec.value),
      detail: `${tmFinal.toFixed(2)} in`,
    };
  }
  return {
    plate: `${rec.value} mm`,
    detail: `${tmFinal.toFixed(1)} mm`,
  };
}

function maxTestPressureBar(tMm: number, dMm: number): number {
  if (dMm <= 0 || tMm <= 0) return 0;
  const stressBar = HYDRO_STRESS_MPA * 10;
  return (stressBar / 0.3) * Math.pow(tMm / dMm, 2);
}

export function blindFlangeSeoFileName(
  mode: BlindFlangeSeoMode,
  unitSystem: UnitSystem,
): string {
  const modeSlug =
    mode === "ambient" ? "ambient-class-rating" : "hydrotest-plate-capability";
  return `blind-flange-thickness-chart-${modeSlug}-${unitSystem}-asme.svg`;
}

export function blindFlangeSeoSrc(
  mode: BlindFlangeSeoMode,
  unitSystem: UnitSystem,
): string {
  return `/images/diagrams/blind-flange/${blindFlangeSeoFileName(mode, unitSystem)}`;
}

export function getBlindFlangeSeoChartSpec(
  mode: BlindFlangeSeoMode,
  unitSystem: UnitSystem,
): BlindFlangeSeoChartSpec {
  const fileName = blindFlangeSeoFileName(mode, unitSystem);
  const src = blindFlangeSeoSrc(mode, unitSystem);
  if (mode === "ambient") {
    const unitNote =
      unitSystem === "imperial"
        ? "inches · ambient −29…100 °F · c = 0.125 in"
        : "mm · ambient −29…38 °C · c = 3.0 mm";
    return {
      mode,
      unitSystem,
      fileName,
      src,
      absoluteUrl: canonicalUrl(src),
      title: `Blind Flange Thickness Chart — ASME B16.5 Ambient Class (${unitSystem})`,
      alt: `Blind flange thickness chart by NPS and ASME B16.5 pressure class ambient rating (${unitSystem} units) — FieldEngineersKit`,
      caption: `Fig. ASME B16.5 ambient class blind flange thickness chart (${unitNote}). Screening plate sizes from UG-34 / B31.3 style formula — not a purchase certificate.`,
    };
  }
  const unitNote =
    unitSystem === "imperial"
      ? "max allowable test pressure in psi"
      : "max allowable test pressure in bar";
  return {
    mode,
    unitSystem,
    fileName,
    src,
    absoluteUrl: canonicalUrl(src),
    title: `Blind Flange / Test Blind Thickness Chart — Hydrotest Plate Capability (${unitSystem})`,
    alt: `Blind flange hydrotest plate thickness chart NPS versus plate stock max allowable test pressure (${unitSystem}) — FieldEngineersKit`,
    caption: `Fig. Hydrotest / test-blind plate capability chart (${unitNote}). Full public matrix — screening only per ASME B31.3 / VIII-1 UG-34 style relation.`,
  };
}

export function listBlindFlangeSeoChartSpecs(): BlindFlangeSeoChartSpec[] {
  const modes: BlindFlangeSeoMode[] = ["ambient", "hydrotest"];
  const units: UnitSystem[] = ["imperial", "metric"];
  return modes.flatMap((mode) =>
    units.map((unitSystem) => getBlindFlangeSeoChartSpec(mode, unitSystem)),
  );
}

/** Default chart on calculator root / unspecified specs: ambient imperial (common Google query). */
export function defaultBlindFlangeSeoChart(): BlindFlangeSeoChartSpec {
  return getBlindFlangeSeoChartSpec("ambient", "imperial");
}

function buildAmbientSvg(unitSystem: UnitSystem): string {
  const meta = getBlindFlangeSeoChartSpec("ambient", unitSystem);
  const W = 1400;
  const headerH = 150;
  const rowH = 52;
  const col0 = 90;
  const colRf = 110;
  const classCols = CLASSES.length;
  const dataW = W - 80 - col0 - colRf;
  const colW = dataW / classCols;
  const H = headerH + 56 + AMBIENT_NPS.length * rowH + 90;

  const classHeaders = CLASSES.map((cls, i) => {
    const x = 40 + col0 + colRf + i * colW + colW / 2;
    const mpa = flangeAmbientPressureMpa(cls);
    const press =
      unitSystem === "imperial"
        ? `${Math.round(mpa * MPA_TO_PSI)} psi`
        : `${mpa.toFixed(2)} MPa`;
    return `
      <text x="${x}" y="${headerH + 28}" text-anchor="middle" font-size="18" font-weight="800" fill="#0F172A" font-family="system-ui,Segoe UI,sans-serif">#${cls}</text>
      <text x="${x}" y="${headerH + 48}" text-anchor="middle" font-size="13" fill="#64748B" font-family="system-ui,Segoe UI,sans-serif">${press}</text>`;
  }).join("");

  const rows = AMBIENT_NPS.map((nps, ri) => {
    const y0 = headerH + 56 + ri * rowH;
    const dMm = rfDiaMm(nps);
    const rfLabel =
      unitSystem === "imperial"
        ? `${(dMm / 25.4).toFixed(2)}"`
        : `${dMm.toFixed(1)}`;
    const cells = CLASSES.map((cls, ci) => {
      const mpa = flangeAmbientPressureMpa(cls);
      const { plate, detail } = computeRequiredPlate(
        dMm,
        mpa,
        AMBIENT_STRESS_MPA,
        AMBIENT_CORROSION_MM,
        unitSystem,
      );
      const x = 40 + col0 + colRf + ci * colW + colW / 2;
      return `
        <text x="${x}" y="${y0 + 22}" text-anchor="middle" font-size="16" font-weight="800" fill="#0F172A" font-family="system-ui,Segoe UI,sans-serif">${escapeXml(plate)}</text>
        <text x="${x}" y="${y0 + 40}" text-anchor="middle" font-size="11" fill="#64748B" font-family="ui-monospace,Consolas,monospace">(${escapeXml(detail)})</text>`;
    }).join("");
    const bg =
      ri % 2 === 0
        ? `<rect x="40" y="${y0}" width="${W - 80}" height="${rowH}" fill="#F8FAFC"/>`
        : "";
    return `${bg}
      <text x="${40 + col0 / 2}" y="${y0 + 32}" text-anchor="middle" font-size="16" font-weight="700" fill="#1E293B" font-family="system-ui,Segoe UI,sans-serif">${nps}"</text>
      <text x="${40 + col0 + colRf / 2}" y="${y0 + 32}" text-anchor="middle" font-size="13" fill="#475569" font-family="ui-monospace,Consolas,monospace">${rfLabel}</text>
      ${cells}`;
  }).join("");

  const subtitle =
    unitSystem === "imperial"
      ? "ASME B16.5 ambient class rating · plate inches · c = 0.125 in · screening"
      : "ASME B16.5 ambient class rating · plate mm · c = 3.0 mm · screening";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(meta.alt)}">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="20" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
  <text x="56" y="72" font-size="32" font-weight="800" fill="#0F172A" font-family="system-ui,Segoe UI,sans-serif">Blind Flange Thickness Chart</text>
  <text x="56" y="108" font-size="18" font-weight="500" fill="#64748B" font-family="system-ui,Segoe UI,sans-serif">${escapeXml(subtitle)}</text>
  <rect x="40" y="${headerH}" width="${W - 80}" height="56" fill="#F1F5F9"/>
  <text x="${40 + col0 / 2}" y="${headerH + 36}" text-anchor="middle" font-size="14" font-weight="800" fill="#334155" font-family="system-ui,Segoe UI,sans-serif">NPS</text>
  <text x="${40 + col0 + colRf / 2}" y="${headerH + 28}" text-anchor="middle" font-size="13" font-weight="800" fill="#334155" font-family="system-ui,Segoe UI,sans-serif">RF (d)</text>
  <text x="${40 + col0 + colRf / 2}" y="${headerH + 46}" text-anchor="middle" font-size="11" fill="#64748B" font-family="system-ui,Segoe UI,sans-serif">${unitSystem === "imperial" ? "in" : "mm"}</text>
  ${classHeaders}
  ${rows}
  <line x1="40" y1="${headerH + 56}" x2="${W - 40}" y2="${headerH + 56}" stroke="#CBD5E1" stroke-width="1"/>
  <text x="${W - 56}" y="${H - 40}" text-anchor="end" font-size="16" font-weight="600" fill="#94A3B8" font-family="system-ui,Segoe UI,sans-serif">fieldengineerskit.com</text>
</svg>
`;
}

function buildHydroSvg(unitSystem: UnitSystem): string {
  const meta = getBlindFlangeSeoChartSpec("hydrotest", unitSystem);
  const plates =
    unitSystem === "imperial"
      ? HYDRO_PLATES_IMPERIAL_IN.map((tIn) => ({
          tMm: tIn * 25.4,
          label: `${formatImperialPlateFraction(tIn)} Plate`,
        }))
      : HYDRO_PLATES_METRIC_MM.map((tMm) => ({
          tMm,
          label: `${tMm} mm (${tMm}T)`,
        }));

  const W = 1500;
  const headerH = 150;
  const rowH = 36;
  const col0 = 150;
  const dataW = W - 80 - col0;
  const colW = dataW / HYDRO_NPS.length;
  const H = headerH + 44 + plates.length * rowH + 90;

  const npsHeaders = HYDRO_NPS.map((nps, i) => {
    const x = 40 + col0 + i * colW + colW / 2;
    return `<text x="${x}" y="${headerH + 28}" text-anchor="middle" font-size="15" font-weight="800" fill="#0F172A" font-family="system-ui,Segoe UI,sans-serif">${nps}"</text>`;
  }).join("");

  const rows = plates
    .map((plate, ri) => {
      const y0 = headerH + 44 + ri * rowH;
      const bg =
        ri % 2 === 0
          ? `<rect x="40" y="${y0}" width="${W - 80}" height="${rowH}" fill="#F8FAFC"/>`
          : "";
      const cells = HYDRO_NPS.map((nps, ci) => {
        const pBar = maxTestPressureBar(plate.tMm, rfDiaMm(nps));
        const display =
          unitSystem === "imperial" ? pBar * BAR_TO_PSI : pBar;
        const text =
          display >= 1000
            ? display.toFixed(0)
            : display >= 100
              ? display.toFixed(0)
              : display.toFixed(1);
        const x = 40 + col0 + ci * colW + colW / 2;
        return `<text x="${x}" y="${y0 + 24}" text-anchor="middle" font-size="12" font-weight="600" fill="#1E293B" font-family="ui-monospace,Consolas,monospace">${text}</text>`;
      }).join("");
      return `${bg}
      <text x="52" y="${y0 + 24}" font-size="13" font-weight="700" fill="#0F172A" font-family="system-ui,Segoe UI,sans-serif">${escapeXml(plate.label)}</text>
      ${cells}`;
    })
    .join("");

  const subtitle =
    unitSystem === "imperial"
      ? "Max allowable hydrotest pressure (psi) by plate thickness · S ≈ 20 ksi screening"
      : "Max allowable hydrotest pressure (bar) by plate thickness · S ≈ 138 MPa screening";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(meta.alt)}">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="20" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
  <text x="56" y="72" font-size="30" font-weight="800" fill="#0F172A" font-family="system-ui,Segoe UI,sans-serif">Test Blind / Hydrotest Plate Capability</text>
  <text x="56" y="108" font-size="17" font-weight="500" fill="#64748B" font-family="system-ui,Segoe UI,sans-serif">${escapeXml(subtitle)}</text>
  <rect x="40" y="${headerH}" width="${W - 80}" height="44" fill="#ECFDF5"/>
  <text x="52" y="${headerH + 28}" font-size="14" font-weight="800" fill="#065F46" font-family="system-ui,Segoe UI,sans-serif">Plate (T)</text>
  ${npsHeaders}
  ${rows}
  <text x="${W - 56}" y="${H - 40}" text-anchor="end" font-size="16" font-weight="600" fill="#94A3B8" font-family="system-ui,Segoe UI,sans-serif">fieldengineerskit.com</text>
</svg>
`;
}

export function buildBlindFlangeSeoSvg(
  mode: BlindFlangeSeoMode,
  unitSystem: UnitSystem,
): string {
  return mode === "ambient"
    ? buildAmbientSvg(unitSystem)
    : buildHydroSvg(unitSystem);
}
