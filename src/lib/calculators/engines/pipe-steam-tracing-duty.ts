/**
 * Pipe Steam / Heat Tracing Duty & Steam Consumption — ISO 12241 / Spirax-style screening.
 *
 * Heat loss reuses ASTM C680 / ISO 12241 radial insulation solve
 * (`computeInsulationHeatLoss`). Saturated latent heat h_fg from IAPWS-IF97
 * (`computeSteamPropertiesIapws`). Steam mass flow:
 *   m_steam = (Q_loss · F_safety · 3.6) / h_fg     [kg/(h·m)]
 *
 * Tracer line count uses a contact-capacity screen (no heat-transfer cement):
 *   Q_cap ≈ K_tracer · (T_sat − T_maint)            [W/m per tube]
 * Cement can raise capacity ~3–4× (info callout only — not auto-applied).
 *
 * Screening only — confirm OEM tracer charts, trap spacing, and loop length.
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  computeInsulationHeatLoss,
  type InsulationMaterial,
} from "@/lib/calculators/engines/insulation-heat-loss";
import { computeSteamPropertiesIapws } from "@/lib/calculators/engines/steam-properties-iapws";

export type TracingInsulationMaterial =
  | "mineral-wool"
  | "calcium-silicate"
  | "elastomeric";

export type TracerNps = "0.375" | "0.5" | "0.75";

export type PipeSteamTracingDutyInputs = {
  unitSystem: UnitSystem;
  nps: string;
  maintainTemp: number;
  ambientTemp: number;
  windSpeed: number;
  material: TracingInsulationMaterial;
  insulationThickness: number;
  tracerNps: TracerNps;
  /** Gauge pressure — bar.g (metric) or psig (imperial). */
  steamPressure: number;
};

export const TRACING_MATERIAL_OPTIONS: {
  value: TracingInsulationMaterial;
  label: string;
  shortLabel: string;
  /** Mapped ASTM-family k(T) used by insulation engine. */
  insulationEngineMaterial: InsulationMaterial;
}[] = [
  {
    value: "mineral-wool",
    label: "Mineral wool (ASTM C547)",
    shortLabel: "Mineral wool",
    insulationEngineMaterial: "mineral-wool",
  },
  {
    value: "calcium-silicate",
    label: "Calcium silicate (ASTM C533)",
    shortLabel: "Calcium silicate",
    insulationEngineMaterial: "calcium-silicate",
  },
  {
    value: "elastomeric",
    label: "Elastomeric foam (≈ ASTM C591 family)",
    shortLabel: "Elastomeric",
    insulationEngineMaterial: "polyurethane",
  },
];

export const TRACER_NPS_OPTIONS: {
  value: TracerNps;
  label: string;
  /** Contact capacity coefficient K [W/(m·K)] — bare copper tracer, no cement. */
  capacityKW: number;
}[] = [
  { value: "0.375", label: '⅜ in (NPS 0.375)', capacityKW: 0.35 },
  { value: "0.5", label: '½ in (NPS 0.5)', capacityKW: 0.45 },
  { value: "0.75", label: '¾ in (NPS 0.75)', capacityKW: 0.55 },
];

/** Safety factor for wind / mounting thermal resistance (Spirax-style 1.21–1.25). */
export const TRACING_SAFETY_FACTOR = 1.25;

export const ATM_BAR = 1.01325;
export const ATM_PSI = 14.696;

const W_PER_M_TO_BTU_HR_FT = 1.040014;
const KJ_KG_TO_BTU_LB = 1 / 2.326;

export const DEFAULT_PIPE_STEAM_TRACING_DUTY_INPUTS: PipeSteamTracingDutyInputs =
  {
    unitSystem: "metric",
    nps: "4",
    maintainTemp: 50,
    ambientTemp: -10,
    windSpeed: 5,
    material: "mineral-wool",
    insulationThickness: 50,
    tracerNps: "0.5",
    steamPressure: 3.5,
  };

