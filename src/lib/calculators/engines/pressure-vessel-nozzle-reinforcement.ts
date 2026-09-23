/**
 * Pressure Vessel Nozzle Reinforcement — ASME Section VIII Division 1
 * UG-37 / UG-40 / UG-41 (Area Replacement Method).
 *
 * Required area (UG-37(c), F = 1 for radial openings):
 *   A = d·t_r·F + 2·t_n·t_r·F·(1 − f_r1)
 *
 * Available area (UG-40):
 *   A_avail = A1 + A2 + A3 + A41 + A42
 *
 * Screening only — not WRC 107/537/297 local stresses or external pressure.
 * Confirm project edition of Section II-D Table 1A for S(T).
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  ASME_VIII_HEAD_MATERIALS,
  ASME_VIII_NOZZLE_MATERIAL_IDS,
  ASME_VIII_SHELL_MATERIAL_IDS,
  getAsmeViiiAllowableStress,
  isAsmeViiiNozzleMaterialId,
  isAsmeViiiShellMaterialId,
  normalizeAsmeViiiNozzleMaterialId,
  normalizeAsmeViiiShellMaterialId,
  type AsmeViiiNozzleMaterialId,
  type AsmeViiiShellMaterialId,
} from "@/lib/calculators/data/asmeViiiDiv1AllowableStress";
import {
  getPipeScheduleEntry,
  listAvailableNps,
} from "@/lib/data/loaders";

export type NozzleShellTypeId =
  | "cylindrical-shell"
  | "2-1-ellipsoidal-head"
  | "spherical-head";

export type NozzleJointEfficiencyId = 0.85 | 1;

export type PressureVesselNozzleReinforcementInputs = {
  unitSystem: UnitSystem;
  shellType: NozzleShellTypeId;
  /** Shell / head inside diameter D_i — mm or in. */
  shellInsideDiameter: number;
  /** Design pressure P — MPa or psi. */
  designPressure: number;
  /** Design metal temperature T — °C or °F. */
  designTemperature: number;
  /** Nominal shell / head thickness (as-furnished) — mm or in. */
  shellThickness: number;
  shellMaterialId: AsmeViiiShellMaterialId;
  jointEfficiency: NozzleJointEfficiencyId;
  /** Nozzle NPS string (e.g. "6"). */
  nozzleNps: string;
  /** Nozzle outside diameter d_out — mm or in. */
  nozzleOutsideDiameter: number;
  /** Nominal nozzle wall thickness — mm or in. */
  nozzleThickness: number;
  nozzleMaterialId: AsmeViiiNozzleMaterialId;
  /** Corrosion allowance C.A. — mm or in. */
  corrosionAllowance: number;
  /** Reinforcement pad outer diameter D_p — mm or in. */
  padOutsideDiameter: number;
  /** Reinforcement pad thickness t_p — mm or in (0 = no pad). */
  padThickness: number;
  /** Inside nozzle projection h_i — mm or in (optional; default 0). */
  insideProjection: number;
  /** Outer fillet weld leg (each) for A41 screen — mm or in (optional). */
  weldLeg: number;
};

export const SHELL_TYPE_OPTIONS: {
  value: NozzleShellTypeId;
  label: string;
  ugRef: string;
}[] = [
  {
    value: "cylindrical-shell",
    label: "Cylindrical Shell",
    ugRef: "UG-27 / UG-37",
  },
  {
    value: "2-1-ellipsoidal-head",
    label: "2:1 Ellipsoidal Head",
    ugRef: "UG-32(d) / UG-37",
  },
  {
    value: "spherical-head",
    label: "Spherical / Hemispherical Head",
    ugRef: "UG-32(f) / UG-37",
  },
];

export const JOINT_EFFICIENCY_OPTIONS: {
  value: NozzleJointEfficiencyId;
  label: string;
}[] = [
  { value: 1, label: "1.00 — Full radiography" },
  { value: 0.85, label: "0.85 — Spot radiography" },
];

const MM_PER_IN = 25.4;
const MPA_TO_PSI = 145.0377377;
const MM2_PER_IN2 = 645.16;

