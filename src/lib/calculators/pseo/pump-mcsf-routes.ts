/**
 * Programmatic SEO path table for Pump MCSF & Thermal Protection.
 * Pattern B (FEK): single `[spec]` segment
 *   {fluid}-{Q}{m3h|gpm}-hso-{H}{m|ft}-p-{P}{kw|hp}
 */

type McsfCase = {
  fluid: "water" | "water-hot" | "naphtha" | "crude" | "amine";
  flow: number;
  flowUnit: "m3h" | "gpm";
  head: number;
  headUnit: "m" | "ft";
  power: number;
  powerUnit: "kw" | "hp";
  density: number;
  cp: number;
  sg: number;
  temp: number;
  deltaTMax: number;
  mcsfRatio: number;
  bypassDp: number;
  label: string;
};

const CASES: McsfCase[] = [
  {
    fluid: "water",
    flow: 200,
    flowUnit: "m3h",
    head: 150,
    headUnit: "m",
    power: 110,
    powerUnit: "kw",
    density: 992,
    cp: 4.18,
    sg: 0.992,
    temp: 40,
    deltaTMax: 5,
    mcsfRatio: 0.35,
    bypassDp: 10,
    label: "Water 200 m³/h · H_so 150 m · 110 kW",
  },
  {
    fluid: "water-hot",
    flow: 150,
    flowUnit: "m3h",
    head: 300,
    headUnit: "m",
    power: 200,
    powerUnit: "kw",
    density: 943,
    cp: 4.25,
    sg: 0.943,
    temp: 120,
    deltaTMax: 5,
    mcsfRatio: 0.4,
    bypassDp: 15,
    label: "Boiler-feed 150 m³/h · H_so 300 m · 200 kW",
  },
  {
    fluid: "naphtha",
    flow: 350,
    flowUnit: "m3h",
    head: 180,
    headUnit: "m",
    power: 160,
    powerUnit: "kw",
    density: 720,
    cp: 2.1,
    sg: 0.72,
    temp: 40,
    deltaTMax: 5,
    mcsfRatio: 0.35,
    bypassDp: 12,
    label: "Naphtha 350 m³/h · H_so 180 m · 160 kW",
  },
  {
    fluid: "crude",
    flow: 1200,
    flowUnit: "gpm",
    head: 450,
    headUnit: "ft",
    power: 250,
    powerUnit: "hp",
    density: 53.06,
    cp: 0.454,
    sg: 0.85,
    temp: 100,
    deltaTMax: 9,
    mcsfRatio: 0.35,
    bypassDp: 145,
    label: "Crude 1200 GPM · H_so 450 ft · 250 HP",
  },
  {
    fluid: "amine",
    flow: 800,
    flowUnit: "gpm",
    head: 650,
    headUnit: "ft",
    power: 300,
    powerUnit: "hp",
    density: 63.67,
    cp: 0.836,
    sg: 1.02,
    temp: 120,
    deltaTMax: 9,
    mcsfRatio: 0.4,
    bypassDp: 200,
    label: "Amine 800 GPM · H_so 650 ft · 300 HP",
  },
];

function fmtNum(value: number): string {
  return String(value).replace(".", "p");
}

export function listPumpMcsfPseoRoutes(slug: string): {
  slug: string;
  spec: string;
  query: Record<string, string>;
  label: string;
}[] {
  return CASES.map((row) => {
    const imperial = row.flowUnit === "gpm" || row.headUnit === "ft";
    const spec = `${row.fluid}-${fmtNum(row.flow)}${row.flowUnit}-hso-${fmtNum(row.head)}${row.headUnit}-p-${fmtNum(row.power)}${row.powerUnit}`;
    return {
      slug,
      spec,
      query: {
        units: imperial ? "imperial" : "metric",
        fluid: row.fluid,
        q: String(row.flow),
        qunit: row.flowUnit,
        hso: String(row.head),
        pwr: String(row.power),
        dens: String(row.density),
        cp: String(row.cp),
        sg: String(row.sg),
        temp: String(row.temp),
        dtmax: String(row.deltaTMax),
        mcsf: String(row.mcsfRatio),
        dp: String(row.bypassDp),
      },
      label: row.label,
    };
  });
}
