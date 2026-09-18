/**
 * IAPWS-IF97 Steam Thermodynamic Properties — Region 2 superheated
 * and Region 4 saturation (wet / dry) industrial screening.
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  IAPWS_P_CRIT_MPA,
  iapwsSaturationTemperatureK,
  iapwsThermalConductivityWmK,
  iapwsViscosityPaS,
  region1Props,
  region2Props,
} from "@/lib/calculators/data/iapwsSteamData";
import {
  cToF,
  fToC,
  kgM3ToLbFt3,
  psiToBar,
} from "@/lib/unitConverter";

export type SteamInputMode = "saturation" | "superheated";

export type SteamPropertiesIapwsInputs = {
  unitSystem: UnitSystem;
  /** Absolute pressure — bar (metric) or psi (imperial). */
  pressure: number;
  inputMode: SteamInputMode;
  /** °C (metric) or °F (imperial) — used in superheated mode. */
  temperature: number;
  /** Dryness fraction x — used in saturation mode. */
  steamQuality: number;
};

export const STEAM_PRESSURE_RANGE_BAR = { min: 0.01, max: 100 } as const;
export const STEAM_PRESSURE_RANGE_PSI = { min: 0.15, max: 1450 } as const;
export const STEAM_TEMP_RANGE_C = { min: 100, max: 600 } as const;
export const STEAM_TEMP_RANGE_F = { min: 212, max: 1112 } as const;
export const STEAM_QUALITY_RANGE = { min: 0, max: 1 } as const;

export const DEFAULT_STEAM_PROPERTIES_IAPWS_INPUTS: SteamPropertiesIapwsInputs =
  {
    unitSystem: "metric",
    pressure: 10,
    inputMode: "saturation",
    temperature: 200,
    steamQuality: 1,
  };

const KJ_KG_TO_BTU_LB = 0.429922614;
const KJ_KGK_TO_BTU_LB_F = 0.2388458966;
const M3KG_TO_FT3LB = 16.0184634;
const BAR_TO_MPA = 0.1;
const W_MK_TO_BTU_HFT_F = 0.5777893165;

export function pressureToBar(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? psiToBar(value) : value;
}

export function temperatureToCelsius(
  value: number,
  unitSystem: UnitSystem,
): number {
  return unitSystem === "imperial" ? fToC(value) : value;
}

export type SteamPropertiesIapwsComputed = {
  invalid: boolean;
  invalidReason?: string;
  pBar: number;
  pMpa: number;
  inputMode: SteamInputMode;
  region: "Region 4 Saturated" | "Region 2 Superheated" | "Out of Range";
  tSatC: number;
  tC: number;
  quality: number;
  hKjKg: number;
  hfKjKg: number;
  hgKjKg: number;
  hfgKjKg: number;
  sKjKgK: number;
  vM3Kg: number;
  rhoKgM3: number;
  viscosityPaS: number;
  thermalConductivityWmK: number;
  superheatWarn: boolean;
};

function clampQuality(x: number): number {
  if (!Number.isFinite(x)) return 1;
  return Math.min(
    STEAM_QUALITY_RANGE.max,
    Math.max(STEAM_QUALITY_RANGE.min, x),
  );
}

