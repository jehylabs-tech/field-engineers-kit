"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateSteamPropertiesIapws,
  DEFAULT_STEAM_PROPERTIES_IAPWS_INPUTS,
  STEAM_PRESSURE_RANGE_BAR,
  STEAM_PRESSURE_RANGE_PSI,
  STEAM_QUALITY_RANGE,
  STEAM_TEMP_RANGE_C,
  STEAM_TEMP_RANGE_F,
  type SteamInputMode,
  type SteamPropertiesIapwsInputs,
} from "@/lib/calculators/engines/steam-properties-iapws";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { STEAM_PROPERTIES_IAPWS_URL_CONFIG } from "@/lib/calculators/url-configs/steam-properties-iapws";

type Props = { title: string; standard?: string };

type DraftKey = "pressure" | "temperature" | "steamQuality";

function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const MODE_OPTIONS: { value: SteamInputMode; label: string }[] = [
  { value: "saturation", label: "Saturation (Tsat · quality x)" },
  { value: "superheated", label: "Superheated (T ≥ Tsat)" },
];

export default function SteamPropertiesIapwsCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField } =
    useCalculatorUrlSync<SteamPropertiesIapwsInputs>(
      DEFAULT_STEAM_PROPERTIES_IAPWS_INPUTS,
      STEAM_PROPERTIES_IAPWS_URL_CONFIG,
      { type: "steam-properties-iapws" },
    );

  const [drafts, setDrafts] = useState<Partial<Record<DraftKey, string>>>({});

  useEffect(() => {
    setDrafts({});
  }, [inputs.unitSystem, inputs.inputMode]);

  const output = useMemo(
    () => calculateSteamPropertiesIapws(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const pressureUnit = imperial ? "psi" : "bar";
  const tempUnit = imperial ? "°F" : "°C";
  const saturation = inputs.inputMode === "saturation";

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

  const pMin = imperial
    ? STEAM_PRESSURE_RANGE_PSI.min
    : STEAM_PRESSURE_RANGE_BAR.min;
  const pMax = imperial
    ? STEAM_PRESSURE_RANGE_PSI.max
    : STEAM_PRESSURE_RANGE_BAR.max;
  const tMin = imperial ? STEAM_TEMP_RANGE_F.min : STEAM_TEMP_RANGE_C.min;
  const tMax = imperial ? STEAM_TEMP_RANGE_F.max : STEAM_TEMP_RANGE_C.max;

  const pressureChips = imperial
    ? [
        { label: "15 psi", value: "15" },
        { label: "100", value: "100" },
        { label: "145", value: "145" },
        { label: "290", value: "290" },
      ]
    : [
        { label: "3 bar", value: "3" },
        { label: "10", value: "10" },
        { label: "15", value: "15" },
        { label: "20", value: "20" },
      ];

  const tempChips = imperial
    ? [
        { label: "392 °F", value: "392" },
        { label: "482", value: "482" },
        { label: "572", value: "572" },
        { label: "752", value: "752" },
      ]
    : [
        { label: "200 °C", value: "200" },
        { label: "250", value: "250" },
        { label: "300", value: "300" },
        { label: "400", value: "400" },
      ];

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputNaturalHeight
      inputRows={[
        {
          label: "Pressure",
          value: `${inputs.pressure} ${pressureUnit} abs`,
        },
        {
          label: "Mode",
          value: saturation ? "Saturation" : "Superheated",
        },
        saturation
          ? {
              label: "Quality x",
              value: String(inputs.steamQuality),
            }
          : {
              label: "Temperature",
              value: `${inputs.temperature} ${tempUnit}`,
            },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Absolute pressure"
              unit={pressureUnit}
              compactUnit
              value={display("pressure")}
              allowZero={false}
              onChange={(v) => onNumChange("pressure", v, pMin, pMax)}
              onBlur={() => onNumBlur("pressure", pMin, pMax)}
              hint={
                imperial
                  ? `Range ~${STEAM_PRESSURE_RANGE_PSI.min}–${STEAM_PRESSURE_RANGE_PSI.max} psi abs`
                  : `Range ${STEAM_PRESSURE_RANGE_BAR.min}–${STEAM_PRESSURE_RANGE_BAR.max} bar abs`
              }
              chips={pressureChips}
            />
            <FieldSelect
              label="Steam state"
              value={inputs.inputMode}
              options={MODE_OPTIONS}
              onChange={(value) =>
                setField("inputMode", value as SteamInputMode)
              }
              hint="Sat: properties at Tsat(P) · Super: Region 2 at T, P"
            />
          </div>

          {saturation ? (
            <FieldGroup
              label="Steam quality (dryness) x"
              value={display("steamQuality")}
              allowZero
              onChange={(v) =>
                onNumChange(
                  "steamQuality",
                  v,
                  STEAM_QUALITY_RANGE.min,
                  STEAM_QUALITY_RANGE.max,
                )
              }
              onBlur={() =>
                onNumBlur(
                  "steamQuality",
                  STEAM_QUALITY_RANGE.min,
                  STEAM_QUALITY_RANGE.max,
                )
              }
              hint="0 = sat. liquid · 1.0 = dry sat. vapor"
              chips={[
                { label: "0", value: "0" },
                { label: "0.9", value: "0.9" },
                { label: "0.95", value: "0.95" },
                { label: "1.0", value: "1" },
              ]}
            />
          ) : (
            <FieldGroup
              label="Steam temperature"
              unit={tempUnit}
              compactUnit
              value={display("temperature")}
              allowZero={false}
              onChange={(v) => onNumChange("temperature", v, tMin, tMax)}
              onBlur={() => onNumBlur("temperature", tMin, tMax)}
              hint={
                imperial
                  ? `${STEAM_TEMP_RANGE_F.min}–${STEAM_TEMP_RANGE_F.max} °F · must be ≥ Tsat`
                  : `${STEAM_TEMP_RANGE_C.min}–${STEAM_TEMP_RANGE_C.max} °C · must be ≥ Tsat`
              }
              chips={tempChips}
            />
          )}
        </div>
      }
    />
  );
}
