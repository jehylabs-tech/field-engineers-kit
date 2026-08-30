import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import { getPipeScheduleSize } from "@/lib/data/loaders";

export type ExpansionMaterial = "cs" | "304ss" | "316ss" | "alloy";

export type ThermalExpansionInputs = {
  unitSystem: UnitSystem;
  material: ExpansionMaterial;
  installTemp: number;
  operatingTemp: number;
  length: number;
  nps: string;
};

type MaterialProps = {
  label: string;
  alphaPerC: number;
  eMpa: number;
  saMpa: number;
};

const MATERIALS: Record<ExpansionMaterial, MaterialProps> = {
  cs: {
    label: "Carbon steel (A106 / A53)",
    alphaPerC: 12.1e-6,
    eMpa: 203000,
    saMpa: 138,
  },
  "304ss": {
    label: "304 / 304L stainless",
    alphaPerC: 17.3e-6,
    eMpa: 195000,
    saMpa: 138,
  },
  "316ss": {
    label: "316 / 316L stainless",
    alphaPerC: 16.2e-6,
    eMpa: 193000,
    saMpa: 138,
  },
  alloy: {
    label: "Cr-Mo alloy (P11 / P22 / P91)",
    alphaPerC: 13.7e-6,
    eMpa: 206000,
    saMpa: 138,
  },
};

export const EXPANSION_MATERIAL_OPTIONS: { value: ExpansionMaterial; label: string }[] =
  [
    { value: "cs", label: "CS — A106 / A53" },
    { value: "304ss", label: "304SS" },
    { value: "316ss", label: "316SS" },
    { value: "alloy", label: "Alloy — P11 / P22 / P91" },
  ];

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

export function mapExpansionMaterial(raw: string | undefined): ExpansionMaterial | undefined {
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

export function calculateThermalExpansion(
  inputs: ThermalExpansionInputs,
): CalculatorOutput {
  const mat = MATERIALS[inputs.material] ?? MATERIALS.cs;
  const deltaLMm = thermalExpansionDeltaLMm(inputs);
  const absDelta = Math.abs(Number.isFinite(deltaLMm) ? deltaLMm : 0);

  const t1 =
    inputs.unitSystem === "imperial"
      ? (inputs.installTemp - 32) / 1.8
      : inputs.installTemp;
  const t2 =
    inputs.unitSystem === "imperial"
      ? (inputs.operatingTemp - 32) / 1.8
      : inputs.operatingTemp;
  const deltaT = t2 - t1;

  const pipe = getPipeScheduleSize(inputs.nps);
  const dMm = pipe?.outsideDiameterMm ?? 114.3;
  const screeningRaw =
    absDelta > 0 && mat.saMpa > 0
      ? Math.sqrt((3 * mat.eMpa * dMm * absDelta) / (4 * mat.saMpa))
      : 0;
  const screening = Number.isFinite(screeningRaw) ? screeningRaw : 0;
  const lShapeM = screening / 1000;
  const uLoopWidthM = 0.65 * lShapeM;
  const tempUnit = inputs.unitSystem === "imperial" ? "°F" : "°C";
  const lengthUnit = inputs.unitSystem === "imperial" ? "ft" : "m";
  const lengthOut =
    inputs.unitSystem === "imperial"
      ? `${(lShapeM / 0.3048).toFixed(2)} ft`
      : `${lShapeM.toFixed(2)} m`;
  const widthOut =
    inputs.unitSystem === "imperial"
      ? `${(uLoopWidthM / 0.3048).toFixed(2)} ft`
      : `${uLoopWidthM.toFixed(2)} m`;

  const level =
    absDelta < 10 ? "pass" : absDelta < 80 ? "warn" : "fail";

  return {
    heroLabel: "Thermal expansion ΔL",
    heroValue: `${deltaLMm >= 0 ? "+" : ""}${deltaLMm.toFixed(1)} mm`,
    heroStatus: `${mat.label} · α = ${(mat.alphaPerC * 1e6).toFixed(1)}×10⁻⁶ /°C`,
    heroStatusLevel: level === "fail" ? "warn" : level,
    summary: [
      { label: "L-shape min. leg", value: lengthOut },
      { label: "U-loop width", value: widthOut },
    ],
    summaryStatus: {
      label:
        "ASME B31.3 guided-cantilever screening — not a computer flexibility analysis",
      level: "neutral",
    },
    rows: [
      { label: "Material", value: mat.label },
      {
        label: "Install temperature T1",
        value: `${inputs.installTemp} ${tempUnit}`,
      },
      {
        label: "Operating temperature T2",
        value: `${inputs.operatingTemp} ${tempUnit}`,
      },
      {
        label: "Straight length L",
        value: `${inputs.length} ${lengthUnit}`,
      },
      {
        label: "Temperature difference ΔT",
        value: `${deltaT.toFixed(1)} °C`,
      },
      {
        label: "Expansion coefficient α used",
        value: `${(mat.alphaPerC * 1e6).toFixed(2)} µm/m·°C`,
      },
      {
        label: "NPS for D",
        value: pipe ? pipe.npsLabel : `${inputs.nps}"`,
      },
      {
        label: "Outside diameter OD",
        value: `${dMm.toFixed(2)} mm`,
      },
      {
        label: "Total expansion ΔL",
        value: `${deltaLMm.toFixed(2)} mm`,
      },
      { label: "Recommended L-shape leg", value: lengthOut },
      { label: "Recommended U-loop width", value: widthOut },
    ],
    exportRows: [
      { label: "Standard", value: "ASME B31.3 Appendix P screening" },
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
        label: "Expansion coefficient α used",
        value: `${(mat.alphaPerC * 1e6).toFixed(2)} µm/m·°C`,
      },
      {
        label: "NPS for D",
        value: pipe ? pipe.npsLabel : `${inputs.nps}"`,
      },
      { label: "Outside diameter OD", value: `${dMm.toFixed(2)} mm` },
      { label: "Total expansion ΔL", value: `${deltaLMm.toFixed(2)} mm` },
      { label: "Recommended L-shape leg", value: lengthOut },
      { label: "Recommended U-loop width", value: widthOut },
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
};
