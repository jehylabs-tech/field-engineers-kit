/**
 * Natural gas Z-factor & density screening —
 * Standing Ppc/Tpc + Wichert-Aziz (CO2) + Kay N2 blend + Hall-Yarborough Z.
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  M_AIR,
  N2_PPC_PSIA,
  N2_TPC_R,
  R_UNIVERSAL,
  R_US_OILFIELD,
} from "@/lib/calculators/data/naturalGasConstants";
import { barToPsi, fToC, kgM3ToLbFt3, psiToBar } from "@/lib/unitConverter";

export type NaturalGasZDensityInputs = {
  unitSystem: UnitSystem;
  /** Absolute pressure — bar abs (metric) or psia (imperial). */
  pressure: number;
  /** Operating temperature — °C or °F. */
  temperature: number;
  /** Specific gravity relative to air. */
  specificGravity: number;
  /** CO2 mole % (0–20). */
  co2MolePercent: number;
  /** N2 mole % (0–20). */
  n2MolePercent: number;
};

/** Absolute pressure limits in bar abs (engine authority). */
export const PRESSURE_RANGE = { min: 0.5, max: 250 } as const;
/** Display clamp for imperial psia inputs (matches PRESSURE_RANGE). */
export const PRESSURE_RANGE_PSIA = {
  min: Number(barToPsi(PRESSURE_RANGE.min).toFixed(2)),
  max: Number(barToPsi(PRESSURE_RANGE.max).toFixed(1)),
} as const;
/** Screening note escalates above this absolute pressure. */
export const HIGH_PRESSURE_WARN_BAR = 150;
export const TEMP_RANGE_C = { min: -50, max: 150 } as const;
export const TEMP_RANGE_F = { min: -58, max: 302 } as const;
export const SG_RANGE = { min: 0.55, max: 0.9 } as const;
export const IMPURITY_RANGE = { min: 0, max: 20 } as const;

export const DEFAULT_NATURAL_GAS_Z_DENSITY_INPUTS: NaturalGasZDensityInputs = {
  unitSystem: "metric",
  pressure: 30,
  temperature: 25,
  specificGravity: 0.6,
  co2MolePercent: 0,
  n2MolePercent: 0,
};

