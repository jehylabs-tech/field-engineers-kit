/**
 * Noise Criterion (NC) Rating — ANSI/ASA S12.2 tangent method
 * with ASHRAE HVAC Applications space-type screening limits.
 *
 * NC = max over octave bands of the lowest NC curve not exceeded by L_p(f_i)
 * dBA ≈ NC + 5 … 8 dB (screening estimate)
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import ncTable from "../../../../data/inspection/ncCurves.json";

export const NC_FREQUENCIES_HZ = ncTable.frequenciesHz as readonly number[];
export const NC_LEVELS = ncTable.ncLevels as readonly number[];

const CURVES = ncTable.curves as Record<string, number[]>;

export type NoiseSpaceType =
  | "control-room"
  | "executive-office"
  | "equipment-room"
  | "workshop";

export type NoiseCriterionInputs = {
  unitSystem: UnitSystem;
  spaceType: NoiseSpaceType;
  spl63Hz: number;
  spl125Hz: number;
  spl250Hz: number;
  spl500Hz: number;
  spl1000Hz: number;
  spl2000Hz: number;
  spl4000Hz: number;
  spl8000Hz: number;
};

export const NOISE_SPACE_OPTIONS: {
  value: NoiseSpaceType;
  label: string;
  maxNc: number;
}[] = [
  {
    value: "control-room",
    label: "Control Room",
    maxNc: 35,
  },
  {
    value: "executive-office",
    label: "Executive Office",
    maxNc: 30,
  },
  {
    value: "equipment-room",
    label: "Equipment Room",
    maxNc: 50,
  },
  {
    value: "workshop",
    label: "Workshop",
    maxNc: 55,
  },
];

export const SPL_FIELD_KEYS = [
  "spl63Hz",
  "spl125Hz",
  "spl250Hz",
  "spl500Hz",
  "spl1000Hz",
  "spl2000Hz",
  "spl4000Hz",
  "spl8000Hz",
] as const;

export type SplFieldKey = (typeof SPL_FIELD_KEYS)[number];

export const SPL_RANGE = { min: 0, max: 130 } as const;

/** Default = Control Room duty on the NC-35-rated spectrum (spec). */
export const DEFAULT_NOISE_CRITERION_INPUTS: NoiseCriterionInputs = {
  unitSystem: "metric",
  spaceType: "control-room",
  spl63Hz: 55,
  spl125Hz: 48,
  spl250Hz: 41,
  spl500Hz: 36,
  spl1000Hz: 31,
  spl2000Hz: 27,
  spl4000Hz: 24,
  spl8000Hz: 22,
};

export function spectrumFromInputs(inputs: NoiseCriterionInputs): number[] {
  return SPL_FIELD_KEYS.map((key) => inputs[key]);
}

export function applySpectrumToInputs(
  inputs: NoiseCriterionInputs,
  spectrum: number[],
): NoiseCriterionInputs {
  const next = { ...inputs };
  for (let i = 0; i < SPL_FIELD_KEYS.length; i++) {
    next[SPL_FIELD_KEYS[i]] = spectrum[i] ?? next[SPL_FIELD_KEYS[i]];
  }
  return next;
}

export function ncCurveLimits(nc: number): number[] | null {
  const row = CURVES[String(nc)];
  return row?.length === NC_FREQUENCIES_HZ.length ? [...row] : null;
}

/** Lowest standard NC curve (≥15) that is nowhere exceeded by L_p. */
export function lowestClearNc(spectrum: number[]): number | null {
  for (const nc of NC_LEVELS) {
    const limits = ncCurveLimits(nc);
    if (!limits) continue;
    let clear = true;
    for (let i = 0; i < spectrum.length; i++) {
      if (spectrum[i] > limits[i] + 1e-9) {
        clear = false;
        break;
      }
    }
    if (clear) return nc;
  }
  return null;
}

/**
 * Per-band required NC (interpolated), then tangent rating = max band demand
 * rounded up to the next published NC-5 step.
 */
export function bandRequiredNc(spl: number, bandIndex: number): number {
  const levels = [...NC_LEVELS];
  for (let i = 0; i < levels.length; i++) {
    const lim = CURVES[String(levels[i])][bandIndex];
    if (spl <= lim + 1e-9) return levels[i];
  }
  return levels[levels.length - 1] + 5;
}

