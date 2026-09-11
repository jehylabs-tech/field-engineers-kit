/**
 * Pump NPSH available & cavitation margin — field screening.
 *
 * Basis (definitions / practice):
 * - Hydraulic Institute ANSI/HI 9.6.1 — NPSH margin
 * - ASME B73.1 — chemical process pumps (NPSH per HI)
 * - API 610 — centrifugal pumps for petroleum (NPSHa vs NPSHr)
 *
 * NPSHa = (Ps − Pv)/(ρ g) + zs − hf
 *   zs > 0 flooded (liquid above pump CL); zs < 0 suction lift
 *
 * Screening only — confirm against pump curve, HI margin policy, and project specs.
 */

import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";

export type NpshFluid = "water" | "seawater" | "condensate" | "light-hc";
export type SuctionArrangement = "flooded" | "lift";

export type PumpNpshInputs = {
  unitSystem: UnitSystem;
  fluid: NpshFluid;
  /** Liquid temperature: °C (metric) or °F (imperial). */
  temperature: number;
  /** Absolute pressure at free surface: bar a (metric) or psi a (imperial). */
  surfacePressureAbs: number;
  arrangement: SuctionArrangement;
  /** |z| geometric height, m or ft. */
  staticHeight: number;
  /** Suction friction + fittings head loss, m or ft. */
  frictionLoss: number;
  /** Required NPSH from pump curve / datasheet, m or ft. */
  npshr: number;
};

export const NPSH_FLUID_OPTIONS: {
  value: NpshFluid;
  label: string;
  shortLabel: string;
}[] = [
  { value: "water", label: "Fresh water", shortLabel: "Water" },
  { value: "seawater", label: "Seawater", shortLabel: "Seawater" },
  { value: "condensate", label: "Steam condensate (water-like)", shortLabel: "Condensate" },
  {
    value: "light-hc",
    label: "Light hydrocarbon (screening)",
    shortLabel: "Light HC",
  },
];

export const NPSH_ARRANGEMENT_OPTIONS: {
  value: SuctionArrangement;
  label: string;
}[] = [
  { value: "flooded", label: "Flooded suction (liquid above pump)" },
  { value: "lift", label: "Suction lift (liquid below pump)" },
];

/** Default: water 20 °C, atmospheric tank, flooded 2 m, Hf 1 m, NPSHr 3.5 m. */
export const DEFAULT_PUMP_NPSH_INPUTS: PumpNpshInputs = {
  unitSystem: "metric",
  fluid: "water",
  temperature: 20,
  surfacePressureAbs: 1.01325,
  arrangement: "flooded",
  staticHeight: 2,
  frictionLoss: 1,
  npshr: 3.5,
};

const G = 9.80665;
const P_ATM_BAR = 1.01325;
const P_ATM_PSI = 14.6959;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Display temperature → °C. */
export function temperatureToC(
  temperature: number,
  unitSystem: UnitSystem,
): number {
  const t = finite(temperature);
  return unitSystem === "imperial" ? ((t - 32) * 5) / 9 : t;
}

/** Absolute surface pressure → Pa. */
export function surfacePressureToPa(inputs: PumpNpshInputs): number {
  const p = Math.max(0, finite(inputs.surfacePressureAbs));
  if (inputs.unitSystem === "imperial") {
    return p * 6894.757293168;
  }
  return p * 1e5;
}

/** Head display unit ↔ metres. */
function headToM(value: number, unitSystem: UnitSystem): number {
  const h = finite(value);
  return unitSystem === "imperial" ? h * 0.3048 : h;
}

function mToHead(m: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? m / 0.3048 : m;
}

/**
 * Water vapor pressure (Pa) — Antoine (mmHg), valid ~1–100 °C.
 * Extended outside range by clamp for screening only.
 */
export function waterVaporPressurePa(tempC: number): number {
  const t = clamp(tempC, 1, 100);
  const a = 8.07131;
  const b = 1730.63;
  const c = 233.426;
  const mmHg = 10 ** (a - b / (c + t));
  return mmHg * 133.322368;
}

