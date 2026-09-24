import type { CalculatorType } from "@/lib/calculators/definitions";
import { ALLOY_MATERIALS } from "@/lib/calculators/engines/alloy-weight";
import { mapExpansionMaterial } from "@/lib/calculators/engines/thermal-expansion";
import {
  mapPipeThicknessMaterialId,
  PIPE_THICKNESS_MATERIAL_PRESETS,
  pipeThicknessStressForMaterial,
} from "@/lib/calculators/engines/pipe-thickness";
import { getPipeScheduleEntry, getPipeScheduleSize, getBoltTorqueEntry } from "@/lib/data/loaders";
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
    case "bolt-wrench-lookup":
    case "gasket-dimension":
      return applyClass(applyNps(inputs, ctx), ctx) as T;
    case "flange-gasket-stress": {
      const next = applyNps(inputs, ctx) as T & {
        flangeClass?: string;
        pressure?: number;
        unitSystem?: string;
      };
      const cls = normalizeClassRating(ctx.class_rating);
      if (cls) next.flangeClass = cls;
      if (ctx.pressure) {
        next.pressure =
          next.unitSystem === "imperial"
            ? pressureToPsi(ctx.pressure)
            : pressureToBar(ctx.pressure);
      }
      return next as T;
    }
    case "bolt-sequence": {
      const next = applyClass(applyNps(inputs, ctx), ctx) as T & {
        nps?: string;
        pressureClass?: string;
        boltCount?: number;
      };
      if (next.nps && next.pressureClass) {
        const entry = getBoltTorqueEntry(next.nps, next.pressureClass);
        if (entry) next.boltCount = entry.rating.boltCount;
      }
      return next as T;
    }
    case "butt-weld-fitting":
      return applySchedule(applyNps(inputs, ctx), ctx) as T;
    case "hydro-test":
      return applyDesignPressure(applyNps(inputs, ctx), ctx) as T;
    case "blind-flange":
      return applyDesignPressure(inputs, ctx) as T;
    case "valve-cv": {
      const unitSystem =
        inputs.unitSystem === "imperial" ? "imperial" : "metric";
      const next = { ...inputs } as T & {
        inletPressure: number;
        temperature: number;
      };
      if (ctx.pressure) {
        next.inletPressure =
          unitSystem === "imperial"
            ? pressureToPsi(ctx.pressure)
            : pressureToBar(ctx.pressure);
      }
      if (ctx.temperature) {
        next.temperature =
          unitSystem === "imperial"
            ? temperatureToF(ctx.temperature)
            : temperatureToC(ctx.temperature);
      }
      return next;
    }
    case "control-valve-noise": {
      const unitSystem =
        inputs.unitSystem === "imperial" ? "imperial" : "metric";
      let next = applySchedule(applyNps(inputs, ctx), ctx) as T & {
        p1?: number;
        temp?: number;
        unitSystem?: string;
      };
      if (ctx.pressure) {
        next = {
          ...next,
          p1:
            unitSystem === "imperial"
              ? pressureToPsi(ctx.pressure)
              : pressureToBar(ctx.pressure),
        };
      }
      if (ctx.temperature) {
        next = {
          ...next,
          temp:
            unitSystem === "imperial"
              ? temperatureToF(ctx.temperature)
              : temperatureToC(ctx.temperature),
        };
      }
      return next as T;
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
    case "alloy-weight": {
      const next = { ...inputs } as T & { material?: string };
      if (ctx.material) {
        const needle = ctx.material.toLowerCase();
        const hit = ALLOY_MATERIALS.find(
          (m) =>
            m.id === needle ||
            m.label.toLowerCase() === needle ||
            m.aliases.some((a) => needle.includes(a.toLowerCase())),
        );
        if (hit) next.material = hit.id;
      }
      return next as T;
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
    case "insulation-heat-loss": {
      const next = { ...inputs } as T & {
        nps: string;
        operatingTemp: number;
        unitSystem: string;
      };
      const nps = normalizeNps(ctx.size);
      if (nps) next.nps = nps;
      if (ctx.temperature) {
        next.operatingTemp =
          next.unitSystem === "imperial"
            ? temperatureToF(ctx.temperature)
            : temperatureToC(ctx.temperature);
      }
      return next as T;
    }
    case "tank-vessel-volume":
      return inputs;
    case "nitrogen-purging-volume": {
      const next = { ...inputs } as T & { pipeNps?: string };
      const nps = normalizeNps(ctx.size);
      if (nps) next.pipeNps = nps;
      return next as T;
    }
    case "flange-pressure-temperature-rating": {
      const next = { ...inputs } as T & {
        flangeClass?: string;
        designTemperature?: number;
        materialGroup?: string;
        unitSystem?: string;
      };
      const cls = normalizeClassRating(ctx.class_rating);
      if (cls) next.flangeClass = cls;
      if (ctx.temperature) {
        next.designTemperature =
          next.unitSystem === "imperial"
            ? temperatureToF(ctx.temperature)
            : temperatureToC(ctx.temperature);
      }
      if (ctx.material) {
        const m = ctx.material.toLowerCase();
        if (
          m.includes("316") ||
          m.includes("304") ||
          m.includes("stainless") ||
          /\bss[\s-]?(304|316)\b/.test(m) ||
          m.startsWith("ss")
        ) {
          next.materialGroup = "2.2";
        } else if (
          m.includes("a105") ||
          m.includes("a106") ||
          m.includes("carbon") ||
          m.includes("lf2") ||
          /\bcs\b/.test(m)
        ) {
          next.materialGroup = "1.1";
        }
      }
      return next as T;
    }
    case "water-thermodynamic-properties":
    case "steam-properties-iapws": {
      const next = { ...inputs } as T & {
        temperature?: number;
        pressure?: number;
        unitSystem?: string;
      };
      if (ctx.temperature) {
        next.temperature =
          next.unitSystem === "imperial"
            ? temperatureToF(ctx.temperature)
            : temperatureToC(ctx.temperature);
      }
      if (ctx.pressure) {
        next.pressure =
          next.unitSystem === "imperial"
            ? pressureToPsi(ctx.pressure)
            : pressureToBar(ctx.pressure);
      }
      return next as T;
    }
    case "control-valve-choked-screening": {
      const unitSystem =
        inputs.unitSystem === "imperial" ? "imperial" : "metric";
      const next = { ...inputs } as T & {
        p1?: number;
        unitSystem?: string;
      };
      if (ctx.pressure) {
        next.p1 =
          unitSystem === "imperial"
            ? pressureToPsi(ctx.pressure)
            : pressureToBar(ctx.pressure);
      }
      return next as T;
    }
    case "psv-prv-screening": {
      const unitSystem =
        inputs.unitSystem === "imperial" ? "imperial" : "metric";
      const next = { ...inputs } as T & {
        setPressure?: number;
        relievingTemperature?: number;
        unitSystem?: string;
      };
      if (ctx.pressure) {
        next.setPressure =
          unitSystem === "imperial"
            ? pressureToPsi(ctx.pressure)
            : pressureToBar(ctx.pressure);
      }
      if (ctx.temperature) {
        next.relievingTemperature =
          unitSystem === "imperial"
            ? temperatureToF(ctx.temperature)
            : temperatureToC(ctx.temperature);
      }
      return next as T;
    }
    case "natural-gas-z-density": {
      const unitSystem =
        inputs.unitSystem === "imperial" ? "imperial" : "metric";
      const next = { ...inputs } as T & {
        pressure?: number;
        temperature?: number;
        unitSystem?: string;
      };
      if (ctx.pressure) {
        next.pressure =
          unitSystem === "imperial"
            ? pressureToPsi(ctx.pressure)
            : pressureToBar(ctx.pressure);
      }
      if (ctx.temperature) {
        next.temperature =
          unitSystem === "imperial"
            ? temperatureToF(ctx.temperature)
            : temperatureToC(ctx.temperature);
      }
      return next as T;
    }
    case "heat-exchanger-lmtd-duty": {
      const unitSystem =
        inputs.unitSystem === "imperial" ? "imperial" : "metric";
      const next = { ...inputs } as T & {
        tempHotIn?: number;
        tempColdIn?: number;
        unitSystem?: string;
      };
      if (ctx.temperature) {
        const t =
          unitSystem === "imperial"
            ? temperatureToF(ctx.temperature)
            : temperatureToC(ctx.temperature);
        next.tempHotIn = t;
        next.tempColdIn = t;
      }
      return next as T;
    }
    case "compressor-polytropic-power": {
      const unitSystem =
        inputs.unitSystem === "imperial" ? "imperial" : "metric";
      const next = { ...inputs } as T & {
        suctionPress?: number;
        dischargePress?: number;
        suctionTemp?: number;
        unitSystem?: string;
      };
      if (ctx.pressure) {
        const p =
          unitSystem === "imperial"
            ? pressureToPsi(ctx.pressure)
            : pressureToBar(ctx.pressure);
        next.suctionPress = p;
      }
      if (ctx.temperature) {
        next.suctionTemp =
          unitSystem === "imperial"
            ? temperatureToF(ctx.temperature)
            : temperatureToC(ctx.temperature);
      }
      return next as T;
    }
    case "api650-tank-shell-thickness": {
      const next = { ...inputs } as T & { materialGrade?: string };
      if (ctx.material) {
        const m = String(ctx.material).toUpperCase();
        if (m.includes("516")) next.materialGrade = "A516-70";
        else if (m.includes("283")) next.materialGrade = "A283-C";
        else if (m.includes("537")) next.materialGrade = "A537-1";
        else if (m.includes("A36") || m.includes("36"))
          next.materialGrade = "A36";
      }
      return next as T;
    }
    case "olet-fitting-dimensions": {
      const next = { ...inputs } as T & {
        runNps?: string;
        branchNps?: string;
        material?: string;
      };
      const nps = normalizeNps(ctx.size);
      if (nps) {
        // Carry plant size into run (header); outlet stays user-selected.
        next.runNps = nps;
      }
      if (ctx.material) {
        const m = String(ctx.material).toUpperCase();
        if (m.includes("316") || m.includes("304") || m.includes("F316")) {
          next.material = "A182-F316";
        } else if (m.includes("A105") || m.includes("CS")) {
          next.material = "A105";
        }
      }
      return next as T;
    }
    case "pipe-steam-tracing-duty": {
      const next = { ...inputs } as T & {
        nps?: string;
        maintainTemp?: number;
        ambientTemp?: number;
        insulationThickness?: number;
        unitSystem?: string;
      };
      const nps = normalizeNps(ctx.size);
      if (nps) next.nps = nps;
      if (ctx.temperature) {
        next.maintainTemp =
          next.unitSystem === "imperial"
            ? temperatureToF(ctx.temperature)
            : temperatureToC(ctx.temperature);
      }
      return next as T;
    }
    case "socket-weld-threaded-fitting-dimension": {
      const next = { ...inputs } as T & {
        nps?: string;
        rating?: string;
      };
      const nps = normalizeNps(ctx.size);
      if (nps) next.nps = nps;
      const cls = normalizeClassRating(ctx.class_rating);
      if (cls && ["2000", "3000", "6000", "9000"].includes(cls)) {
        next.rating = cls;
      }
      return next as T;
    }
    case "pressure-vessel-head-thickness": {
      const next = { ...inputs } as T & {
        designPressure?: number;
        designTemperature?: number;
        materialId?: string;
        unitSystem?: string;
      };
      if (ctx.pressure) {
        next.designPressure =
          next.unitSystem === "imperial"
            ? pressureToPsi(ctx.pressure)
            : pressureToMpa(ctx.pressure);
      }
      if (ctx.temperature) {
        next.designTemperature =
          next.unitSystem === "imperial"
            ? temperatureToF(ctx.temperature)
            : temperatureToC(ctx.temperature);
      }
      if (ctx.material) {
        const m = String(ctx.material).toUpperCase();
        if (m.includes("316")) next.materialId = "SA-240-316L";
        else if (m.includes("304")) next.materialId = "SA-240-304L";
        else if (m.includes("387") || m.includes("GR.11") || m.includes("GR11"))
          next.materialId = "SA-387-11";
        else if (m.includes("516")) next.materialId = "SA-516-70";
      }
      return next as T;
    }
    case "pressure-vessel-nozzle-reinforcement": {
      const next = { ...inputs } as T & {
        designPressure?: number;
        designTemperature?: number;
        shellMaterialId?: string;
        nozzleNps?: string;
        shellInsideDiameter?: number;
        unitSystem?: string;
      };
      const nps = normalizeNps(ctx.size);
      if (nps) next.nozzleNps = nps;
      if (ctx.pressure) {
        next.designPressure =
          next.unitSystem === "imperial"
            ? pressureToPsi(ctx.pressure)
            : pressureToMpa(ctx.pressure);
      }
      if (ctx.temperature) {
        next.designTemperature =
          next.unitSystem === "imperial"
            ? temperatureToF(ctx.temperature)
            : temperatureToC(ctx.temperature);
      }
      if (ctx.material) {
        const m = String(ctx.material).toUpperCase();
        if (m.includes("316")) next.shellMaterialId = "SA-240-316L";
        else if (m.includes("516")) next.shellMaterialId = "SA-516-70";
      }
      return next as T;
    }
    case "bearing-life-l10h":
      return inputs;
    case "lifting-lug-rigging-capacity":
      return inputs;
    case "steam-turbine-power-ssc":
      return inputs;
    case "shaft-torque-key-sizing":
      return inputs;
    case "api2000-tank-venting":
      return inputs;
    case "valve-wall-thickness-rating": {
      const next = { ...inputs } as T & {
        nps?: string;
        pressureClass?: string;
        designTemperature?: number;
        workingPressure?: number;
        materialId?: string;
        unitSystem?: string;
      };
      const nps = normalizeNps(ctx.size);
      if (nps) next.nps = nps;
      if (ctx.class_rating) {
        const cls = String(ctx.class_rating).replace(/[^0-9]/g, "");
        if (cls) next.pressureClass = cls;
      }
      if (ctx.temperature != null && Number.isFinite(Number(ctx.temperature))) {
        next.designTemperature = Number(ctx.temperature);
      }
      if (ctx.pressure != null && Number.isFinite(Number(ctx.pressure))) {
        // Plant pressure is typically bar-like process pressure for valve tools.
        next.workingPressure = Number(ctx.pressure);
      }
      if (ctx.material) {
        const m = String(ctx.material).toLowerCase();
        if (m.includes("316") || m.includes("cf8m")) {
          next.materialId = "group-2.2-A351-CF8M-316";
        } else if (m.includes("wc6")) {
          next.materialId = "group-1.9-A217-WC6";
        } else if (m.includes("wcc")) {
          next.materialId = "group-1.2-A216-WCC";
        } else if (m.includes("wcb") || m.includes("a105")) {
          next.materialId = "group-1.1-A105-WCB";
        }
      }
      return next as T;
    }
    case "psv-reaction-force": {
      const next = { ...inputs } as T & {
        outletNps?: string;
        outletSchedule?: string;
        relievingTemperature?: number;
      };
      const nps = normalizeNps(ctx.size);
      if (nps) next.outletNps = nps;
      if (ctx.schedule) {
        const sch = String(ctx.schedule).replace(/^Sch\s*/i, "");
        if (sch) next.outletSchedule = sch;
      }
      if (ctx.temperature != null && Number.isFinite(Number(ctx.temperature))) {
        next.relievingTemperature = Number(ctx.temperature);
      }
      return next as T;
    }
    case "non-metallic-gasket-b1621": {
      const next = { ...inputs } as T & {
        nps?: string;
        pressureClass?: string;
        pressure?: number;
      };
      const nps = normalizeNps(ctx.size);
      if (nps) next.nps = nps;
      if (ctx.class_rating) {
        const cls = String(ctx.class_rating).replace(/[^0-9]/g, "");
        if (cls) next.pressureClass = cls;
      }
      if (ctx.pressure != null && Number.isFinite(Number(ctx.pressure.value))) {
        next.pressure = Number(ctx.pressure.value);
      }
      return next as T;
    }
    case "pipe-slope-calculator": {
      const next = { ...inputs } as T & { pipeNps?: string };
      const nps = normalizeNps(ctx.size);
      if (nps) next.pipeNps = nps;
      return next as T;
    }
    case "piping-equivalent-length":
    case "orifice-plate-flow-meter":
    case "darby-3k-fitting-loss":
    case "pipe-support-span":
    case "pressure-drop":
    case "flow-velocity":
      return applySchedule(applyNps(inputs, ctx), ctx) as T;
    case "unit-converter":
      return inputs;
    case "link-seal": {
      const next = { ...applyNps(inputs, ctx) } as T & {
        nps: string;
        pipeOd: number;
        unitSystem: string;
      };
      const nps = normalizeNps(ctx.size);
      if (nps) {
        next.nps = nps;
        const pipe = getPipeScheduleSize(nps);
        if (pipe) {
          next.pipeOd =
            next.unitSystem === "imperial"
              ? Number((pipe.outsideDiameterMm / 25.4).toFixed(3))
              : pipe.outsideDiameterMm;
        }
      }
      return next as T;
    }
    case "pipe-coping":
    case "pipe-branch-reinforcement": {
      const next = { ...inputs } as T & {
        headerNps?: string;
        branchNps?: string;
        headerSchedule?: string;
        branchSchedule?: string;
        designPressure?: number;
        unitSystem?: string;
      };
      const nps = normalizeNps(ctx.size);
      if (nps) {
        next.headerNps = nps;
        if (
          typeof next.branchNps !== "string" ||
          Number(next.branchNps) > Number(nps)
        ) {
          next.branchNps = nps;
        }
      }
      if (ctx.schedule) {
        const sch = normalizeSchedule(ctx.schedule);
        if (sch) {
          next.headerSchedule = sch;
          next.branchSchedule = sch;
        }
      }
      if (type === "pipe-branch-reinforcement" && ctx.pressure) {
        next.designPressure =
          next.unitSystem === "imperial"
            ? pressureToPsi(ctx.pressure)
            : pressureToBar(ctx.pressure);
      }
      return next as T;
    }
    case "pneumatic-safety": {
      const next = { ...applySchedule(applyNps(inputs, ctx), ctx) } as T & {
        testPressure?: number;
        unitSystem?: string;
        mode?: string;
        nps?: string;
      };
      if (ctx.pressure) {
        next.testPressure =
          next.unitSystem === "imperial"
            ? pressureToPsi(ctx.pressure)
            : pressureToBar(ctx.pressure);
      }
      // Only force pipe mode when plant context actually supplied a size.
      if (ctx.size && typeof next.nps === "string" && next.nps) {
        next.mode = "pipe";
      }
      return next as T;
    }
    case "pump-npsh": {
      const next = { ...inputs } as T & {
        unitSystem?: string;
        temperature?: number;
      };
      if (ctx.temperature) {
        next.temperature =
          next.unitSystem === "imperial"
            ? temperatureToF(ctx.temperature)
            : temperatureToC(ctx.temperature);
      }
      return next as T;
    }
    default:
      return inputs;
  }
}

