import { describe, expect, it } from "vitest";
import type { CalculatorOutput } from "@/lib/calculators/definitions";
import {
  calculateBlindFlange,
  FLANGE_RATING_LIMITS,
  flangeAmbientPressureMpa,
  getAllowableStressForMaterial,
  getRecommendedCommercialPlate,
  getStandardGasketContactDiameter,
  requiredBlindThicknessMm,
} from "@/lib/calculators/engines/blind-flange";
import { syncCompanionUnits } from "@/lib/unitConverter";
import { calculateBoltTorque } from "@/lib/calculators/engines/bolt-torque";
import {
  calculateFittingValveDimension,
  DEFAULT_FITTING_VALVE_DIMENSION_INPUTS,
} from "@/lib/calculators/engines/fitting-valve-dimension";
import {
  calculateButtWeldFitting,
  computeInsideDiameterMm,
  DEFAULT_BUTT_WELD_FITTING_INPUTS,
  scaleFittingWeightKg,
} from "@/lib/calculators/engines/butt-weld-fitting";
import { calculateFlangeDimension } from "@/lib/calculators/engines/flange-dimension";
import {
  calculateLinkSeal,
  computeLinkSeal,
} from "@/lib/calculators/engines/link-seal";
import {
  apiRp14eLimitMs,
  calculateFlowVelocity,
  computeFlowVelocity,
} from "@/lib/calculators/engines/flow-velocity";
import { calculateGasketDimension } from "@/lib/calculators/engines/gasket-dimension";
import {
  calculateHydroTest,
  getHoldingTimeGuide,
  hydroTestPressureMpa,
} from "@/lib/calculators/engines/hydro-test";
import { metalWeightKg } from "@/lib/calculators/engines/metal-weight";
import {
  calculatePipeSchedule,
} from "@/lib/calculators/engines/pipe-schedule";
import {
  requiredPipeWallThickness,
  calculatePipeThickness,
  B31_3_Y_FERRITIC,
  DEFAULT_PIPE_INPUTS,
  pipeThicknessStressForMaterial,
} from "@/lib/calculators/engines/pipe-thickness";
import { computePressureDrop, calculatePressureDrop } from "@/lib/calculators/engines/pressure-drop";
import {
  calculateThermalExpansion,
  thermalExpansionDeltaLMm,
} from "@/lib/calculators/engines/thermal-expansion";
import {
  calculateUnitConverter,
} from "@/lib/calculators/engines/unit-converter";
import { gasCvUs, liquidCvUs, calculateValveCv } from "@/lib/calculators/engines/valve-cv";
import {
  getFlangeDimensionEntry,
  getPipeScheduleEntry,
  listFlangeClassesForNps,
  listFlangeNps,
  listSchedulesForNps,
  listScheduleOptionsForNps,
  listSchedulesForNpsAndClass,
} from "@/lib/data/loaders";
import {
  convertDimension,
  convertMass,
  convertPressure,
  convertTemperature,
  convertTorque,
  convertVelocity,
} from "@/lib/units/engineering";
import { barToPsi, psiToBar } from "@/utils/unitConverter";
import { parseSpecToQuery, resolveSpecRoute } from "@/lib/calculators/spec-routes";

const REL_TOL = 1e-4; // 0.01%

function nearly(actual: number, expected: number, rel = REL_TOL, abs = 1e-9) {
  const scale = Math.max(Math.abs(expected), abs);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(rel * scale + abs);
}

function expectNoPoison(output: CalculatorOutput) {
  const text = [
    output.heroValue,
    output.heroStatus,
    ...output.summary.map((row) => row.value),
    ...output.rows.map((row) => row.value),
    ...output.exportRows.map((row) => row.value),
  ].join(" | ");
  expect(text).not.toMatch(/\bNaN\b/i);
  expect(text).not.toMatch(/\bInfinity\b/i);
}

function haalandFriction(reynolds: number, relRough: number): number {
  if (reynolds < 2300) return 64 / reynolds;
  const inner = (relRough / 3.7) ** 1.11 + 6.9 / reynolds;
  const invSqrt = -1.8 * Math.log10(inner);
  return 1 / (invSqrt * invSqrt);
}

describe("01 ASME B31.3 Pipe Thickness", () => {
  it("matches t = PD / (2(SE + PY)) for NPS 4 Sch 40, A106 Gr.B, 20 bar, 100 °C", () => {
    const tmin = requiredPipeWallThickness({
      designPressure: 2.0,
      outsideDiameter: 114.3,
      allowableStress: 138,
      weldEfficiency: 1,
      yCoefficient: B31_3_Y_FERRITIC,
      corrosionAllowance: 0,
    });
    const expected = (2.0 * 114.3) / (2 * (138 * 1 + 2.0 * 0.4));
    nearly(tmin, expected);
    nearly(tmin, 0.823487);
    expect(tmin).toBeLessThan(6.02);
  });

  it("scales the wall gauge to schedule wall vs t_nom_req", () => {
    const out = calculatePipeThickness(DEFAULT_PIPE_INPUTS);
    expect(out.gauge?.maxLabel).toContain("6.02");
    expect(out.gauge?.fillPercent).toBe(100);
    expect(out.heroStatusLevel).toBe("pass");
    expect(out.summaryStatus?.label).toBe("SAFE (PASS)");
  });

  it("rejects non-positive / non-finite inputs without NaN", () => {
    expect(requiredPipeWallThickness({
      designPressure: 0,
      outsideDiameter: 114.3,
      allowableStress: 138,
      weldEfficiency: 1,
      corrosionAllowance: 2,
    })).toBe(2);
    expect(requiredPipeWallThickness({
      designPressure: Number.NaN,
      outsideDiameter: 114.3,
      allowableStress: 138,
      weldEfficiency: 1,
      corrosionAllowance: 0,
    })).toBe(0);
    const out = calculatePipeThickness({
      unitSystem: "metric",
      nps: "4",
      schedule: "40",
      outsideDiameter: 114.3,
      designPressure: 0,
      designTemperature: 38,
      allowableStress: 138,
      weldEfficiency: 1,
      jointType: "seamless",
      corrosionAllowance: 0,
      actualThickness: 6.02,
    });
    expect(out.heroValue).toBe("—");
    expectNoPoison(out);
  });

  it("reports safety margin against t_nom_req (includes 12.5% mill tolerance)", () => {
    const out = calculatePipeThickness({
      ...DEFAULT_PIPE_INPUTS,
      unitSystem: "imperial",
      nps: "4",
      schedule: "40",
      outsideDiameter: 4.5,
      designPressure: 290,
      designTemperature: 100,
      allowableStress: 20000,
      weldEfficiency: 1,
      jointType: "seamless",
      corrosionAllowance: 0.063,
      actualThickness: 0.237,
      material: "a106-b",
    });
    expect(out.gauge?.caption).toMatch(/Safety margin:/);
    expect(out.gauge?.captionInfo).toContain("t_nom_req");
    // Against t_nom_req (not t_min) — previously ~159% vs t_min; now ~118% vs t_nom_req
    const pct = Number(out.gauge?.caption?.match(/\((\d+)%\)/)?.[1]);
    expect(pct).toBeGreaterThan(100);
    expect(pct).toBeLessThan(140);
    expect(pct).toBeLessThan(150); // must not be the old t_min-based ~159%
    expect(out.rows.some((r) => r.label.includes("allowance (c)"))).toBe(true);
    expect(out.rows.every((r) => !r.label.includes("allowance (A)"))).toBe(true);
  });

  it("maps Table A-1 ambient S values for material presets", () => {
    expect(pipeThicknessStressForMaterial("a106-b", "metric")).toBe(138);
    expect(pipeThicknessStressForMaterial("a106-b", "imperial")).toBe(20000);
    expect(pipeThicknessStressForMaterial("a53-a", "metric")).toBe(110);
    expect(pipeThicknessStressForMaterial("tp304l", "metric")).toBe(115);
    expect(pipeThicknessStressForMaterial("p22", "imperial")).toBe(17900);
  });
});

