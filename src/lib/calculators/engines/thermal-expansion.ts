import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
  getPipeScheduleSize,
} from "@/lib/data/loaders";

export type ExpansionMaterial = "cs" | "304ss" | "316ss" | "alloy";

export type ThermalExpansionInputs = {
  unitSystem: UnitSystem;
  material: ExpansionMaterial;
  installTemp: number;
  operatingTemp: number;
  length: number;
  nps: string;
  /** ASME B36.10M schedule token (e.g. "40", "80", "STD"). */
  schedule: string;
  /**
   * Allowable displacement stress range S_A.
   * Metric: MPa · Imperial: ksi. Empty / non-positive → material default.
   */
  allowableSa: number;
  /** Pipe rack friction factor μ for slider/support screening. */
  frictionFactor: number;
};

type MaterialProps = {
  label: string;
  alphaPerC: number;
  eColdMpa: number;
  saMpa: number;
};

const MATERIALS: Record<ExpansionMaterial, MaterialProps> = {
  cs: {
    label: "Carbon steel (A106 / A53)",
    alphaPerC: 12.1e-6,
    eColdMpa: 203000,
    saMpa: 138,
  },
  "304ss": {
    label: "304 / 304L stainless",
    alphaPerC: 17.3e-6,
    eColdMpa: 195000,
    saMpa: 138,
  },
  "316ss": {
    label: "316 / 316L stainless",
    alphaPerC: 16.2e-6,
    eColdMpa: 193000,
    saMpa: 138,
  },
  alloy: {
    label: "Cr-Mo alloy (P11 / P22 / P91)",
    alphaPerC: 13.7e-6,
    eColdMpa: 206000,
    saMpa: 138,
  },
};

export const EXPANSION_MATERIAL_OPTIONS: {
  value: ExpansionMaterial;
  label: string;
}[] = [
  { value: "cs", label: "CS — A106 / A53" },
  { value: "304ss", label: "304SS" },
  { value: "316ss", label: "316SS" },
  { value: "alloy", label: "Alloy — P11 / P22 / P91" },
];

/** Preferred schedule chips for thermal loop sizing. */
export const EXPANSION_SCHEDULE_OPTIONS = [
  { value: "10", label: "Sch 10" },
  { value: "40", label: "Sch 40 / STD" },
  { value: "80", label: "Sch 80 / XS" },
  { value: "160", label: "Sch 160" },
] as const;

export function materialDefaultSa(
  material: ExpansionMaterial,
  unitSystem: UnitSystem,
): number {
  const saMpa = MATERIALS[material]?.saMpa ?? MATERIALS.cs.saMpa;
  if (unitSystem === "imperial") {
    return Number((saMpa / 6.894757).toFixed(2));
  }
  return saMpa;
}

export function resolveAllowableSaMpa(inputs: ThermalExpansionInputs): number {
  const mat = MATERIALS[inputs.material] ?? MATERIALS.cs;
  if (!Number.isFinite(inputs.allowableSa) || inputs.allowableSa <= 0) {
    return mat.saMpa;
  }
  if (inputs.unitSystem === "imperial") {
    return inputs.allowableSa * 6.894757;
  }
  return inputs.allowableSa;
}

function materialHotEMpa(material: ExpansionMaterial, operatingTempC: number): number {
  const tempC = Math.max(20, operatingTempC);
  const points: Record<ExpansionMaterial, Array<[number, number]>> = {
    cs: [
      [20, 203000],
      [100, 198000],
      [200, 191000],
      [300, 184000],
      [400, 177000],
      [500, 168000],
    ],
    "304ss": [
      [20, 195000],
      [100, 189000],
      [200, 183000],
      [300, 176000],
      [400, 168000],
      [500, 160000],
    ],
    "316ss": [
      [20, 193000],
      [100, 187000],
      [200, 181000],
      [300, 174000],
      [400, 166000],
      [500, 158000],
    ],
    alloy: [
      [20, 206000],
      [200, 197000],
      [300, 189000],
      [400, 181000],
      [500, 173000],
      [550, 168000],
    ],
  };
  const curve = points[material] ?? points.cs;
  if (tempC <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i += 1) {
    const [x2, y2] = curve[i];
    const [x1, y1] = curve[i - 1];
    if (tempC <= x2) {
      const ratio = (tempC - x1) / (x2 - x1);
      return y1 + (y2 - y1) * ratio;
    }
  }
  return curve[curve.length - 1][1];
}

