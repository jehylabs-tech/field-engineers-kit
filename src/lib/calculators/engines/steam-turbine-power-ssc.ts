/**
 * Steam Turbine Power & Specific Steam Consumption — ASME PTC 6 / IAPWS-IF97.
 *
 *   h₁, s₁ = Region 2 (P₁, T₁)
 *   h₂s    = f(P₂, s₁)  (wet dome or Region 2 isentropic)
 *   h₂     = h₁ − η_is · (h₁ − h₂s)
 *   W_shaft = ṁ · (h₁ − h₂) · η_mech
 *   W_elec  = W_shaft · η_gen
 *   SSC     = ṁ / W_elec
 *   Heat rate ≈ SSC · (h₁ − h_fw) with h_fw = hf(P₂) condensate screening
 *
 * Single-pressure, no reheat / extraction — PTC 6 field screening only.
 */

import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  iapwsSaturationTemperatureK,
  region1Props,
  region2Props,
} from "@/lib/calculators/data/iapwsSteamData";
import { fToC, psiToBar } from "@/lib/unitConverter";

export type SteamTurbinePowerSscInputs = {
  unitSystem: UnitSystem;
  /** Absolute inlet pressure — barA (metric) or psia (imperial). */
  inletPressure: number;
  /** Inlet temperature — °C or °F. */
  inletTemperature: number;
  /** Absolute exhaust pressure — barA or psia. */
  exhaustPressure: number;
  /**
   * Mass flow — t/h (metric tonne/h) or lb/h (imperial).
   */
  massFlow: number;
  /** Isentropic efficiency — percent (50–95). */
  etaIsentropicPct: number;
  /** Mechanical efficiency — percent (90–100). */
  etaMechPct: number;
  /** Generator efficiency — percent (90–100). */
  etaGenPct: number;
};

export const DEFAULT_STEAM_TURBINE_POWER_SSC_INPUTS: SteamTurbinePowerSscInputs =
  {
    unitSystem: "metric",
    inletPressure: 60,
    inletTemperature: 480,
    exhaustPressure: 0.1,
    massFlow: 50,
    etaIsentropicPct: 80,
    etaMechPct: 98,
    etaGenPct: 97,
  };

export const DEFAULT_STEAM_TURBINE_POWER_SSC_INPUTS_IMPERIAL: SteamTurbinePowerSscInputs =
  {
    unitSystem: "imperial",
    inletPressure: 850,
    inletTemperature: 850,
    exhaustPressure: 1.5,
    massFlow: 100000,
    etaIsentropicPct: 80,
    etaMechPct: 98,
    etaGenPct: 97,
  };

const BAR_TO_MPA = 0.1;
const KJ_KG_TO_BTU_LB = 0.429922614;
const KJ_KGK_TO_BTU_LB_R = 0.2388458966;
/** kJ/kWh → Btu/kWh (1 Btu = 1.05505585262 kJ). */
const KJ_KWH_TO_BTU_KWH = 1 / 1.05505585262;
/** Metric tonne → kg. */
const T_TO_KG = 1000;
const LB_TO_KG = 0.45359237;
/** Moisture erosion screening threshold (mass fraction liquid). */
export const MOISTURE_WARN_FRACTION = 0.12;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pctToFraction(pct: number): number {
  const v = finite(pct);
  if (v > 1.5) return clamp(v / 100, 0.01, 1);
  return clamp(v, 0.01, 1);
}

export function pressureToBarA(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? psiToBar(value) : finite(value);
}

export function temperatureToC(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? fToC(value) : finite(value);
}

/** Display mass flow → kg/h. */
export function massFlowToKgH(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial"
    ? finite(value) * LB_TO_KG
    : finite(value) * T_TO_KG;
}

export function kgHToDisplay(kgH: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? kgH / LB_TO_KG : kgH / T_TO_KG;
}

/**
 * Enthalpy / quality at (P, s) via IAPWS Region 4 wet dome or Region 2
 * isentropic (T solved by bisection on s(T,P)).
 */
