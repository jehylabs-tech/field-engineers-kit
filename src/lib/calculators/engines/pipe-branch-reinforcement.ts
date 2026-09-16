import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
  listAvailableNps,
  resolveScheduleOptionValue,
} from "@/lib/data/loaders";
import { barToPsi, psiToBar } from "@/lib/unitConverter";
import {
  isBranchNpsValid,
  PIPE_COPING_PSEO_ANGLES,
  PIPE_COPING_PSEO_NPS,
  PIPE_COPING_PSEO_SCH,
  PIPE_COPING_SCHEDULE_PREFS,
} from "@/lib/calculators/engines/pipe-coping";

export type PipeBranchReinforcementInputs = {
  unitSystem: UnitSystem;
  headerNps: string;
  headerSchedule: string;
  branchNps: string;
  branchSchedule: string;
  designPressure: number;
  designTemp: number;
  allowStressHeader: number;
  allowStressBranch: number;
  allowStressPad: number;
  jointEfficiency: number;
  weldW: number;
  yFactor: number;
  corrosionAllowance: number;
  millTolerance: number;
  branchAngle: number;
  weldLegHeader: number;
  weldLegBranch: number;
};

export type PipeBranchReinforcementBreakdown = {
  Dh: number;
  Db: number;
  ThBar: number;
  TbBar: number;
  th: number;
  tb: number;
  d1: number;
  d2: number;
  L4: number;
  A1: number;
  A2: number;
  A3: number;
  A4: number;
  AAvail: number;
  /** Net excess area = A_avail − A₁ (positive = adequate without pad). */
  deltaA: number;
  AReqPad: number;
  AReqMetal: number;
  WPad: number;
  TPad: number;
  padId: number;
  padOd: number;
  padRequired: boolean;
  betaRad: number;
  valid: boolean;
  warn?: string;
};

const MPA_TO_PSI = 145.037738;
const MM2_PER_IN2 = 645.16;
const PAD_AREA_EPS = 1e-6;

export const DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS: PipeBranchReinforcementInputs =
  {
    unitSystem: "imperial",
    headerNps: "10",
    headerSchedule: "40",
    branchNps: "6",
    branchSchedule: "40",
    designPressure: 500,
    designTemp: 100,
    allowStressHeader: 20000,
    allowStressBranch: 20000,
    allowStressPad: 20000,
    jointEfficiency: 1,
    weldW: 1,
    yFactor: 0.4,
    corrosionAllowance: 0.0625,
    millTolerance: 12.5,
    branchAngle: 90,
    weldLegHeader: 0.375,
    weldLegBranch: 0.375,
  };

/** @deprecated Prefer DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS (imperial). */
export const DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS_IMPERIAL =
  DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS;

export const DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS_METRIC: PipeBranchReinforcementInputs =
  {
    unitSystem: "metric",
    headerNps: "10",
    headerSchedule: "40",
    branchNps: "6",
    branchSchedule: "40",
    designPressure: 34.5,
    designTemp: 38,
    allowStressHeader: 138,
    allowStressBranch: 138,
    allowStressPad: 138,
    jointEfficiency: 1,
    weldW: 1,
    yFactor: 0.4,
    corrosionAllowance: 1.6,
    millTolerance: 12.5,
    branchAngle: 90,
    weldLegHeader: 9.5,
    weldLegBranch: 9.5,
  };

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function npsNumeric(nps: string): number {
  const n = Number(nps);
  return Number.isFinite(n) ? n : NaN;
}

export function listPipeBranchReinforcementNpsOptions(): {
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

export function resolveBranchSchedule(nps: string, schedule: string): string {
  return (
    resolveScheduleOptionValue(nps, schedule) ||
    defaultScheduleForNps(nps, schedule) ||
    schedule
  );
}

export function pressureToPsi(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? value : barToPsi(value);
}

export function stressToPsi(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? value : value * MPA_TO_PSI;
}

export function lengthToIn(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? value : value / 25.4;
}

export function lengthFromIn(inches: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? inches : inches * 25.4;
}

function tempConvert(value: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to || !Number.isFinite(value)) return value;
  if (from === "imperial" && to === "metric") return ((value - 32) * 5) / 9;
  return (value * 9) / 5 + 32;
}