export function extractPlantContext(
  type: CalculatorType,
  inputs: Record<string, unknown>,
): PlantContext {
  const ctx: PlantContext = {};
  if (typeof inputs.nps === "string") {
    const nps = normalizeNps(inputs.nps);
    if (nps) ctx.size = formatSizeLabel(nps);
  } else if (typeof inputs.pipeNps === "string") {
    const nps = normalizeNps(inputs.pipeNps);
    if (nps) ctx.size = formatSizeLabel(nps);
  } else if (typeof inputs.headerNps === "string") {
    const nps = normalizeNps(inputs.headerNps);
    if (nps) ctx.size = formatSizeLabel(nps);
  }

  if (typeof inputs.schedule === "string") {
    const schedule = normalizeSchedule(inputs.schedule);
    if (schedule) ctx.schedule = `Sch ${schedule}`;
  } else if (typeof inputs.headerSchedule === "string") {
    const schedule = normalizeSchedule(inputs.headerSchedule);
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
        : type === "pipe-branch-reinforcement" || type === "pneumatic-safety"
          ? { value: Number(inputs.designPressure.toFixed(3)), unit: "bar" }
          : { value: Number(inputs.designPressure.toFixed(3)), unit: "MPa" };
  }

  if (type === "valve-cv" && typeof inputs.inletPressure === "number") {
    ctx.pressure =
      unitSystem === "imperial"
        ? { value: Number(inputs.inletPressure.toFixed(1)), unit: "psi" }
        : { value: Number(inputs.inletPressure.toFixed(3)), unit: "bar" };
  }

  if (type === "pneumatic-safety" && typeof inputs.testPressure === "number") {
    ctx.pressure =
      unitSystem === "imperial"
        ? { value: Number(inputs.testPressure.toFixed(1)), unit: "psi" }
        : { value: Number(inputs.testPressure.toFixed(3)), unit: "bar" };
  }

  if (type === "valve-cv" && typeof inputs.temperature === "number") {
    ctx.temperature =
      unitSystem === "imperial"
        ? { value: Number(inputs.temperature.toFixed(1)), unit: "F" }
        : { value: Number(inputs.temperature.toFixed(1)), unit: "C" };
  }

  if (type === "pump-npsh" && typeof inputs.temperature === "number") {
    ctx.temperature =
      unitSystem === "imperial"
        ? { value: Number(inputs.temperature.toFixed(1)), unit: "F" }
        : { value: Number(inputs.temperature.toFixed(1)), unit: "C" };
  }

  if (type === "thermal-expansion" && typeof inputs.operatingTemp === "number") {
    ctx.temperature =
      unitSystem === "imperial"
        ? { value: Number(inputs.operatingTemp.toFixed(1)), unit: "F" }
        : { value: Number(inputs.operatingTemp.toFixed(1)), unit: "C" };
  }

  if (
    type === "insulation-heat-loss" &&
    typeof inputs.operatingTemp === "number"
  ) {
    ctx.temperature =
      unitSystem === "imperial"
        ? { value: Number(inputs.operatingTemp.toFixed(1)), unit: "F" }
        : { value: Number(inputs.operatingTemp.toFixed(1)), unit: "C" };
  }

  if (
    type === "flange-pressure-temperature-rating" &&
    typeof inputs.designTemperature === "number"
  ) {
    ctx.temperature =
      unitSystem === "imperial"
        ? { value: Number(inputs.designTemperature.toFixed(1)), unit: "F" }
        : { value: Number(inputs.designTemperature.toFixed(1)), unit: "C" };
  }
  if (
    type === "valve-wall-thickness-rating" &&
    typeof inputs.designTemperature === "number"
  ) {
    ctx.temperature =
      unitSystem === "imperial"
        ? { value: Number(inputs.designTemperature.toFixed(1)), unit: "F" }
        : { value: Number(inputs.designTemperature.toFixed(1)), unit: "C" };
  }
  if (
    type === "valve-wall-thickness-rating" &&
    typeof inputs.workingPressure === "number"
  ) {
    ctx.pressure =
      unitSystem === "imperial"
        ? { value: Number(inputs.workingPressure.toFixed(1)), unit: "psi" }
        : { value: Number(inputs.workingPressure.toFixed(2)), unit: "bar" };
  }
  if (
    type === "valve-wall-thickness-rating" &&
    typeof inputs.materialId === "string" &&
    inputs.materialId
  ) {
    ctx.material = String(inputs.materialId);
  }
  if (
    type === "psv-reaction-force" &&
    typeof inputs.relievingTemperature === "number"
  ) {
    ctx.temperature =
      unitSystem === "imperial"
        ? { value: Number(inputs.relievingTemperature.toFixed(1)), unit: "F" }
        : { value: Number(inputs.relievingTemperature.toFixed(1)), unit: "C" };
  }
  if (
    type === "psv-reaction-force" &&
    typeof inputs.outletNps === "string" &&
    inputs.outletNps
  ) {
    const nps = normalizeNps(inputs.outletNps);
    if (nps) ctx.size = formatSizeLabel(nps);
  }
  if (
    type === "psv-reaction-force" &&
    typeof inputs.outletSchedule === "string" &&
    inputs.outletSchedule
  ) {
    ctx.schedule = `Sch ${inputs.outletSchedule}`;
  }
  if (type === "non-metallic-gasket-b1621") {
    if (typeof inputs.nps === "string" && inputs.nps) {
      const nps = normalizeNps(inputs.nps);
      if (nps) ctx.size = formatSizeLabel(nps);
    }
    if (typeof inputs.pressureClass === "string" && inputs.pressureClass) {
      ctx.class_rating = `Class ${inputs.pressureClass}`;
    }
    if (typeof inputs.pressure === "number") {
      ctx.pressure =
        unitSystem === "imperial"
          ? { value: Number(inputs.pressure.toFixed(1)), unit: "psi" }
          : { value: Number(inputs.pressure.toFixed(2)), unit: "bar" };
    }
  }
  if (
    (type === "flange-pressure-temperature-rating" ||
      type === "flange-gasket-stress") &&
    typeof inputs.flangeClass === "string" &&
    inputs.flangeClass
  ) {
    ctx.class_rating = String(inputs.flangeClass).startsWith("Class")
      ? String(inputs.flangeClass)
      : `Class ${inputs.flangeClass}`;
  }

  if (type === "flange-gasket-stress" && typeof inputs.pressure === "number") {
    ctx.pressure =
      unitSystem === "imperial"
        ? { value: Number(inputs.pressure.toFixed(1)), unit: "psi" }
        : { value: Number(inputs.pressure.toFixed(3)), unit: "bar" };
  }

  if (
    (type === "control-valve-noise" ||
      type === "control-valve-choked-screening") &&
    typeof inputs.p1 === "number"
  ) {
    ctx.pressure =
      unitSystem === "imperial"
        ? { value: Number(inputs.p1.toFixed(1)), unit: "psi" }
        : { value: Number(inputs.p1.toFixed(3)), unit: "bar" };
  }

  if (type === "psv-prv-screening" && typeof inputs.setPressure === "number") {
    ctx.pressure =
      unitSystem === "imperial"
        ? { value: Number(inputs.setPressure.toFixed(1)), unit: "psi" }
        : { value: Number(inputs.setPressure.toFixed(3)), unit: "bar" };
  }
  if (
    type === "psv-prv-screening" &&
    typeof inputs.relievingTemperature === "number"
  ) {
    ctx.temperature =
      unitSystem === "imperial"
        ? {
            value: Number(inputs.relievingTemperature.toFixed(1)),
            unit: "F",
          }
        : {
            value: Number(inputs.relievingTemperature.toFixed(1)),
            unit: "C",
          };
  }

  if (
    (type === "water-thermodynamic-properties" ||
      type === "steam-properties-iapws") &&
    typeof inputs.temperature === "number"
  ) {
    ctx.temperature =
      unitSystem === "imperial"
        ? { value: Number(inputs.temperature.toFixed(1)), unit: "F" }
        : { value: Number(inputs.temperature.toFixed(1)), unit: "C" };
  }
  if (
    (type === "water-thermodynamic-properties" ||
      type === "steam-properties-iapws") &&
    typeof inputs.pressure === "number"
  ) {
    ctx.pressure =
      unitSystem === "imperial"
        ? { value: Number(inputs.pressure.toFixed(1)), unit: "psi" }
        : { value: Number(inputs.pressure.toFixed(4)), unit: "bar" };
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
