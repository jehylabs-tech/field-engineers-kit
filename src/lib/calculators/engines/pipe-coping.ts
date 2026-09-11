import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
  listAvailableNps,
  resolveScheduleOptionValue,
} from "@/lib/data/loaders";

export type PipeCopingCutType = "set-on" | "set-in" | "miter";
export type PipeCopingPoints = 16 | 32;

export type PipeCopingInputs = {
  unitSystem: UnitSystem;
  headerNps: string;
  headerSchedule: string;
  branchNps: string;
  branchSchedule: string;
  /** Intersection angle θ in degrees (30–90). */
  angleDeg: number;
  /** Eccentricity e in display length units (in or mm). */
  offset: number;
  cutType: PipeCopingCutType;
  points: PipeCopingPoints;
};

export type OrdinatePoint = {
  index: number;
  phiDeg: number;
  /** Arc length along branch OD from φ=0. */
  s: number;
  /** Absolute axial cut offset z_cut. */
  zCut: number;
  /** Template height from valley (z_cut − min). */
  zRel: number;
  isQuadrant: boolean;
};

export type PipeDimensions = {
  headerOd: number;
  headerId: number;
  headerWall: number;
  branchOd: number;
  branchId: number;
  branchWall: number;
  unit: string;
};

export const PIPE_COPING_CUT_OPTIONS: {
  value: PipeCopingCutType;
  label: string;
}[] = [
  { value: "set-on", label: "Full Size Set-on (On Pipe Wall)" },
  { value: "set-in", label: "Set-in (Through Hole)" },
  { value: "miter", label: "Miter Cut" },
];

export const PIPE_COPING_POINT_OPTIONS: {
  value: string;
  label: string;
}[] = [
  { value: "16", label: "16 Points" },
  { value: "32", label: "32 Points" },
];

/** Preferred fabrication schedules for coping dropdowns. */
export const PIPE_COPING_SCHEDULE_PREFS = [
  "10",
  "10S",
  "40",
  "40S",
  "STD",
  "80",
  "80S",
  "XS",
  "160",
] as const;

/** High-volume pSEO NPS set (header & branch). Include shop-common sizes through 24". */
export const PIPE_COPING_PSEO_NPS = [
  "0.5",
  "1",
  "1.5",
  "2",
  "3",
  "4",
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "18",
  "20",
  "24",
] as const;

export const PIPE_COPING_PSEO_SCH = ["40", "80"] as const;
export const PIPE_COPING_PSEO_ANGLES = [45, 60, 90] as const;

export const DEFAULT_PIPE_COPING_INPUTS: PipeCopingInputs = {
  unitSystem: "metric",
  headerNps: "6",
  headerSchedule: "40",
  branchNps: "4",
  branchSchedule: "40",
  angleDeg: 90,
  offset: 0,
  cutType: "set-on",
  points: 16,
};

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function npsNumeric(nps: string): number {
  const n = Number(nps);
  return Number.isFinite(n) ? n : NaN;
}

/** Branch must not exceed header NPS (numeric compare). */
export function isBranchNpsValid(headerNps: string, branchNps: string): boolean {
  const h = npsNumeric(headerNps);
  const b = npsNumeric(branchNps);
  if (!Number.isFinite(h) || !Number.isFinite(b)) return true;
  return b <= h;
}

export function listPipeCopingNpsOptions(): {
  value: string;
  label: string;
}[] {
  return listAvailableNps()
    .filter((pipe) => {
      const n = npsNumeric(pipe.nps);
      return Number.isFinite(n) && n >= 0.5 && n <= 24;
    })
    .map((pipe) => ({ value: pipe.nps, label: pipe.npsLabel }));
}

export function resolveCopingSchedule(nps: string, schedule: string): string {
  return (
    resolveScheduleOptionValue(nps, schedule) ||
    defaultScheduleForNps(nps, schedule) ||
    schedule
  );
}

function lengthFromMm(mm: number, unitSystem: UnitSystem): number {
  if (unitSystem === "imperial") return mm / 25.4;
  return mm;
}

