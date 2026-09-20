/**
 * Pipe Support Span — ASME B31.3 ¶321 screening with B31.1 T121.5–style chart compare.
 * Simply-supported uniform dead-weight beam: deflection + sustained bending (M ≈ wL²/10).
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  B36_CS_DENSITY_KG_M3,
  getSupportChartSpanM,
  supportChartServiceForFluid,
} from "@/lib/calculators/data/mssPipeSupportSpanData";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
  resolveScheduleOptionValue,
} from "@/lib/data/loaders";

export type PipeSupportFluidType = "water" | "gas" | "steam" | "empty";
export type PipeSupportMaterial =
  | "carbon_steel"
  | "stainless_304"
  | "stainless_316";

export type PipeSupportSpanInputs = {
  unitSystem: UnitSystem;
  nps: string;
  schedule: string;
  fluidType: PipeSupportFluidType;
  /** Insulation thickness — mm (metric) or in (imperial). */
  insulationThickness: number;
  /** Max mid-span deflection — mm (metric) or in (imperial). */
  allowableDeflection: number;
  material: PipeSupportMaterial;
};

export const INSULATION_THICKNESS_RANGE = { min: 0, max: 200 } as const;
export const ALLOWABLE_DEFLECTION_RANGE_MM = { min: 1, max: 50 } as const;
export const ALLOWABLE_DEFLECTION_RANGE_IN = { min: 0.04, max: 2 } as const;

export const PIPE_SUPPORT_MATERIAL_OPTIONS: Array<{
  id: PipeSupportMaterial;
  label: string;
  eGpa: number;
  densityKgM3: number;
  /** Basic allowable Sh at ambient screening (MPa). */
  shMpa: number;
}> = [
  {
    id: "carbon_steel",
    label: "Carbon steel (E = 200 GPa)",
    eGpa: 200,
    densityKgM3: 7850,
    shMpa: 138,
  },
  {
    id: "stainless_304",
    label: "Stainless 304 (E = 193 GPa)",
    eGpa: 193,
    densityKgM3: 8000,
    shMpa: 138,
  },
  {
    id: "stainless_316",
    label: "Stainless 316 (E = 193 GPa)",
    eGpa: 193,
    densityKgM3: 8000,
    shMpa: 138,
  },
];

export const PIPE_SUPPORT_FLUID_OPTIONS: Array<{
  id: PipeSupportFluidType;
  label: string;
  densityKgM3: number;
}> = [
  { id: "water", label: "Water (1000 kg/m³)", densityKgM3: 1000 },
  { id: "steam", label: "Steam (~2.5 kg/m³ screening)", densityKgM3: 2.5 },
  { id: "gas", label: "Gas / air (~1.2 kg/m³)", densityKgM3: 1.2 },
  { id: "empty", label: "Empty (no fluid)", densityKgM3: 0 },
];

/** Mineral-wool-class insulation density for annular weight screening. */
export const INSULATION_DENSITY_KG_M3 = 120;

export const DEFAULT_PIPE_SUPPORT_SPAN_INPUTS: PipeSupportSpanInputs = {
  unitSystem: "metric",
  nps: "4",
  schedule: "40",
  fluidType: "water",
  insulationThickness: 0,
  allowableDeflection: 12.7,
  material: "carbon_steel",
};

export const DEFAULT_PIPE_SUPPORT_SPAN_INPUTS_IMPERIAL: PipeSupportSpanInputs = {
  unitSystem: "imperial",
  nps: "4",
  schedule: "40",
  fluidType: "water",
  insulationThickness: 0,
  allowableDeflection: 0.5,
  material: "carbon_steel",
};

const G = 9.80665;

export type PipeSupportGoverning =
  | "deflection"
  | "stress"
  | "chart";

export type PipeSupportSpanComputed = {
  invalid: boolean;
  invalidReason?: string;
  nps: string;
  dn: number;
  schedule: string;
  fluidType: PipeSupportFluidType;
  material: PipeSupportMaterial;
  odMm: number;
  idMm: number;
  tMm: number;
  iM4: number;
  zM3: number;
  ePa: number;
  sAllowPa: number;
  yMaxM: number;
  wPipeKgM: number;
  wFluidKgM: number;
  wInsKgM: number;
  wTotalKgM: number;
  /** Deflection-limited span (simply supported, y ≤ y_max). */
  lDefM: number;
  /** Stress-limited span (M ≈ wL²/10, σ ≤ S_allow). */
  lStrM: number;
  /** Beam-theory limit min(L_def, L_str). */
  lBeamM: number;
  /** B31.1 Table 121.5–style chart span (null if NPS not tabulated). */
  lChartM: number | null;
  /** Layout recommendation min(L_beam, L_chart). */
  lRecommendM: number;
  governing: PipeSupportGoverning;
  beamGoverning: "deflection" | "stress";
  yAtRecommendM: number;
};

