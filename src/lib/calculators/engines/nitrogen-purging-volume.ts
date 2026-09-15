/**
 * Nitrogen Purging & Inerting Volume — NFPA 69 Ch.7 screening
 * (dilution / pressure-cycle / vacuum-cycle) + API RP 2016 / CGA G-8.1 practice.
 *
 * Dilution (sweep):
 *   V_N2 = V_sys · ln((C0 − C_in)/(Ct − C_in)) / K
 *   t = V_N2 / Q
 *
 * Pressure-cycle (absolute pressures):
 *   C_n = C0 · (P_low / P_high)^n
 *   n = ceil( ln(Ct/C0) / ln(P_low/P_high) )
 *   V_N2 = n · V_sys · (P_high,g − P_low,g) / P_std
 *   with P_low,g = 0 (vent to atmosphere) for standard pressurize–vent cycles.
 *
 * Vacuum-cycle:
 *   C_n = C0 · (P_vac / P_atm)^n
 *   V_N2 = n · V_sys · (P_atm − P_vac) / P_std
 *
 * Geometry: piping uses ASME B36 Sch 40 ID; vessel = cylinder + 2:1 SE head
 * equivalent length (L + 0.5·Di); custom uses entered volume.
 *
 * Screening only — continuous O₂ analyzer monitoring required (NFPA 69).
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
} from "@/lib/data/loaders";

export type NitrogenGeometryType = "piping" | "vessel" | "custom-volume";
export type NitrogenPurgeMethod =
  | "dilution-sweep"
  | "pressure-cycle"
  | "vacuum-cycle";

export type NitrogenPurgingVolumeInputs = {
  unitSystem: UnitSystem;
  geometryType: NitrogenGeometryType;
  /** NPS token without unit, e.g. "12". */
  pipeNps: string;
  /** ASME B36 schedule (default 40). */
  pipeSchedule: string;
  /** Piping length — m (metric) or ft (imperial). */
  pipeLength: number;
  /** Vessel inside diameter — mm or in. */
  vesselDiameter: number;
  /** Vessel shell length / height — mm or in. */
  vesselLength: number;
  /** Custom system volume — m³ or ft³. */
  customVolume: number;
  purgeMethod: NitrogenPurgeMethod;
  /** Initial O₂ % (typically 20.9–21). */
  initialO2: number;
  /** Target maximum O₂ %. */
  targetO2: number;
  /** Supply N₂ O₂ impurity % (usually 0). */
  supplyO2Impurity: number;
  /** Purge flow — Nm³/h (metric) or SCFM (imperial). */
  purgeFlowRate: number;
  /** Mixing efficiency K ∈ [0.25, 1]. */
  mixingEfficiency: number;
  /**
   * Pressure-cycle: high pressure gauge — bar(g) / psig.
   * Vacuum-cycle: absolute vacuum floor — bar(a) / psia.
   */
  cycleHighPressure: number;
};

export const NITROGEN_GEOMETRY_OPTIONS: {
  value: NitrogenGeometryType;
  label: string;
}[] = [
  { value: "piping", label: "Piping run (NPS × L)" },
  { value: "vessel", label: "Vessel (Di × L + 2:1 SE)" },
  { value: "custom-volume", label: "Custom volume" },
];

export const NITROGEN_PURGE_METHOD_OPTIONS: {
  value: NitrogenPurgeMethod;
  label: string;
  shortLabel: string;
}[] = [
  {
    value: "dilution-sweep",
    label: "Dilution / sweep purge",
    shortLabel: "Dilution",
  },
  {
    value: "pressure-cycle",
    label: "Pressure-cycle purge",
    shortLabel: "Pressure cycle",
  },
  {
    value: "vacuum-cycle",
    label: "Vacuum-cycle purge",
    shortLabel: "Vacuum cycle",
  },
];

/** NPS 2–36 screening set (matches hydro / B36 common sizes). */
export const NITROGEN_NPS_OPTIONS: { value: string; label: string }[] = [
  { value: "2", label: 'NPS 2"' },
  { value: "3", label: 'NPS 3"' },
  { value: "4", label: 'NPS 4"' },
  { value: "6", label: 'NPS 6"' },
  { value: "8", label: 'NPS 8"' },
  { value: "10", label: 'NPS 10"' },
  { value: "12", label: 'NPS 12"' },
  { value: "14", label: 'NPS 14"' },
  { value: "16", label: 'NPS 16"' },
  { value: "18", label: 'NPS 18"' },
  { value: "20", label: 'NPS 20"' },
  { value: "24", label: 'NPS 24"' },
  { value: "30", label: 'NPS 30"' },
  { value: "36", label: 'NPS 36"' },
];

