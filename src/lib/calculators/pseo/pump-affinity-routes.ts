/**
 * Programmatic SEO path table for Pump Affinity & Impeller Trimming.
 * Pattern B (FEK): single `[spec]` segment
 * - speed-{N1}-to-{N2}-rpm-{Q}{m3h|gpm}-{H}{m|ft}
 * - trim-{D1}-to-{D2}{mm|in}-{Q}{m3h|gpm}-{H}{m|ft}
 * - combined-{N1}-to-{N2}-rpm-d-{D1}-to-{D2}{mm|in}-{Q}{m3h|gpm}
 */

type SpeedCase = {
  n1: number;
  n2: number;
  flow: number;
  flowUnit: "m3h" | "gpm";
  head: number;
  headUnit: "m" | "ft";
  power: number;
  diameter: number;
};

type TrimCase = {
  d1: number;
  d2: number;
  dimUnit: "mm" | "in";
  flow: number;
  flowUnit: "m3h" | "gpm";
  head: number;
  headUnit: "m" | "ft";
  power: number;
  speed: number;
};

type CombinedCase = {
  n1: number;
  n2: number;
  d1: number;
  d2: number;
  dimUnit: "mm" | "in";
  flow: number;
  flowUnit: "m3h" | "gpm";
  head: number;
  headUnit: "m" | "ft";
  power: number;
};

const SPEED_CASES: SpeedCase[] = [
  {
    n1: 1480,
    n2: 1780,
    flow: 50,
    flowUnit: "m3h",
    head: 25,
    headUnit: "m",
    power: 5.5,
    diameter: 250,
  },
  {
    n1: 2950,
    n2: 1450,
    flow: 100,
    flowUnit: "m3h",
    head: 40,
    headUnit: "m",
    power: 18.5,
    diameter: 200,
  },
  {
    n1: 1480,
    n2: 1200,
    flow: 80,
    flowUnit: "m3h",
    head: 30,
    headUnit: "m",
    power: 11,
    diameter: 280,
  },
  {
    n1: 1750,
    n2: 1450,
    flow: 200,
    flowUnit: "gpm",
    head: 80,
    headUnit: "ft",
    power: 10,
    diameter: 10,
  },
  {
    n1: 3550,
    n2: 1780,
    flow: 500,
    flowUnit: "gpm",
    head: 120,
    headUnit: "ft",
    power: 40,
    diameter: 8,
  },
  {
    n1: 1750,
    n2: 2100,
    flow: 150,
    flowUnit: "gpm",
    head: 60,
    headUnit: "ft",
    power: 7.5,
    diameter: 9,
  },
];

const TRIM_CASES: TrimCase[] = [
  {
    d1: 250,
    d2: 230,
    dimUnit: "mm",
    flow: 50,
    flowUnit: "m3h",
    head: 25,
    headUnit: "m",
    power: 5.5,
    speed: 1480,
  },
  {
    d1: 300,
    d2: 270,
    dimUnit: "mm",
    flow: 100,
    flowUnit: "m3h",
    head: 40,
    headUnit: "m",
    power: 15,
    speed: 1480,
  },
  {
    d1: 280,
    d2: 210,
    dimUnit: "mm",
    flow: 80,
    flowUnit: "m3h",
    head: 35,
    headUnit: "m",
    power: 11,
    speed: 2950,
  },
  {
    d1: 10,
    d2: 9,
    dimUnit: "in",
    flow: 200,
    flowUnit: "gpm",
    head: 80,
    headUnit: "ft",
    power: 10,
    speed: 1750,
  },
  {
    d1: 12,
    d2: 10.5,
    dimUnit: "in",
    flow: 500,
    flowUnit: "gpm",
    head: 120,
    headUnit: "ft",
    power: 40,
    speed: 1750,
  },
];

const COMBINED_CASES: CombinedCase[] = [
  {
    n1: 1480,
    n2: 1780,
    d1: 250,
    d2: 230,
    dimUnit: "mm",
    flow: 50,
    flowUnit: "m3h",
    head: 25,
    headUnit: "m",
    power: 5.5,
  },
  {
    n1: 1750,
    n2: 1450,
    d1: 10,
    d2: 9,
    dimUnit: "in",
    flow: 200,
    flowUnit: "gpm",
    head: 80,
    headUnit: "ft",
    power: 10,
  },
];

function fmtNum(value: number): string {
  return String(value).replace(".", "p");
}

export function listPumpAffinityPseoRoutes(slug: string): {
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

  for (const row of SPEED_CASES) {
    const imperial = row.flowUnit === "gpm";
    const spec = `speed-${fmtNum(row.n1)}-to-${fmtNum(row.n2)}-rpm-${fmtNum(row.flow)}${row.flowUnit}-${fmtNum(row.head)}${row.headUnit}`;
    routes.push({
      slug,
      spec,
      query: {
        units: imperial ? "imperial" : "metric",
        mode: "speed",
        n1: String(row.n1),
        n2: String(row.n2),
        d1: String(row.diameter),
        d2: String(row.diameter),
        q: String(row.flow),
        qunit: row.flowUnit,
        head: String(row.head),
        pwr: String(row.power),
      },
      label: `Speed ${row.n1}→${row.n2} RPM · ${row.flow} ${row.flowUnit === "gpm" ? "GPM" : "m³/h"} · ${row.head} ${row.headUnit}`,
    });
  }

  for (const row of TRIM_CASES) {
    const imperial = row.dimUnit === "in";
    const spec = `trim-${fmtNum(row.d1)}-to-${fmtNum(row.d2)}${row.dimUnit}-${fmtNum(row.flow)}${row.flowUnit}-${fmtNum(row.head)}${row.headUnit}`;
    routes.push({
      slug,
      spec,
      query: {
        units: imperial ? "imperial" : "metric",
        mode: "diameter",
        n1: String(row.speed),
        n2: String(row.speed),
        d1: String(row.d1),
        d2: String(row.d2),
        q: String(row.flow),
        qunit: row.flowUnit,
        head: String(row.head),
        pwr: String(row.power),
      },
      label: `Trim ${row.d1}→${row.d2} ${row.dimUnit} · ${row.flow} ${row.flowUnit === "gpm" ? "GPM" : "m³/h"} · ${row.head} ${row.headUnit}`,
    });
  }

  for (const row of COMBINED_CASES) {
    const imperial = row.dimUnit === "in";
    const spec = `combined-${fmtNum(row.n1)}-to-${fmtNum(row.n2)}-rpm-d-${fmtNum(row.d1)}-to-${fmtNum(row.d2)}${row.dimUnit}-${fmtNum(row.flow)}${row.flowUnit}`;
    routes.push({
      slug,
      spec,
      query: {
        units: imperial ? "imperial" : "metric",
        mode: "combined",
        n1: String(row.n1),
        n2: String(row.n2),
        d1: String(row.d1),
        d2: String(row.d2),
        q: String(row.flow),
        qunit: row.flowUnit,
        head: String(row.head),
        pwr: String(row.power),
      },
      label: `VFD+trim ${row.n1}→${row.n2} RPM · D ${row.d1}→${row.d2} ${row.dimUnit}`,
    });
  }

  return routes;
}
