import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import { isStainlessSchedule } from "@/lib/data/b36-19-schedules";
import { getPipeScheduleEntry, listSchedulesForNps } from "@/lib/data/loaders";
import {
  densityToKgM3,
  formatAreaMm2,
  formatDensity,
  formatLengthMm,
  formatVelocity,
  msToFts,
  unitSymbol,
} from "@/lib/unitConverter";

export type VelocityFlowUnit = "m3h" | "gpm";

/** Carbon / alloy (B36.10M) vs stainless / CRA (B36.19M). */
export type FlowVelocityMaterial = "cs" | "ss";

export type FlowVelocityInputs = {
  unitSystem: UnitSystem;
  materialFamily: FlowVelocityMaterial;
  nps: string;
  schedule: string;
  flow: number;
  flowUnit: VelocityFlowUnit;
  /** Display density: kg/m³ (metric) or lb/ft³ (imperial). */
  density: number;
  erosionC: number;
};

export const FLOW_VELOCITY_MATERIALS: {
  value: FlowVelocityMaterial;
  label: string;
  shortLabel: string;
  standard: string;
}[] = [
  {
    value: "cs",
    label: "Carbon & Alloy Steel",
    shortLabel: "CS",
    standard: "ASME B36.10M",
  },
  {
    value: "ss",
    label: "Stainless Steel / CRA (316L, Duplex, Alloys)",
    shortLabel: "SS",
    standard: "ASME B36.19M",
  },
];

export function defaultErosionC(material: FlowVelocityMaterial): number {
  return material === "ss" ? 150 : 100;
}

/** Practical liquid velocity warning cap (m/s). CS FAC ≈ 3.5; CRA ≈ 5.0. */
export function liquidVelocityCapMs(material: FlowVelocityMaterial): number {
  return material === "ss" ? 5.0 : 3.5;
}

export function listSchedulesForMaterial(
  nps: string,
  material: FlowVelocityMaterial,
) {
  const rows = listSchedulesForNps(nps);
  return rows.filter((row) =>
    material === "ss"
      ? isStainlessSchedule(row.schedule)
      : !isStainlessSchedule(row.schedule),
  );
}

export function defaultScheduleForMaterial(
  nps: string,
  material: FlowVelocityMaterial,
  current?: string,
): string {
  const rows = listSchedulesForMaterial(nps, material);
  if (rows.length === 0) return current ?? "";
  if (
    current &&
    rows.some((row) => row.schedule.toUpperCase() === current.toUpperCase())
  ) {
    return current;
  }
  const preferred =
    material === "ss"
      ? ["40S", "10S", "80S", "5S"]
      : ["40", "STD", "80", "XS", "20", "10"];
  for (const token of preferred) {
    const match = rows.find(
      (row) => row.schedule.toUpperCase() === token.toUpperCase(),
    );
    if (match) return match.schedule;
  }
  return rows[0].schedule;
}

export function materialShortLabel(material: FlowVelocityMaterial): string {
  return (
    FLOW_VELOCITY_MATERIALS.find((item) => item.value === material)
      ?.shortLabel ?? "CS"
  );
}

function flowToM3s(flow: number, unit: VelocityFlowUnit): number {
  if (unit === "gpm") return flow * 6.30901964e-5;
  return flow / 3600;
}

function apiRp14eLimitMs(densityKgM3: number, c: number): number {
  const rhoPcf = densityKgM3 * 0.06242796;
  if (rhoPcf <= 0 || c <= 0) return 0;
  const fps = c / Math.sqrt(rhoPcf);
  const ms = fps * 0.3048;
  return Number.isFinite(ms) ? ms : 0;
}

export type FlowVelocityResult = {
  velocity: number;
  vc: number;
  area: number;
  liquidCapMs: number;
  status: "Safe" | "Warning" | "Erosion Risk";
};

