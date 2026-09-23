/**
 * ASME BPVC Section II Part D (screening) allowable tensile stress S for
 * Section VIII Division 1 formed-head thickness (UG-32).
 *
 * Values are engineering-table screens commonly used with SA-516 / SA-240 /
 * SA-387 plate — confirm the project edition of Section II-D Table 1A before
 * stamped design. Interpolation is linear between tabulated °F points.
 */

export type AsmeViiiHeadMaterialId =
  | "SA-516-70"
  | "SA-240-316L"
  | "SA-240-304L"
  | "SA-387-11"
  | "SA-106-B"
  | "SA-312-316L";

/** Shell / pad grades used by UG-37 nozzle reinforcement. */
export type AsmeViiiShellMaterialId = "SA-516-70" | "SA-240-316L";

/** Nozzle neck grades used by UG-37 nozzle reinforcement. */
export type AsmeViiiNozzleMaterialId = "SA-106-B" | "SA-312-316L";

export type AsmeViiiStressPoint = {
  /** Metal temperature °F. */
  tempF: number;
  /** Allowable stress ksi (Section II-D Table 1A screen). */
  stressKsi: number;
};

export type AsmeViiiHeadMaterial = {
  id: AsmeViiiHeadMaterialId;
  label: string;
  shortLabel: string;
  description: string;
  /** Approximate max metal temperature for continuous service (°F). */
  maxTempF: number;
  /** Approximate max metal temperature (°C). */
  maxTempC: number;
  densityKgM3: number;
  curve: AsmeViiiStressPoint[];
};

const KSI_TO_MPA = 6.894757293;
const KSI_TO_PSI = 1000;

/** SA-516 Gr.70 — carbon steel PV plate (II-D Table 1A screen). */
const SA516_70_CURVE: AsmeViiiStressPoint[] = [
  { tempF: -20, stressKsi: 20.0 },
  { tempF: 100, stressKsi: 20.0 },
  { tempF: 200, stressKsi: 20.0 },
  { tempF: 300, stressKsi: 20.0 },
  { tempF: 400, stressKsi: 20.0 },
  { tempF: 500, stressKsi: 18.9 },
  { tempF: 600, stressKsi: 17.3 },
  { tempF: 650, stressKsi: 16.8 },
  { tempF: 700, stressKsi: 16.3 },
  { tempF: 750, stressKsi: 13.0 },
  { tempF: 800, stressKsi: 10.2 },
  { tempF: 850, stressKsi: 8.4 },
  { tempF: 900, stressKsi: 6.5 },
];

/** SA-240 304L — austenitic stainless plate. */
const SA240_304L_CURVE: AsmeViiiStressPoint[] = [
  { tempF: -20, stressKsi: 16.7 },
  { tempF: 100, stressKsi: 16.7 },
  { tempF: 200, stressKsi: 16.7 },
  { tempF: 300, stressKsi: 15.0 },
  { tempF: 400, stressKsi: 13.8 },
  { tempF: 500, stressKsi: 12.7 },
  { tempF: 600, stressKsi: 12.1 },
  { tempF: 650, stressKsi: 11.9 },
  { tempF: 700, stressKsi: 11.7 },
  { tempF: 750, stressKsi: 11.5 },
  { tempF: 800, stressKsi: 11.2 },
  { tempF: 850, stressKsi: 11.0 },
  { tempF: 900, stressKsi: 10.8 },
];

/** SA-240 316L — Mo austenitic stainless plate. */
const SA240_316L_CURVE: AsmeViiiStressPoint[] = [
  { tempF: -20, stressKsi: 16.7 },
  { tempF: 100, stressKsi: 16.7 },
  { tempF: 200, stressKsi: 16.7 },
  { tempF: 300, stressKsi: 15.0 },
  { tempF: 400, stressKsi: 13.8 },
  { tempF: 500, stressKsi: 12.9 },
  { tempF: 600, stressKsi: 12.1 },
  { tempF: 650, stressKsi: 11.9 },
  { tempF: 700, stressKsi: 11.8 },
  { tempF: 750, stressKsi: 11.6 },
  { tempF: 800, stressKsi: 11.4 },
  { tempF: 850, stressKsi: 11.2 },
  { tempF: 900, stressKsi: 11.0 },
];

