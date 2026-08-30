import type { CalculatorType } from "@/lib/calculators/definitions";
import { mapExpansionMaterial } from "@/lib/calculators/engines/thermal-expansion";
import {
  mapPipeThicknessMaterialId,
  PIPE_THICKNESS_MATERIAL_PRESETS,
  pipeThicknessStressForMaterial,
} from "@/lib/calculators/engines/pipe-thickness";
import { getPipeScheduleEntry, getPipeScheduleSize } from "@/lib/data/loaders";
import {
  formatSizeLabel,
  normalizeClassRating,
  normalizeNps,
  normalizeSchedule,
  pressureToMpa,
  pressureToPsi,
  pressureToBar,
  temperatureToC,
  temperatureToF,
  type PlantContext,
} from "@/lib/plant-context/dictionary";

function applyNps(
  inputs: Record<string, unknown>,
  ctx: PlantContext,
): Record<string, unknown> {
  const nps = normalizeNps(ctx.size);
  if (!nps) return inputs;
  return { ...inputs, nps };
}

function applySchedule(
  inputs: Record<string, unknown>,
  ctx: PlantContext,
): Record<string, unknown> {
  const schedule = normalizeSchedule(ctx.schedule);
  if (!schedule) return inputs;
  return { ...inputs, schedule };
}

function applyClass(
  inputs: Record<string, unknown>,
  ctx: PlantContext,
): Record<string, unknown> {
  const cls = normalizeClassRating(ctx.class_rating);
  if (!cls) return inputs;
  return { ...inputs, pressureClass: cls };
}

function applyDesignPressure(
  inputs: Record<string, unknown>,
  ctx: PlantContext,
): Record<string, unknown> {
  if (!ctx.pressure) return inputs;
  const unitSystem = inputs.unitSystem === "imperial" ? "imperial" : "metric";
  const next =
    unitSystem === "imperial"
      ? pressureToPsi(ctx.pressure)
      : pressureToMpa(ctx.pressure);
  return { ...inputs, designPressure: next };
}

function mapMaterialGrade(raw: string): "carbon-steel" | "stainless-304" | undefined {
  const value = raw.toLowerCase();
  if (
    value.includes("304") ||
    value.includes("316") ||
    value.includes("tp304") ||
    value.includes("stainless")
  ) {
    return "stainless-304";
  }
  if (
    value.includes("a106") ||
    value.includes("a53") ||
    value.includes("carbon") ||
    value === "carbon-steel"
  ) {
    return "carbon-steel";
  }
  return undefined;
}

export function applyPlantContext<T extends Record<string, unknown>>(
  type: CalculatorType,
  inputs: T,
  ctx: PlantContext,
): T {
  switch (type) {
    case "pipe-thickness": {
      const next = applyDesignPressure(
        { ...inputs } as T & {
          outsideDiameter: number;
          designPressure: number;
          allowableStress: number;
          unitSystem: string;
          material?: string;
        },
        ctx,
      );
      const nps = normalizeNps(ctx.size);
      if (nps) {
        const pipe = getPipeScheduleSize(nps);
        if (pipe) {
          next.outsideDiameter =
            next.unitSystem === "imperial"
              ? pipe.outsideDiameterIn
              : pipe.outsideDiameterMm;
        }
      }
      if (ctx.material) {
        const mapped = mapPipeThicknessMaterialId(ctx.material);
        if (mapped) {
          next.material = mapped;
          const stress = pipeThicknessStressForMaterial(
            mapped,
            next.unitSystem === "imperial" ? "imperial" : "metric",
          );
          if (stress !== undefined) next.allowableStress = stress;
        }
      }
      return next as T;
    }
    case "pipe-schedule":
      return applySchedule(applyNps(inputs, ctx), ctx) as T;
    case "flange-dimension":
      return applySchedule(applyClass(applyNps(inputs, ctx), ctx), ctx) as T;
    case "fitting-valve-dimension":
    case "bolt-torque":
    case "gasket-dimension":
      return applyClass(applyNps(inputs, ctx), ctx) as T;
    case "butt-weld-fitting":
      return applySchedule(applyNps(inputs, ctx), ctx) as T;
    case "hydro-test":
      return applyDesignPressure(applyNps(inputs, ctx), ctx) as T;
    case "blind-flange":
      return applyDesignPressure(inputs, ctx) as T;
    case "valve-cv": {
      // Calculator UI/engine are metric-native (bar, °C) — convert plant bus units in.
      const next = { ...inputs } as T & {
        inletPressure: number;
        temperature: number;
      };
      if (ctx.pressure) {
        next.inletPressure = pressureToBar(ctx.pressure);
      }
      if (ctx.temperature) {
        next.temperature = temperatureToC(ctx.temperature);
      }
      return next;
    }
    case "metal-weight": {
      const next = { ...inputs } as T & {
        material: string;
        shape: string;
        outerDiameter: number;
        innerDiameter: number;
        thickness: number;
        unitSystem: string;
      };
      if (ctx.material) {
        const mapped = mapMaterialGrade(ctx.material);
        if (mapped) next.material = mapped;
      }
      const nps = normalizeNps(ctx.size);
      const schedule = normalizeSchedule(ctx.schedule);
      if (nps) {
        next.shape = "pipe";
        const pipe = schedule
          ? getPipeScheduleEntry(nps, schedule)
          : undefined;
        const size = getPipeScheduleSize(nps);
        if (size) {
          next.outerDiameter =
            next.unitSystem === "imperial"
              ? size.outsideDiameterIn
              : size.outsideDiameterMm;
        }
        if (pipe) {
          next.innerDiameter =
            next.unitSystem === "imperial"
              ? pipe.row.insideDiameterMm / 25.4
              : pipe.row.insideDiameterMm;
          next.thickness =
            next.unitSystem === "imperial"
              ? pipe.row.wallThicknessMm / 25.4
              : pipe.row.wallThicknessMm;
        }
      }
      return next;
    }
    case "thermal-expansion": {
      const next = { ...inputs } as T & {
        nps: string;
        material: string;
        operatingTemp: number;
        unitSystem: string;
      };
      const nps = normalizeNps(ctx.size);
      if (nps) next.nps = nps;
      const mapped = mapExpansionMaterial(ctx.material);
      if (mapped) next.material = mapped;
      if (ctx.temperature) {
        next.operatingTemp =
          next.unitSystem === "imperial"
            ? temperatureToF(ctx.temperature)
            : temperatureToC(ctx.temperature);
      }
      return next as T;
    }
    case "pressure-drop":
    case "flow-velocity":
      return applySchedule(applyNps(inputs, ctx), ctx) as T;
    case "unit-converter":
      return inputs;
    default:
      return inputs;
  }
}

