import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import { getPipeScheduleEntry } from "@/lib/data/loaders";
import { barToPsi } from "@/utils/unitConverter";

export type PressureDropFluid = "water" | "steam" | "air" | "crude" | "condensate";
export type FlowQuantityUnit = "m3h" | "gpm" | "kgh";

export type PressureDropInputs = {
  unitSystem: UnitSystem;
  fluid: PressureDropFluid;
  temperature: number;
  roughness: number; // mm
  flow: number;
  flowUnit: FlowQuantityUnit;
  nps: string;
  schedule: string;
  length: number;
  elbowCount: number;
  gateCount: number;
  globeCount: number;
};

export const PRESSURE_DROP_FLUIDS: {
  value: PressureDropFluid;
  label: string;
}[] = [
  { value: "water", label: "Water" },
  { value: "steam", label: "Steam (typical LP)" },
  { value: "air", label: "Air (1 atm)" },
  { value: "crude", label: "Light crude" },
  { value: "condensate", label: "Hydrocarbon condensate" },
];

export const PIPE_ROUGHNESS_OPTIONS = [
  { value: 0.015, label: "Stainless Steel / PVC - 0.015 mm" },
  { value: 0.045, label: "Commercial Steel (new) - 0.045 mm" },
  { value: 0.15, label: "Commercial Steel (corroded) - 0.15 mm" },
  { value: 0.30, label: "Heavily corroded steel - 0.30 mm" },
];

function getWaterProps(tempC: number): { density: number; viscosity: number } {
  // Water properties at various temperatures (20°C baseline)
  if (!Number.isFinite(tempC)) {
    return { density: 998, viscosity: 0.001 };
  }
  
  // Clamp temperature to reasonable range
  const temp = Math.max(-10, Math.min(100, tempC));
  
  // Simplified correlations for water density and viscosity
  const density = Math.max(950, Math.min(1000, 1000 - 0.05 * (temp - 4)));
  
  // Simplified viscosity correlation (Pa·s)
  let viscosity: number;
  if (temp <= 0) {
    viscosity = 0.002;
  } else if (temp >= 100) {
    viscosity = 0.0003;
  } else {
    viscosity = 0.001 * Math.exp(-0.025 * (temp - 20));
  }
  
  return {
    density: Math.max(950, density),
    viscosity: Math.max(1e-6, Math.min(0.01, viscosity))
  };
}

function fluidProps(id: PressureDropFluid, tempC: number): { densityKgM3: number; viscosityPaS: number } {
  // Ensure temperature is valid
  const validTempC = Number.isFinite(tempC) ? tempC : 20;
  
  switch (id) {
    case "water": {
      const waterProps = getWaterProps(validTempC);
      return {
        densityKgM3: waterProps.density,
        viscosityPaS: waterProps.viscosity
      };
    }
    case "steam":
      return { densityKgM3: 5.15, viscosityPaS: 1.5e-5 };
    case "air": {
      const tempK = validTempC + 273.15;
      return { 
        densityKgM3: 1.225 * (293.15 / tempK), 
        viscosityPaS: 1.81e-5 * Math.pow(tempK / 293.15, 0.7)
      };
    }
    case "crude":
      return { densityKgM3: 870, viscosityPaS: 0.015 };
    case "condensate":
      return { densityKgM3: 960, viscosityPaS: 3.5e-4 };
    default:
      return { densityKgM3: 998, viscosityPaS: 0.001 };
  }
}

function flowToM3s(flow: number, unit: FlowQuantityUnit, densityKgM3: number): number {
  if (unit === "gpm") return flow * 6.30901964e-5;
  if (unit === "kgh") return densityKgM3 > 0 ? flow / 3600 / densityKgM3 : 0;
  return flow / 3600;
}

function haalandFriction(reynolds: number, relRough: number): number {
  if (reynolds <= 0) return 0;
  if (reynolds < 2300) return 64 / reynolds;
  const inner = Math.pow(relRough / 3.7, 1.11) + 6.9 / reynolds;
  const invSqrt = -1.8 * Math.log10(inner);
  const f = 1 / (invSqrt * invSqrt);
  return Number.isFinite(f) ? f : 0;
}

const ELBOW_L_OVER_D = 30;
const GATE_L_OVER_D = 8;
const GLOBE_L_OVER_D = 340;
const STEEL_ROUGHNESS_M = 4.5e-5;