export const DEFAULT_PIPE_STEAM_TRACING_DUTY_INPUTS_IMPERIAL: PipeSteamTracingDutyInputs =
  {
    unitSystem: "imperial",
    nps: "3",
    maintainTemp: 120,
    ambientTemp: 0,
    windSpeed: 11.2,
    material: "mineral-wool",
    insulationThickness: 2,
    tracerNps: "0.5",
    steamPressure: 50,
  };

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function finite(n: number, fallback: number) {
  return Number.isFinite(n) ? n : fallback;
}

function toInsulationMaterial(
  material: TracingInsulationMaterial,
): InsulationMaterial {
  return (
    TRACING_MATERIAL_OPTIONS.find((m) => m.value === material)
      ?.insulationEngineMaterial ?? "mineral-wool"
  );
}

function tracerCapacityK(tracerNps: TracerNps): number {
  return (
    TRACER_NPS_OPTIONS.find((t) => t.value === tracerNps)?.capacityKW ?? 0.45
  );
}

export function gaugeToAbsolutePressure(
  gauge: number,
  unitSystem: UnitSystem,
): number {
  return unitSystem === "imperial" ? gauge + ATM_PSI : gauge + ATM_BAR;
}

export type PipeSteamTracingDutyComputed = {
  invalid: boolean;
  invalidReason?: string;
  qLossWm: number;
  qBareWm: number;
  uOuterWm2K: number;
  hfgKjKg: number;
  tSatC: number;
  maintainTempC: number;
  ambientTempC: number;
  safetyFactor: number;
  dutyWm: number;
  /** kg/(h·m) */
  steamKgPerHPerM: number;
  /** kg/h per 100 m run */
  steamKgPerHPer100m: number;
  /** lb/(h·ft) */
  steamLbPerHPerFt: number;
  /** lb/h per 100 ft run */
  steamLbPerHPer100ft: number;
  tracerCapacityWm: number;
  tracerCount: number;
  odMm: number;
  r2M: number;
  kWmK: number;
  ho: number;
  materialWarn: string | null;
};