describe("02 Pipe Schedule & Dimension (ASME B36.10M)", () => {
  it("looks up NPS 4 Sch 40 handbook dimensions", () => {
    const entry = getPipeScheduleEntry("4", "40");
    expect(entry?.pipe.outsideDiameterMm).toBe(114.3);
    expect(entry?.row.wallThicknessMm).toBe(6.02);
    expect(entry?.row.insideDiameterMm).toBe(102.26);
    const out = calculatePipeSchedule({ unitSystem: "metric", nps: "4", schedule: "40" });
    expect(out.heroLabel).toBe("Wall Thickness (t)");
    expect(out.heroValue).toContain("6.020");
    expect(out.heroBadges?.find((b) => b.label === "OD")?.value).toContain("114.300");
    expect(out.heroBadges?.find((b) => b.label === "ID")?.value).toContain("102.260");
    expectNoPoison(out);
  });

  it("falls back for unknown NPS/schedule", () => {
    const out = calculatePipeSchedule({ unitSystem: "metric", nps: "99", schedule: "xx" });
    expect(out.heroValue).toBe("—");
    expect(out.heroLabel).toBe("Wall Thickness (t)");
    expectNoPoison(out);
  });

  it("exposes B36.19M stainless schedules and totals weight from length", () => {
    const schedules = listSchedulesForNps("4").map((row) => row.schedule);
    expect(schedules).toEqual(expect.arrayContaining(["5S", "10S", "40S", "80S"]));
    const options = listScheduleOptionsForNps("4");
    expect(options.some((option) => option.label.includes("40S"))).toBe(true);
    expect(options.some((option) => option.label === "Sch 40 / 40S (B36.10M / B36.19M)" ||
      option.label === "Sch 40 / STD / 40S (B36.10M / B36.19M)")).toBe(true);
    expect(options.filter((option) => option.label.includes("40")).length).toBe(1);
    expect(options.filter((option) => option.members.some((m) => m === "10" || m === "10S")).length).toBe(1);
    expect(getPipeScheduleEntry("4", "40S")?.row.wallThicknessMm).toBe(6.02);
    expect(getPipeScheduleEntry("12", "40S")?.row.wallThicknessMm).toBe(9.53);
    const out = calculatePipeSchedule({
      unitSystem: "metric",
      nps: "4",
      schedule: "40",
      length: 6,
    });
    expect(out.rows.find((row) => row.label === "Total weight (W_tot)")?.value).toContain("96.42");
    expect(out.rows.find((row) => row.label === "Unit weight (W_m)")?.value).toContain("16.07");
    expect(out.summary.find((row) => row.label === "Total weight (W_tot)")?.value).toContain("96.42");
    expect(out.heroStatus).toContain("B36.10M");
    const doubled = calculatePipeSchedule({
      unitSystem: "metric",
      nps: "4",
      schedule: "40",
      length: 6,
      quantity: 2,
    });
    expect(doubled.rows.find((row) => row.label === "Total weight (W_tot)")?.value).toContain("192.84");
    expect(doubled.heroBadges?.find((b) => b.label === "W_tot")?.value).toContain("192.84");
    const ss = calculatePipeSchedule({
      unitSystem: "metric",
      nps: "4",
      schedule: "10S",
      length: 6,
    });
    expect(ss.heroStatus).toContain("B36.19M");
    expectNoPoison(out);
    expectNoPoison(ss);
  });

  it("matches NPS 8 Sch 80 envelope from pipeSchedule.json", () => {
    const out = calculatePipeSchedule({
      unitSystem: "metric",
      nps: "8",
      schedule: "80",
      length: 1,
      quantity: 1,
    });
    expect(out.heroValue).toContain("12.700");
    expect(out.rows.find((row) => row.label.includes("Outside diameter"))?.value).toContain("219.100");
    expect(out.rows.find((row) => row.label.includes("Inside diameter"))?.value).toContain("193.700");
    expect(out.rows.find((row) => row.label === "Unit weight (W_m)")?.value).toContain("64.64");
    expect(out.rows.find((row) => row.label === "Total weight (W_tot)")?.value).toContain("64.64");
    expectNoPoison(out);
  });
});

describe("03 Flange Dimension (ASME B16.5)", () => {
  it("matches NPS 4 Class 150 WN RF table values", () => {
    const out = calculateFlangeDimension({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "150",
    });
    expect(out.heroLabel).toBe("Mated Pair Weight (W_pair)");
    expect(out.heroValue).toContain("22.50");
    expect(out.heroBadges?.find((b) => b.label === "W_f")?.value).toContain("10.00");
    expect(out.summary.find((row) => row.label === "Single flange (W_f)")?.value).toContain(
      "10.00",
    );
    expect(out.rows.find((row) => row.label.includes("Flange OD"))?.value).toContain("228.6");
    expect(out.rows.find((row) => row.label.includes("Number of bolts"))?.value).toBe("8");
    expect(out.rows.find((row) => row.label.includes("hub bore"))?.value).toContain("102.3");
    expect(out.rows.find((row) => row.label.includes("Stud bolt"))?.value).toBe("5/8 in × 90 mm");
    expect(out.rows.find((row) => row.label.includes("wrench"))?.value).toBe("1-1/16 in (27 mm)");
    expect(out.rows.find((row) => row.label.includes("Mated pair"))?.value).toContain("22.50");
    expectNoPoison(out);
  });

  it("matches NPS 6 Class 300 WN RF envelope and W_pair from flangeDimension.json", () => {
    const out = calculateFlangeDimension({
      unitSystem: "metric",
      nps: "6",
      pressureClass: "300",
    });
    expect(out.heroValue).toContain("44.56");
    expect(out.summary.find((row) => row.label === "Single flange (W_f)")?.value).toContain(
      "19.10",
    );
    expect(out.rows.find((row) => row.label.includes("Flange OD"))?.value).toContain("320");
    expect(out.rows.find((row) => row.label.includes("Flange thickness"))?.value).toContain("35");
    expect(out.rows.find((row) => row.label.includes("Bolt circle"))?.value).toContain("269.9");
    expect(out.rows.find((row) => row.label.includes("Number of bolts"))?.value).toBe("12");
    expect(out.rows.find((row) => row.label.includes("Stud bolt"))?.value).toBe("3/4 in × 120 mm");
    expect(out.heroBadges?.find((b) => b.label === "Bolts")?.value).toBe('12 × 3/4"');
    expectNoPoison(out);
  });

  it("uses selected pipe schedule for WN hub bore and RF stud length by class", () => {
    const sch40 = calculateFlangeDimension({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "150",
      pipeSchedule: "40",
    });
    expect(sch40.rows.find((row) => row.label.includes("hub bore"))?.value).toContain("102.3");
    expect(sch40.rows.find((row) => row.label === "Pipe schedule (hub bore)")?.value).toMatch(
      /Sch 40|STD/,
    );

    const sch80 = calculateFlangeDimension({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "150",
      pipeSchedule: "80",
    });
    expect(sch80.rows.find((row) => row.label.includes("hub bore"))?.value).toContain("97.2");

    const cl600 = calculateFlangeDimension({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "600",
    });
    expect(cl600.rows.find((row) => row.label.includes("Stud bolt"))?.value).toBe("3/4 in × 115 mm");
    expect(cl600.rows.find((row) => row.label.includes("wrench"))?.value).toBe("1-1/4 in (32 mm)");
    expectNoPoison(sch40);
    expectNoPoison(sch80);
    expectNoPoison(cl600);
  });

  it("scales SO by type factor; Blind uses solid-disc estimate (not 0.85×WN)", () => {
    const so = calculateFlangeDimension({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "150",
      flangeType: "so",
      facing: "rf",
    });
    expect(so.heroValue).toContain("16.50");
    expect(so.summary.find((row) => row.label === "Single flange (W_f)")?.value).toContain(
      "7.00",
    );
    expect(so.rows.find((row) => row.label.includes("hub bore"))?.value).toContain("114.3");

    const bl = calculateFlangeDimension({
      unitSystem: "metric",
      nps: "10",
      pressureClass: "600",
      flangeType: "bl",
    });
    const blWf = Number(
      bl.summary
        .find((row) => row.label === "Single flange (W_f)")
        ?.value.replace(/[^\d.]/g, "") ?? "0",
    );
    // Solid disc for 510×63.5 ≈ 102 kg; 0.85×WN(86) ≈ 73 would under-predict.
    expect(blWf).toBeGreaterThan(86);
    expect(blWf).toBeGreaterThan(0.85 * 86);
    expect(bl.rows.find((row) => row.label === "W_f mass basis")?.value).toMatch(/solid-disc/i);

    const rtj150 = calculateFlangeDimension({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "150",
      facing: "rtj",
    });
    expect(rtj150.rows.find((row) => row.label === "Facing")?.value).toContain("RF");

    const rtj300 = calculateFlangeDimension({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "300",
      facing: "rtj",
    });
    expect(rtj300.rows.find((row) => row.label === "RTJ ring number")?.value).toBe("R-37");
    expect(rtj300.rows.find((row) => row.label.includes("Stud bolt"))?.value).toBe("3/4 in × 120 mm");
    expectNoPoison(so);
    expectNoPoison(bl);
    expectNoPoison(rtj150);
    expectNoPoison(rtj300);
  });

  it("covers ASME B16.5 NPS 1/2–24 with class-dependent bolt and gasket mapping", () => {
    const nps = listFlangeNps().map((row) => row.nps);
    expect(nps).toEqual([
      "0.5",
      "0.75",
      "1",
      "1.25",
      "1.5",
      "2",
      "2.5",
      "3",
      "3.5",
      "4",
      "5",
      "6",
      "8",
      "10",
      "12",
      "14",
      "16",
      "18",
      "20",
      "24",
    ]);

    const halfInch = getFlangeDimensionEntry("0.5", "150");
    expect(halfInch?.rating.outsideDiameterMm).toBe(90);
    expect(halfInch?.rating.boltHoleCount).toBe(4);
    expect(halfInch?.rating.studDiameterIn).toBe("1/2");
    expect(halfInch?.rating.raisedFaceDiameterMm).toBe(34.9);

    const twentyFour = getFlangeDimensionEntry("24", "150");
    expect(twentyFour?.rating.outsideDiameterMm).toBe(815);
    expect(twentyFour?.rating.boltHoleCount).toBe(20);
    expect(twentyFour?.rating.studDiameterIn).toBe("1-1/4");
    expect(twentyFour?.rating.raisedFaceDiameterMm).toBe(692.2);

    expect(listFlangeClassesForNps("24").map((row) => row.class)).toEqual([
      "150",
      "300",
      "400",
      "600",
      "900",
      "1500",
    ]);
    expect(getFlangeDimensionEntry("24", "2500")).toBeUndefined();
    expect(getFlangeDimensionEntry("12", "2500")?.rating.boltHoleCount).toBe(12);
    expect(listFlangeClassesForNps("3.5").map((row) => row.class)).toEqual([
      "150",
      "300",
      "400",
      "600",
    ]);
  });

  it("filters pipe schedules by pressure class for WN hub bore", () => {
    const class150 = listSchedulesForNpsAndClass("4", "150").map(
      (row) => row.schedule,
    );
    const class400 = listSchedulesForNpsAndClass("4", "400").map(
      (row) => row.schedule,
    );
    const class1500 = listSchedulesForNpsAndClass("4", "1500").map(
      (row) => row.schedule,
    );

    expect(class150).toEqual(["10", "40", "80", "160"]);
    expect(class400).toEqual(["40", "80", "160"]);
    expect(class1500).toEqual(["80", "160"]);
  });
});

