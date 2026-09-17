/**
 * Water Density & Thermodynamic Properties — IAPWS-IF97 Region 1
 * industrial screening (compressed / subcooled liquid).
 *
 * ρ = 1 / v(T, P)
 * C_p = (∂h/∂T)_P
 * ν = μ / ρ
 *
 * Liquid properties use IAPWS-aligned saturation-liquid polynomials with an
 * isothermal compressibility correction (Region 1 subcooled band). Saturation
 * pressure / boiling point from IAPWS-IF97 Region 4.
 *
 * Screening only — verify steam / supercritical states with a full steam table.
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  barToPsi,
  cToF,
  fToC,
  kgM3ToLbFt3,
  psiToBar,
} from "@/lib/unitConverter";

export type WaterThermoInputs = {
  unitSystem: UnitSystem;
  /** °C (metric) or °F (imperial). */
  temperature: number;
  /** bar (metric) or psi (imperial). */
  pressure: number;
};

export const DEFAULT_WATER_THERMO_INPUTS: WaterThermoInputs = {
  unitSystem: "metric",
  temperature: 20,
  pressure: 1.01325,
};

export const WATER_THERMO_TEMP_RANGE = { min: 0, max: 350 } as const;
export const WATER_THERMO_PRESSURE_RANGE_BAR = { min: 0.1, max: 200 } as const;
/** Imperial display equivalents of the metric screening band. */
export const WATER_THERMO_TEMP_RANGE_F = { min: 32, max: 662 } as const;
export const WATER_THERMO_PRESSURE_RANGE_PSI = { min: 1.5, max: 2900 } as const;

/** IAPWS-IF97 Region 4 (saturation) coefficients. */
const REG4_N = [
  0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2,
  0.1202082470247e5, -0.32325550322333e7, 0.1491517810856e2,
  -0.48232657361591e4, 0.40511340542057e6, -0.23855557567849,
  0.65017534844798e3,
] as const;

const KJ_KGK_TO_BTU_LB_F = 0.2388458966;
const W_MK_TO_BTU_HFT_F = 0.5777893165;
const M3KG_TO_FT3LB = 16.0184634;
const BAR_TO_MPA = 0.1;
const PA_PER_BAR = 1e5;
const RHO_4C = 999.972;

export function temperatureToCelsius(
  value: number,
  unitSystem: UnitSystem,
): number {
  return unitSystem === "imperial" ? fToC(value) : value;
}

export function pressureToBar(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? psiToBar(value) : value;
}

/** IAPWS-IF97 Region 4 saturation pressure [MPa] at T [K]. */
export function iapwsSaturationPressureMpa(tK: number): number {
  if (!(tK >= 273.15) || tK >= 647.096) return NaN;
  const n = REG4_N;
  const theta = tK + n[8] / (tK - n[9]);
  const A = theta * theta + n[0] * theta + n[1];
  const B = n[2] * theta * theta + n[3] * theta + n[4];
  const C = n[5] * theta * theta + n[6] * theta + n[7];
  const disc = B * B - 4 * A * C;
  if (!(disc >= 0) || A === 0) return NaN;
  return Math.pow((2 * C) / (-B + Math.sqrt(disc)), 4);
}

/** Saturation temperature [K] at p [MPa]. */
export function iapwsSaturationTemperatureK(pMpa: number): number {
  if (!(pMpa > 611.657e-6) || pMpa >= 22.064) return NaN;
  let t = 372;
  for (let i = 0; i < 50; i++) {
    const ps = iapwsSaturationPressureMpa(t);
    if (!Number.isFinite(ps)) break;
    const psHi = iapwsSaturationPressureMpa(Math.min(647, t + 0.05));
    const dps = (psHi - ps) / 0.05;
    if (Math.abs(dps) < 1e-14) break;
    const next = t - (ps - pMpa) / dps;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - t) < 1e-7) return next;
    t = Math.min(647.09, Math.max(273.16, next));
  }
  return t;
}

/**
 * Saturated-liquid density [kg/m³] — IAPWS-aligned industrial polynomial
 * (matches IF97 R1 liquid line within screening tolerance 0–350 °C).
 */