export function enthalpyFromPressureEntropy(
  pMpa: number,
  sTarget: number,
): {
  hKjKg: number;
  quality: number;
  wet: boolean;
  tK: number;
  ok: boolean;
} {
  const tSatK = iapwsSaturationTemperatureK(pMpa);
  if (!Number.isFinite(tSatK) || !(pMpa > 0) || !Number.isFinite(sTarget)) {
    return { hKjKg: NaN, quality: 1, wet: false, tK: NaN, ok: false };
  }
  const liquid = region1Props(tSatK, pMpa);
  const vapor = region2Props(tSatK, pMpa);
  if (
    !Number.isFinite(liquid.s) ||
    !Number.isFinite(vapor.s) ||
    !Number.isFinite(liquid.h) ||
    !Number.isFinite(vapor.h)
  ) {
    return { hKjKg: NaN, quality: 1, wet: false, tK: tSatK, ok: false };
  }

  const sf = liquid.s;
  const sg = vapor.s;

  if (sTarget <= sf + 1e-8) {
    return {
      hKjKg: liquid.h,
      quality: 0,
      wet: true,
      tK: tSatK,
      ok: true,
    };
  }
  if (sTarget < sg - 1e-8) {
    const x = (sTarget - sf) / (sg - sf);
    return {
      hKjKg: liquid.h + x * (vapor.h - liquid.h),
      quality: clamp(x, 0, 1),
      wet: true,
      tK: tSatK,
      ok: true,
    };
  }

  // Superheated Region 2: s(T,P) = sTarget, T ≥ Tsat
  let lo = tSatK;
  let hi = Math.min(1073.15, tSatK + 450);
  let sHi = region2Props(hi, pMpa).s;
  let guard = 0;
  while (sHi < sTarget && hi < 1273.15 && guard < 8) {
    hi += 80;
    sHi = region2Props(hi, pMpa).s;
    guard += 1;
  }
  if (!(sHi >= sTarget - 1e-6)) {
    return { hKjKg: NaN, quality: 1, wet: false, tK: hi, ok: false };
  }

  for (let i = 0; i < 48; i++) {
    const mid = 0.5 * (lo + hi);
    const sMid = region2Props(mid, pMpa).s;
    if (!Number.isFinite(sMid)) break;
    if (sMid < sTarget) lo = mid;
    else hi = mid;
  }
  const tK = 0.5 * (lo + hi);
  const state = region2Props(tK, pMpa);
  return {
    hKjKg: state.h,
    quality: 1,
    wet: false,
    tK,
    ok: Number.isFinite(state.h),
  };
}

export type SteamTurbinePowerSscComputed = {
  invalid: boolean;
  invalidReason?: string;
  p1Bar: number;
  p2Bar: number;
  t1C: number;
  tSat1C: number;
  tSat2C: number;
  h1KjKg: number;
  s1KjKgK: number;
  h2sKjKg: number;
  h2KjKg: number;
  dhIdealKjKg: number;
  dhActualKjKg: number;
  exhaustQuality: number;
  exhaustMoisture: number;
  wetExhaust: boolean;
  hfwKjKg: number;
  mDotKgH: number;
  etaIsen: number;
  etaMech: number;
  etaGen: number;
  wShaftKw: number;
  wElecKw: number;
  wElecMw: number;
  sscKgPerKwh: number;
  heatRateKjPerKwh: number;
  moistureWarn: boolean;
  inletWetWarn: boolean;
};