describe("04 Fitting & Valve Face-to-Face (ASME B16.9 / B16.10)", () => {
  it("uses B16.10 Class 150 NPS 4 gate FTF = 229 mm", () => {
    const out = calculateFittingValveDimension({
      ...DEFAULT_FITTING_VALVE_DIMENSION_INPUTS,
      unitSystem: "metric",
      componentId: "gate_valve",
      nps: "4",
      pressureClass: "150",
      includeGasketTakeout: false,
    });
    expect(out.heroValue).toContain("229.000");
    expectNoPoison(out);
  });

  it("adds Total Installation Length when gasket takeout is on", () => {
    const out = calculateFittingValveDimension({
      ...DEFAULT_FITTING_VALVE_DIMENSION_INPUTS,
      unitSystem: "metric",
      componentId: "gate_valve",
      nps: "4",
      pressureClass: "150",
      includeGasketTakeout: true,
      gasketThicknessMm: 1.5,
      gasketJoints: 2,
    });
    expect(out.heroValue).toContain("229.000");
    expect(out.summary).toEqual([
      { label: "Face-to-face", value: expect.stringContaining("229.000") },
      { label: "Total installation", value: expect.stringContaining("232.000") },
      { label: "Weight", value: expect.any(String) },
    ]);
    const install = out.rows.find((row) => row.label === "Total Installation Length");
    expect(install?.value).toContain("232.000");
    expectNoPoison(out);
  });

  it("looks up ball valve and wafer butterfly FTF", () => {
    const ball = calculateFittingValveDimension({
      ...DEFAULT_FITTING_VALVE_DIMENSION_INPUTS,
      unitSystem: "metric",
      componentId: "ball_valve",
      nps: "4",
      pressureClass: "150",
      includeGasketTakeout: false,
    });
    expect(ball.heroValue).toContain("229.000");
    const bf = calculateFittingValveDimension({
      ...DEFAULT_FITTING_VALVE_DIMENSION_INPUTS,
      unitSystem: "metric",
      componentId: "butterfly_valve",
      nps: "4",
      pressureClass: "150",
      includeGasketTakeout: false,
    });
    expect(bf.heroValue).toContain("52.000");
    expectNoPoison(ball);
    expectNoPoison(bf);
  });

  it("covers NPS 1/2 through 24 in the reference table", () => {
    const small = calculateFittingValveDimension({
      ...DEFAULT_FITTING_VALVE_DIMENSION_INPUTS,
      unitSystem: "metric",
      componentId: "gate_valve",
      nps: "0.5",
      pressureClass: "150",
      includeGasketTakeout: false,
    });
    const large = calculateFittingValveDimension({
      ...DEFAULT_FITTING_VALVE_DIMENSION_INPUTS,
      unitSystem: "metric",
      componentId: "gate_valve",
      nps: "24",
      pressureClass: "150",
      includeGasketTakeout: false,
    });
    expect(small.heroValue).toContain("108.000");
    expect(large.heroValue).toContain("508.000");
    expectNoPoison(small);
    expectNoPoison(large);
  });
});