export type PressureDropResult = {
  velocity: number;
  reynolds: number;
  frictionFactor: number;
  dpBar: number;
  dp100Bar: number;
  leqM: number;
};

export function computePressureDrop(
  inputs: PressureDropInputs,
): PressureDropResult | null {
  // Convert temperature to Celsius if needed
  const tempC = inputs.unitSystem === "imperial" 
    ? (inputs.temperature - 32) * 5 / 9 
    : inputs.temperature;
  const fluid = fluidProps(inputs.fluid, tempC);
  const entry = getPipeScheduleEntry(inputs.nps, inputs.schedule);
  const lengthM =
    inputs.unitSystem === "imperial" ? inputs.length * 0.3048 : inputs.length;

  if (
    !entry ||
    !Number.isFinite(lengthM) ||
    lengthM <= 0 ||
    !Number.isFinite(inputs.flow) ||
    inputs.flow <= 0
  ) {
    return null;
  }

  const dM = entry.row.insideDiameterMm / 1000;
  if (dM <= 0) return null;
  const area = Math.PI * dM * dM * 0.25;
  const q = flowToM3s(inputs.flow, inputs.flowUnit, fluid.densityKgM3);
  const velocity = area > 0 ? q / area : 0;
  const reynolds =
    velocity > 0 && fluid.viscosityPaS > 0
      ? (fluid.densityKgM3 * velocity * dM) / fluid.viscosityPaS
      : 0;
  const roughnessM = inputs.roughness / 1000;
  const f = haalandFriction(reynolds, roughnessM / dM);
  const fittingLd =
    Math.max(0, finiteCount(inputs.elbowCount)) * ELBOW_L_OVER_D +
    Math.max(0, finiteCount(inputs.gateCount)) * GATE_L_OVER_D +
    Math.max(0, finiteCount(inputs.globeCount)) * GLOBE_L_OVER_D;
  const leqM = lengthM + fittingLd * dM;
  const dynamic = 0.5 * fluid.densityKgM3 * velocity * velocity;
  const dpPa = Number.isFinite(f) ? f * (leqM / dM) * dynamic : 0;
  const dpStraight100Pa = Number.isFinite(f) ? f * (100 / dM) * dynamic : 0;

  return {
    velocity: Number.isFinite(velocity) ? velocity : 0,
    reynolds: Number.isFinite(reynolds) ? reynolds : 0,
    frictionFactor: Number.isFinite(f) ? f : 0,
    dpBar: dpPa / 1e5,
    dp100Bar: dpStraight100Pa / 1e5,
    leqM,
  };
}

function finiteCount(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function formatReynolds(re: number): string {
  if (re < 1000) return re.toFixed(0);
  if (re === 0 || !Number.isFinite(re)) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(re)) / 3) * 3;
  const mantissa = re / 10 ** exponent;
  const superscript = String(exponent)
    .replace(/0/g, "⁰")
    .replace(/1/g, "¹")
    .replace(/2/g, "²")
    .replace(/3/g, "³")
    .replace(/4/g, "⁴")
    .replace(/5/g, "⁵")
    .replace(/6/g, "⁶")
    .replace(/7/g, "⁷")
    .replace(/8/g, "⁸")
    .replace(/9/g, "⁹")
    .replace(/-/g, "⁻");
  return `${mantissa.toFixed(2)} × 10${superscript}`;
}

