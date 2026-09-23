/**
 * Pressure Vessel Head Thickness — ASME Section VIII Division 1 UG-32
 * (Formed Heads and Sections, Pressure on Concave Side).
 *
 *   (d) 2:1 ellipsoidal:     t_req = P·D / (2·S·E − 0.2·P)
 *   (e) torispherical (L=D): t_req = 0.885·P·L / (S·E − 0.1·P)
 *   (f) hemispherical:       t_req = P·R / (2·S·E − 0.2·P), R = D/2
 *   (g) conical (α≤30°):     t_req = P·D / [2·cos(α)·(S·E − 0.6·P)]
 *   Nominal design:          t_nom = t_req + C.A.
 *
 * Screening only — not UG-22 loads, external pressure UG-28, or nozzle local
 * stresses. Confirm project edition of Section II-D Table 1A for S(T).
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
  getAsmeViiiAllowableStress,
  isAsmeViiiHeadMaterialId,
  normalizeAsmeViiiHeadMaterialId,
  type AsmeViiiHeadMaterialId,
} from "@/lib/calculators/data/asmeViiiDiv1AllowableStress";
import { headFullVolumeM3 } from "@/lib/calculators/engines/tank-vessel-volume";

export type HeadTypeId =
  | "ellipsoidal-2-1"
  | "torispherical"
  | "hemispherical"
  | "conical";

export type JointEfficiencyId = 0.7 | 0.85 | 1;

export type PressureVesselHeadThicknessInputs = {
  unitSystem: UnitSystem;
  headType: HeadTypeId;
  /** Inside diameter D — mm (metric) or in (imperial). */
  insideDiameter: number;
  /** Design pressure P — MPa or psi. */
  designPressure: number;
  /** Design metal temperature T — °C or °F. */
  designTemperature: number;
  materialId: AsmeViiiHeadMaterialId;
  jointEfficiency: JointEfficiencyId;
  /** Corrosion allowance C.A. — mm or in. */
  corrosionAllowance: number;
  /** Half-apex angle α — degrees (conical only). */
  halfApexAngle: number;
};

export const HEAD_TYPE_OPTIONS: {
  value: HeadTypeId;
  label: string;
  ugRef: string;
}[] = [
  {
    value: "ellipsoidal-2-1",
    label: "2:1 Semi-Ellipsoidal",
    ugRef: "UG-32(d)",
  },
  {
    value: "torispherical",
    label: "Torispherical (6% knuckle F&D)",
    ugRef: "UG-32(e)",
  },
  {
    value: "hemispherical",
    label: "Hemispherical",
    ugRef: "UG-32(f)",
  },
  {
    value: "conical",
    label: "Conical (without knuckle)",
    ugRef: "UG-32(g)",
  },
];

export const JOINT_EFFICIENCY_OPTIONS: {
  value: JointEfficiencyId;
  label: string;
}[] = [
  { value: 1, label: "1.00 — Full radiography" },
  { value: 0.85, label: "0.85 — Spot radiography" },
  { value: 0.7, label: "0.70 — No radiography" },
];

export const D_RANGE_MM = { min: 100, max: 10000 } as const;
export const D_RANGE_IN = { min: 4, max: 400 } as const;
export const P_RANGE_MPA = { min: 0.01, max: 30 } as const;
export const P_RANGE_PSI = { min: 1.5, max: 4350 } as const;
export const T_RANGE_C = { min: -50, max: 600 } as const;
export const T_RANGE_F = { min: -58, max: 1112 } as const;
export const CA_RANGE_MM = { min: 0, max: 12.5 } as const;
export const CA_RANGE_IN = { min: 0, max: 0.5 } as const;
export const ALPHA_RANGE_DEG = { min: 1, max: 30 } as const;

/** Torispherical F&D volume coefficient (same as tank-vessel-volume). */
const FD_VOLUME_COEFF = 0.084766;