describe("04b Butt-Weld Fitting Dimensions (ASME B16.9)", () => {
  it("uses B16.9 NPS 4 90° LR elbow A = 152 mm with Sch 40 OD/wall", () => {
    const out = calculateButtWeldFitting({
      ...DEFAULT_BUTT_WELD_FITTING_INPUTS,
      componentId: "elbow_90_lr",
      nps: "4",
      schedule: "40",
    });
    expect(out.heroValue).toContain("152.000");
    expect(out.heroLabel).toContain("(A)");
    expect(out.rows.some((row) => row.label.includes("Outside diameter"))).toBe(
      true,
    );
    expectNoPoison(out);
  });

  it("uses SR A = 1.0 × NPS (NPS 4 → 102 mm) and 45° B for NPS 12 = 229 mm", () => {
    const sr = calculateButtWeldFitting({
      ...DEFAULT_BUTT_WELD_FITTING_INPUTS,
      componentId: "elbow_90_sr",
      nps: "4",
      schedule: "40",
    });
    expect(sr.heroValue).toContain("102.000");
    const b45 = calculateButtWeldFitting({
      ...DEFAULT_BUTT_WELD_FITTING_INPUTS,
      componentId: "elbow_45_lr",
      nps: "12",
      schedule: "40",
    });
    expect(b45.heroValue).toContain("229.000");
    expect(b45.heroLabel).toContain("(B)");
    expectNoPoison(sr);
    expectNoPoison(b45);
  });

  it("computes ID = OD − 2t and scales approximate weight by wall", () => {
    const pipe = getPipeScheduleEntry("4", "40");
    expect(pipe).toBeDefined();
    const id = computeInsideDiameterMm(
      pipe!.pipe.outsideDiameterMm,
      pipe!.row.wallThicknessMm,
    );
    expect(id).toBeCloseTo(
      pipe!.pipe.outsideDiameterMm - 2 * pipe!.row.wallThicknessMm,
      6,
    );
    const out = calculateButtWeldFitting({
      ...DEFAULT_BUTT_WELD_FITTING_INPUTS,
      nps: "4",
      schedule: "40",
    });
    const idRow = out.rows.find((row) => row.label.startsWith("Inside diameter"));
    expect(idRow?.value).toContain(id.toFixed(3));
    expect(scaleFittingWeightKg(3.5, 6.02, 6.02)).toBeCloseTo(3.5, 5);
    expect(scaleFittingWeightKg(3.5, 12.04, 6.02)).toBeCloseTo(7.0, 5);
  });

  it("maps tee C, reducer H, and cap E dimension symbols", () => {
    const tee = calculateButtWeldFitting({
      ...DEFAULT_BUTT_WELD_FITTING_INPUTS,
      componentId: "tee_equal",
      nps: "4",
    });
    expect(tee.heroLabel).toContain("(C)");
    expect(tee.heroValue).toContain("102.000");
    const red = calculateButtWeldFitting({
      ...DEFAULT_BUTT_WELD_FITTING_INPUTS,
      componentId: "reducer_concentric",
      nps: "4",
    });
    expect(red.heroLabel).toContain("(H)");
    const cap = calculateButtWeldFitting({
      ...DEFAULT_BUTT_WELD_FITTING_INPUTS,
      componentId: "cap",
      nps: "4",
    });
    expect(cap.heroLabel).toContain("(E)");
  });
});

describe("05 Gasket Dimension (ASME B16.20)", () => {
  it("looks up NPS 4 Class 150 spiral-wound outer ring", () => {
    const out = calculateGasketDimension({
      unitSystem: "metric",
      gasketTypeId: "spiral_wound",
      nps: "4",
      pressureClass: "150",
    });
    expect(out.heroLabel).toBe("ID × SE_OD × OR_OD");
    expect(out.heroValue).toContain("78.000");
    expect(out.heroValue).toContain("117.500");
    expect(out.heroValue).toContain("190.500");
    expect(out.heroBadges?.find((b) => b.label === "OR_OD")?.value).toContain(
      "190.500",
    );
    expect(out.summary.find((row) => row.label.includes("Outer ring"))?.value).toContain(
      "190.500",
    );
    expectNoPoison(out);
  });

  it("looks up NPS 4 Class 300 RTJ ring R-37", () => {
    const out = calculateGasketDimension({
      unitSystem: "metric",
      gasketTypeId: "rtj_ring",
      nps: "4",
      pressureClass: "300",
    });
    expect(out.heroLabel).toContain("Ring No.");
    expect(out.heroValue).toContain("R-37");
    expect(out.heroBadges?.find((b) => b.label === "Ring")?.value).toBe("R-37");
    expect(out.rows.find((row) => row.label.includes("Pitch"))?.value).toContain(
      "123.800",
    );
    expect(out.rows.find((row) => row.label.includes("width × height"))?.value).toContain(
      "11.100",
    );
    expectNoPoison(out);
  });

  it("falls back for unknown combination", () => {
    const out = calculateGasketDimension({
      unitSystem: "metric",
      gasketTypeId: "spiral_wound",
      nps: "99",
      pressureClass: "999",
    });
    expect(out.heroValue).toBe("—");
    expectNoPoison(out);
  });
});

describe("06 Valve Cv (ISA / IEC 60534 US Cv)", () => {
  it("computes liquid Cv from m³/h and bar via gpm/psi", () => {
    const cv = liquidCvUs(120, 3, 1);
    const qGpm = 120 * 4.402867655;
    const dpPsi = 3 * 14.5037738;
    nearly(cv, qGpm * Math.sqrt(1 / dpPsi));
  });

  it("returns 0 (not NaN/Infinity) for ΔP ≤ 0 or gas P1 ≤ P2", () => {
    expect(liquidCvUs(50, 0, 1)).toBe(0);
    expect(liquidCvUs(50, -1, 1)).toBe(0);
    expect(gasCvUs(1000, 10, 10, 0.6, 25)).toBe(0);
    expect(gasCvUs(1000, 5, 10, 0.6, 25)).toBe(0);
    const out = calculateValveCv({
      unitSystem: "metric",
      fluid: "liquid",
      flowRate: 50,
      inletPressure: 5,
      outletPressure: 5,
      specificGravity: 1,
      temperature: 25,
      requiredCv: 40,
    });
    expect(out.heroValue).toBe("—");
    expect(out.rows.find((r) => r.label === "Sizing result")?.value).toBe("—");
    expectNoPoison(out);
  });

  it("matches default liquid case (~80.1 Cv) and Cv ≤ Cv,sel headroom", () => {
    const out = calculateValveCv({
      unitSystem: "metric",
      fluid: "liquid",
      flowRate: 120,
      inletPressure: 10,
      outletPressure: 7,
      specificGravity: 1,
      temperature: 25,
      requiredCv: 100,
    });
    nearly(Number(out.heroValue), 80.1, 0.15);
    expect(out.heroLabel).toContain("Required Cv");
    expect(out.heroStatusLevel).toBe("pass");
    expect(out.heroBadges?.some((b) => b.label === "Cv,sel")).toBe(true);

    const undersized = calculateValveCv({
      unitSystem: "metric",
      fluid: "liquid",
      flowRate: 120,
      inletPressure: 10,
      outletPressure: 7,
      specificGravity: 1,
      temperature: 25,
      requiredCv: 45,
    });
    expect(undersized.heroStatusLevel).toBe("fail");
  });
});

describe("07 Bolt Torque (ASME PCC-1)", () => {
  it("returns NPS 4 Class 150 190 N·m / 8 × 5/8 in studs", () => {
    const out = calculateBoltTorque({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "150",
      lubricant: "moly",
      boltGrade: "b7",
    });
    expect(out.heroValue).toContain("190");
    expect(out.heroLabel).toContain("(T)");
    expect(out.summary.find((row) => row.label === "Studs")?.value).toContain("8");
    expect(out.summary.find((row) => row.label === "Studs")?.value).toContain("5/8");
    expect(out.rows.some((row) => row.label.startsWith("Round 1"))).toBe(true);
    expect(out.exportRows.find((row) => row.label === "Standard")?.value).toBe(
      "ASME PCC-1",
    );
    expectNoPoison(out);
  });

  it("scales torque with dry nut factor K = 0.20", () => {
    const moly = calculateBoltTorque({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "150",
      lubricant: "moly",
      boltGrade: "b7",
    });
    const dry = calculateBoltTorque({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "150",
      lubricant: "dry",
      boltGrade: "b7",
    });
    const molyNm = Number(moly.heroValue.replace(/[^\d.]/g, ""));
    const dryNm = Number(dry.heroValue.replace(/[^\d.]/g, ""));
    nearly(dryNm, molyNm * (0.2 / 0.13), 0.5);
  });

  it("matches NPS 6 Class 300 table (366 N·m) and exposes hero badges", () => {
    const out = calculateBoltTorque({
      unitSystem: "metric",
      nps: "6",
      pressureClass: "300",
      lubricant: "moly",
      boltGrade: "b7",
    });
    expect(out.heroValue).toBe("366 N·m");
    expect(out.heroBadges?.some((b) => b.label === "Nut factor K" && b.value === "0.13")).toBe(
      true,
    );
    expect(out.rows.find((r) => r.label.startsWith("Round 1"))?.value).toBe("110 N·m");
    expect(out.rows.find((r) => r.label.startsWith("Round 2"))?.value).toBe("220 N·m");

    const b8 = calculateBoltTorque({
      unitSystem: "metric",
      nps: "6",
      pressureClass: "300",
      lubricant: "moly",
      boltGrade: "b8",
    });
    nearly(Number(b8.heroValue.replace(/[^\d.]/g, "")), 366 * 0.85, 0.6);
  });
});