export const DEFAULT_NITROGEN_PURGING_VOLUME_INPUTS: NitrogenPurgingVolumeInputs =
  {
    unitSystem: "metric",
    geometryType: "piping",
    pipeNps: "12",
    pipeSchedule: "40",
    pipeLength: 100,
    vesselDiameter: 2000,
    vesselLength: 6000,
    customVolume: 10,
    purgeMethod: "dilution-sweep",
    initialO2: 21,
    targetO2: 5,
    supplyO2Impurity: 0,
    purgeFlowRate: 50,
    mixingEfficiency: 0.75,
    cycleHighPressure: 3,
  };

/** Ideal-gas Nm³ in a 50 L cylinder filled to 200 bar(g) ≈ 200 bar ΔP to 1 bar. */
export const CYLINDER_NM3 = 10;
/** Screening tube-trailer gas inventory (Nm³). */
export const TUBE_TRAILER_NM3 = 2000;
/** Liquid N₂ → gas expansion ≈ 682 Nm³ per m³ liquid ≈ 0.682 Nm³/L. */
export const LN2_NM3_PER_L = 0.682;
/** Procurement contingency on computed N₂ volume. */
export const N2_SAFETY_MARGIN = 1.2;

const M3_TO_FT3 = 35.3146667;
const FT3_TO_M3 = 1 / M3_TO_FT3;
/** 1 Nm³ ≈ 35.3147 SCF (same as ft³ at standard conditions). */
const NM3_TO_SCF = M3_TO_FT3;
const BAR_ABS_ATM = 1.01325;
const PSI_ABS_ATM = 14.6959;
/** Spec pSEO metric pressure-cycle uses P_std = 1.0 bar. */
const P_STD_BAR = 1.0;
/** Matches common field screening / pSEO (42-gal barrel style 14.7 psia). */
const P_STD_PSI = 14.7;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function finite(n: number, fallback: number) {
  return Number.isFinite(n) ? n : fallback;
}

function normalizeNps(raw: string): string {
  const cleaned = raw.replace(/^NPS\s*/i, "").replace(/"/g, "").trim();
  return cleaned || "12";
}

export function resolvePipeInsideDiameterMm(
  nps: string,
  schedule: string,
): number | null {
  const token = normalizeNps(nps);
  const sch =
    schedule?.trim() ||
    defaultScheduleForNps(token) ||
    "40";
  const entry = getPipeScheduleEntry(token, sch);
  if (entry?.row?.insideDiameterMm) return entry.row.insideDiameterMm;
  const fallback = getPipeScheduleEntry(token, "40");
  return fallback?.row?.insideDiameterMm ?? null;
}

/** System internal volume in m³. */
export function resolveSystemVolumeM3(
  inputs: NitrogenPurgingVolumeInputs,
): number {
  const us = inputs.unitSystem;
  if (inputs.geometryType === "custom-volume") {
    const v = Math.max(0, finite(inputs.customVolume, 0));
    return us === "imperial" ? v * FT3_TO_M3 : v;
  }
  if (inputs.geometryType === "vessel") {
    const diM =
      us === "imperial"
        ? (finite(inputs.vesselDiameter, 80) * 25.4) / 1000
        : finite(inputs.vesselDiameter, 2000) / 1000;
    const lengthM =
      us === "imperial"
        ? (finite(inputs.vesselLength, 240) * 25.4) / 1000
        : finite(inputs.vesselLength, 6000) / 1000;
    if (diM <= 0 || lengthM < 0) return 0;
    // Cylinder + two 2:1 SE head depths as equivalent length (0.25·Di each).
    const leff = lengthM + 0.5 * diM;
    return Math.PI * (diM / 2) * (diM / 2) * leff;
  }
  // Piping
  const idMm = resolvePipeInsideDiameterMm(
    inputs.pipeNps,
    inputs.pipeSchedule || "40",
  );
  if (idMm == null || idMm <= 0) return 0;
  const idM = idMm / 1000;
  const lengthM =
    us === "imperial"
      ? finite(inputs.pipeLength, 0) * 0.3048
      : finite(inputs.pipeLength, 0);
  if (lengthM <= 0) return 0;
  return Math.PI * (idM / 2) * (idM / 2) * lengthM;
}

export function requiredPressureCycles(
  c0: number,
  ct: number,
  pLowAbs: number,
  pHighAbs: number,
): number {
  if (!(c0 > 0 && ct > 0 && ct < c0 && pLowAbs > 0 && pHighAbs > pLowAbs)) {
    return 0;
  }
  const ratio = pLowAbs / pHighAbs;
  if (!(ratio > 0 && ratio < 1)) return 0;
  const n = Math.log(ct / c0) / Math.log(ratio);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.ceil(n - 1e-12));
}

