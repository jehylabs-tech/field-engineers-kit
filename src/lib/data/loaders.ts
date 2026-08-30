import boltTorqueRaw from "../../../data/mechanical/boltTorque.json";
import flangeDimensionRaw from "../../../data/piping/flangeDimension.json";
import fittingValveDimensionRaw from "../../../data/piping/fittingValveDimension.json";
import buttWeldFittingRaw from "../../../data/piping/buttWeldFitting.json";
import gasketDimensionRaw from "../../../data/piping/gasketDimension.json";
import pipeScheduleRaw from "../../../data/piping/pipeSchedule.json";
import { enrichPipeWithB3619, scheduleRank } from "@/lib/data/b36-19-schedules";

export type PipeScheduleRow = {
  schedule: string;
  wallThicknessMm: number;
  insideDiameterMm: number;
  weightKgPerM: number;
};

export type PipeScheduleSize = {
  nps: string;
  npsLabel: string;
  dn: number;
  outsideDiameterMm: number;
  outsideDiameterIn: number;
  schedules: PipeScheduleRow[];
};

export type PipeScheduleData = {
  standard: string;
  version: number;
  updatedAt: string;
  pipes: PipeScheduleSize[];
};

export type FlangeRatingRow = {
  class: string;
  outsideDiameterMm: number;
  thicknessMm: number;
  raisedFaceDiameterMm: number;
  boltCircleMm: number;
  boltHoleCount: number;
  boltHoleDiameterMm: number;
  hubLengthMm: number;
  weightKg: number;
  studDiameterIn: string;
  studLengthMm: number;
  wrenchAfIn: string;
  wrenchAfMm: number;
  studMassKg: number;
  nutMassKg: number;
  gasketMassKg: number;
};

export type FlangeSize = {
  nps: string;
  npsLabel: string;
  dn: number;
  ratings: FlangeRatingRow[];
};

export type FlangeDimensionData = {
  standard: string;
  version: number;
  updatedAt: string;
  flangeType: string;
  flanges: FlangeSize[];
};

export type FittingValveRatingRow = {
  class: string;
  dimensionMm: number;
  weightKg: number;
};

export type FittingValveSize = {
  nps: string;
  npsLabel: string;
  dn: number;
  ratings: FittingValveRatingRow[];
};

export type FittingValveComponent = {
  id: string;
  label: string;
  standard: string;
  dimensionLabel: string;
  sizes: FittingValveSize[];
};

export type FittingValveDimensionData = {
  standard: string;
  version: number;
  updatedAt: string;
  components: FittingValveComponent[];
};

export type ButtWeldFittingSize = {
  nps: string;
  npsLabel: string;
  dn: number;
  dimensionMm: number;
  weightKgStd: number;
};

export type ButtWeldFittingComponent = {
  id: string;
  label: string;
  standard: string;
  dimensionLabel: string;
  heroSymbol: string;
  sizes: ButtWeldFittingSize[];
};

export type ButtWeldFittingData = {
  standard: string;
  version: number;
  updatedAt: string;
  notes: string;
  bevelAngleDeg: number;
  components: ButtWeldFittingComponent[];
};

export type BoltTorqueRating = {
  class: string;
  studSize: string;
  studSizeMm: number;
  boltCount: number;
  torqueNm: number;
  torqueFtLb: number;
  tighteningPattern: string;
};

export type BoltTorqueSize = {
  nps: string;
  npsLabel: string;
  dn: number;
  ratings: BoltTorqueRating[];
};

export type BoltTorqueData = {
  standard: string;
  version: number;
  updatedAt: string;
  lubrication: string;
  entries: BoltTorqueSize[];
};

export type SpiralWoundGasketRating = {
  class: string;
  innerRingOdMm: number;
  sealingElementOdMm: number;
  outerRingOdMm: number;
  innerDiameterMm: number;
};

export type RtjGasketRating = {
  class: string;
  ringNumber: string;
  pitchDiameterMm: number;
  ringWidthMm: number;
  ringHeightMm: number;
  innerDiameterMm: number;
  /** ASME B16.20 ring style: Octagonal, Oval, RX, or BX. */
  ringStyle?: string;
};

export type GasketRating = SpiralWoundGasketRating | RtjGasketRating;

export type GasketSize = {
  nps: string;
  npsLabel: string;
  dn: number;
  ratings: GasketRating[];
};

export type GasketType = {
  id: string;
  label: string;
  standard: string;
  sizes: GasketSize[];
};

export type GasketDimensionData = {
  standard: string;
  version: number;
  updatedAt: string;
  gasketTypes: GasketType[];
};