export function extractPlantContext(
  type: CalculatorType,
  inputs: Record<string, unknown>,
): PlantContext {
  const ctx: PlantContext = {};
  const nps = typeof inputs.nps === "string" ? normalizeNps(inputs.nps) : undefined;
  if (nps) ctx.size = formatSizeLabel(nps);

  if (typeof inputs.schedule === "string") {
    const schedule = normalizeSchedule(inputs.schedule);
    if (schedule) ctx.schedule = `Sch ${schedule}`;
  }

  if (typeof inputs.pressureClass === "string") {
    const cls = normalizeClassRating(inputs.pressureClass);
    if (cls) ctx.class_rating = `Class ${cls}`;
  }

  if (typeof inputs.material === "string" && type !== "pipe-thickness") {
    ctx.material = inputs.material;
  }

  if (type === "pipe-thickness" && typeof inputs.material === "string") {
    const preset = PIPE_THICKNESS_MATERIAL_PRESETS.find(
      (item) => item.id === inputs.material,
    );
    if (preset) ctx.material = preset.plantLabel;
  }

  const unitSystem = inputs.unitSystem === "imperial" ? "imperial" : "metric";

  if (typeof inputs.designPressure === "number") {
    ctx.pressure =
      unitSystem === "imperial"
        ? { value: Number(inputs.designPressure.toFixed(1)), unit: "psi" }
        : { value: Number(inputs.designPressure.toFixed(3)), unit: "MPa" };
  }

  if (type === "valve-cv" && typeof inputs.inletPressure === "number") {
    ctx.pressure = {
      value: Number(inputs.inletPressure.toFixed(3)),
      unit: "bar",
    };
  }

  if (type === "valve-cv" && typeof inputs.temperature === "number") {
    ctx.temperature = {
      value: Number(inputs.temperature.toFixed(1)),
      unit: "C",
    };
  }

  if (type === "thermal-expansion" && typeof inputs.operatingTemp === "number") {
    ctx.temperature =
      unitSystem === "imperial"
        ? { value: Number(inputs.operatingTemp.toFixed(1)), unit: "F" }
        : { value: Number(inputs.operatingTemp.toFixed(1)), unit: "C" };
  }

  if (type === "pipe-thickness" && typeof inputs.outsideDiameter === "number") {
    const pipes = ["2", "4", "8"]
      .map((size) => getPipeScheduleSize(size))
      .filter(Boolean);
    const od = inputs.outsideDiameter as number;
    const match = pipes.find((pipe) => {
      if (!pipe) return false;
      const target =
        unitSystem === "imperial" ? pipe.outsideDiameterIn : pipe.outsideDiameterMm;
      return Math.abs(target - od) < 0.6;
    });
    if (match) ctx.size = formatSizeLabel(match.nps);
  }

  return ctx;
}