export function computeSteamTurbinePowerSsc(
  inputs: SteamTurbinePowerSscInputs,
): SteamTurbinePowerSscComputed {
  const p1Bar = pressureToBarA(inputs.inletPressure, inputs.unitSystem);
  const p2Bar = pressureToBarA(inputs.exhaustPressure, inputs.unitSystem);
  const t1C = temperatureToC(inputs.inletTemperature, inputs.unitSystem);
  const mDotKgH = massFlowToKgH(inputs.massFlow, inputs.unitSystem);
  const etaIsen = pctToFraction(inputs.etaIsentropicPct);
  const etaMech = pctToFraction(inputs.etaMechPct);
  const etaGen = pctToFraction(inputs.etaGenPct);

  const empty = (reason: string): SteamTurbinePowerSscComputed => ({
    invalid: true,
    invalidReason: reason,
    p1Bar,
    p2Bar,
    t1C,
    tSat1C: NaN,
    tSat2C: NaN,
    h1KjKg: NaN,
    s1KjKgK: NaN,
    h2sKjKg: NaN,
    h2KjKg: NaN,
    dhIdealKjKg: NaN,
    dhActualKjKg: NaN,
    exhaustQuality: 1,
    exhaustMoisture: 0,
    wetExhaust: false,
    hfwKjKg: NaN,
    mDotKgH,
    etaIsen,
    etaMech,
    etaGen,
    wShaftKw: 0,
    wElecKw: 0,
    wElecMw: 0,
    sscKgPerKwh: NaN,
    heatRateKjPerKwh: NaN,
    moistureWarn: false,
    inletWetWarn: false,
  });

  if (!(p1Bar > 0.05) || p1Bar > 220) {
    return empty("Inlet pressure out of screening range (≈ 0.05–220 barA)");
  }
  if (!(p2Bar >= 0.02) || p2Bar > 30) {
    return empty("Exhaust pressure out of screening range (0.02–30 barA)");
  }
  if (!(p1Bar > p2Bar * 1.05)) {
    return empty("Inlet pressure must exceed exhaust pressure");
  }
  if (!(t1C >= 100) || t1C > 600) {
    return empty("Inlet temperature out of screening range (100–600 °C)");
  }
  if (!(mDotKgH > 0)) {
    return empty("Enter a positive steam mass flow");
  }

  const p1Mpa = p1Bar * BAR_TO_MPA;
  const p2Mpa = p2Bar * BAR_TO_MPA;
  const t1K = t1C + 273.15;
  const tSat1K = iapwsSaturationTemperatureK(p1Mpa);
  const tSat2K = iapwsSaturationTemperatureK(p2Mpa);
  if (!Number.isFinite(tSat1K) || !Number.isFinite(tSat2K)) {
    return empty("Could not evaluate IAPWS saturation temperature");
  }
  const tSat1C = tSat1K - 273.15;
  const tSat2C = tSat2K - 273.15;

  if (t1C < tSat1C - 0.2) {
    return {
      ...empty(
        `Inlet T (${t1C.toFixed(1)} °C) is below Tsat (${tSat1C.toFixed(1)} °C) — wet inlet is out of scope`,
      ),
      tSat1C,
      tSat2C,
      inletWetWarn: true,
    };
  }

  const inlet = region2Props(t1K, p1Mpa);
  if (!Number.isFinite(inlet.h) || !Number.isFinite(inlet.s)) {
    return empty("Could not evaluate Region 2 inlet steam properties");
  }

  const isen = enthalpyFromPressureEntropy(p2Mpa, inlet.s);
  if (!isen.ok || !Number.isFinite(isen.hKjKg)) {
    return empty("Could not evaluate isentropic exhaust state (P₂, s₁)");
  }

  const h1 = inlet.h;
  const s1 = inlet.s;
  const h2s = isen.hKjKg;
  const dhIdeal = h1 - h2s;
  if (!(dhIdeal > 0)) {
    return empty("Isentropic enthalpy drop ≤ 0 — check pressures / temperature");
  }

  const h2 = h1 - etaIsen * dhIdeal;
  const dhActual = h1 - h2;

  // Actual exhaust quality from h₂ vs sat dome at P₂
  const liq2 = region1Props(tSat2K, p2Mpa);
  const vap2 = region2Props(tSat2K, p2Mpa);
  let exhaustQuality = 1;
  let wetExhaust = false;
  if (h2 < vap2.h - 1e-6 && h2 > liq2.h) {
    exhaustQuality = (h2 - liq2.h) / (vap2.h - liq2.h);
    wetExhaust = true;
  } else if (h2 <= liq2.h) {
    exhaustQuality = 0;
    wetExhaust = true;
  }
  const exhaustMoisture = wetExhaust ? 1 - exhaustQuality : 0;
  const hfw = liq2.h;

  const wShaftKw = (mDotKgH / 3600) * dhActual * etaMech;
  const wElecKw = wShaftKw * etaGen;
  const wElecMw = wElecKw / 1000;
  const sscKgPerKwh = wElecKw > 1e-9 ? mDotKgH / wElecKw : NaN;
  const heatRateKjPerKwh =
    Number.isFinite(sscKgPerKwh) && Number.isFinite(hfw)
      ? sscKgPerKwh * (h1 - hfw)
      : NaN;

  return {
    invalid: false,
    p1Bar,
    p2Bar,
    t1C,
    tSat1C,
    tSat2C,
    h1KjKg: h1,
    s1KjKgK: s1,
    h2sKjKg: h2s,
    h2KjKg: h2,
    dhIdealKjKg: dhIdeal,
    dhActualKjKg: dhActual,
    exhaustQuality,
    exhaustMoisture,
    wetExhaust,
    hfwKjKg: hfw,
    mDotKgH,
    etaIsen,
    etaMech,
    etaGen,
    wShaftKw,
    wElecKw,
    wElecMw,
    sscKgPerKwh,
    heatRateKjPerKwh,
    moistureWarn: wetExhaust && exhaustMoisture > MOISTURE_WARN_FRACTION,
    inletWetWarn: t1C < tSat1C + 0.5,
  };
}