export function thermalExpansionDeltaLMm(inputs: ThermalExpansionInputs): number {
  const mat = MATERIALS[inputs.material] ?? MATERIALS.cs;
  const t1 =
    inputs.unitSystem === "imperial"
      ? (inputs.installTemp - 32) / 1.8
      : inputs.installTemp;
  const t2 =
    inputs.unitSystem === "imperial"
      ? (inputs.operatingTemp - 32) / 1.8
      : inputs.operatingTemp;
  const lengthM =
    inputs.unitSystem === "imperial" ? inputs.length * 0.3048 : inputs.length;
  if (
    !Number.isFinite(t1) ||
    !Number.isFinite(t2) ||
    !Number.isFinite(lengthM) ||
    lengthM <= 0
  ) {
    return 0;
  }
  const deltaT = t2 - t1;
  const deltaLMm = mat.alphaPerC * lengthM * deltaT * 1000;
  return Number.isFinite(deltaLMm) ? deltaLMm : 0;
}

/** Pipe section: OD, t, ID, I (mm⁴). */
export function pipeSectionProperties(nps: string, schedule: string) {
  const pipe = getPipeScheduleSize(nps);
  const odMm = pipe?.outsideDiameterMm ?? 114.3;
  const resolvedSchedule = defaultScheduleForNps(nps, schedule || "40");
  const entry = getPipeScheduleEntry(nps, resolvedSchedule);
  const tMm = entry?.row.wallThicknessMm ?? odMm * 0.06;
  const idMm = entry?.row.insideDiameterMm ?? Math.max(odMm - 2 * tMm, 0);
  const iMm4 = (Math.PI / 64) * (odMm ** 4 - idMm ** 4);
  return {
    odMm,
    tMm,
    idMm,
    iMm4: Number.isFinite(iMm4) ? iMm4 : 0,
    scheduleLabel: entry?.row.schedule ?? resolvedSchedule,
    npsLabel: pipe?.npsLabel ?? `${nps}"`,
  };
}

/**
 * Guided-cantilever leg for U-loop midpoint (each leg absorbs ΔL/2):
 * L_leg = √(3 · E · D · ΔL_leg / S_A)  [mm; E in MPa = N/mm²]
 */
export function guidedCantileverLegMm(args: {
  eMpa: number;
  odMm: number;
  deltaLLegMm: number;
  saMpa: number;
}): number {
  const { eMpa, odMm, deltaLLegMm, saMpa } = args;
  if (eMpa <= 0 || odMm <= 0 || deltaLLegMm <= 0 || saMpa <= 0) return 0;
  const raw = Math.sqrt((3 * eMpa * odMm * deltaLLegMm) / saMpa);
  return Number.isFinite(raw) ? raw : 0;
}

/** F_anchor = 12 · E · I · ΔL / L_leg³  → Newtons */
export function anchorForceN(args: {
  eMpa: number;
  iMm4: number;
  deltaLMm: number;
  lLegMm: number;
}): number {
  const { eMpa, iMm4, deltaLMm, lLegMm } = args;
  if (eMpa <= 0 || iMm4 <= 0 || lLegMm <= 0) return 0;
  const raw = (12 * eMpa * iMm4 * Math.abs(deltaLMm)) / lLegMm ** 3;
  return Number.isFinite(raw) ? raw : 0;
}