export function resolvePipeDimensions(
  inputs: PipeCopingInputs,
): PipeDimensions | null {
  const hSch = resolveCopingSchedule(inputs.headerNps, inputs.headerSchedule);
  const bSch = resolveCopingSchedule(inputs.branchNps, inputs.branchSchedule);
  const header = getPipeScheduleEntry(inputs.headerNps, hSch);
  const branch = getPipeScheduleEntry(inputs.branchNps, bSch);
  if (!header || !branch) return null;

  const unit = inputs.unitSystem === "imperial" ? "in" : "mm";
  return {
    headerOd: lengthFromMm(header.pipe.outsideDiameterMm, inputs.unitSystem),
    headerId: lengthFromMm(header.row.insideDiameterMm, inputs.unitSystem),
    headerWall: lengthFromMm(header.row.wallThicknessMm, inputs.unitSystem),
    branchOd: lengthFromMm(branch.pipe.outsideDiameterMm, inputs.unitSystem),
    branchId: lengthFromMm(branch.row.insideDiameterMm, inputs.unitSystem),
    branchWall: lengthFromMm(branch.row.wallThicknessMm, inputs.unitSystem),
    unit,
  };
}

export function maxOffsetAllowed(dims: PipeDimensions): number {
  return Math.max(0, (dims.headerOd - dims.branchOd) / 2);
}

function formatLen(value: number, unit: string, digits = 3): string {
  if (!Number.isFinite(value)) return `— ${unit}`;
  return `${value.toFixed(digits)} ${unit}`;
}

/**
 * 3D pipe intersection envelope → unwrapped branch cut ordinates.
 * θ in degrees; e = eccentricity along header X.
 */
export function computePipeCopingOrdinates(
  inputs: PipeCopingInputs,
): {
  dims: PipeDimensions;
  points: OrdinatePoint[];
  deltaZMax: number;
  circumference: number;
  zMin: number;
  zMax: number;
  thetaRad: number;
  headerRadius: number;
  branchRadius: number;
  offsetClamped: number;
  valid: boolean;
  warn?: string;
} | null {
  const dims = resolvePipeDimensions(inputs);
  if (!dims) return null;

  const angle = Math.min(90, Math.max(30, finite(inputs.angleDeg, 90)));
  const thetaRad = (angle * Math.PI) / 180;
  const sinT = Math.sin(thetaRad);
  const cotT = Math.abs(sinT) < 1e-9 ? 0 : Math.cos(thetaRad) / sinT;

  // Set-in cuts to header ID surface; set-on / miter use OD envelope.
  const headerRadius =
    inputs.cutType === "set-in" ? dims.headerId / 2 : dims.headerOd / 2;
  const branchRadius = dims.branchOd / 2;

  const eMax = maxOffsetAllowed(dims);
  const offsetClamped = Math.min(Math.max(0, finite(inputs.offset, 0)), eMax);

  const n = inputs.points === 32 ? 32 : 16;
  const raw: { phiDeg: number; s: number; zCut: number }[] = [];

  for (let i = 0; i < n; i += 1) {
    const phiDeg = (360 * i) / n;
    const phi = (phiDeg * Math.PI) / 180;
    const x = branchRadius * Math.sin(phi) + offsetClamped;
    const y = branchRadius * Math.cos(phi);
    const inside = headerRadius * headerRadius - x * x;
    const zH = Math.sqrt(Math.max(0, inside));
    const zCut =
      Math.abs(sinT) < 1e-9 ? zH : zH / sinT - y * cotT;
    const s = branchRadius * phi;
    raw.push({
      phiDeg,
      s: Number.isFinite(s) ? s : 0,
      zCut: Number.isFinite(zCut) ? zCut : 0,
    });
  }

  const zVals = raw.map((p) => p.zCut);
  const zMin = Math.min(...zVals);
  const zMax = Math.max(...zVals);
  const deltaZMax = zMax - zMin;
  const circumference = Math.PI * dims.branchOd;

  const quadrantSet = new Set([0, 90, 180, 270]);
  const points: OrdinatePoint[] = raw.map((p, idx) => ({
    index: idx + 1,
    phiDeg: p.phiDeg,
    s: p.s,
    zCut: p.zCut,
    zRel: p.zCut - zMin,
    isQuadrant: quadrantSet.has(Math.round(p.phiDeg) % 360),
  }));

  let warn: string | undefined;
  const branchTooBig = !isBranchNpsValid(inputs.headerNps, inputs.branchNps);
  if (branchTooBig) {
    warn = "Branch NPS must be ≤ Header NPS.";
  } else if (branchRadius > headerRadius + 1e-9) {
    warn = "Branch OD exceeds header cut surface — reduce branch or change cut type.";
  } else if (finite(inputs.offset, 0) > eMax + 1e-9) {
    warn = `Offset clamped to max eccentricity ${(eMax).toFixed(3)} ${dims.unit}.`;
  }

  // Invalid branch-on-header: do not publish a fabrication template.
  if (branchTooBig || branchRadius > headerRadius + 1e-9) {
    return {
      dims,
      points: [],
      deltaZMax: 0,
      circumference: Math.PI * dims.branchOd,
      zMin: 0,
      zMax: 0,
      thetaRad,
      headerRadius,
      branchRadius,
      offsetClamped,
      valid: false,
      warn,
    };
  }

  return {
    dims,
    points,
    deltaZMax,
    circumference,
    zMin,
    zMax,
    thetaRad,
    headerRadius,
    branchRadius,
    offsetClamped,
    valid: !warn || warn.includes("clamped"),
    warn,
  };
}