export type NitrogenPurgingComputed = {
  vSysM3: number;
  vN2Nm3: number;
  vN2WithMarginNm3: number;
  purgeTimeHr: number | null;
  cycles: number | null;
  finalO2Pct: number | null;
  idMm: number | null;
  invalid: boolean;
  invalidReason?: string;
};

export function computeNitrogenPurgingVolume(
  inputs: NitrogenPurgingVolumeInputs,
): NitrogenPurgingComputed {
  const vSysM3 = resolveSystemVolumeM3(inputs);
  const c0 = clamp(finite(inputs.initialO2, 21), 0.01, 21);
  const ct = clamp(finite(inputs.targetO2, 5), 0.01, Math.min(20, c0 - 0.01));
  const cinHi = Math.max(0, Math.min(c0, ct) - 1e-6);
  const cin = clamp(finite(inputs.supplyO2Impurity, 0), 0, cinHi);
  const k = clamp(finite(inputs.mixingEfficiency, 0.75), 0.25, 1);
  const idMm =
    inputs.geometryType === "piping"
      ? resolvePipeInsideDiameterMm(inputs.pipeNps, inputs.pipeSchedule || "40")
      : null;

  if (!(vSysM3 > 0)) {
    return {
      vSysM3: 0,
      vN2Nm3: 0,
      vN2WithMarginNm3: 0,
      purgeTimeHr: null,
      cycles: null,
      finalO2Pct: null,
      idMm,
      invalid: true,
      invalidReason: "Enter a positive system volume / geometry",
    };
  }
  if (!(ct < c0)) {
    return {
      vSysM3,
      vN2Nm3: 0,
      vN2WithMarginNm3: 0,
      purgeTimeHr: null,
      cycles: null,
      finalO2Pct: null,
      idMm,
      invalid: true,
      invalidReason: "Target O₂ must be below initial O₂",
    };
  }

  if (inputs.purgeMethod === "dilution-sweep") {
    const num = c0 - cin;
    const den = ct - cin;
    if (!(num > 0 && den > 0)) {
      return {
        vSysM3,
        vN2Nm3: 0,
        vN2WithMarginNm3: 0,
        purgeTimeHr: null,
        cycles: null,
        finalO2Pct: null,
        idMm,
        invalid: true,
        invalidReason: "O₂ concentrations invalid vs supply impurity",
      };
    }
    const vN2Nm3 = (vSysM3 * Math.log(num / den)) / k;
    const q =
      inputs.unitSystem === "imperial"
        ? // SCFM → Nm³/h: SCFM * 60 / 35.3147
          (finite(inputs.purgeFlowRate, 30) * 60) / NM3_TO_SCF
        : finite(inputs.purgeFlowRate, 50);
    const purgeTimeHr = q > 0 ? vN2Nm3 / q : null;
    return {
      vSysM3,
      vN2Nm3,
      vN2WithMarginNm3: vN2Nm3 * N2_SAFETY_MARGIN,
      purgeTimeHr,
      cycles: null,
      finalO2Pct: ct,
      idMm,
      invalid: !(vN2Nm3 > 0 && Number.isFinite(vN2Nm3)),
    };
  }

  if (inputs.purgeMethod === "pressure-cycle") {
    const pHighG = Math.max(0.01, finite(inputs.cycleHighPressure, 3));
    const pAtm = inputs.unitSystem === "imperial" ? PSI_ABS_ATM : BAR_ABS_ATM;
    const pHighAbs =
      inputs.unitSystem === "imperial" ? pHighG + PSI_ABS_ATM : pHighG + BAR_ABS_ATM;
    const pLowAbs = pAtm;
    const n = requiredPressureCycles(c0, ct, pLowAbs, pHighAbs);
    if (n <= 0) {
      return {
        vSysM3,
        vN2Nm3: 0,
        vN2WithMarginNm3: 0,
        purgeTimeHr: null,
        cycles: null,
        finalO2Pct: null,
        idMm,
        invalid: true,
        invalidReason: "Cannot reach target O₂ with this pressure ratio",
      };
    }
    const pStd = inputs.unitSystem === "imperial" ? P_STD_PSI : P_STD_BAR;
    // Gauge delta from atmosphere vent (P_low,g = 0).
    const vN2Nm3 =
      inputs.unitSystem === "imperial"
        ? (n * (vSysM3 * M3_TO_FT3) * pHighG) / pStd / NM3_TO_SCF
        : (n * vSysM3 * pHighG) / pStd;
    const finalO2 = c0 * Math.pow(pLowAbs / pHighAbs, n);
    return {
      vSysM3,
      vN2Nm3,
      vN2WithMarginNm3: vN2Nm3 * N2_SAFETY_MARGIN,
      purgeTimeHr: null,
      cycles: n,
      finalO2Pct: finalO2,
      idMm,
      invalid: !(vN2Nm3 > 0),
    };
  }

  // Vacuum-cycle: cycleHighPressure is absolute vacuum floor (bar(a) / psia).
  // Reject gauge-like leftovers (e.g. 3 bar(g) left after switching from pressure-cycle).
  const pAtm = inputs.unitSystem === "imperial" ? PSI_ABS_ATM : BAR_ABS_ATM;
  const rawVac = finite(
    inputs.cycleHighPressure,
    inputs.unitSystem === "imperial" ? 2.9 : 0.2,
  );
  if (!(rawVac > 0 && rawVac < pAtm * 0.95)) {
    return {
      vSysM3,
      vN2Nm3: 0,
      vN2WithMarginNm3: 0,
      purgeTimeHr: null,
      cycles: null,
      finalO2Pct: null,
      idMm,
      invalid: true,
      invalidReason:
        inputs.unitSystem === "imperial"
          ? "Set vacuum floor P_vac as absolute psia (typical 1–5 psia), below atmosphere"
          : "Set vacuum floor P_vac as absolute bar(a) (typical 0.05–0.5), below atmosphere",
    };
  }
  const pVac = clamp(rawVac, 0.01, pAtm * 0.95);
  const n = requiredPressureCycles(c0, ct, pVac, pAtm);
  if (n <= 0) {
    return {
      vSysM3,
      vN2Nm3: 0,
      vN2WithMarginNm3: 0,
      purgeTimeHr: null,
      cycles: null,
      finalO2Pct: null,
      idMm,
      invalid: true,
      invalidReason: "Cannot reach target O₂ with this vacuum level",
    };
  }
  const pStd = inputs.unitSystem === "imperial" ? P_STD_PSI : P_STD_BAR;
  const delta = pAtm - pVac;
  const vN2Nm3 =
    inputs.unitSystem === "imperial"
      ? (n * (vSysM3 * M3_TO_FT3) * delta) / pStd / NM3_TO_SCF
      : (n * vSysM3 * delta) / pStd;
  const finalO2 = c0 * Math.pow(pVac / pAtm, n);
  return {
    vSysM3,
    vN2Nm3,
    vN2WithMarginNm3: vN2Nm3 * N2_SAFETY_MARGIN,
    purgeTimeHr: null,
    cycles: n,
    finalO2Pct: finalO2,
    idMm,
    invalid: !(vN2Nm3 > 0),
  };
}