function normalizeNps(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/"/g, "").replace(/in$/, "");
  return t || "4";
}

function materialPreset(id: PipeSupportMaterial) {
  return (
    PIPE_SUPPORT_MATERIAL_OPTIONS.find((m) => m.id === id) ??
    PIPE_SUPPORT_MATERIAL_OPTIONS[0]
  );
}

function fluidDensity(id: PipeSupportFluidType): number {
  return (
    PIPE_SUPPORT_FLUID_OPTIONS.find((f) => f.id === id)?.densityKgM3 ?? 0
  );
}

function clampInsulation(raw: number, imperial: boolean): number {
  const max = imperial
    ? INSULATION_THICKNESS_RANGE.max / 25.4
    : INSULATION_THICKNESS_RANGE.max;
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.min(max, raw);
}

function clampDeflection(raw: number, imperial: boolean): number {
  const range = imperial
    ? ALLOWABLE_DEFLECTION_RANGE_IN
    : ALLOWABLE_DEFLECTION_RANGE_MM;
  if (!Number.isFinite(raw)) return imperial ? 0.5 : 12.7;
  return Math.min(range.max, Math.max(range.min, raw));
}

export function computePipeSupportSpan(
  inputs: PipeSupportSpanInputs,
): PipeSupportSpanComputed {
  const imperial = inputs.unitSystem === "imperial";
  const nps = normalizeNps(inputs.nps);
  const scheduleRaw =
    inputs.schedule?.trim() || defaultScheduleForNps(nps) || "40";
  const schedule =
    resolveScheduleOptionValue(nps, scheduleRaw) || scheduleRaw;
  const material = inputs.material;
  const fluidType = inputs.fluidType;
  const mat = materialPreset(material);
  const entry = getPipeScheduleEntry(nps, schedule);
  const lChartM = getSupportChartSpanM(
    nps,
    supportChartServiceForFluid(fluidType),
  );

  const insDisp = clampInsulation(inputs.insulationThickness, imperial);
  const yDisp = clampDeflection(inputs.allowableDeflection, imperial);
  const insMm = imperial ? insDisp * 25.4 : insDisp;
  const yMaxM = imperial ? yDisp * 0.0254 : yDisp / 1000;

  const empty = (reason: string): PipeSupportSpanComputed => ({
    invalid: true,
    invalidReason: reason,
    nps,
    dn: entry?.pipe.dn ?? NaN,
    schedule,
    fluidType,
    material,
    odMm: NaN,
    idMm: NaN,
    tMm: NaN,
    iM4: NaN,
    zM3: NaN,
    ePa: mat.eGpa * 1e9,
    sAllowPa: 0.5 * mat.shMpa * 1e6,
    yMaxM,
    wPipeKgM: NaN,
    wFluidKgM: NaN,
    wInsKgM: NaN,
    wTotalKgM: NaN,
    lDefM: NaN,
    lStrM: NaN,
    lBeamM: NaN,
    lChartM,
    lRecommendM: NaN,
    governing: "deflection",
    beamGoverning: "deflection",
    yAtRecommendM: NaN,
  });

  if (!entry) {
    return empty("Select a valid NPS and schedule from ASME B36 tables");
  }

  const odMm = entry.pipe.outsideDiameterMm;
  const idMm = entry.row.insideDiameterMm;
  const tMm = entry.row.wallThicknessMm;
  if (!(odMm > 0) || !(idMm > 0) || idMm >= odMm) {
    return empty("Pipe OD/ID geometry is invalid for this schedule");
  }
  if (!(yMaxM > 0)) {
    return empty("Allowable deflection must be greater than zero");
  }

  const odM = odMm / 1000;
  const idM = idMm / 1000;
  const iM4 = (Math.PI / 64) * (odM ** 4 - idM ** 4);
  const zM3 = (2 * iM4) / odM;
  const ePa = mat.eGpa * 1e9;
  const sAllowPa = 0.5 * mat.shMpa * 1e6;

  // B36 tabulated weights are carbon-steel; scale for stainless density.
  const areaSteel = (Math.PI / 4) * (odM ** 2 - idM ** 2);
  const wPipeCsKgM =
    entry.row.weightKgPerM > 0
      ? entry.row.weightKgPerM
      : B36_CS_DENSITY_KG_M3 * areaSteel;
  const wPipeKgM = wPipeCsKgM * (mat.densityKgM3 / B36_CS_DENSITY_KG_M3);

  const rhoFluid = fluidDensity(fluidType);
  const wFluidKgM = rhoFluid * (Math.PI / 4) * idM ** 2;

  const odOuterInsM = odM + 2 * (insMm / 1000);
  const wInsKgM =
    insMm > 0
      ? INSULATION_DENSITY_KG_M3 *
        (Math.PI / 4) *
        (odOuterInsM ** 2 - odM ** 2)
      : 0;

  const wTotalKgM = wPipeKgM + wFluidKgM + wInsKgM;
  if (!(wTotalKgM > 0) || !(iM4 > 0) || !(zM3 > 0)) {
    return empty("Total unit weight or section properties are invalid");
  }

  const wNm = wTotalKgM * G;
  const lDefM = Math.pow((384 * ePa * iM4 * yMaxM) / (5 * wNm), 0.25);
  const lStrM = Math.sqrt((10 * zM3 * sAllowPa) / wNm);
  const lBeamM = Math.min(lDefM, lStrM);
  const beamGoverning: "deflection" | "stress" =
    lDefM <= lStrM ? "deflection" : "stress";

  const lRecommendM =
    lChartM != null && Number.isFinite(lChartM)
      ? Math.min(lBeamM, lChartM)
      : lBeamM;

  let governing: PipeSupportGoverning = beamGoverning;
  if (
    lChartM != null &&
    Number.isFinite(lChartM) &&
    lRecommendM <= lChartM + 1e-9 &&
    lChartM < lBeamM - 1e-9
  ) {
    governing = "chart";
  }

  const yAtRecommendM =
    (5 * wNm * lRecommendM ** 4) / (384 * ePa * iM4);

  return {
    invalid: false,
    nps,
    dn: entry.pipe.dn,
    schedule,
    fluidType,
    material,
    odMm,
    idMm,
    tMm,
    iM4,
    zM3,
    ePa,
    sAllowPa,
    yMaxM,
    wPipeKgM,
    wFluidKgM,
    wInsKgM,
    wTotalKgM,
    lDefM,
    lStrM,
    lBeamM,
    lChartM,
    lRecommendM,
    governing,
    beamGoverning,
    yAtRecommendM,
  };
}

