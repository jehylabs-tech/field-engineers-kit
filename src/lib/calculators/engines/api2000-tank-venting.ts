/**
 * Storage Tank Venting Rate — API Standard 2000 7th Edition (§3.3 / §3.4).
 *
 *   V_out,liq = 1.01 · V_pump_in
 *   V_in,liq  = 0.94 · V_pump_out
 *   V_out,th  = 0.8 · V^0.9 · C_lat · Y
 *   V_in,th   = 3.0 · V^0.7 · C_lat
 *   Q_fire    = 43.2 · A_wett^0.82 · F     [kW]
 *   V_emer    = (Q/L_v) · √(70.6/M) · 1234 [Nm³/h free air]
 *
 * Vertical cylindrical API 650/620 atmospheric / low-pressure tank screening.
 * Thermal shock, reactive gas, and tube-rupture cases are out of scope.
 */

import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  api2000FireFactors,
  api2000LiquidFactors,
  api2000ThermalFactors,
  environmentIdFromF,
  resolveEnvironment,
  resolveLatitude,
  resolveVolatility,
  type Api2000EnvironmentId,
  type Api2000LatitudeId,
  type Api2000VolatilityId,
} from "@/lib/calculators/data/api2000VentingFactors";

export type Api2000TankVentingInputs = {
  unitSystem: UnitSystem;
  /** Tank diameter — m or ft. */
  tankDiameter: number;
  /** Shell height — m or ft. */
  tankHeight: number;
  /** Max liquid pump-in — m³/h or GPM. */
  pumpInRate: number;
  /** Max liquid pump-out — m³/h or GPM. */
  pumpOutRate: number;
  volatility: Api2000VolatilityId;
  environment: Api2000EnvironmentId;
  /** Latent heat — kJ/kg or Btu/lb. */
  latentHeat: number;
  /** Vapor molecular weight — g/mol. */
  molecularWeight: number;
  latitude: Api2000LatitudeId;
};

export const DEFAULT_API2000_TANK_VENTING_INPUTS: Api2000TankVentingInputs = {
  unitSystem: "metric",
  tankDiameter: 15,
  tankHeight: 12,
  pumpInRate: 200,
  pumpOutRate: 250,
  volatility: "flash-point-below-37.8c",
  environment: "bare",
  latentHeat: 360,
  molecularWeight: 72,
  latitude: "below-42-deg",
};

export const DEFAULT_API2000_TANK_VENTING_INPUTS_IMPERIAL: Api2000TankVentingInputs =
  {
    unitSystem: "imperial",
    tankDiameter: 50,
    tankHeight: 40,
    pumpInRate: 1000,
    pumpOutRate: 1200,
    volatility: "flash-point-below-37.8c",
    environment: "bare",
    latentHeat: 155,
    molecularWeight: 72,
    latitude: "below-42-deg",
  };

const M_PER_FT = 0.3048;
const M3_PER_BBL = 0.158987294928;
const M3H_PER_GPM = 1 / 4.402867513;
const NM3H_TO_SCFH = 35.314666721;
const KW_TO_BTUH = 3412.14163;
const KJ_KG_TO_BTU_LB = 1 / 2.326;
const M2_TO_FT2 = 10.76391041671;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, finite(value)));
}

export function lengthToM(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? finite(value) * M_PER_FT : finite(value);
}

export function flowToM3h(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial"
    ? finite(value) * M3H_PER_GPM
    : finite(value);
}

export function latentToKjKg(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial"
    ? finite(value) / KJ_KG_TO_BTU_LB
    : finite(value);
}

export type Api2000TankVentingDetail = {
  volumeM3: number;
  pumpInM3h: number;
  pumpOutM3h: number;
  cLatitude: number;
  yFactor: number;
  fEnv: number;
  vOutLiquidNm3h: number;
  vInLiquidNm3h: number;
  vOutThermalNm3h: number;
  vInThermalNm3h: number;
  vOutTotalNm3h: number;
  vInTotalNm3h: number;
  hWettedM: number;
  aWettedM2: number;
  qFireKw: number;
  vEmergencyNm3h: number;
  latentKjKg: number;
  molecularWeight: number;
  volatilityLabel: string;
  environmentLabel: string;
  latitudeLabel: string;
};