function fmtVolGas(nm3: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(nm3)) return "—";
  const scf = nm3 * NM3_TO_SCF;
  if (unitSystem === "imperial") {
    return `${scf.toFixed(1)} SCF · ${nm3.toFixed(2)} Nm³`;
  }
  return `${nm3.toFixed(2)} Nm³ · ${scf.toFixed(1)} SCF`;
}

function fmtSysVol(m3: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(m3)) return "—";
  const ft3 = m3 * M3_TO_FT3;
  if (unitSystem === "imperial") {
    return `${ft3.toFixed(1)} ft³ · ${m3.toFixed(2)} m³`;
  }
  return `${m3.toFixed(2)} m³ · ${ft3.toFixed(1)} ft³`;
}

function fmtTime(hr: number | null): string {
  if (hr == null || !Number.isFinite(hr) || hr < 0) return "—";
  const minutes = hr * 60;
  if (minutes < 120) {
    return `${minutes.toFixed(1)} min · ${hr.toFixed(3)} h`;
  }
  return `${hr.toFixed(2)} h · ${minutes.toFixed(0)} min`;
}

export function calculateNitrogenPurgingVolume(
  inputs: NitrogenPurgingVolumeInputs,
): CalculatorOutput {
  const c = computeNitrogenPurgingVolume(inputs);
  const methodMeta =
    NITROGEN_PURGE_METHOD_OPTIONS.find((m) => m.value === inputs.purgeMethod) ??
    NITROGEN_PURGE_METHOD_OPTIONS[0];

  let heroStatusLevel: StatusLevel = "neutral";
  let heroStatus = c.invalidReason ?? "Enter valid purge duty";
  if (!c.invalid) {
    heroStatusLevel = "pass";
    if (c.purgeTimeHr != null) {
      heroStatus = `${(c.purgeTimeHr * 60).toFixed(1)} min purge · ≤ ${inputs.targetO2}% O₂`;
    } else if (c.cycles != null) {
      heroStatus = `${c.cycles} cycle${c.cycles === 1 ? "" : "s"} to ≤ ${inputs.targetO2}% O₂`;
    } else {
      heroStatus = `Sweep to ≤ ${inputs.targetO2}% O₂`;
    }
  }

  const cylinders = c.invalid
    ? 0
    : Math.ceil(c.vN2WithMarginNm3 / CYLINDER_NM3);
  const trailers = c.invalid
    ? 0
    : c.vN2WithMarginNm3 / TUBE_TRAILER_NM3;
  const ln2L = c.invalid ? 0 : c.vN2WithMarginNm3 / LN2_NM3_PER_L;

  const callouts: ResultCallout[] = [
    {
      tone: "warn",
      title: "NFPA 69 Inerting Safety Warning",
      body: "This calculation provides theoretical volumetric gas requirements. Continuous oxygen analyzer monitoring at outfall vents is mandatory before introducing hydrocarbons or entering confined spaces (NFPA 69 / API RP 2016).",
    },
  ];
  if (inputs.purgeMethod === "pressure-cycle") {
    callouts.push({
      tone: "warn",
      title: "Pressure Vessel Cycle Limit Notice",
      body: "Pressure-cycle inerting must never exceed the Maximum Allowable Working Pressure (MAWP) of the vessel or piping system. Confirm relief protection and written procedure before pressurizing.",
    });
  }
  if (inputs.purgeMethod === "dilution-sweep") {
    callouts.push({
      tone: "info",
      title: "Mixing Efficiency K",
      body: "K accounts for imperfect sweep mixing (NFPA 69 screening). Use K ≈ 0.25–0.5 for dead-legs / poor mixing; K ≈ 0.75–1.0 for well-ventilated runs. Confirm with O₂ readings.",
      items: [`Current K = ${inputs.mixingEfficiency.toFixed(2)}`],
    });
  }
  if (inputs.purgeMethod === "vacuum-cycle") {
    callouts.push({
      tone: "info",
      title: "Vacuum Floor Is Absolute Pressure",
      body: "P_vac is absolute (bar(a) / psia), not gauge vacuum. Typical screening hold is ~0.1–0.5 bar(a) (≈1.5–7 psia). Do not reuse pressure-cycle gauge values.",
    });
  }

  const rows: ResultRow[] = [
    {
      section: "Geometry",
      label: "Net system volume V_sys",
      value: fmtSysVol(c.vSysM3, inputs.unitSystem),
      emphasis: true,
    },
  ];

  if (inputs.geometryType === "piping" && c.idMm != null) {
    rows.push({
      section: "Geometry",
      label: `NPS ${normalizeNps(inputs.pipeNps)} Sch ${inputs.pipeSchedule || "40"} ID`,
      value: `${c.idMm.toFixed(2)} mm · ${(c.idMm / 25.4).toFixed(3)} in`,
    });
  }

  rows.push(
    {
      section: "Gas supply procurement (+20% margin)",
      label: "Standard 50 L · 200 bar cylinders",
      value: c.invalid
        ? "—"
        : `${cylinders} cylinder${cylinders === 1 ? "" : "s"}`,
      emphasis: true,
    },
    {
      section: "Gas supply procurement (+20% margin)",
      label: "Tube trailer equivalents (~2000 Nm³)",
      value: c.invalid ? "—" : `${trailers.toFixed(2)} trailer-eq`,
    },
    {
      section: "Gas supply procurement (+20% margin)",
      label: "Liquid N₂ (screening)",
      value: c.invalid
        ? "—"
        : `${ln2L.toFixed(0)} L LN₂ · ${(ln2L / 1000).toFixed(2)} m³ LN₂`,
    },
    {
      section: "Duty",
      label: "Purge method",
      value: methodMeta.label,
    },
    {
      section: "Duty",
      label: "Initial → target O₂",
      value: `${inputs.initialO2.toFixed(1)}% → ${inputs.targetO2.toFixed(2)}%`,
    },
  );

  if (inputs.purgeMethod === "dilution-sweep") {
    rows.push({
      section: "Duty",
      label: "Mixing efficiency K",
      value: inputs.mixingEfficiency.toFixed(2),
    });
  }

  if (c.cycles != null) {
    rows.push({
      section: "Duty",
      label: "Predicted residual O₂ after n cycles",
      value: c.finalO2Pct != null ? `${c.finalO2Pct.toFixed(2)} % O₂` : "—",
    });
  }

  const heroPrimary = c.invalid ? "—" : fmtVolGas(c.vN2Nm3, inputs.unitSystem);
  const heroWithTime =
    !c.invalid && c.purgeTimeHr != null
      ? `${heroPrimary} · ${(c.purgeTimeHr * 60).toFixed(1)} min`
      : heroPrimary;

  const exportRows = [
    { label: "Geometry", value: inputs.geometryType },
    { label: "Method", value: methodMeta.label },
    { label: "V_sys", value: fmtSysVol(c.vSysM3, inputs.unitSystem) },
    { label: "V_N2", value: c.invalid ? "—" : fmtVolGas(c.vN2Nm3, inputs.unitSystem) },
    {
      label: "V_N2 +20% margin",
      value: c.invalid ? "—" : fmtVolGas(c.vN2WithMarginNm3, inputs.unitSystem),
    },
    { label: "Purge time", value: fmtTime(c.purgeTimeHr) },
    {
      label: "Cycles n",
      value: c.cycles != null ? String(c.cycles) : "—",
    },
    { label: "Cylinders 50L/200bar", value: c.invalid ? "—" : String(cylinders) },
    {
      label: "Tube trailer-eq",
      value: c.invalid ? "—" : trailers.toFixed(3),
    },
    { label: "LN2 liters", value: c.invalid ? "—" : ln2L.toFixed(1) },
  ];

  return {
    heroLabel: "Required nitrogen volume",
    heroValue: heroWithTime,
    heroStatus,
    heroStatusLevel,
    heroBadges: c.invalid
      ? undefined
      : [
          {
            label: c.purgeTimeHr != null ? "Duration" : "Cycles",
            value:
              c.purgeTimeHr != null
                ? `${(c.purgeTimeHr * 60).toFixed(1)} min`
                : c.cycles != null
                  ? String(c.cycles)
                  : "—",
          },
          {
            label: "Method",
            value: methodMeta.shortLabel,
          },
          {
            label: "+20% N₂",
            value: fmtVolGas(c.vN2WithMarginNm3, inputs.unitSystem),
          },
        ],
    summary: [
      {
        label: "Net system volume V_sys",
        value: fmtSysVol(c.vSysM3, inputs.unitSystem),
      },
      {
        label: "Pressure / vacuum cycles n",
        value: c.cycles != null ? String(c.cycles) : "— (dilution)",
      },
      {
        label: "N₂ with +20% safety margin",
        value: c.invalid
          ? "—"
          : fmtVolGas(c.vN2WithMarginNm3, inputs.unitSystem),
      },
      {
        label: "Purge duration",
        value: fmtTime(c.purgeTimeHr),
      },
    ],
    summaryStatus: {
      label: heroStatus,
      level: heroStatusLevel,
    },
    rows,
    callouts,
    exportRows,
  };
}
