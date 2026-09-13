/**
 * Programmatic SEO path table for TDH & Pump Power.
 * Pattern B (FEK): single `[spec]` segment
 * `{fluid}-{flow}{m3h|gpm}-hs-{H}{m|ft}-hf-{F}{m|ft}`
 * e.g. water-50m3h-hs-20m-hf-5m · water-100gpm-hs-60ft-hf-15ft
 */

export type TdhPseoFluid = "water" | "seawater" | "condensate" | "light-hc";

type MetricCase = {
  fluid: TdhPseoFluid;
  flowM3h: number;
  hsM: number;
  hfM: number;
  etaP: number;
};

type ImperialCase = {
  fluid: TdhPseoFluid;
  flowGpm: number;
  hsFt: number;
  hfFt: number;
  etaP: number;
};

const METRIC_CASES: MetricCase[] = [
  { fluid: "water", flowM3h: 20, hsM: 10, hfM: 3, etaP: 0.7 },
  { fluid: "water", flowM3h: 50, hsM: 20, hfM: 5, etaP: 0.7 },
  { fluid: "water", flowM3h: 50, hsM: 30, hfM: 8, etaP: 0.7 },
  { fluid: "water", flowM3h: 100, hsM: 20, hfM: 5, etaP: 0.75 },
  { fluid: "water", flowM3h: 100, hsM: 40, hfM: 10, etaP: 0.75 },
  { fluid: "water", flowM3h: 200, hsM: 25, hfM: 8, etaP: 0.78 },
  { fluid: "seawater", flowM3h: 50, hsM: 15, hfM: 5, etaP: 0.7 },
  { fluid: "seawater", flowM3h: 100, hsM: 20, hfM: 6, etaP: 0.72 },
  { fluid: "condensate", flowM3h: 30, hsM: 25, hfM: 4, etaP: 0.68 },
  { fluid: "light-hc", flowM3h: 40, hsM: 30, hfM: 6, etaP: 0.7 },
  { fluid: "light-hc", flowM3h: 80, hsM: 20, hfM: 5, etaP: 0.72 },
];

const IMPERIAL_CASES: ImperialCase[] = [
  { fluid: "water", flowGpm: 50, hsFt: 30, hfFt: 10, etaP: 0.7 },
  { fluid: "water", flowGpm: 100, hsFt: 60, hfFt: 15, etaP: 0.7 },
  { fluid: "water", flowGpm: 200, hsFt: 80, hfFt: 20, etaP: 0.75 },
  { fluid: "water", flowGpm: 500, hsFt: 100, hfFt: 25, etaP: 0.78 },
  { fluid: "seawater", flowGpm: 150, hsFt: 50, hfFt: 15, etaP: 0.7 },
  { fluid: "condensate", flowGpm: 100, hsFt: 80, hfFt: 12, etaP: 0.68 },
  { fluid: "light-hc", flowGpm: 120, hsFt: 70, hfFt: 18, etaP: 0.7 },
];

const DENSITY: Record<TdhPseoFluid, { metric: string; imperial: string }> = {
  water: { metric: "998", imperial: "62.3" },
  seawater: { metric: "1025", imperial: "64.0" },
  condensate: { metric: "960", imperial: "59.9" },
  "light-hc": { metric: "750", imperial: "46.8" },
};

function fluidLabel(fluid: TdhPseoFluid): string {
  switch (fluid) {
    case "seawater":
      return "Seawater";
    case "condensate":
      return "Condensate";
    case "light-hc":
      return "Light HC";
    default:
      return "Water";
  }
}

function fmtNum(value: number): string {
  return String(value).replace(".", "p");
}

export function listPumpTdhPseoRoutes(slug: string): {
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

  for (const row of METRIC_CASES) {
    const spec = `${row.fluid}-${fmtNum(row.flowM3h)}m3h-hs-${fmtNum(row.hsM)}m-hf-${fmtNum(row.hfM)}m`;
    routes.push({
      slug,
      spec,
      query: {
        units: "metric",
        fluid: row.fluid,
        q: String(row.flowM3h),
        qunit: "m3h",
        hs: String(row.hsM),
        hf: String(row.hfM),
        hp: "0",
        dens: DENSITY[row.fluid].metric,
        etap: String(row.etaP),
        etam: "0.92",
        sf: "1.15",
      },
      label: `${fluidLabel(row.fluid)} ${row.flowM3h} m³/h · Hs ${row.hsM} m · Hf ${row.hfM} m`,
    });
  }

  for (const row of IMPERIAL_CASES) {
    const spec = `${row.fluid}-${fmtNum(row.flowGpm)}gpm-hs-${fmtNum(row.hsFt)}ft-hf-${fmtNum(row.hfFt)}ft`;
    routes.push({
      slug,
      spec,
      query: {
        units: "imperial",
        fluid: row.fluid,
        q: String(row.flowGpm),
        qunit: "gpm",
        hs: String(row.hsFt),
        hf: String(row.hfFt),
        hp: "0",
        dens: DENSITY[row.fluid].imperial,
        etap: String(row.etaP),
        etam: "0.92",
        sf: "1.15",
      },
      label: `${fluidLabel(row.fluid)} ${row.flowGpm} GPM · Hs ${row.hsFt} ft · Hf ${row.hfFt} ft`,
    });
  }

  return routes;
}