export function calculatePipeCoping(
  inputs: PipeCopingInputs,
): CalculatorOutput {
  const result = computePipeCopingOrdinates(inputs);
  const unit = inputs.unitSystem === "imperial" ? "in" : "mm";

  if (!result) {
    return {
      heroLabel: "Max cut depth Δz_max",
      heroValue: "—",
      heroStatus: "Select valid NPS × schedule for header and branch",
      heroStatusLevel: "warn",
      summary: [{ label: "Status", value: "Lookup failed" }],
      summaryStatus: { label: "Check NPS / schedule", level: "warn" },
      rows: [],
      exportRows: [],
    };
  }

  const {
    dims,
    points,
    deltaZMax,
    circumference,
    warn,
  } = result;

  const cutLabel =
    PIPE_COPING_CUT_OPTIONS.find((o) => o.value === inputs.cutType)?.label ??
    inputs.cutType;

  const jointLabel = `${inputs.branchNps}" branch on ${inputs.headerNps}" header @ ${inputs.angleDeg}°`;
  const invalid = !result.valid;
  const heroValue = invalid ? "—" : formatLen(deltaZMax, unit, 3);
  const level = invalid || (warn && !warn.includes("clamped")) ? "warn" : "pass";

  const rows = invalid
    ? [
        {
          label: "Header",
          value: `NPS ${inputs.headerNps}" Sch ${resolveCopingSchedule(inputs.headerNps, inputs.headerSchedule)} · OD ${formatLen(dims.headerOd, unit, 2)}`,
          section: "Pipe sizes",
        },
        {
          label: "Branch",
          value: `NPS ${inputs.branchNps}" Sch ${resolveCopingSchedule(inputs.branchNps, inputs.branchSchedule)} · OD ${formatLen(dims.branchOd, unit, 2)}`,
          section: "Pipe sizes",
          warn: true,
        },
        {
          label: "Validation",
          value: warn ?? "Invalid branch / header combination",
          section: "Results",
          warn: true,
          emphasis: true,
        },
      ]
    : [
    {
      label: "Header",
      value: `NPS ${inputs.headerNps}" Sch ${resolveCopingSchedule(inputs.headerNps, inputs.headerSchedule)} · OD ${formatLen(dims.headerOd, unit, 2)}`,
      section: "Pipe sizes",
    },
    {
      label: "Branch",
      value: `NPS ${inputs.branchNps}" Sch ${resolveCopingSchedule(inputs.branchNps, inputs.branchSchedule)} · OD ${formatLen(dims.branchOd, unit, 2)}`,
      section: "Pipe sizes",
    },
    {
      label: "Intersection angle θ",
      value: `${finite(inputs.angleDeg, 90).toFixed(1)}°`,
      section: "Geometry",
    },
    {
      label: "Offset / eccentricity e",
      value: formatLen(result.offsetClamped, unit, 3),
      section: "Geometry",
    },
    {
      label: "Cut type",
      value: cutLabel,
      section: "Geometry",
    },
    {
      label: "Branch circumference C_B",
      value: formatLen(circumference, unit, 3),
      section: "Results",
    },
    {
      label: "Max cut depth Δz_max",
      value: heroValue,
      section: "Results",
      emphasis: true,
    },
    {
      label: "Layout points",
      value: String(inputs.points),
      section: "Results",
    },
    ...points.map((p) => ({
      label: `Pt ${p.index} · φ ${p.phiDeg.toFixed(0)}°`,
      value: `S=${formatLen(p.s, unit, 3)} · z=${formatLen(p.zRel, unit, 3)}`,
      section: "Ordinate table",
    })),
  ];

  return {
    heroLabel: "Max cut depth Δz_max",
    heroValue,
    heroStatus: warn
      ? warn
      : `${inputs.branchNps}" branch on ${inputs.headerNps}" header · θ ${inputs.angleDeg}° · ${inputs.points} pts`,
    heroStatusLevel: level,
    heroBadges: invalid
      ? [
          { label: "Header", value: `${inputs.headerNps}"` },
          { label: "Branch", value: `${inputs.branchNps}"` },
          { label: "θ", value: `${finite(inputs.angleDeg, 90).toFixed(0)}°` },
        ]
      : [
          { label: "C_B", value: formatLen(circumference, unit, 2) },
          { label: "Header OD", value: formatLen(dims.headerOd, unit, 2) },
          { label: "Branch OD", value: formatLen(dims.branchOd, unit, 2) },
          { label: "θ", value: `${finite(inputs.angleDeg, 90).toFixed(0)}°` },
        ],
    summary: [
      { label: "Δz_max", value: heroValue },
      {
        label: "Branch C",
        value: invalid ? "—" : formatLen(circumference, unit, 2),
      },
      {
        label: "Joint",
        value: jointLabel,
      },
    ],
    summaryStatus: {
      label: warn ?? "Envelope ready for wrap template",
      level,
    },
    rows,
    callouts: [
      {
        tone: invalid ? "warn" : "info",
        title: invalid
          ? "Invalid branch / header combination"
          : "ASME B31.3 Pipe Fabricating Note",
        body: invalid
          ? "For set-on / set-in / miter branch connections, Branch NPS must be ≤ Header NPS. Reduce the branch size (or increase the header) to generate a shop cut template."
          : "For high-pressure process piping, ensure proper beveling (37.5° ± 2.5°) along the cut line z_cut after wrapping the template. Verify branch reinforcement requirements (Weld-o-let or Reinforcement Pad) per ASME B31.3 Para 304.3.",
      },
    ],
    exportRows: invalid
      ? [
          { label: "Status", value: warn ?? "Invalid" },
          { label: "Header NPS", value: inputs.headerNps },
          { label: "Branch NPS", value: inputs.branchNps },
        ]
      : [
      { label: "Header NPS", value: inputs.headerNps },
      { label: "Header schedule", value: inputs.headerSchedule },
      { label: "Branch NPS", value: inputs.branchNps },
      { label: "Branch schedule", value: inputs.branchSchedule },
      { label: "Angle θ (deg)", value: String(inputs.angleDeg) },
      { label: "Offset e", value: formatLen(result.offsetClamped, unit, 4) },
      { label: "Cut type", value: inputs.cutType },
      { label: "Points", value: String(inputs.points) },
      { label: "Δz_max", value: heroValue },
      { label: "Circumference", value: formatLen(circumference, unit, 4) },
      ...points.map((p) => ({
        label: `Point ${p.index}`,
        value: `φ=${p.phiDeg.toFixed(2)}°; S=${p.s.toFixed(4)}; z_rel=${p.zRel.toFixed(4)}; z_cut=${p.zCut.toFixed(4)}`,
      })),
    ],
  };
}

