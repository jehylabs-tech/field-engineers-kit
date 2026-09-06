/**
 * Unit-aware copy tokens for calculator SEO FAQ / How-to.
 *
 * Tokens (metric stored in source; imperial resolved at render):
 * - {{u:velocity}} → m/s | ft/s
 * - {{u:density}}  → kg/m³ | lb/ft³
 * - {{u:flow}}     → m³/h | GPM
 * - {{u:pressure}} → bar | psi
 * - {{u:length}}   → mm | in
 * - {{u:lengthLarge}} → m | ft
 * - {{u:temperature}} → °C | °F
 * - {{u:torque}}   → N·m | ft-lb
 * - {{pick:metric text|imperial text}}
 *
 * JSON-LD / stripFaqMarkdown always flattens to the metric side.
 */
import type { UnitSystem } from "@/lib/calculators/definitions";
import { unitSymbol, type UnitQuantity } from "@/lib/unitConverter";

const TOKEN_QUANTITIES = new Set<string>([
  "length",
  "lengthLarge",
  "velocity",
  "flow",
  "pressure",
  "density",
  "temperature",
  "mass",
  "linearMass",
  "area",
  "torque",
]);

function torqueSymbol(system: UnitSystem): string {
  return system === "imperial" ? "ft-lb" : "N·m";
}

export function resolveUnitToken(
  quantity: string,
  system: UnitSystem,
): string {
  if (quantity === "torque") return torqueSymbol(system);
  if (TOKEN_QUANTITIES.has(quantity) && quantity !== "torque") {
    return unitSymbol(quantity as UnitQuantity, system);
  }
  return quantity;
}

/** Flatten {{u:…}} / {{pick:…}} for crawlers (always metric / left side). */
export function flattenUnitTokens(
  text: string,
  system: UnitSystem = "metric",
): string {
  let out = text.replace(/\{\{u:([a-zA-Z]+)\}\}/g, (_, qty: string) =>
    resolveUnitToken(qty, system),
  );
  out = out.replace(
    /\{\{pick:([^|{}]+)\|([^|{}]+)\}\}/g,
    (_, metric: string, imperial: string) =>
      system === "imperial" ? imperial.trim() : metric.trim(),
  );
  return out;
}

export type SeoTableQuantity =
  | "flow"
  | "velocity"
  | "pressure"
  | "torque"
  | "density"
  | "length"
  | "lengthLarge"
  | "temperature";

export type SeoTableColumnUnit = {
  index: number;
  quantity: SeoTableQuantity;
  /** Display digits after conversion (default by quantity). */
  digits?: number;
};

const HEADER_UNIT_PAIRS: [RegExp, string, string][] = [
  [/\(N·m\)/g, "(N·m)", "(ft-lb)"],
  [/\(m³\/h\)/g, "(m³/h)", "(GPM)"],
  [/\(m\/s\)/g, "(m/s)", "(ft/s)"],
  [/\(kg\/m³\)/g, "(kg/m³)", "(lb/ft³)"],
  [/\(°C\)/g, "(°C)", "(°F)"],
  [/\(mm\)/g, "(mm)", "(in)"],
  // lengthLarge (m) — avoid matching mm; use word-boundary style
  [/\(m\)/g, "(m)", "(ft)"],
  [/\(bar\)/g, "(bar)", "(psi)"],
];

export function rewriteUnitLabels(
  text: string,
  system: UnitSystem,
): string {
  if (system !== "imperial") return text;
  let out = text;
  for (const [re, , imperial] of HEADER_UNIT_PAIRS) {
    out = out.replace(re, imperial);
  }
  // Caption phrases without parentheses (valve-cv / flow tables)
  out = out.replace(/Q in m³\/h/g, "Q in GPM");
  out = out.replace(/ΔP in bar/g, "ΔP in psi");
  // Captions like "ΔP 1 bar" → "ΔP 14.5 psi"
  out = out.replace(/ΔP (\d+(?:\.\d+)?) bar/g, (_, n: string) => {
    const bar = Number(n);
    if (!Number.isFinite(bar)) return `ΔP ${n} bar`;
    const psi = bar * 14.5037738;
    return `ΔP ${psi >= 10 ? psi.toFixed(0) : psi.toFixed(1)} psi`;
  });
  return out;
}

function defaultDigits(quantity: SeoTableQuantity): number {
  switch (quantity) {
    case "flow":
      return 1;
    case "velocity":
      return 2;
    case "pressure":
      return 2;
    case "torque":
      return 0;
    case "density":
      return 1;
    case "length":
      return 2;
    case "lengthLarge":
      return 1;
    case "temperature":
      return 1;
    default:
      return 2;
  }
}

function convertSiValue(
  value: number,
  quantity: SeoTableQuantity,
  system: UnitSystem,
): number {
  if (system !== "imperial") return value;
  switch (quantity) {
    case "flow":
      return value * 4.402867513;
    case "velocity":
      return value * 3.280839895;
    case "pressure":
      return value * 14.5037738;
    case "torque":
      return value * 0.737562;
    case "density":
      return value * 0.06242796;
    case "length":
      return value / 25.4;
    case "lengthLarge":
      return value * 3.280839895;
    case "temperature":
      return value * 1.8 + 32;
    default:
      return value;
  }
}

/**
 * Convert a SI-stored table cell for display. Preserves leading "~" approximations.
 */
export function convertSeoTableCell(
  raw: string,
  quantity: SeoTableQuantity,
  system: UnitSystem,
  digits?: number,
): string {
  if (system !== "imperial") return raw;
  const trimmed = raw.trim();
  const approx = trimmed.startsWith("~");
  const numericPart = approx ? trimmed.slice(1).trim() : trimmed;
  // Skip non-numeric status cells
  if (!/^-?\d/.test(numericPart) && !/^\d/.test(numericPart)) return raw;
  const n = Number(numericPart.replace(/,/g, ""));
  if (!Number.isFinite(n)) return raw;
  const converted = convertSiValue(n, quantity, system);
  const d = digits ?? defaultDigits(quantity);
  const rounded =
    quantity === "torque"
      ? String(Math.round(converted))
      : converted.toFixed(d);
  return approx ? `~${rounded}` : rounded;
}
