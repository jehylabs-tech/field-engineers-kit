"use client";

import { useEffect, useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import SectionBlock from "@/components/calculator/SectionBlock";
import ThermalLoopSchematic from "@/components/calculator/schematics/ThermalLoopSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateThermalExpansion,
  DEFAULT_THERMAL_EXPANSION_INPUTS,
  EXPANSION_MATERIAL_OPTIONS,
  EXPANSION_SCHEDULE_OPTIONS,
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

export default function ThermalExpansionCalculator({ title, standard }: Props) {
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
  const deltaLLabel = output.heroValue.replace(/^\+/, "");

  function onMaterialChange(value: ExpansionMaterial) {
    setInputs((current) => ({
      ...current,
      material: value,
      allowableSa: materialDefaultSa(value, current.unitSystem),
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
        { label: "Length", value: `${inputs.length} ${lengthUnit}` },
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
        <div className="w-full min-w-0 [&_.calc-field]:max-w-none">
          <SectionBlock number={1} title="Line and temperatures" twoColumn={false}>
            <FieldSelect
              label="Pipe material"
              value={inputs.material}
              options={materialOptions}
              onChange={(value) => onMaterialChange(value as ExpansionMaterial)}
            />
            <FieldSelect
              label="NPS"
              labelNote="(for loop D)"
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
              label="Install temperature T1"
              value={inputs.installTemp}
              onChange={(value) =>
                setField("installTemp", toNumber(value, inputs.installTemp))
              }
              unit={tempUnit}
            />
            <FieldGroup
              label="Operating temperature T2"
              value={inputs.operatingTemp}
              onChange={(value) =>
                setField("operatingTemp", toNumber(value, inputs.operatingTemp))
              }
              unit={tempUnit}
            />
            <FieldGroup
              label="Straight run length L"
              value={inputs.length}
              onChange={(value) =>
                setField("length", toNumber(value, inputs.length))
              }
              unit={lengthUnit}
            />
            <FieldGroup
              label="Allowable displacement stress S_A"
              value={inputs.allowableSa}
              onChange={(value) =>
                setField("allowableSa", toNumber(value, inputs.allowableSa))
              }
              unit={stressUnit}
              hint="Default follows material screening S_A. Override for B31.3 Eq. 1a values."
            />
            <FieldGroup
              label="Pipe rack friction factor μ"
              value={inputs.frictionFactor}
              onChange={(value) =>
                setField("frictionFactor", toNumber(value, inputs.frictionFactor))
              }
              unit="—"
              hint="Use 0.30 for steel-on-steel shoes or 0.10 for PTFE slide plates."
              allowZero
            />
          </SectionBlock>
        </div>
      }
    />
  );
}
