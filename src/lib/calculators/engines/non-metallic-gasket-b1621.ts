/**
 * Non-metallic flat gasket dimensions & App. 2 seating load — ASME B16.21
 * geometry from B16.5 flangeDimension.json; m,y from VIII-1 App. 2 screening table.
 *
 * IBC (ring): OD = raised-face diameter · ID = B36 pipe OD
 * Full face: OD = flange OD · ID = pipe OD · holes from B16.5 bolting
 * B16.47 Series A/B not in Phase-1 extract → invalid with warn
 */

import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  getFlangeDimensionEntry,
  getPipeScheduleSize,
  listFlangeClassesForNps,
  listFlangeNps,
} from "@/lib/data/loaders";
import materialsRaw from "../../../../data/piping/asme-b16-21-flat-gaskets.json";

export type B1621FlangeStandard = "b16.5" | "b16.47-a" | "b16.47-b";
export type B1621GasketProfile = "ibc" | "full-face";
export type B1621MaterialId =
  | "compressed-elastomer-sheet"
  | "ptfe-ePTFE"
  | "flexible-graphite"
  | "neoprene-rubber";
export type B1621ThicknessId = "1.5" | "3.2";

export type NonMetallicGasketB1621Inputs = {
  unitSystem: UnitSystem;
  flangeStandard: B1621FlangeStandard;
  nps: string;
  pressureClass: string;
  gasketProfile: B1621GasketProfile;
  materialId: B1621MaterialId;
  thicknessId: B1621ThicknessId;
  /**
   * Design pressure — bar (metric) or psi (imperial).
   * Named `pressure` (not designPressure) so url-sync companion convert uses bar↔psi.
   */
  pressure: number;
};

type MaterialRow = {
  id: B1621MaterialId;
  label: string;
  m: number;
  yPsi: number;
  tempLimitC: number;
  notes: string;
};

type ThicknessRow = {
  id: B1621ThicknessId;
  labelMetric: string;
  labelImperial: string;
  mm: number;
};

const META = materialsRaw as {
  materials: MaterialRow[];
  thicknesses: ThicknessRow[];
};

const MM_PER_IN = 25.4;
const N_PER_LBF = 4.448221615;
const MPA_PER_PSI = 0.006894757293;

/** Phase-1 UI offers B16.5 only; B16.47 stays in the type for URL deserialize → invalid. */
export const B1621_FLANGE_STANDARD_OPTIONS: {
  value: B1621FlangeStandard;
  label: string;
}[] = [{ value: "b16.5", label: "ASME B16.5 (NPS ½–24)" }];

export const B1621_PROFILE_OPTIONS: {
  value: B1621GasketProfile;
  label: string;
}[] = [
  { value: "ibc", label: "IBC ring (RF / flat face ring)" },
  { value: "full-face", label: "Full face (FF with bolt holes)" },
];

export const B1621_MATERIAL_OPTIONS = META.materials.map((m) => ({
  value: m.id,
  label: m.label,
}));

export function listB1621ThicknessOptions(
  unitSystem: UnitSystem,
): { value: B1621ThicknessId; label: string }[] {
  return META.thicknesses.map((t) => ({
    value: t.id,
    label:
      unitSystem === "imperial"
        ? `${t.labelImperial} (${t.labelMetric})`
        : `${t.labelMetric} (${t.labelImperial})`,
  }));
}

/** @deprecated Prefer listB1621ThicknessOptions(unitSystem) */
export const B1621_THICKNESS_OPTIONS = listB1621ThicknessOptions("metric");

export const B1621_CLASS_OPTIONS = ["150", "300", "400", "600", "900"] as const;

export function resolveB1621Material(id: B1621MaterialId): MaterialRow {
  return META.materials.find((m) => m.id === id) ?? META.materials[0]!;
}

export function resolveB1621Thickness(id: B1621ThicknessId): ThicknessRow {
  return META.thicknesses.find((t) => t.id === id) ?? META.thicknesses[0]!;
}

export function listB1621NpsOptions(): { value: string; label: string }[] {
  return listFlangeNps().map((f) => ({
    value: f.nps,
    label: `${f.npsLabel} (DN ${f.dn})`,
  }));
}

export function listB1621ClassOptions(nps: string): {
  value: string;
  label: string;
}[] {
  const allowed = new Set<string>(B1621_CLASS_OPTIONS);
  return listFlangeClassesForNps(nps)
    .filter((r) => allowed.has(String(r.class)))
    .map((r) => ({ value: String(r.class), label: `Class ${r.class}` }));
}

export const DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS: NonMetallicGasketB1621Inputs =
  {
    unitSystem: "metric",
    flangeStandard: "b16.5",
    nps: "4",
    pressureClass: "150",
    gasketProfile: "ibc",
    materialId: "compressed-elastomer-sheet",
    thicknessId: "1.5",
    pressure: 10,
  };

