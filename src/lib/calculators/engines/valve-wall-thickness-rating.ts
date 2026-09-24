/**
 * ASME B16.34 Valve Body Minimum Wall Thickness & Standard Class P-T Rating.
 *
 * Wall (Mandatory Appendix VI, US customary basis → SI display):
 *   t_m = 1.5 · [P_c · d / (2S − 1.2 P_c)] + A
 *   S = 7000 psi, A = 0.10 in (2.54 mm), P_c = class designation (psi)
 *
 * Table 3 check: discrete App. VI values vs inside diameter (same equation basis).
 * P-T: Standard Class Table 2 (Groups 1.1 / 2.2 ≡ B16.5 Phase-1 extract).
 */

import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  ambientRatingBar,
  appendixViConstants,
  B1634_CLASS_OPTIONS,
  B1634_MATERIAL_OPTIONS,
  B1634_NPS_OPTIONS,
  classPcPsi,
  getRatingCurve,
  interpolatePressureBar,
  interpolateTable3Mm,
  materialMeta,
  resolveGroup,
  type B1634ClassId,
  type B1634MaterialId,
} from "@/lib/calculators/data/asmeB1634ValveRatings";

export type ValveWallThicknessRatingInputs = {
  unitSystem: UnitSystem;
  /** NPS as string, e.g. "4". */
  nps: string;
  pressureClass: B1634ClassId;
  /** Inside / port diameter — mm (metric) or in (imperial). */
  insideDiameter: number;
  /** Design temperature — °C or °F. */
  designTemperature: number;
  /** Design / operating pressure — bar or psi. */
  workingPressure: number;
  materialId: B1634MaterialId;
};

export const DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS: ValveWallThicknessRatingInputs =
  {
    unitSystem: "metric",
    nps: "4",
    pressureClass: "300",
    insideDiameter: 102,
    designTemperature: 200,
    workingPressure: 35,
    materialId: "group-1.1-A105-WCB",
  };

export const DEFAULT_VALVE_WALL_THICKNESS_RATING_INPUTS_IMPERIAL: ValveWallThicknessRatingInputs =
  {
    unitSystem: "imperial",
    nps: "3",
    pressureClass: "150",
    insideDiameter: 3,
    designTemperature: 100,
    workingPressure: 200,
    materialId: "group-1.1-A105-WCB",
  };

const MM_PER_IN = 25.4;
const BAR_TO_PSI = 14.503773773;
const PSI_TO_BAR = 1 / BAR_TO_PSI;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, finite(value)));
}

export function celsiusToFahrenheit(tC: number): number {
  return tC * 1.8 + 32;
}

export function fahrenheitToCelsius(tF: number): number {
  return (tF - 32) / 1.8;
}

export function diameterToMm(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? finite(value) * MM_PER_IN : finite(value);
}

export function pressureToBar(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? finite(value) * PSI_TO_BAR : finite(value);
}

export function designTempToCelsius(
  value: number,
  unitSystem: UnitSystem,
): number {
  return unitSystem === "imperial" ? fahrenheitToCelsius(value) : value;
}

/**
 * Appendix VI wall thickness in mm (always computed in US customary internals).
 */
export function appendixViWallMm(
  classId: B1634ClassId,
  dMm: number,
): number {
  const { S_psi, A_in } = appendixViConstants();
  const Pc = classPcPsi(classId);
  const dIn = Math.max(dMm, 1e-9) / MM_PER_IN;
  const denom = 2 * S_psi - 1.2 * Pc;
  if (denom <= 0) return Number.NaN;
  const tmIn = 1.5 * ((Pc * dIn) / denom) + A_in;
  return tmIn * MM_PER_IN;
}

export type ValveWallThicknessDetail = {
  dMm: number;
  tC: number;
  pDesignBar: number;
  pcPsi: number;
  tmEqMm: number;
  tmTable3Mm: number;
  tmGoverningMm: number;
  pMaxBar: number | null;
  pAmbientBar: number | null;
  pHydroBar: number | null;
  ratingAvailable: boolean;
  ratingProxy: boolean;
  ratingSource: string;
  materialLabel: string;
  groupId: string;
  groupLabel: string;
  outOfTempRange: boolean;
  tMin: number;
  tMax: number;
  passPressure: boolean | null;
  unity: number | null;
  curve: { tC: number; pBar: number }[] | null;
};

