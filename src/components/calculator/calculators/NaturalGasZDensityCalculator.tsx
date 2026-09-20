"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateNaturalGasZDensity,
  DEFAULT_NATURAL_GAS_Z_DENSITY_INPUTS,
  IMPURITY_RANGE,
  PRESSURE_RANGE,
  PRESSURE_RANGE_PSIA,
  SG_RANGE,
  TEMP_RANGE_C,
  TEMP_RANGE_F,
  type NaturalGasZDensityInputs,
} from "@/lib/calculators/engines/natural-gas-z-density";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { NATURAL_GAS_Z_DENSITY_URL_CONFIG } from "@/lib/calculators/url-configs/natural-gas-z-density";

type Props = { title: string; standard?: string };

type DraftKey =
  | "pressure"
  | "temperature"
  | "specificGravity"
  | "co2MolePercent"
  | "n2MolePercent";

function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function NaturalGasZDensityCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField } = useCalculatorUrlSync<NaturalGasZDensityInputs>(
    DEFAULT_NATURAL_GAS_Z_DENSITY_INPUTS,
    NATURAL_GAS_Z_DENSITY_URL_CONFIG,
    { type: "natural-gas-z-density" },
  );

  const [drafts, setDrafts] = useState<Partial<Record<DraftKey, string>>>({});

  useEffect(() => {
    setDrafts({});
  }, [inputs.unitSystem]);

  const output = useMemo(
    () => calculateNaturalGasZDensity(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const pUnit = imperial ? "psia" : "bar abs";
  const tUnit = imperial ? "°F" : "°C";
  const tRange = imperial ? TEMP_RANGE_F : TEMP_RANGE_C;
  const pRange = imperial ? PRESSURE_RANGE_PSIA : PRESSURE_RANGE;
  const pHint = imperial
    ? `Absolute · ${PRESSURE_RANGE_PSIA.min}–${PRESSURE_RANGE_PSIA.max} psia`
    : `Absolute · ${PRESSURE_RANGE.min}–${PRESSURE_RANGE.max} bar abs (not gauge)`;
  const tHint = imperial
    ? `Range ${TEMP_RANGE_F.min}–${TEMP_RANGE_F.max} °F`
    : `Range ${TEMP_RANGE_C.min}–${TEMP_RANGE_C.max} °C`;

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
        {
          label: "P",
          value: `${inputs.pressure} ${pUnit}`,
        },
        {
          label: "T",
          value: `${inputs.temperature} ${tUnit}`,
        },
        {
          label: "SG",
          value: String(inputs.specificGravity),
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Absolute pressure"
              unit={pUnit}
              compactUnit
              value={display("pressure")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("pressure", v, pRange.min, pRange.max)
              }
              onBlur={() => onNumBlur("pressure", pRange.min, pRange.max)}
              hint={pHint}
              chips={
                imperial
                  ? [
                      { label: "145", value: "145" },
                      { label: "435", value: "435" },
                      { label: "725", value: "725" },
                      { label: "1160", value: "1160" },
                    ]
                  : [
                      { label: "10", value: "10" },
                      { label: "30", value: "30" },
                      { label: "50", value: "50" },
                      { label: "80", value: "80" },
                    ]
              }
            />
            <FieldGroup
              label="Temperature"
              unit={tUnit}
              compactUnit
              value={display("temperature")}
              onChange={(v) =>
                onNumChange("temperature", v, tRange.min, tRange.max)
              }
              onBlur={() => onNumBlur("temperature", tRange.min, tRange.max)}
              hint={tHint}
              chips={
                imperial
                  ? [
                      { label: "59", value: "59" },
                      { label: "77", value: "77" },
                      { label: "104", value: "104" },
                      { label: "122", value: "122" },
                    ]
                  : [
                      { label: "15", value: "15" },
                      { label: "25", value: "25" },
                      { label: "40", value: "40" },
                      { label: "50", value: "50" },
                    ]
              }
            />
          </div>

          <FieldGroup
            label="Specific gravity SG"
            value={display("specificGravity")}
            allowZero={false}
            onChange={(v) =>
              onNumChange(
                "specificGravity",
                v,
                SG_RANGE.min,
                SG_RANGE.max,
              )
            }
            onBlur={() =>
              onNumBlur("specificGravity", SG_RANGE.min, SG_RANGE.max)
            }
            hint="Relative to air (1.0) · lean NG ≈ 0.55–0.70"
            chips={[
              { label: "0.55", value: "0.55" },
              { label: "0.60", value: "0.60" },
              { label: "0.65", value: "0.65" },
              { label: "0.70", value: "0.70" },
            ]}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="CO₂ mole %"
              unit="%"
              compactUnit
              value={display("co2MolePercent")}
              onChange={(v) =>
                onNumChange(
                  "co2MolePercent",
                  v,
                  IMPURITY_RANGE.min,
                  IMPURITY_RANGE.max,
                )
              }
              onBlur={() =>
                onNumBlur(
                  "co2MolePercent",
                  IMPURITY_RANGE.min,
                  IMPURITY_RANGE.max,
                )
              }
              hint="Wichert–Aziz acid-gas correction"
            />
            <FieldGroup
              label="N₂ mole %"
              unit="%"
              compactUnit
              value={display("n2MolePercent")}
              onChange={(v) =>
                onNumChange(
                  "n2MolePercent",
                  v,
                  IMPURITY_RANGE.min,
                  IMPURITY_RANGE.max,
                )
              }
              onBlur={() =>
                onNumBlur(
                  "n2MolePercent",
                  IMPURITY_RANGE.min,
                  IMPURITY_RANGE.max,
                )
              }
              hint="Kay blend on pseudo-criticals"
            />
          </div>
        </div>
      }
    />
  );
}
