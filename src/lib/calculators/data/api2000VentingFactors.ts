/**
 * API 2000 7th Ed venting factor lookup (latitude, volatility Y, environment F).
 */

import factorsRaw from "../../../../data/mechanical/api2000-venting-factors.json";

export type Api2000LatitudeId = "below-42-deg" | "above-42-deg";
export type Api2000VolatilityId =
  | "flash-point-below-37.8c"
  | "flash-point-above-37.8c"
  | "hexane-like";
export type Api2000EnvironmentId = "bare" | "insulated" | "water-deluge";

type FactorsFile = {
  liquidMovement: {
    outbreathingPerPumpIn: number;
    inbreathingPerPumpOut: number;
  };
  thermal: {
    outbreathingCoeff: number;
    outbreathingExponent: number;
    inbreathingCoeff: number;
    inbreathingExponent: number;
  };
  latitude: Array<{ id: Api2000LatitudeId; label: string; cLatitude: number }>;
  volatility: Array<{
    id: Api2000VolatilityId;
    label: string;
    yFactor: number;
    notes: string;
  }>;
  environmentFactor: Array<{
    id: Api2000EnvironmentId;
    label: string;
    f: number;
  }>;
  fire: {
    heatCoeffKw: number;
    heatCoeffBtuh: number;
    areaExponent: number;
    maxWettedHeightM: number;
    maxWettedHeightFt: number;
    airRateConstant: number;
    mwRef: number;
  };
};

const F = factorsRaw as FactorsFile;

export function api2000LiquidFactors() {
  return F.liquidMovement;
}

export function api2000ThermalFactors() {
  return F.thermal;
}

export function api2000FireFactors() {
  return F.fire;
}

export function resolveLatitude(id: Api2000LatitudeId) {
  return (
    F.latitude.find((r) => r.id === id) ??
    F.latitude.find((r) => r.id === "below-42-deg")!
  );
}

export function resolveVolatility(id: Api2000VolatilityId) {
  return (
    F.volatility.find((r) => r.id === id) ??
    F.volatility.find((r) => r.id === "flash-point-below-37.8c")!
  );
}

export function resolveEnvironment(id: Api2000EnvironmentId) {
  return (
    F.environmentFactor.find((r) => r.id === id) ??
    F.environmentFactor.find((r) => r.id === "bare")!
  );
}

export function environmentIdFromF(f: number): Api2000EnvironmentId {
  if (Math.abs(f - 0.3) < 1e-6) return "insulated";
  if (Math.abs(f - 0.15) < 1e-6) return "water-deluge";
  return "bare";
}

export const LATITUDE_OPTIONS = F.latitude.map((r) => ({
  value: r.id,
  label: r.label,
}));

export const VOLATILITY_OPTIONS = F.volatility.map((r) => ({
  value: r.id,
  label: r.label,
}));

export const ENVIRONMENT_OPTIONS = F.environmentFactor.map((r) => ({
  value: r.id,
  label: r.label,
}));
