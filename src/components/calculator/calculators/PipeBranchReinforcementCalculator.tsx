"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, {
  FieldSelect,
  fieldLabelHint,
} from "@/components/calculator/FieldGroup";
import PipeBranchReinforcementResultPanel from "@/components/calculator/calculators/PipeBranchReinforcementResultPanel";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import { useToast } from "@/components/ui/ToastProvider";
import {
  calculatePipeBranchReinforcement,
  convertPipeBranchReinforcementUnitSystem,
  listPipeBranchReinforcementNpsOptions,
  resolveBranchSchedule,
} from "@/lib/calculators/engines/pipe-branch-reinforcement";
import { isBranchNpsValid } from "@/lib/calculators/engines/pipe-coping";
import {
  DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS,
  PIPE_BRANCH_REINFORCEMENT_URL_CONFIG,
} from "@/lib/calculators/url-configs/pipe-branch-reinforcement";
import type { PipeBranchReinforcementInputs } from "@/lib/calculators/engines/pipe-branch-reinforcement";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { listScheduleOptionsForNps } from "@/lib/data/loaders";

type PipeBranchReinforcementCalculatorProps = {
  title: string;
  standard?: string;
};

function toNumber(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function PipeBranchReinforcementCalculator({
  title,
  standard,
}: PipeBranchReinforcementCalculatorProps) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<PipeBranchReinforcementInputs>(
      DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS,
      PIPE_BRANCH_REINFORCEMENT_URL_CONFIG,
      { type: "pipe-branch-reinforcement" },
    );
  const { showToast } = useToast();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const branchWarnRef = useRef("");
  const seededUnitSystemRef = useRef(inputs.unitSystem);
  const allowUnitConvertRef = useRef(false);

  useEffect(() => {
    function onUnits() {
      allowUnitConvertRef.current = true;
    }
    window.addEventListener("fek-units-change", onUnits);
    return () => window.removeEventListener("fek-units-change", onUnits);
  }, []);

  useEffect(() => {
    if (seededUnitSystemRef.current === inputs.unitSystem) return;
    const from = seededUnitSystemRef.current;
    const to = inputs.unitSystem;
    seededUnitSystemRef.current = to;

    // User toggled units → always convert.
    // Bare slug + global metric preference: unitSystem flips while duty
    // numbers are still the imperial defaults — convert once so labels
    // (bar / MPa / mm) match the values. Skip when URL/pSEO already
    // seeded metric (or imperial) duties that don't match defaults.
    const landedOnImperialDefaults =
      from === "imperial" &&
      to === "metric" &&
      inputs.designPressure ===
        DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS.designPressure &&
      inputs.allowStressHeader ===
        DEFAULT_PIPE_BRANCH_REINFORCEMENT_INPUTS.allowStressHeader;
    const shouldConvert =
      allowUnitConvertRef.current || landedOnImperialDefaults;
    allowUnitConvertRef.current = false;
    if (!shouldConvert) return;

    setInputs((current) =>
      convertPipeBranchReinforcementUnitSystem(
        { ...current, unitSystem: from },
        to,
      ),
    );
  }, [inputs.unitSystem, setInputs]);

  const npsOptions = useMemo(() => listPipeBranchReinforcementNpsOptions(), []);
  const headerSchOptions = useMemo(
    () => listScheduleOptionsForNps(inputs.headerNps),
    [inputs.headerNps],
  );
  const branchSchOptions = useMemo(
    () => listScheduleOptionsForNps(inputs.branchNps),
    [inputs.branchNps],
  );

  useEffect(() => {
    const resolved = resolveBranchSchedule(
      inputs.headerNps,
      inputs.headerSchedule,
    );
    if (resolved && resolved !== inputs.headerSchedule) {
      setField("headerSchedule", resolved);
    }
  }, [inputs.headerNps, inputs.headerSchedule, setField]);

  useEffect(() => {
    const resolved = resolveBranchSchedule(
      inputs.branchNps,
      inputs.branchSchedule,
    );
    if (resolved && resolved !== inputs.branchSchedule) {
      setField("branchSchedule", resolved);
    }
  }, [inputs.branchNps, inputs.branchSchedule, setField]);

  useEffect(() => {
    if (isBranchNpsValid(inputs.headerNps, inputs.branchNps)) {
      branchWarnRef.current = "";
      return;
    }
    const key = `${inputs.branchNps}>${inputs.headerNps}`;
    if (branchWarnRef.current === key) return;
    branchWarnRef.current = key;
    showToast("Branch NPS must be ≤ Header NPS — clamped to header size.");
    setInputs((current) => ({
      ...current,
      branchNps: current.headerNps,
      branchSchedule: resolveBranchSchedule(
        current.headerNps,
        current.branchSchedule,
      ),
    }));
  }, [inputs.branchNps, inputs.headerNps, setInputs, showToast]);

  const output = useMemo(
    () => calculatePipeBranchReinforcement(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const pressureUnit = inputs.unitSystem === "imperial" ? "psi" : "bar";
  const stressUnit = inputs.unitSystem === "imperial" ? "psi" : "MPa";
  const lenUnit = inputs.unitSystem === "imperial" ? "in" : "mm";
  const tempUnit = inputs.unitSystem === "imperial" ? "°F" : "°C";

  const pressureDisplay =
    inputs.unitSystem === "imperial"
      ? Math.round(inputs.designPressure)
      : Number(inputs.designPressure.toFixed(2));
  const stressDisplay = (value: number) =>
    inputs.unitSystem === "imperial" ? Math.round(value) : Number(value.toFixed(1));
  const lenDisplay = (value: number) =>
    inputs.unitSystem === "imperial"
      ? Number(value.toFixed(4))
      : Number(value.toFixed(2));

  const inputRows = [
    {
      label: "Header",
      value: `NPS ${inputs.headerNps}" Sch ${inputs.headerSchedule}`,
    },
    {
      label: "Branch",
      value: `NPS ${inputs.branchNps}" Sch ${inputs.branchSchedule}`,
    },
    {
      label: "Design pressure",
      value: `${pressureDisplay} ${pressureUnit}`,
    },
    { label: "Branch angle β", value: `${Math.round(inputs.branchAngle)}°` },
    { label: "Unit system", value: inputs.unitSystem },
  ];

  const advancedSummary = [
    `${Math.round(inputs.designTemp)}${tempUnit}`,
    `S_b=${stressDisplay(inputs.allowStressBranch)}`,
    `E=${inputs.jointEfficiency}`,
    `mill ${inputs.millTolerance}%`,
  ].join(" · ");

  return (
    <CalculatorBaseLayout
      layout="formula"
      resultDashboard
      inputNaturalHeight
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      resultPanel={
        <PipeBranchReinforcementResultPanel
          output={output}
          exportTitle={title}
          standard={standard}
          inputRows={inputRows}
        />
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Header & branch
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <FieldSelect
              label="Header NPS"
              value={inputs.headerNps}
              options={npsOptions}
              onChange={(value) => setField("headerNps", value)}
              hint={fieldLabelHint("Header NPS")}
            />
            <FieldSelect
              label="Header schedule"
              value={inputs.headerSchedule}
              options={headerSchOptions}
              onChange={(value) => setField("headerSchedule", value)}
              hint={fieldLabelHint("Pipe schedule")}
            />
            <FieldSelect
              label="Branch NPS"
              value={inputs.branchNps}
              options={npsOptions}
              onChange={(value) => setField("branchNps", value)}
              hint={fieldLabelHint("Branch NPS")}
            />
            <FieldSelect
              label="Branch schedule"
              value={inputs.branchSchedule}
              options={branchSchOptions}
              onChange={(value) => setField("branchSchedule", value)}
              hint={fieldLabelHint("Pipe schedule")}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FieldGroup
              label="Branch angle β"
              hint="ASME B31.3 Para. 304.3 equations apply for β = 45°–90°. 90° = standard tee."
              value={Math.round(inputs.branchAngle)}
              onChange={(value) => {
                const n = toNumber(value, inputs.branchAngle);
                setField("branchAngle", Math.min(90, Math.max(45, n)));
              }}
              unit="°"
            />
            <FieldGroup
              label="Design pressure (P)"
              hint="ASME B31.3 design pressure for t_h / t_b and A₁ area check."
              value={pressureDisplay}
              onChange={(value) =>
                setField(
                  "designPressure",
                  toNumber(value, inputs.designPressure),
                )
              }
              unit={pressureUnit}
              highlight="P"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FieldGroup
              label="Allowable stress (S_h)"
              hint="B31.3 Table A-1 style allowable at design temperature. Branch/pad S default in Advanced."
              value={stressDisplay(inputs.allowStressHeader)}
              onChange={(value) =>
                setField(
                  "allowStressHeader",
                  toNumber(value, inputs.allowStressHeader),
                )
              }
              unit={stressUnit}
            />
            <FieldGroup
              label="Corrosion allowance (c)"
              value={lenDisplay(inputs.corrosionAllowance)}
              onChange={(value) =>
                setField(
                  "corrosionAllowance",
                  toNumber(value, inputs.corrosionAllowance),
                )
              }
              unit={lenUnit}
              highlight="c"
            />
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 dark:border-slate-800/90 dark:bg-slate-900/30">
            <button
              type="button"
              onClick={() => setShowAdvanced((open) => !open)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-200/80 px-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  1.2
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Advanced (T, S_b/S_r, E·W·Y, welds)
                </span>
                {!showAdvanced ? (
                  <span className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {advancedSummary}
                  </span>
                ) : null}
              </div>
              <span className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {showAdvanced ? "▲ Hide" : "▼ Edit"}
              </span>
            </button>

            {showAdvanced ? (
              <div className="space-y-2.5 border-t border-slate-200/80 p-3.5 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <FieldGroup
                    label="Design temperature"
                    hint="Record / material selection only — enter S at design temperature separately."
                    value={Math.round(inputs.designTemp)}
                    onChange={(value) =>
                      setField(
                        "designTemp",
                        toNumber(value, inputs.designTemp),
                      )
                    }
                    unit={tempUnit}
                  />
                  <FieldGroup
                    label="Mill tolerance"
                    hint="Nominal wall reduced by mill % before A₂ / A₃ excess checks (default 12.5%)."
                    value={inputs.millTolerance}
                    onChange={(value) =>
                      setField(
                        "millTolerance",
                        toNumber(value, inputs.millTolerance),
                      )
                    }
                    unit="%"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FieldGroup
                    label="Allowable stress — branch (S_b)"
                    value={stressDisplay(inputs.allowStressBranch)}
                    onChange={(value) =>
                      setField(
                        "allowStressBranch",
                        toNumber(value, inputs.allowStressBranch),
                      )
                    }
                    unit={stressUnit}
                  />
                  <FieldGroup
                    label="Allowable stress — pad (S_r)"
                    hint="If S_r < S_h, required pad metal area is increased by S_h/S_r."
                    value={stressDisplay(inputs.allowStressPad)}
                    onChange={(value) =>
                      setField(
                        "allowStressPad",
                        toNumber(value, inputs.allowStressPad),
                      )
                    }
                    unit={stressUnit}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <FieldGroup
                    label="Joint efficiency (E)"
                    value={inputs.jointEfficiency}
                    onChange={(value) =>
                      setField(
                        "jointEfficiency",
                        toNumber(value, inputs.jointEfficiency),
                      )
                    }
                    highlight="E"
                  />
                  <FieldGroup
                    label="Weld factor (W)"
                    hint="Included in t = PD / (2(SEW + PY))."
                    value={inputs.weldW}
                    onChange={(value) =>
                      setField("weldW", toNumber(value, inputs.weldW))
                    }
                    highlight="W"
                  />
                  <FieldGroup
                    label="Coefficient Y"
                    hint="Ferritic steels ≤ 900 °F typically use Y = 0.4."
                    value={inputs.yFactor}
                    onChange={(value) =>
                      setField("yFactor", toNumber(value, inputs.yFactor))
                    }
                    highlight="Y"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FieldGroup
                    label="Fillet weld leg — header"
                    hint="A₄ screening uses leg_h² + leg_b² fillet area approximation."
                    value={lenDisplay(inputs.weldLegHeader)}
                    onChange={(value) =>
                      setField(
                        "weldLegHeader",
                        toNumber(value, inputs.weldLegHeader),
                      )
                    }
                    unit={lenUnit}
                  />
                  <FieldGroup
                    label="Fillet weld leg — branch"
                    value={lenDisplay(inputs.weldLegBranch)}
                    onChange={(value) =>
                      setField(
                        "weldLegBranch",
                        toNumber(value, inputs.weldLegBranch),
                      )
                    }
                    unit={lenUnit}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