describe("08 Blind Flange Thickness (ASME B31.3 / VIII-1 UG-34)", () => {
  it("matches t = d √(0.3P / SE) + c", () => {
    const t = requiredBlindThicknessMm({
      insideDiameter: 102.26,
      designPressure: 2.5,
      allowableStress: 138,
      weldEfficiency: 1,
      corrosionAllowance: 3,
    });
    const expected = 102.26 * Math.sqrt((0.3 * 2.5) / (138 * 1)) + 3;
    nearly(t, expected);
  });

  it("does not emit NaN for P ≤ 0", () => {
    expect(
      requiredBlindThicknessMm({
        insideDiameter: 102.26,
        designPressure: 0,
        allowableStress: 138,
        weldEfficiency: 1,
        corrosionAllowance: 3,
      }),
    ).toBe(3);
  });

  it("calculates permanent operating blind output with commercial plate recommendation", () => {
    const output = calculateBlindFlange({
      unitSystem: "metric",
      mode: "permanent",
      nps: "6",
      pressureClass: "300",
      insideDiameter: 215.9,
      designPressure: 5.15,
      allowableStress: 125,
      weldEfficiency: 1.0,
      corrosionAllowance: 3.0,
      materialId: "a516_70",
    });
    expectNoPoison(output);
    expect(output.heroLabel).toContain("Required Blind Flange Thickness");
    expect(output.summary.some((s) => s.value.includes("Permanent"))).toBe(true);
  });

  it("calculates temporary hydrotest blank output with c = 0 mm and ambient stress", () => {
    const output = calculateBlindFlange({
      unitSystem: "metric",
      mode: "hydrotest",
      nps: "6",
      pressureClass: "300",
      insideDiameter: 215.9,
      designPressure: 7.71, // 77.1 bar (Standard Class 300 hydrotest rating)
      allowableStress: 138,
      weldEfficiency: 1.0,
      corrosionAllowance: 0.0,
      materialId: "a516_70",
    });
    expectNoPoison(output);
    expect(output.heroLabel).toContain("Required Hydrotest Blank Thickness");
    expect(output.heroStatus).toContain("Temporary Test Blank");
    // t_m is 27.95 mm, next commercial plate stock is 28 mm (28T Plate)
    const plate = getRecommendedCommercialPlate(27.95, "metric");
    expect(plate.value).toBe(28);
    expect(plate.label).toContain("28 mm (28T Plate)");
  });

  it("detects over-pressure against ASME B16.5 rating limits", () => {
    // 4" 150# with 10.0 MPa (100 bar) -> exceeds 150# ambient limit (~19.6 bar)
    const overPressure = calculateBlindFlange({
      unitSystem: "metric",
      mode: "permanent",
      nps: "4",
      pressureClass: "150",
      insideDiameter: 157.2,
      designPressure: 10.0, // 100 bar
      allowableStress: 125,
      weldEfficiency: 1.0,
      corrosionAllowance: 3.0,
      materialId: "a516_70",
    });
    expect(overPressure.heroStatusLevel).toBe("fail");
    expect(overPressure.heroStatus).toContain("WARNING: Pressure exceeds ASME B16.5 #150 ambient rating");
    expect(overPressure.heroStatus).toContain("19.6 bar");
  });

  it("formats over-pressure warning in psi when imperial", () => {
    const overPressure = calculateBlindFlange({
      unitSystem: "imperial",
      mode: "permanent",
      nps: "4",
      pressureClass: "150",
      insideDiameter: 6.189,
      designPressure: 500, // exceeds ~284 psi ambient
      allowableStress: 18100,
      weldEfficiency: 1.0,
      corrosionAllowance: 0.125,
      materialId: "a516_70",
    });
    expect(overPressure.heroStatusLevel).toBe("fail");
    expect(overPressure.heroStatus).toMatch(/\d{3} psi/);
    expect(overPressure.heroStatus).not.toContain(" bar)");
  });

  it("exposes ambient Class 150 as 1.96 MPa matching warning 19.6 bar", () => {
    expect(FLANGE_RATING_LIMITS["150"].ambientBar).toBe(19.6);
    expect(flangeAmbientPressureMpa("150")).toBeCloseTo(1.96, 5);
    expect(flangeAmbientPressureMpa("300")).toBeCloseTo(5.11, 5);
  });

  it("reports safety margin percent against t_m (not pipe t_nom_req)", () => {
    const output = calculateBlindFlange({
      unitSystem: "metric",
      mode: "hydrotest",
      nps: "6",
      pressureClass: "300",
      insideDiameter: 215.9,
      designPressure: 7.71,
      allowableStress: 138,
      weldEfficiency: 1.0,
      corrosionAllowance: 0.0,
      materialId: "a516_70",
    });
    const marginRow = output.rows.find((r) => r.label.includes("Safety Margin"));
    expect(marginRow?.value).toMatch(/%/);
    expect(marginRow?.value).toContain("t_m");
    expect(output.heroBadges?.some((b) => b.label.includes("Safety margin"))).toBe(
      true,
    );
  });

  it("recommends correct commercial plate in metric and imperial", () => {
    const metricRec = getRecommendedCommercialPlate(14.2, "metric");
    expect(metricRec.value).toBe(16);
    expect(metricRec.label).toBe("16 mm (16T Plate)");
    expect(metricRec.excess).toBe(1.8);

    const imperialRec = getRecommendedCommercialPlate(0.55, "imperial");
    expect(imperialRec.value).toBe(0.625);
    expect(imperialRec.unit).toBe("in");
    expect(imperialRec.label).toBe('5/8" Plate');
  });

  it("round-trips corrosion and stress without float junk", () => {
    const toImp = syncCompanionUnits(
      {
        unitSystem: "metric" as const,
        corrosionAllowance: 3.0,
        allowableStress: 138,
        designPressure: 1.0,
      },
      "imperial",
    );
    expect(toImp.corrosionAllowance).toBeCloseTo(0.118, 3);
    expect(toImp.allowableStress).toBe(20000);
    expect(Number.isInteger(toImp.allowableStress)).toBe(true);

    const toMet = syncCompanionUnits(toImp, "metric");
    expect(toMet.corrosionAllowance).toBe(3);
    expect(toMet.allowableStress).toBe(138);
  });

  it("maps ASME B16.5 RF gasket contact diameter", () => {
    const dNps6 = getStandardGasketContactDiameter("6", "300", "metric");
    expect(dNps6).toBe(215.9);

    const dNps2 = getStandardGasketContactDiameter("2", "150", "metric");
    expect(dNps2).toBeCloseTo(92, 0);

    const dNps4In = getStandardGasketContactDiameter("4", "150", "imperial");
    expect(dNps4In).toBeCloseTo(6.189, 2);
  });

  it("converts insideDiameter when switching metric → imperial", () => {
    const next = syncCompanionUnits(
      {
        unitSystem: "metric" as const,
        insideDiameter: 157.2,
        designPressure: 2.5,
        corrosionAllowance: 3.0,
        allowableStress: 125.0,
      },
      "imperial",
    );
    expect(next.insideDiameter).toBeCloseTo(157.2 / 25.4, 3);
    expect(next.corrosionAllowance).toBeCloseTo(3 / 25.4, 3);
  });

  it("round-trips insideDiameter without float junk like 157.2006", () => {
    const imperial = syncCompanionUnits(
      { unitSystem: "metric" as const, insideDiameter: 157.2 },
      "imperial",
    );
    const metric = syncCompanionUnits(imperial, "metric");
    expect(metric.insideDiameter).toBe(157.2);
  });

  it("computes imperial custom P with correct inch d (~0.17 in, not ~1.14 in)", () => {
    const t = requiredBlindThicknessMm({
      insideDiameter: 6.189,
      designPressure: 2.5,
      allowableStress: 18100,
      weldEfficiency: 1,
      corrosionAllowance: 0.125,
    });
    expect(t).toBeCloseTo(0.165, 2);
    expect(t).toBeLessThan(0.25);
    expect(t).toBeGreaterThan(0.14);
  });
});