/** Convert unit-dependent duty fields when the user toggles imperial ↔ metric. */
export function convertPipeBranchReinforcementUnitSystem(
  inputs: PipeBranchReinforcementInputs,
  to: UnitSystem,
): PipeBranchReinforcementInputs {
  const from = inputs.unitSystem;
  if (from === to) return { ...inputs, unitSystem: to };
  return {
    ...inputs,
    unitSystem: to,
    designPressure:
      from === "imperial"
        ? psiToBar(inputs.designPressure)
        : barToPsi(inputs.designPressure),
    designTemp: tempConvert(inputs.designTemp, from, to),
    allowStressHeader:
      from === "imperial"
        ? inputs.allowStressHeader / MPA_TO_PSI
        : inputs.allowStressHeader * MPA_TO_PSI,
    allowStressBranch:
      from === "imperial"
        ? inputs.allowStressBranch / MPA_TO_PSI
        : inputs.allowStressBranch * MPA_TO_PSI,
    allowStressPad:
      from === "imperial"
        ? inputs.allowStressPad / MPA_TO_PSI
        : inputs.allowStressPad * MPA_TO_PSI,
    corrosionAllowance: lengthFromIn(
      lengthToIn(inputs.corrosionAllowance, from),
      to,
    ),
    weldLegHeader: lengthFromIn(lengthToIn(inputs.weldLegHeader, from), to),
    weldLegBranch: lengthFromIn(lengthToIn(inputs.weldLegBranch, from), to),
  };
}

export function computePipeBranchReinforcement(
  inputs: PipeBranchReinforcementInputs,
): PipeBranchReinforcementBreakdown | null {
  const hSch = resolveBranchSchedule(inputs.headerNps, inputs.headerSchedule);
  const bSch = resolveBranchSchedule(inputs.branchNps, inputs.branchSchedule);
  const header = getPipeScheduleEntry(inputs.headerNps, hSch);
  const branch = getPipeScheduleEntry(inputs.branchNps, bSch);
  if (!header || !branch) return null;

  const P = pressureToPsi(inputs.designPressure, inputs.unitSystem);
  const Sh = stressToPsi(inputs.allowStressHeader, inputs.unitSystem);
  const Sb = stressToPsi(inputs.allowStressBranch, inputs.unitSystem);
  const Sr = stressToPsi(inputs.allowStressPad, inputs.unitSystem);
  const E = finite(inputs.jointEfficiency, 1);
  const W = finite(inputs.weldW, 1);
  const Y = finite(inputs.yFactor, 0.4);
  const c = lengthToIn(finite(inputs.corrosionAllowance), inputs.unitSystem);
  const millFactor = 1 - finite(inputs.millTolerance, 12.5) / 100;

  const angle = Math.min(90, Math.max(45, finite(inputs.branchAngle, 90)));
  const betaRad = (angle * Math.PI) / 180;
  const sinBeta = Math.sin(betaRad);
  if (Math.abs(sinBeta) < 1e-9) return null;

  const Dh = header.pipe.outsideDiameterMm / 25.4;
  const Db = branch.pipe.outsideDiameterMm / 25.4;
  const ThBar = (header.row.wallThicknessMm / 25.4) * millFactor;
  const TbBar = (branch.row.wallThicknessMm / 25.4) * millFactor;

  if (P <= 0 || Sh <= 0 || Sb <= 0 || E <= 0 || W <= 0) return null;

  const th = (P * Dh) / (2 * (Sh * E * W + P * Y));
  const tb = (P * Db) / (2 * (Sb * E * W + P * Y));

  const d1 = (Db - 2 * (TbBar - c)) / sinBeta;
  const d2Candidate = Math.max(
    d1,
    TbBar - c + (ThBar - c) + d1 / 2,
  );
  const d2 = Math.min(Dh, d2Candidate);

  const ApadThk = 0;
  const L4 = Math.min(
    2.5 * (ThBar - c),
    2.5 * (TbBar - c) + ApadThk,
  );

  const legH = lengthToIn(finite(inputs.weldLegHeader), inputs.unitSystem);
  const legB = lengthToIn(finite(inputs.weldLegBranch), inputs.unitSystem);
  const A1 = d1 * th * (2 - sinBeta);
  const A2 = Math.max(0, (2 * d2 - d1) * (ThBar - th - c));
  const A3 = Math.max(0, (2 * L4 * (TbBar - tb - c)) / sinBeta);
  const A4 = legH * legH + legB * legB;
  const AAvail = A2 + A3 + A4;
  const deltaA = AAvail - A1;
  const AReqPad = Math.max(0, -deltaA);

  const AReqMetal =
    Sr < Sh && AReqPad > 0
      ? AReqPad / Math.max(Sr / Sh, 1e-9)
      : AReqPad;

  const WPad = Math.max(d2 - Db / 2, 0.5);
  const TPad = AReqMetal > 0 ? AReqMetal / (2 * WPad) : 0;
  const padId = Db;
  const padOd = Math.min(Dh, Db + 2 * WPad);

  let warn: string | undefined;
  if (!isBranchNpsValid(inputs.headerNps, inputs.branchNps)) {
    warn = "Branch NPS must be ≤ Header NPS.";
  } else if (finite(inputs.branchAngle, 90) < 45) {
    warn = "Branch angle < 45° — outside ASME B31.3 Para. 304.3 equation range.";
  }

  return {
    Dh,
    Db,
    ThBar,
    TbBar,
    th,
    tb,
    d1,
    d2,
    L4,
    A1,
    A2,
    A3,
    A4,
    AAvail,
    deltaA,
    AReqPad,
    AReqMetal,
    WPad,
    TPad,
    padId,
    padOd,
    padRequired: AReqPad > PAD_AREA_EPS,
    betaRad,
    valid: !warn || Boolean(warn && warn.includes("45°")),
    warn,
  };
}