function fmtSpan(m: number, imperial: boolean): string {
  const ft = m / 0.3048;
  return imperial
    ? `${ft.toFixed(2)} ft (${m.toFixed(2)} m)`
    : `${m.toFixed(2)} m (${ft.toFixed(2)} ft)`;
}

function fmtWeight(kgM: number, imperial: boolean): string {
  const lbFt = kgM * 0.671968975;
  return imperial
    ? `${lbFt.toFixed(2)} lb/ft (${kgM.toFixed(2)} kg/m)`
    : `${kgM.toFixed(2)} kg/m (${lbFt.toFixed(2)} lb/ft)`;
}

function fmtDeflection(m: number, imperial: boolean): string {
  const mm = m * 1000;
  const inch = mm / 25.4;
  return imperial
    ? `${inch.toFixed(3)} in (${mm.toFixed(2)} mm)`
    : `${mm.toFixed(2)} mm (${inch.toFixed(3)} in)`;
}

function governingLabel(g: PipeSupportGoverning): string {
  if (g === "chart") return "Chart limited";
  if (g === "stress") return "Stress limited";
  return "Deflection limited";
}

function fmtWeightBreakdown(
  c: PipeSupportSpanComputed,
  imperial: boolean,
): string {
  const total = fmtWeight(c.wTotalKgM, imperial);
  const unit = imperial ? "lb/ft" : "kg/m";
  const pipe = imperial
    ? (c.wPipeKgM * 0.671968975).toFixed(2)
    : c.wPipeKgM.toFixed(2);
  const fluid = imperial
    ? (c.wFluidKgM * 0.671968975).toFixed(2)
    : c.wFluidKgM.toFixed(2);
  const ins = imperial
    ? (c.wInsKgM * 0.671968975).toFixed(2)
    : c.wInsKgM.toFixed(2);
  return `${total} · pipe ${pipe} + fluid ${fluid} + ins ${ins} ${unit}`;
}

