/**
 * Canonical plant variables shared across calculators.
 * URL is the source of truth — no separate Zustand store required.
 */

export const PLANT_CONTEXT_KEYS = [
  "size",
  "schedule",
  "material",
  "pressure",
  "temperature",
  "class_rating",
] as const;

export type PlantContextKey = (typeof PLANT_CONTEXT_KEYS)[number];

export type PressureUnit = "bar" | "psi" | "MPa";
export type TemperatureUnit = "C" | "F";

export type PlantPressure = {
  value: number;
  unit: PressureUnit;
};

export type PlantTemperature = {
  value: number;
  unit: TemperatureUnit;
};

export type PlantContext = {
  size?: string;
  schedule?: string;
  material?: string;
  pressure?: PlantPressure;
  temperature?: PlantTemperature;
  class_rating?: string;
};

/** Aliases accepted when reading URL query params. */
export const PLANT_PARAM_ALIASES: Record<PlantContextKey, string[]> = {
  size: ["size", "nps"],
  schedule: ["schedule", "sch"],
  material: ["material"],
  pressure: ["pressure"],
  temperature: ["temperature", "temp"],
  class_rating: ["class_rating", "class"],
};

const PRESSURE_RE = /^(-?\d+(?:\.\d+)?)(bar|psi|mpa)$/i;
const TEMP_RE = /^(-?\d+(?:\.\d+)?)([cf])$/i;

