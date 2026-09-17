/**
 * Pipe Slope & Drainage Ratio — geometric slope + IPC Table 704.1–style screening.
 * ASME B31.3 referenced for process gravity-drain context (screening only).
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";

export type PipeSlopeInputs = {
  unitSystem: UnitSystem;
  rise: number;
  run: number;
  pipeNps: string;
};

export const RISE_RANGE = { min: 0.1, max: 120 } as const;
export const RUN_RANGE = { min: 1, max: 1000 } as const;

/** Imperial default: 4" · 10 ft run · 2.5 in rise = 1/4"/ft (2.08%). */
export const DEFAULT_PIPE_SLOPE_INPUTS: PipeSlopeInputs = {
  unitSystem: "imperial",
  rise: 2.5,
  run: 10,
  pipeNps: "4",
};

/** Metric twin of the imperial default duty (≈2%). */
export const DEFAULT_PIPE_SLOPE_INPUTS_METRIC: PipeSlopeInputs = {
  unitSystem: "metric",
  rise: 60,
  run: 3,
  pipeNps: "4",
};

/** IPC Table 704.1–style min slope (inch per foot of run). */
export function ipcMinSlopeInPerFt(nps: string): number {
  const n = Number.parseFloat(nps);
  if (!Number.isFinite(n) || n <= 0) return 0.25;
  if (n <= 3) return 0.25; // 1/4"/ft
  if (n <= 6) return 0.125; // 1/8"/ft
  return 0.0625; // 1/16"/ft
}

export function ipcMinSlopeLabel(nps: string, imperial: boolean): string {
  const ipf = ipcMinSlopeInPerFt(nps);
  if (imperial) {
    if (ipf >= 0.25) return "1/4 in/ft";
    if (ipf >= 0.125) return "1/8 in/ft";
    return "1/16 in/ft";
  }
  const mmPerM = (ipf * 25.4) / 0.3048;
  return `${mmPerM.toFixed(1)} mm/m`;
}

export type PipeSlopeComputed = {
  invalid: boolean;
  invalidReason?: string;
  /** Dimensionless slope rise/run (same length basis). */
  slopeFraction: number;
  slopePercent: number;
  /** Imperial expression: inches of fall per foot of run. */
  slopeInPerFt: number;
  /** Metric expression: mm of fall per metre of run. */
  slopeMmPerM: number;
  slopeAngleDeg: number;
  /** Ratio denominator for 1 : N (N = 1/S). */
  ratioN: number;
  riseDisplay: number;
  runDisplay: number;
  riseUnit: string;
  runUnit: string;
  ipcMinInPerFt: number;
  ipcMinLabel: string;
  compliant: boolean;
  pipeNps: string;
};

export function computePipeSlope(inputs: PipeSlopeInputs): PipeSlopeComputed {
  const imperial = inputs.unitSystem === "imperial";
  const riseUnit = imperial ? "in" : "mm";
  const runUnit = imperial ? "ft" : "m";

  const empty = (reason: string): PipeSlopeComputed => ({
    invalid: true,
    invalidReason: reason,
    slopeFraction: NaN,
    slopePercent: NaN,
    slopeInPerFt: NaN,
    slopeMmPerM: NaN,
    slopeAngleDeg: NaN,
    ratioN: NaN,
    riseDisplay: inputs.rise,
    runDisplay: inputs.run,
    riseUnit,
    runUnit,
    ipcMinInPerFt: ipcMinSlopeInPerFt(inputs.pipeNps),
    ipcMinLabel: ipcMinSlopeLabel(inputs.pipeNps, imperial),
    compliant: false,
    pipeNps: inputs.pipeNps,
  });

  if (!Number.isFinite(inputs.rise) || !Number.isFinite(inputs.run)) {
    return empty("Enter valid rise and run values");
  }
  if (inputs.rise < RISE_RANGE.min || inputs.rise > RISE_RANGE.max) {
    return empty(
      `Rise must be ${RISE_RANGE.min}–${RISE_RANGE.max} ${riseUnit}`,
    );
  }
  if (inputs.run < RUN_RANGE.min || inputs.run > RUN_RANGE.max) {
    return empty(`Run must be ${RUN_RANGE.min}–${RUN_RANGE.max} ${runUnit}`);
  }
  if (!String(inputs.pipeNps || "").trim()) {
    return empty("Select pipe NPS for the IPC minimum slope band");
  }

  const riseM = imperial ? inputs.rise * 0.0254 : inputs.rise / 1000;
  const runM = imperial ? inputs.run * 0.3048 : inputs.run;
  const slopeFraction = riseM / runM;
  const slopePercent = slopeFraction * 100;
  const slopeInPerFt = imperial
    ? inputs.rise / inputs.run
    : riseM / 0.0254 / (runM / 0.3048);
  const slopeMmPerM = (riseM * 1000) / runM;
  const slopeAngleDeg = (Math.atan(slopeFraction) * 180) / Math.PI;
  const ratioN =
    slopeFraction > 0 ? 1 / slopeFraction : Number.POSITIVE_INFINITY;

  const ipcMin = ipcMinSlopeInPerFt(inputs.pipeNps);
  const compliant = slopeInPerFt + 1e-9 >= ipcMin;

  return {
    invalid: false,
    slopeFraction,
    slopePercent,
    slopeInPerFt,
    slopeMmPerM,
    slopeAngleDeg,
    ratioN,
    riseDisplay: inputs.rise,
    runDisplay: inputs.run,
    riseUnit,
    runUnit,
    ipcMinInPerFt: ipcMin,
    ipcMinLabel: ipcMinSlopeLabel(inputs.pipeNps, imperial),
    compliant,
    pipeNps: inputs.pipeNps,
  };
}

