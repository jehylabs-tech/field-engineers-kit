"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import ThermalLoopSchematic from "@/components/calculator/schematics/ThermalLoopSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateThermalExpansion,
  DEFAULT_THERMAL_EXPANSION_INPUTS,
  EXPANSION_MATERIAL_OPTIONS,
  EXPANSION_SCHEDULE_OPTIONS,
  EXPANSION_SERVICE_PRESETS,
  materialDefaultSa,
  pipeSectionProperties,
  type ExpansionMaterial,
  type ThermalExpansionInputs,
} from "@/lib/calculators/engines/thermal-expansion";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { THERMAL_EXPANSION_URL_CONFIG } from "@/lib/calculators/url-configs/thermal-expansion";
import {
  defaultScheduleForNps,
  listAvailableNps,
  listScheduleOptionsForNps,
  resolveScheduleOptionValue,
} from "@/lib/data/loaders";
import { chipsInOptions } from "@/components/calculator/presets";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cToDisplay(
  tempC: number,
  unitSystem: ThermalExpansionInputs["unitSystem"],
) {
  if (unitSystem === "imperial") {
    return Math.round(tempC * 1.8 + 32);
  }
  return tempC;
}

export default function ThermalExpansionCalculator({ title, standard }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { inputs, setField, setInputs } = useCalculatorUrlSync<ThermalExpansionInputs>(
    DEFAULT_THERMAL_EXPANSION_INPUTS,
    THERMAL_EXPANSION_URL_CONFIG,
    { type: "thermal-expansion" },
  );

  useEffect(() => {
    const next = defaultScheduleForNps(inputs.nps, inputs.schedule);
    if (next && next !== inputs.schedule) {
      setField("schedule", next);
    }
  }, [inputs.nps, inputs.schedule, setField]);

  const output = useMemo(() => calculateThermalExpansion(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const tempUnit = inputs.unitSystem === "imperial" ? "°F" : "°C";
  const lengthUnit = inputs.unitSystem === "imperial" ? "ft" : "m";
  const stressUnit = inputs.unitSystem === "imperial" ? "ksi" : "MPa";
  const materialLabel =
    EXPANSION_MATERIAL_OPTIONS.find((item) => item.value === inputs.material)
      ?.label ?? inputs.material;

  const materialOptions = useMemo(
    () =>
      EXPANSION_MATERIAL_OPTIONS.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    [],
  );

  const npsOptions = useMemo(
    () =>
      listAvailableNps().map((pipe) => ({
        value: pipe.nps,
        label: `${pipe.npsLabel} (DN ${pipe.dn})`,
      })),
    [],
  );

  const scheduleOptions = useMemo(() => {
    const available = listScheduleOptionsForNps(inputs.nps);
    const preferred = EXPANSION_SCHEDULE_OPTIONS.map((item) => {
      const resolved = resolveScheduleOptionValue(inputs.nps, item.value);
      const match = available.find(
        (row) =>
          row.value === resolved ||
          row.members.some((m) => m.toUpperCase() === item.value.toUpperCase()) ||
          row.value.toUpperCase() === item.value.toUpperCase(),
      );
      return {
        value: match?.value ?? resolved ?? item.value,
        label: item.label,
      };
    }).filter((item) =>
      available.some(
        (row) =>
          row.value === item.value ||
          row.members.includes(item.value) ||
          row.label.includes(item.label.split(" ")[1] ?? ""),
      ),
    );
    return preferred.length > 0
      ? preferred
      : available.map((row) => ({ value: row.value, label: row.label }));
  }, [inputs.nps]);

  const section = useMemo(
    () => pipeSectionProperties(inputs.nps, inputs.schedule),
    [inputs.nps, inputs.schedule],
  );

  const hLabel =
    output.rows.find((row) => row.label.includes("L-shape leg"))?.value ?? "—";
  const wLabel =
    output.rows.find((row) => row.label.includes("U-loop width"))?.value ?? "—";
  const g1Label =
    output.rows.find((row) => row.label.includes("G₁"))?.value ?? "—";
  const g2Label =
    output.rows.find((row) => row.label.includes("G₂"))?.value ?? "—";
  const deltaLLabel = output.heroValue.replace(/^[+−-]/, "");

  function onMaterialChange(value: ExpansionMaterial) {
    setInputs((current) => ({
      ...current,
      material: value,
      allowableSa: materialDefaultSa(value, current.unitSystem),
    }));
  }

  function applyServicePreset(presetId: string) {
    const preset = EXPANSION_SERVICE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setInputs((current) => ({
      ...current,
      material: preset.material,
      installTemp: cToDisplay(preset.installTempC, current.unitSystem),
      operatingTemp: cToDisplay(preset.operatingTempC, current.unitSystem),
      allowableSa: materialDefaultSa(preset.material, current.unitSystem),
    }));
  }

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        { label: "Material", value: materialLabel },
        {
          label: "T1 / T2",
          value: `${inputs.installTemp} / ${inputs.operatingTemp} ${tempUnit}`,
        },
        { label: "Length (L)", value: `${inputs.length} ${lengthUnit}` },
        {
          label: "NPS / Sch",
          value: `${inputs.nps}" · Sch ${section.scheduleLabel}`,
        },
        {
          label: "S_A",
          value: `${inputs.allowableSa} ${stressUnit}`,
        },
        {
          label: "μ",
          value: inputs.frictionFactor.toFixed(2),
        },
      ]}
      visual={
        <ThermalLoopSchematic
          hLabel={hLabel}
          wLabel={wLabel}
          g1Label={g1Label}
          g2Label={g2Label}
          deltaLLabel={deltaLLabel}
          npsLabel={section.npsLabel}
        />
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          {/* Under 1. Input Parameters — no duplicate top-level section number */}
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Line, pipe &amp; temperatures
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {EXPANSION_SERVICE_PRESETS.map((preset) => {
              const active = inputs.material === preset.material;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyServicePreset(preset.id)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-spec-border dark:bg-spec-bg dark:text-slate-300"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <FieldSelect
            label="Pipe material"
            value={inputs.material}
            options={materialOptions}
            onChange={(value) => onMaterialChange(value as ExpansionMaterial)}
          />
          <FieldSelect
            label="NPS"
            labelNote="(for loop D / I)"
            value={inputs.nps}
            options={npsOptions}
            onChange={(value) => setField("nps", value)}
          />
          <FieldSelect
            label="Pipe schedule"
            value={
              scheduleOptions.some((o) => o.value === inputs.schedule)
                ? inputs.schedule
                : (scheduleOptions[0]?.value ?? inputs.schedule)
            }
            options={scheduleOptions}
            chips={chipsInOptions(
              EXPANSION_SCHEDULE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              })),
              scheduleOptions,
            )}
            onChange={(value) =>
              setField(
                "schedule",
                resolveScheduleOptionValue(inputs.nps, value),
              )
            }
          />
          <FieldGroup
            label="Install temperature (T1)"
            value={inputs.installTemp}
            onChange={(value) =>
              setField("installTemp", toNumber(value, inputs.installTemp))
            }
            unit={tempUnit}
          />
          <FieldGroup
            label="Operating temperature (T2)"
            value={inputs.operatingTemp}
            onChange={(value) =>
              setField("operatingTemp", toNumber(value, inputs.operatingTemp))
            }
            unit={tempUnit}
            hint={
              inputs.material === "cpvc"
                ? "CPVC typical continuous service ≤ ~60–93 °C — confirm manufacturer."
                : inputs.material === "steam"
                  ? "Steam preset ≈ 10 barg saturated (~184 °C). Adjust to your design T."
                  : undefined
            }
          />
          <FieldGroup
            label="Straight run length (L)"
            value={inputs.length}
            onChange={(value) =>
              setField("length", toNumber(value, inputs.length))
            }
            unit={lengthUnit}
            hint="Anchor-to-anchor free run. ΔL = α · L · ΔT. Loop uses ΔL_leg = ΔL/2."
          />

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowAdvanced((open) => !open)}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-slate-100 px-1.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  1.2
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  S_A &amp; friction μ
                </span>
                {!showAdvanced ? (
                  <span className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    S_A {inputs.allowableSa} {stressUnit} · μ{" "}
                    {inputs.frictionFactor.toFixed(2)}
                  </span>
                ) : null}
              </div>
              <span className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {showAdvanced ? "▲ Hide" : "▼ Edit"}
              </span>
            </button>

            {showAdvanced ? (
              <div className="space-y-2.5 border-t border-slate-200/80 p-3.5 dark:border-slate-800">
                <FieldGroup
                  label="Allowable displacement stress (S_A)"
                  value={inputs.allowableSa}
                  onChange={(value) =>
                    setField("allowableSa", toNumber(value, inputs.allowableSa))
                  }
                  unit={stressUnit}
                  hint={
                    inputs.material === "cpvc"
                      ? "Default CPVC screening S_A = 13.8 MPa (2 ksi). Override per manufacturer / project."
                      : "Default is material screening S_A (138 MPa / 20 ksi). Override for B31.3 Eq. 1a."
                  }
                />
                <FieldGroup
                  label="Pipe rack friction factor (μ)"
                  value={inputs.frictionFactor}
                  onChange={(value) =>
                    setField(
                      "frictionFactor",
                      toNumber(value, inputs.frictionFactor),
                    )
                  }
                  unit="—"
                  hint="0.30 steel-on-steel shoes · 0.10 PTFE slide plates. F_anchor = F_bending + μ·W."
                  allowZero
                />
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
