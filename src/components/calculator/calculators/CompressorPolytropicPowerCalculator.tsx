"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import CompressorDutyChart from "@/components/calculator/CompressorDutyChart";
import CompressorSchematic from "@/components/calculator/schematics/CompressorSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  COMPRESSOR_GAS_PROPERTIES,
  type CompressorGasType,
} from "@/lib/calculators/data/gasCompressorProperties";
import {
  applyGasTypeDefaults,
  calculateCompressorPolytropicPower,
  computeCompressorPolytropicPower,
  DEFAULT_COMPRESSOR_POLYTROPIC_POWER_INPUTS,
  EFF_RANGE_PCT,
  FLOW_RANGE_ICFM,
  FLOW_RANGE_M3H,
  K_RANGE,
  MW_RANGE,
  P_RANGE_BAR,
  P_RANGE_PSIA,
  T_RANGE_C,
  T_RANGE_F,
  Z_RANGE,
  type CompressorPolytropicPowerInputs,
} from "@/lib/calculators/engines/compressor-polytropic-power";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { COMPRESSOR_POLYTROPIC_POWER_URL_CONFIG } from "@/lib/calculators/url-configs/compressor-polytropic-power";
import { cToF } from "@/lib/unitConverter";

type Props = { title: string; standard?: string };

type DraftKey =
  | "molecularWeight"
  | "kRatio"
  | "suctionPress"
  | "dischargePress"
  | "suctionTemp"
  | "volFlow"
  | "polytropicEff"
  | "zFactor";

function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </h4>
  );
}

type DutyPreset = {
  id: string;
  label: string;
  patch: Partial<CompressorPolytropicPowerInputs>;
};

const METRIC_PRESETS: DutyPreset[] = [
  {
    id: "ng-5-25",
    label: "NG 5→25 bar",
    patch: {
      unitSystem: "metric",
      gasType: "natural_gas",
      molecularWeight: 18.5,
      kRatio: 1.28,
      zFactor: 0.95,
      suctionPress: 5,
      dischargePress: 25,
      suctionTemp: 35,
      volFlow: 5000,
      polytropicEff: 75,
    },
  },
  {
    id: "air-1-7",
    label: "Air 1→7 bar",
    patch: {
      unitSystem: "metric",
      gasType: "air",
      molecularWeight: 28.97,
      kRatio: 1.4,
      zFactor: 1,
      suctionPress: 1.013,
      dischargePress: 7,
      suctionTemp: 20,
      volFlow: 1000,
      polytropicEff: 72,
    },
  },
];

const IMPERIAL_PRESETS: DutyPreset[] = [
  {
    id: "ng-70-350",
    label: "NG 70→350 psia",
    patch: {
      unitSystem: "imperial",
      gasType: "natural_gas",
      molecularWeight: 18.5,
      kRatio: 1.28,
      zFactor: 0.95,
      suctionPress: 70,
      dischargePress: 350,
      suctionTemp: 95,
      volFlow: 3000,
      polytropicEff: 75,
    },
  },
  {
    id: "n2-15-90",
    label: "N₂ 15→90 psia",
    patch: {
      unitSystem: "imperial",
      gasType: "nitrogen",
      molecularWeight: 28.01,
      kRatio: 1.4,
      zFactor: 1,
      suctionPress: 15,
      dischargePress: 90,
      suctionTemp: 70,
      volFlow: 1500,
      polytropicEff: 70,
    },
  },
];

function presetMatches(
  inputs: CompressorPolytropicPowerInputs,
  preset: DutyPreset,
): boolean {
  const p = preset.patch;
  return (
    (p.gasType == null || inputs.gasType === p.gasType) &&
    (p.suctionPress == null || inputs.suctionPress === p.suctionPress) &&
    (p.dischargePress == null || inputs.dischargePress === p.dischargePress) &&
    (p.volFlow == null || inputs.volFlow === p.volFlow) &&
    (p.polytropicEff == null || inputs.polytropicEff === p.polytropicEff) &&
    (p.unitSystem == null || inputs.unitSystem === p.unitSystem)
  );
}

export default function CompressorPolytropicPowerCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<CompressorPolytropicPowerInputs>(
      DEFAULT_COMPRESSOR_POLYTROPIC_POWER_INPUTS,
      COMPRESSOR_POLYTROPIC_POWER_URL_CONFIG,
      { type: "compressor-polytropic-power" },
    );

  const [drafts, setDrafts] = useState<Partial<Record<DraftKey, string>>>({});

  useEffect(() => {
    setDrafts({});
  }, [inputs.unitSystem]);

  const output = useMemo(
    () => calculateCompressorPolytropicPower(inputs),
    [inputs],
  );
  const computed = useMemo(
    () => computeCompressorPolytropicPower(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const pUnit = imperial ? "psia" : "bar(a)";
  const tUnit = imperial ? "°F" : "°C";
  const flowUnit = imperial ? "ICFM" : "m³/h";
  const mwUnit = imperial ? "lb/lbmol" : "g/mol";
  const pRange = imperial ? P_RANGE_PSIA : P_RANGE_BAR;
  const tRange = imperial ? T_RANGE_F : T_RANGE_C;
  const flowRange = imperial ? FLOW_RANGE_ICFM : FLOW_RANGE_M3H;
  const presets = imperial ? IMPERIAL_PRESETS : METRIC_PRESETS;

  function display(key: DraftKey): string {
    return drafts[key] ?? String(inputs[key]);
  }

  function onNumChange(
    key: DraftKey,
    raw: string,
    min: number,
    max: number,
    opts?: { markCustom?: boolean },
  ) {
    setDrafts((prev) => ({ ...prev, [key]: raw }));
    const parsed = parseDraft(raw);
    if (parsed != null) {
      const clamped = Math.min(max, Math.max(min, parsed));
      if (opts?.markCustom && inputs.gasType !== "custom") {
        setInputs((current) => ({
          ...current,
          gasType: "custom",
          [key]: clamped,
        }));
      } else {
        setField(key, clamped);
      }
    }
  }

  function onNumBlur(
    key: DraftKey,
    min: number,
    max: number,
    opts?: { markCustom?: boolean },
  ) {
    setDrafts((prev) => {
      const raw = prev[key];
      if (raw !== undefined) {
        const parsed = parseDraft(raw);
        if (parsed != null) {
          const clamped = Math.min(max, Math.max(min, parsed));
          if (opts?.markCustom && inputs.gasType !== "custom") {
            setInputs((current) => ({
              ...current,
              gasType: "custom",
              [key]: clamped,
            }));
          } else {
            setField(key, clamped);
          }
        }
      }
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function applyPreset(
    preset: (typeof METRIC_PRESETS)[number] | (typeof IMPERIAL_PRESETS)[number],
  ) {
    setDrafts({});
    setInputs({
      ...DEFAULT_COMPRESSOR_POLYTROPIC_POWER_INPUTS,
      ...preset.patch,
    });
  }

  function onGasChange(v: string) {
    const gas = v as CompressorGasType;
    setDrafts({});
    setInputs((current) => applyGasTypeDefaults(gas, current));
  }

  const gasLabel =
    COMPRESSOR_GAS_PROPERTIES.find((g) => g.id === inputs.gasType)?.label ??
    inputs.gasType;

  const p1Label = imperial
    ? `${inputs.suctionPress.toFixed(0)} psia`
    : `${inputs.suctionPress} bar(a)`;
  const p2Label = imperial
    ? `${inputs.dischargePress.toFixed(0)} psia`
    : `${inputs.dischargePress} bar(a)`;
  const t1Label = `${inputs.suctionTemp} ${tUnit}`;
  const t2Label = !computed.invalid
    ? imperial
      ? `${cToF(computed.t2C).toFixed(0)} °F`
      : `${computed.t2C.toFixed(0)} °C`
    : "—";

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputNaturalHeight
      inputRows={[
        { label: "Gas", value: gasLabel },
        {
          label: "P₁ → P₂",
          value: `${inputs.suctionPress} → ${inputs.dischargePress} ${pUnit}`,
        },
        {
          label: "T₁ / Q₁",
          value: `${inputs.suctionTemp} ${tUnit} · ${inputs.volFlow} ${flowUnit}`,
        },
        {
          label: "η_p / Z",
          value: `${inputs.polytropicEff}% · Z=${inputs.zFactor}`,
        },
      ]}
      afterHero={
        !computed.invalid ? (
          <>
            <CompressorSchematic
              p1Label={p1Label}
              p2Label={p2Label}
              t1Label={t1Label}
              t2Label={t2Label}
              rp={computed.rp}
              highTemp={computed.highTemp}
              highRp={computed.highRp}
              suggestIntercooler={computed.highTemp || computed.highRp}
            />
            <CompressorDutyChart
              rp={computed.rp}
              t2C={computed.t2C}
              t1C={computed.t1K - 273.15}
              powerKw={computed.powerKw}
              imperial={imperial}
            />
          </>
        ) : null
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => {
              const active = presetMatches(inputs, p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-spec-border dark:bg-spec-bg dark:text-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <SectionLabel>Gas properties</SectionLabel>
          <FieldSelect
            label="Gas"
            value={inputs.gasType}
            options={COMPRESSOR_GAS_PROPERTIES.map((g) => ({
              value: g.id,
              label: g.label,
            }))}
            onChange={onGasChange}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Molecular weight M"
              unit={mwUnit}
              compactUnit
              value={display("molecularWeight")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("molecularWeight", v, MW_RANGE.min, MW_RANGE.max, {
                  markCustom: true,
                })
              }
              onBlur={() =>
                onNumBlur("molecularWeight", MW_RANGE.min, MW_RANGE.max, {
                  markCustom: true,
                })
              }
              hint={`${MW_RANGE.min}–${MW_RANGE.max}`}
            />
            <FieldGroup
              label="Specific heat ratio k"
              unit="—"
              compactUnit
              value={display("kRatio")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("kRatio", v, K_RANGE.min, K_RANGE.max, {
                  markCustom: true,
                })
              }
              onBlur={() =>
                onNumBlur("kRatio", K_RANGE.min, K_RANGE.max, {
                  markCustom: true,
                })
              }
              hint={`${K_RANGE.min}–${K_RANGE.max}`}
            />
            <FieldGroup
              label="Avg compressibility Z_avg"
              unit="—"
              compactUnit
              value={display("zFactor")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("zFactor", v, Z_RANGE.min, Z_RANGE.max, {
                  markCustom: true,
                })
              }
              onBlur={() =>
                onNumBlur("zFactor", Z_RANGE.min, Z_RANGE.max, {
                  markCustom: true,
                })
              }
              hint={`${Z_RANGE.min}–${Z_RANGE.max} · confirm EOS if P₂ high`}
            />
          </div>

          <SectionLabel>Pressures &amp; suction duty</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Suction pressure P₁"
              unit={pUnit}
              compactUnit
              value={display("suctionPress")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("suctionPress", v, pRange.min, pRange.max)
              }
              onBlur={() => onNumBlur("suctionPress", pRange.min, pRange.max)}
              chips={
                imperial
                  ? [
                      { label: "15", value: "15" },
                      { label: "70", value: "70" },
                    ]
                  : [
                      { label: "1.013", value: "1.013" },
                      { label: "5", value: "5" },
                    ]
              }
            />
            <FieldGroup
              label="Discharge pressure P₂"
              unit={pUnit}
              compactUnit
              value={display("dischargePress")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("dischargePress", v, pRange.min, pRange.max)
              }
              onBlur={() => onNumBlur("dischargePress", pRange.min, pRange.max)}
              chips={
                imperial
                  ? [
                      { label: "90", value: "90" },
                      { label: "350", value: "350" },
                    ]
                  : [
                      { label: "7", value: "7" },
                      { label: "25", value: "25" },
                    ]
              }
            />
            <FieldGroup
              label="Suction temperature T₁"
              unit={tUnit}
              compactUnit
              value={display("suctionTemp")}
              onChange={(v) =>
                onNumChange("suctionTemp", v, tRange.min, tRange.max)
              }
              onBlur={() => onNumBlur("suctionTemp", tRange.min, tRange.max)}
              chips={
                imperial
                  ? [
                      { label: "70", value: "70" },
                      { label: "95", value: "95" },
                    ]
                  : [
                      { label: "20", value: "20" },
                      { label: "35", value: "35" },
                    ]
              }
            />
            <FieldGroup
              label="Inlet volume flow Q₁"
              unit={flowUnit}
              compactUnit
              value={display("volFlow")}
              allowZero={false}
              onChange={(v) =>
                onNumChange("volFlow", v, flowRange.min, flowRange.max)
              }
              onBlur={() => onNumBlur("volFlow", flowRange.min, flowRange.max)}
              chips={
                imperial
                  ? [
                      { label: "1500", value: "1500" },
                      { label: "3000", value: "3000" },
                    ]
                  : [
                      { label: "1000", value: "1000" },
                      { label: "5000", value: "5000" },
                    ]
              }
            />
            <FieldGroup
              label="Polytropic efficiency η_p"
              unit="%"
              compactUnit
              value={display("polytropicEff")}
              allowZero={false}
              onChange={(v) =>
                onNumChange(
                  "polytropicEff",
                  v,
                  EFF_RANGE_PCT.min,
                  EFF_RANGE_PCT.max,
                )
              }
              onBlur={() =>
                onNumBlur("polytropicEff", EFF_RANGE_PCT.min, EFF_RANGE_PCT.max)
              }
              chips={[
                { label: "70", value: "70" },
                { label: "75", value: "75" },
                { label: "80", value: "80" },
              ]}
            />
          </div>
        </div>
      }
    />
  );
}