export function calculatePipeSupportSpan(
  inputs: PipeSupportSpanInputs,
): CalculatorOutput {
  const c = computePipeSupportSpan(inputs);
  const imperial = inputs.unitSystem === "imperial";

  // One callout max: long dual cards were the main result-panel height cost.
  const callouts: ResultCallout[] = [];
  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Check pipe / support inputs",
      body: c.invalidReason,
    });
  } else if (c.governing === "chart" && c.lChartM != null) {
    callouts.push({
      tone: "warn",
      title: "Chart span governs",
      body: `Layout uses B31.1 T121.5–style chart (${fmtSpan(c.lChartM, imperial)}); beam theory allows ${fmtSpan(c.lBeamM, imperial)}. Shorten near valves, elbows, and vibration (B31.3 ¶321).`,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Screening Note",
      body: "Uniform dead weight · L_def simply supported · L_str with M ≈ wL²/10 · L_rec = min(beam, B31.1 T121.5–style chart). Shorten near concentrated loads and elbows (B31.3 ¶321).",
    });
  }

  const heroValue = c.invalid
    ? "—"
    : imperial
      ? `${(c.lRecommendM / 0.3048).toFixed(2)} ft · ${c.lRecommendM.toFixed(2)} m`
      : `${c.lRecommendM.toFixed(2)} m · ${(c.lRecommendM / 0.3048).toFixed(2)} ft`;

  const heroStatus = c.invalid ? "Check inputs" : governingLabel(c.governing);
  const heroStatusLevel: StatusLevel = c.invalid
    ? "fail"
    : c.governing === "chart"
      ? "warn"
      : "pass";

  // Lean rows (~4–5): span limits + chart + weight. No L_beam / Z·E / per-part weight echo.
  // L_beam and I live in hero badges; full breakdown stays in exportRows.
  const rows: ResultRow[] = [];
  if (!c.invalid) {
    rows.push(
      {
        section: "Spans",
        label: "Deflection-limited L_def",
        value: fmtSpan(c.lDefM, imperial),
        emphasis: c.beamGoverning === "deflection" && c.governing !== "chart",
      },
      {
        section: "Spans",
        label: "Stress-limited L_str",
        value: fmtSpan(c.lStrM, imperial),
        emphasis: c.beamGoverning === "stress" && c.governing !== "chart",
      },
      {
        section: "Spans",
        label: "B31.1 chart span",
        value:
          c.lChartM != null
            ? fmtSpan(c.lChartM, imperial)
            : "— (NPS not in chart)",
        emphasis: c.governing === "chart",
      },
      {
        section: "Load",
        label: "Total linear weight w_total",
        value: fmtWeightBreakdown(c, imperial),
        emphasis: true,
      },
    );
    // y at L_rec is only informative when chart (or stress) governs — otherwise y ≈ y_max.
    if (c.governing !== "deflection") {
      rows.push({
        section: "Load",
        label: "Mid-span y at recommended span",
        value: fmtDeflection(c.yAtRecommendM, imperial),
      });
    }
  }

  const sizeBadge = imperial
    ? { label: "NPS", value: `${c.nps} / Sch ${c.schedule}` }
    : {
        label: "DN",
        value: Number.isFinite(c.dn)
          ? `${c.dn} / Sch ${c.schedule}`
          : `NPS ${c.nps} / Sch ${c.schedule}`,
      };

  const badges = c.invalid
    ? undefined
    : [
        sizeBadge,
        {
          label: "Governing",
          value: governingLabel(c.governing),
        },
        {
          label: "L_beam",
          value: imperial
            ? `${(c.lBeamM / 0.3048).toFixed(2)} ft`
            : `${c.lBeamM.toFixed(2)} m`,
        },
        {
          label: "w_total",
          value: imperial
            ? `${(c.wTotalKgM * 0.671968975).toFixed(2)} lb/ft`
            : `${c.wTotalKgM.toFixed(2)} kg/m`,
        },
      ];

  return {
    heroLabel: "Recommended support span",
    heroValue,
    heroStatus,
    heroStatusLevel,
    heroBadges: badges,
    summary: badges ?? [],
    summaryStatus: {
      label: heroStatus,
      level: heroStatusLevel,
    },
    rows,
    callouts,
    exportRows: [
      {
        label: "Standard",
        value: "ASME B31.3 ¶321 · B31.1 Table 121.5–style chart",
      },
      { label: "NPS", value: c.nps },
      { label: "DN", value: Number.isFinite(c.dn) ? String(c.dn) : "—" },
      { label: "Schedule", value: c.schedule },
      { label: "Fluid", value: c.fluidType },
      { label: "Material", value: c.material },
      {
        label: "L_recommend m",
        value: c.invalid ? "—" : c.lRecommendM.toFixed(4),
      },
      {
        label: "L_recommend ft",
        value: c.invalid ? "—" : (c.lRecommendM / 0.3048).toFixed(4),
      },
      {
        label: "L_beam m",
        value: c.invalid ? "—" : c.lBeamM.toFixed(4),
      },
      {
        label: "L_def m",
        value: c.invalid ? "—" : c.lDefM.toFixed(4),
      },
      {
        label: "L_str m",
        value: c.invalid ? "—" : c.lStrM.toFixed(4),
      },
      {
        label: "L_chart m",
        value: c.lChartM != null ? c.lChartM.toFixed(4) : "—",
      },
      {
        label: "w_total kg/m",
        value: c.invalid ? "—" : c.wTotalKgM.toFixed(4),
      },
      {
        label: "Governing",
        value: c.invalid ? "—" : c.governing,
      },
    ],
  };
}