export function computeApi2000TankVenting(
  inputs: Api2000TankVentingInputs,
): Api2000TankVentingDetail {
  const unitSystem = inputs.unitSystem === "imperial" ? "imperial" : "metric";
  const dM = clamp(lengthToM(inputs.tankDiameter, unitSystem), 1, 100);
  const hM = clamp(lengthToM(inputs.tankHeight, unitSystem), 1, 40);
  const pumpInM3h = clamp(flowToM3h(inputs.pumpInRate, unitSystem), 0, 5000);
  const pumpOutM3h = clamp(flowToM3h(inputs.pumpOutRate, unitSystem), 0, 5000);
  const latentKjKg = clamp(latentToKjKg(inputs.latentHeat, unitSystem), 100, 1500);
  const molecularWeight = clamp(inputs.molecularWeight, 10, 200);

  const lat = resolveLatitude(inputs.latitude);
  const vol = resolveVolatility(inputs.volatility);
  const env = resolveEnvironment(inputs.environment);
  const liq = api2000LiquidFactors();
  const th = api2000ThermalFactors();
  const fire = api2000FireFactors();

  const volumeM3 = (Math.PI / 4) * dM * dM * hM;

  const vOutLiquidNm3h = liq.outbreathingPerPumpIn * pumpInM3h;
  const vInLiquidNm3h = liq.inbreathingPerPumpOut * pumpOutM3h;

  const vOutThermalNm3h =
    th.outbreathingCoeff *
    Math.pow(Math.max(volumeM3, 1e-9), th.outbreathingExponent) *
    lat.cLatitude *
    vol.yFactor;
  const vInThermalNm3h =
    th.inbreathingCoeff *
    Math.pow(Math.max(volumeM3, 1e-9), th.inbreathingExponent) *
    lat.cLatitude;

  const vOutTotalNm3h = vOutLiquidNm3h + vOutThermalNm3h;
  const vInTotalNm3h = vInLiquidNm3h + vInThermalNm3h;

  const hWettedM = Math.min(hM, fire.maxWettedHeightM);
  const aWettedM2 = Math.PI * dM * hWettedM;
  const qFireKw =
    fire.heatCoeffKw *
    Math.pow(Math.max(aWettedM2, 1e-9), fire.areaExponent) *
    env.f;

  const vEmergencyNm3h =
    (qFireKw / Math.max(latentKjKg, 1e-9)) *
    Math.sqrt(fire.mwRef / Math.max(molecularWeight, 1e-9)) *
    fire.airRateConstant;

  return {
    volumeM3,
    pumpInM3h,
    pumpOutM3h,
    cLatitude: lat.cLatitude,
    yFactor: vol.yFactor,
    fEnv: env.f,
    vOutLiquidNm3h,
    vInLiquidNm3h,
    vOutThermalNm3h,
    vInThermalNm3h,
    vOutTotalNm3h,
    vInTotalNm3h,
    hWettedM,
    aWettedM2,
    qFireKw,
    vEmergencyNm3h,
    latentKjKg,
    molecularWeight,
    volatilityLabel: vol.label,
    environmentLabel: env.label,
    latitudeLabel: lat.label,
  };
}

function fmt(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 10000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (abs >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: digits > 0 ? 0 : 0 });
  if (abs >= 100) return value.toFixed(Math.min(digits, 1));
  return value.toFixed(digits);
}

function ventFlow(
  nm3h: number,
  unitSystem: UnitSystem,
  digits = 0,
): { value: number; unit: string; text: string } {
  if (unitSystem === "imperial") {
    const scfh = nm3h * NM3H_TO_SCFH;
    return {
      value: scfh,
      unit: "SCFH",
      text: `${fmt(scfh, digits)} SCFH`,
    };
  }
  return {
    value: nm3h,
    unit: "Nm³/h",
    text: `${fmt(nm3h, digits)} Nm³/h`,
  };
}