function fmtH(kjKg: number, unitSystem: UnitSystem, digits = 1): string {
  if (!Number.isFinite(kjKg)) return "—";
  if (unitSystem === "imperial") {
    return `${(kjKg * KJ_KG_TO_BTU_LB).toFixed(digits)} Btu/lb`;
  }
  return `${kjKg.toFixed(digits)} kJ/kg`;
}

function fmtS(kjKgK: number, unitSystem: UnitSystem, digits = 4): string {
  if (!Number.isFinite(kjKgK)) return "—";
  if (unitSystem === "imperial") {
    return `${(kjKgK * KJ_KGK_TO_BTU_LB_R).toFixed(digits)} Btu/lb·R`;
  }
  return `${kjKgK.toFixed(digits)} kJ/kg·K`;
}

function fmtPowerMw(mw: number, digits = 2): string {
  if (!Number.isFinite(mw)) return "—";
  if (Math.abs(mw) >= 1) return `${mw.toFixed(digits)} MW`;
  return `${(mw * 1000).toFixed(0)} kW`;
}

function fmtSsc(kgPerKwh: number, unitSystem: UnitSystem, digits = 2): string {
  if (!Number.isFinite(kgPerKwh)) return "—";
  if (unitSystem === "imperial") {
    return `${(kgPerKwh / LB_TO_KG).toFixed(digits)} lb/kWh`;
  }
  return `${kgPerKwh.toFixed(digits)} kg/kWh`;
}

function fmtHeatRate(
  kjPerKwh: number,
  unitSystem: UnitSystem,
  digits = 0,
): string {
  if (!Number.isFinite(kjPerKwh)) return "—";
  if (unitSystem === "imperial") {
    return `${(kjPerKwh * KJ_KWH_TO_BTU_KWH).toFixed(digits)} Btu/kWh`;
  }
  return `${kjPerKwh.toFixed(digits)} kJ/kWh`;
}

function fmtFlow(kgH: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(kgH)) return "—";
  if (unitSystem === "imperial") {
    return `${(kgH / LB_TO_KG).toFixed(0)} lb/h`;
  }
  return `${(kgH / T_TO_KG).toFixed(2)} t/h`;
}