export function computePipeSteamTracingDuty(
  inputs: PipeSteamTracingDutyInputs,
): PipeSteamTracingDutyComputed {
  const materialMeta =
    TRACING_MATERIAL_OPTIONS.find((m) => m.value === inputs.material) ??
    TRACING_MATERIAL_OPTIONS[0];

  const pGauge = finite(inputs.steamPressure, 3.5);
  const pAbs = gaugeToAbsolutePressure(pGauge, inputs.unitSystem);

  const ins = computeInsulationHeatLoss({
    unitSystem: inputs.unitSystem,
    nps: inputs.nps,
    insulationThickness: inputs.insulationThickness,
    material: toInsulationMaterial(inputs.material),
    operatingTemp: inputs.maintainTemp,
    ambientTemp: inputs.ambientTemp,
    windSpeed: inputs.windSpeed,
    emissivity: 0.9,
  });

  const steam = computeSteamPropertiesIapws({
    unitSystem: inputs.unitSystem,
    pressure: pAbs,
    inputMode: "saturation",
    temperature: inputs.unitSystem === "imperial" ? 212 : 100,
    steamQuality: 1,
  });

  const empty = (reason: string): PipeSteamTracingDutyComputed => ({
    invalid: true,
    invalidReason: reason,
    qLossWm: 0,
    qBareWm: 0,
    uOuterWm2K: 0,
    hfgKjKg: NaN,
    tSatC: NaN,
    maintainTempC: ins.thC,
    ambientTempC: ins.taC,
    safetyFactor: TRACING_SAFETY_FACTOR,
    dutyWm: 0,
    steamKgPerHPerM: 0,
    steamKgPerHPer100m: 0,
    steamLbPerHPerFt: 0,
    steamLbPerHPer100ft: 0,
    tracerCapacityWm: 0,
    tracerCount: 1,
    odMm: ins.odMm,
    r2M: ins.r2M,
    kWmK: 0,
    ho: 0,
    materialWarn: ins.materialWarn,
  });

  if (ins.invalid) {
    return empty(
      "Enter maintain temperature above ambient with valid NPS and insulation thickness",
    );
  }
  if (steam.invalid || !(steam.hfgKjKg > 0) || !Number.isFinite(steam.tSatC)) {
    return empty(steam.invalidReason ?? "Could not evaluate saturated steam h_fg");
  }
  if (steam.tSatC <= ins.thC + 1e-6) {
    return empty(
      `Steam Tsat (${steam.tSatC.toFixed(1)} °C) must exceed maintain temperature (${ins.thC.toFixed(1)} °C)`,
    );
  }

  const F = TRACING_SAFETY_FACTOR;
  const dutyWm = ins.qWm * F;
  const steamKgPerHPerM = (dutyWm * 3.6) / steam.hfgKjKg;
  const steamKgPerHPer100m = steamKgPerHPerM * 100;
  const qBtuHrFt = ins.qWm * W_PER_M_TO_BTU_HR_FT;
  const hfgBtuLb = steam.hfgKjKg * KJ_KG_TO_BTU_LB;
  const steamLbPerHPerFt = (qBtuHrFt * F) / hfgBtuLb;
  const steamLbPerHPer100ft = steamLbPerHPerFt * 100;

  const dT = Math.max(steam.tSatC - ins.thC, 1);
  const tracerCapacityWm = tracerCapacityK(inputs.tracerNps) * dT;
  const tracerCount = Math.max(
    1,
    Math.ceil(dutyWm / Math.max(tracerCapacityWm, 1e-9) - 1e-9),
  );

  const deltaT = Math.max(ins.thC - ins.taC, 1e-9);
  const uOuterWm2K = ins.qWm / (2 * Math.PI * ins.r2M * deltaT);

  let materialWarn = ins.materialWarn;
  if (inputs.material === "elastomeric" && ins.thC > 105) {
    materialWarn =
      "Elastomeric foam continuous service is typically limited near ~105 °C — confirm manufacturer rating.";
  }

  return {
    invalid: false,
    qLossWm: ins.qWm,
    qBareWm: ins.qBareWm,
    uOuterWm2K,
    hfgKjKg: steam.hfgKjKg,
    tSatC: steam.tSatC,
    maintainTempC: ins.thC,
    ambientTempC: ins.taC,
    safetyFactor: F,
    dutyWm,
    steamKgPerHPerM,
    steamKgPerHPer100m,
    steamLbPerHPerFt,
    steamLbPerHPer100ft,
    tracerCapacityWm,
    tracerCount,
    odMm: ins.odMm,
    r2M: ins.r2M,
    kWmK: ins.kWmK,
    ho: ins.ho,
    materialWarn,
  };
}

function fmtHeatLoss(qWm: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(qWm) || qWm < 0) return "—";
  const btu = qWm * W_PER_M_TO_BTU_HR_FT;
  if (unitSystem === "imperial") {
    return `${btu.toFixed(1)} Btu/hr·ft · ${qWm.toFixed(1)} W/m`;
  }
  return `${qWm.toFixed(1)} W/m · ${btu.toFixed(1)} Btu/hr·ft`;
}

/** Primary-unit hero (short). Dual unit reserved for summary / condensate row. */
function fmtSteamHero(c: PipeSteamTracingDutyComputed, unitSystem: UnitSystem): string {
  if (c.invalid) return "—";
  if (unitSystem === "imperial") {
    return `${c.steamLbPerHPer100ft.toFixed(1)} lb/h per 100 ft`;
  }
  return `${c.steamKgPerHPer100m.toFixed(1)} kg/h per 100 m`;
}

function fmtSteamPer100(c: PipeSteamTracingDutyComputed, unitSystem: UnitSystem): string {
  if (c.invalid) return "—";
  if (unitSystem === "imperial") {
    return `${c.steamLbPerHPer100ft.toFixed(1)} lb/h per 100 ft · ${c.steamKgPerHPer100m.toFixed(1)} kg/h per 100 m`;
  }
  return `${c.steamKgPerHPer100m.toFixed(1)} kg/h per 100 m · ${c.steamLbPerHPer100ft.toFixed(1)} lb/h per 100 ft`;
}

