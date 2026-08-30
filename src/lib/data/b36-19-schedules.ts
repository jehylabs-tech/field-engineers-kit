type PipeScheduleRow = {
  schedule: string;
  wallThicknessMm: number;
  insideDiameterMm: number;
  weightKgPerM: number;
};

type PipeScheduleSize = {
  nps: string;
  npsLabel: string;
  dn: number;
  outsideDiameterMm: number;
  outsideDiameterIn: number;
  schedules: PipeScheduleRow[];
};

/** Nominal wall thickness (mm) from ASME B36.19M for stainless pipe. */
const B36_19_WALL_MM: Record<
  string,
  { "5S": number; "10S": number; "40S": number; "80S": number }
> = {
  "0.5": { "5S": 1.65, "10S": 2.11, "40S": 2.77, "80S": 3.73 },
  "0.75": { "5S": 1.65, "10S": 2.11, "40S": 2.87, "80S": 3.91 },
  "1": { "5S": 1.65, "10S": 2.77, "40S": 3.38, "80S": 4.55 },
  "1.25": { "5S": 1.65, "10S": 2.77, "40S": 3.56, "80S": 4.85 },
  "1.5": { "5S": 1.65, "10S": 2.77, "40S": 3.68, "80S": 5.08 },
  "2": { "5S": 1.65, "10S": 2.77, "40S": 3.91, "80S": 5.54 },
  "2.5": { "5S": 2.11, "10S": 3.05, "40S": 5.16, "80S": 7.01 },
  "3": { "5S": 2.11, "10S": 3.05, "40S": 5.49, "80S": 7.62 },
  "3.5": { "5S": 2.11, "10S": 3.05, "40S": 5.74, "80S": 8.08 },
  "4": { "5S": 2.11, "10S": 3.05, "40S": 6.02, "80S": 8.56 },
  "5": { "5S": 2.77, "10S": 3.4, "40S": 6.55, "80S": 9.53 },
  "6": { "5S": 2.77, "10S": 3.4, "40S": 7.11, "80S": 10.97 },
  "8": { "5S": 2.77, "10S": 3.76, "40S": 8.18, "80S": 12.7 },
  "10": { "5S": 3.4, "10S": 4.19, "40S": 9.27, "80S": 12.7 },
  "12": { "5S": 3.96, "10S": 4.57, "40S": 9.53, "80S": 12.7 },
  "14": { "5S": 3.96, "10S": 4.78, "40S": 9.53, "80S": 12.7 },
  "16": { "5S": 4.19, "10S": 4.78, "40S": 9.53, "80S": 12.7 },
  "18": { "5S": 4.19, "10S": 4.78, "40S": 9.53, "80S": 12.7 },
  "20": { "5S": 4.78, "10S": 5.54, "40S": 9.53, "80S": 12.7 },
  "24": { "5S": 5.54, "10S": 6.35, "40S": 9.53, "80S": 12.7 },
};

const STAINLESS_SCHEDULES = ["5S", "10S", "40S", "80S"] as const;

const SCHEDULE_ORDER = [
  "5",
  "10",
  "20",
  "30",
  "40",
  "STD",
  "60",
  "80",
  "XS",
  "100",
  "120",
  "140",
  "160",
  "XXS",
  "5S",
  "10S",
  "40S",
  "80S",
];

function steelWeightKgPerM(odMm: number, wallMm: number): number {
  return Number((0.0246615 * wallMm * (odMm - wallMm)).toFixed(2));
}

function scheduleRank(schedule: string): number {
  const index = SCHEDULE_ORDER.indexOf(schedule.toUpperCase());
  return index === -1 ? SCHEDULE_ORDER.length : index;
}

export { scheduleRank };

export function isStainlessSchedule(schedule: string): boolean {
  return /^\d+S$/i.test(schedule);
}

export function enrichPipeWithB3619(pipe: PipeScheduleSize): PipeScheduleSize {
  const walls = B36_19_WALL_MM[pipe.nps];
  if (!walls) return pipe;

  const schedules = [...pipe.schedules];

  for (const schedule of STAINLESS_SCHEDULES) {
    if (schedules.some((row) => row.schedule.toUpperCase() === schedule)) {
      continue;
    }

    const wallMm = walls[schedule];
    const match = schedules.find(
      (row) => Math.abs(row.wallThicknessMm - wallMm) < 0.03,
    );
    schedules.push({
      schedule,
      wallThicknessMm: match?.wallThicknessMm ?? wallMm,
      insideDiameterMm:
        match?.insideDiameterMm ??
        Number((pipe.outsideDiameterMm - 2 * wallMm).toFixed(2)),
      weightKgPerM:
        match?.weightKgPerM ?? steelWeightKgPerM(pipe.outsideDiameterMm, wallMm),
    });
  }

  schedules.sort(
    (a, b) =>
      scheduleRank(a.schedule) - scheduleRank(b.schedule) ||
      a.schedule.localeCompare(b.schedule),
  );

  return { ...pipe, schedules };
}