export type NaturalGasZDensityComputed = {
  invalid: boolean;
  invalidReason?: string;
  /** True when Hall–Yarborough failed and CNGA fallback supplied Z. */
  usedCnga: boolean;
  sg: number;
  mGas: number;
  pBarAbs: number;
  pPsia: number;
  tK: number;
  tR: number;
  tpcR: number;
  ppcPsia: number;
  tpcK: number;
  ppcBar: number;
  tr: number;
  pr: number;
  z: number;
  rhoKgM3: number;
  rhoLbFt3: number;
  rhoIdealKgM3: number;
  rhoIdealLbFt3: number;
  deviationPercent: number;
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Standing (sweet gas) Tpc °R, Ppc psia from hydrocarbon SG. */
export function standingPseudoCriticals(sg: number): {
  tpcR: number;
  ppcPsia: number;
} {
  const g = clamp(sg, SG_RANGE.min, SG_RANGE.max);
  const tpcR = 168 + 325 * g - 12.5 * g * g;
  const ppcPsia = 677 + 15 * g - 37.5 * g * g;
  return { tpcR, ppcPsia };
}

/**
 * Wichert-Aziz acid-gas correction (CO2 / H2S). H2S = 0 in this screening tool.
 * Returns adjusted Tpc (°R), Ppc (psia).
 */
export function wichertAzizCorrect(
  tpcR: number,
  ppcPsia: number,
  yCo2: number,
  yH2s = 0,
): { tpcR: number; ppcPsia: number; epsilon: number } {
  const A = Math.max(0, yCo2) + Math.max(0, yH2s);
  const B = Math.max(0, yH2s);
  if (!(A > 0)) return { tpcR, ppcPsia, epsilon: 0 };
  const epsilon =
    120 * (A ** 0.9 - A ** 1.6) + 15 * (B ** 0.5 - B ** 4);
  const tpcAdj = tpcR - epsilon;
  const ppcAdj =
    (ppcPsia * tpcAdj) / (tpcR + B * (1 - B) * epsilon);
  return { tpcR: tpcAdj, ppcPsia: ppcAdj, epsilon };
}

/** Dilute Kay blend for N2 mole fraction on pseudo-criticals. */
export function kayBlendN2(
  tpcR: number,
  ppcPsia: number,
  yN2: number,
): { tpcR: number; ppcPsia: number } {
  const y = clamp(yN2, 0, 1);
  if (!(y > 0)) return { tpcR, ppcPsia };
  return {
    tpcR: (1 - y) * tpcR + y * N2_TPC_R,
    ppcPsia: (1 - y) * ppcPsia + y * N2_PPC_PSIA,
  };
}

/**
 * Hall-Yarborough Z from reduced Pr, Tr (Newton on y).
 * Valid roughly for Tr > 1.0; returns NaN if no convergence.
 */
export function hallYarboroughZ(pr: number, tr: number): number {
  if (!(pr > 0) || !(tr > 1.05)) return NaN;
  const t = 1 / tr;
  const A = 0.06125 * t * Math.exp(-1.2 * (1 - t) ** 2);
  const B = t * (14.76 - 9.76 * t + 4.58 * t * t);
  const C = t * (90.7 - 242.2 * t + 42.4 * t * t);
  const D = 2.18 + 2.82 * t;

  // Initial guess from reduced ideal-ish
  let y = (A * pr) / Math.max(0.2, 0.9);
  y = Math.min(0.9, Math.max(1e-8, y));

  for (let i = 0; i < 40; i++) {
    const oneMy = 1 - y;
    if (!(oneMy > 1e-8)) {
      y = 0.5;
      continue;
    }
    const num = y + y * y + y ** 3 - y ** 4;
    const den = oneMy ** 3;
    const f =
      -A * pr + num / den - B * y * y + C * y ** D;
    const dNum = 1 + 2 * y + 3 * y * y - 4 * y ** 3;
    const dDen = -3 * oneMy ** 2;
    const df =
      (dNum * den - num * dDen) / den ** 2 -
      2 * B * y +
      C * D * y ** (D - 1);
    if (!(Math.abs(df) > 1e-14)) break;
    const yNext = y - f / df;
    if (!Number.isFinite(yNext)) break;
    const clipped = Math.min(0.99, Math.max(1e-10, yNext));
    if (Math.abs(clipped - y) < 1e-12) {
      y = clipped;
      break;
    }
    y = clipped;
  }

  const z = (A * pr) / y;
  if (!(z > 0.05) || !(z < 3) || !Number.isFinite(z)) return NaN;
  return z;
}

/** CNGA empirical Z (fallback when HY outside range). */
export function cngaZ(pPsia: number, tR: number, sg: number): number {
  if (!(pPsia > 0) || !(tR > 0) || !(sg > 0)) return NaN;
  const denom = tR ** 3.825;
  const term =
    (3_450_000 * 10 ** (1.785 * sg) * pPsia) / denom;
  const z = 1 / (1 + term);
  return Number.isFinite(z) && z > 0 ? z : NaN;
}

export function computeNaturalGasZDensity(
  inputs: NaturalGasZDensityInputs,
): NaturalGasZDensityComputed {
  const imperial = inputs.unitSystem === "imperial";
  const sg = clamp(inputs.specificGravity, SG_RANGE.min, SG_RANGE.max);
  const yCo2 =
    clamp(inputs.co2MolePercent, IMPURITY_RANGE.min, IMPURITY_RANGE.max) /
    100;
  const yN2 =
    clamp(inputs.n2MolePercent, IMPURITY_RANGE.min, IMPURITY_RANGE.max) /
    100;

  const empty = (reason: string): NaturalGasZDensityComputed => ({
    invalid: true,
    invalidReason: reason,
    usedCnga: false,
    sg,
    mGas: sg * M_AIR,
    pBarAbs: NaN,
    pPsia: NaN,
    tK: NaN,
    tR: NaN,
    tpcR: NaN,
    ppcPsia: NaN,
    tpcK: NaN,
    ppcBar: NaN,
    tr: NaN,
    pr: NaN,
    z: NaN,
    rhoKgM3: NaN,
    rhoLbFt3: NaN,
    rhoIdealKgM3: NaN,
    rhoIdealLbFt3: NaN,
    deviationPercent: NaN,
  });

  if (yCo2 + yN2 > 0.35) {
    return empty("CO2 + N2 mole fraction too high for this screening method");
  }

  const pBarAbs = imperial
    ? psiToBar(inputs.pressure)
    : inputs.pressure;
  const pPsia = imperial ? inputs.pressure : barToPsi(inputs.pressure);
  const tC = imperial ? fToC(inputs.temperature) : inputs.temperature;
  const tK = tC + 273.15;
  const tR = (tC + 273.15) * 1.8;

  if (
    !(
      pBarAbs >= PRESSURE_RANGE.min &&
      pBarAbs <= PRESSURE_RANGE.max
    )
  ) {
    return empty(
      `Absolute pressure must be ${PRESSURE_RANGE.min}–${PRESSURE_RANGE.max} bar abs (or psia equivalent)`,
    );
  }
  if (!(tC >= TEMP_RANGE_C.min && tC <= TEMP_RANGE_C.max)) {
    return empty(
      `Temperature must be ${TEMP_RANGE_C.min}–${TEMP_RANGE_C.max} °C (or °F equivalent)`,
    );
  }

  let { tpcR, ppcPsia } = standingPseudoCriticals(sg);
  ({ tpcR, ppcPsia } = wichertAzizCorrect(tpcR, ppcPsia, yCo2, 0));
  ({ tpcR, ppcPsia } = kayBlendN2(tpcR, ppcPsia, yN2));

  const tr = tR / tpcR;
  const pr = pPsia / ppcPsia;
  if (!(tr > 0) || !(pr > 0)) {
    return empty("Invalid reduced properties");
  }

  let z = hallYarboroughZ(pr, tr);
  let usedCnga = false;
  if (!Number.isFinite(z)) {
    z = cngaZ(pPsia, tR, sg);
    usedCnga = true;
  }
  if (!Number.isFinite(z) || !(z > 0)) {
    return empty(
      usedCnga
        ? "Could not evaluate Z (outside Hall-Yarborough / CNGA screening range)"
        : "Could not evaluate Z (Hall-Yarborough did not converge)",
    );
  }

  const mGas = sg * M_AIR; // g/mol
  const mKgMol = mGas / 1000;
  // ρ = P M / (Z R T) with P in Pa
  const rhoKgM3 =
    (pBarAbs * 1e5 * mKgMol) / (z * R_UNIVERSAL * tK);
  const rhoIdealKgM3 =
    (pBarAbs * 1e5 * mKgMol) / (R_UNIVERSAL * tK);
  const rhoLbFt3 = (pPsia * mGas) / (z * R_US_OILFIELD * tR);
  const rhoIdealLbFt3 = kgM3ToLbFt3(rhoIdealKgM3);
  const deviationPercent =
    ((rhoKgM3 - rhoIdealKgM3) / rhoIdealKgM3) * 100;

  return {
    invalid: false,
    usedCnga,
    sg,
    mGas,
    pBarAbs,
    pPsia,
    tK,
    tR,
    tpcR,
    ppcPsia,
    tpcK: tpcR / 1.8,
    ppcBar: psiToBar(ppcPsia),
    tr,
    pr,
    z,
    rhoKgM3,
    rhoLbFt3,
    rhoIdealKgM3,
    rhoIdealLbFt3,
    deviationPercent,
  };
}

export function calculateNaturalGasZDensity(
  inputs: NaturalGasZDensityInputs,
): CalculatorOutput {
  const c = computeNaturalGasZDensity(inputs);
  const imperial = inputs.unitSystem === "imperial";

  const highPressure =
    !c.invalid && c.pBarAbs > HIGH_PRESSURE_WARN_BAR;

  const callouts: ResultCallout[] = [];
  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Check gas property inputs",
      body: c.invalidReason,
    });
  } else if (highPressure) {
    callouts.push({
      tone: "warn",
      title: "High-pressure screening limit",
      body: `P ≈ ${c.pBarAbs.toFixed(0)} bar abs exceeds the ${HIGH_PRESSURE_WARN_BAR} bar screening comfort band. Confirm Z and density with AGA-8 Detail / GERG-2008 composition methods before dense-phase or supercritical design.`,
    });
  } else if (c.usedCnga) {
    callouts.push({
      tone: "warn",
      title: "CNGA Z fallback",
      body: "Hall–Yarborough did not converge in range (often Tr ≲ 1.05). Z is from the CNGA empirical correlation — treat as coarse screening only.",
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Screening Note",
      body: "Standing Ppc/Tpc + Wichert–Aziz (CO₂) + Kay (N₂) + Hall–Yarborough Z. Not AGA-8 Detail / GERG-2008 — verify composition EOS for custody transfer or LNG envelopes.",
    });
  }

  const heroValue = c.invalid
    ? "—"
    : imperial
      ? `Z = ${c.z.toFixed(3)} · ρ = ${c.rhoLbFt3.toFixed(3)} lb/ft³`
      : `Z = ${c.z.toFixed(3)} · ρ = ${c.rhoKgM3.toFixed(2)} kg/m³`;

  const heroStatus = c.invalid
    ? "Check inputs"
    : highPressure
      ? "Verify vs AGA-8"
      : c.z < 0.7
        ? "High compressibility"
        : c.usedCnga
          ? "CNGA fallback"
          : "Screening OK";
  const heroStatusLevel: StatusLevel = c.invalid
    ? "fail"
    : highPressure || c.z < 0.7 || c.usedCnga
      ? "warn"
      : "pass";

  const rows: ResultRow[] = [];
  if (!c.invalid) {
    rows.push(
      {
        section: "Z & density",
        label: "Compressibility Z",
        value: c.z.toFixed(4),
        emphasis: true,
      },
      {
        section: "Z & density",
        label: "Real gas density",
        value: imperial
          ? `${c.rhoLbFt3.toFixed(3)} lb/ft³ (${c.rhoKgM3.toFixed(2)} kg/m³)`
          : `${c.rhoKgM3.toFixed(2)} kg/m³ (${c.rhoLbFt3.toFixed(3)} lb/ft³)`,
        emphasis: true,
      },
      {
        section: "Z & density",
        label: "Ideal density (Z = 1)",
        value: imperial
          ? `${c.rhoIdealLbFt3.toFixed(3)} lb/ft³ (${c.rhoIdealKgM3.toFixed(2)} kg/m³)`
          : `${c.rhoIdealKgM3.toFixed(2)} kg/m³ (${c.rhoIdealLbFt3.toFixed(3)} lb/ft³)`,
      },
      {
        section: "Reduced",
        label: "Pr / Tr · Ppc / Tpc",
        value: imperial
          ? `${c.pr.toFixed(3)} / ${c.tr.toFixed(3)} · ${c.ppcPsia.toFixed(0)} psia / ${c.tpcR.toFixed(0)} °R`
          : `${c.pr.toFixed(3)} / ${c.tr.toFixed(3)} · ${c.ppcBar.toFixed(1)} bar / ${c.tpcK.toFixed(0)} K`,
      },
    );
  }

  const badges = c.invalid
    ? undefined
    : [
        { label: "SG", value: c.sg.toFixed(2) },
        { label: "Pr", value: c.pr.toFixed(3) },
        { label: "Tr", value: c.tr.toFixed(3) },
        {
          label: "vs ideal",
          value: `${c.deviationPercent >= 0 ? "+" : ""}${c.deviationPercent.toFixed(1)}%`,
        },
      ];

  return {
    heroLabel: "Z-factor · real gas density",
    heroValue,
    heroStatus,
    heroStatusLevel,
    heroBadges: badges,
    summary: badges ?? [],
    summaryStatus: { label: heroStatus, level: heroStatusLevel },
    rows,
    callouts,
    exportRows: [
      {
        label: "Standard",
        value: c.usedCnga
          ? "Standing + CNGA fallback screening"
          : "Standing + Hall-Yarborough screening",
      },
      { label: "SG", value: c.invalid ? "—" : c.sg.toFixed(4) },
      { label: "M g/mol", value: c.invalid ? "—" : c.mGas.toFixed(3) },
      {
        label: "P bar abs",
        value: c.invalid ? "—" : c.pBarAbs.toFixed(4),
      },
      { label: "T K", value: c.invalid ? "—" : c.tK.toFixed(3) },
      { label: "Z", value: c.invalid ? "—" : c.z.toFixed(6) },
      {
        label: "Z method",
        value: c.invalid ? "—" : c.usedCnga ? "CNGA" : "Hall-Yarborough",
      },
      {
        label: "rho kg/m3",
        value: c.invalid ? "—" : c.rhoKgM3.toFixed(4),
      },
      {
        label: "rho lb/ft3",
        value: c.invalid ? "—" : c.rhoLbFt3.toFixed(5),
      },
      {
        label: "rho ideal kg/m3",
        value: c.invalid ? "—" : c.rhoIdealKgM3.toFixed(4),
      },
      {
        label: "deviation %",
        value: c.invalid ? "—" : c.deviationPercent.toFixed(3),
      },
      { label: "Pr", value: c.invalid ? "—" : c.pr.toFixed(5) },
      { label: "Tr", value: c.invalid ? "—" : c.tr.toFixed(5) },
      {
        label: "Ppc psia",
        value: c.invalid ? "—" : c.ppcPsia.toFixed(3),
      },
      { label: "Tpc R", value: c.invalid ? "—" : c.tpcR.toFixed(3) },
    ],
  };
}