function formatLen(inches: number, unitSystem: UnitSystem, digits = 3): string {
  if (!Number.isFinite(inches)) return "—";
  const value = lengthFromIn(inches, unitSystem);
  const unit = unitSystem === "imperial" ? "in" : "mm";
  if (unitSystem === "metric") {
    const d = Math.abs(value) >= 10 ? 1 : 2;
    return `${value.toFixed(d)} ${unit}`;
  }
  return `${value.toFixed(digits)} ${unit}`;
}

function formatArea(in2: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(in2)) return "—";
  if (unitSystem === "imperial") return `${in2.toFixed(3)} in²`;
  return `${(in2 * MM2_PER_IN2).toFixed(0)} mm²`;
}

function formatPressure(psi: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(psi)) return "—";
  if (unitSystem === "imperial") return `${Math.round(psi)} psi`;
  return `${psiToBar(psi).toFixed(1)} bar`;
}

function formatStress(psi: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(psi)) return "—";
  if (unitSystem === "imperial") return `${Math.round(psi).toLocaleString("en-US")} psi`;
  return `${(psi / MPA_TO_PSI).toFixed(0)} MPa`;
}

function statusLevel(padRequired: boolean, invalid: boolean): StatusLevel {
  if (invalid) return "warn";
  return padRequired ? "warn" : "pass";
}