function fmtHfg(hfgKjKg: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(hfgKjKg)) return "—";
  const btu = hfgKjKg * KJ_KG_TO_BTU_LB;
  if (unitSystem === "imperial") {
    return `${btu.toFixed(0)} Btu/lb · ${hfgKjKg.toFixed(0)} kJ/kg`;
  }
  return `${hfgKjKg.toFixed(0)} kJ/kg · ${btu.toFixed(0)} Btu/lb`;
}

function fmtU(u: number): string {
  if (!Number.isFinite(u)) return "—";
  return `${u.toFixed(3)} W/m²·K`;
}

function tracerLabel(tracerNps: TracerNps): string {
  return TRACER_NPS_OPTIONS.find((t) => t.value === tracerNps)?.label ?? tracerNps;
}

export function calculatePipeSteamTracingDuty(
  inputs: PipeSteamTracingDutyInputs,
): CalculatorOutput {
  const c = computePipeSteamTracingDuty(inputs);
  const materialMeta =
    TRACING_MATERIAL_OPTIONS.find((m) => m.value === inputs.material) ??
    TRACING_MATERIAL_OPTIONS[0];

  let heroStatusLevel: StatusLevel = "neutral";
  let heroStatus = "Enter valid maintain / ambient temperatures and steam pressure";
  if (!c.invalid) {
    heroStatusLevel = "pass";
    heroStatus = "Bare-contact screen · F = 1.25 · saturated steam";
  } else if (c.invalidReason) {
    heroStatusLevel = "fail";
    heroStatus = c.invalidReason;
  }

  const callouts: ResultCallout[] = [
    {
      tone: "warn",
      title: "Saturated steam tracing only",
      body: "Screening for saturated steam tracers. Superheated supply lowers condensation transfer and can create local hot spots. Runs longer than ~100 m need separate trap sets and loop splits.",
    },
    {
      tone: "info",
      title: "Heat-transfer cement",
      body: "Cement / compound can raise tracer capacity ~3–4× versus bare contact. Line count here assumes bare tube — re-check when cement is specified.",
    },
  ];
  if (c.materialWarn) {
    callouts.push({
      tone: "warn",
      title: "Insulation temperature limit",
      body: c.materialWarn,
    });
  }

  const pressureLabel =
    inputs.unitSystem === "imperial"
      ? `${inputs.steamPressure} psig`
      : `${inputs.steamPressure} bar.g`;
  const thickLabel =
    inputs.unitSystem === "imperial"
      ? `${inputs.insulationThickness} in`
      : `${inputs.insulationThickness} mm`;
  const tracerCapDisplay = c.invalid
    ? "—"
    : inputs.unitSystem === "imperial"
      ? `${(c.tracerCapacityWm * W_PER_M_TO_BTU_HR_FT).toFixed(1)} Btu/hr·ft · ${c.tracerCapacityWm.toFixed(1)} W/m`
      : `${c.tracerCapacityWm.toFixed(1)} W/m · ${(c.tracerCapacityWm * W_PER_M_TO_BTU_HR_FT).toFixed(1)} Btu/hr·ft`;

  // Spec detail rows (≤6). F / Tsat stay in export — not screen clutter.
  const rows: ResultRow[] = [
    {
      section: "Heat loss",
      label: "Bare pipe heat transfer rate",
      value: c.invalid ? "—" : fmtHeatLoss(c.qBareWm, inputs.unitSystem),
    },
    {
      section: "Heat loss",
      label: "Insulated pipe heat loss Q_loss",
      value: c.invalid ? "—" : fmtHeatLoss(c.qLossWm, inputs.unitSystem),
      emphasis: true,
    },
    {
      section: "Heat loss",
      label: "Overall heat transfer coefficient U",
      value: c.invalid ? "—" : fmtU(c.uOuterWm2K),
    },
    {
      section: "Tracer sizing",
      label: "Tracer output capacity per tube",
      value: tracerCapDisplay,
      emphasis: true,
    },
    {
      section: "Tracer sizing",
      label: "Recommended tracer tubing quantity",
      value: c.invalid
        ? "—"
        : `${c.tracerCount} line${c.tracerCount === 1 ? "" : "s"} · ${tracerLabel(inputs.tracerNps)}`,
      emphasis: true,
    },
    {
      section: "Steam & condensate",
      label: "Steam trapping / condensate load",
      value: c.invalid ? "—" : fmtSteamPer100(c, inputs.unitSystem),
      emphasis: true,
    },
  ];

  return {
    heroLabel: "Steam consumption rate",
    heroValue: fmtSteamHero(c, inputs.unitSystem),
    heroStatus,
    heroStatusLevel,
    heroBadges: c.invalid
      ? undefined
      : [
          {
            label: "Tracer lines",
            value: String(c.tracerCount),
          },
          {
            label: "Q_loss",
            value:
              inputs.unitSystem === "imperial"
                ? `${(c.qLossWm * W_PER_M_TO_BTU_HR_FT).toFixed(1)} Btu/hr·ft`
                : `${c.qLossWm.toFixed(1)} W/m`,
          },
          {
            label: "h_fg",
            value:
              inputs.unitSystem === "imperial"
                ? `${(c.hfgKjKg * KJ_KG_TO_BTU_LB).toFixed(0)} Btu/lb`
                : `${c.hfgKjKg.toFixed(0)} kJ/kg`,
          },
        ],
    summary: [
      {
        label: "Total heat loss Q_loss",
        value: c.invalid ? "—" : fmtHeatLoss(c.qLossWm, inputs.unitSystem),
      },
      {
        label: "Steam latent heat h_fg",
        value: c.invalid ? "—" : fmtHfg(c.hfgKjKg, inputs.unitSystem),
      },
    ],
    summaryStatus: {
      label: heroStatus,
      level: heroStatusLevel,
    },
    rows,
    callouts,
    exportRows: [
      { label: "NPS", value: inputs.nps },
      {
        label: "Maintain temp",
        value: `${inputs.maintainTemp} ${inputs.unitSystem === "imperial" ? "°F" : "°C"}`,
      },
      {
        label: "Ambient temp",
        value: `${inputs.ambientTemp} ${inputs.unitSystem === "imperial" ? "°F" : "°C"}`,
      },
      {
        label: "Wind",
        value: `${inputs.windSpeed} ${inputs.unitSystem === "imperial" ? "mph" : "m/s"}`,
      },
      { label: "Insulation", value: materialMeta.label },
      { label: "Thickness", value: thickLabel },
      { label: "Tracer", value: tracerLabel(inputs.tracerNps) },
      { label: "Steam pressure (gauge)", value: pressureLabel },
      {
        label: "Tsat",
        value: c.invalid
          ? "—"
          : `${c.tSatC.toFixed(1)} °C · ${((c.tSatC * 9) / 5 + 32).toFixed(1)} °F`,
      },
      { label: "Safety factor F", value: String(TRACING_SAFETY_FACTOR) },
      {
        label: "Q_loss W/m",
        value: c.invalid ? "—" : c.qLossWm.toFixed(4),
      },
      {
        label: "Q_bare W/m",
        value: c.invalid ? "—" : c.qBareWm.toFixed(4),
      },
      {
        label: "U W/m²·K",
        value: c.invalid ? "—" : c.uOuterWm2K.toFixed(6),
      },
      {
        label: "h_fg kJ/kg",
        value: c.invalid ? "—" : c.hfgKjKg.toFixed(3),
      },
      {
        label: "m_steam kg/(h·m)",
        value: c.invalid ? "—" : c.steamKgPerHPerM.toFixed(6),
      },
      {
        label: "m_steam kg/h per 100 m",
        value: c.invalid ? "—" : c.steamKgPerHPer100m.toFixed(3),
      },
      {
        label: "m_steam lb/h per 100 ft",
        value: c.invalid ? "—" : c.steamLbPerHPer100ft.toFixed(3),
      },
      {
        label: "Tracer capacity W/m",
        value: c.invalid ? "—" : c.tracerCapacityWm.toFixed(3),
      },
      {
        label: "Tracer count",
        value: c.invalid ? "—" : String(c.tracerCount),
      },
    ],
  };
}