describe("09 Metal Weight", () => {
  it("computes CS plate mass and matches imperial inch inputs", () => {
    const metric = metalWeightKg({
      unitSystem: "metric",
      shape: "plate",
      material: "carbon-steel",
      length: 3000,
      width: 1500,
      thickness: 12,
      outerDiameter: 0,
      innerDiameter: 0,
      nps: "4",
      schedule: "40",
      unitPrice: 1.85,
      currency: "USD",
      priceBasis: "kg",
      quantity: 1,
      wallMode: "dim",
      bwg: 16,
    });
    nearly(metric, 3 * 1.5 * 0.012 * 7850);
    const imperial = metalWeightKg({
      unitSystem: "imperial",
      shape: "plate",
      material: "carbon-steel",
      length: 3000 / 25.4,
      width: 1500 / 25.4,
      thickness: 12 / 25.4,
      outerDiameter: 0,
      innerDiameter: 0,
      nps: "4",
      schedule: "40",
      unitPrice: 1.85,
      currency: "USD",
      priceBasis: "kg",
      quantity: 1,
      wallMode: "dim",
      bwg: 16,
    });
    nearly(imperial, metric, 1e-6);
  });
});

describe("10 Hydro Test Pressure (ASME B31.3)", () => {
  const base = {
    unitSystem: "metric" as const,
    designPressure: 2.5,
    designStress: 138,
    testStress: 138,
    stressRatio: 1,
    applyTempCorrection: false,
    nps: "4",
  };

  it("uses 1.5× hydrostatic and 1.1× pneumatic at St/S = 1", () => {
    nearly(
      hydroTestPressureMpa({ ...base, testFluid: "hydrostatic" }),
      3.75,
    );
    nearly(
      hydroTestPressureMpa({ ...base, testFluid: "pneumatic" }),
      2.75,
    );
  });

  it("applies Pt = 1.5 × P × (St/S)", () => {
    nearly(
      hydroTestPressureMpa({
        ...base,
        testFluid: "hydrostatic",
        stressRatio: 1.2,
      }),
      4.5,
    );
    nearly(
      hydroTestPressureMpa({
        ...base,
        testFluid: "hydrostatic",
        applyTempCorrection: true,
        designStress: 138,
        testStress: 207,
      }),
      5.625,
    );
  });

  it("caps St/S at the 6.5 yield-limit guide", () => {
    nearly(
      hydroTestPressureMpa({
        ...base,
        testFluid: "hydrostatic",
        stressRatio: 10,
      }),
      2.5 * 1.5 * 6.5,
    );
  });

  it("converts imperial psi input to MPa before 1.5×", () => {
    const psi = 2.5 * 145.037738;
    nearly(
      hydroTestPressureMpa({
        unitSystem: "imperial",
        testFluid: "hydrostatic",
        designPressure: psi,
        designStress: 20000,
        testStress: 20000,
        stressRatio: 1,
        applyTempCorrection: false,
        nps: "4",
      }),
      3.75,
    );
  });

  it("falls back when P ≤ 0 or stress ratio would divide by zero", () => {
    expect(
      hydroTestPressureMpa({
        unitSystem: "metric",
        testFluid: "hydrostatic",
        designPressure: 0,
        designStress: 0,
        testStress: 138,
        stressRatio: 1,
        applyTempCorrection: true,
        nps: "4",
      }),
    ).toBe(0);
    const out = calculateHydroTest({
      unitSystem: "metric",
      testFluid: "hydrostatic",
      designPressure: 0,
      designStress: 0,
      testStress: 0,
      stressRatio: 1,
      applyTempCorrection: true,
      nps: "4",
    });
    expect(out.heroValue).toBe("—");
    expectNoPoison(out);
  });

  it("maps NPS bands to 10 / 30 / 60 min holding-time guides", () => {
    expect(getHoldingTimeGuide("0.5")).toContain("10 minutes");
    expect(getHoldingTimeGuide("2")).toContain("10 minutes");
    expect(getHoldingTimeGuide("2.5")).toContain("30 minutes");
    expect(getHoldingTimeGuide("4")).toContain("30 minutes");
    expect(getHoldingTimeGuide("6")).toContain("60 minutes");
    expect(getHoldingTimeGuide("6")).toContain("\n— confirm site procedure");
    expect(getHoldingTimeGuide("24")).toContain("site procedure");
    const out = calculateHydroTest({
      ...base,
      testFluid: "hydrostatic",
      nps: "2.5",
    });
    expect(out.rows.find((r) => r.label === "Minimum holding time")?.value).toContain(
      "30 minutes",
    );
  });

  it("exposes Pt hero badges and snaps St/S stresses on unit toggle", () => {
    const out = calculateHydroTest({ ...base, testFluid: "hydrostatic" });
    expect(out.heroValue).toBe("3.75 MPa");
    expect(out.heroBadges?.some((b) => b.label === "Test fluid" && b.value === "Hydrostatic")).toBe(
      true,
    );
    expect(out.heroBadges?.some((b) => b.label === "St/S")).toBe(true);

    const imperial = syncCompanionUnits(
      {
        unitSystem: "metric" as const,
        designPressure: 2.5,
        designStress: 138,
        testStress: 138,
      },
      "imperial",
    );
    expect(imperial.designStress).toBe(20000);
    expect(imperial.testStress).toBe(20000);
    expect(imperial.designPressure).toBe(363);

    const metric = syncCompanionUnits(imperial, "metric");
    expect(metric.designStress).toBe(138);
    expect(metric.testStress).toBe(138);
  });
});

describe("11 Thermal Expansion", () => {
  it("matches ΔL = α L ΔT for CS 20 m, 21 → 150 °C", () => {
    const dL = thermalExpansionDeltaLMm({
      unitSystem: "metric",
      material: "cs",
      installTemp: 21,
      operatingTemp: 150,
      length: 20,
      nps: "4",
      schedule: "40",
      allowableSa: 138,
      frictionFactor: 0.3,
    });
    nearly(dL, 12.1e-6 * 20 * 129 * 1000);
  });

  it("returns 0 for non-finite / non-positive length (no NaN)", () => {
    expect(
      thermalExpansionDeltaLMm({
        unitSystem: "metric",
        material: "cs",
        installTemp: -300,
        operatingTemp: 20,
        length: 0,
        nps: "4",
        schedule: "40",
        allowableSa: 138,
        frictionFactor: 0.3,
      }),
    ).toBe(0);
    const dL = thermalExpansionDeltaLMm({
      unitSystem: "metric",
      material: "cs",
      installTemp: -300,
      operatingTemp: 20,
      length: 10,
      nps: "4",
      schedule: "40",
      allowableSa: 138,
      frictionFactor: 0.3,
    });
    expect(Number.isFinite(dL)).toBe(true);
  });

  it("matches default CS NPS 4 Sch 40 screening H / W / F_anchor", () => {
    const out = calculateThermalExpansion({
      unitSystem: "metric",
      material: "cs",
      installTemp: 21,
      operatingTemp: 150,
      length: 20,
      nps: "4",
      schedule: "40",
      allowableSa: 138,
      frictionFactor: 0.3,
    });
    expect(out.heroLabel).toBe("Thermal Expansion (ΔL)");
    expect(out.heroValue).toContain("31.2");
    expect(out.heroBadges?.find((b) => b.label === "H")?.value).toContain("2.75");
    expect(out.heroBadges?.find((b) => b.label === "W")?.value).toContain("1.37");
    expect(out.summary.find((row) => row.label.includes("F_anchor"))?.value).toContain(
      "11.53",
    );
    expect(out.rows.find((row) => row.label.includes("G₁"))?.value).toContain("457.2");
    expect(out.rows.find((row) => row.label.includes("G₂"))?.value).toContain("1600.2");
    expectNoPoison(out);
  });

  it("shows imperial ΔL in inches", () => {
    const out = calculateThermalExpansion({
      unitSystem: "imperial",
      material: "cs",
      installTemp: 70,
      operatingTemp: 302,
      length: 65.62,
      nps: "4",
      schedule: "40",
      allowableSa: 20,
      frictionFactor: 0.3,
    });
    expect(out.heroValue).toMatch(/in/);
    expect(out.heroValue).not.toMatch(/mm/);
    expectNoPoison(out);
  });
});

