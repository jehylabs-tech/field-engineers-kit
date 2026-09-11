/**
 * Programmatic SEO path table for Pump NPSH & Cavitation.
 * Kept separate from the calculation engine so Turbopack / client chunks
 * do not share a mutable graph with generateStaticParams route listing.
 *
 * Pattern B (FEK): single `[spec]` segment
 * `{fluid}-{temp}{c|f}-{flooded|lift}-{height}{m|ft}`
 * e.g. water-20c-flooded-2m · water-68f-lift-10ft
 */

export type PumpNpshPseoFluid = "water" | "seawater" | "condensate" | "light-hc";
export type PumpNpshPseoArr = "flooded" | "lift";

type MetricCase = {
  fluid: PumpNpshPseoFluid;
  tempC: number;
  arr: PumpNpshPseoArr;
  hsM: number;
  hfM: number;
  npshrM: number;
};

type ImperialCase = {
  fluid: PumpNpshPseoFluid;
  tempF: number;
  arr: PumpNpshPseoArr;
  hsFt: number;
  hfFt: number;
  npshrFt: number;
};

const METRIC_CASES: MetricCase[] = [
  { fluid: "water", tempC: 20, arr: "flooded", hsM: 2, hfM: 1, npshrM: 3.5 },
  { fluid: "water", tempC: 20, arr: "lift", hsM: 3, hfM: 1.5, npshrM: 4 },
  { fluid: "water", tempC: 20, arr: "lift", hsM: 5, hfM: 2, npshrM: 4 },
  { fluid: "water", tempC: 40, arr: "flooded", hsM: 2, hfM: 1, npshrM: 3.5 },
  { fluid: "water", tempC: 60, arr: "flooded", hsM: 2, hfM: 1, npshrM: 3.5 },
  { fluid: "water", tempC: 80, arr: "flooded", hsM: 2, hfM: 1, npshrM: 4 },
  { fluid: "water", tempC: 80, arr: "lift", hsM: 2, hfM: 1.5, npshrM: 4 },
  { fluid: "water", tempC: 100, arr: "flooded", hsM: 1, hfM: 0.5, npshrM: 3 },
  { fluid: "seawater", tempC: 25, arr: "flooded", hsM: 2, hfM: 1, npshrM: 3.5 },
  { fluid: "seawater", tempC: 25, arr: "lift", hsM: 3, hfM: 1.5, npshrM: 4 },
  { fluid: "condensate", tempC: 90, arr: "flooded", hsM: 1, hfM: 0.5, npshrM: 3 },
  { fluid: "condensate", tempC: 100, arr: "flooded", hsM: 2, hfM: 0.5, npshrM: 3 },
  { fluid: "light-hc", tempC: 20, arr: "flooded", hsM: 3, hfM: 1, npshrM: 3 },
  { fluid: "light-hc", tempC: 40, arr: "flooded", hsM: 3, hfM: 1, npshrM: 3.5 },
  { fluid: "light-hc", tempC: 40, arr: "lift", hsM: 2, hfM: 1, npshrM: 3.5 },
];

const IMPERIAL_CASES: ImperialCase[] = [
  { fluid: "water", tempF: 68, arr: "flooded", hsFt: 6, hfFt: 3, npshrFt: 11 },
  { fluid: "water", tempF: 68, arr: "lift", hsFt: 10, hfFt: 5, npshrFt: 13 },
  { fluid: "water", tempF: 140, arr: "flooded", hsFt: 6, hfFt: 3, npshrFt: 12 },
  { fluid: "water", tempF: 176, arr: "flooded", hsFt: 6, hfFt: 3, npshrFt: 13 },
  { fluid: "water", tempF: 176, arr: "lift", hsFt: 6, hfFt: 5, npshrFt: 13 },
  { fluid: "seawater", tempF: 77, arr: "flooded", hsFt: 6, hfFt: 3, npshrFt: 11 },
  { fluid: "condensate", tempF: 194, arr: "flooded", hsFt: 3, hfFt: 2, npshrFt: 10 },
  { fluid: "light-hc", tempF: 104, arr: "flooded", hsFt: 10, hfFt: 3, npshrFt: 11 },
];

function fluidLabel(fluid: PumpNpshPseoFluid): string {
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

function fmtHeight(value: number): string {
  return String(value).replace(".", "p");
}

/**
 * Paths + seed query for Pattern B `/calculator/pump-npsh-cavitation/{spec}`.
 * Sitemap / generateStaticParams consume this list via listAllSpecRoutes.
 */
export function listPumpNpshPseoRoutes(slug: string): {
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
    const spec = `${row.fluid}-${row.tempC}c-${row.arr}-${fmtHeight(row.hsM)}m`;
    routes.push({
      slug,
      spec,
      query: {
        units: "metric",
        fluid: row.fluid,
        temp: String(row.tempC),
        arr: row.arr,
        hs: String(row.hsM),
        hf: String(row.hfM),
        npshr: String(row.npshrM),
        ps: "1.01325",
      },
      label: `${fluidLabel(row.fluid)} ${row.tempC} °C · ${row.arr} ${row.hsM} m`,
    });
  }

  for (const row of IMPERIAL_CASES) {
    const spec = `${row.fluid}-${row.tempF}f-${row.arr}-${fmtHeight(row.hsFt)}ft`;
    routes.push({
      slug,
      spec,
      query: {
        units: "imperial",
        fluid: row.fluid,
        temp: String(row.tempF),
        arr: row.arr,
        hs: String(row.hsFt),
        hf: String(row.hfFt),
        npshr: String(row.npshrFt),
        ps: "14.696",
      },
      label: `${fluidLabel(row.fluid)} ${row.tempF} °F · ${row.arr} ${row.hsFt} ft`,
    });
  }

  return routes;
}