/** SA-387 Gr.11 Cl.2 — 1¼Cr–½Mo alloy plate. */
const SA387_11_CURVE: AsmeViiiStressPoint[] = [
  { tempF: -20, stressKsi: 17.1 },
  { tempF: 100, stressKsi: 17.1 },
  { tempF: 200, stressKsi: 17.1 },
  { tempF: 300, stressKsi: 17.1 },
  { tempF: 400, stressKsi: 17.1 },
  { tempF: 500, stressKsi: 17.1 },
  { tempF: 600, stressKsi: 17.1 },
  { tempF: 650, stressKsi: 17.1 },
  { tempF: 700, stressKsi: 17.0 },
  { tempF: 750, stressKsi: 14.8 },
  { tempF: 800, stressKsi: 12.0 },
  { tempF: 850, stressKsi: 9.3 },
  { tempF: 900, stressKsi: 6.3 },
];

export const ASME_VIII_HEAD_MATERIALS: Record<
  AsmeViiiHeadMaterialId,
  AsmeViiiHeadMaterial
> = {
  "SA-516-70": {
    id: "SA-516-70",
    label: "SA-516 Gr.70 (Carbon Steel)",
    shortLabel: "SA-516 Gr.70",
    description: "ASME II-D Table 1A screening for PV carbon plate",
    maxTempF: 900,
    maxTempC: 482,
    densityKgM3: 7850,
    curve: SA516_70_CURVE,
  },
  "SA-240-316L": {
    id: "SA-240-316L",
    label: "SA-240 316L (Austenitic SS)",
    shortLabel: "SA-240 316L",
    description: "ASME II-D Table 1A screening for 316L plate",
    maxTempF: 1500,
    maxTempC: 816,
    densityKgM3: 8000,
    curve: SA240_316L_CURVE,
  },
  "SA-240-304L": {
    id: "SA-240-304L",
    label: "SA-240 304L (Austenitic SS)",
    shortLabel: "SA-240 304L",
    description: "ASME II-D Table 1A screening for 304L plate",
    maxTempF: 1500,
    maxTempC: 816,
    densityKgM3: 8000,
    curve: SA240_304L_CURVE,
  },
  "SA-387-11": {
    id: "SA-387-11",
    label: "SA-387 Gr.11 Cl.2 (1¼Cr–½Mo)",
    shortLabel: "SA-387 Gr.11",
    description: "ASME II-D Table 1A screening for Cr-Mo alloy plate",
    maxTempF: 1100,
    maxTempC: 593,
    densityKgM3: 7850,
    curve: SA387_11_CURVE,
  },
  "SA-106-B": {
    id: "SA-106-B",
    label: "SA-106 Gr.B (Carbon Steel Pipe)",
    shortLabel: "SA-106 Gr.B",
    description: "ASME II-D Table 1A screening for CS seamless pipe (nozzle necks)",
    maxTempF: 1000,
    maxTempC: 538,
    densityKgM3: 7850,
    curve: SA516_70_CURVE,
  },
  "SA-312-316L": {
    id: "SA-312-316L",
    label: "SA-312 TP316L (Austenitic SS Pipe)",
    shortLabel: "SA-312 TP316L",
    description: "ASME II-D Table 1A screening for 316L pipe (nozzle necks)",
    maxTempF: 1500,
    maxTempC: 816,
    densityKgM3: 8000,
    curve: SA240_316L_CURVE,
  },
};

export const ASME_VIII_SHELL_MATERIAL_IDS: AsmeViiiShellMaterialId[] = [
  "SA-516-70",
  "SA-240-316L",
];

export const ASME_VIII_NOZZLE_MATERIAL_IDS: AsmeViiiNozzleMaterialId[] = [
  "SA-106-B",
  "SA-312-316L",
];

export const ASME_VIII_HEAD_MATERIAL_IDS: AsmeViiiHeadMaterialId[] = [
  "SA-516-70",
  "SA-240-316L",
  "SA-240-304L",
  "SA-387-11",
];

export function isAsmeViiiHeadMaterialId(
  value: string,
): value is AsmeViiiHeadMaterialId {
  return value in ASME_VIII_HEAD_MATERIALS;
}