export function calculatePipeBranchReinforcement(
  inputs: PipeBranchReinforcementInputs,
): CalculatorOutput {
  const calc = computePipeBranchReinforcement(inputs);
  const us = inputs.unitSystem;

  if (!calc) {
    return {
      heroLabel: "Required Pad Area (A_req)",
      heroValue: "—",
      heroStatus: "Select valid NPS × schedule for header and branch",
      heroStatusLevel: "warn",
      summary: [
        {
          label: "Header",
          value: inputs.headerNps ? `${inputs.headerNps}"` : "—",
        },
        {
          label: "Branch",
          value: inputs.branchNps ? `${inputs.branchNps}"` : "—",
        },
      ],
      summaryStatus: { label: "Check NPS / schedule / inputs", level: "warn" },
      rows: [],
      exportRows: [],
      callouts: [
        {
          tone: "warn",
          title: "Geometry lookup failed",
          body: "No matching pipe schedule geometry for this header/branch NPS × schedule. Pick sizes available in ASME B36.10M / B36.19M tables.",
        },
      ],
    };
  }

  const invalid = !calc.valid;
  const padStatus = calc.padRequired ? "Pad Required" : "Adequate without Pad";
  const heroValue = formatArea(calc.AReqPad, us);
  const level = statusLevel(calc.padRequired, invalid);

  const hSch = resolveBranchSchedule(inputs.headerNps, inputs.headerSchedule);
  const bSch = resolveBranchSchedule(inputs.branchNps, inputs.branchSchedule);
  const jointLabel = `${inputs.branchNps}" branch on ${inputs.headerNps}" header @ ${finite(inputs.branchAngle, 90).toFixed(0)}°`;

  const callouts: NonNullable<CalculatorOutput["callouts"]> = [];

  if (calc.padRequired) {
    callouts.push({
      tone: "warn",
      title: "Reinforcement pad required",
      body: `Required pad area A_req = ${formatArea(calc.AReqPad, us)}. Available excess (A₂+A₃+A₄) is below A₁ — review recommended pad OD/ID/thickness below.`,
    });
  }
  if (!isBranchNpsValid(inputs.headerNps, inputs.branchNps)) {
    callouts.push({
      tone: "warn",
      title: "Branch size exceeds header",
      body: "Branch size D_b > D_h is outside this screening tool. Branch size cannot exceed header size for standard ASME B31.3 Para. 304.3 equations.",
    });
  }
  if (finite(inputs.branchAngle, 90) < 45) {
    callouts.push({
      tone: "warn",
      title: "Branch angle below 45°",
      body: "Branch angle β < 45° is outside standard ASME B31.3 Para. 304.3 equations — verify with detailed analysis.",
    });
  }

  return {
    heroLabel: "Required Pad Area (A_req)",
    heroValue: invalid ? "—" : heroValue,
    heroStatus: invalid
      ? (calc.warn ?? "Invalid branch / header combination")
      : `${padStatus} · ${jointLabel}`,
    heroStatusLevel: level,
    heroBadges: invalid
      ? [
          { label: "Header", value: `${inputs.headerNps}"` },
          { label: "Branch", value: `${inputs.branchNps}"` },
        ]
      : [
          { label: "Status", value: padStatus },
          { label: "ΔA (avail − A₁)", value: formatArea(calc.deltaA, us) },
        ],
    summary: [
      { label: "Required Area (A₁)", value: formatArea(calc.A1, us) },
      {
        label: "Available without Pad (A₂+A₃+A₄)",
        value: formatArea(calc.AAvail, us),
      },
      {
        label: "Net Excess / Deficit (ΔA)",
        value: formatArea(calc.deltaA, us),
      },
      {
        label: calc.padRequired ? "Recommended T_pad" : "Pad status",
        value: calc.padRequired ? formatLen(calc.TPad, us) : padStatus,
      },
    ],
    summaryStatus: {
      label: invalid ? (calc.warn ?? "Invalid inputs") : padStatus,
      level,
    },
    rows: [
      {
        label: "Header / Branch",
        value: `NPS ${inputs.headerNps}" Sch ${hSch} · NPS ${inputs.branchNps}" Sch ${bSch}`,
        section: "Calculation basis",
      },
      {
        label: "OD_h × OD_b",
        value: `${formatLen(calc.Dh, us, 2)} × ${formatLen(calc.Db, us, 2)}`,
        section: "Calculation basis",
      },
      {
        label: "P · β",
        value: `${formatPressure(pressureToPsi(inputs.designPressure, us), us)} · ${finite(inputs.branchAngle, 90).toFixed(0)}°`,
        section: "Calculation basis",
      },
      {
        label: "t_h / T_H (mill-adj.)",
        value: `${formatLen(calc.th, us)} / ${formatLen(calc.ThBar, us)}`,
        section: "Calculation basis",
        emphasis: true,
      },
      {
        label: "t_b / T_B (mill-adj.)",
        value: `${formatLen(calc.tb, us)} / ${formatLen(calc.TbBar, us)}`,
        section: "Calculation basis",
      },
      {
        label: "d₁ · d₂ · L₄",
        value: `${formatLen(calc.d1, us)} · ${formatLen(calc.d2, us)} · ${formatLen(calc.L4, us)}`,
        section: "Calculation basis",
        emphasis: true,
      },
      {
        label: "A₂ · A₃ · A₄",
        value: `${formatArea(calc.A2, us)} · ${formatArea(calc.A3, us)} · ${formatArea(calc.A4, us)}`,
        section: "Calculation basis",
      },
      {
        label: "Pad ID × OD × T_pad",
        value: `${formatLen(calc.padId, us, 2)} × ${formatLen(calc.padOd, us, 2)} × ${formatLen(calc.TPad, us)}`,
        section: "Calculation basis",
        emphasis: calc.padRequired,
        highlight: calc.padRequired ? "primary" : undefined,
      },
    ],
    callouts,
    exportRows: [
      { label: "Standard", value: "ASME B31.3 Para. 304.3.3 (screening)" },
      { label: "Header NPS", value: inputs.headerNps },
      { label: "Header schedule", value: hSch },
      { label: "Branch NPS", value: inputs.branchNps },
      { label: "Branch schedule", value: bSch },
      {
        label: "Design pressure",
        value: formatPressure(
          pressureToPsi(inputs.designPressure, us),
          us,
        ),
      },
      {
        label: "Design temperature",
        value: `${Math.round(finite(inputs.designTemp))} ${us === "imperial" ? "°F" : "°C"}`,
      },
      { label: "Branch angle (deg)", value: String(inputs.branchAngle) },
      { label: "A1", value: formatArea(calc.A1, us) },
      { label: "A2", value: formatArea(calc.A2, us) },
      { label: "A3", value: formatArea(calc.A3, us) },
      { label: "A4", value: formatArea(calc.A4, us) },
      { label: "A_avail", value: formatArea(calc.AAvail, us) },
      { label: "Delta A", value: formatArea(calc.deltaA, us) },
      { label: "A_req_pad", value: formatArea(calc.AReqPad, us) },
      { label: "Pad status", value: padStatus },
      { label: "Pad ID", value: formatLen(calc.padId, us, 3) },
      { label: "Pad OD", value: formatLen(calc.padOd, us, 3) },
      { label: "Pad thickness", value: formatLen(calc.TPad, us, 3) },
    ],
  };
}

