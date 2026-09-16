import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  getFlangeDimensionEntry,
  getGasketDimensionEntry,
  getPipeScheduleSize,
  listFlangeClassesForNps,
  listFlangeNps,
} from "@/lib/data/loaders";
import { parseInchFraction } from "@/lib/calculators/engines/bolt-wrench-lookup";
import { barToPsi, psiToBar } from "@/lib/unitConverter";

export type GasketStressTypeId =
  | "soft_rubber"
  | "compressed_fiber"
  | "spiral_wound_filled"
  | "ptfe_sheet"
  | "rtj_soft_iron";

export type FlangeGasketStressInputs = {
  unitSystem: UnitSystem;
  nps: string;
  /** Pressure class number string, e.g. "300". */
  flangeClass: string;
  gasketType: GasketStressTypeId;
  /** Operating / design pressure: psi (imperial) or bar (metric). */
  pressure: number;
  /** Target bolt tensile stress: psi (imperial) or MPa (metric). */
  targetBoltStress: number;
};

export type GasketStressStatus =
  | "OPTIMAL"
  | "UNDER_STRESSED"
  | "OVER_CRUSH_RISK";

export type FlangeGasketStressBreakdown = {
  odgMm: number;
  idgMm: number;
  agMm2: number;
  agIn2: number;
  nb: number;
  studDiameterIn: string;
  dbIn: number;
  /** Nominal shank area π/4·d² (in²) — PCC-1 field preload screening. */
  abIn2: number;
  boltStressPsi: number;
  pressurePsi: number;
  fbLbf: number;
  gIn: number;
  hLbf: number;
  sigmaInstPsi: number;
  sigmaOpPsi: number;
  m: number;
  yPsi: number;
  mPPsi: number;
  sigmaMinSealPsi: number;
  sigmaMaxAllowPsi: number;
  sealingMargin: number;
  /** max(y, σ_g,min_seal) used for assembly seating check. */
  seatingRequiredPsi: number;
  status: GasketStressStatus;
  gasketLabel: string;
  geometryNote: string;
};

export const GASKET_STRESS_TYPE_OPTIONS: {
  value: GasketStressTypeId;
  label: string;
  /** ASME VIII-1 App. 2 Table 2-5.1 style m factor. */
  m: number;
  /** Seating stress y (psi). */
  yPsi: number;
  /** PCC-1 App. O style min seal stress (psi). */
  sigmaMinSealPsi: number;
  /** PCC-1 App. O style max allowable gasket stress (psi). */
  sigmaMaxAllowPsi: number;
}[] = [
  {
    value: "soft_rubber",
    label: "Soft rubber / elastomer",
    m: 0.5,
    yPsi: 0,
    sigmaMinSealPsi: 200,
    sigmaMaxAllowPsi: 800,
  },
  {
    value: "compressed_fiber",
    label: "Compressed fiber (CAF / NA)",
    m: 2.0,
    yPsi: 1600,
    sigmaMinSealPsi: 5000,
    sigmaMaxAllowPsi: 15000,
  },
  {
    value: "spiral_wound_filled",
    label: "Spiral wound filled (SS / graphite)",
    m: 3.0,
    yPsi: 10000,
    sigmaMinSealPsi: 5000,
    sigmaMaxAllowPsi: 25000,
  },
  {
    value: "ptfe_sheet",
    label: "PTFE sheet",
    m: 2.0,
    yPsi: 1600,
    sigmaMinSealPsi: 2500,
    sigmaMaxAllowPsi: 10000,
  },
  {
    value: "rtj_soft_iron",
    label: "RTJ soft iron",
    m: 5.5,
    yPsi: 18000,
    sigmaMinSealPsi: 18000,
    sigmaMaxAllowPsi: 45000,
  },
];

export const FLANGE_GASKET_STRESS_CLASSES = [
  "150",
  "300",
  "400",
  "600",
  "900",
  "1500",
  "2500",
] as const;

export const DEFAULT_FLANGE_GASKET_STRESS_INPUTS: FlangeGasketStressInputs = {
  unitSystem: "imperial",
  nps: "2",
  flangeClass: "300",
  gasketType: "spiral_wound_filled",
  pressure: 740,
  targetBoltStress: 45000,
};