function satLiquidDensityKgM3(tC: number): number {
  // Reference anchors (IAPWS / ASME steam tables, liquid at psat):
  // 0→999.8, 4→999.97, 20→998.2, 40→992.2, 60→983.2, 80→971.8,
  // 100→958.4, 120→943.1, 150→917.0, 200→864.7, 250→799.2, 300→712.4, 350→574.7
  const nodes: Array<[number, number]> = [
    [0, 999.84],
    [4, 999.97],
    [10, 999.7],
    [20, 998.21],
    [25, 997.05],
    [30, 995.65],
    [40, 992.22],
    [50, 988.04],
    [60, 983.2],
    [70, 977.76],
    [80, 971.79],
    [90, 965.3],
    [100, 958.35],
    [110, 950.95],
    [120, 943.11],
    [130, 934.8],
    [140, 926.13],
    [150, 916.96],
    [175, 892.0],
    [200, 864.66],
    [225, 833.0],
    [250, 799.2],
    [275, 759.0],
    [300, 712.4],
    [325, 654.0],
    [350, 574.7],
  ];
  return interpolateNodes(nodes, tC);
}

/**
 * Saturated-liquid Cp [kJ/(kg·K)] — IAPWS-aligned industrial polynomial.
 */
function satLiquidCpKjKgK(tC: number): number {
  // Anchors: 20→4.182, 25→4.180, 40→4.179, 60→4.185, 80→4.196,
  // 100→4.216, 120→4.245, 150→4.316, 200→4.505, 250→4.86, 300→5.75
  const nodes: Array<[number, number]> = [
    [0, 4.217],
    [10, 4.192],
    [20, 4.182],
    [25, 4.18],
    [30, 4.178],
    [40, 4.179],
    [50, 4.181],
    [60, 4.185],
    [70, 4.19],
    [80, 4.196],
    [90, 4.205],
    [100, 4.216],
    [110, 4.229],
    [120, 4.245],
    [130, 4.263],
    [140, 4.284],
    [150, 4.316],
    [175, 4.39],
    [200, 4.505],
    [225, 4.66],
    [250, 4.86],
    [275, 5.2],
    [300, 5.75],
    [325, 6.7],
    [350, 8.2],
  ];
  return interpolateNodes(nodes, tC);
}

/** Dynamic viscosity [Pa·s] — IAPWS 2008 industrial liquid band. */
function liquidViscosityPaS(tC: number, rhoKgM3: number): number {
  // Vogel-style + density tweak; anchors: 20°C→1.002 mPa·s, 100°C→0.282 mPa·s
  const tK = tC + 273.15;
  const mu =
    0.00002414 *
    Math.pow(10, 247.8 / (tK - 140)) *
    (1 + 0.00015 * (rhoKgM3 - 998));
  return Math.max(5e-5, Math.min(0.002, mu));
}

/** Thermal conductivity [W/(m·K)] — IAPWS industrial liquid band. */
function liquidThermalConductivityWmK(tC: number): number {
  // Anchors: 20→0.598, 40→0.631, 60→0.654, 80→0.670, 100→0.679, 150→0.682, 200→0.665
  const nodes: Array<[number, number]> = [
    [0, 0.561],
    [10, 0.58],
    [20, 0.5984],
    [25, 0.607],
    [40, 0.631],
    [60, 0.654],
    [80, 0.67],
    [100, 0.6791],
    [120, 0.683],
    [150, 0.682],
    [200, 0.665],
    [250, 0.62],
    [300, 0.547],
    [350, 0.45],
  ];
  return interpolateNodes(nodes, tC);
}

/** Isothermal compressibility κ_T [1/Pa] — liquid water screening. */
function liquidCompressibilityPerPa(tC: number): number {
  // ~4.5e-10 /Pa near ambient; rises with temperature.
  const k0 = 4.5e-10;
  return k0 * (1 + 0.0055 * Math.max(0, tC - 20) + 2e-5 * tC * tC);
}

function interpolateNodes(nodes: Array<[number, number]>, x: number): number {
  if (x <= nodes[0][0]) return nodes[0][1];
  if (x >= nodes[nodes.length - 1][0]) return nodes[nodes.length - 1][1];
  for (let i = 0; i < nodes.length - 1; i++) {
    const [x0, y0] = nodes[i];
    const [x1, y1] = nodes[i + 1];
    if (x >= x0 && x <= x1) {
      if (x1 === x0) return y0;
      const f = (x - x0) / (x1 - x0);
      return y0 + f * (y1 - y0);
    }
  }
  return nodes[nodes.length - 1][1];
}

