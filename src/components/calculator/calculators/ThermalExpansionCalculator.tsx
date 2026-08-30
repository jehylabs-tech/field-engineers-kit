"use client";

import { useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import SectionBlock from "@/components/calculator/SectionBlock";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateThermalExpansion,
  DEFAULT_THERMAL_EXPANSION_INPUTS,
  EXPANSION_MATERIAL_OPTIONS,
  type ExpansionMaterial,
  type ThermalExpansionInputs,
} from "@/lib/calculators/engines/thermal-expansion";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { THERMAL_EXPANSION_URL_CONFIG } from "@/lib/calculators/url-configs/thermal-expansion";
import { listAvailableNps } from "@/lib/data/loaders";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function ThermalExpansionCalculator({ title, standard }: Props) {
  const { inputs, setField } = useCalculatorUrlSync<ThermalExpansionInputs>(
    DEFAULT_THERMAL_EXPANSION_INPUTS,
    THERMAL_EXPANSION_URL_CONFIG,
    { type: "thermal-expansion" },
  );

  const output = useMemo(() => calculateThermalExpansion(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const tempUnit = inputs.unitSystem === "imperial" ? "°F" : "°C";
  const lengthUnit = inputs.unitSystem === "imperial" ? "ft" : "m";
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

  return (
    <CalculatorBaseLayout
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={[
        { label: "Material", value: materialLabel },
        { label: "T1 / T2", value: `${inputs.installTemp} / ${inputs.operatingTemp} ${tempUnit}` },
        { label: "Length", value: `${inputs.length} ${lengthUnit}` },
        { label: "NPS", value: `${inputs.nps}"` },
      ]}
      inputPanel={
        <div className="w-full min-w-0 [&_.calc-field]:max-w-none">
          <SectionBlock number={1} title="Line and temperatures" twoColumn={false}>
            <FieldSelect
              label="Pipe material"
              value={inputs.material}
              options={materialOptions}
              onChange={(value) =>
                setField("material", value as ExpansionMaterial)
              }
            />
            <FieldSelect
              label="NPS"
              labelNote="(for loop D)"
              value={inputs.nps}
              options={npsOptions}
              onChange={(value) => setField("nps", value)}
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
          </SectionBlock>
        </div>
      }
    />
  );
}