function formatInPerFt(ipf: number): string {
  if (Math.abs(ipf - 0.25) < 0.005) return "1/4 in/ft";
  if (Math.abs(ipf - 0.125) < 0.005) return "1/8 in/ft";
  if (Math.abs(ipf - 0.0625) < 0.005) return "1/16 in/ft";
  return `${ipf.toFixed(3)} in/ft`;
}

function formatRatio(ratioN: number): string {
  if (!Number.isFinite(ratioN) || ratioN > 1e6) return "—";
  const rounded = Math.round(ratioN);
  if (Math.abs(ratioN - rounded) < 0.05) return `1:${rounded}`;
  return `1:${ratioN.toFixed(1)}`;
}

function formatSlopeShort(c: PipeSlopeComputed, imperial: boolean): string {
  if (c.invalid) return "—";
  return imperial
    ? formatInPerFt(c.slopeInPerFt)
    : `${c.slopeMmPerM.toFixed(1)} mm/m`;
}

export function calculatePipeSlope(inputs: PipeSlopeInputs): CalculatorOutput {
  const c = computePipeSlope(inputs);
  const imperial = inputs.unitSystem === "imperial";

  let heroStatusLevel: StatusLevel = "pass";
  let heroStatus = "Pass";
  if (c.invalid) {
    heroStatusLevel = "fail";
    heroStatus = "Check inputs";
  } else if (!c.compliant) {
    heroStatusLevel = "fail";
    heroStatus = "Below IPC min";
  }

  const callouts: ResultCallout[] = [];
  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Check rise / run / NPS",
      body: c.invalidReason,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Screening Note",
      body: "Geometric slope and IPC Table 704.1–style minima are gravity-drain screening only. Plant process drains may need steeper slopes — confirm project specs. Not for pressurized or two-phase lines (ASME B31.3 hydraulic / regime analysis).",
    });
    if (!c.compliant) {
      callouts.unshift({
        tone: "warn",
        title: "Below IPC minimum slope",
        body: `Slope ${formatSlopeShort(c, imperial)} is below the IPC screening minimum ${c.ipcMinLabel} for NPS ${c.pipeNps}. Increase rise or shorten run.`,
      });
    }
  }

  const rows: ResultRow[] = [];
  if (!c.invalid) {
    const runSamples = imperial ? [5, 10, 20, 50] : [1.5, 3, 6, 15];
    for (const run of runSamples) {
      const drop = c.slopeFraction * (imperial ? run * 0.3048 : run);
      const dropDisp = imperial ? drop / 0.0254 : drop * 1000;
      rows.push({
        section: "Drop at this slope",
        label: `${run} ${c.runUnit} run`,
        value: `${dropDisp.toFixed(2)} ${c.riseUnit}`,
        emphasis: Math.abs(run - c.runDisplay) < 1e-6,
      });
    }
  }

  const heroSecondary = formatSlopeShort(c, imperial);

  return {
    heroLabel: "Slope",
    heroValue: c.invalid
      ? "—"
      : `${c.slopePercent.toFixed(2)}% · ${heroSecondary} · ${formatRatio(c.ratioN)}`,
    heroStatus,
    heroStatusLevel,
    heroBadges: c.invalid
      ? undefined
      : [
          {
            label: "θ",
            value: `${c.slopeAngleDeg.toFixed(2)}°`,
          },
          {
            label: "IPC min",
            value: c.ipcMinLabel,
          },
        ],
    summary: [
      {
        label: "Slope angle θ",
        value: c.invalid ? "—" : `${c.slopeAngleDeg.toFixed(2)}°`,
      },
      {
        label: "IPC min slope",
        value: c.ipcMinLabel,
      },
      {
        label: "NPS band",
        value: `NPS ${c.pipeNps}`,
      },
    ],
    summaryStatus: {
      label: heroStatus,
      level: heroStatusLevel,
    },
    rows,
    callouts,
    exportRows: [
      {
        label: "Standard",
        value: "IPC Table 704.1–style / B31.3 gravity screening",
      },
      { label: "NPS", value: c.pipeNps },
      {
        label: "Rise",
        value: `${c.riseDisplay} ${c.riseUnit}`,
      },
      { label: "Run", value: `${c.runDisplay} ${c.runUnit}` },
      {
        label: "Slope %",
        value: c.invalid ? "—" : `${c.slopePercent.toFixed(3)}%`,
      },
      {
        label: "Slope in/ft",
        value: c.invalid ? "—" : c.slopeInPerFt.toFixed(4),
      },
      {
        label: "Slope mm/m",
        value: c.invalid ? "—" : c.slopeMmPerM.toFixed(2),
      },
      {
        label: "Ratio",
        value: c.invalid ? "—" : formatRatio(c.ratioN),
      },
      {
        label: "Angle deg",
        value: c.invalid ? "—" : c.slopeAngleDeg.toFixed(3),
      },
      { label: "IPC min", value: c.ipcMinLabel },
      {
        label: "Compliance",
        value: c.invalid ? "—" : c.compliant ? "Pass" : "Fail",
      },
    ],
  };
}