export const DEFAULT_NON_METALLIC_GASKET_B1621_INPUTS_IMPERIAL: NonMetallicGasketB1621Inputs =
  {
    unitSystem: "imperial",
    flangeStandard: "b16.5",
    nps: "3",
    pressureClass: "150",
    gasketProfile: "ibc",
    materialId: "flexible-graphite",
    thicknessId: "1.5",
    pressure: 150,
  };

function finite(v: number, fallback = 0): number {
  return Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, finite(v)));
}

function pressureToMPa(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial"
    ? finite(value) * MPA_PER_PSI
    : finite(value) / 10; // bar → MPa
}

/**
 * ASME VIII-1 App. 2 effective seating width.
 * b0 ≤ 1/4 in → b = b0; else b = √b0 / 2 (inch basis).
 */
export function effectiveSeatingWidthMm(nMm: number): {
  nMm: number;
  b0Mm: number;
  bMm: number;
} {
  const n = Math.max(finite(nMm), 0);
  const b0Mm = n / 2;
  const b0In = b0Mm / MM_PER_IN;
  const bIn = b0In <= 0.25 ? b0In : 0.5 * Math.sqrt(Math.max(b0In, 1e-12));
  return { nMm: n, b0Mm, bMm: bIn * MM_PER_IN };
}

export type NonMetallicGasketB1621Detail = {
  invalid: boolean;
  invalidReason?: string;
  nps: string;
  pressureClass: string;
  flangeStandard: B1621FlangeStandard;
  profile: B1621GasketProfile;
  materialLabel: string;
  m: number;
  yPsi: number;
  yMPa: number;
  thicknessMm: number;
  odMm: number;
  idMm: number;
  areaMm2: number;
  nMm: number;
  b0Mm: number;
  bMm: number;
  gMm: number;
  wm2N: number;
  wm1N: number;
  designPressureMPa: number;
  boltCircleMm?: number;
  boltHoleCount?: number;
  boltHoleDiameterMm?: number;
  geometryNote: string;
};