const pipeScheduleDataRaw = pipeScheduleRaw as PipeScheduleData;
const pipeScheduleData: PipeScheduleData = {
  ...pipeScheduleDataRaw,
  pipes: pipeScheduleDataRaw.pipes.map(enrichPipeWithB3619),
};
const flangeDimensionData = flangeDimensionRaw as FlangeDimensionData;
const fittingValveDimensionData =
  fittingValveDimensionRaw as FittingValveDimensionData;
const buttWeldFittingData = buttWeldFittingRaw as ButtWeldFittingData;
const boltTorqueData = boltTorqueRaw as BoltTorqueData;
const gasketDimensionData = gasketDimensionRaw as GasketDimensionData;

export function getPipeScheduleData(): PipeScheduleData {
  return pipeScheduleData;
}

export function getPipeScheduleSize(nps: string): PipeScheduleSize | undefined {
  return pipeScheduleData.pipes.find((pipe) => pipe.nps === nps);
}

export function getPipeScheduleEntry(
  nps: string,
  schedule: string,
): { pipe: PipeScheduleSize; row: PipeScheduleRow } | undefined {
  const pipe = getPipeScheduleSize(nps);
  if (!pipe) {
    return undefined;
  }

  const row = pipe.schedules.find(
    (item) => item.schedule.toUpperCase() === schedule.toUpperCase(),
  );
  if (!row) {
    return undefined;
  }

  return { pipe, row };
}

export function listAvailableNps(): PipeScheduleSize[] {
  return pipeScheduleData.pipes;
}

export function listSchedulesForNps(nps: string): PipeScheduleRow[] {
  return getPipeScheduleSize(nps)?.schedules ?? [];
}

/** Dropdown option — one row per logical schedule group (no 40 / 40S duplicates). */
export type PipeScheduleOption = {
  value: string;
  label: string;
  members: string[];
};

function scheduleTokenMap(rows: PipeScheduleRow[]): Map<string, string> {
  return new Map(rows.map((row) => [row.schedule.toUpperCase(), row.schedule]));
}

function groupLabel10(has10: boolean, has10S: boolean): string {
  if (has10 && has10S) return "Sch 10 / 10S (B36.10M / B36.19M)";
  if (has10S) return "Sch 10S (B36.19M)";
  return "Sch 10 (B36.10M)";
}

function groupLabel40(has40: boolean, hasStd: boolean, has40S: boolean): string {
  if (has40 && hasStd && has40S) return "Sch 40 / STD / 40S (B36.10M / B36.19M)";
  if (has40 && has40S) return "Sch 40 / 40S (B36.10M / B36.19M)";
  if (has40 && hasStd) return "Sch 40 / STD (B36.10M)";
  if (hasStd && has40S) return "Sch STD / 40S (B36.10M / B36.19M)";
  if (has40S) return "Sch 40S (B36.19M)";
  if (hasStd) return "STD (B36.10M)";
  return "Sch 40 (B36.10M)";
}

function groupLabel80(has80: boolean, hasXs: boolean, has80S: boolean): string {
  if (has80 && hasXs && has80S) return "Sch 80 / XS / 80S (B36.10M / B36.19M)";
  if (has80 && has80S) return "Sch 80 / 80S (B36.10M / B36.19M)";
  if (has80 && hasXs) return "Sch 80 / XS (B36.10M)";
  if (hasXs && has80S) return "Sch XS / 80S (B36.10M / B36.19M)";
  if (has80S) return "Sch 80S (B36.19M)";
  if (hasXs) return "XS (B36.10M)";
  return "Sch 80 (B36.10M)";
}