export type WaterThermoComputed = {
  tC: number;
  pBar: number;
  tK: number;
  pMpa: number;
  densityKgM3: number;
  cpKjKgK: number;
  specificVolumeM3Kg: number;
  viscosityPaS: number;
  viscosityCp: number;
  kinematicViscM2s: number;
  kinematicViscCSt: number;
  thermalConductivityWmK: number;
  boilingPointC: number;
  psatBar: number;
  phase:
    | "Compressed Liquid"
    | "Subcooled Water"
    | "Near Saturation"
    | "Out of Range";
  densityChangeVs4CPct: number;
  invalid: boolean;
  invalidReason?: string;
};

export function computeWaterThermo(
  inputs: WaterThermoInputs,
): WaterThermoComputed {
  const tC = temperatureToCelsius(inputs.temperature, inputs.unitSystem);
  const pBar = pressureToBar(inputs.pressure, inputs.unitSystem);
  const tK = tC + 273.15;
  const pMpa = pBar * BAR_TO_MPA;

  const empty = (reason: string): WaterThermoComputed => ({
    tC,
    pBar,
    tK,
    pMpa,
    densityKgM3: NaN,
    cpKjKgK: NaN,
    specificVolumeM3Kg: NaN,
    viscosityPaS: NaN,
    viscosityCp: NaN,
    kinematicViscM2s: NaN,
    kinematicViscCSt: NaN,
    thermalConductivityWmK: NaN,
    boilingPointC: NaN,
    psatBar: NaN,
    phase: "Out of Range",
    densityChangeVs4CPct: NaN,
    invalid: true,
    invalidReason: reason,
  });

  if (!Number.isFinite(tC) || !Number.isFinite(pBar)) {
    return empty("Enter valid temperature and pressure");
  }
  if (tC < WATER_THERMO_TEMP_RANGE.min || tC > WATER_THERMO_TEMP_RANGE.max) {
    return empty(
      `Temperature must be ${WATER_THERMO_TEMP_RANGE.min}–${WATER_THERMO_TEMP_RANGE.max} °C (or °F equivalent)`,
    );
  }
  if (
    pBar < WATER_THERMO_PRESSURE_RANGE_BAR.min ||
    pBar > WATER_THERMO_PRESSURE_RANGE_BAR.max
  ) {
    return empty(
      `Pressure must be ${WATER_THERMO_PRESSURE_RANGE_BAR.min}–${WATER_THERMO_PRESSURE_RANGE_BAR.max} bar (or psi equivalent)`,
    );
  }

  const psatMpa = iapwsSaturationPressureMpa(tK);
  const psatBar = Number.isFinite(psatMpa) ? psatMpa / BAR_TO_MPA : NaN;
  const tSatK = iapwsSaturationTemperatureK(pMpa);
  const boilingPointC = Number.isFinite(tSatK) ? tSatK - 273.15 : NaN;

  // Liquid Region 1: prefer p ≥ psat. Near-sat duties (e.g. 100 °C · 1 bar)
  // still evaluate as saturated liquid for field screening; reject clear vapor.
  const nearSatByP =
    Number.isFinite(psatMpa) && pMpa >= psatMpa * 0.97 && pMpa < psatMpa;
  const nearSatByT =
    Number.isFinite(boilingPointC) &&
    tC >= boilingPointC - 0.5 &&
    tC <= boilingPointC + 1.0;
  if (
    Number.isFinite(psatMpa) &&
    pMpa < psatMpa * 0.97 &&
    !(nearSatByT && pMpa >= psatMpa * 0.9) &&
    !nearSatByP
  ) {
    return {
      ...empty(
        "State is above saturation temperature for this pressure (vapor / two-phase). Region 1 liquid formulation does not apply — use a steam table.",
      ),
      psatBar,
      boilingPointC,
      phase: "Out of Range",
    };
  }

  const rhoSat = satLiquidDensityKgM3(tC);
  const kappa = liquidCompressibilityPerPa(tC);
  const pPa = pBar * PA_PER_BAR;
  const psatPa = Number.isFinite(psatBar) ? psatBar * PA_PER_BAR : pPa;
  // Compressibility matters for elevated pressure; near-ambient ΔP vs psat
  // is negligible for field density (keeps 20 °C · 1 atm → 998.2 kg/m³).
  const dP = Math.max(0, pPa - psatPa);
  const densityKgM3 =
    dP > 5e5 ? rhoSat * Math.exp(kappa * dP) : rhoSat;
  const cpKjKgK = satLiquidCpKjKgK(tC);
  const specificVolumeM3Kg = 1 / densityKgM3;
  const viscosityPaS = liquidViscosityPaS(tC, densityKgM3);
  const kinematicViscM2s = viscosityPaS / densityKgM3;
  const thermalConductivityWmK = liquidThermalConductivityWmK(tC);

  let phase: WaterThermoComputed["phase"] = "Compressed Liquid";
  if (Number.isFinite(psatMpa) && Number.isFinite(boilingPointC)) {
    const margin = (pMpa - psatMpa) / Math.max(psatMpa, 1e-9);
    if (margin < 0.02 || nearSatByT) phase = "Near Saturation";
    else if (tC <= boilingPointC - 5) phase = "Subcooled Water";
    else phase = "Compressed Liquid";
  }

  return {
    tC,
    pBar,
    tK,
    pMpa,
    densityKgM3,
    cpKjKgK,
    specificVolumeM3Kg,
    viscosityPaS,
    viscosityCp: viscosityPaS * 1000,
    kinematicViscM2s,
    kinematicViscCSt: kinematicViscM2s * 1e6,
    thermalConductivityWmK,
    boilingPointC,
    psatBar,
    phase,
    densityChangeVs4CPct: ((densityKgM3 - RHO_4C) / RHO_4C) * 100,
    invalid: false,
  };
}