export function computeSteamPropertiesIapws(
  inputs: SteamPropertiesIapwsInputs,
): SteamPropertiesIapwsComputed {
  const pBar = pressureToBar(inputs.pressure, inputs.unitSystem);
  const pMpa = pBar * BAR_TO_MPA;
  const quality = clampQuality(inputs.steamQuality);
  const tInputC = temperatureToCelsius(inputs.temperature, inputs.unitSystem);

  const empty = (reason: string): SteamPropertiesIapwsComputed => ({
    invalid: true,
    invalidReason: reason,
    pBar,
    pMpa,
    inputMode: inputs.inputMode,
    region: "Out of Range",
    tSatC: NaN,
    tC: NaN,
    quality,
    hKjKg: NaN,
    hfKjKg: NaN,
    hgKjKg: NaN,
    hfgKjKg: NaN,
    sKjKgK: NaN,
    vM3Kg: NaN,
    rhoKgM3: NaN,
    viscosityPaS: NaN,
    thermalConductivityWmK: NaN,
    superheatWarn: false,
  });

  if (!Number.isFinite(pBar)) {
    return empty("Enter a valid absolute pressure");
  }
  if (
    pBar < STEAM_PRESSURE_RANGE_BAR.min ||
    pBar > STEAM_PRESSURE_RANGE_BAR.max
  ) {
    return empty(
      `Pressure must be ${STEAM_PRESSURE_RANGE_BAR.min}–${STEAM_PRESSURE_RANGE_BAR.max} bar abs (or psi equivalent)`,
    );
  }
  if (pMpa >= IAPWS_P_CRIT_MPA) {
    return empty(
      `Pressure ≥ critical (${IAPWS_P_CRIT_MPA} MPa). This calculator covers Region 2 / 4 only — use a full ASME steam table for supercritical states.`,
    );
  }

  const tSatK = iapwsSaturationTemperatureK(pMpa);
  if (!Number.isFinite(tSatK)) {
    return empty("Could not evaluate Region 4 saturation temperature");
  }
  const tSatC = tSatK - 273.15;

  if (inputs.inputMode === "saturation") {
    const liquid = region1Props(tSatK, pMpa);
    const vapor = region2Props(tSatK, pMpa);
    if (
      !Number.isFinite(liquid.h) ||
      !Number.isFinite(vapor.h) ||
      !(vapor.v > 0)
    ) {
      return empty("Could not evaluate saturation properties at this pressure");
    }
    const h = liquid.h + quality * (vapor.h - liquid.h);
    const s = liquid.s + quality * (vapor.s - liquid.s);
    const v = liquid.v + quality * (vapor.v - liquid.v);
    const rho = 1 / v;
    const tK = tSatK;
    return {
      invalid: false,
      pBar,
      pMpa,
      inputMode: "saturation",
      region: "Region 4 Saturated",
      tSatC,
      tC: tSatC,
      quality,
      hKjKg: h,
      hfKjKg: liquid.h,
      hgKjKg: vapor.h,
      hfgKjKg: vapor.h - liquid.h,
      sKjKgK: s,
      vM3Kg: v,
      rhoKgM3: rho,
      viscosityPaS: iapwsViscosityPaS(tK, rho),
      thermalConductivityWmK: iapwsThermalConductivityWmK(tK, rho),
      superheatWarn: false,
    };
  }

  // Superheated — Region 2
  if (
    tInputC < STEAM_TEMP_RANGE_C.min ||
    tInputC > STEAM_TEMP_RANGE_C.max
  ) {
    return empty(
      `Temperature must be ${STEAM_TEMP_RANGE_C.min}–${STEAM_TEMP_RANGE_C.max} °C (or °F equivalent)`,
    );
  }
  const superheatWarn = tInputC < tSatC + 0.05;
  if (tInputC < tSatC - 0.5) {
    return {
      ...empty(
        `Temperature ${tInputC.toFixed(1)} °C is below Tsat (${tSatC.toFixed(1)} °C) at this pressure — use Saturation mode for wet steam.`,
      ),
      tSatC,
      tC: tInputC,
      superheatWarn: true,
    };
  }

  const tK = tInputC + 273.15;
  const vapor = region2Props(tK, pMpa);
  const satVapor = region2Props(tSatK, pMpa);
  const satLiquid = region1Props(tSatK, pMpa);
  if (!Number.isFinite(vapor.h) || !(vapor.v > 0)) {
    return empty("Could not evaluate Region 2 superheated properties");
  }

  return {
    invalid: false,
    pBar,
    pMpa,
    inputMode: "superheated",
    region: "Region 2 Superheated",
    tSatC,
    tC: tInputC,
    quality: 1,
    hKjKg: vapor.h,
    hfKjKg: satLiquid.h,
    hgKjKg: satVapor.h,
    hfgKjKg: satVapor.h - satLiquid.h,
    sKjKgK: vapor.s,
    vM3Kg: vapor.v,
    rhoKgM3: vapor.rho,
    viscosityPaS: iapwsViscosityPaS(tK, vapor.rho),
    thermalConductivityWmK: iapwsThermalConductivityWmK(tK, vapor.rho),
    superheatWarn,
  };
}

function fmtH(h: number, units: UnitSystem): string {
  if (!Number.isFinite(h)) return "—";
  if (units === "imperial") {
    return `${(h * KJ_KG_TO_BTU_LB).toFixed(1)} Btu/lb`;
  }
  return `${h.toFixed(1)} kJ/kg`;
}

function fmtHDual(h: number, units: UnitSystem): string {
  if (!Number.isFinite(h)) return "—";
  if (units === "imperial") {
    return `${(h * KJ_KG_TO_BTU_LB).toFixed(1)} Btu/lb (${h.toFixed(1)} kJ/kg)`;
  }
  return `${h.toFixed(1)} kJ/kg (${(h * KJ_KG_TO_BTU_LB).toFixed(1)} Btu/lb)`;
}