export function normalizeNps(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const dnMatch = trimmed.match(/^DN\s*(\d+)$/i);
  if (dnMatch) {
    const dn = Number(dnMatch[1]);
    const dnToNps: Record<number, string> = {
      50: "2",
      100: "4",
      150: "6",
      200: "8",
    };
    return dnToNps[dn] ?? String(dn);
  }

  const aMatch = trimmed.match(/^(\d+)\s*A$/i);
  if (aMatch) {
    const a = Number(aMatch[1]);
    const aToNps: Record<number, string> = {
      50: "2",
      100: "4",
      150: "6",
      200: "8",
    };
    return aToNps[a] ?? String(a);
  }

  const npsMatch = trimmed.match(/^(?:NPS\s*)?(\d+(?:\.\d+)?)\s*(?:in|")?$/i);
  if (npsMatch) return npsMatch[1];

  return trimmed;
}

export function formatSizeLabel(nps: string): string {
  return `${nps}in`;
}

export function normalizeSchedule(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.trim().match(/^(?:Sch(?:edule)?\s*)?(\d+[A-Za-z]?|XXS|XS|STD)$/i);
  if (!match) return raw.trim();
  return match[1];
}

export function normalizeClassRating(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.trim().match(/^(?:Class|CL\.?)\s*(\d+)$/i);
  if (match) return match[1];
  if (/^\d+$/.test(raw.trim())) return raw.trim();
  return raw.trim();
}

export function parsePressure(raw: string | null): PlantPressure | undefined {
  if (!raw) return undefined;
  const match = raw.trim().match(PRESSURE_RE);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return undefined;
  const unitRaw = match[2].toLowerCase();
  const unit: PressureUnit =
    unitRaw === "bar" ? "bar" : unitRaw === "psi" ? "psi" : "MPa";
  return { value, unit };
}

export function parseTemperature(raw: string | null): PlantTemperature | undefined {
  if (!raw) return undefined;
  const match = raw.trim().match(TEMP_RE);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return undefined;
  return { value, unit: match[2].toUpperCase() === "F" ? "F" : "C" };
}

export function serializePressure(pressure: PlantPressure): string {
  return `${pressure.value}${pressure.unit === "MPa" ? "MPa" : pressure.unit}`;
}

export function serializeTemperature(temperature: PlantTemperature): string {
  return `${temperature.value}${temperature.unit}`;
}

export function pressureToMpa(pressure: PlantPressure): number {
  if (pressure.unit === "MPa") return pressure.value;
  if (pressure.unit === "bar") return pressure.value / 10;
  return pressure.value / 145.0377;
}

export function pressureToPsi(pressure: PlantPressure): number {
  if (pressure.unit === "psi") return pressure.value;
  if (pressure.unit === "bar") return pressure.value * 14.5038;
  return pressure.value * 145.0377;
}

export function temperatureToC(temperature: PlantTemperature): number {
  if (temperature.unit === "F") return (temperature.value - 32) / 1.8;
  return temperature.value;
}

export function temperatureToF(temperature: PlantTemperature): number {
  if (temperature.unit === "C") return temperature.value * 1.8 + 32;
  return temperature.value;
}

export function pressureToBar(pressure: PlantPressure): number {
  if (pressure.unit === "bar") return pressure.value;
  if (pressure.unit === "MPa") return pressure.value * 10;
  return pressure.value / 14.5038;
}

export function isBareNumberParam(value: string | null): boolean {
  if (!value) return false;
  return /^-?\d+(?:\.\d+)?$/.test(value.trim());
}

export function parsePlantContextFromSearchParams(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
): PlantContext {
  const get = (key: string) => searchParams.get(key);

  const sizeRaw = get("size") ?? get("nps");
  const scheduleRaw = get("schedule") ?? get("sch");
  const materialRaw = get("material");
  const pressureRaw = get("pressure");
  const temperatureRaw = get("temperature") ?? get("temp");
  const classRaw = get("class_rating") ?? get("class");

  const ctx: PlantContext = {};

  const size = normalizeNps(sizeRaw ?? undefined);
  if (size) ctx.size = formatSizeLabel(size);

  const schedule = normalizeSchedule(scheduleRaw ?? undefined);
  if (schedule) ctx.schedule = schedule.startsWith("Sch")
    ? schedule
    : `Sch ${schedule}`;

  if (materialRaw && !isBareNumberParam(materialRaw)) {
    // Keep grade strings (A106B) and enum ids (carbon-steel)
    ctx.material = materialRaw;
  }

  // Prefer unit-suffixed pressure for the plant bus.
  // Bare numbers stay calculator-local (MPa/psi field values).
  const pressure = parsePressure(pressureRaw);
  if (pressure) ctx.pressure = pressure;

  const temperature = parseTemperature(temperatureRaw);
  if (temperature) {
    ctx.temperature = temperature;
  } else if (temperatureRaw && isBareNumberParam(temperatureRaw)) {
    ctx.temperature = { value: Number(temperatureRaw), unit: "C" };
  }

  const classRating = normalizeClassRating(classRaw ?? undefined);
  if (classRating) ctx.class_rating = `Class ${classRating}`;

  return ctx;
}

export function writePlantContextToSearchParams(
  params: URLSearchParams,
  ctx: PlantContext,
) {
  if (ctx.size) params.set("size", ctx.size);
  if (ctx.schedule) {
    const sch = normalizeSchedule(ctx.schedule);
    if (sch) params.set("schedule", sch);
  }
  if (ctx.material) params.set("material", ctx.material);
  if (ctx.pressure) params.set("pressure", serializePressure(ctx.pressure));
  if (ctx.temperature) {
    params.set("temperature", serializeTemperature(ctx.temperature));
  }
  if (ctx.class_rating) {
    const cls = normalizeClassRating(ctx.class_rating);
    if (cls) params.set("class_rating", cls);
  }
}

export function plantContextLabel(ctx: PlantContext): string {
  const parts: string[] = [];
  if (ctx.size) parts.push(ctx.size);
  if (ctx.schedule) parts.push(ctx.schedule);
  if (ctx.class_rating) parts.push(ctx.class_rating);
  if (ctx.pressure) parts.push(serializePressure(ctx.pressure));
  if (ctx.material) parts.push(ctx.material);
  if (ctx.temperature) parts.push(serializeTemperature(ctx.temperature));
  return parts.join(" · ");
}

export function buildCalculatorHref(
  slug: string,
  ctx: PlantContext,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams();
  writePlantContextToSearchParams(params, ctx);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `/calculator/${slug}?${query}` : `/calculator/${slug}`;
}