const PSI_PER_KSI = 1000;
const MPA_PER_PSI = 0.006894757;
const LBF_PER_KN = 224.808943;
const MM2_PER_IN2 = 645.16;

export function resolveGasketStressType(id: GasketStressTypeId) {
  return (
    GASKET_STRESS_TYPE_OPTIONS.find((item) => item.value === id) ??
    GASKET_STRESS_TYPE_OPTIONS[2]!
  );
}

export function listFlangeGasketStressNps(): string[] {
  return listFlangeNps().map((size) => size.nps);
}

export function listFlangeGasketStressClassesForNps(nps: string): string[] {
  const available = new Set(
    listFlangeClassesForNps(nps).map((row) => row.class),
  );
  return FLANGE_GASKET_STRESS_CLASSES.filter((cls) => available.has(cls));
}

/** Nominal bolt shank area A_b = π/4 · d_b² (in²). */
export function nominalBoltAreaIn2(studDiameterIn: string): number | null {
  const d = parseInchFraction(studDiameterIn);
  if (d == null || d <= 0) return null;
  return (Math.PI / 4) * d * d;
}

function pipeOdMm(nps: string): number | null {
  const size = getPipeScheduleSize(nps);
  return size?.outsideDiameterMm ?? null;
}

/**
 * Resolve gasket contact OD/ID (mm).
 * Spiral: sealing element OD × inner-ring OD (B16.20 winding band).
 * RTJ: pitch diameter ± ring width/2 annular proxy.
 * Sheet types: raised-face OD × pipe OD (B16.21 RF seating proxy).
 */
export function resolveGasketGeometryMm(
  gasketType: GasketStressTypeId,
  nps: string,
  flangeClass: string,
): { odMm: number; idMm: number; note: string } | null {
  const flange = getFlangeDimensionEntry(nps, flangeClass);
  if (!flange) return null;

  if (gasketType === "spiral_wound_filled") {
    const entry = getGasketDimensionEntry("spiral_wound", nps, flangeClass);
    if (!entry || !("sealingElementOdMm" in entry.rating)) return null;
    const rating = entry.rating as {
      sealingElementOdMm: number;
      innerRingOdMm: number;
    };
    return {
      odMm: rating.sealingElementOdMm,
      idMm: rating.innerRingOdMm,
      note: "B16.20 spiral sealing element OD × inner-ring OD",
    };
  }

  if (gasketType === "rtj_soft_iron") {
    const entry = getGasketDimensionEntry("rtj_ring", nps, flangeClass);
    if (!entry || !("pitchDiameterMm" in entry.rating)) {
      // Fall back to RF annulus when RTJ row missing for this class.
      const od = flange.rating.raisedFaceDiameterMm;
      const id = pipeOdMm(nps);
      if (!id || od <= id) return null;
      return {
        odMm: od,
        idMm: id,
        note: "RTJ row unavailable — RF OD × pipe OD proxy",
      };
    }
    const rating = entry.rating as {
      pitchDiameterMm: number;
      ringWidthMm: number;
    };
    const idMm = rating.pitchDiameterMm - rating.ringWidthMm;
    const odMm = rating.pitchDiameterMm + rating.ringWidthMm;
    if (odMm <= idMm) return null;
    return {
      odMm,
      idMm,
      note: "B16.20 RTJ pitch diameter ± ring width (annular proxy)",
    };
  }

  const odMm = flange.rating.raisedFaceDiameterMm;
  const idMm = pipeOdMm(nps);
  if (!idMm || odMm <= idMm) return null;
  return {
    odMm,
    idMm,
    note: "B16.5 raised-face OD × B36 pipe OD (sheet gasket proxy)",
  };
}

export function pressureToPsi(
  pressure: number,
  unitSystem: UnitSystem,
): number {
  return unitSystem === "imperial" ? pressure : barToPsi(pressure);
}

export function boltStressToPsi(
  stress: number,
  unitSystem: UnitSystem,
): number {
  return unitSystem === "imperial" ? stress : stress / MPA_PER_PSI;
}

