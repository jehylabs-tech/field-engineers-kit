/**
 * Programmatic SEO for Multiple Pump Parallel & Series.
 * Pattern B: `{par|ser}-{N}p-{Q}{m3h|gpm}-hso-{Hso}{m|ft}-hr-{Hr}{m|ft}-hs-{Hs}{m|ft}-hf-{Hf}{m|ft}`
 */

type Case = {
  mode: "parallel" | "series";
  n: number;
  flow: number;
  flowUnit: "m3h" | "gpm";
  hSo: number;
  hRated: number;
  hStatic: number;
  hFric: number;
  headUnit: "m" | "ft";
  label: string;
};

const CASES: Case[] = [
  {
    mode: "parallel",
    n: 2,
    flow: 100,
    flowUnit: "m3h",
    hSo: 60,
    hRated: 45,
    hStatic: 15,
    hFric: 20,
    headUnit: "m",
    label: "2× parallel · 100 m³/h · H_so 60 m",
  },
  {
    mode: "parallel",
    n: 2,
    flow: 250,
    flowUnit: "m3h",
    hSo: 65,
    hRated: 50,
    hStatic: 10,
    hFric: 30,
    headUnit: "m",
    label: "Cooling 2× parallel · 250 m³/h · H_so 65 m",
  },
  {
    mode: "series",
    n: 2,
    flow: 80,
    flowUnit: "m3h",
    hSo: 120,
    hRated: 100,
    hStatic: 150,
    hFric: 40,
    headUnit: "m",
    label: "Boiler-feed 2× series · 80 m³/h · H_so 120 m",
  },
  {
    mode: "parallel",
    n: 3,
    flow: 1500,
    flowUnit: "gpm",
    hSo: 180,
    hRated: 135,
    hStatic: 30,
    hFric: 85,
    headUnit: "ft",
    label: "Chilled water 3× parallel · 1500 GPM",
  },
  {
    mode: "series",
    n: 2,
    flow: 800,
    flowUnit: "gpm",
    hSo: 350,
    hRated: 280,
    hStatic: 400,
    hFric: 120,
    headUnit: "ft",
    label: "Pipeline booster 2× series · 800 GPM",
  },
];

function fmtNum(value: number): string {
  return String(value).replace(".", "p");
}

export function listMultiPumpPseoRoutes(slug: string): {
  slug: string;
  spec: string;
  query: Record<string, string>;
  label: string;
}[] {
  return CASES.map((row) => {
    const imperial = row.flowUnit === "gpm" || row.headUnit === "ft";
    const prefix = row.mode === "parallel" ? "par" : "ser";
    const u = row.headUnit;
    const spec = `${prefix}-${row.n}p-${fmtNum(row.flow)}${row.flowUnit}-hso-${fmtNum(row.hSo)}${u}-hr-${fmtNum(row.hRated)}${u}-hs-${fmtNum(row.hStatic)}${u}-hf-${fmtNum(row.hFric)}${u}`;
    return {
      slug,
      spec,
      query: {
        units: imperial ? "imperial" : "metric",
        mode: row.mode,
        n: String(row.n),
        q: String(row.flow),
        qunit: row.flowUnit,
        hso: String(row.hSo),
        hr: String(row.hRated),
        hs: String(row.hStatic),
        hf: String(row.hFric),
      },
      label: row.label,
    };
  });
}
