import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import { getPipeScheduleEntry } from "@/lib/data/loaders";
import { barToPsi } from "@/utils/unitConverter";

export type PressureDropFluid = "water" | "steam" | "air" | "crude" | "condensate";
export type FlowQuantityUnit = "m3h" | "gpm" | "kgh";

export type PressureDropInputs = {
  unitSystem: UnitSystem;
  fluid: PressureDropFluid;
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
  densityKgM3: number;
  viscosityPaS: number;
}[] = [
  { value: "water", label: "Water (20 °C)", densityKgM3: 998, viscosityPaS: 0.001 },
  { value: "steam", label: "Steam (typical LP)", densityKgM3: 5.15, viscosityPaS: 1.5e-5 },
  { value: "air", label: "Air (20 °C, 1 atm)", densityKgM3: 1.204, viscosityPaS: 1.81e-5 },
  { value: "crude", label: "Light crude", densityKgM3: 870, viscosityPaS: 0.015 },
  { value: "condensate", label: "Hydrocarbon condensate", densityKgM3: 960, viscosityPaS: 3.5e-4 },
];

function fluidProps(id: PressureDropFluid) {
  return PRESSURE_DROP_FLUIDS.find((item) => item.value === id) ?? PRESSURE_DROP_FLUIDS[0];
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
  const fluid = fluidProps(inputs.fluid);
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
  const f = haalandFriction(reynolds, STEEL_ROUGHNESS_M / dM);
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

export function calculatePressureDrop(inputs: PressureDropInputs): CalculatorOutput {
  const fluid = fluidProps(inputs.fluid);
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
  const reynoldsStr = reynolds.toExponential(2);
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
    heroStatus: `${fluid.label} · Darcy–Weisbach · commercial steel`,
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
  flow: 40,
  flowUnit: "m3h",
  nps: "4",
  schedule: "40",
  length: 100,
  elbowCount: 4,
  gateCount: 2,
  globeCount: 0,
};