export function computeValveWallThicknessRating(
  inputs: ValveWallThicknessRatingInputs,
): ValveWallThicknessDetail {
  const unitSystem = inputs.unitSystem === "imperial" ? "imperial" : "metric";
  const classId = inputs.pressureClass;
  const mat = materialMeta(inputs.materialId);
  const group = resolveGroup(mat.groupId);

  const dMm = clamp(diameterToMm(inputs.insideDiameter, unitSystem), 10, 900);
  const tC = clamp(designTempToCelsius(inputs.designTemperature, unitSystem), -29, 650);
  const pDesignBar = clamp(pressureToBar(inputs.workingPressure, unitSystem), 0.1, 450);

  const tmEqMm = appendixViWallMm(classId, dMm);
  const tmTable3Raw = interpolateTable3Mm(classId, dMm);
  const tmTable3Mm =
    tmTable3Raw != null && Number.isFinite(tmTable3Raw) ? tmTable3Raw : tmEqMm;
  const tmGoverningMm = Math.max(tmEqMm, tmTable3Mm);

  const curve = getRatingCurve(mat.groupId, classId);
  const ratingAvailable = curve != null && curve.length > 0;
  const ratingProxy = group.ratingSource === "proxy-1.1";

  let pMaxBar: number | null = null;
  let outOfTempRange = false;
  let tMin = 0;
  let tMax = 0;
  if (curve) {
    const interp = interpolatePressureBar(curve, tC);
    pMaxBar = interp.pBar;
    outOfTempRange = interp.clamped;
    tMin = interp.tMin;
    tMax = interp.tMax;
  }

  const pAmbientBar = ambientRatingBar(mat.groupId, classId);
  const pHydroBar =
    pAmbientBar != null ? 1.5 * pAmbientBar : null;

  const passPressure =
    pMaxBar != null ? pDesignBar <= pMaxBar + 1e-9 : null;
  const unity =
    pMaxBar != null && pMaxBar > 0 ? pDesignBar / pMaxBar : null;

  return {
    dMm,
    tC,
    pDesignBar,
    pcPsi: classPcPsi(classId),
    tmEqMm,
    tmTable3Mm,
    tmGoverningMm,
    pMaxBar,
    pAmbientBar,
    pHydroBar,
    ratingAvailable,
    ratingProxy,
    ratingSource: group.ratingSource,
    materialLabel: mat.label,
    groupId: mat.groupId,
    groupLabel: group.label,
    outOfTempRange,
    tMin,
    tMax,
    passPressure,
    unity,
    curve,
  };
}

function fmt(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 100) return value.toFixed(Math.min(digits, 1));
  if (abs >= 10) return value.toFixed(digits);
  return value.toFixed(Math.max(digits, 1));
}

