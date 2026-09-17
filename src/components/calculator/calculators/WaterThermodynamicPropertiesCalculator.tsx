"use client";

import { useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateWaterThermo,
  DEFAULT_WATER_THERMO_INPUTS,
  WATER_THERMO_PRESSURE_RANGE_BAR,
  WATER_THERMO_PRESSURE_RANGE_PSI,
  WATER_THERMO_TEMP_RANGE,
  WATER_THERMO_TEMP_RANGE_F,
  type WaterThermoInputs,
} from "@/lib/calculators/engines/water-thermodynamic-properties";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { WATER_THERMO_URL_CONFIG } from "@/lib/calculators/url-configs/water-thermodynamic-properties";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function WaterThermodynamicPropertiesCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField } = useCalculatorUrlSync<WaterThermoInputs>(
    DEFAULT_WATER_THERMO_INPUTS,
    WATER_THERMO_URL_CONFIG,
    { type: "water-thermodynamic-properties" },
  );

  const output = useMemo(() => calculateWaterThermo(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const tempUnit = imperial ? "°F" : "°C";
  const pressureUnit = imperial ? "psi" : "bar";

  const tempChips = imperial
    ? [
        { value: "68", label: "68 °F" },
        { value: "100", label: "100 °F" },
        { value: "212", label: "212 °F" },
        { value: "300", label: "300 °F" },
      ]
    : [
        { value: "20", label: "20 °C" },
        { value: "40", label: "40 °C" },
        { value: "80", label: "80 °C" },
        { value: "100", label: "100 °C" },
      ];

  // Default already = 1.01325 bar / 14.7 psi — chips cover common steps only.
  const pressureChips = imperial
    ? [
        { value: "14.7", label: "14.7 psi" },
        { value: "50", label: "50 psi" },
        { value: "100", label: "100 psi" },
        { value: "150", label: "150 psi" },
      ]
    : [
        { value: "1", label: "1 bar" },
        { value: "5", label: "5 bar" },
        { value: "10", label: "10 bar" },
        { value: "50", label: "50 bar" },
      ];

  const tempHint = imperial
    ? `Range ${WATER_THERMO_TEMP_RANGE_F.min}–${WATER_THERMO_TEMP_RANGE_F.max} °F`
    : `Range ${WATER_THERMO_TEMP_RANGE.min}–${WATER_THERMO_TEMP_RANGE.max} °C`;
  const pressureHint = imperial
    ? `Range ~${WATER_THERMO_PRESSURE_RANGE_PSI.min}–${WATER_THERMO_PRESSURE_RANGE_PSI.max} psi`
    : `Range ${WATER_THERMO_PRESSURE_RANGE_BAR.min}–${WATER_THERMO_PRESSURE_RANGE_BAR.max} bar`;

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputNaturalHeight
      inputRows={[
        {
          label: "Temperature",
          value: `${inputs.temperature} ${tempUnit}`,
        },
        {
          label: "Pressure",
          value: `${inputs.pressure} ${pressureUnit}`,
        },
      ]}
      inputPanel={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldGroup
            label="Temperature"
            unit={tempUnit}
            value={String(inputs.temperature)}
            onChange={(value) =>
              setField("temperature", toNumber(value, inputs.temperature))
            }
            chips={tempChips}
            hint={tempHint}
          />
          <FieldGroup
            label="Pressure"
            unit={pressureUnit}
            value={String(inputs.pressure)}
            onChange={(value) =>
              setField("pressure", toNumber(value, inputs.pressure))
            }
            chips={pressureChips}
            hint={pressureHint}
          />
        </div>
      }
    />
  );
}