describe("12 Darcy–Weisbach Pressure Drop", () => {
  it("matches independent Haaland ΔP for water, 100 m, 4 in Sch 40, 50 m³/h, no fittings", () => {
    const result = computePressureDrop({
      unitSystem: "metric",
      fluid: "water",
      temperature: 20,
      roughness: 0.045,
      flow: 50,
      flowUnit: "m3h",
      nps: "4",
      schedule: "40",
      length: 100,
      elbowCount: 0,
      gateCount: 0,
      globeCount: 0,
    });
    expect(result).not.toBeNull();

    const dM = 0.10226;
    const area = Math.PI * dM * dM * 0.25;
    const q = 50 / 3600;
    const v = q / area;
    const rho = 998;
    const mu = 0.001;
    const re = (rho * v * dM) / mu;
    const f = haalandFriction(re, 0.045e-3 / dM); // roughness 0.045 mm = 0.045e-3 m
    const dpBar = (f * (100 / dM) * 0.5 * rho * v * v) / 1e5;

    nearly(result!.velocity, v);
    nearly(result!.frictionFactor, f, 5e-3); // Increased tolerance for friction factor
    nearly(result!.dpBar, dpBar, 5e-3); // Increased tolerance for pressure drop
    expect(result!.dpBar).toBeGreaterThan(0.2);
    expect(result!.dpBar).toBeLessThan(0.35);
  });

  it("round-trips imperial GPM / ft to the same bar drop", () => {
    const metric = computePressureDrop({
      unitSystem: "metric",
      fluid: "water",
      temperature: 20,
      roughness: 0.045,
      flow: 50,
      flowUnit: "m3h",
      nps: "4",
      schedule: "40",
      length: 100,
      elbowCount: 0,
      gateCount: 0,
      globeCount: 0,
    });
    const imperial = computePressureDrop({
      unitSystem: "imperial",
      fluid: "water",
      temperature: 68,
      roughness: 0.045,
      flow: 50 * (1 / 0.227124707),
      flowUnit: "gpm",
      nps: "4",
      schedule: "40",
      length: 100 / 0.3048,
      elbowCount: 0,
      gateCount: 0,
      globeCount: 0,
    });
    expect(metric && imperial).toBeTruthy();
    nearly(imperial!.dpBar, metric!.dpBar, 5e-4);
  });

  it("returns null for zero flow / length", () => {
    expect(
      computePressureDrop({
        unitSystem: "metric",
        fluid: "water",
        temperature: 20,
        roughness: 0.045,
        flow: 0,
        flowUnit: "m3h",
        nps: "4",
        schedule: "40",
        length: 100,
        elbowCount: 0,
        gateCount: 0,
        globeCount: 0,
      }),
    ).toBeNull();
  });

  it("matches default water NPS 4 Sch 40 with fittings in calculatePressureDrop", () => {
    const out = calculatePressureDrop({
      unitSystem: "metric",
      fluid: "water",
      temperature: 20,
      roughness: 0.045,
      flow: 40,
      flowUnit: "m3h",
      nps: "4",
      schedule: "40",
      length: 100,
      elbowCount: 4,
      gateCount: 2,
      globeCount: 0,
    });
    expect(out.heroLabel).toBe("Pressure Drop (ΔP)");
    expect(out.heroValue).toContain("0.194");
    expect(out.heroBadges?.find((b) => b.label === "f")?.value).toContain("0.0190");
    expect(out.summary.find((row) => row.label === "ΔP / 100 m")?.value).toContain(
      "0.170",
    );
    expect(
      out.rows.find((row) => row.label.includes("Total equivalent length"))?.value,
    ).toContain("113.9");
    expectNoPoison(out);
  });

  it("reports imperial ΔP/100 as psi per 100 ft", () => {
    const out = calculatePressureDrop({
      unitSystem: "imperial",
      fluid: "water",
      temperature: 68,
      roughness: 0.045,
      flow: 176.11,
      flowUnit: "gpm",
      nps: "4",
      schedule: "40",
      length: 328.08,
      elbowCount: 0,
      gateCount: 0,
      globeCount: 0,
    });
    expect(out.summary.find((row) => row.label === "ΔP / 100 ft")?.value).toMatch(
      /psi\/100 ft/,
    );
    expect(out.heroValue).toMatch(/psi/);
    expectNoPoison(out);
  });
});

describe("13 Flow Velocity & API RP 14E", () => {
  it("computes v = Q/A and vc = C / √ρ with C in ft/s, ρ in lb/ft³", () => {
    const result = computeFlowVelocity({
      unitSystem: "metric",
      materialFamily: "cs",
      nps: "4",
      schedule: "40",
      flow: 50,
      flowUnit: "m3h",
      density: 998,
      erosionC: 100,
    });
    expect(result).not.toBeNull();
    const dM = 0.10226;
    const vExpected = 50 / 3600 / (Math.PI * dM * dM * 0.25);
    const vcExpected = apiRp14eLimitMs(998, 100);
    nearly(result!.velocity, vExpected);
    nearly(result!.vc, vcExpected);
    nearly(vcExpected, (100 / Math.sqrt(998 * 0.06242796)) * 0.3048);
    expect(result!.status).toBe("Safe");
  });

  it("flags erosion when v ≥ vc", () => {
    const result = computeFlowVelocity({
      unitSystem: "metric",
      materialFamily: "cs",
      nps: "4",
      schedule: "40",
      flow: 130,
      flowUnit: "m3h",
      density: 998,
      erosionC: 100,
    });
    expect(result?.status).toBe("Erosion Risk");
  });

  it("falls back for zero flow", () => {
    const out = calculateFlowVelocity({
      unitSystem: "metric",
      materialFamily: "cs",
      nps: "4",
      schedule: "40",
      flow: 0,
      flowUnit: "m3h",
      density: 998,
      erosionC: 100,
    });
    expect(out.heroValue).toBe("—");
    expectNoPoison(out);
  });

  it("applies stainless liquid cap and B36.19M schedule pairing", () => {
    const ss = computeFlowVelocity({
      unitSystem: "metric",
      materialFamily: "ss",
      nps: "4",
      schedule: "40S",
      flow: 90,
      flowUnit: "m3h",
      density: 998,
      erosionC: 150,
    });
    expect(ss).not.toBeNull();
    expect(ss!.liquidCapMs).toBe(5);
    expect(ss!.status).not.toBe("Erosion Risk");
  });

  it("matches default CS NPS 4 Sch 40 water case in calculateFlowVelocity", () => {
    const out = calculateFlowVelocity({
      unitSystem: "metric",
      materialFamily: "cs",
      nps: "4",
      schedule: "40",
      flow: 40,
      flowUnit: "m3h",
      density: 998,
      erosionC: 100,
    });
    expect(out.heroLabel).toBe("Mean Velocity (v)");
    expect(out.heroValue).toMatch(/1\.35/);
    expect(out.heroBadges?.find((b) => b.label === "v / vc")?.value).toBe("35%");
    expect(out.summary.find((row) => row.label === "Erosion limit (vc)")?.value).toMatch(
      /3\.86/,
    );
    expect(out.rows.find((row) => row.label === "Status")?.value).toBe("Safe");
    expectNoPoison(out);
  });
});