export function calculateValveWallThicknessRating(
  inputs: ValveWallThicknessRatingInputs,
): CalculatorOutput {
  const unitSystem = inputs.unitSystem === "imperial" ? "imperial" : "metric";
  const d = computeValveWallThicknessRating(inputs);
  const imperial = unitSystem === "imperial";

  const tmDisp = imperial ? d.tmGoverningMm / MM_PER_IN : d.tmGoverningMm;
  const tmEqDisp = imperial ? d.tmEqMm / MM_PER_IN : d.tmEqMm;
  const tmT3Disp = imperial ? d.tmTable3Mm / MM_PER_IN : d.tmTable3Mm;
  const tUnit = imperial ? "in" : "mm";
  const tmDigits = imperial ? 3 : 2;

  const pMaxDisp =
    d.pMaxBar == null
      ? null
      : imperial
        ? d.pMaxBar * BAR_TO_PSI
        : d.pMaxBar;
  const pDesDisp = imperial ? d.pDesignBar * BAR_TO_PSI : d.pDesignBar;
  const pHydroDisp =
    d.pHydroBar == null
      ? null
      : imperial
        ? d.pHydroBar * BAR_TO_PSI
        : d.pHydroBar;
  const pUnit = imperial ? "psi" : "bar";

  const dDisp = imperial ? d.dMm / MM_PER_IN : d.dMm;
  const dUnit = imperial ? "in" : "mm";
  const tDisp = imperial ? celsiusToFahrenheit(d.tC) : d.tC;
  const tUnitDisp = imperial ? "°F" : "°C";

  let statusLevel: StatusLevel = "pass";
  let statusLabel = "Within Standard Class P-T rating";
  if (!d.ratingAvailable) {
    statusLevel = "warn";
    statusLabel = "Wall screen OK · P-T table unavailable";
  } else if (d.passPressure === false) {
    statusLevel = "fail";
    statusLabel = "Overpressure vs Standard Class P-T";
  } else if (d.outOfTempRange) {
    statusLevel = "warn";
    statusLabel = "Temperature outside tabulated P-T range";
  } else if (d.ratingProxy) {
    statusLevel = "pass";
    statusLabel = "Pass (Group 1.2 proxy P-T)";
  }

  const heroTm = `${fmt(tmDisp, tmDigits)} ${tUnit}`;
  const heroPmax =
    pMaxDisp == null ? "P-T N/A" : `${fmt(pMaxDisp, imperial ? 0 : 1)} ${pUnit}`;

  const callouts: CalculatorOutput["callouts"] = [
    {
      tone: "warn",
      title: "ASME B16.34 Standard Class screen",
      body: "Screens Standard Class body minimum wall (Table 3 / Appendix VI) and Standard Class P-T (Table 2). End-neck and casting/forging allowance are OEM additions beyond this pure t_m. Special Class and Section 8 NDE forged valves are out of scope.",
    },
  ];
  if (d.ratingProxy) {
    callouts.push({
      tone: "info",
      title: "Group 1.2 P-T proxy",
      body: "Phase-1 uses Group 1.1 Standard Class ratings as a conservative screen for A216 WCC. Confirm published Table 2-1.2 for purchase documents.",
    });
  } else if (!d.ratingAvailable) {
    callouts.push({
      tone: "info",
      title: "Group 1.9 P-T not tabulated",
      body: "Appendix VI wall thickness still applies. Load ASME B16.34 Table 2-1.9 (A217 WC6) for allowable pressure at temperature.",
    });
  }

  const hydroBadge =
    pHydroDisp == null
      ? "—"
      : `${fmt(pHydroDisp, imperial ? 0 : 1)} ${pUnit}`;
  const pAmbDisp =
    d.pAmbientBar == null
      ? null
      : imperial
        ? d.pAmbientBar * BAR_TO_PSI
        : d.pAmbientBar;
  const pcLabel = `${fmt(d.pcPsi, 0)} psi`;

  return {
    heroLabel: "Minimum body wall t_m",
    heroValue: heroTm,
    heroStatus: statusLabel,
    heroStatusLevel: statusLevel,
    heroBadges: [
      { label: "p_max @ T", value: heroPmax },
      { label: "P_c", value: pcLabel },
    ],
    summary: [
      {
        label: "P-T check",
        value:
          d.passPressure == null
            ? "—"
            : d.passPressure
              ? "Pass"
              : "Overpressure",
      },
      {
        label: "p_amb @ 38 °C",
        value:
          pAmbDisp == null
            ? "—"
            : `${fmt(pAmbDisp, imperial ? 0 : 1)} ${pUnit}`,
      },
      {
        label: "Hydro (1.5× p_amb)",
        value: hydroBadge,
      },
    ],
    summaryStatus: {
      label: statusLabel,
      level: statusLevel === "fail" ? "fail" : statusLevel === "warn" ? "warn" : "pass",
    },
    rows: [
      {
        section: "Wall thickness",
        label: "t_m (App. VI / Table 3)",
        value: `${fmt(tmDisp, tmDigits)} ${tUnit} · P_c ${pcLabel}`,
        emphasis: true,
      },
      {
        section: "P-T rating",
        label: "p_max @ T · P_design",
        value:
          pMaxDisp == null
            ? `N/A · ${fmt(pDesDisp, imperial ? 0 : 1)} ${pUnit} @ ${fmt(tDisp, 0)} ${tUnitDisp}`
            : `${fmt(pMaxDisp, imperial ? 0 : 1)} ${pUnit} · ${fmt(pDesDisp, imperial ? 0 : 1)} ${pUnit} @ ${fmt(tDisp, 0)} ${tUnitDisp}`,
        emphasis: true,
        warn: d.passPressure === false,
      },
    ],
    callouts,
    exportRows: [
      { label: "Unit system", value: unitSystem },
      { label: "NPS", value: inputs.nps },
      { label: "Pressure class", value: inputs.pressureClass },
      {
        label: `Inside diameter (${dUnit})`,
        value: fmt(dDisp, imperial ? 3 : 2),
      },
      {
        label: `Design temperature (${tUnitDisp})`,
        value: fmt(tDisp, 1),
      },
      {
        label: `Design pressure (${pUnit})`,
        value: fmt(pDesDisp, imperial ? 1 : 2),
      },
      { label: "Material", value: d.materialLabel },
      { label: "Group id", value: d.groupId },
      { label: "P_c (psi)", value: fmt(d.pcPsi, 0) },
      {
        label: `t_m Appendix VI (${tUnit})`,
        value: fmt(tmEqDisp, tmDigits),
      },
      {
        label: `t_m Table 3 check (${tUnit})`,
        value: fmt(tmT3Disp, tmDigits),
      },
      {
        label: `t_m governing (${tUnit})`,
        value: fmt(tmDisp, tmDigits),
      },
      {
        label: `p_max (${pUnit})`,
        value: pMaxDisp == null ? "N/A" : fmt(pMaxDisp, imperial ? 1 : 2),
      },
      {
        label: `p_amb @ 38 °C (${pUnit})`,
        value:
          d.pAmbientBar == null
            ? "N/A"
            : fmt(
                imperial ? d.pAmbientBar * BAR_TO_PSI : d.pAmbientBar,
                imperial ? 1 : 2,
              ),
      },
      {
        label: `p_hydro (${pUnit})`,
        value: pHydroDisp == null ? "N/A" : fmt(pHydroDisp, imperial ? 1 : 2),
      },
      {
        label: "P-T unity P_design/p_max",
        value: d.unity == null ? "N/A" : fmt(d.unity, 3),
      },
      { label: "P-T status", value: statusLabel },
    ],
  };
}

export {
  B1634_CLASS_OPTIONS,
  B1634_MATERIAL_OPTIONS,
  B1634_NPS_OPTIONS,
};
export type { B1634ClassId, B1634MaterialId };