export function calculateSteamTurbinePowerSsc(
  inputs: SteamTurbinePowerSscInputs,
): CalculatorOutput {
  const c = computeSteamTurbinePowerSsc(inputs);
  const units = inputs.unitSystem;

  let statusLevel: StatusLevel = "pass";
  let statusLabel = "Pass — PTC 6 / IAPWS-IF97 screening";
  if (c.invalid) {
    statusLevel = "warn";
    statusLabel = c.invalidReason ?? "Check inlet / exhaust steam inputs";
  } else if (c.moistureWarn) {
    statusLevel = "warn";
    statusLabel = `Pass with moisture warning — X_exh ≈ ${(c.exhaustMoisture * 100).toFixed(0)}%`;
  } else if (c.inletWetWarn) {
    statusLevel = "warn";
    statusLabel = "Pass — inlet near saturation (confirm superheat)";
  }

  const callouts: CalculatorOutput["callouts"] = [
    {
      tone: c.invalid || c.moistureWarn ? "warn" : "info",
      title: c.moistureWarn
        ? "Exhaust moisture / L-0 erosion risk"
        : "PTC 6 single-pressure screen",
      body: c.moistureWarn
        ? "Exhaust moisture exceeds ~12%. Last-stage (L-0) blade erosion risk rises — raise exhaust pressure or inlet temperature, or confirm OEM wetness limits."
        : "ASME PTC 6 / IAPWS-IF97 single-pressure expansion (no reheat or extraction). Confirm OEM heat balance for cogeneration / multi-extraction machines.",
      items: c.invalid
        ? [c.invalidReason ?? "Invalid duty"]
        : [
            `η_is ${(c.etaIsen * 100).toFixed(0)}% · η_mech ${(c.etaMech * 100).toFixed(1)}% · η_gen ${(c.etaGen * 100).toFixed(1)}%`,
            c.wetExhaust
              ? `Exhaust quality x ≈ ${c.exhaustQuality.toFixed(3)} (moisture ${(c.exhaustMoisture * 100).toFixed(1)}%)`
              : `Exhaust dry / superheated · inlet superheat ≈ ${(c.t1C - c.tSat1C).toFixed(0)} °C`,
          ],
    },
  ];

  return {
    heroLabel: "Electrical power · SSC",
    heroValue: c.invalid
      ? "—"
      : `${fmtPowerMw(c.wElecMw, 2)} · ${fmtSsc(c.sscKgPerKwh, units, 2)}`,
    heroStatus: statusLabel,
    heroStatusLevel: statusLevel,
    heroBadges: [
      {
        label: "Δh_ideal",
        value: fmtH(c.dhIdealKjKg, units, 0),
      },
      {
        label: "Shaft",
        value: c.invalid ? "—" : fmtPowerMw(c.wShaftKw / 1000, 2),
      },
      {
        label: "Heat rate",
        value: fmtHeatRate(c.heatRateKjPerKwh, units, 0),
      },
    ],
    summary: [
      { label: "SSC", value: fmtSsc(c.sscKgPerKwh, units, 2) },
      { label: "Δh_ideal", value: fmtH(c.dhIdealKjKg, units, 0) },
      {
        label: "Heat rate",
        value: fmtHeatRate(c.heatRateKjPerKwh, units, 0),
      },
    ],
    summaryStatus: {
      label:
        "ASME PTC 6 · IAPWS-IF97 screening — no reheat / extraction heat balance",
      level: "neutral",
    },
    rows: [
      {
        label: "Inlet h₁ · s₁",
        value: `${fmtH(c.h1KjKg, units)} · ${fmtS(c.s1KjKgK, units)}`,
        section: "Steam states",
        emphasis: true,
      },
      {
        label: "Ideal exhaust h₂s",
        value: fmtH(c.h2sKjKg, units),
        section: "Steam states",
      },
      {
        label: "Actual exhaust h₂ · moisture",
        value: c.invalid
          ? "—"
          : `${fmtH(c.h2KjKg, units)} · ${(c.exhaustMoisture * 100).toFixed(1)}%`,
        section: "Steam states",
        warn: c.moistureWarn,
      },
      {
        label: "Actual enthalpy drop Δh",
        value: fmtH(c.dhActualKjKg, units, 0),
        section: "Power",
        emphasis: true,
      },
    ],
    callouts,
    exportRows: [
      { label: "Standard", value: "ASME PTC 6 · IAPWS-IF97 (screening)" },
      { label: "P1 barA", value: c.p1Bar.toFixed(3) },
      { label: "T1 °C", value: c.t1C.toFixed(2) },
      { label: "P2 barA", value: c.p2Bar.toFixed(4) },
      { label: "ṁ kg/h", value: c.mDotKgH.toFixed(1) },
      { label: "η_is", value: (c.etaIsen * 100).toFixed(2) },
      { label: "η_mech", value: (c.etaMech * 100).toFixed(2) },
      { label: "η_gen", value: (c.etaGen * 100).toFixed(2) },
      { label: "h1 kJ/kg", value: c.invalid ? "—" : c.h1KjKg.toFixed(3) },
      { label: "s1 kJ/kg·K", value: c.invalid ? "—" : c.s1KjKgK.toFixed(5) },
      { label: "h2s kJ/kg", value: c.invalid ? "—" : c.h2sKjKg.toFixed(3) },
      { label: "h2 kJ/kg", value: c.invalid ? "—" : c.h2KjKg.toFixed(3) },
      {
        label: "Exhaust moisture %",
        value: c.invalid ? "—" : (c.exhaustMoisture * 100).toFixed(2),
      },
      {
        label: "W_shaft kW",
        value: c.invalid ? "—" : c.wShaftKw.toFixed(2),
      },
      { label: "W_elec MW", value: c.invalid ? "—" : c.wElecMw.toFixed(4) },
      {
        label: "SSC kg/kWh",
        value: c.invalid ? "—" : c.sscKgPerKwh.toFixed(4),
      },
      {
        label: "Heat rate kJ/kWh",
        value: c.invalid ? "—" : c.heatRateKjPerKwh.toFixed(1),
      },
      { label: "Status", value: c.invalid ? "Fail" : "Pass" },
    ],
  };
}