function fmtS(s: number, units: UnitSystem): string {
  if (!Number.isFinite(s)) return "—";
  if (units === "imperial") {
    return `${(s * KJ_KGK_TO_BTU_LB_F).toFixed(3)} Btu/(lb·°F)`;
  }
  return `${s.toFixed(3)} kJ/(kg·K)`;
}

function fmtV(v: number, units: UnitSystem): string {
  if (!Number.isFinite(v)) return "—";
  if (units === "imperial") {
    return `${(v * M3KG_TO_FT3LB).toFixed(4)} ft³/lb`;
  }
  return `${v.toFixed(4)} m³/kg`;
}

function fmtRho(rho: number, units: UnitSystem): string {
  if (!Number.isFinite(rho)) return "—";
  if (units === "imperial") {
    return `${kgM3ToLbFt3(rho).toFixed(3)} lb/ft³`;
  }
  return `${rho.toFixed(3)} kg/m³`;
}

function fmtTemp(tC: number, units: UnitSystem): string {
  if (!Number.isFinite(tC)) return "—";
  if (units === "imperial") {
    return `${cToF(tC).toFixed(1)} °F (${tC.toFixed(1)} °C)`;
  }
  return `${tC.toFixed(1)} °C (${cToF(tC).toFixed(1)} °F)`;
}

function fmtTempShort(tC: number, units: UnitSystem): string {
  if (!Number.isFinite(tC)) return "—";
  if (units === "imperial") return `${cToF(tC).toFixed(1)} °F`;
  return `${tC.toFixed(1)} °C`;
}

function fmtMu(mu: number): string {
  if (!Number.isFinite(mu)) return "—";
  return `${mu.toExponential(3)} Pa·s (${(mu * 1000).toFixed(3)} cP)`;
}

function fmtK(k: number, units: UnitSystem): string {
  if (!Number.isFinite(k)) return "—";
  if (units === "imperial") {
    return `${(k * W_MK_TO_BTU_HFT_F).toFixed(4)} Btu/(h·ft·°F)`;
  }
  return `${k.toFixed(4)} W/(m·K)`;
}