export const DI_RANGE_MM = { min: 200, max: 10000 } as const;
export const DI_RANGE_IN = { min: 8, max: 400 } as const;
export const P_RANGE_MPA = { min: 0.1, max: 30 } as const;
export const P_RANGE_PSI = { min: 15, max: 4350 } as const;
export const T_RANGE_C = { min: -50, max: 500 } as const;
export const T_RANGE_F = { min: -58, max: 932 } as const;
export const T_SHELL_RANGE_MM = { min: 3, max: 100 } as const;
export const T_SHELL_RANGE_IN = { min: 0.12, max: 4 } as const;
export const T_NOZ_RANGE_MM = { min: 2, max: 50 } as const;
export const T_NOZ_RANGE_IN = { min: 0.08, max: 2 } as const;
export const CA_RANGE_MM = { min: 0, max: 10 } as const;
export const CA_RANGE_IN = { min: 0, max: 0.4 } as const;
export const DP_RANGE_MM = { min: 180, max: 1000 } as const;
export const DP_RANGE_IN = { min: 7, max: 40 } as const;
export const TP_RANGE_MM = { min: 0, max: 50 } as const;
export const TP_RANGE_IN = { min: 0, max: 2 } as const;

export const DEFAULT_PRESSURE_VESSEL_NOZZLE_REINFORCEMENT_INPUTS: PressureVesselNozzleReinforcementInputs =
  {
    unitSystem: "metric",
    shellType: "cylindrical-shell",
    shellInsideDiameter: 1200,
    designPressure: 2.0,
    designTemperature: 150,
    shellThickness: 16,
    shellMaterialId: "SA-516-70",
    jointEfficiency: 1,
    nozzleNps: "6",
    nozzleOutsideDiameter: 168.3,
    nozzleThickness: 11.0,
    nozzleMaterialId: "SA-106-B",
    corrosionAllowance: 3.0,
    padOutsideDiameter: 300,
    padThickness: 12,
    insideProjection: 0,
    weldLeg: 0,
  };

export const DEFAULT_PRESSURE_VESSEL_NOZZLE_REINFORCEMENT_INPUTS_IMPERIAL: PressureVesselNozzleReinforcementInputs =
  {
    unitSystem: "imperial",
    shellType: "cylindrical-shell",
    shellInsideDiameter: 48,
    designPressure: 300,
    designTemperature: 300,
    shellThickness: 0.625,
    shellMaterialId: "SA-516-70",
    jointEfficiency: 1,
    nozzleNps: "4",
    nozzleOutsideDiameter: 4.5,
    nozzleThickness: 0.337,
    nozzleMaterialId: "SA-106-B",
    corrosionAllowance: 0.125,
    padOutsideDiameter: 12,
    padThickness: 0.5,
    insideProjection: 0,
    weldLeg: 0,
  };

