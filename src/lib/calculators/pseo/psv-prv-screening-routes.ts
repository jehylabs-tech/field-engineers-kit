/**
 * Pattern B: /calculator/psv-prv-screening/{spec}
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";

const DUTIES: Array<{
  spec: string;
  label: string;
  query: Record<string, string>;
}> = [
  {
    spec: "gas-p10barg-w5000kgh",
    label: "Gas · 10 bar g · 5000 kg/h air",
    query: {
      units: "metric",
      fluidType: "gas",
      setPressure: "10",
      requiredCapacity: "5000",
      molecularWeight: "28.97",
      relievingTemperature: "25",
      overpressurePercent: "10",
      specificHeatRatio: "1.40",
    },
  },
  {
    spec: "gas-p20barg-w10000kgh",
    label: "Gas · 290 psig · 22046 lb/h air",
    query: {
      units: "imperial",
      fluidType: "gas",
      setPressure: "290.08",
      requiredCapacity: "22046",
      molecularWeight: "28.97",
      relievingTemperature: "77",
      overpressurePercent: "10",
      specificHeatRatio: "1.40",
    },
  },
  {
    spec: "liquid-p15barg-q1000lmin",
    label: "Liquid · 15 bar g · 1000 L/min water",
    query: {
      units: "metric",
      fluidType: "liquid",
      setPressure: "15",
      requiredCapacity: "1000",
      liquidDensity: "1.0",
      overpressurePercent: "10",
    },
  },
  {
    spec: "gas-p5barg-w20000kgh",
    label: "Gas · 72.5 psig · 44092 lb/h air",
    query: {
      units: "imperial",
      fluidType: "gas",
      setPressure: "72.52",
      requiredCapacity: "44092",
      molecularWeight: "28.97",
      relievingTemperature: "77",
      overpressurePercent: "10",
      specificHeatRatio: "1.40",
    },
  },
];

export function listPsvPrvPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: duty.spec,
    query: duty.query,
    label: duty.label,
  }));
}

export function parsePsvPrvSpec(
  value: string,
): Record<string, string> | null {
  const hit = DUTIES.find((d) => d.spec === value.toLowerCase());
  return hit ? { ...hit.query } : null;
}