export function computeFlowVelocity(
  inputs: FlowVelocityInputs,
): FlowVelocityResult | null {
  const material = inputs.materialFamily === "ss" ? "ss" : "cs";
  const entry = getPipeScheduleEntry(inputs.nps, inputs.schedule);
  const densityKgM3 = densityToKgM3(inputs.density, inputs.unitSystem);
  const c =
    Number.isFinite(inputs.erosionC) && inputs.erosionC > 0
      ? inputs.erosionC
      : defaultErosionC(material);
  const liquidCap = liquidVelocityCapMs(material);

  if (!entry || !Number.isFinite(inputs.flow) || inputs.flow <= 0) {
    return null;
  }

  const dM = entry.row.insideDiameterMm / 1000;
  const area = Math.PI * dM * dM * 0.25;
  const q = flowToM3s(inputs.flow, inputs.flowUnit);
  const velocity = area > 0 && Number.isFinite(q) ? q / area : 0;
  const vc = apiRp14eLimitMs(densityKgM3, c);
  const isLiquid = densityKgM3 >= 400;

  let status: FlowVelocityResult["status"];
  if (!Number.isFinite(velocity) || velocity <= 0) {
    return null;
  }
  if (velocity >= vc && vc > 0) {
    status = "Erosion Risk";
  } else if (velocity >= 0.8 * vc || (isLiquid && velocity > liquidCap)) {
    status = "Warning";
  } else {
    status = "Safe";
  }

  return {
    velocity: Number.isFinite(velocity) ? velocity : 0,
    vc,
    area,
    liquidCapMs: liquidCap,
    status,
  };
}

export { apiRp14eLimitMs };