function finite(n: number | undefined | null, fallback = 0): number {
  return n != null && Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function frCap(sElement: number, sVessel: number): number {
  if (!(sVessel > 0) || !(sElement > 0)) return 1;
  return Math.min(1, sElement / sVessel);
}

export function isNozzleShellTypeId(value: string): value is NozzleShellTypeId {
  return SHELL_TYPE_OPTIONS.some((o) => o.value === value);
}

export function parseNozzleJointEfficiency(
  raw: string | number | undefined | null,
  fallback: NozzleJointEfficiencyId = 1,
): NozzleJointEfficiencyId {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  if (Math.abs(n - 1) < 1e-6) return 1;
  if (Math.abs(n - 0.85) < 1e-6) return 0.85;
  return fallback;
}

export function listNozzleNpsOptions(): { value: string; label: string }[] {
  return listAvailableNps()
    .filter((pipe) => {
      const n = Number(pipe.nps);
      return Number.isFinite(n) && n >= 2 && n <= 24;
    })
    .map((pipe) => ({ value: pipe.nps, label: pipe.npsLabel }));
}

/** B36 OD / wall for NPS + schedule in the active unit system. */
export function lookupNozzlePipeGeometry(
  nps: string,
  schedule: string,
  unitSystem: UnitSystem,
): { outsideDiameter: number; wallThickness: number } | null {
  const entry = getPipeScheduleEntry(nps, schedule);
  if (!entry) return null;
  if (unitSystem === "imperial") {
    return {
      outsideDiameter: entry.pipe.outsideDiameterIn,
      wallThickness: entry.row.wallThicknessMm / MM_PER_IN,
    };
  }
  return {
    outsideDiameter: entry.pipe.outsideDiameterMm,
    wallThickness: entry.row.wallThicknessMm,
  };
}

export function formatNozzleLength(
  value: number,
  unitSystem: UnitSystem,
  digits?: number,
): string {
  if (!Number.isFinite(value)) return "—";
  const d =
    digits ??
    (unitSystem === "imperial"
      ? value >= 10
        ? 2
        : 3
      : value >= 100
        ? 1
        : 2);
  return value.toFixed(d);
}

export function formatNozzleArea(
  value: number,
  unitSystem: UnitSystem,
): string {
  if (!Number.isFinite(value)) return "—";
  if (unitSystem === "imperial") {
    return value >= 10 ? value.toFixed(2) : value.toFixed(3);
  }
  return value >= 1000 ? value.toFixed(0) : value.toFixed(1);
}

export function formatNozzlePressure(
  value: number,
  unitSystem: UnitSystem,
): string {
  if (!Number.isFinite(value)) return "—";
  return unitSystem === "imperial"
    ? Math.round(value).toLocaleString("en-US")
    : value.toFixed(3);
}

/**
 * UG-27 / UG-32 required thickness of shell or head (same length unit as Di).
 */
export function requiredShellThicknessTr(inputs: {
  shellType: NozzleShellTypeId;
  insideDiameter: number;
  designPressure: number;
  allowableStress: number;
  jointEfficiency: number;
}): { tr: number; invalid: boolean; reason?: string } {
  const Di = finite(inputs.insideDiameter);
  const P = finite(inputs.designPressure);
  const S = finite(inputs.allowableStress);
  const E = finite(inputs.jointEfficiency);
  if (Di <= 0 || P <= 0 || S <= 0 || E <= 0) {
    return { tr: NaN, invalid: true, reason: "Enter positive Di, P, S, and E" };
  }

  switch (inputs.shellType) {
    case "cylindrical-shell": {
      const R = Di / 2;
      const den = S * E - 0.6 * P;
      if (den <= 0) {
        return {
          tr: NaN,
          invalid: true,
          reason: "Pressure exceeds UG-27 capacity (SE − 0.6P ≤ 0)",
        };
      }
      return { tr: (P * R) / den, invalid: false };
    }
    case "2-1-ellipsoidal-head": {
      const den = 2 * S * E - 0.2 * P;
      if (den <= 0) {
        return {
          tr: NaN,
          invalid: true,
          reason: "Pressure exceeds UG-32(d) capacity (2SE − 0.2P ≤ 0)",
        };
      }
      return { tr: (P * Di) / den, invalid: false };
    }
    case "spherical-head": {
      const R = Di / 2;
      const den = 2 * S * E - 0.2 * P;
      if (den <= 0) {
        return {
          tr: NaN,
          invalid: true,
          reason: "Pressure exceeds UG-32(f) capacity (2SE − 0.2P ≤ 0)",
        };
      }
      return { tr: (P * R) / den, invalid: false };
    }
    default:
      return { tr: NaN, invalid: true, reason: "Unknown shell type" };
  }
}

/**
 * UG-27 required nozzle-neck thickness (cylinder under internal P).
 * Uses corroded nozzle inside radius.
 */
export function requiredNozzleThicknessTrn(inputs: {
  nozzleOutsideDiameter: number;
  nozzleCorrodedThickness: number;
  designPressure: number;
  allowableStress: number;
  jointEfficiency?: number;
}): { trn: number; invalid: boolean; reason?: string } {
  const dout = finite(inputs.nozzleOutsideDiameter);
  const tn = Math.max(0, finite(inputs.nozzleCorrodedThickness));
  const P = finite(inputs.designPressure);
  const S = finite(inputs.allowableStress);
  const E = finite(inputs.jointEfficiency, 1);
  if (dout <= 0 || P <= 0 || S <= 0) {
    return { trn: NaN, invalid: true, reason: "Enter positive nozzle OD, P, S" };
  }
  const id = dout - 2 * tn;
  if (id <= 0) {
    return {
      trn: NaN,
      invalid: true,
      reason: "Nozzle corroded wall leaves non-positive ID",
    };
  }
  const R = id / 2;
  const den = S * E - 0.6 * P;
  if (den <= 0) {
    return {
      trn: NaN,
      invalid: true,
      reason: "Pressure exceeds nozzle UG-27 capacity (SE − 0.6P ≤ 0)",
    };
  }
  return { trn: (P * R) / den, invalid: false };
}

export type PressureVesselNozzleReinforcementComputed = {
  invalid: boolean;
  invalidReason?: string;
  unitSystem: UnitSystem;
  shellType: NozzleShellTypeId;
  ugRef: string;
  shellMaterialId: AsmeViiiShellMaterialId;
  nozzleMaterialId: AsmeViiiNozzleMaterialId;
  Sshell: number;
  Snoz: number;
  Spad: number;
  E1: number;
  F: number;
  fr1: number;
  fr2: number;
  fr4: number;
  Di: number;
  P: number;
  CA: number;
  tShellNom: number;
  tNozNom: number;
  /** Corroded shell thickness t. */
  t: number;
  /** Corroded nozzle thickness t_n. */
  tn: number;
  dout: number;
  /** Finished opening diameter in corroded condition. */
  d: number;
  tr: number;
  trn: number;
  Dp: number;
  tp: number;
  hi: number;
  weldLeg: number;
  A: number;
  A1: number;
  A2: number;
  A3: number;
  A41: number;
  A42: number;
  Aavail: number;
  /** Aavail − A (positive = excess). */
  deltaA: number;
  excessRatioPct: number;
  padRequired: boolean;
  /** Minimum pad thickness for A_avail ≥ A at given Dp (0 if adequate without pad metal). */
  tpMin: number;
  statusLevel: StatusLevel;
  statusLabel: string;
};

function areasAtPadThickness(
  base: {
    d: number;
    t: number;
    tn: number;
    tr: number;
    trn: number;
    F: number;
    E1: number;
    fr1: number;
    fr2: number;
    fr4: number;
    dout: number;
    Dp: number;
    hi: number;
    weldLeg: number;
  },
  tp: number,
): {
  A: number;
  A1: number;
  A2: number;
  A3: number;
  A41: number;
  A42: number;
  Aavail: number;
} {
  const { d, t, tn, tr, trn, F, E1, fr1, fr2, fr4, dout, Dp, hi, weldLeg } =
    base;

  const A =
    d * tr * F + 2 * tn * tr * F * (1 - fr1);

  const excessShell = E1 * t - F * tr;
  const A1a = Math.max(0, d * excessShell - 2 * tn * excessShell * (1 - fr1));
  const A1b = Math.max(
    0,
    2 * (t + tn) * excessShell - 2 * tn * excessShell * (1 - fr1),
  );
  const A1 = Math.max(A1a, A1b);

  const excessNoz = Math.max(0, tn - trn);
  const A2a = 5 * excessNoz * fr2 * t;
  const A2b = 2 * excessNoz * (2.5 * tn + Math.max(0, tp)) * fr2;
  const A2 = Math.max(0, Math.min(A2a, A2b));

  const A3 = Math.max(0, 2 * tn * fr2 * Math.max(0, hi));

  // Two outer fillet legs (header-to-pad / nozzle-to-pad) screening ≈ 2·leg²
  const A41 = Math.max(0, 2 * weldLeg * weldLeg * fr4);

  const padWidth = Math.max(0, Dp - dout);
  const A42 = Math.max(0, padWidth * Math.max(0, tp) * fr4);

  const Aavail = A1 + A2 + A3 + A41 + A42;
  return { A, A1, A2, A3, A41, A42, Aavail };
}

export function computePressureVesselNozzleReinforcement(
  inputs: PressureVesselNozzleReinforcementInputs,
): PressureVesselNozzleReinforcementComputed {
  const unitSystem = inputs.unitSystem === "imperial" ? "imperial" : "metric";
  const shellType = isNozzleShellTypeId(inputs.shellType)
    ? inputs.shellType
    : "cylindrical-shell";
  const shellMaterialId = isAsmeViiiShellMaterialId(inputs.shellMaterialId)
    ? inputs.shellMaterialId
    : normalizeAsmeViiiShellMaterialId(inputs.shellMaterialId);
  const nozzleMaterialId = isAsmeViiiNozzleMaterialId(inputs.nozzleMaterialId)
    ? inputs.nozzleMaterialId
    : normalizeAsmeViiiNozzleMaterialId(inputs.nozzleMaterialId);
  const ugRef =
    SHELL_TYPE_OPTIONS.find((o) => o.value === shellType)?.ugRef ?? "UG-37";

  const Di = finite(inputs.shellInsideDiameter);
  const P = finite(inputs.designPressure);
  const T = finite(inputs.designTemperature);
  const E1 = parseNozzleJointEfficiency(inputs.jointEfficiency);
  const CA = Math.max(0, finite(inputs.corrosionAllowance));
  const tShellNom = finite(inputs.shellThickness);
  const tNozNom = finite(inputs.nozzleThickness);
  const dout = finite(inputs.nozzleOutsideDiameter);
  const Dp = finite(inputs.padOutsideDiameter);
  const tp = Math.max(0, finite(inputs.padThickness));
  const hi = Math.max(0, finite(inputs.insideProjection));
  const weldLeg = Math.max(0, finite(inputs.weldLeg));
  const F = 1;

  const Sshell = getAsmeViiiAllowableStress(shellMaterialId, T, unitSystem);
  const Snoz = getAsmeViiiAllowableStress(nozzleMaterialId, T, unitSystem);
  const Spad = Sshell; // pad assumed same grade as shell plate
  const shellMat = ASME_VIII_HEAD_MATERIALS[shellMaterialId];
  const nozMat = ASME_VIII_HEAD_MATERIALS[nozzleMaterialId];

  const empty = (
    reason: string,
    level: StatusLevel = "fail",
  ): PressureVesselNozzleReinforcementComputed => ({
    invalid: true,
    invalidReason: reason,
    unitSystem,
    shellType,
    ugRef,
    shellMaterialId,
    nozzleMaterialId,
    Sshell: Number.isFinite(Sshell) ? Sshell : NaN,
    Snoz: Number.isFinite(Snoz) ? Snoz : NaN,
    Spad: Number.isFinite(Spad) ? Spad : NaN,
    E1,
    F,
    fr1: 1,
    fr2: 1,
    fr4: 1,
    Di,
    P,
    CA,
    tShellNom,
    tNozNom,
    t: Math.max(0, tShellNom - CA),
    tn: Math.max(0, tNozNom - CA),
    dout,
    d: NaN,
    tr: NaN,
    trn: NaN,
    Dp,
    tp,
    hi,
    weldLeg,
    A: NaN,
    A1: NaN,
    A2: NaN,
    A3: NaN,
    A41: NaN,
    A42: NaN,
    Aavail: NaN,
    deltaA: NaN,
    excessRatioPct: NaN,
    padRequired: true,
    tpMin: NaN,
    statusLevel: level,
    statusLabel: "FAIL",
  });

  if (!(Di > 0) || !(P > 0) || !(dout > 0)) {
    return empty(
      "Enter positive shell ID, design pressure, and nozzle OD",
      "warn",
    );
  }
  if (!(Sshell > 0) || !(Snoz > 0)) {
    return empty("Allowable stress S could not be resolved for material/T");
  }

  const maxTShell =
    unitSystem === "imperial" ? shellMat.maxTempF : shellMat.maxTempC;
  const maxTNoz =
    unitSystem === "imperial" ? nozMat.maxTempF : nozMat.maxTempC;
  if (T > maxTShell || T > maxTNoz) {
    return empty(
      `Design temperature exceeds screening limit for ${T > maxTShell ? shellMat.shortLabel : nozMat.shortLabel}`,
    );
  }

  const t = tShellNom - CA;
  const tn = tNozNom - CA;
  if (t <= 0) {
    return empty("Shell thickness less corrosion allowance is non-positive");
  }
  if (tn <= 0) {
    return empty("Nozzle thickness less corrosion allowance is non-positive");
  }

  // Finished opening diameter in corroded condition: nozzle ID after CA.
  const d = dout - 2 * tn;
  if (d <= 0) {
    return empty("Finished opening diameter is non-positive");
  }

  const trRes = requiredShellThicknessTr({
    shellType,
    insideDiameter: Di,
    designPressure: P,
    allowableStress: Sshell,
    jointEfficiency: E1,
  });
  if (trRes.invalid || !Number.isFinite(trRes.tr)) {
    return empty(trRes.reason ?? "Required shell thickness could not be evaluated");
  }
  const tr = trRes.tr;

  const trnRes = requiredNozzleThicknessTrn({
    nozzleOutsideDiameter: dout,
    nozzleCorrodedThickness: tn,
    designPressure: P,
    allowableStress: Snoz,
    jointEfficiency: 1,
  });
  if (trnRes.invalid || !Number.isFinite(trnRes.trn)) {
    return empty(
      trnRes.reason ?? "Required nozzle thickness could not be evaluated",
    );
  }
  const trn = trnRes.trn;

  const fr1 = frCap(Snoz, Sshell);
  const fr2 = frCap(Snoz, Sshell);
  const fr4 = frCap(Spad, Sshell);

  const base = {
    d,
    t,
    tn,
    tr,
    trn,
    F,
    E1,
    fr1,
    fr2,
    fr4,
    dout,
    Dp,
    hi,
    weldLeg,
  };

  const withPad = areasAtPadThickness(base, tp);
  const withoutPadMetal = areasAtPadThickness(base, 0);

  // Minimum tp at given Dp so A_avail ≥ A (iterate because A2 depends on tp).
  let tpMin = 0;
  if (withoutPadMetal.Aavail + 1e-9 < withoutPadMetal.A) {
    const padWidth = Math.max(0, Dp - dout);
    if (padWidth <= 0 || fr4 <= 0) {
      tpMin = Number.POSITIVE_INFINITY;
    } else {
      let lo = 0;
      let hiTp = Math.max(tp, tShellNom * 2, unitSystem === "imperial" ? 2 : 50);
      for (let i = 0; i < 40; i++) {
        const mid = 0.5 * (lo + hiTp);
        const trial = areasAtPadThickness(base, mid);
        if (trial.Aavail + 1e-9 >= trial.A) hiTp = mid;
        else lo = mid;
      }
      tpMin = hiTp;
      const check = areasAtPadThickness(base, tpMin);
      if (check.Aavail + 1e-6 < check.A) {
        tpMin = Number.POSITIVE_INFINITY;
      }
    }
  }

  const deltaA = withPad.Aavail - withPad.A;
  const excessRatioPct =
    withPad.A > 0 ? (deltaA / withPad.A) * 100 : Number.NaN;
  const padRequired = withoutPadMetal.Aavail + 1e-9 < withoutPadMetal.A;
  const adequate = withPad.Aavail + 1e-9 >= withPad.A;

  let statusLevel: StatusLevel = adequate ? "pass" : "fail";
  let statusLabel = adequate
    ? padRequired
      ? "PASS · UG-37 (pad OK)"
      : "PASS · UG-37"
    : "FAIL · UG-37";

  if (adequate && padRequired && tp > 0) {
    statusLevel = "pass";
  }

  return {
    invalid: false,
    unitSystem,
    shellType,
    ugRef,
    shellMaterialId,
    nozzleMaterialId,
    Sshell,
    Snoz,
    Spad,
    E1,
    F,
    fr1,
    fr2,
    fr4,
    Di,
    P,
    CA,
    tShellNom,
    tNozNom,
    t,
    tn,
    dout,
    d,
    tr,
    trn,
    Dp,
    tp,
    hi,
    weldLeg,
    A: withPad.A,
    A1: withPad.A1,
    A2: withPad.A2,
    A3: withPad.A3,
    A41: withPad.A41,
    A42: withPad.A42,
    Aavail: withPad.Aavail,
    deltaA,
    excessRatioPct,
    padRequired,
    tpMin: Number.isFinite(tpMin) ? tpMin : NaN,
    statusLevel,
    statusLabel,
  };
}

export function formatNozzleMaterialOption(
  materialId: AsmeViiiShellMaterialId | AsmeViiiNozzleMaterialId,
  designTemp: number,
  unitSystem: UnitSystem,
): string {
  const material = ASME_VIII_HEAD_MATERIALS[materialId];
  const S = getAsmeViiiAllowableStress(materialId, designTemp, unitSystem);
  if (!Number.isFinite(S)) return material.label;
  if (unitSystem === "imperial") {
    const mpa = S / MPA_TO_PSI;
    return `${material.shortLabel} — ${Math.round(S).toLocaleString("en-US")} psi (${mpa.toFixed(1)} MPa)`;
  }
  const psi = S * MPA_TO_PSI;
  return `${material.shortLabel} — ${S.toFixed(1)} MPa (${Math.round(psi).toLocaleString("en-US")} psi)`;
}

export function convertPressureVesselNozzleReinforcementUnitSystem(
  inputs: PressureVesselNozzleReinforcementInputs,
  to: UnitSystem,
): PressureVesselNozzleReinforcementInputs {
  const from = inputs.unitSystem;
  if (from === to) return { ...inputs, unitSystem: to };

  const len = (v: number) =>
    from === "imperial" ? v * MM_PER_IN : v / MM_PER_IN;
  const press = (v: number) =>
    from === "imperial" ? v / MPA_TO_PSI : v * MPA_TO_PSI;
  const temp = (v: number) =>
    from === "imperial" ? ((v - 32) * 5) / 9 : (v * 9) / 5 + 32;

  return {
    ...inputs,
    unitSystem: to,
    shellInsideDiameter: len(inputs.shellInsideDiameter),
    designPressure: press(inputs.designPressure),
    designTemperature: temp(inputs.designTemperature),
    shellThickness: len(inputs.shellThickness),
    nozzleOutsideDiameter: len(inputs.nozzleOutsideDiameter),
    nozzleThickness: len(inputs.nozzleThickness),
    corrosionAllowance: len(inputs.corrosionAllowance),
    padOutsideDiameter: len(inputs.padOutsideDiameter),
    padThickness: len(inputs.padThickness),
    insideProjection: len(inputs.insideProjection),
    weldLeg: len(inputs.weldLeg),
  };
}

export function calculatePressureVesselNozzleReinforcement(
  inputs: PressureVesselNozzleReinforcementInputs,
): CalculatorOutput {
  const c = computePressureVesselNozzleReinforcement(inputs);
  const lenU = c.unitSystem === "imperial" ? "in" : "mm";
  const areaU = c.unitSystem === "imperial" ? "in²" : "mm²";
  const pressureU = c.unitSystem === "imperial" ? "psi" : "MPa";
  const stressU = pressureU;

  const shellLabel =
    SHELL_TYPE_OPTIONS.find((o) => o.value === c.shellType)?.label ??
    c.shellType;
  const shellMat = ASME_VIII_HEAD_MATERIALS[c.shellMaterialId];
  const nozMat = ASME_VIII_HEAD_MATERIALS[c.nozzleMaterialId];

  const fmtL = (v: number) => formatNozzleLength(v, c.unitSystem);
  const fmtA = (v: number) => formatNozzleArea(v, c.unitSystem);

  const statusHero = c.invalid
    ? "—"
    : c.statusLevel === "fail"
      ? "Repad Required"
      : "Pass";

  const tpShow = c.invalid
    ? "—"
    : !c.padRequired
      ? `0 ${lenU}`
      : Number.isFinite(c.tpMin)
        ? `${fmtL(c.tpMin)} ${lenU}`
        : "Increase D_p / t_p";

  const heroValue = c.invalid
    ? (c.invalidReason ?? "Check inputs")
    : statusHero;

  const callouts: ResultCallout[] = [];
  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Cannot evaluate UG-37 reinforcement",
      body: c.invalidReason,
    });
  } else {
    callouts.push({
      tone: "warn",
      title: "UG-37 area replacement only",
      body: "Internal-pressure area replacement per ASME VIII-1 UG-37 / UG-40 / UG-41. Does not cover WRC 107/537/297 nozzle local stresses from piping loads, or UG-28 external pressure / vacuum.",
    });
    if (c.fr2 < 1 - 1e-9) {
      callouts.push({
        tone: "info",
        title: "Stress reduction factor f_r2 applied",
        body: `Nozzle allowable is below shell allowable (S_noz / S_shell = ${c.fr2.toFixed(3)}). Credited nozzle wall and inward-projection areas are reduced by f_r2.`,
      });
    } else if (!c.padRequired) {
      callouts.push({
        tone: "info",
        title: "Adequate without added pad metal",
        body: "Shell and nozzle excess thickness meet A without A₄₂. Entered pad thickness is optional for this duty.",
      });
    }
  }

  const rows: ResultRow[] = [
    {
      label: "Opening finish diameter (d)",
      value: c.invalid ? "—" : `${fmtL(c.d)} ${lenU}`,
      section: "Opening & Required Thickness",
      highlight: "d",
    },
    {
      label: "Required shell thickness (t_r)",
      value: c.invalid ? "—" : `${fmtL(c.tr)} ${lenU}`,
      section: "Opening & Required Thickness",
      highlight: "t",
    },
    {
      label: "Required nozzle thickness (t_rn)",
      value: c.invalid ? "—" : `${fmtL(c.trn)} ${lenU}`,
      section: "Opening & Required Thickness",
    },
    {
      label: "Shell excess area (A₁)",
      value: c.invalid ? "—" : `${fmtA(c.A1)} ${areaU}`,
      section: "Available Areas (UG-40)",
      emphasis: true,
    },
    {
      label: "Nozzle wall excess area (A₂)",
      value: c.invalid ? "—" : `${fmtA(c.A2)} ${areaU}`,
      section: "Available Areas (UG-40)",
    },
    {
      label: "Inside projection area (A₃)",
      value: c.invalid ? "—" : `${fmtA(c.A3)} ${areaU}`,
      section: "Available Areas (UG-40)",
    },
    {
      label: "Weld metal area (A₄₁)",
      value: c.invalid ? "—" : `${fmtA(c.A41)} ${areaU}`,
      section: "Available Areas (UG-40)",
    },
    {
      label: "Reinforcement pad area (A₄₂)",
      value: c.invalid ? "—" : `${fmtA(c.A42)} ${areaU}`,
      section: "Available Areas (UG-40)",
      highlight: "A",
    },
    {
      label: "Total available area (A_avail)",
      value: c.invalid ? "—" : `${fmtA(c.Aavail)} ${areaU}`,
      section: "Available Areas (UG-40)",
      emphasis: true,
    },
  ];

  const exportRows: ResultRow[] = [
    { label: "Shell type", value: `${shellLabel} · ${c.ugRef}` },
    { label: "Shell material", value: shellMat.label },
    { label: "Nozzle material", value: nozMat.label },
    {
      label: "Shell ID (D_i)",
      value: `${fmtL(c.Di)} ${lenU}`,
    },
    {
      label: "Design pressure (P)",
      value: `${formatNozzlePressure(c.P, c.unitSystem)} ${pressureU}`,
    },
    {
      label: "Allowable stress — shell (S)",
      value: c.invalid
        ? "—"
        : c.unitSystem === "imperial"
          ? `${Math.round(c.Sshell).toLocaleString("en-US")} ${stressU}`
          : `${c.Sshell.toFixed(1)} ${stressU}`,
    },
    {
      label: "Allowable stress — nozzle (S)",
      value: c.invalid
        ? "—"
        : c.unitSystem === "imperial"
          ? `${Math.round(c.Snoz).toLocaleString("en-US")} ${stressU}`
          : `${c.Snoz.toFixed(1)} ${stressU}`,
    },
    { label: "Joint efficiency (E₁)", value: c.E1.toFixed(2) },
    {
      label: "f_r1 / f_r2 / f_r4",
      value: `${c.fr1.toFixed(3)} / ${c.fr2.toFixed(3)} / ${c.fr4.toFixed(3)}`,
    },
    {
      label: "Corrosion allowance (C.A.)",
      value: `${fmtL(c.CA)} ${lenU}`,
    },
    {
      label: "Shell thickness corroded (t)",
      value: `${fmtL(c.t)} ${lenU}`,
    },
    {
      label: "Nozzle thickness corroded (t_n)",
      value: `${fmtL(c.tn)} ${lenU}`,
    },
    {
      label: "Finished opening diameter (d)",
      value: c.invalid ? "—" : `${fmtL(c.d)} ${lenU}`,
    },
    {
      label: "Required shell thickness (t_r)",
      value: c.invalid ? "—" : `${fmtL(c.tr)} ${lenU}`,
    },
    {
      label: "Required nozzle thickness (t_rn)",
      value: c.invalid ? "—" : `${fmtL(c.trn)} ${lenU}`,
    },
    {
      label: "Required area (A)",
      value: c.invalid ? "—" : `${fmtA(c.A)} ${areaU}`,
    },
    {
      label: "A₁",
      value: c.invalid ? "—" : `${fmtA(c.A1)} ${areaU}`,
    },
    {
      label: "A₂",
      value: c.invalid ? "—" : `${fmtA(c.A2)} ${areaU}`,
    },
    {
      label: "A₃",
      value: c.invalid ? "—" : `${fmtA(c.A3)} ${areaU}`,
    },
    {
      label: "A₄₁",
      value: c.invalid ? "—" : `${fmtA(c.A41)} ${areaU}`,
    },
    {
      label: "A₄₂",
      value: c.invalid ? "—" : `${fmtA(c.A42)} ${areaU}`,
    },
    {
      label: "A_avail",
      value: c.invalid ? "—" : `${fmtA(c.Aavail)} ${areaU}`,
    },
    {
      label: "Pad OD (D_p)",
      value: `${fmtL(c.Dp)} ${lenU}`,
    },
    {
      label: "Pad thickness (t_p)",
      value: `${fmtL(c.tp)} ${lenU}`,
    },
    {
      label: "Minimum required pad thickness",
      value: tpShow,
    },
  ];

  return {
    heroLabel: "Repad Requirement Status",
    heroValue,
    heroStatus: c.invalid
      ? c.invalidReason ?? "Check inputs"
      : c.statusLabel,
    heroStatusLevel: c.invalid ? "fail" : c.statusLevel,
    heroBadges: c.invalid
      ? undefined
      : [
          {
            label: "t_p min",
            value: tpShow,
          },
          {
            label: "A",
            value: `${fmtA(c.A)} ${areaU}`,
          },
        ],
    summary: [
      {
        label: "Required area (A)",
        value: c.invalid ? "—" : `${fmtA(c.A)} ${areaU}`,
      },
      {
        label: "Total available (A_avail)",
        value: c.invalid ? "—" : `${fmtA(c.Aavail)} ${areaU}`,
      },
      {
        label: "Excess / deficit",
        value: c.invalid
          ? "—"
          : `${c.excessRatioPct >= 0 ? "+" : ""}${c.excessRatioPct.toFixed(1)} %`,
      },
    ],
    summaryStatus: {
      label: c.invalid
        ? "FAIL — invalid UG-37 inputs"
        : c.statusLevel === "fail"
          ? "FAIL — increase pad OD / thickness or wall excess"
          : c.padRequired
            ? "PASS — entered pad area adequate"
            : "PASS — adequate without pad metal",
      level: c.invalid ? "fail" : c.statusLevel,
    },
    rows,
    exportRows,
    callouts,
  };
}

export {
  ASME_VIII_SHELL_MATERIAL_IDS,
  ASME_VIII_NOZZLE_MATERIAL_IDS,
  MM2_PER_IN2,
  MPA_TO_PSI,
};