export function computeTangentNc(spectrum: number[]): {
  ncRating: number;
  exceedsTable: boolean;
  tangentBandIndex: number;
  bandNc: number[];
} {
  const bandNc = spectrum.map((spl, i) => bandRequiredNc(spl, i));
  let maxNc = Math.max(...bandNc);
  let tangentBandIndex = bandNc.indexOf(maxNc);
  // Prefer the band that sits closest to the rated curve (true tangent).
  const clear = lowestClearNc(spectrum);
  if (clear != null) {
    maxNc = clear;
    const limits = ncCurveLimits(clear)!;
    let bestGap = Number.POSITIVE_INFINITY;
    for (let i = 0; i < spectrum.length; i++) {
      const gap = limits[i] - spectrum[i];
      if (gap >= -1e-9 && gap < bestGap) {
        bestGap = gap;
        tangentBandIndex = i;
      }
    }
  }
  const exceedsTable = clear == null && maxNc > NC_LEVELS[NC_LEVELS.length - 1];
  return {
    ncRating: clear ?? Math.min(maxNc, NC_LEVELS[NC_LEVELS.length - 1] + 5),
    exceedsTable: clear == null,
    tangentBandIndex,
    bandNc,
  };
}

export function spaceMeta(spaceType: NoiseSpaceType) {
  return (
    NOISE_SPACE_OPTIONS.find((s) => s.value === spaceType) ??
    NOISE_SPACE_OPTIONS[0]
  );
}

export type NoiseCriterionComputed = {
  spectrum: number[];
  ncRating: number;
  exceedsTable: boolean;
  tangentBandIndex: number;
  tangentFrequencyHz: number;
  bandNc: number[];
  maxNcAllowed: number;
  compliant: boolean;
  dbaLow: number;
  dbaHigh: number;
  spaceLabel: string;
  invalid: boolean;
  invalidReason?: string;
};

export function computeNoiseCriterion(
  inputs: NoiseCriterionInputs,
): NoiseCriterionComputed {
  const spectrum = spectrumFromInputs(inputs);
  const space = spaceMeta(inputs.spaceType);

  for (let i = 0; i < spectrum.length; i++) {
    if (!Number.isFinite(spectrum[i])) {
      return {
        spectrum,
        ncRating: NaN,
        exceedsTable: false,
        tangentBandIndex: 0,
        tangentFrequencyHz: NC_FREQUENCIES_HZ[0],
        bandNc: [],
        maxNcAllowed: space.maxNc,
        compliant: false,
        dbaLow: NaN,
        dbaHigh: NaN,
        spaceLabel: space.label,
        invalid: true,
        invalidReason: "Enter valid octave-band SPL values (0–130 dB)",
      };
    }
    if (spectrum[i] < SPL_RANGE.min || spectrum[i] > SPL_RANGE.max) {
      return {
        spectrum,
        ncRating: NaN,
        exceedsTable: false,
        tangentBandIndex: 0,
        tangentFrequencyHz: NC_FREQUENCIES_HZ[0],
        bandNc: [],
        maxNcAllowed: space.maxNc,
        compliant: false,
        dbaLow: NaN,
        dbaHigh: NaN,
        spaceLabel: space.label,
        invalid: true,
        invalidReason: `SPL must be ${SPL_RANGE.min}–${SPL_RANGE.max} dB in every octave band`,
      };
    }
  }

  const tangent = computeTangentNc(spectrum);
  const compliant =
    !tangent.exceedsTable && tangent.ncRating <= space.maxNc;

  return {
    spectrum,
    ncRating: tangent.ncRating,
    exceedsTable: tangent.exceedsTable,
    tangentBandIndex: tangent.tangentBandIndex,
    tangentFrequencyHz: NC_FREQUENCIES_HZ[tangent.tangentBandIndex],
    bandNc: tangent.bandNc,
    maxNcAllowed: space.maxNc,
    compliant,
    dbaLow: tangent.ncRating + 5,
    dbaHigh: tangent.ncRating + 8,
    spaceLabel: space.label,
    invalid: false,
  };
}

function ncLabel(nc: number, exceeds: boolean): string {
  if (!Number.isFinite(nc)) return "—";
  if (exceeds || nc > NC_LEVELS[NC_LEVELS.length - 1]) {
    return `>NC-${NC_LEVELS[NC_LEVELS.length - 1]}`;
  }
  return `NC-${nc}`;
}