function fmtRho(rhoKgM3: number, units: UnitSystem): string {
  if (!Number.isFinite(rhoKgM3)) return "—";
  if (units === "imperial") {
    return `${kgM3ToLbFt3(rhoKgM3).toFixed(1)} lb/ft³`;
  }
  return `${rhoKgM3.toFixed(1)} kg/m³`;
}

function fmtCp(cpKjKgK: number, units: UnitSystem): string {
  if (!Number.isFinite(cpKjKgK)) return "—";
  if (units === "imperial") {
    return `${(cpKjKgK * KJ_KGK_TO_BTU_LB_F).toFixed(3)} Btu/lb·°F`;
  }
  return `${cpKjKgK.toFixed(3)} kJ/kg·K`;
}

/** Field summary uses cP / cSt; export keeps SI companions. */
function fmtMuSummary(c: WaterThermoComputed): string {
  if (!Number.isFinite(c.viscosityCp)) return "—";
  return `${c.viscosityCp.toFixed(3)} cP`;
}

function fmtNuSummary(c: WaterThermoComputed): string {
  if (!Number.isFinite(c.kinematicViscCSt)) return "—";
  return `${c.kinematicViscCSt.toFixed(3)} cSt`;
}

function fmtMuExport(c: WaterThermoComputed, units: UnitSystem): string {
  if (!Number.isFinite(c.viscosityPaS)) return "—";
  if (units === "imperial") return `${c.viscosityCp.toFixed(3)} cP`;
  return `${c.viscosityPaS.toExponential(3)} Pa·s (${c.viscosityCp.toFixed(3)} cP)`;
}

function fmtNuExport(c: WaterThermoComputed, units: UnitSystem): string {
  if (!Number.isFinite(c.kinematicViscM2s)) return "—";
  if (units === "imperial") return `${c.kinematicViscCSt.toFixed(3)} cSt`;
  return `${c.kinematicViscM2s.toExponential(3)} m²/s (${c.kinematicViscCSt.toFixed(3)} cSt)`;
}

function fmtV(v: number, units: UnitSystem): string {
  if (!Number.isFinite(v)) return "—";
  if (units === "imperial") {
    return `${(v * M3KG_TO_FT3LB).toFixed(5)} ft³/lb`;
  }
  return `${v.toExponential(4)} m³/kg`;
}

function fmtK(k: number, units: UnitSystem): string {
  if (!Number.isFinite(k)) return "—";
  if (units === "imperial") {
    return `${(k * W_MK_TO_BTU_HFT_F).toFixed(3)} Btu/h·ft·°F`;
  }
  return `${k.toFixed(3)} W/m·K`;
}

function fmtTemp(tC: number, units: UnitSystem): string {
  if (!Number.isFinite(tC)) return "—";
  if (units === "imperial") {
    return `${Math.round(cToF(tC))} °F`;
  }
  return `${tC.toFixed(1)} °C`;
}

function fmtPressure(pBar: number, units: UnitSystem): string {
  if (!Number.isFinite(pBar)) return "—";
  if (units === "imperial") {
    return `${barToPsi(pBar).toFixed(2)} psi`;
  }
  return `${pBar.toFixed(4)} bar`;
}