describe("15 Unit Converter + SI round-trips", () => {
  it("converts 20 bar ↔ psi, 1 in = 25.4 mm, 0 °C = 32 °F = 273.15 K", () => {
    nearly(convertPressure(20, "bar", "psi"), 290.075476);
    nearly(convertPressure(290.075476, "psi", "bar"), 20);
    nearly(convertDimension(1, "in", "mm"), 25.4);
    nearly(convertTemperature(0, "C", "F"), 32);
    nearly(convertTemperature(0, "C", "K"), 273.15);
    nearly(barToPsi(1), 14.5037738);
    nearly(psiToBar(14.5037738), 1);
  });

  it("converts torque, mass, and velocity SI round-trips", () => {
    nearly(convertTorque(1, "N·m", "ft·lb"), 1 / 1.3558179483314004);
    nearly(convertTorque(1, "kgf·m", "N·m"), 9.80665);
    nearly(convertMass(1, "kg", "lb"), 1 / 0.45359237);
    nearly(convertMass(1, "t", "kg"), 1000);
    nearly(convertVelocity(1, "m/s", "ft/s"), 1 / 0.3048);
    nearly(convertVelocity(3.280839895, "ft/s", "m/s"), 1, 1e-8);
  });

  it("does not emit NaN for non-finite input", () => {
    const out = calculateUnitConverter({
      category: "pressure",
      value: Number.NaN,
      from: "bar",
      to: "psi",
      density: 1000,
      digits: 3,
    });
    expect(out.heroValue.startsWith("—")).toBe(true);
    expectNoPoison(out);
  });

  it("rounds display to selected decimals and omits duplicate result rows", () => {
    const three = calculateUnitConverter({
      category: "pressure",
      value: 20,
      from: "bar",
      to: "psi",
      density: 1000,
      digits: 3,
    });
    const two = calculateUnitConverter({
      category: "pressure",
      value: 20,
      from: "bar",
      to: "psi",
      density: 1000,
      digits: 2,
    });
    expect(three.heroValue).toBe("290.075 psi");
    expect(two.heroValue).toBe("290.08 psi");
    expect(three.rows).toEqual([]);
  });
});

describe("pSEO spec routes", () => {
  it("parses 4-inch-class-150 and 3-inch-sch-40", () => {
    expect(parseSpecToQuery("4-inch-class-150")).toMatchObject({
      nps: "4",
      class: "150",
    });
    expect(parseSpecToQuery("3-inch-sch-40")).toMatchObject({
      nps: "3",
      sch: "40",
    });
  });

  it("resolves flange 4-inch-class-150 from live tables", () => {
    const route = resolveSpecRoute("flange-dimension-weight", "4-inch-class-150");
    expect(route?.label).toContain("Class 150");
    expect(route?.query.nps).toBe("4");
    expect(route?.query.class).toBe("150");
  });

  it("seeds unit-converter torque and velocity spec paths", () => {
    expect(parseSpecToQuery("torque")).toMatchObject({ cat: "torque" });
    const torque = resolveSpecRoute("unit-converter", "torque");
    expect(torque?.query.from).toBe("N·m");
    expect(torque?.query.to).toBe("ft·lb");
    expect(resolveSpecRoute("unit-converter", "velocity")?.query.from).toBe("m/s");
  });
});

describe("16 Link-Seal Penetration Sleeve", () => {
  it("selects LS-400-C × 9 links for NPS 4 OD 114.3 / sleeve 190 mm", () => {
    const out = calculateLinkSeal({
      unitSystem: "metric",
      nps: "4",
      pipeOd: 114.3,
      openingType: "steel_sleeve",
      sleeveId: 190,
      hardware: "C",
    });
    expect(out.heroValue).toBe("LS-400-C × 9 Links");
    expect(out.rows.find((r) => r.label.includes("Annular clearance"))?.value).toContain(
      "37.9",
    );
    expect(out.rows.find((r) => r.label === "Number of links (N)")?.value).toBe("9");
    expect(out.rows.find((r) => r.label.includes("Pressure rating"))?.value).toMatch(
      /0\.14 MPa/,
    );
    expect(out.rows.find((r) => r.label === "Ideal minimum sleeve ID")?.value).toContain(
      "186.9",
    );
    expect(out.rows.find((r) => r.label.startsWith("Pitch diameter"))?.value).toContain(
      "186.9",
    );
    expect(out.heroStatusLevel).toBe("pass");
    expectNoPoison(out);
  });

  it("formats pressure rating in imperial units", () => {
    const out = calculateLinkSeal({
      unitSystem: "imperial",
      nps: "4",
      pipeOd: 4.5,
      openingType: "steel_sleeve",
      sleeveId: 7.48,
      hardware: "C",
    });
    expect(out.rows.find((r) => r.label.includes("Pressure rating"))?.value).toMatch(
      /20 psig/,
    );
    expectNoPoison(out);
  });

  it("warns when annular space is outside 12–85 mm", () => {
    const tight = computeLinkSeal({
      unitSystem: "metric",
      nps: "",
      pipeOd: 114.3,
      openingType: "core_drilled",
      sleeveId: 120,
      hardware: "C",
    });
    expect(tight.annularClearanceMm).toBeCloseTo(2.85, 2);
    expect(tight.outOfRange).toBe(true);
    expect(tight.model).toBeNull();

    const out = calculateLinkSeal({
      unitSystem: "metric",
      nps: "",
      pipeOd: 114.3,
      openingType: "core_drilled",
      sleeveId: 120,
      hardware: "S316",
    });
    expect(out.heroStatusLevel).toBe("fail");
    expect(out.callouts?.some((c) => c.tone === "warn")).toBe(true);
    expectNoPoison(out);
  });

  it("formats imperial OD/sleeve to 3 decimal inches", () => {
    const out = calculateLinkSeal({
      unitSystem: "imperial",
      nps: "4",
      pipeOd: 4.5,
      openingType: "steel_sleeve",
      sleeveId: 7.48,
      hardware: "T",
    });
    expect(out.heroValue).toMatch(/LS-400-T/);
    expect(out.rows.find((r) => r.label.includes("Pipe outside"))?.value).toMatch(
      /4\.500 in/,
    );
    expectNoPoison(out);
  });

  it("flags oversized annulus and recommends OD-class Ideal sleeve (not LS-575)", () => {
    const r = computeLinkSeal({
      unitSystem: "metric",
      nps: "1.25",
      pipeOd: 42.16,
      openingType: "core_drilled",
      sleeveId: 190,
      hardware: "T",
    });
    expect(r.model).toBeNull();
    expect(r.oversizedAnnulus).toBe(true);
    expect(r.nearestModel?.id).toBe("LS-300");
    expect(r.recommendedSleeveIdMm).toBeCloseTo(78.2, 1);

    const out = calculateLinkSeal({
      unitSystem: "metric",
      nps: "1.25",
      pipeOd: 42.16,
      openingType: "core_drilled",
      sleeveId: 190,
      hardware: "T",
    });
    expect(out.heroValue).toBe("Resize sleeve → LS-300");
    expect(out.heroStatusLevel).toBe("fail");
    expect(out.rows.find((row) => row.label === "Ideal minimum sleeve ID")?.value).toContain(
      "78.2",
    );
    expectNoPoison(out);
  });
});

describe("pSEO reference pages", () => {
  it("covers every published calculator with formula, table, how-to, and FAQ", async () => {
    const { getLocalPublishedCalculators } = await import(
      "@/lib/calculators/local-seed"
    );
    const { getCalculatorSeo } = await import("../data/calculatorSeoData");
    const published = getLocalPublishedCalculators();
    expect(published.length).toBe(16);
    for (const calculator of published) {
      const seo = getCalculatorSeo(calculator.slug);
      expect(seo, calculator.slug).toBeDefined();
      expect(seo?.faq.length).toBeGreaterThanOrEqual(3);
      expect(seo?.howToSteps.length).toBeGreaterThanOrEqual(3);
      expect(seo?.tableRows.length).toBeGreaterThanOrEqual(5);
      expect(seo?.variables.length).toBeGreaterThan(0);
    }
  });
});