export function normalizeAsmeViiiHeadMaterialId(
  raw: string | undefined | null,
): AsmeViiiHeadMaterialId {
  if (!raw) return "SA-516-70";
  const key = raw.trim().replace(/_/g, "-").toUpperCase();
  const aliases: Record<string, AsmeViiiHeadMaterialId> = {
    "SA-516-70": "SA-516-70",
    "SA516-70": "SA-516-70",
    "SA-516GR70": "SA-516-70",
    "A516-70": "SA-516-70",
    "A516GR70": "SA-516-70",
    "SA-240-316L": "SA-240-316L",
    "SA240-316L": "SA-240-316L",
    "316L": "SA-240-316L",
    "SA-240-304L": "SA-240-304L",
    "SA240-304L": "SA-240-304L",
    "304L": "SA-240-304L",
    "SA-387-11": "SA-387-11",
    "SA387-11": "SA-387-11",
    "SA-387GR11": "SA-387-11",
    "SA-106-B": "SA-106-B",
    "SA106-B": "SA-106-B",
    "SA-106B": "SA-106-B",
    "A106-B": "SA-106-B",
    "A106B": "SA-106-B",
    "SA-312-316L": "SA-312-316L",
    "SA312-316L": "SA-312-316L",
    "TP316L": "SA-312-316L",
  };
  const compact = key.replace(/\s+/g, "");
  return aliases[compact] ?? aliases[key] ?? "SA-516-70";
}

export function isAsmeViiiShellMaterialId(
  value: string,
): value is AsmeViiiShellMaterialId {
  return value === "SA-516-70" || value === "SA-240-316L";
}

export function isAsmeViiiNozzleMaterialId(
  value: string,
): value is AsmeViiiNozzleMaterialId {
  return value === "SA-106-B" || value === "SA-312-316L";
}

export function normalizeAsmeViiiShellMaterialId(
  raw: string | undefined | null,
): AsmeViiiShellMaterialId {
  const id = normalizeAsmeViiiHeadMaterialId(raw);
  return isAsmeViiiShellMaterialId(id) ? id : "SA-516-70";
}

export function normalizeAsmeViiiNozzleMaterialId(
  raw: string | undefined | null,
): AsmeViiiNozzleMaterialId {
  const id = normalizeAsmeViiiHeadMaterialId(raw);
  return isAsmeViiiNozzleMaterialId(id) ? id : "SA-106-B";
}

function interpolateKsi(curve: AsmeViiiStressPoint[], tempF: number): number {
  if (!curve.length) return NaN;
  if (tempF <= curve[0].tempF) return curve[0].stressKsi;
  const last = curve[curve.length - 1];
  if (tempF >= last.tempF) return last.stressKsi;
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i];
    const b = curve[i + 1];
    if (tempF >= a.tempF && tempF <= b.tempF) {
      const span = b.tempF - a.tempF;
      if (span <= 0) return a.stressKsi;
      const t = (tempF - a.tempF) / span;
      return a.stressKsi + t * (b.stressKsi - a.stressKsi);
    }
  }
  return last.stressKsi;
}

export function celsiusToFahrenheit(tempC: number): number {
  return (tempC * 9) / 5 + 32;
}

export function fahrenheitToCelsius(tempF: number): number {
  return ((tempF - 32) * 5) / 9;
}

/**
 * Allowable stress S at design metal temperature.
 * @returns MPa when unitSystem is metric, psi when imperial.
 */
export function getAsmeViiiAllowableStress(
  materialId: AsmeViiiHeadMaterialId,
  designTemp: number,
  unitSystem: "metric" | "imperial",
): number {
  const material = ASME_VIII_HEAD_MATERIALS[materialId];
  const tempF =
    unitSystem === "imperial" ? designTemp : celsiusToFahrenheit(designTemp);
  const ksi = interpolateKsi(material.curve, tempF);
  if (!Number.isFinite(ksi)) return NaN;
  return unitSystem === "imperial" ? ksi * KSI_TO_PSI : ksi * KSI_TO_MPA;
}

export function getAsmeViiiAllowableStressMpa(
  materialId: AsmeViiiHeadMaterialId,
  tempC: number,
): number {
  return getAsmeViiiAllowableStress(materialId, tempC, "metric");
}

export function getAsmeViiiAllowableStressPsi(
  materialId: AsmeViiiHeadMaterialId,
  tempF: number,
): number {
  return getAsmeViiiAllowableStress(materialId, tempF, "imperial");
}