export function calculateSteamPropertiesIapws(
  inputs: SteamPropertiesIapwsInputs,
): CalculatorOutput {
  const c = computeSteamPropertiesIapws(inputs);
  const units = inputs.unitSystem;
  const wet = c.inputMode === "saturation" && c.quality < 1 - 1e-9;
  const superheatDtC =
    c.inputMode === "superheated" && Number.isFinite(c.tC) && Number.isFinite(c.tSatC)
      ? c.tC - c.tSatC
      : NaN;

  let heroStatusLevel: StatusLevel = "neutral";
  let heroStatus: string =
    c.region === "Region 4 Saturated"
      ? wet
        ? `Wet · x = ${c.quality.toFixed(2)}`
        : "Dry saturated"
      : c.region === "Region 2 Superheated"
        ? "Superheated"
        : c.region;
  if (c.invalid) {
    heroStatusLevel = "fail";
    heroStatus = "Check inputs";
  } else if (c.superheatWarn || wet) {
    heroStatusLevel = "warn";
  }

  const callouts: ResultCallout[] = [];
  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Check steam state inputs",
      body: c.invalidReason,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Screening Note",
      body: "IAPWS-IF97 Region 2 (superheated) and Region 4 (saturation) up to Pc = 22.064 MPa. Supercritical or detailed wet-turbine expansion — verify with full ASME Steam Tables.",
    });
    if (c.superheatWarn) {
      callouts.push({
        tone: "warn",
        title: "Near or at saturation",
        body: `T ≈ Tsat (${fmtTempShort(c.tSatC, units)}). Use Saturation mode when quality x < 1.`,
      });
    }
  }

  const heroSecondary =
    c.inputMode === "saturation"
      ? `Tsat = ${fmtTempShort(c.tSatC, units)}`
      : `ρ = ${fmtRho(c.rhoKgM3, units)}`;

  const heroValue = c.invalid
    ? "—"
    : `${fmtH(c.hKjKg, units)} · ${heroSecondary}`;

  // Lean rows: no hero echo (h / sat Tsat). Context lives in badges.
  const rows: ResultRow[] = [];
  if (!c.invalid) {
    if (c.inputMode === "superheated") {
      rows.push(
        {
          section: "State",
          label: "Saturation temperature Tsat",
          value: fmtTemp(c.tSatC, units),
        },
        {
          section: "State",
          label: "Superheat ΔT (= T − Tsat)",
          value: Number.isFinite(superheatDtC)
            ? units === "imperial"
              ? `${(superheatDtC * 1.8).toFixed(1)} °F (${superheatDtC.toFixed(1)} K)`
              : `${superheatDtC.toFixed(1)} K (${(superheatDtC * 1.8).toFixed(1)} °F)`
            : "—",
          emphasis: true,
        },
      );
    }
    rows.push(
      {
        section: "Thermodynamic",
        label: "Latent heat hfg (= hg − hf)",
        value: fmtHDual(c.hfgKjKg, units),
        emphasis: c.inputMode === "saturation",
      },
      {
        section: "Thermodynamic",
        label: "Specific entropy s",
        value: fmtS(c.sKjKgK, units),
      },
    );
    if (wet) {
      rows.push({
        section: "Thermodynamic",
        label: "hf · hg (sat. liquid / vapor)",
        value: `${fmtH(c.hfKjKg, units)} · ${fmtH(c.hgKjKg, units)}`,
      });
    }
    rows.push(
      {
        section: "Transport",
        label: "Dynamic viscosity μ",
        value: fmtMu(c.viscosityPaS),
      },
      {
        section: "Transport",
        label: "Thermal conductivity k",
        value: fmtK(c.thermalConductivityWmK, units),
      },
    );
  }

  const badges = c.invalid
    ? undefined
    : [
        {
          label: "Region",
          value: c.region === "Region 4 Saturated" ? "R4 Sat." : "R2 Super.",
        },
        { label: "ρ", value: fmtRho(c.rhoKgM3, units) },
        { label: "v", value: fmtV(c.vM3Kg, units) },
        ...(wet
          ? [{ label: "x", value: c.quality.toFixed(2) }]
          : c.inputMode === "superheated"
            ? [{ label: "Tsat", value: fmtTempShort(c.tSatC, units) }]
            : []),
      ];

  return {
    heroLabel:
      c.inputMode === "saturation"
        ? "Specific enthalpy h · Tsat"
        : "Specific enthalpy h · Density ρ",
    heroValue,
    heroStatus,
    heroStatusLevel,
    heroBadges: badges,
    summary: [
      { label: "Entropy s", value: fmtS(c.sKjKgK, units) },
      { label: "Latent heat hfg", value: fmtH(c.hfgKjKg, units) },
      {
        label: "Viscosity μ",
        value: Number.isFinite(c.viscosityPaS)
          ? `${(c.viscosityPaS * 1000).toFixed(3)} cP`
          : "—",
      },
    ],
    summaryStatus: {
      label: heroStatus,
      level: heroStatusLevel,
    },
    rows,
    callouts,
    exportRows: [
      { label: "Standard", value: "IAPWS-IF97 / ASME Steam Tables" },
      { label: "Unit system", value: units },
      { label: "Input mode", value: c.inputMode },
      {
        label: "Pressure",
        value: `${inputs.pressure} ${units === "imperial" ? "psi" : "bar"} abs`,
      },
      {
        label: "Temperature",
        value:
          c.inputMode === "superheated"
            ? `${inputs.temperature} ${units === "imperial" ? "°F" : "°C"}`
            : "— (saturation)",
      },
      {
        label: "Steam quality x",
        value: c.inputMode === "saturation" ? String(c.quality) : "—",
      },
      { label: "Region", value: c.region },
      { label: "Tsat C", value: c.invalid ? "—" : c.tSatC.toFixed(3) },
      { label: "h kJ/kg", value: c.invalid ? "—" : c.hKjKg.toFixed(3) },
      { label: "hf kJ/kg", value: c.invalid ? "—" : c.hfKjKg.toFixed(3) },
      { label: "hg kJ/kg", value: c.invalid ? "—" : c.hgKjKg.toFixed(3) },
      { label: "hfg kJ/kg", value: c.invalid ? "—" : c.hfgKjKg.toFixed(3) },
      { label: "s kJ/kgK", value: c.invalid ? "—" : c.sKjKgK.toFixed(5) },
      { label: "v m3/kg", value: c.invalid ? "—" : c.vM3Kg.toFixed(6) },
      { label: "rho kg/m3", value: c.invalid ? "—" : c.rhoKgM3.toFixed(4) },
      {
        label: "mu Pa s",
        value: c.invalid ? "—" : c.viscosityPaS.toExponential(5),
      },
      {
        label: "k W/mK",
        value: c.invalid ? "—" : c.thermalConductivityWmK.toFixed(5),
      },
    ],
  };
}
