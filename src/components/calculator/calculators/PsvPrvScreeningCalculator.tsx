"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  CAPACITY_RANGE,
  calculatePsvPrvScreening,
  DEFAULT_PSV_PRV_INPUTS,
  K_RANGE,
  MW_RANGE,
  OVERPRESSURE_RANGE,
  SET_PRESSURE_RANGE,
  SG_RANGE,
  TEMP_RANGE_C,
  TEMP_RANGE_F,
  type PsvFluidType,
  type PsvPrvScreeningInputs,
} from "@/lib/calculators/engines/psv-prv-screening";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { PSV_PRV_URL_CONFIG } from "@/lib/calculators/url-configs/psv-prv-screening";

type Props = { title: string; standard?: string };

type DraftKey =
  | "setPressure"
  | "requiredCapacity"
  | "overpressurePercent"
  | "molecularWeight"
  | "relievingTemperature"
  | "liquidDensity"
  | "specificHeatRatio";

function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function PsvPrvScreeningCalculator({ title, standard }: Props) {
  const { inputs, setField } = useCalculatorUrlSync<PsvPrvScreeningInputs>(
    DEFAULT_PSV_PRV_INPUTS,
    PSV_PRV_URL_CONFIG,
    { type: "psv-prv-screening" },
  );

  const [drafts, setDrafts] = useState<Partial<Record<DraftKey, string>>>({});

  useEffect(() => {
    setDrafts({});
  }, [inputs.unitSystem, inputs.fluidType]);

  const output = useMemo(() => calculatePsvPrvScreening(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const isGas = inputs.fluidType === "gas";
  const pUnit = imperial ? "psig" : "bar g";
  const capUnit = isGas
    ? imperial
      ? "lb/h"
      : "kg/h"
    : imperial
      ? "GPM"
      : "L/min";
  const tUnit = imperial ? "°F" : "°C";
  const tRange = imperial ? TEMP_RANGE_F : TEMP_RANGE_C;

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

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputNaturalHeight
      inputRows={[
        { label: "Fluid", value: isGas ? "Gas / vapor" : "Liquid" },
        {
          label: "P_set",
          value: `${inputs.setPressure} ${pUnit}`,
        },
        {
          label: isGas ? "W" : "Q",
          value: `${inputs.requiredCapacity} ${capUnit}`,
        },
        {
          label: "Overpressure",
          value: `${inputs.overpressurePercent}%`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSelect
              label="Fluid"
              value={inputs.fluidType}
              options={[
                { value: "gas", label: "Gas / vapor (API 520 §5.2)" },
                { value: "liquid", label: "Liquid (API 520 §5.6)" },
              ]}
              onChange={(v) => setField("fluidType", v as PsvFluidType)}
              hint="Critical gas vapor or non-viscous liquid screening"
            />
            <FieldGroup
              label="Overpressure"
              unit="%"
              compactUnit
              value={display("overpressurePercent")}
              allowZero={false}
              onChange={(v) =>
                onNumChange(
                  "overpressurePercent",
                  v,
                  OVERPRESSURE_RANGE.min,
                  OVERPRESSURE_RANGE.max,
                )
              }
              onBlur={() =>
                onNumBlur(
                  "overpressurePercent",
                  OVERPRESSURE_RANGE.min,
                  OVERPRESSURE_RANGE.max,
                )
              }
              hint="10% non-fire · 21% fire (ASME VIII)"
              chips={[
                { label: "10%", value: "10" },
                { label: "16%", value: "16" },
                { label: "21%", value: "21" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Set pressure P_set"
              unit={pUnit}
              compactUnit
              value={display("setPressure")}
              allowZero={false}
              onChange={(v) =>
                onNumChange(
                  "setPressure",
                  v,
                  SET_PRESSURE_RANGE.min,
                  SET_PRESSURE_RANGE.max,
                )
              }
              onBlur={() =>
                onNumBlur(
                  "setPressure",
                  SET_PRESSURE_RANGE.min,
                  SET_PRESSURE_RANGE.max,
                )
              }
              hint="Gauge set pressure"
              chips={
                imperial
                  ? [
                      { label: "75", value: "75" },
                      { label: "150", value: "150" },
                      { label: "300", value: "300" },
                    ]
                  : [
                      { label: "5", value: "5" },
                      { label: "10", value: "10" },
                      { label: "20", value: "20" },
                    ]
              }
            />
            <FieldGroup
              label={isGas ? "Required mass flow W" : "Required volume flow Q"}
              unit={capUnit}
              compactUnit
              value={display("requiredCapacity")}
              allowZero={false}
              onChange={(v) =>
                onNumChange(
                  "requiredCapacity",
                  v,
                  CAPACITY_RANGE.min,
                  CAPACITY_RANGE.max,
                )
              }
              onBlur={() =>
                onNumBlur(
                  "requiredCapacity",
                  CAPACITY_RANGE.min,
                  CAPACITY_RANGE.max,
                )
              }
              hint={isGas ? "Relieving mass rate" : "Relieving liquid rate"}
            />
          </div>

          {isGas ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FieldGroup
                label="Molecular weight M"
                value={display("molecularWeight")}
                allowZero={false}
                onChange={(v) =>
                  onNumChange("molecularWeight", v, MW_RANGE.min, MW_RANGE.max)
                }
                onBlur={() =>
                  onNumBlur("molecularWeight", MW_RANGE.min, MW_RANGE.max)
                }
                hint="Air ≈ 28.97"
                chips={[
                  { label: "Air", value: "28.97" },
                  { label: "N₂", value: "28.01" },
                  { label: "Steam", value: "18.02" },
                ]}
              />
              <FieldGroup
                label="Relieving temperature"
                unit={tUnit}
                compactUnit
                value={display("relievingTemperature")}
                onChange={(v) =>
                  onNumChange(
                    "relievingTemperature",
                    v,
                    tRange.min,
                    tRange.max,
                  )
                }
                onBlur={() =>
                  onNumBlur("relievingTemperature", tRange.min, tRange.max)
                }
                hint="Inlet relieving temperature"
              />
              <FieldGroup
                label="k = Cp/Cv"
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
                hint="Sets API 520 C · air 1.40"
                chips={[
                  { label: "1.40", value: "1.40" },
                  { label: "1.30", value: "1.30" },
                ]}
              />
            </div>
          ) : (
            <FieldGroup
              label="Specific gravity G"
              value={display("liquidDensity")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("liquidDensity", v, SG_RANGE.min, SG_RANGE.max)
              }
              onBlur={() =>
                onNumBlur("liquidDensity", SG_RANGE.min, SG_RANGE.max)
              }
              hint="Water = 1.0 · relative to water at 60°F / 15°C"
              chips={[
                { label: "0.8", value: "0.8" },
                { label: "1.0", value: "1.0" },
                { label: "1.2", value: "1.2" },
              ]}
            />
          )}
        </div>
      }
    />
  );
}