/** De-duplicated schedule dropdown options for an NPS with B36.10M / B36.19M labels. */
export function listScheduleOptionsForNps(nps: string): PipeScheduleOption[] {
  const rows = listSchedulesForNps(nps);
  const tokens = scheduleTokenMap(rows);
  const has = (token: string) => tokens.has(token.toUpperCase());
  const pick = (...candidates: string[]) => {
    for (const candidate of candidates) {
      if (has(candidate)) return tokens.get(candidate.toUpperCase())!;
    }
    return "";
  };
  const consumed = new Set<string>();
  const options: PipeScheduleOption[] = [];

  const mark = (aliases: string[]) => {
    for (const alias of aliases) {
      if (has(alias)) consumed.add(alias.toUpperCase());
    }
  };

  if (has("5S")) {
    mark(["5S"]);
    options.push({
      value: pick("5S"),
      label: "Sch 5S (B36.19M)",
      members: [pick("5S")],
    });
  }

  if (has("10") || has("10S")) {
    const members = ["10", "10S"]
      .filter((token) => has(token))
      .map((token) => pick(token));
    mark(["10", "10S"]);
    options.push({
      value: pick("10", "10S"),
      label: groupLabel10(has("10"), has("10S")),
      members,
    });
  }

  if (has("40") || has("STD") || has("40S")) {
    const members = ["40", "STD", "40S"]
      .filter((token) => has(token))
      .map((token) => pick(token));
    mark(["40", "STD", "40S"]);
    options.push({
      value: pick("40", "STD", "40S"),
      label: groupLabel40(has("40"), has("STD"), has("40S")),
      members,
    });
  }

  if (has("80") || has("XS") || has("80S")) {
    const members = ["80", "XS", "80S"]
      .filter((token) => has(token))
      .map((token) => pick(token));
    mark(["80", "XS", "80S"]);
    options.push({
      value: pick("80", "XS", "80S"),
      label: groupLabel80(has("80"), has("XS"), has("80S")),
      members,
    });
  }

  for (const row of rows) {
    const token = row.schedule.toUpperCase();
    if (consumed.has(token)) continue;
    consumed.add(token);
    if (token === "XXS") {
      options.push({
        value: row.schedule,
        label: "XXS (B36.10M)",
        members: [row.schedule],
      });
      continue;
    }
    if (/^\d+$/.test(token)) {
      options.push({
        value: row.schedule,
        label: `Sch ${row.schedule} (B36.10M)`,
        members: [row.schedule],
      });
    }
  }

  options.sort(
    (a, b) =>
      Math.min(...a.members.map(scheduleRank)) -
      Math.min(...b.members.map(scheduleRank)),
  );
  return options;
}

export function resolveScheduleOptionValue(nps: string, schedule: string): string {
  const options = listScheduleOptionsForNps(nps);
  if (!schedule) return options[0]?.value ?? "";
  const match = options.find(
    (option) =>
      option.value.toUpperCase() === schedule.toUpperCase() ||
      option.members.some(
        (member) => member.toUpperCase() === schedule.toUpperCase(),
      ),
  );
  return match?.value ?? schedule;
}

export function formatPipeScheduleLabel(schedule: string): string {
  if (/^\d+S$/i.test(schedule)) return `Sch ${schedule.toUpperCase()} (B36.19M)`;
  if (schedule === "40") return "Sch 40 / STD";
  if (schedule === "80") return "Sch 80 / XS";
  if (schedule === "STD") return "STD";
  if (schedule === "XS") return "XS";
  if (schedule === "XXS") return "XXS";
  return schedule ? `Sch ${schedule}` : "—";
}

/** Prefer Sch 40 group, then first listed option for the NPS. */
export function defaultScheduleForNps(
  nps: string,
  current?: string,
): string {
  const options = listScheduleOptionsForNps(nps);
  if (options.length === 0) return current ?? "";
  if (current) {
    const resolved = resolveScheduleOptionValue(nps, current);
    if (options.some((option) => option.value === resolved)) {
      return resolved;
    }
  }
  const preferred =
    options.find((option) =>
      option.members.some((member) => member.toUpperCase() === "40"),
    ) ?? options[0];
  return preferred.value;
}

/**
 * Schedules typically paired with a B16.5 class for WN hub bore.
 * Thin walls (Sch 10) are omitted for Class 400+; Class 1500/2500 start at Sch 80.
 */
export function listSchedulesForNpsAndClass(
  nps: string,
  pressureClass: string,
): PipeScheduleRow[] {
  const rows = listSchedulesForNps(nps);
  const cls = Number(pressureClass);
  return rows.filter((row) => {
    const token = row.schedule.toUpperCase();
    if (token === "XXS") return true;
    if (token === "XS") return cls >= 400;
    if (token === "STD") return cls < 1500;
    if (/^\d+S$/i.test(token)) return false;
    const n = Number(token);
    if (!Number.isFinite(n)) return true;
    if (cls >= 1500) return n >= 80;
    if (cls >= 400) return n >= 40;
    return true;
  });
}

export function getFlangeDimensionData(): FlangeDimensionData {
  return flangeDimensionData;
}

export function listFlangeNps(): FlangeSize[] {
  return flangeDimensionData.flanges;
}

export function listFlangeClassesForNps(nps: string): FlangeRatingRow[] {
  return flangeDimensionData.flanges.find((flange) => flange.nps === nps)
    ?.ratings ?? [];
}

export function getFlangeDimensionEntry(
  nps: string,
  pressureClass: string,
):
  | {
      flange: FlangeSize;
      rating: FlangeRatingRow;
      flangeType: string;
      standard: string;
    }
  | undefined {
  const flange = flangeDimensionData.flanges.find((item) => item.nps === nps);
  if (!flange) {
    return undefined;
  }

  const rating = flange.ratings.find((item) => item.class === pressureClass);
  if (!rating) {
    return undefined;
  }

  return {
    flange,
    rating,
    flangeType: flangeDimensionData.flangeType,
    standard: flangeDimensionData.standard,
  };
}