export function calculatePressureDrop(inputs: PressureDropInputs): CalculatorOutput {
  // Convert temperature to Celsius if needed
  const tempC = inputs.unitSystem === "imperial" 
    ? (inputs.temperature - 32) * 5 / 9 
    : inputs.temperature;
  const fluid = fluidProps(inputs.fluid, tempC);
  const fluidLabel = PRESSURE_DROP_FLUIDS.find(f => f.value === inputs.fluid)?.label || inputs.fluid;
  const computed = computePressureDrop(inputs);

  if (!computed) {
    return {
      heroLabel: "Pressure drop",
      heroValue: "—",
      heroStatus: "Enter flow, a valid NPS/schedule, and length",
      heroStatusLevel: "warn",
      summary: [
        { label: "ΔP", value: "—" },
        { label: "Velocity", value: "—" },
        { label: "Re", value: "—" },
      ],
      summaryStatus: { label: "Waiting for valid inputs", level: "warn" },
      rows: [],
      exportRows: [],
    };
  }

  const entry = getPipeScheduleEntry(inputs.nps, inputs.schedule);
  const lengthM =
    inputs.unitSystem === "imperial" ? inputs.length * 0.3048 : inputs.length;
  const { velocity, reynolds, frictionFactor: f, dpBar, dp100Bar, leqM } = computed;
  const fittingLeqM = Math.max(0, leqM - (Number.isFinite(lengthM) ? lengthM : 0));
  const idMm = entry?.row.insideDiameterMm ?? 0;
  const velocityStr = `${velocity.toFixed(2)} m/s`;
  const reynoldsStr = formatReynolds(reynolds);
  const total =
    inputs.unitSystem === "imperial"
      ? `${barToPsi(dpBar).toFixed(2)} psi`
      : `${dpBar.toFixed(3)} bar`;
  // Sticky bar + result grid share these exact strings (no separate formatting path).
  const per100 =
    inputs.unitSystem === "imperial"
      ? `${barToPsi(dp100Bar).toFixed(2)} psi/100m`
      : `${dp100Bar.toFixed(3)} bar/100m`;
  const per100Row =
    inputs.unitSystem === "imperial"
      ? `${barToPsi(dp100Bar).toFixed(2)} psi / 100 m`
      : `${dp100Bar.toFixed(3)} bar / 100 m`;

  return {
    heroLabel: "Total pressure loss",
    heroValue: total,
    heroStatus: `${fluidLabel} · Darcy–Weisbach · commercial steel`,
    heroStatusLevel: dpBar > 1 ? "warn" : "pass",
    summary: [
      { label: "ΔP", value: per100 },
      { label: "Velocity", value: velocityStr },
      { label: "Re", value: reynoldsStr },
    ],
    summaryStatus: {
      label: `f = ${f.toFixed(4)} · Haaland`,
      level: "neutral",
    },
    rows: [
      { label: "Fluid", value: fluid.label },
      { label: "Density ρ", value: `${fluid.densityKgM3} kg/m³` },
      { label: "Inside diameter (ID)", value: `${idMm.toFixed(2)} mm` },
      { label: "Velocity", value: velocityStr },
      { label: "Reynolds number (Re)", value: reynoldsStr },
      { label: "Friction factor (f)", value: f.toFixed(5) },
      {
        label: "Straight length (L)",
        value: `${(Number.isFinite(lengthM) ? lengthM : 0).toFixed(1)} m`,
      },
      {
        label: "Equivalent length (fittings)",
        value: `${fittingLeqM.toFixed(1)} m`,
      },
      { label: "Total equivalent L", value: `${leqM.toFixed(1)} m` },
      { label: "ΔP per 100 m", value: per100Row },
      { label: "Total ΔP (bar)", value: `${dpBar.toFixed(3)} bar` },
      { label: "Total ΔP (psi)", value: `${barToPsi(dpBar).toFixed(2)} psi` },
    ],
    exportRows: [
      { label: "Standard", value: "Darcy–Weisbach / Haaland f" },
      { label: "Fluid", value: fluid.label },
      { label: "Density ρ", value: `${fluid.densityKgM3} kg/m³` },
      { label: "Inside diameter (ID)", value: `${idMm.toFixed(2)} mm` },
      { label: "Velocity", value: velocityStr },
      { label: "Reynolds number (Re)", value: reynoldsStr },
      { label: "Friction factor (f)", value: f.toFixed(5) },
      {
        label: "Straight length (L)",
        value: `${(Number.isFinite(lengthM) ? lengthM : 0).toFixed(1)} m`,
      },
      {
        label: "Equivalent length (fittings)",
        value: `${fittingLeqM.toFixed(1)} m`,
      },
      { label: "Total equivalent L", value: `${leqM.toFixed(1)} m` },
      { label: "ΔP per 100 m", value: per100Row },
      { label: "Total ΔP (bar)", value: `${dpBar.toFixed(3)} bar` },
      { label: "Total ΔP (psi)", value: `${barToPsi(dpBar).toFixed(2)} psi` },
    ],
  };
}

export const DEFAULT_PRESSURE_DROP_INPUTS: PressureDropInputs = {
  unitSystem: "metric",
  fluid: "water",
  temperature: 20,
  roughness: 0.045,
  flow: 40,
  flowUnit: "m3h",
  nps: "4",
  schedule: "40",
  length: 100,
  elbowCount: 4,
  gateCount: 2,
  globeCount: 0,
};