/** Approximate liquid density (kg/m³) for screening fluids. */
export function fluidDensityKgM3(fluid: NpshFluid, tempC: number): number {
  const t = clamp(tempC, 0, 120);
  // Soft water density curve near ambient–hot service.
  const water =
    1000 -
    0.0178 * (t - 4) ** 1.7 -
    0.0003 * Math.max(0, t - 20) * Math.max(0, t - 40);
  switch (fluid) {
    case "seawater":
      return Math.max(1000, water * 1.025);
    case "condensate":
      return Math.max(900, water);
    case "light-hc":
      // Gasoline / light naphtha screening density.
      return Math.max(650, 780 - 0.7 * (t - 15));
    case "water":
    default:
      return Math.max(900, water);
  }
}

/**
 * Vapor pressure (Pa). Condensate ≈ water; seawater ≈ 0.98× water;
 * light HC uses a Reid-VP style screening curve (not a flash calculation).
 */
export function fluidVaporPressurePa(fluid: NpshFluid, tempC: number): number {
  const t = clamp(tempC, 0, 120);
  const pvWater = waterVaporPressurePa(t);
  switch (fluid) {
    case "seawater":
      return pvWater * 0.98;
    case "condensate":
      return pvWater;
    case "light-hc": {
      // Screening: ~35 kPa @ 20 °C → ~90 kPa @ 60 °C (light ends).
      const pv = 25_000 * Math.exp(0.028 * (t - 15));
      return clamp(pv, 5_000, 180_000);
    }
    case "water":
    default:
      return pvWater;
  }
}

export type PumpNpshComputed = {
  tempC: number;
  densityKgM3: number;
  surfacePa: number;
  vaporPa: number;
  /** Absolute surface pressure head (m). */
  haM: number;
  /** Vapor pressure head (m). */
  hvpM: number;
  /** Signed static head (m): +flooded / −lift. */
  zsM: number;
  frictionM: number;
  npshrM: number;
  npshaM: number;
  marginM: number;
  ratio: number;
  invalid: boolean;
};

export function computePumpNpsh(inputs: PumpNpshInputs): PumpNpshComputed {
  const tempC = temperatureToC(inputs.temperature, inputs.unitSystem);
  const densityKgM3 = fluidDensityKgM3(inputs.fluid, tempC);
  const surfacePa = surfacePressureToPa(inputs);
  const vaporPa = fluidVaporPressurePa(inputs.fluid, tempC);
  const rhoG = densityKgM3 * G;

  const haM = rhoG > 0 ? surfacePa / rhoG : 0;
  const hvpM = rhoG > 0 ? vaporPa / rhoG : 0;
  const heightM = Math.max(0, headToM(inputs.staticHeight, inputs.unitSystem));
  const zsM = inputs.arrangement === "lift" ? -heightM : heightM;
  const frictionM = Math.max(0, headToM(inputs.frictionLoss, inputs.unitSystem));
  const npshrM = Math.max(0, headToM(inputs.npshr, inputs.unitSystem));

  const invalid =
    densityKgM3 <= 0 ||
    surfacePa <= 0 ||
    npshrM <= 0 ||
    !Number.isFinite(haM) ||
    !Number.isFinite(hvpM);

  const npshaM = invalid ? 0 : haM + zsM - hvpM - frictionM;
  const marginM = npshaM - npshrM;
  const ratio = npshrM > 0 ? npshaM / npshrM : 0;

  return {
    tempC,
    densityKgM3,
    surfacePa,
    vaporPa,
    haM,
    hvpM,
    zsM,
    frictionM,
    npshrM,
    npshaM,
    marginM,
    ratio,
    invalid,
  };
}

function formatHead(m: number, unitSystem: UnitSystem, digits = 2): string {
  if (!Number.isFinite(m)) return unitSystem === "imperial" ? "— ft" : "— m";
  const v = mToHead(m, unitSystem);
  return unitSystem === "imperial"
    ? `${v.toFixed(digits)} ft`
    : `${v.toFixed(digits)} m`;
}

function formatPressureAbs(pa: number, unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") {
    return `${(pa / 6894.757293168).toFixed(2)} psi a`;
  }
  return `${(pa / 1e5).toFixed(3)} bar a`;
}

function formatDensity(kgM3: number, unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") {
    return `${(kgM3 * 0.06242796).toFixed(2)} lb/ft³`;
  }
  return `${kgM3.toFixed(1)} kg/m³`;
}