export function calculateNoiseCriterion(
  inputs: NoiseCriterionInputs,
): CalculatorOutput {
  const c = computeNoiseCriterion(inputs);

  let heroStatusLevel: StatusLevel = "pass";
  let heroStatus = "Pass";
  if (c.invalid) {
    heroStatusLevel = "fail";
    heroStatus = "Check inputs";
  } else if (c.exceedsTable) {
    heroStatusLevel = "fail";
    heroStatus = "Above NC-65";
  } else if (!c.compliant) {
    heroStatusLevel = "fail";
    heroStatus = "Fail";
  }

  const callouts: ResultCallout[] = [];
  if (c.invalid && c.invalidReason) {
    callouts.push({
      tone: "warn",
      title: "Check octave-band inputs",
      body: c.invalidReason,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "Screening Note",
      body: "Evaluations follow ANSI/ASA S12.2 tangent method. For low-frequency rumble or tonal noise isolation, perform RC (Room Criterion) or NCB (Balanced Noise Criterion) full analysis.",
    });
    if (!c.compliant && !c.exceedsTable) {
      callouts.unshift({
        tone: "warn",
        title: "Exceeds space NC limit",
        body: `${ncLabel(c.ncRating, false)} is above the ${c.spaceLabel} screening limit NC-${c.maxNcAllowed}. Reduce HVAC / equipment noise or relax the space criterion.`,
      });
    }
  }

  const ratedLimits = ncCurveLimits(
    Math.min(c.ncRating, NC_LEVELS[NC_LEVELS.length - 1]),
  );

  // Lean rows: do not re-echo typed L_p (inputs + chart already show spectrum).
  // Show clearance to the rated NC curve; highlight the tangent band.
  const rows: ResultRow[] = [];
  if (!c.invalid && ratedLimits) {
    const ratedLabel = ncLabel(c.ncRating, c.exceedsTable);
    for (let i = 0; i < NC_FREQUENCIES_HZ.length; i++) {
      const freq = NC_FREQUENCIES_HZ[i];
      const measured = c.spectrum[i];
      const limit = ratedLimits[i];
      const margin = limit - measured;
      const isTangent = i === c.tangentBandIndex;
      const exceeds = margin < -1e-9;
      rows.push({
        section: `Clearance to ${ratedLabel}`,
        label: `${freq} Hz`,
        value: exceeds
          ? `limit ${limit.toFixed(0)} dB · over by ${Math.abs(margin).toFixed(1)} dB`
          : `limit ${limit.toFixed(0)} dB · +${margin.toFixed(1)} dB clear`,
        emphasis: isTangent,
        warn: exceeds,
        highlight: isTangent ? "Tangent" : undefined,
      });
    }
  }

  return {
    heroLabel: "NC Rating",
    heroValue: c.invalid
      ? "—"
      : `${ncLabel(c.ncRating, c.exceedsTable)} · ${c.compliant ? "Pass" : "Fail"}`,
    heroStatus: c.invalid
      ? heroStatus
      : `${c.spaceLabel} · max NC-${c.maxNcAllowed}`,
    heroStatusLevel,
    heroBadges: c.invalid
      ? undefined
      : [
          {
            label: "Tangent",
            value: `${c.tangentFrequencyHz} Hz`,
          },
          {
            label: "Est. dBA",
            value: `${c.dbaLow}–${c.dbaHigh}`,
          },
        ],
    summary: [
      {
        label: "Tangent band",
        value: c.invalid ? "—" : `${c.tangentFrequencyHz} Hz`,
      },
      {
        label: "Estimated dBA",
        value: c.invalid ? "—" : `${c.dbaLow}–${c.dbaHigh} dBA`,
      },
      {
        label: "Space NC limit",
        value: `NC-${c.maxNcAllowed} · ${c.spaceLabel}`,
      },
    ],
    summaryStatus: {
      label: heroStatus,
      level: heroStatusLevel,
    },
    rows,
    callouts,
    exportRows: [
      { label: "Standard", value: "ANSI/ASA S12.2 tangent NC / ASHRAE HVAC" },
      { label: "Space type", value: c.spaceLabel },
      { label: "NC rating", value: ncLabel(c.ncRating, c.exceedsTable) },
      {
        label: "Compliance",
        value: c.invalid ? "—" : c.compliant ? "Pass" : "Fail",
      },
      { label: "Max NC allowed", value: `NC-${c.maxNcAllowed}` },
      {
        label: "Tangent band",
        value: c.invalid ? "—" : `${c.tangentFrequencyHz} Hz`,
      },
      {
        label: "Estimated dBA",
        value: c.invalid ? "—" : `${c.dbaLow}–${c.dbaHigh} dBA`,
      },
      ...NC_FREQUENCIES_HZ.map((freq, i) => ({
        label: `L_p ${freq} Hz`,
        value: `${c.spectrum[i]?.toFixed(1) ?? "—"} dB`,
      })),
    ],
  };
}

export function spectrumForNc(nc: number): number[] | null {
  return ncCurveLimits(nc);
}