export function boltStressFromPsi(
  stressPsi: number,
  unitSystem: UnitSystem,
): number {
  return unitSystem === "imperial" ? stressPsi : stressPsi * MPA_PER_PSI;
}

/** Convert pressure / bolt-stress fields when the user toggles imperial ↔ metric. */
export function convertFlangeGasketStressUnitSystem(
  inputs: FlangeGasketStressInputs,
  to: UnitSystem,
): FlangeGasketStressInputs {
  const from = inputs.unitSystem;
  if (from === to) return { ...inputs, unitSystem: to };
  const pressurePsi = pressureToPsi(inputs.pressure, from);
  const boltPsi = boltStressToPsi(inputs.targetBoltStress, from);
  return {
    ...inputs,
    unitSystem: to,
    pressure:
      to === "imperial" ? pressurePsi : psiToBar(pressurePsi),
    targetBoltStress: boltStressFromPsi(boltPsi, to),
  };
}

export function computeFlangeGasketStress(
  inputs: FlangeGasketStressInputs,
): FlangeGasketStressBreakdown | null {
  const flange = getFlangeDimensionEntry(inputs.nps, inputs.flangeClass);
  if (!flange) return null;

  const geom = resolveGasketGeometryMm(
    inputs.gasketType,
    inputs.nps,
    inputs.flangeClass,
  );
  if (!geom) return null;

  const abIn2 = nominalBoltAreaIn2(flange.rating.studDiameterIn);
  const dbIn = parseInchFraction(flange.rating.studDiameterIn);
  if (abIn2 == null || dbIn == null) return null;

  const type = resolveGasketStressType(inputs.gasketType);
  const pressurePsi = pressureToPsi(inputs.pressure, inputs.unitSystem);
  const boltStressPsi = boltStressToPsi(
    inputs.targetBoltStress,
    inputs.unitSystem,
  );
  if (!(pressurePsi >= 0) || !(boltStressPsi > 0)) return null;

  const odgIn = geom.odMm / 25.4;
  const idgIn = geom.idMm / 25.4;
  const agIn2 = (Math.PI / 4) * (odgIn * odgIn - idgIn * idgIn);
  if (!(agIn2 > 0)) return null;

  const nb = flange.rating.boltHoleCount;
  const fbLbf = nb * boltStressPsi * abIn2;
  /** Screening: hydrostatic diameter taken at gasket OD (PCC-1 field estimate). */
  const gIn = odgIn;
  const hLbf = (Math.PI / 4) * gIn * gIn * pressurePsi;
  const sigmaInstPsi = fbLbf / agIn2;
  const sigmaOpPsi = (fbLbf - hLbf) / agIn2;
  const mPPsi = type.m * pressurePsi;
  const sealingMargin =
    mPPsi > 0 ? sigmaOpPsi / mPPsi : Number.POSITIVE_INFINITY;

  /** Assembly seating floor: stricter of App. 2 y and PCC-1 σ_g,min_seal. */
  const seatingRequiredPsi = Math.max(type.yPsi, type.sigmaMinSealPsi);

  let status: GasketStressStatus = "OPTIMAL";
  if (sigmaInstPsi > type.sigmaMaxAllowPsi) {
    status = "OVER_CRUSH_RISK";
  } else if (
    sigmaOpPsi < mPPsi ||
    sigmaInstPsi < seatingRequiredPsi ||
    sigmaOpPsi < 0
  ) {
    status = "UNDER_STRESSED";
  }

  return {
    odgMm: geom.odMm,
    idgMm: geom.idMm,
    agMm2: agIn2 * MM2_PER_IN2,
    agIn2,
    nb,
    studDiameterIn: flange.rating.studDiameterIn,
    dbIn,
    abIn2,
    boltStressPsi,
    pressurePsi,
    fbLbf,
    gIn,
    hLbf,
    sigmaInstPsi,
    sigmaOpPsi,
    m: type.m,
    yPsi: type.yPsi,
    mPPsi,
    sigmaMinSealPsi: type.sigmaMinSealPsi,
    sigmaMaxAllowPsi: type.sigmaMaxAllowPsi,
    seatingRequiredPsi,
    sealingMargin,
    status,
    gasketLabel: type.label,
    geometryNote: geom.note,
  };
}