export function mapExpansionMaterial(
  raw: string | undefined,
): ExpansionMaterial | undefined {
  if (!raw) return undefined;
  const value = raw.toLowerCase();
  if (value.includes("316")) return "316ss";
  if (
    value.includes("304") ||
    value.includes("321") ||
    value.includes("347") ||
    value.includes("stainless") ||
    value === "304ss"
  ) {
    return "304ss";
  }
  if (
    value.includes("p11") ||
    value.includes("p22") ||
    value.includes("p91") ||
    value.includes("p5") ||
    value.includes("p9") ||
    value.includes("alloy") ||
    value.includes("cr-mo") ||
    value.includes("crmo")
  ) {
    return "alloy";
  }
  if (
    value.includes("a106") ||
    value.includes("a53") ||
    value.includes("carbon") ||
    value === "cs" ||
    value === "carbon-steel"
  ) {
    return "cs";
  }
  return undefined;
}

function formatForce(n: number, unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") {
    const lbf = n * 0.224809;
    return lbf >= 1000
      ? `${(lbf / 1000).toFixed(2)} kip`
      : `${lbf.toFixed(0)} lbf`;
  }
  return n >= 1000 ? `${(n / 1000).toFixed(2)} kN` : `${n.toFixed(0)} N`;
}

function formatEngineeringMm4(value: number, unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") {
    return `${(value / 25.4 ** 4).toFixed(3)} in⁴`;
  }
  if (value === 0 || !Number.isFinite(value)) return "0 mm⁴";
  const exponent = Math.floor(Math.log10(Math.abs(value)) / 3) * 3;
  const mantissa = value / 10 ** exponent;
  const superscript = String(exponent)
    .replace(/0/g, "⁰")
    .replace(/1/g, "¹")
    .replace(/2/g, "²")
    .replace(/3/g, "³")
    .replace(/4/g, "⁴")
    .replace(/5/g, "⁵")
    .replace(/6/g, "⁶")
    .replace(/7/g, "⁷")
    .replace(/8/g, "⁸")
    .replace(/9/g, "⁹")
    .replace(/-/g, "⁻");
  return `${mantissa.toFixed(2)} × 10${superscript} mm⁴`;
}

function formatLengthMm(mm: number, unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") {
    return `${(mm / 25.4).toFixed(2)} in`;
  }
  return `${mm.toFixed(1)} mm`;
}

function formatLengthM(m: number, unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") {
    return `${(m / 0.3048).toFixed(2)} ft`;
  }
  return `${m.toFixed(2)} m`;
}

