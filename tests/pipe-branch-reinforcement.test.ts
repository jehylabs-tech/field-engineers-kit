import { describe, expect, it } from "vitest";
import {
  calculatePipeBranchReinforcement,
  computePipeBranchReinforcement,
  convertPipeBranchReinforcementUnitSystem,
  DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS,
  DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS_METRIC,
} from "@/lib/calculators/engines/pipe-branch-reinforcement";
import { parsePipeBranchReinforcementSpec as parseSpec } from "@/lib/calculators/pseo/pipe-branch-reinforcement-routes";

const CASE1 = {
  ...DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS,
  headerNps: "10",
  headerSchedule: "40",
  branchNps: "6",
  branchSchedule: "40",
  designPressure: 500,
};

const CASE2 = {
  ...DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS,
  headerNps: "16",
  headerSchedule: "40",
  branchNps: "10",
  branchSchedule: "40",
  designPressure: 800,
};

describe("pipe-branch-reinforcement engine", () => {
  it("case1 — 10 STD / 6 STD / 500 psi: adequate without pad", () => {
    const calc = computePipeBranchReinforcement(CASE1);
    expect(calc).not.toBeNull();
    expect(calc!.deltaA).toBeGreaterThan(0);
    expect(calc!.AReqPad).toBe(0);
    expect(calc!.padRequired).toBe(false);

    const output = calculatePipeBranchReinforcement(CASE1);
    expect(output.heroStatusLevel).toBe("pass");
    expect(output.heroStatus).toContain("Adequate without Pad");
    expect(output.callouts ?? []).toHaveLength(0);
    expect(output.summary).toHaveLength(4);
    expect(output.rows.every((row) => row.section === "Calculation basis")).toBe(
      true,
    );
    expect(output.rows.length).toBeLessThanOrEqual(8);
  });

  it("case2 — 16 STD / 10 STD / 800 psi: pad required", () => {
    const calc = computePipeBranchReinforcement(CASE2);
    expect(calc).not.toBeNull();
    expect(calc!.deltaA).toBeLessThan(0);
    expect(calc!.AReqPad).toBeGreaterThan(1e-6);
    expect(calc!.padRequired).toBe(true);

    const output = calculatePipeBranchReinforcement(CASE2);
    expect(output.heroStatusLevel).toBe("warn");
    expect(output.heroStatus).toContain("Pad Required");
  });

  it("rejects branch NPS larger than header", () => {
    const calc = computePipeBranchReinforcement({
      ...CASE1,
      headerNps: "6",
      branchNps: "10",
    });
    expect(calc?.valid).toBe(false);
    expect(calc?.warn).toContain("Branch NPS");
  });

  it("converts imperial ↔ metric duty fields", () => {
    const metric = convertPipeBranchReinforcementUnitSystem(CASE1, "metric");
    expect(metric.unitSystem).toBe("metric");
    expect(metric.designPressure).toBeCloseTo(34.47, 0);
    expect(metric.allowStressHeader).toBeCloseTo(137.9, 0);
    expect(metric.corrosionAllowance).toBeCloseTo(1.5875, 2);

    const back = convertPipeBranchReinforcementUnitSystem(metric, "imperial");
    expect(back.designPressure).toBeCloseTo(500, 0);
    expect(back.allowStressHeader).toBeCloseTo(20000, 0);
  });

  it("metric featured duties match pad / no-pad expectation", () => {
    const adequate = computePipeBranchReinforcement({
      ...DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS_METRIC,
      designPressure: 35,
    });
    expect(adequate?.padRequired).toBe(false);

    const pad = computePipeBranchReinforcement({
      ...DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS_METRIC,
      headerNps: "16",
      branchNps: "10",
      designPressure: 55,
    });
    expect(pad?.padRequired).toBe(true);
  });

  it("parses featured pSEO specs", () => {
    const imperial = parseSpec("10inch-std-6inch-std-500psi");
    expect(imperial?.hnps).toBe("10");
    expect(imperial?.bnps).toBe("6");
    expect(imperial?.pressure).toBe("500");
    expect(imperial?.units).toBe("imperial");
    expect(imperial?.sh).toBe("20000");

    const metric = parseSpec("250a-std-150a-std-35bar");
    expect(metric?.hnps).toBe("10");
    expect(metric?.bnps).toBe("6");
    expect(metric?.pressure).toBe("35");
    expect(metric?.units).toBe("metric");
    expect(metric?.sh).toBe("138");
  });
});