export function calculateFlowVelocity(
  inputs: FlowVelocityInputs,
): CalculatorOutput {
  const material = inputs.materialFamily === "ss" ? "ss" : "cs";
  const matLabel = materialShortLabel(material);
  const computed = computeFlowVelocity(inputs);
  const entry = getPipeScheduleEntry(inputs.nps, inputs.schedule);
  const densityKgM3 = densityToKgM3(inputs.density, inputs.unitSystem);
  const c =
    Number.isFinite(inputs.erosionC) && inputs.erosionC > 0
      ? inputs.erosionC
      : defaultErosionC(material);
  const liquidCap = liquidVelocityCapMs(material);
  const materialBadge = `${matLabel} | Sch ${inputs.schedule} | C=${c}`;
  const velUnit = unitSymbol("velocity", inputs.unitSystem);

  if (!computed || !entry) {
    return {
      heroLabel: "Mean Velocity (v)",
      heroValue: "—",
      heroStatus: "Enter flow and a valid NPS/schedule",
      heroStatusLevel: "warn",
      summary: [
        { label: "Material", value: materialBadge },
        { label: "Erosion limit (vc)", value: "—" },
        { label: "v / vc", value: "—" },
      ],
      summaryStatus: { label: "Waiting for valid inputs", level: "warn" },
      rows: [],
      exportRows: [],
    };
  }

  const { velocity, vc, area, status } = computed;
  const isLiquid = densityKgM3 >= 400;
  const level: StatusLevel =
    status === "Erosion Risk" ? "fail" : status === "Warning" ? "warn" : "pass";
  const ratioPct = vc > 0 ? (velocity / vc) * 100 : 0;

  const liquidCapDisplay =
    inputs.unitSystem === "imperial"
      ? `${msToFts(liquidCap).toFixed(1)} ${velUnit}`
      : `${liquidCap.toFixed(1)} ${velUnit}`;

  const typical = isLiquid
    ? inputs.unitSystem === "imperial"
      ? `Liquid typical 3–10 ft/s · warning cap ${liquidCapDisplay}`
      : `Liquid typical 1–3 m/s · warning cap ${liquidCapDisplay}`
    : inputs.unitSystem === "imperial"
      ? "Gas typical 33–82 ft/s"
      : "Gas typical 10–25 m/s";

  const vOut = formatVelocity(velocity, inputs.unitSystem);
  const vcOut = formatVelocity(vc, inputs.unitSystem);
  const standardLabel =
    material === "ss" ? "ASME B36.19M" : "ASME B36.10M";

  return {
    heroLabel: "Mean Velocity (v)",
    heroValue: vOut,
    heroStatus: `${status} · ${materialBadge} · vc = ${vcOut}`,
    heroStatusLevel: level,
    heroBadges: [
      { label: "vc", value: vcOut },
      { label: "v / vc", value: vc > 0 ? `${ratioPct.toFixed(0)}%` : "—" },
      { label: "C", value: String(c) },
      { label: "Cap", value: liquidCapDisplay },
    ],
    summary: [
      { label: "Material", value: materialBadge },
      { label: "Erosion limit (vc)", value: vcOut },
      {
        label: "v / vc",
        value: vc > 0 ? `${ratioPct.toFixed(0)}%` : "—",
      },
    ],
    summaryStatus: {
      label: `${status} — ${typical}`,
      level,
    },
    gauge: {
      fillPercent: Math.min(100, vc > 0 ? (velocity / vc) * 80 : 0),
      limitPercent: 80,
      minLabel: "0",
      limitLabel: "vc",
      maxLabel: "1.25 vc",
    },
    rows: [
      {
        label: "Material family",
        value:
          FLOW_VELOCITY_MATERIALS.find((item) => item.value === material)
            ?.label ?? matLabel,
        section: "Pipe & flow",
      },
      {
        label: "Pipe standard",
        value: standardLabel,
        section: "Pipe & flow",
      },
      {
        label: "NPS / Schedule",
        value: `${entry.pipe.npsLabel} · Sch ${entry.row.schedule}`,
        section: "Pipe & flow",
      },
      {
        label: "Inside diameter (ID)",
        value: formatLengthMm(entry.row.insideDiameterMm, inputs.unitSystem),
        section: "Pipe & flow",
        highlight: "bore",
      },
      {
        label: "Flow area (A)",
        value: formatAreaMm2(area * 1e6, inputs.unitSystem),
        section: "Pipe & flow",
      },
      {
        label: "Flow rate (Q)",
        value:
          inputs.flowUnit === "gpm"
            ? `${inputs.flow} GPM`
            : `${inputs.flow} m³/h`,
        section: "Pipe & flow",
        highlight: "Q",
      },
      {
        label: "Density (ρ)",
        value: formatDensity(densityKgM3, inputs.unitSystem),
        section: "Erosion screening",
      },
      {
        label: "API RP 14E factor (C)",
        value: String(c),
        section: "Erosion screening",
        highlight: "c",
      },
      {
        label: "Liquid velocity warning cap",
        value: liquidCapDisplay,
        section: "Erosion screening",
      },
      {
        label: "Mean velocity (v)",
        value: formatVelocity(velocity, inputs.unitSystem, 3),
        section: "Erosion screening",
        emphasis: true,
      },
      {
        label: "Erosion velocity (vc)",
        value: formatVelocity(vc, inputs.unitSystem, 3),
        section: "Erosion screening",
      },
      {
        label: "Ratio (v / vc)",
        value: vc > 0 ? `${ratioPct.toFixed(1)}%` : "—",
        section: "Erosion screening",
      },
      {
        label: "Status",
        value: status,
        warn: status !== "Safe",
        section: "Erosion screening",
        emphasis: true,
      },
      { label: "Note", value: typical, section: "Erosion screening" },
    ],
    exportRows: [
      { label: "Standard", value: "API RP 14E · liquid warning cap (this app)" },
      { label: "Material", value: materialBadge },
      { label: "Pipe standard", value: standardLabel },
      {
        label: "NPS / Schedule",
        value: `${entry.pipe.npsLabel} · Sch ${entry.row.schedule}`,
      },
      {
        label: "Inside diameter (ID)",
        value: formatLengthMm(entry.row.insideDiameterMm, inputs.unitSystem),
      },
      {
        label: "Flow area (A)",
        value: formatAreaMm2(area * 1e6, inputs.unitSystem),
      },
      {
        label: "Flow rate (Q)",
        value:
          inputs.flowUnit === "gpm"
            ? `${inputs.flow} GPM`
            : `${inputs.flow} m³/h`,
      },
      { label: "Density (ρ)", value: formatDensity(densityKgM3, inputs.unitSystem) },
      { label: "API RP 14E factor (C)", value: String(c) },
      { label: "Mean velocity (v)", value: formatVelocity(velocity, inputs.unitSystem, 3) },
      { label: "Erosion velocity (vc)", value: formatVelocity(vc, inputs.unitSystem, 3) },
      {
        label: "Ratio (v / vc)",
        value: vc > 0 ? `${ratioPct.toFixed(1)}%` : "—",
      },
      { label: "Liquid velocity warning cap", value: liquidCapDisplay },
      { label: "Status", value: status },
    ],
  };
}

export const DEFAULT_FLOW_VELOCITY_INPUTS: FlowVelocityInputs = {
  unitSystem: "metric",
  materialFamily: "cs",
  nps: "4",
  schedule: "40",
  flow: 40,
  flowUnit: "m3h",
  density: 998,
  erosionC: 100,
};
