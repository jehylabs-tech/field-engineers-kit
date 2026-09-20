"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateControlValveChoked,
  DEFAULT_CONTROL_VALVE_CHOKED_INPUTS,
  FL_RANGE,
  K_RANGE,
  PRESSURE_RANGE,
  XT_RANGE,
  type ChokedFluidState,
  type ControlValveChokedInputs,
} from "@/lib/calculators/engines/control-valve-choked-screening";
import {
  getIsaValveTrimPreset,
  ISA_VALVE_TRIM_PRESETS,
  WATER_CRITICAL_PRESSURE_BAR_ABS,
  WATER_VAPOR_PRESSURE_25C_BAR_ABS,
  type IsaValveTrimKind,
} from "@/lib/calculators/data/isaValveTrimData";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { CONTROL_VALVE_CHOKED_URL_CONFIG } from "@/lib/calculators/url-configs/control-valve-choked-screening";
import { barToPsi } from "@/lib/unitConverter";

type Props = { title: string; standard?: string };

type DraftKey =
  | "p1"
  | "p2"
  | "xtFactor"
  | "flFactor"
  | "specificHeatRatio"
  | "vaporPressure"
  | "criticalPressure";

function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function nearly(a: number, b: number, tol = 0.006): boolean {
  return Math.abs(a - b) <= tol;
}

export default function ControlValveChokedScreeningCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<ControlValveChokedInputs>(
      DEFAULT_CONTROL_VALVE_CHOKED_INPUTS,
      CONTROL_VALVE_CHOKED_URL_CONFIG,
      { type: "control-valve-choked-screening" },
    );

  const [drafts, setDrafts] = useState<Partial<Record<DraftKey, string>>>({});

  useEffect(() => {
    setDrafts({});
  }, [inputs.unitSystem, inputs.fluidState]);

  // Keep trim dropdown honest: manual x_T / F_L edits → Custom.
  useEffect(() => {
    const id = inputs.trimPreset ?? "custom";
    if (id === "custom") return;
    const preset = getIsaValveTrimPreset(id);
    if (
      !nearly(inputs.xtFactor, preset.xt) ||
      !nearly(inputs.flFactor, preset.fl)
    ) {
      setField("trimPreset", "custom");
    }
  }, [inputs.xtFactor, inputs.flFactor, inputs.trimPreset, setField]);

  const output = useMemo(
    () => calculateControlValveChoked(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const pUnit = imperial ? "psia" : "bar abs";
  const isGas = inputs.fluidState === "gas";

  function display(key: DraftKey): string {
    return drafts[key] ?? String(inputs[key]);
  }

  function onNumChange(key: DraftKey, raw: string, min: number, max: number) {
    setDrafts((prev) => ({ ...prev, [key]: raw }));
    const parsed = parseDraft(raw);
    if (parsed != null) {
      setField(key, Math.min(max, Math.max(min, parsed)));
    }
  }

  function onNumBlur(key: DraftKey, min: number, max: number) {
    setDrafts((prev) => {
      const raw = prev[key];
      if (raw !== undefined) {
        const parsed = parseDraft(raw);
        if (parsed != null) {
          setField(key, Math.min(max, Math.max(min, parsed)));
        }
      }
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function applyTrim(id: IsaValveTrimKind) {
    const preset = getIsaValveTrimPreset(id);
    setInputs((prev) => ({
      ...prev,
      trimPreset: id,
      xtFactor: preset.xt,
      flFactor: preset.fl,
    }));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next.xtFactor;
      delete next.flFactor;
      return next;
    });
  }

  const waterPv = imperial
    ? Number(barToPsi(WATER_VAPOR_PRESSURE_25C_BAR_ABS).toFixed(3))
    : WATER_VAPOR_PRESSURE_25C_BAR_ABS;
  const waterPc = imperial
    ? Number(barToPsi(WATER_CRITICAL_PRESSURE_BAR_ABS).toFixed(1))
    : WATER_CRITICAL_PRESSURE_BAR_ABS;

  const trimId = inputs.trimPreset ?? "custom";

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputNaturalHeight
      inputRows={[
        {
          label: "Fluid",
          value: isGas ? "Gas / vapor" : "Liquid",
        },
        {
          label: "P1 / P2",
          value: `${inputs.p1} / ${inputs.p2} ${pUnit}`,
        },
        {
          label: isGas ? "x_T" : "F_L",
          value: isGas ? String(inputs.xtFactor) : String(inputs.flFactor),
        },
        {
          label: isGas ? "k" : "P_v",
          value: isGas
            ? String(inputs.specificHeatRatio)
            : `${inputs.vaporPressure} ${pUnit}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSelect
              label="Fluid state"
              value={inputs.fluidState}
              options={[
                { value: "gas", label: "Gas / vapor (x_T choke)" },
                { value: "liquid", label: "Liquid (F_L cavitation)" },
              ]}
              onChange={(value) =>
                setField("fluidState", value as ChokedFluidState)
              }
              hint="ISA-75.01.01 §5 choked / cavitation limits"
            />
            <FieldSelect
              label="Trim preset (typical)"
              value={trimId}
              options={ISA_VALVE_TRIM_PRESETS.map((p) => ({
                value: p.id,
                label: p.label,
              }))}
              onChange={(value) => applyTrim(value as IsaValveTrimKind)}
              hint="Typical x_T / F_L — prefer manufacturer data when known"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Upstream P1 (absolute)"
              unit={pUnit}
              compactUnit
              value={display("p1")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("p1", v, PRESSURE_RANGE.min, PRESSURE_RANGE.max)
              }
              onBlur={() =>
                onNumBlur("p1", PRESSURE_RANGE.min, PRESSURE_RANGE.max)
              }
              hint="Absolute — convert gauge by adding atmosphere"
              chips={
                imperial
                  ? [
                      { label: "58", value: "58" },
                      { label: "145", value: "145" },
                      { label: "290", value: "290" },
                    ]
                  : [
                      { label: "4", value: "4" },
                      { label: "10", value: "10" },
                      { label: "20", value: "20" },
                    ]
              }
            />
            <FieldGroup
              label="Downstream P2 (absolute)"
              unit={pUnit}
              compactUnit
              value={display("p2")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("p2", v, PRESSURE_RANGE.min, PRESSURE_RANGE.max)
              }
              onBlur={() =>
                onNumBlur("p2", PRESSURE_RANGE.min, PRESSURE_RANGE.max)
              }
              hint="Must be less than P1"
              chips={
                imperial
                  ? [
                      { label: "14.7", value: "14.7" },
                      { label: "29", value: "29" },
                      { label: "58", value: "58" },
                    ]
                  : [
                      { label: "1", value: "1" },
                      { label: "2", value: "2" },
                      { label: "4", value: "4" },
                    ]
              }
            />
          </div>

          {isGas ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldGroup
                label="Valve x_T factor"
                value={display("xtFactor")}
                allowZero={false}
                onChange={(v) =>
                  onNumChange("xtFactor", v, XT_RANGE.min, XT_RANGE.max)
                }
                onBlur={() => onNumBlur("xtFactor", XT_RANGE.min, XT_RANGE.max)}
                hint="Without fittings · typ. 0.20–0.80"
                chips={[
                  { label: "0.50", value: "0.50" },
                  { label: "0.70", value: "0.70" },
                  { label: "0.75", value: "0.75" },
                ]}
              />
              <FieldGroup
                label="Specific heat ratio k"
                value={display("specificHeatRatio")}
                allowZero={false}
                onChange={(v) =>
                  onNumChange(
                    "specificHeatRatio",
                    v,
                    K_RANGE.min,
                    K_RANGE.max,
                  )
                }
                onBlur={() =>
                  onNumBlur("specificHeatRatio", K_RANGE.min, K_RANGE.max)
                }
                hint="F_k = k/1.40 · air 1.40 · steam ≈ 1.30"
                chips={[
                  { label: "Air", value: "1.40" },
                  { label: "Steam", value: "1.30" },
                  { label: "CO₂", value: "1.28" },
                ]}
              />
            </div>
          ) : (
            <>
              <FieldGroup
                label="Valve F_L factor"
                value={display("flFactor")}
                allowZero={false}
                onChange={(v) =>
                  onNumChange("flFactor", v, FL_RANGE.min, FL_RANGE.max)
                }
                onBlur={() => onNumBlur("flFactor", FL_RANGE.min, FL_RANGE.max)}
                hint="Liquid pressure recovery · typ. 0.50–0.95"
                chips={[
                  { label: "0.85", value: "0.85" },
                  { label: "0.90", value: "0.90" },
                  { label: "0.95", value: "0.95" },
                ]}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldGroup
                  label="Vapor pressure P_v"
                  unit={pUnit}
                  compactUnit
                  value={display("vaporPressure")}
                  allowZero
                  onChange={(v) =>
                    onNumChange("vaporPressure", v, 0, PRESSURE_RANGE.max)
                  }
                  onBlur={() =>
                    onNumBlur("vaporPressure", 0, PRESSURE_RANGE.max)
                  }
                  hint="At inlet temperature"
                  chips={[
                    {
                      label: imperial ? "Water 77°F" : "Water 25°C",
                      value: String(waterPv),
                    },
                  ]}
                />
                <FieldGroup
                  label="Critical pressure P_c"
                  unit={pUnit}
                  compactUnit
                  value={display("criticalPressure")}
                  allowZero={false}
                  onChange={(v) =>
                    onNumChange(
                      "criticalPressure",
                      v,
                      PRESSURE_RANGE.min,
                      PRESSURE_RANGE.max,
                    )
                  }
                  onBlur={() =>
                    onNumBlur(
                      "criticalPressure",
                      PRESSURE_RANGE.min,
                      PRESSURE_RANGE.max,
                    )
                  }
                  hint="Used in r_c = 0.96 − 0.28√(Pv/Pc)"
                  chips={[
                    {
                      label: "Water",
                      value: String(waterPc),
                    },
                  ]}
                />
              </div>
            </>
          )}
        </div>
      }
    />
  );
}
