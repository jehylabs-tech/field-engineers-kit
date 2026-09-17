/**
 * Pattern B: /calculator/water-thermodynamic-properties/{spec}
 * Spec token: {T}{c|f}-{P}{bar|psi}  (decimal → p, e.g. 14p7psi)
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";
import {
  buildWaterThermoSpec,
  parseWaterThermoSpecNumber,
} from "@/lib/calculators/engines/water-thermodynamic-properties";

const DUTIES: Array<{
  units: "metric" | "imperial";
  temperature: number;
  pressure: number;
  label: string;
}> = [
  {
    units: "metric",
    temperature: 20,
    pressure: 1,
    label: "20 °C · 1 bar",
  },
  {
    units: "metric",
    temperature: 100,
    pressure: 1,
    label: "100 °C · 1 bar",
  },
  {
    units: "imperial",
    temperature: 68,
    pressure: 14.7,
    label: "68 °F · 14.7 psi",
  },
  {
    units: "imperial",
    temperature: 212,
    pressure: 14.7,
    label: "212 °F · 14.7 psi",
  },
];

export function listWaterThermoPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => {
    const spec = buildWaterThermoSpec(
      duty.temperature,
      duty.pressure,
      duty.units,
    );
    return {
      slug,
      spec,
      query: {
        units: duty.units,
        temp: String(duty.temperature),
        pressure: String(duty.pressure),
      },
      label: duty.label,
    };
  });
}

/** Parse `{T}c-{P}bar` / `{T}f-{P}psi` → url query. */
export function parseWaterThermoSpec(
  value: string,
): Record<string, string> | null {
  const match = value.match(
    /^(\d+(?:p\d+)?)(c|f)-(\d+(?:p\d+)?)(bar|psi)$/i,
  );
  if (!match) return null;
  const temperature = parseWaterThermoSpecNumber(match[1]);
  const pressure = parseWaterThermoSpecNumber(match[3]);
  if (!Number.isFinite(temperature) || !Number.isFinite(pressure)) return null;
  const tempUnit = match[2].toLowerCase();
  const pUnit = match[4].toLowerCase();
  const imperial = tempUnit === "f" || pUnit === "psi";
  return {
    units: imperial ? "imperial" : "metric",
    temp: String(temperature),
    pressure: String(pressure),
  };
}