/** Spec token: `{branch}-on-{header}-sch-{sch}-{angle}deg` */
export function buildPipeCopingSpec(
  branchNps: string,
  headerNps: string,
  schedule: string,
  angleDeg: number,
): string {
  const sch = String(schedule).replace(/^Sch\s+/i, "");
  const ang = Math.round(finite(angleDeg, 90));
  return `${branchNps}-on-${headerNps}-sch-${sch}-${ang}deg`;
}

export function listPipeCopingPseoRoutes(slug: string): {
  slug: string;
  spec: string;
  query: Record<string, string>;
  label: string;
}[] {
  const routes: {
    slug: string;
    spec: string;
    query: Record<string, string>;
    label: string;
  }[] = [];
  for (const header of PIPE_COPING_PSEO_NPS) {
    for (const branch of PIPE_COPING_PSEO_NPS) {
      if (npsNumeric(branch) > npsNumeric(header)) continue;
      for (const sch of PIPE_COPING_PSEO_SCH) {
        if (!getPipeScheduleEntry(header, sch) || !getPipeScheduleEntry(branch, sch)) {
          continue;
        }
        for (const angle of PIPE_COPING_PSEO_ANGLES) {
          const spec = buildPipeCopingSpec(branch, header, sch, angle);
          routes.push({
            slug,
            spec,
            query: {
              hnps: header,
              bnps: branch,
              hsch: sch,
              bsch: sch,
              theta: String(angle),
            },
            label: `${branch}" on ${header}" Sch ${sch} · ${angle}°`,
          });
        }
      }
    }
  }
  return routes;
}