function statusFor(c: PumpNpshComputed): {
  level: StatusLevel;
  label: string;
} {
  if (c.invalid) {
    return {
      level: "warn",
      label: "Enter positive surface pressure and NPSHr",
    };
  }
  if (c.npshaM < c.npshrM || c.marginM < 0) {
    return {
      level: "fail",
      label: "Cavitation risk — NPSHa < NPSHr (increase head / cool fluid / cut losses)",
    };
  }
  // HI 9.6.1 style screening: ratio < 1.1 or thin absolute margin (~0.5 m / 1.6 ft).
  if (c.ratio < 1.1 || c.marginM < 0.5) {
    return {
      level: "warn",
      label: "Marginal NPSH — HI 9.6.1 often wants ≥1.1× NPSHr (service-dependent)",
    };
  }
  // Near-boiling: Ps − Pv is thin even if margin still clears a low NPSHr.
  if (c.surfacePa > 0 && c.vaporPa / c.surfacePa > 0.85) {
    return {
      level: "warn",
      label: "High vapor pressure vs surface — near-boiling suction; confirm margin carefully",
    };
  }
  if (c.ratio < 1.3) {
    return {
      level: "pass",
      label: "Adequate for many continuous duties — confirm HI / API project margin",
    };
  }
  return {
    level: "pass",
    label: "Comfortable NPSH margin for typical continuous centrifugal service",
  };
}