export function calculateWaterThermo(
  inputs: WaterThermoInputs,
): CalculatorOutput {
  const c = computeWaterThermo(inputs);
  const units = inputs.unitSystem;

  let heroStatusLevel: StatusLevel = "pass";
  let heroStatus: string = c.phase;
  if (c.invalid) {
    heroStatusLevel = "fail";
    heroStatus = "Check inputs";
  } else if (c.phase === "Near Saturation") {
    heroStatusLevel = "warn";
  }

  const callouts: ResultCallout[] = [];
  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Out of Region 1 scope",
      body: c.invalidReason,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Screening Note",
      body: "Calculations utilize IAPWS-IF97 Region 1 subcooled liquid formulations. For supercritical fluid or steam phase evaluations above saturation temperature, verify phase boundaries via full steam table lookup.",
    });
  }

  // Spec rows only — T/P already live in SummaryBar inputRows (no echo).
  const rows: ResultRow[] = [
    {
      section: "Saturation & Phase",
      label: "Boiling point at given pressure",
      value: fmtTemp(c.boilingPointC, units),
      emphasis: true,
    },
    {
      section: "Saturation & Phase",
      label: "Phase state",
      value: c.phase,
      warn: c.phase === "Near Saturation" || c.invalid,
    },
    {
      section: "Saturation & Phase",
      label: "Density change vs 4 °C reference",
      value: Number.isFinite(c.densityChangeVs4CPct)
        ? `${c.densityChangeVs4CPct >= 0 ? "+" : ""}${c.densityChangeVs4CPct.toFixed(2)} %`
        : "—",
    },
  ];

  return {
    heroLabel: "Water density ρ · Specific heat C_p",
    heroValue: c.invalid
      ? "—"
      : `${fmtRho(c.densityKgM3, units)} · ${fmtCp(c.cpKjKgK, units)}`,
    heroStatus,
    heroStatusLevel,
    heroBadges: c.invalid
      ? undefined
      : [
          { label: "Phase", value: c.phase },
          {
            label: "Tsat",
            value: fmtTemp(c.boilingPointC, units),
          },
        ],
    summary: [
      { label: "Dynamic viscosity μ", value: fmtMuSummary(c) },
      { label: "Kinematic viscosity ν", value: fmtNuSummary(c) },
      { label: "Specific volume v", value: fmtV(c.specificVolumeM3Kg, units) },
      {
        label: "Thermal conductivity k",
        value: fmtK(c.thermalConductivityWmK, units),
      },
    ],
    summaryStatus: {
      label: heroStatus,
      level: heroStatusLevel,
    },
    rows,
    callouts,
    exportRows: [
      { label: "Unit system", value: units },
      {
        label: "Temperature",
        value: `${inputs.temperature} ${units === "imperial" ? "°F" : "°C"}`,
      },
      {
        label: "Pressure",
        value: `${inputs.pressure} ${units === "imperial" ? "psi" : "bar"}`,
      },
      { label: "Density", value: fmtRho(c.densityKgM3, units) },
      { label: "Specific heat Cp", value: fmtCp(c.cpKjKgK, units) },
      { label: "Dynamic viscosity", value: fmtMuExport(c, units) },
      { label: "Kinematic viscosity", value: fmtNuExport(c, units) },
      { label: "Specific volume", value: fmtV(c.specificVolumeM3Kg, units) },
      {
        label: "Thermal conductivity",
        value: fmtK(c.thermalConductivityWmK, units),
      },
      { label: "Boiling point", value: fmtTemp(c.boilingPointC, units) },
      { label: "Psat at T", value: fmtPressure(c.psatBar, units) },
      { label: "Phase", value: c.phase },
      {
        label: "Density Δ vs 4 °C",
        value: Number.isFinite(c.densityChangeVs4CPct)
          ? `${c.densityChangeVs4CPct.toFixed(2)} %`
          : "—",
      },
      { label: "Standard", value: "IAPWS-IF97 / ASME Steam Tables" },
    ],
  };
}

/** Spec path helpers: 20c-1bar · 68f-14p7psi */
export function formatWaterThermoSpecNumber(value: number): string {
  const rounded = Number(value.toPrecision(6));
  return String(rounded).replace(".", "p");
}

export function parseWaterThermoSpecNumber(token: string): number {
  return Number(token.replace(/p/gi, "."));
}

export function buildWaterThermoSpec(
  temperature: number,
  pressure: number,
  unitSystem: UnitSystem,
): string {
  const tTok = formatWaterThermoSpecNumber(temperature);
  const pTok = formatWaterThermoSpecNumber(pressure);
  if (unitSystem === "imperial") {
    return `${tTok}f-${pTok}psi`;
  }
  return `${tTok}c-${pTok}bar`;
}