export function computeNonMetallicGasketB1621(
  inputs: NonMetallicGasketB1621Inputs,
): NonMetallicGasketB1621Detail {
  const material = resolveB1621Material(inputs.materialId);
  const thickness = resolveB1621Thickness(inputs.thicknessId);
  const pMPa = clamp(
    pressureToMPa(inputs.pressure, inputs.unitSystem),
    0,
    100,
  );

  const base = {
    nps: inputs.nps,
    pressureClass: inputs.pressureClass,
    flangeStandard: inputs.flangeStandard,
    profile: inputs.gasketProfile,
    materialLabel: material.label,
    m: material.m,
    yPsi: material.yPsi,
    yMPa: material.yPsi * MPA_PER_PSI,
    thicknessMm: thickness.mm,
    designPressureMPa: pMPa,
  };

  if (inputs.flangeStandard !== "b16.5") {
    return {
      ...base,
      invalid: true,
      invalidReason:
        "ASME B16.47 Series A/B (NPS 26–60) is not in the Phase-1 flangeDimension extract. Use B16.5 NPS ½–24 or add B16.47 tables.",
      odMm: NaN,
      idMm: NaN,
      areaMm2: NaN,
      nMm: NaN,
      b0Mm: NaN,
      bMm: NaN,
      gMm: NaN,
      wm2N: NaN,
      wm1N: NaN,
      geometryNote: "B16.47 out of Phase-1 scope",
    };
  }

  const flange = getFlangeDimensionEntry(inputs.nps, inputs.pressureClass);
  const pipe = getPipeScheduleSize(inputs.nps);
  if (!flange || !pipe) {
    return {
      ...base,
      invalid: true,
      invalidReason: `No B16.5 / B36 row for NPS ${inputs.nps} Class ${inputs.pressureClass}`,
      odMm: NaN,
      idMm: NaN,
      areaMm2: NaN,
      nMm: NaN,
      b0Mm: NaN,
      bMm: NaN,
      gMm: NaN,
      wm2N: NaN,
      wm1N: NaN,
      geometryNote: "Missing flange or pipe OD",
    };
  }

  const idMm = pipe.outsideDiameterMm;
  const fullFace = inputs.gasketProfile === "full-face";
  const odMm = fullFace
    ? flange.rating.outsideDiameterMm
    : flange.rating.raisedFaceDiameterMm;

  if (!(odMm > idMm)) {
    return {
      ...base,
      invalid: true,
      invalidReason: "Gasket OD must exceed pipe OD for this NPS/class",
      odMm,
      idMm,
      areaMm2: NaN,
      nMm: NaN,
      b0Mm: NaN,
      bMm: NaN,
      gMm: NaN,
      wm2N: NaN,
      wm1N: NaN,
      geometryNote: "Invalid OD/ID",
    };
  }

  const areaMm2 = (Math.PI / 4) * (odMm * odMm - idMm * idMm);
  const { nMm, b0Mm, bMm } = effectiveSeatingWidthMm(odMm - idMm);
  const gMm = odMm - 2 * bMm;
  const yMPa = material.yPsi * MPA_PER_PSI;
  const wm2N = areaMm2 * yMPa; // N (mm² · N/mm²)
  const wm1N =
    (Math.PI / 4) * gMm * gMm * pMPa +
    2 * Math.PI * bMm * gMm * material.m * pMPa;

  return {
    ...base,
    invalid: false,
    odMm,
    idMm,
    areaMm2,
    nMm,
    b0Mm,
    bMm,
    gMm,
    wm2N,
    wm1N,
    yMPa,
    boltCircleMm: fullFace ? flange.rating.boltCircleMm : undefined,
    boltHoleCount: fullFace ? flange.rating.boltHoleCount : undefined,
    boltHoleDiameterMm: fullFace ? flange.rating.boltHoleDiameterMm : undefined,
    geometryNote: fullFace
      ? "B16.5 flange OD × B36 pipe OD · bolt circle/holes from B16.5"
      : "B16.5 raised-face OD × B36 pipe OD (B16.21 IBC ring proxy)",
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

export function calculateNonMetallicGasketB1621(
  inputs: NonMetallicGasketB1621Inputs,
): CalculatorOutput {
  const unitSystem = inputs.unitSystem === "imperial" ? "imperial" : "metric";
  const d = computeNonMetallicGasketB1621(inputs);
  const imperial = unitSystem === "imperial";

  if (d.invalid) {
    return {
      heroLabel: "Gasket OD × ID",
      heroValue: "—",
      heroStatus: d.invalidReason ?? "Invalid selection",
      heroStatusLevel: "warn",
      summary: [],
      rows: [],
      callouts: [
        {
          tone: "warn",
          title: "Lookup unavailable",
          body: d.invalidReason ?? "Select a valid B16.5 NPS and class.",
        },
      ],
      exportRows: [],
    };
  }

  const odDisp = imperial ? d.odMm / MM_PER_IN : d.odMm;
  const idDisp = imperial ? d.idMm / MM_PER_IN : d.idMm;
  const lenUnit = imperial ? "in" : "mm";
  const lenDigits = imperial ? 2 : 1;
  const areaCm2 = d.areaMm2 / 100;
  const areaDisp = imperial ? d.areaMm2 / (MM_PER_IN * MM_PER_IN) : areaCm2;
  const areaUnit = imperial ? "in²" : "cm²";
  const wm2Disp = imperial ? d.wm2N / N_PER_LBF : d.wm2N / 1000;
  const wm1Disp = imperial ? d.wm1N / N_PER_LBF : d.wm1N / 1000;
  const forceUnit = imperial ? "lbf" : "kN";
  const forceDigits = imperial ? 0 : 2;
  const yDisp = imperial ? d.yPsi : d.yMPa;
  const yUnit = imperial ? "psi" : "MPa";
  const bDisp = imperial ? d.bMm / MM_PER_IN : d.bMm;
  const thick = resolveB1621Thickness(inputs.thicknessId);

  const heroValue = `${fmt(odDisp, lenDigits)} × ${fmt(idDisp, lenDigits)} ${lenUnit}`;

  const callouts: CalculatorOutput["callouts"] = [];
  const classNum = Number(d.pressureClass);
  const coldFlowRisk =
    inputs.materialId === "ptfe-ePTFE" ||
    (Number.isFinite(classNum) && classNum >= 600);
  if (coldFlowRisk) {
    callouts.push({
      tone: "warn",
      title: "Prefer metallic gasket for this duty",
      body: "Class 600+ and PTFE cold-flow duties — prefer B16.20 spiral-wound with rings. Confirm OEM crush/creep charts before PO.",
    });
  } else {
    callouts.push({
      tone: "info",
      title: "B16.21 flat gasket screen + App. 2 Wm2",
      body: "Dimensions follow ASME B16.5 RF/FF geometry with B36 pipe OD. Wm2 = Agasket·y (VIII-1 App. 2). Confirm OEM B16.21 charts before PO. B16.47 NPS 26–60 not in Phase-1.",
    });
  }
  if (d.yPsi <= 0) {
    callouts.push({
      tone: "info",
      title: "Soft elastomer seating",
      body: "App. 2 soft rubber uses y ≈ 0, so Wm2 = 0. Operating load still uses m in Wm1.",
    });
  }
  if (inputs.gasketProfile === "full-face") {
    callouts.push({
      tone: "info",
      title: "Full-face bolt pattern",
      body: "Bolt circle, hole count, and hole diameter match the ASME B16.5 drilling template for this NPS/class.",
    });
  }

  const statusLabel = `${d.profile === "ibc" ? "IBC ring" : "Full face"} · Class ${d.pressureClass}`;
  const statusLevel: StatusLevel = "pass";

  return {
    heroLabel: "Gasket OD × ID",
    heroValue,
    heroStatus: statusLabel,
    heroStatusLevel: statusLevel,
    heroBadges: [
      {
        label: "Wm2",
        value: `${fmt(wm2Disp, forceDigits)} ${forceUnit}`,
      },
      { label: "m · y", value: `${fmt(d.m, 1)} · ${fmt(yDisp, imperial ? 0 : 2)} ${yUnit}` },
    ],
    summary: [
      {
        label: "Contact area Ag",
        value: `${fmt(areaDisp, imperial ? 2 : 1)} ${areaUnit}`,
      },
      {
        label: "Effective width b",
        value: `${fmt(bDisp, imperial ? 3 : 2)} ${lenUnit}`,
      },
      {
        label: "Wm1 (op.)",
        value: `${fmt(wm1Disp, forceDigits)} ${forceUnit}`,
      },
    ],
    summaryStatus: { label: statusLabel, level: "neutral" },
    rows: [
      {
        section: "Geometry",
        label: "OD · ID · thickness",
        value: `${fmt(odDisp, lenDigits)} · ${fmt(idDisp, lenDigits)} ${lenUnit} · ${imperial ? thick.labelImperial : thick.labelMetric}`,
        emphasis: true,
      },
      {
        section: "App. 2 loads",
        label: "Wm2 · Wm1",
        value: `${fmt(wm2Disp, forceDigits)} · ${fmt(wm1Disp, forceDigits)} ${forceUnit}`,
        emphasis: true,
      },
      ...(d.boltCircleMm != null
        ? [
            {
              section: "Full face bolting",
              label: "BCD · holes · hole Ø",
              value: `${fmt(imperial ? d.boltCircleMm / MM_PER_IN : d.boltCircleMm, lenDigits)} ${lenUnit} · ${d.boltHoleCount} × ${fmt(imperial ? (d.boltHoleDiameterMm ?? 0) / MM_PER_IN : (d.boltHoleDiameterMm ?? 0), lenDigits)} ${lenUnit}`,
            },
          ]
        : []),
    ],
    callouts,
    exportRows: [
      { label: "Unit system", value: unitSystem },
      { label: "Flange standard", value: d.flangeStandard },
      { label: "NPS", value: d.nps },
      { label: "Class", value: d.pressureClass },
      { label: "Profile", value: d.profile },
      { label: "Material", value: d.materialLabel },
      { label: "m", value: fmt(d.m, 2) },
      { label: `y (${yUnit})`, value: fmt(yDisp, 3) },
      { label: "Thickness", value: imperial ? thick.labelImperial : thick.labelMetric },
      { label: `OD (${lenUnit})`, value: fmt(odDisp, 3) },
      { label: `ID (${lenUnit})`, value: fmt(idDisp, 3) },
      { label: `Ag (${areaUnit})`, value: fmt(areaDisp, 3) },
      { label: `N (${lenUnit})`, value: fmt(imperial ? d.nMm / MM_PER_IN : d.nMm, 3) },
      { label: `b0 (${lenUnit})`, value: fmt(imperial ? d.b0Mm / MM_PER_IN : d.b0Mm, 3) },
      { label: `b (${lenUnit})`, value: fmt(bDisp, 3) },
      { label: `G (${lenUnit})`, value: fmt(imperial ? d.gMm / MM_PER_IN : d.gMm, 3) },
      { label: `Wm2 (${forceUnit})`, value: fmt(wm2Disp, 3) },
      { label: `Wm1 (${forceUnit})`, value: fmt(wm1Disp, 3) },
      { label: "Geometry note", value: d.geometryNote },
      ...(d.boltCircleMm != null
        ? [
            {
              label: `Bolt circle (${lenUnit})`,
              value: fmt(imperial ? d.boltCircleMm / MM_PER_IN : d.boltCircleMm, 3),
            },
            { label: "Bolt holes", value: String(d.boltHoleCount) },
            {
              label: `Hole Ø (${lenUnit})`,
              value: fmt(
                imperial
                  ? (d.boltHoleDiameterMm ?? 0) / MM_PER_IN
                  : (d.boltHoleDiameterMm ?? 0),
                3,
              ),
            },
          ]
        : []),
    ],
  };
}