export function calculatePumpNpsh(inputs: PumpNpshInputs): CalculatorOutput {
  const c = computePumpNpsh(inputs);
  const fluidLabel =
    NPSH_FLUID_OPTIONS.find((f) => f.value === inputs.fluid)?.label ??
    inputs.fluid;
  const arrLabel =
    inputs.arrangement === "lift" ? "Suction lift" : "Flooded suction";
  const status = statusFor(c);
  const headUnit = inputs.unitSystem === "imperial" ? "ft" : "m";

  const npshaOut = c.invalid
    ? "—"
    : formatHead(c.npshaM, inputs.unitSystem);
  const marginOut = c.invalid
    ? "—"
    : formatHead(c.marginM, inputs.unitSystem);
  const ratioOut = c.invalid || c.npshrM <= 0 ? "—" : `${c.ratio.toFixed(2)} ×`;

  return {
    heroLabel: "NPSHa (available)",
    heroValue: npshaOut,
    heroStatus: status.label,
    heroStatusLevel: status.level,
    heroBadges: [
      { label: "Margin", value: marginOut },
      { label: "NPSHa/NPSHr", value: ratioOut },
      { label: "Hvp", value: formatHead(c.hvpM, inputs.unitSystem) },
      { label: "NPSHr", value: formatHead(c.npshrM, inputs.unitSystem) },
    ],
    summary: [
      { label: "NPSHa", value: npshaOut },
      { label: "NPSH margin", value: marginOut },
      { label: "Margin ratio", value: ratioOut },
    ],
    summaryStatus: {
      label:
        "HI 9.6.1 / ASME B73.1 / API 610 screening — not a substitute for vendor NPSHr or project margin policy",
      level: "neutral",
    },
    rows: [
      {
        label: "Fluid",
        value: fluidLabel,
        section: "Liquid & surface",
      },
      {
        label: "Temperature",
        value:
          inputs.unitSystem === "imperial"
            ? `${finite(inputs.temperature).toFixed(0)} °F (${c.tempC.toFixed(1)} °C)`
            : `${finite(inputs.temperature).toFixed(1)} °C`,
        section: "Liquid & surface",
      },
      {
        label: "Density ρ",
        value: formatDensity(c.densityKgM3, inputs.unitSystem),
        section: "Liquid & surface",
      },
      {
        label: "Surface pressure Ps (abs)",
        value: formatPressureAbs(c.surfacePa, inputs.unitSystem),
        section: "Liquid & surface",
      },
      {
        label: "Vapor pressure Pv",
        value: formatPressureAbs(c.vaporPa, inputs.unitSystem),
        section: "Liquid & surface",
        emphasis: true,
      },
      {
        label: "Surface pressure head Ha",
        value: formatHead(c.haM, inputs.unitSystem),
        section: "Head terms",
      },
      {
        label: "Vapor head Hvp",
        value: formatHead(c.hvpM, inputs.unitSystem),
        section: "Head terms",
        emphasis: true,
      },
      {
        label: "Static arrangement",
        value: arrLabel,
        section: "Head terms",
      },
      {
        label: "Static head zs",
        value: formatHead(c.zsM, inputs.unitSystem),
        section: "Head terms",
      },
      {
        label: "Suction losses hf",
        value: formatHead(c.frictionM, inputs.unitSystem),
        section: "Head terms",
      },
      {
        label: "NPSHa = Ha + zs − Hvp − hf",
        value: formatHead(c.npshaM, inputs.unitSystem),
        section: "NPSH & cavitation",
        emphasis: true,
      },
      {
        label: "NPSHr (from pump curve)",
        value: formatHead(c.npshrM, inputs.unitSystem),
        section: "NPSH & cavitation",
      },
      {
        label: "Margin NPSHa − NPSHr",
        value: formatHead(c.marginM, inputs.unitSystem),
        section: "NPSH & cavitation",
        emphasis: true,
        warn: !c.invalid && c.marginM < 0.5,
      },
      {
        label: "Ratio NPSHa / NPSHr",
        value: ratioOut,
        section: "NPSH & cavitation",
        warn: !c.invalid && c.ratio < 1.1,
      },
    ],
    callouts: [
      {
        tone: c.marginM < 0 ? "warn" : "info",
        title: c.marginM < 0 ? "Cavitation boundary" : "NPSH margin guidance",
        body:
          c.marginM < 0
            ? "Available NPSH is below the pump’s required NPSH. Expect noise, vibration, impeller damage, and loss of head. Raise liquid level, shorten/enlarge suction piping, cool the liquid, reduce speed/flow, or select a lower-NPSHr pump."
            : "Hydraulic Institute ANSI/HI 9.6.1 defines NPSH margin as NPSHa − NPSHr (and often a ratio). ASME B73.1 and API 610 expect the purchaser to set margin policy — cold water continuous duty often targets ≥1.1–1.3× NPSHr; hot hydrocarbons and boiler feed need larger margins.",
        items: [
          "NPSHr comes from the OEM curve at the operating capacity — do not invent it.",
          "Include strainer, foot valve, eccentric reducer (FOT), and suction velocity head policy per HI when refining hf.",
          "Prefer flooded suction and short suction runs for hot or volatile liquids.",
        ],
      },
      {
        tone: "info",
        title: "Related field checks",
        body: "Pair with suction-line velocity / pressure-drop tools for hf, and confirm eccentric reducers are flat-on-top on pump suction to avoid vapor pockets.",
      },
    ],
    exportRows: [
      { label: "Standard", value: "HI 9.6.1 / ASME B73.1 / API 610 (screening)" },
      { label: "Fluid", value: fluidLabel },
      {
        label: "Temperature",
        value:
          inputs.unitSystem === "imperial"
            ? `${finite(inputs.temperature).toFixed(0)} °F`
            : `${finite(inputs.temperature).toFixed(1)} °C`,
      },
      { label: "Density", value: formatDensity(c.densityKgM3, inputs.unitSystem) },
      {
        label: "Ps (abs)",
        value: formatPressureAbs(c.surfacePa, inputs.unitSystem),
      },
      {
        label: "Pv",
        value: formatPressureAbs(c.vaporPa, inputs.unitSystem),
      },
      { label: "Arrangement", value: arrLabel },
      { label: "Ha", value: formatHead(c.haM, inputs.unitSystem) },
      { label: "zs", value: formatHead(c.zsM, inputs.unitSystem) },
      { label: "Hvp", value: formatHead(c.hvpM, inputs.unitSystem) },
      { label: "hf", value: formatHead(c.frictionM, inputs.unitSystem) },
      { label: "NPSHa", value: formatHead(c.npshaM, inputs.unitSystem) },
      { label: "NPSHr", value: formatHead(c.npshrM, inputs.unitSystem) },
      { label: "Margin", value: formatHead(c.marginM, inputs.unitSystem) },
      { label: "Ratio", value: ratioOut },
      { label: "Head unit", value: headUnit },
    ],
  };
}

/** Atmospheric absolute pressure defaults for each unit system. */
export function defaultSurfacePressureAbs(unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? P_ATM_PSI : P_ATM_BAR;
}