export function getFittingValveDimensionData(): FittingValveDimensionData {
  return fittingValveDimensionData;
}

export function listFittingValveComponents(): FittingValveComponent[] {
  return fittingValveDimensionData.components;
}

export function getFittingValveComponent(
  componentId: string,
): FittingValveComponent | undefined {
  return fittingValveDimensionData.components.find(
    (component) => component.id === componentId,
  );
}

export function listFittingValveNps(componentId: string): FittingValveSize[] {
  return getFittingValveComponent(componentId)?.sizes ?? [];
}

export function listFittingValveClassesForNps(
  componentId: string,
  nps: string,
): FittingValveRatingRow[] {
  return (
    getFittingValveComponent(componentId)?.sizes.find((size) => size.nps === nps)
      ?.ratings ?? []
  );
}

export function getFittingValveDimensionEntry(
  componentId: string,
  nps: string,
  pressureClass: string,
):
  | {
      component: FittingValveComponent;
      size: FittingValveSize;
      rating: FittingValveRatingRow;
    }
  | undefined {
  const component = getFittingValveComponent(componentId);
  if (!component) {
    return undefined;
  }

  const size = component.sizes.find((item) => item.nps === nps);
  if (!size) {
    return undefined;
  }

  const rating = size.ratings.find((item) => item.class === pressureClass);
  if (!rating) {
    return undefined;
  }

  return { component, size, rating };
}

export function getButtWeldFittingData(): ButtWeldFittingData {
  return buttWeldFittingData;
}

export function listButtWeldFittingComponents(): ButtWeldFittingComponent[] {
  return buttWeldFittingData.components;
}

export function getButtWeldFittingComponent(
  componentId: string,
): ButtWeldFittingComponent | undefined {
  return buttWeldFittingData.components.find(
    (component) => component.id === componentId,
  );
}

export function listButtWeldFittingNps(
  componentId: string,
): ButtWeldFittingSize[] {
  return getButtWeldFittingComponent(componentId)?.sizes ?? [];
}

export function getButtWeldFittingSize(
  componentId: string,
  nps: string,
): ButtWeldFittingSize | undefined {
  return getButtWeldFittingComponent(componentId)?.sizes.find(
    (size) => size.nps === nps,
  );
}

export function getBoltTorqueData(): BoltTorqueData {
  return boltTorqueData;
}

export function listBoltTorqueNps(): BoltTorqueSize[] {
  return boltTorqueData.entries;
}

export function listBoltTorqueClassesForNps(nps: string): BoltTorqueRating[] {
  return boltTorqueData.entries.find((entry) => entry.nps === nps)?.ratings ?? [];
}

export function getBoltTorqueEntry(
  nps: string,
  pressureClass: string,
):
  | {
      size: BoltTorqueSize;
      rating: BoltTorqueRating;
      lubrication: string;
      standard: string;
    }
  | undefined {
  const size = boltTorqueData.entries.find((entry) => entry.nps === nps);
  if (!size) {
    return undefined;
  }

  const rating = size.ratings.find((item) => item.class === pressureClass);
  if (!rating) {
    return undefined;
  }

  return {
    size,
    rating,
    lubrication: boltTorqueData.lubrication,
    standard: boltTorqueData.standard,
  };
}

export function getGasketDimensionData(): GasketDimensionData {
  return gasketDimensionData;
}

export function listGasketTypes(): GasketType[] {
  return gasketDimensionData.gasketTypes;
}

export function getGasketType(gasketTypeId: string): GasketType | undefined {
  return gasketDimensionData.gasketTypes.find((type) => type.id === gasketTypeId);
}

export function listGasketNps(gasketTypeId: string): GasketSize[] {
  return getGasketType(gasketTypeId)?.sizes ?? [];
}

export function listGasketClassesForNps(
  gasketTypeId: string,
  nps: string,
): GasketRating[] {
  return getGasketType(gasketTypeId)?.sizes.find((size) => size.nps === nps)
    ?.ratings ?? [];
}

export function getGasketDimensionEntry(
  gasketTypeId: string,
  nps: string,
  pressureClass: string,
):
  | {
      gasketType: GasketType;
      size: GasketSize;
      rating: GasketRating;
    }
  | undefined {
  const gasketType = getGasketType(gasketTypeId);
  if (!gasketType) {
    return undefined;
  }

  const size = gasketType.sizes.find((item) => item.nps === nps);
  if (!size) {
    return undefined;
  }

  const rating = size.ratings.find((item) => item.class === pressureClass);
  if (!rating) {
    return undefined;
  }

  return { gasketType, size, rating };
}
