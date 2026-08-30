import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import { getPipeScheduleEntry } from "@/lib/data/loaders";

export type VelocityFlowUnit = "m3h" | "gpm";

export type FlowVelocityInputs = {
  unitSystem: UnitSystem;
  nps: string;
  schedule: string;
  flow: number;
  flowUnit: VelocityFlowUnit;
  density: number;
  erosionC: number;
};

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
  status: "Safe" | "Warning" | "Erosion Risk";
};

export function computeFlowVelocity(
  inputs: FlowVelocityInputs,
): FlowVelocityResult | null {
  const entry = getPipeScheduleEntry(inputs.nps, inputs.schedule);
  const density =
    Number.isFinite(inputs.density) && inputs.density > 0 ? inputs.density : 998;
  const c =
    Number.isFinite(inputs.erosionC) && inputs.erosionC > 0 ? inputs.erosionC : 100;

  if (
    !entry ||
    !Number.isFinite(inputs.flow) ||
    inputs.flow <= 0
  ) {
    return null;
  }

  const dM = entry.row.insideDiameterMm / 1000;
  const area = Math.PI * dM * dM * 0.25;
  const q = flowToM3s(inputs.flow, inputs.flowUnit);
  const velocity = area > 0 && Number.isFinite(q) ? q / area : 0;
  const vc = apiRp14eLimitMs(density, c);
  const isLiquid = density >= 400;

  let status: FlowVelocityResult["status"];
  if (!Number.isFinite(velocity) || velocity <= 0) {
    return null;
  }
  if (velocity >= vc && vc > 0) {
    status = "Erosion Risk";
  } else if (velocity >= 0.8 * vc || (isLiquid && velocity > 3.5)) {
    status = "Warning";
  } else {
    status = "Safe";
  }

  return {
    velocity: Number.isFinite(velocity) ? velocity : 0,
    vc,
    area,
    status,
  };
}

export { apiRp14eLimitMs };

export function calculateFlowVelocity(
  inputs: FlowVelocityInputs,
): CalculatorOutput {
  const computed = computeFlowVelocity(inputs);
  const entry = getPipeScheduleEntry(inputs.nps, inputs.schedule);
  const density =
    Number.isFinite(inputs.density) && inputs.density > 0 ? inputs.density : 998;
  const c =
    Number.isFinite(inputs.erosionC) && inputs.erosionC > 0 ? inputs.erosionC : 100;

  if (!computed || !entry) {
    return {
      heroLabel: "Flow velocity",
      heroValue: "—",
      heroStatus: "Enter flow and a valid NPS/schedule",
      heroStatusLevel: "warn",
      summary: [
        { label: "v", value: "—" },
        { label: "API RP 14E vc", value: "—" },
      ],
      summaryStatus: { label: "Waiting for valid inputs", level: "warn" },
      rows: [],
      exportRows: [],
    };
  }

  const { velocity, vc, area, status } = computed;
  const isLiquid = density >= 400;
  const level: StatusLevel =
    status === "Erosion Risk" ? "fail" : status === "Warning" ? "warn" : "pass";

  const typical = isLiquid ? "Liquid service typical 1–3 m/s" : "Gas service typical 10–25 m/s";

  return {
    heroLabel: "Mean velocity v = Q / A",
    heroValue: `${velocity.toFixed(2)} m/s`,
    heroStatus: `${status} · API RP 14E vc = ${vc.toFixed(2)} m/s (c = ${c})`,
    heroStatusLevel: level,
    summary: [
      { label: "Erosion limit vc", value: `${vc.toFixed(2)} m/s` },
      { label: "v / vc", value: vc > 0 ? `${((velocity / vc) * 100).toFixed(0)}%` : "—" },
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
      { label: "NPS / Schedule", value: `${entry.pipe.npsLabel} · Sch ${entry.row.schedule}` },
      { label: "Inside diameter (ID)", value: `${entry.row.insideDiameterMm.toFixed(2)} mm` },
      { label: "Flow area", value: `${(area * 1e6).toFixed(0)} mm²` },
      {
        label: "Flow rate Q",
        value:
          inputs.flowUnit === "gpm"
            ? `${inputs.flow} GPM`
            : `${inputs.flow} m³/h`,
      },
      { label: "Density ρ", value: `${density} kg/m³` },
      { label: "API RP 14E c", value: String(c) },
      { label: "Velocity v", value: `${velocity.toFixed(3)} m/s` },
      { label: "Erosion velocity vc", value: `${vc.toFixed(3)} m/s` },
      { label: "Status", value: status, warn: status !== "Safe" },
      { label: "Note", value: typical },
    ],
    exportRows: [
      { label: "Standard", value: "API RP 14E" },
      { label: "Velocity", value: `${velocity.toFixed(3)} m/s` },
      { label: "vc", value: `${vc.toFixed(3)} m/s` },
      { label: "Status", value: status },
    ],
  };
}

export const DEFAULT_FLOW_VELOCITY_INPUTS: FlowVelocityInputs = {
  unitSystem: "metric",
  nps: "4",
  schedule: "40",
  flow: 40,
  flowUnit: "m3h",
  density: 998,
  erosionC: 100,
};