function formatStress(psi: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(psi)) return "—";
  if (unitSystem === "imperial") {
    return `${(psi / PSI_PER_KSI).toFixed(1)} ksi`;
  }
  return `${(psi * MPA_PER_PSI).toFixed(1)} MPa`;
}

function formatForce(lbf: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(lbf)) return "—";
  if (unitSystem === "imperial") {
    return `${Math.round(lbf).toLocaleString("en-US")} lbf`;
  }
  return `${(lbf / LBF_PER_KN).toFixed(2)} kN`;
}

function formatArea(in2: number, unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") return `${in2.toFixed(3)} in²`;
  return `${(in2 * MM2_PER_IN2).toFixed(0)} mm²`;
}

function formatLengthIn(inValue: number, unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") return `${inValue.toFixed(3)} in`;
  return `${(inValue * 25.4).toFixed(1)} mm`;
}

function formatPressureValue(psi: number, unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") return `${Math.round(psi)} psi`;
  return `${psiToBar(psi).toFixed(1)} bar`;
}

function statusLevel(status: GasketStressStatus): StatusLevel {
  if (status === "OPTIMAL") return "pass";
  if (status === "UNDER_STRESSED") return "warn";
  return "fail";
}

export function calculateFlangeGasketStress(
  inputs: FlangeGasketStressInputs,
): CalculatorOutput {
  const entry = getFlangeDimensionEntry(inputs.nps, inputs.flangeClass);
  const calc = computeFlangeGasketStress(inputs);

  if (!entry || !calc) {
    return {
      heroLabel: "Operating Gasket Stress (σ_g,op)",
      heroValue: "—",
      heroStatus: "Select a valid NPS, class, and gasket type",
      heroStatusLevel: "warn",
      summary: [
        { label: "NPS", value: inputs.nps ? `${inputs.nps}"` : "—" },
        {
          label: "Class",
          value: inputs.flangeClass ? `${inputs.flangeClass}#` : "—",
        },
      ],
      summaryStatus: {
        label: "No matching flange / gasket geometry",
        level: "warn",
      },
      rows: [],
      exportRows: [],
      callouts: [
        {
          tone: "warn",
          title: "Geometry lookup failed",
          body: "No matching flange / gasket contact geometry for this NPS × class × gasket type. Pick a combination available in B16.5 / B16.20 tables.",
        },
      ],
    };
  }

  const { flange, rating } = entry;
  const us = inputs.unitSystem;
  const heroValue = formatStress(calc.sigmaOpPsi, us);
  const marginText = Number.isFinite(calc.sealingMargin)
    ? calc.sealingMargin.toFixed(2)
    : "—";

  const callouts: NonNullable<CalculatorOutput["callouts"]> = [];

  if (calc.sigmaOpPsi < 0) {
    callouts.push({
      tone: "warn",
      title: "Bolt preload below hydrostatic end force",
      body: `H (${formatForce(calc.hLbf, us)}) exceeds F_b (${formatForce(calc.fbLbf, us)}), so σ_g,op is negative. Increase target bolt stress or confirm gasket / bolting selection before pressurization.`,
    });
  }
  if (calc.status === "OVER_CRUSH_RISK") {
    callouts.push({
      tone: "warn",
      title: "Over-stress / crush risk",
      body: `Installation stress σ_g,inst (${formatStress(calc.sigmaInstPsi, us)}) exceeds PCC-1 style σ_g,max_allow (${formatStress(calc.sigmaMaxAllowPsi, us)}). Risk of gasket crushing or inward buckling — reduce target bolt stress or change gasket construction.`,
    });
  }
  if (
    calc.sigmaOpPsi < calc.mPPsi ||
    calc.sigmaInstPsi < calc.seatingRequiredPsi ||
    calc.sigmaOpPsi < 0
  ) {
    callouts.push({
      tone: "warn",
      title: "Under-stress / leakage risk",
      body: `Need σ_g,inst ≥ seating floor max(y, σ_g,min_seal) = ${formatStress(calc.seatingRequiredPsi, us)} and σ_g,op ≥ m·P (${formatStress(calc.mPPsi, us)}). High risk of joint leakage during hydrotest or operation.`,
    });
  }

  return {
    heroLabel: "Operating Gasket Stress (σ_g,op)",
    heroValue,
    heroStatus: `${flange.npsLabel} · Class ${rating.class} · ${calc.status.replace(/_/g, " ")}`,
    heroStatusLevel: statusLevel(calc.status),
    heroBadges: [
      { label: "Status", value: calc.status.replace(/_/g, " ") },
      { label: "Margin σ_g,op/(m·P)", value: marginText },
    ],
    summary: [
      {
        label: "Installation Stress (σ_g,inst)",
        value: formatStress(calc.sigmaInstPsi, us),
      },
      {
        label: "Seating floor max(y, σ_min)",
        value: formatStress(calc.seatingRequiredPsi, us),
      },
      {
        label: "Min Operating Stress (m·P)",
        value: formatStress(calc.mPPsi, us),
      },
      {
        label: "Sealing Margin σ_g,op/(m·P)",
        value: marginText,
      },
    ],
    summaryStatus: {
      label: `${calc.gasketLabel} · ${calc.status.replace(/_/g, " ")}`,
      level: statusLevel(calc.status),
    },
    rows: [
      {
        label: "Contact area (A_g)",
        value: formatArea(calc.agIn2, us),
        section: "Calculation basis",
        emphasis: true,
      },
      {
        label: "Gasket OD × ID",
        value: `${formatLengthIn(calc.odgMm / 25.4, us)} × ${formatLengthIn(calc.idgMm / 25.4, us)}`,
        section: "Calculation basis",
      },
      {
        label: "Bolting",
        value: `${calc.nb} × ${calc.studDiameterIn} · A_b ${formatArea(calc.abIn2, us)}`,
        section: "Calculation basis",
      },
      {
        label: "Preload F_b / end force H",
        value: `${formatForce(calc.fbLbf, us)} / ${formatForce(calc.hLbf, us)}`,
        section: "Calculation basis",
        emphasis: true,
      },
      {
        label: "App. 2 factors m · y",
        value: `${calc.m.toFixed(2)} · ${formatStress(calc.yPsi, us)}`,
        section: "Calculation basis",
      },
      {
        label: "PCC-1 σ_g,max_allow",
        value: formatStress(calc.sigmaMaxAllowPsi, us),
        section: "Calculation basis",
      },
    ],
    exportRows: [
      { label: "Standard", value: "ASME PCC-1 App. O / VIII-1 App. 2 (screening)" },
      { label: "NPS", value: flange.npsLabel },
      { label: "Class", value: rating.class },
      { label: "Gasket type", value: calc.gasketLabel },
      { label: "Geometry basis", value: calc.geometryNote },
      { label: "OD_g", value: formatLengthIn(calc.odgMm / 25.4, us) },
      { label: "ID_g", value: formatLengthIn(calc.idgMm / 25.4, us) },
      { label: "A_g", value: formatArea(calc.agIn2, us) },
      { label: "G", value: formatLengthIn(calc.gIn, us) },
      { label: "m", value: String(calc.m) },
      { label: "y", value: formatStress(calc.yPsi, us) },
      { label: "σ_g,min_seal", value: formatStress(calc.sigmaMinSealPsi, us) },
      { label: "σ_g,max_allow", value: formatStress(calc.sigmaMaxAllowPsi, us) },
      { label: "seating_floor", value: formatStress(calc.seatingRequiredPsi, us) },
      { label: "P", value: formatPressureValue(calc.pressurePsi, us) },
      { label: "S_bolt", value: formatStress(calc.boltStressPsi, us) },
      { label: "N_b", value: String(calc.nb) },
      { label: "Stud", value: calc.studDiameterIn },
      { label: "A_b", value: formatArea(calc.abIn2, us) },
      { label: "F_b", value: formatForce(calc.fbLbf, us) },
      { label: "H", value: formatForce(calc.hLbf, us) },
      { label: "σ_g,inst", value: formatStress(calc.sigmaInstPsi, us) },
      { label: "σ_g,op", value: formatStress(calc.sigmaOpPsi, us) },
      { label: "Status", value: calc.status },
      { label: "Sealing margin", value: marginText },
    ],
    callouts,
  };
}