export function calculateThermalExpansion(
  inputs: ThermalExpansionInputs,
): CalculatorOutput {
  const mat = MATERIALS[inputs.material] ?? MATERIALS.cs;
  const deltaLMm = thermalExpansionDeltaLMm(inputs);
  const absDelta = Math.abs(Number.isFinite(deltaLMm) ? deltaLMm : 0);
  const deltaLLegMm = absDelta / 2;

  const t1 =
    inputs.unitSystem === "imperial"
      ? (inputs.installTemp - 32) / 1.8
      : inputs.installTemp;
  const t2 =
    inputs.unitSystem === "imperial"
      ? (inputs.operatingTemp - 32) / 1.8
      : inputs.operatingTemp;
  const deltaT = t2 - t1;
  const eHotMpa = materialHotEMpa(inputs.material, t2);

  const section = pipeSectionProperties(inputs.nps, inputs.schedule);
  const saMpa = resolveAllowableSaMpa(inputs);
  const lLegMm = guidedCantileverLegMm({
    eMpa: eHotMpa,
    odMm: section.odMm,
    deltaLLegMm,
    saMpa,
  });
  const lShapeM = lLegMm / 1000;
  const uLoopWidthM = lShapeM / 2;
  const bendingForceN = anchorForceN({
    eMpa: eHotMpa,
    iMm4: section.iMm4,
    deltaLMm: absDelta,
    lLegMm,
  });
  const entry = getPipeScheduleEntry(inputs.nps, inputs.schedule);
  const pipeWeightN =
    (entry?.row.weightKgPerM ?? 0) *
    (inputs.unitSystem === "imperial" ? inputs.length * 0.3048 : inputs.length) *
    9.80665;
  const frictionForceN = Math.max(0, inputs.frictionFactor) * pipeWeightN;
  const totalAnchorForceN = bendingForceN + frictionForceN;
  const g1Mm = 4 * section.odMm;
  const g2Mm = 14 * section.odMm;

  const tempUnit = inputs.unitSystem === "imperial" ? "°F" : "°C";
  const lengthUnit = inputs.unitSystem === "imperial" ? "ft" : "m";
  const stressUnit = inputs.unitSystem === "imperial" ? "ksi" : "MPa";
  const saDisplay =
    inputs.unitSystem === "imperial"
      ? saMpa / 6.894757
      : saMpa;
  const lengthOut = formatLengthM(lShapeM, inputs.unitSystem);
  const widthOut = formatLengthM(uLoopWidthM, inputs.unitSystem);
  const bendingForceOut = formatForce(bendingForceN, inputs.unitSystem);
  const frictionForceOut = formatForce(frictionForceN, inputs.unitSystem);
  const forceOut = formatForce(totalAnchorForceN, inputs.unitSystem);
  const g1Out = formatLengthMm(g1Mm, inputs.unitSystem);
  const g2Out = formatLengthMm(g2Mm, inputs.unitSystem);

  const level = absDelta < 10 ? "pass" : absDelta < 80 ? "warn" : "fail";

  return {
    heroLabel: "Thermal expansion ΔL",
    heroValue: `${deltaLMm >= 0 ? "+" : ""}${deltaLMm.toFixed(1)} mm`,
    heroStatus: `${mat.label} · α = ${(mat.alphaPerC * 1e6).toFixed(1)}×10⁻⁶ /°C · E_h = ${(eHotMpa / 1000).toFixed(1)} GPa`,
    heroStatusLevel: level === "fail" ? "warn" : level,
    summary: [
      { label: "L-shape min. leg H", value: lengthOut },
      { label: "U-loop width W", value: widthOut },
      { label: "Anchor force total", value: forceOut },
    ],
    summaryStatus: {
      label:
        "ASME B31.3 guided-cantilever screening — not a computer flexibility analysis",
      level: "neutral",
    },
    rows: [
      { label: "Material", value: mat.label, section: "Line conditions" },
      {
        label: "Install temperature T1",
        value: `${inputs.installTemp} ${tempUnit}`,
        section: "Line conditions",
      },
      {
        label: "Operating temperature T2",
        value: `${inputs.operatingTemp} ${tempUnit}`,
        section: "Line conditions",
      },
      {
        label: "Straight length L",
        value: `${inputs.length} ${lengthUnit}`,
        section: "Line conditions",
      },
      {
        label: "Temperature difference ΔT",
        value: `${deltaT.toFixed(1)} °C`,
        section: "Line conditions",
      },
      {
        label: "Expansion coefficient α",
        value: `${(mat.alphaPerC * 1e6).toFixed(2)} µm/m·°C`,
        section: "Line conditions",
      },
      {
        label: "Hot modulus E_h at T2",
        value: `${eHotMpa.toFixed(0)} MPa`,
        section: "Line conditions",
      },
      {
        label: "NPS / Schedule",
        value: `${section.npsLabel} · Sch ${section.scheduleLabel}`,
        section: "Pipe section",
      },
      {
        label: "Outside diameter OD",
        value: formatLengthMm(section.odMm, inputs.unitSystem),
        section: "Pipe section",
        highlight: "od",
      },
      {
        label: "Wall thickness t",
        value: formatLengthMm(section.tMm, inputs.unitSystem),
        section: "Pipe section",
        highlight: "T",
      },
      {
        label: "Inside diameter ID",
        value: formatLengthMm(section.idMm, inputs.unitSystem),
        section: "Pipe section",
        highlight: "bore",
      },
      {
        label: "Moment of inertia I",
        value: formatEngineeringMm4(section.iMm4, inputs.unitSystem),
        section: "Pipe section",
      },
      {
        label: "Pipe rack friction factor μ",
        value: inputs.frictionFactor.toFixed(2),
        section: "Flexibility results",
      },
      {
        label: "Allowable S_A used",
        value: `${saDisplay.toFixed(1)} ${stressUnit}`,
        section: "Flexibility results",
      },
      {
        label: "Total expansion ΔL",
        value: `${deltaLMm.toFixed(2)} mm`,
        section: "Flexibility results",
        emphasis: true,
      },
      {
        label: "ΔL per loop leg (ΔL/2)",
        value: `${deltaLLegMm.toFixed(2)} mm`,
        section: "Flexibility results",
      },
      {
        label: "Recommended L-shape leg H",
        value: lengthOut,
        section: "Flexibility results",
      },
      {
        label: "Recommended U-loop width W",
        value: widthOut,
        section: "Flexibility results",
      },
      {
        label: "Anchor reaction F_bending",
        value: bendingForceOut,
        section: "Flexibility results",
      },
      {
        label: "Support friction F_friction",
        value: frictionForceOut,
        section: "Flexibility results",
      },
      {
        label: "Total anchor force F_anchor,total",
        value: forceOut,
        section: "Flexibility results",
        emphasis: true,
      },
      {
        label: "First guide distance G₁ (4·OD)",
        value: g1Out,
        section: "Guide spacing",
      },
      {
        label: "Second guide distance G₂ (14·OD)",
        value: g2Out,
        section: "Guide spacing",
      },
    ],
    exportRows: [
      { label: "Standard", value: "ASME B31.3 Appendix P / guided-cantilever screening" },
      { label: "Material", value: mat.label },
      {
        label: "Install temperature T1",
        value: `${inputs.installTemp} ${tempUnit}`,
      },
      {
        label: "Operating temperature T2",
        value: `${inputs.operatingTemp} ${tempUnit}`,
      },
      { label: "Straight length L", value: `${inputs.length} ${lengthUnit}` },
      { label: "Temperature difference ΔT", value: `${deltaT.toFixed(1)} °C` },
      {
        label: "Expansion coefficient α",
        value: `${(mat.alphaPerC * 1e6).toFixed(2)} µm/m·°C`,
      },
      { label: "Hot modulus E_h at T2", value: `${eHotMpa.toFixed(0)} MPa` },
      {
        label: "NPS / Schedule",
        value: `${section.npsLabel} · Sch ${section.scheduleLabel}`,
      },
      { label: "Outside diameter OD", value: formatLengthMm(section.odMm, inputs.unitSystem) },
      { label: "Wall thickness t", value: formatLengthMm(section.tMm, inputs.unitSystem) },
      { label: "Inside diameter ID", value: formatLengthMm(section.idMm, inputs.unitSystem) },
      {
        label: "Moment of inertia I",
        value: formatEngineeringMm4(section.iMm4, inputs.unitSystem),
      },
      { label: "Pipe rack friction factor μ", value: inputs.frictionFactor.toFixed(2) },
      { label: "Allowable S_A used", value: `${saDisplay.toFixed(1)} ${stressUnit}` },
      { label: "Total expansion ΔL", value: `${deltaLMm.toFixed(2)} mm` },
      { label: "Recommended L-shape leg H", value: lengthOut },
      { label: "Recommended U-loop width W", value: widthOut },
      { label: "Anchor reaction F_bending", value: bendingForceOut },
      { label: "Support friction F_friction", value: frictionForceOut },
      { label: "Total anchor force F_anchor,total", value: forceOut },
      { label: "First guide distance G1", value: g1Out },
      { label: "Second guide distance G2", value: g2Out },
    ],
  };
}

export const DEFAULT_THERMAL_EXPANSION_INPUTS: ThermalExpansionInputs = {
  unitSystem: "metric",
  material: "cs",
  installTemp: 21,
  operatingTemp: 150,
  length: 20,
  nps: "4",
  schedule: "40",
  allowableSa: 138,
  frictionFactor: 0.3,
};
