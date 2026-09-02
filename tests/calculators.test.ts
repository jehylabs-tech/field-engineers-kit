import { describe, expect, it } from "vitest";
import type { CalculatorOutput } from "@/lib/calculators/definitions";
import {
  calculateBlindFlange,
  getAllowableStressForMaterial,
  getRecommendedCommercialPlate,
  getStandardGasketContactDiameter,
  requiredBlindThicknessMm,
} from "@/lib/calculators/engines/blind-flange";
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
import { computePressureDrop } from "@/lib/calculators/engines/pressure-drop";
import { thermalExpansionDeltaLMm } from "@/lib/calculators/engines/thermal-expansion";
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
    expect(out.heroValue).toContain("6.020");
    expectNoPoison(out);
  });

  it("falls back for unknown NPS/schedule", () => {
    const out = calculatePipeSchedule({ unitSystem: "metric", nps: "99", schedule: "xx" });
    expect(out.heroValue).toBe("—");
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
    expect(out.rows.find((row) => row.label === "Total weight")?.value).toContain("96.42");
    expect(out.heroStatus).toContain("B36.10M");
    const doubled = calculatePipeSchedule({
      unitSystem: "metric",
      nps: "4",
      schedule: "40",
      length: 6,
      quantity: 2,
    });
    expect(doubled.rows.find((row) => row.label === "Total weight")?.value).toContain("192.84");
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
});

describe("03 Flange Dimension (ASME B16.5)", () => {
  it("matches NPS 4 Class 150 WN RF table values", () => {
    const out = calculateFlangeDimension({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "150",
    });
    expect(out.heroValue).toContain("22.50");
    expect(out.summary.find((row) => row.label === "Single flange weight")?.value).toContain(
      "10.00",
    );
    expect(out.rows.find((row) => row.label.includes("Flange OD"))?.value).toContain("228.600");
    expect(out.rows.find((row) => row.label.includes("Number of bolts"))?.value).toBe("8");
    expect(out.rows.find((row) => row.label.includes("hub bore"))?.value).toContain("102.260");
    expect(out.rows.find((row) => row.label.includes("Stud bolt"))?.value).toBe("5/8 in × 90 mm");
    expect(out.rows.find((row) => row.label.includes("wrench"))?.value).toBe("1-1/16 in (27 mm)");
    expect(out.rows.find((row) => row.label.includes("Mated pair"))?.value).toContain("22.50");
    expectNoPoison(out);
  });

  it("uses Sch 40 / STD pipe ID for WN hub bore and RF stud length by class", () => {
    const sch40 = calculateFlangeDimension({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "150",
    });
    expect(sch40.rows.find((row) => row.label.includes("hub bore"))?.value).toContain("102.260");
    expect(sch40.rows.find((row) => row.label === "Pipe schedule")).toBeUndefined();

    const cl600 = calculateFlangeDimension({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "600",
    });
    expect(cl600.rows.find((row) => row.label.includes("Stud bolt"))?.value).toBe("3/4 in × 115 mm");
    expect(cl600.rows.find((row) => row.label.includes("wrench"))?.value).toBe("1-1/4 in (32 mm)");
    expectNoPoison(sch40);
    expectNoPoison(cl600);
  });

  it("scales weight by flange type and enables RTJ ring + stud length from Class 300", () => {
    const so = calculateFlangeDimension({
      unitSystem: "metric",
      nps: "4",
      pressureClass: "150",
      flangeType: "so",
      facing: "rf",
    });
    expect(so.heroValue).toContain("16.50");
    expect(so.summary.find((row) => row.label === "Single flange weight")?.value).toContain(
      "7.00",
    );
    expect(so.rows.find((row) => row.label.includes("hub bore"))?.value).toContain("114.300");

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
    expect(out.heroValue).toContain("190.500");
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
      fluid: "liquid",
      flowRate: 50,
      inletPressure: 5,
      outletPressure: 5,
      specificGravity: 1,
      temperature: 25,
      requiredCv: 40,
    });
    expect(out.heroValue).toBe("—");
    expectNoPoison(out);
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
    // 4" 150# with 10.0 MPa (100 bar) -> exceeds 150# limit (~19.6 bar)
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
    expect(overPressure.heroStatus).toContain("WARNING: Pressure exceeds ASME B16.5 #150 Flange Rating limit");
  });

  it("recommends correct commercial plate in metric and imperial", () => {
    const metricRec = getRecommendedCommercialPlate(14.2, "metric");
    expect(metricRec.value).toBe(16);
    expect(metricRec.label).toBe("16 mm (16T Plate)");
    expect(metricRec.excess).toBe(1.8);

    const imperialRec = getRecommendedCommercialPlate(0.55, "imperial");
    expect(imperialRec.value).toBe(0.625);
    expect(imperialRec.unit).toBe("in");
  });

  it("maps ASME B16.5 RF gasket contact diameter", () => {
    const dNps6 = getStandardGasketContactDiameter("6", "300", "metric");
    expect(dNps6).toBe(215.9);

    const dNps2 = getStandardGasketContactDiameter("2", "150", "metric");
    expect(dNps2).toBeCloseTo(92, 0);
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
      }),
    ).toBe(0);
    const dL = thermalExpansionDeltaLMm({
      unitSystem: "metric",
      material: "cs",
      installTemp: -300,
      operatingTemp: 20,
      length: 10,
      nps: "4",
    });
    expect(Number.isFinite(dL)).toBe(true);
  });
});

describe("12 Darcy–Weisbach Pressure Drop", () => {
  it("matches independent Haaland ΔP for water, 100 m, 4 in Sch 40, 50 m³/h, no fittings", () => {
    const result = computePressureDrop({
      unitSystem: "metric",
      fluid: "water",
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
    const f = haalandFriction(re, 4.5e-5 / dM);
    const dpBar = (f * (100 / dM) * 0.5 * rho * v * v) / 1e5;

    nearly(result!.velocity, v);
    nearly(result!.frictionFactor, f);
    nearly(result!.dpBar, dpBar);
    expect(result!.dpBar).toBeGreaterThan(0.2);
    expect(result!.dpBar).toBeLessThan(0.35);
  });

  it("round-trips imperial GPM / ft to the same bar drop", () => {
    const metric = computePressureDrop({
      unitSystem: "metric",
      fluid: "water",
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
});

describe("13 Flow Velocity & API RP 14E", () => {
  it("computes v = Q/A and vc = C / √ρ with C in ft/s, ρ in lb/ft³", () => {
    const result = computeFlowVelocity({
      unitSystem: "metric",
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

describe("pSEO reference pages", () => {
  it("covers every published calculator with formula, table, how-to, and FAQ", async () => {
    const { getLocalPublishedCalculators } = await import(
      "@/lib/calculators/local-seed"
    );
    const { getCalculatorSeo } = await import("../data/calculatorSeoData");
    const published = getLocalPublishedCalculators();
    expect(published.length).toBe(15);
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