export function calculateApi2000TankVenting(
  inputs: Api2000TankVentingInputs,
): CalculatorOutput {
  const unitSystem = inputs.unitSystem === "imperial" ? "imperial" : "metric";
  const d = computeApi2000TankVenting(inputs);
  const imperial = unitSystem === "imperial";

  const outTotal = ventFlow(d.vOutTotalNm3h, unitSystem, 0);
  const inTotal = ventFlow(d.vInTotalNm3h, unitSystem, 0);
  const emer = ventFlow(d.vEmergencyNm3h, unitSystem, 0);
  const outLiq = ventFlow(d.vOutLiquidNm3h, unitSystem, 0);
  const outTh = ventFlow(d.vOutThermalNm3h, unitSystem, 0);
  const inLiq = ventFlow(d.vInLiquidNm3h, unitSystem, 0);
  const inTh = ventFlow(d.vInThermalNm3h, unitSystem, 0);

  const volDisp = imperial ? d.volumeM3 / M3_PER_BBL : d.volumeM3;
  const volUnit = imperial ? "bbl" : "m³";
  const areaDisp = imperial ? d.aWettedM2 * M2_TO_FT2 : d.aWettedM2;
  const areaUnit = imperial ? "ft²" : "m²";
  const qDisp = imperial ? d.qFireKw * KW_TO_BTUH : d.qFireKw;
  const qUnit = imperial ? "Btu/h" : "kW";

  const governingNormal = Math.max(d.vOutTotalNm3h, d.vInTotalNm3h);
  const pvrvNote = `Normal ≥ ${ventFlow(governingNormal, unitSystem, 0).text}; emergency ≥ ${emer.text}`;

  const statusLevel: StatusLevel = "pass";
  const statusLabel = "API 2000 §3.3 / §3.4 screen";
  const yNote =
    d.yFactor >= 1
      ? " Volatile / low-flash class applies Table 1 Y = 1 on thermal outbreathing."
      : "";

  return {
    heroLabel: "Normal outbreathing (V_out)",
    heroValue: outTotal.text,
    heroStatus: statusLabel,
    heroStatusLevel: statusLevel,
    heroBadges: [
      { label: "Emergency V_emer", value: emer.text },
      { label: "Inbreathing V_in", value: inTotal.text },
    ],
    summary: [
      { label: "Inbreathing V_in", value: inTotal.text },
      {
        label: "Wetted area A_wett",
        value: `${fmt(areaDisp, imperial ? 0 : 1)} ${areaUnit}`,
      },
      { label: "PVRV / hatch screen", value: pvrvNote },
    ],
    summaryStatus: {
      label: statusLabel,
      level: "neutral",
    },
    rows: [
      {
        section: "Tank",
        label: "Tank volume V_tank",
        value: `${fmt(volDisp, 0)} ${volUnit}`,
      },
      {
        section: "Normal outbreathing",
        label: "Liquid + thermal → V_out",
        value: `${outLiq.text} + ${outTh.text} = ${outTotal.text}`,
        emphasis: true,
      },
      {
        section: "Normal inbreathing",
        label: "Liquid + thermal → V_in",
        value: `${inLiq.text} + ${inTh.text} = ${inTotal.text}`,
        emphasis: true,
      },
      {
        section: "Emergency fire",
        label: "Q_fire · V_emergency",
        value: `${fmt(qDisp, 0)} ${qUnit} · ${emer.text}`,
        emphasis: true,
      },
    ],
    callouts: [
      {
        tone: "warn",
        title: "API 2000 atmospheric / low-pressure tank screen",
        body: `API Std 2000 7th Ed normal in/outbreathing and fire-exposure emergency capacity for metal storage tanks (API 650/620 class). Thermal shock, chemical reaction, or tube-rupture gas blow-by need process simulation and dedicated PSV design.${yNote}`,
      },
    ],
    exportRows: [
      { label: "Unit system", value: unitSystem },
      {
        label: "Tank diameter",
        value: `${fmt(inputs.tankDiameter, imperial ? 1 : 1)} ${imperial ? "ft" : "m"}`,
      },
      {
        label: "Tank height",
        value: `${fmt(inputs.tankHeight, imperial ? 1 : 1)} ${imperial ? "ft" : "m"}`,
      },
      { label: `Volume (${volUnit})`, value: fmt(volDisp, 2) },
      {
        label: "Pump-in rate",
        value: `${fmt(inputs.pumpInRate, 1)} ${imperial ? "GPM" : "m³/h"}`,
      },
      {
        label: "Pump-out rate",
        value: `${fmt(inputs.pumpOutRate, 1)} ${imperial ? "GPM" : "m³/h"}`,
      },
      { label: "Volatility", value: d.volatilityLabel },
      { label: "Y factor", value: fmt(d.yFactor, 2) },
      { label: "Latitude", value: d.latitudeLabel },
      { label: "C_latitude", value: fmt(d.cLatitude, 2) },
      { label: "Environment", value: d.environmentLabel },
      { label: "F", value: fmt(d.fEnv, 2) },
      {
        label: "Latent heat",
        value: `${fmt(inputs.latentHeat, 1)} ${imperial ? "Btu/lb" : "kJ/kg"}`,
      },
      { label: "Molecular weight M", value: fmt(d.molecularWeight, 1) },
      { label: `A_wett (${areaUnit})`, value: fmt(areaDisp, 2) },
      { label: `Q_fire (${qUnit})`, value: fmt(qDisp, 1) },
      { label: `V_out,liquid (${outLiq.unit})`, value: fmt(outLiq.value, 1) },
      { label: `V_out,thermal (${outTh.unit})`, value: fmt(outTh.value, 1) },
      { label: `V_out,total (${outTotal.unit})`, value: fmt(outTotal.value, 1) },
      { label: `V_in,liquid (${inLiq.unit})`, value: fmt(inLiq.value, 1) },
      { label: `V_in,thermal (${inTh.unit})`, value: fmt(inTh.value, 1) },
      { label: `V_in,total (${inTotal.unit})`, value: fmt(inTotal.value, 1) },
      { label: `V_emergency (${emer.unit})`, value: fmt(emer.value, 1) },
      { label: "PVRV screen", value: pvrvNote },
    ],
  };
}

/** Resolve environment id from numeric F (URL `f=1.0`). */
export function resolveEnvironmentFromInputs(
  environment: Api2000EnvironmentId | undefined,
  fRaw?: number,
): Api2000EnvironmentId {
  if (environment) return environment;
  if (fRaw != null && Number.isFinite(fRaw)) return environmentIdFromF(fRaw);
  return "bare";
}

export {
  LATITUDE_OPTIONS,
  VOLATILITY_OPTIONS,
  ENVIRONMENT_OPTIONS,
} from "@/lib/calculators/data/api2000VentingFactors";