/** Combinatorial spec: `{branch}-on-{header}-sch-{sch}-{angle}deg` */
export function buildPipeBranchReinforcementSpec(
  branchNps: string,
  headerNps: string,
  schedule: string,
  angleDeg: number,
): string {
  const sch = String(schedule).replace(/^Sch\s+/i, "");
  const ang = Math.round(finite(angleDeg, 90));
  return `${branchNps}-on-${headerNps}-sch-${sch}-${ang}deg`;
}

export function listPipeBranchReinforcementPseoRoutes(slug: string): {
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
        if (
          !getPipeScheduleEntry(header, sch) ||
          !getPipeScheduleEntry(branch, sch)
        ) {
          continue;
        }
        for (const angle of PIPE_COPING_PSEO_ANGLES) {
          const spec = buildPipeBranchReinforcementSpec(
            branch,
            header,
            sch,
            angle,
          );
          routes.push({
            slug,
            spec,
            query: {
              hnps: header,
              bnps: branch,
              hsch: sch,
              bsch: sch,
              angle: String(angle),
            },
            label: `${branch}" on ${header}" Sch ${sch} · ${angle}°`,
          });
        }
      }
    }
  }

  return routes;
}

export {
  PIPE_COPING_SCHEDULE_PREFS as PIPE_BRANCH_REINFORCEMENT_SCHEDULE_PREFS,
};