const MM_PER_IN = 25.4;
const MPA_TO_PSI = 145.0377377;
const KG_TO_LB = 2.20462262;

export const DEFAULT_PRESSURE_VESSEL_HEAD_THICKNESS_INPUTS: PressureVesselHeadThicknessInputs =
  {
    unitSystem: "metric",
    headType: "ellipsoidal-2-1",
    insideDiameter: 1500,
    designPressure: 1.5,
    designTemperature: 150,
    materialId: "SA-516-70",
    jointEfficiency: 1,
    corrosionAllowance: 3,
    halfApexAngle: 30,
  };

export const DEFAULT_PRESSURE_VESSEL_HEAD_THICKNESS_INPUTS_IMPERIAL: PressureVesselHeadThicknessInputs =
  {
    unitSystem: "imperial",
    headType: "hemispherical",
    insideDiameter: 60,
    designPressure: 300,
    designTemperature: 300,
    materialId: "SA-516-70",
    jointEfficiency: 1,
    corrosionAllowance: 0.125,
    halfApexAngle: 30,
  };

function finite(n: number | undefined | null, fallback = 0): number {
  return n != null && Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function isHeadTypeId(value: string): value is HeadTypeId {
  return HEAD_TYPE_OPTIONS.some((o) => o.value === value);
}

export function parseJointEfficiency(
  raw: string | number | undefined | null,
  fallback: JointEfficiencyId = 1,
): JointEfficiencyId {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  if (Math.abs(n - 1) < 1e-6) return 1;
  if (Math.abs(n - 0.85) < 1e-6) return 0.85;
  if (Math.abs(n - 0.7) < 1e-6) return 0.7;
  return fallback;
}

export function formatHeadLength(
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

export function formatHeadPressure(
  value: number,
  unitSystem: UnitSystem,
): string {
  if (!Number.isFinite(value)) return "—";
  return unitSystem === "imperial"
    ? Math.round(value).toLocaleString("en-US")
    : value.toFixed(3);
}

/**
 * UG-32 required thickness t_req (same length unit as D / L / R / CA).
 */
export function requiredHeadThickness(inputs: {
  headType: HeadTypeId;
  insideDiameter: number;
  designPressure: number;
  allowableStress: number;
  jointEfficiency: number;
  halfApexAngleDeg?: number;
}): { tReq: number; invalid: boolean; reason?: string } {
  const D = finite(inputs.insideDiameter);
  const P = finite(inputs.designPressure);
  const S = finite(inputs.allowableStress);
  const E = finite(inputs.jointEfficiency);
  if (D <= 0 || P <= 0 || S <= 0 || E <= 0) {
    return { tReq: NaN, invalid: true, reason: "Enter positive D, P, S, and E" };
  }

  switch (inputs.headType) {
    case "ellipsoidal-2-1": {
      const den = 2 * S * E - 0.2 * P;
      if (den <= 0) {
        return {
          tReq: NaN,
          invalid: true,
          reason: "Pressure exceeds UG-32(d) capacity (2SE − 0.2P ≤ 0)",
        };
      }
      return { tReq: (P * D) / den, invalid: false };
    }
    case "torispherical": {
      // Spec / UG-32(e) screening with crown radius L = D (standard 6% F&D).
      const L = D;
      const den = S * E - 0.1 * P;
      if (den <= 0) {
        return {
          tReq: NaN,
          invalid: true,
          reason: "Pressure exceeds UG-32(e) capacity (SE − 0.1P ≤ 0)",
        };
      }
      return { tReq: (0.885 * P * L) / den, invalid: false };
    }
    case "hemispherical": {
      const R = 0.5 * D;
      const den = 2 * S * E - 0.2 * P;
      if (den <= 0) {
        return {
          tReq: NaN,
          invalid: true,
          reason: "Pressure exceeds UG-32(f) capacity (2SE − 0.2P ≤ 0)",
        };
      }
      return { tReq: (P * R) / den, invalid: false };
    }
    case "conical": {
      const alphaDeg = clamp(
        finite(inputs.halfApexAngleDeg, 30),
        ALPHA_RANGE_DEG.min,
        90,
      );
      if (alphaDeg > 30) {
        return {
          tReq: NaN,
          invalid: true,
          reason:
            "UG-32(g) without knuckle is limited to half-apex angle α ≤ 30°",
        };
      }
      const cosA = Math.cos((alphaDeg * Math.PI) / 180);
      if (cosA <= 0) {
        return { tReq: NaN, invalid: true, reason: "Invalid half-apex angle" };
      }
      const den = S * E - 0.6 * P;
      if (den <= 0) {
        return {
          tReq: NaN,
          invalid: true,
          reason: "Pressure exceeds UG-32(g) capacity (SE − 0.6P ≤ 0)",
        };
      }
      return { tReq: (P * D) / (2 * cosA * den), invalid: false };
    }
    default:
      return { tReq: NaN, invalid: true, reason: "Unknown head type" };
  }
}

/**
 * MAWP for a given pressure-resisting thickness t (= t_nom − CA), same units.
 */
export function mawpForHeadThickness(inputs: {
  headType: HeadTypeId;
  insideDiameter: number;
  thickness: number;
  allowableStress: number;
  jointEfficiency: number;
  halfApexAngleDeg?: number;
}): number {
  const D = finite(inputs.insideDiameter);
  const t = finite(inputs.thickness);
  const S = finite(inputs.allowableStress);
  const E = finite(inputs.jointEfficiency);
  if (D <= 0 || t <= 0 || S <= 0 || E <= 0) return NaN;

  switch (inputs.headType) {
    case "ellipsoidal-2-1":
      return (2 * S * E * t) / (D + 0.2 * t);
    case "torispherical": {
      const L = D;
      return (S * E * t) / (0.885 * L + 0.1 * t);
    }
    case "hemispherical": {
      const R = 0.5 * D;
      return (2 * S * E * t) / (R + 0.2 * t);
    }
    case "conical": {
      const alphaDeg = clamp(
        finite(inputs.halfApexAngleDeg, 30),
        ALPHA_RANGE_DEG.min,
        30,
      );
      const cosA = Math.cos((alphaDeg * Math.PI) / 180);
      return (2 * S * E * t * cosA) / (D + 1.2 * t * cosA);
    }
    default:
      return NaN;
  }
}

function diameterM(D: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? (D * MM_PER_IN) / 1000 : D / 1000;
}

function thicknessM(t: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? (t * MM_PER_IN) / 1000 : t / 1000;
}

/** Internal volume of one formed head (m³) — secondary reference. */
export function headInternalVolumeM3(
  headType: HeadTypeId,
  diM: number,
  halfApexAngleDeg: number,
): number {
  if (!(diM > 0)) return 0;
  switch (headType) {
    case "ellipsoidal-2-1":
      return headFullVolumeM3("2to1-ellipsoidal", diM);
    case "hemispherical":
      return headFullVolumeM3("hemispherical", diM);
    case "torispherical":
      return FD_VOLUME_COEFF * diM * diM * diM;
    case "conical": {
      const alpha = clamp(halfApexAngleDeg, ALPHA_RANGE_DEG.min, 30);
      const tanA = Math.tan((alpha * Math.PI) / 180);
      if (!(tanA > 0)) return 0;
      // Cone to apex: V = π D³ / (24 tan α)
      return (Math.PI * diM * diM * diM) / (24 * tanA);
    }
    default:
      return 0;
  }
}

/** Approximate developed surface area (m²) for weight screen. */
function headSurfaceAreaM2(
  headType: HeadTypeId,
  diM: number,
  halfApexAngleDeg: number,
): number {
  if (!(diM > 0)) return 0;
  const D2 = diM * diM;
  switch (headType) {
    case "ellipsoidal-2-1":
      // Common 2:1 SE inside surface ≈ 1.084 D²
      return 1.084 * D2;
    case "hemispherical":
      return (Math.PI * D2) / 2;
    case "torispherical":
      return 0.9286 * D2;
    case "conical": {
      const alpha = clamp(halfApexAngleDeg, ALPHA_RANGE_DEG.min, 30);
      const sinA = Math.sin((alpha * Math.PI) / 180);
      if (!(sinA > 0)) return 0;
      return (Math.PI * D2) / (4 * sinA);
    }
    default:
      return 0;
  }
}

export type PressureVesselHeadThicknessComputed = {
  invalid: boolean;
  invalidReason?: string;
  headType: HeadTypeId;
  ugRef: string;
  materialId: AsmeViiiHeadMaterialId;
  S: number;
  E: number;
  D: number;
  P: number;
  CA: number;
  alphaDeg: number;
  tReq: number;
  tNom: number;
  mawp: number;
  volumeM3: number;
  weightKg: number;
  statusLevel: StatusLevel;
  statusLabel: string;
  unitSystem: UnitSystem;
};

export function computePressureVesselHeadThickness(
  inputs: PressureVesselHeadThicknessInputs,
): PressureVesselHeadThicknessComputed {
  const unitSystem = inputs.unitSystem === "imperial" ? "imperial" : "metric";
  const headType = isHeadTypeId(inputs.headType)
    ? inputs.headType
    : "ellipsoidal-2-1";
  const materialId = isAsmeViiiHeadMaterialId(inputs.materialId)
    ? inputs.materialId
    : normalizeAsmeViiiHeadMaterialId(inputs.materialId);
  const ugRef =
    HEAD_TYPE_OPTIONS.find((o) => o.value === headType)?.ugRef ?? "UG-32";

  const D = finite(inputs.insideDiameter);
  const P = finite(inputs.designPressure);
  const T = finite(inputs.designTemperature);
  const E = parseJointEfficiency(inputs.jointEfficiency);
  const CA = Math.max(0, finite(inputs.corrosionAllowance));
  const alphaDeg = clamp(
    finite(inputs.halfApexAngle, 30),
    ALPHA_RANGE_DEG.min,
    90,
  );

  const S = getAsmeViiiAllowableStress(materialId, T, unitSystem);
  const material = ASME_VIII_HEAD_MATERIALS[materialId];

  const empty = (
    reason: string,
    level: StatusLevel = "fail",
  ): PressureVesselHeadThicknessComputed => ({
    invalid: true,
    invalidReason: reason,
    headType,
    ugRef,
    materialId,
    S: Number.isFinite(S) ? S : NaN,
    E,
    D,
    P,
    CA,
    alphaDeg,
    tReq: NaN,
    tNom: NaN,
    mawp: NaN,
    volumeM3: 0,
    weightKg: 0,
    statusLevel: level,
    statusLabel: "FAIL",
    unitSystem,
  });

  if (!(D > 0) || !(P > 0)) {
    return empty("Enter positive inside diameter and design pressure", "warn");
  }
  if (!(S > 0)) {
    return empty("Allowable stress S could not be resolved for material/T");
  }

  const maxT = unitSystem === "imperial" ? material.maxTempF : material.maxTempC;
  if (T > maxT) {
    return empty(
      `Design temperature exceeds screening limit for ${material.shortLabel} (${maxT} ${unitSystem === "imperial" ? "°F" : "°C"})`,
    );
  }

  const req = requiredHeadThickness({
    headType,
    insideDiameter: D,
    designPressure: P,
    allowableStress: S,
    jointEfficiency: E,
    halfApexAngleDeg: alphaDeg,
  });
  if (req.invalid || !Number.isFinite(req.tReq)) {
    return empty(req.reason ?? "UG-32 thickness could not be evaluated");
  }

  const tReq = req.tReq;
  const tNom = tReq + CA;
  const mawp = mawpForHeadThickness({
    headType,
    insideDiameter: D,
    thickness: tReq,
    allowableStress: S,
    jointEfficiency: E,
    halfApexAngleDeg: alphaDeg,
  });

  const diM = diameterM(D, unitSystem);
  const volumeM3 = headInternalVolumeM3(headType, diM, alphaDeg);
  const areaM2 = headSurfaceAreaM2(headType, diM, alphaDeg);
  const tM = thicknessM(tNom, unitSystem);
  const weightKg = areaM2 * tM * material.densityKgM3;

  // Applicability screen: UG-27/UG-32 style P/SE ≤ 0.385 for thin-wall heads
  const pOverSE = P / (S * E);
  let statusLevel: StatusLevel = "pass";
  let statusLabel = "PASS";
  if (pOverSE > 0.385) {
    statusLevel = "warn";
    statusLabel = "REVIEW";
  }

  return {
    invalid: false,
    headType,
    ugRef,
    materialId,
    S,
    E,
    D,
    P,
    CA,
    alphaDeg,
    tReq,
    tNom,
    mawp,
    volumeM3,
    weightKg,
    statusLevel,
    statusLabel,
    unitSystem,
  };
}

/** Material dropdown label — active unit system first (FEK standard). */
export function formatHeadMaterialOption(
  materialId: AsmeViiiHeadMaterialId,
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

export function calculatePressureVesselHeadThickness(
  inputs: PressureVesselHeadThicknessInputs,
): CalculatorOutput {
  const c = computePressureVesselHeadThickness(inputs);
  const unit = c.unitSystem === "imperial" ? "in" : "mm";
  const pressureUnit = c.unitSystem === "imperial" ? "psi" : "MPa";
  const stressUnit = pressureUnit;
  const volUnit = c.unitSystem === "imperial" ? "ft³" : "m³";
  const massUnit = c.unitSystem === "imperial" ? "lb" : "kg";

  const headLabel =
    HEAD_TYPE_OPTIONS.find((o) => o.value === c.headType)?.label ?? c.headType;
  const material = ASME_VIII_HEAD_MATERIALS[c.materialId];

  const volumeDisplay =
    c.unitSystem === "imperial" ? c.volumeM3 * 35.3146667 : c.volumeM3;
  const weightDisplay =
    c.unitSystem === "imperial" ? c.weightKg * KG_TO_LB : c.weightKg;

  const tNomLabel = c.invalid
    ? "—"
    : `${formatHeadLength(c.tNom, c.unitSystem)} ${unit}`;
  const tReqLabel = c.invalid
    ? "—"
    : `${formatHeadLength(c.tReq, c.unitSystem)} ${unit}`;
  const mawpLabel = c.invalid
    ? "—"
    : `${formatHeadPressure(c.mawp, c.unitSystem)} ${pressureUnit}`;
  const sLabel = c.invalid
    ? "—"
    : c.unitSystem === "imperial"
      ? `${Math.round(c.S).toLocaleString("en-US")} ${stressUnit}`
      : `${c.S.toFixed(1)} ${stressUnit}`;

  const callouts: ResultCallout[] = [];

  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Cannot evaluate UG-32 thickness",
      body: c.invalidReason,
    });
  } else if (c.statusLevel === "warn") {
    callouts.push({
      tone: "warn",
      title: "High P/SE ratio",
      body: "Design pressure / (S·E) exceeds the 0.385 thin-wall screen. Confirm thick-wall or Appendix-1 rules before procurement.",
    });
  } else {
    callouts.push({
      tone: "warn",
      title: "Internal pressure UG-32 only",
      body: "Concave-side internal pressure per ASME VIII-1 UG-32. Excludes UG-28 external/vacuum, UG-22 wind/seismic/nozzle loads, and local stresses — complete a stamped vessel calculation for fabrication.",
    });
  }

  if (!c.invalid) {
    callouts.push({
      tone: "info",
      title: "Head geometry thickness trend",
      body: "Same P/D/S/E: torispherical (6% knuckle) is thicker than 2:1 ellipsoidal; hemispherical is the thinnest.",
    });
  }

  // Lean screen rows (≤4). Volume/weight stay in export only.
  const rows: ResultRow[] = [
    {
      label: "Allowable stress (S at T)",
      value: sLabel,
      highlight: "S",
      emphasis: true,
    },
    {
      label: "Joint efficiency (E)",
      value: c.E.toFixed(2),
    },
    {
      label: "MAWP (from t_req)",
      value: mawpLabel,
      emphasis: true,
    },
    {
      label: "Minimum required thickness (t_req)",
      value: tReqLabel,
      highlight: "t",
    },
  ];

  const exportRows: ResultRow[] = [
    { label: "Head type", value: `${headLabel} · ${c.ugRef}` },
    { label: "Material", value: material.label },
    {
      label: "Inside diameter (D)",
      value: `${formatHeadLength(c.D, c.unitSystem)} ${unit}`,
    },
    {
      label: "Design pressure (P)",
      value: `${formatHeadPressure(c.P, c.unitSystem)} ${pressureUnit}`,
    },
    {
      label: "Allowable stress (S)",
      value: sLabel,
    },
    { label: "Joint efficiency (E)", value: c.E.toFixed(2) },
    {
      label: "Corrosion allowance (C.A.)",
      value: `${formatHeadLength(c.CA, c.unitSystem)} ${unit}`,
    },
    ...(c.headType === "conical"
      ? [
          {
            label: "Half-apex angle (α)",
            value: `${c.alphaDeg.toFixed(1)} °`,
          },
        ]
      : []),
    {
      label: "Minimum required thickness (t_req)",
      value: tReqLabel,
    },
    {
      label: "Nominal design thickness (t_nom = t_req + C.A.)",
      value: tNomLabel,
    },
    {
      label: "MAWP (from t_req)",
      value: mawpLabel,
    },
    {
      label: "Head internal volume (ref.)",
      value: c.invalid
        ? "—"
        : `${volumeDisplay.toFixed(c.unitSystem === "imperial" ? 2 : 3)} ${volUnit}`,
    },
    {
      label: "Estimated head weight (ref.)",
      value: c.invalid
        ? "—"
        : `${weightDisplay.toFixed(c.unitSystem === "imperial" ? 0 : 1)} ${massUnit}`,
    },
  ];

  return {
    heroLabel: "Required Thickness with CA (t_nom)",
    heroValue: tNomLabel,
    heroStatus: c.invalid
      ? c.invalidReason ?? "Check inputs"
      : `${c.statusLabel} · ${c.ugRef}`,
    heroStatusLevel: c.invalid ? "fail" : c.statusLevel,
    heroBadges: c.invalid
      ? undefined
      : [
          { label: "t_req", value: tReqLabel },
          { label: "MAWP", value: mawpLabel },
        ],
    summary: [
      {
        label: "UG-32 status",
        value: c.invalid ? "FAIL" : c.statusLabel,
      },
      {
        label: "MAWP",
        value: mawpLabel,
      },
      {
        label: "t_req",
        value: tReqLabel,
      },
      {
        label: "S",
        value: sLabel,
      },
    ],
    summaryStatus: {
      label: c.invalid
        ? "FAIL — invalid UG-32 inputs"
        : c.statusLevel === "warn"
          ? "REVIEW — check P/SE applicability"
          : "PASS — UG-32 internal pressure screen",
      level: c.invalid ? "fail" : c.statusLevel,
    },
    rows,
    exportRows,
    callouts,
  };
}

/** Convenience: metric MPa → psi for tests / SEO. */
export function mpaToPsi(mpa: number): number {
  return mpa * MPA_TO_PSI;
}

export function psiToMpa(psi: number): number {
  return psi / MPA_TO_PSI;
}
