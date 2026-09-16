"use client";

import { useEffect, useMemo, useRef } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, {
  FieldSelect,
  fieldLabelHint,
} from "@/components/calculator/FieldGroup";
import {
  chipsInOptions,
  COMMON_CLASS_CHIPS,
  COMMON_NPS_CHIPS,
} from "@/components/calculator/presets";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import FlangeGasketStressResultPanel from "@/components/calculator/calculators/FlangeGasketStressResultPanel";
import {
  calculateFlangeGasketStress,
  convertFlangeGasketStressUnitSystem,
  DEFAULT_FLANGE_GASKET_STRESS_INPUTS,
  GASKET_STRESS_TYPE_OPTIONS,
  listFlangeGasketStressClassesForNps,
  listFlangeGasketStressNps,
  type FlangeGasketStressInputs,
  type GasketStressTypeId,
} from "@/lib/calculators/engines/flange-gasket-stress";
import { FLANGE_GASKET_STRESS_URL_CONFIG } from "@/lib/calculators/url-configs/flange-gasket-stress";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { listFlangeNps } from "@/lib/data/loaders";

type FlangeGasketStressCalculatorProps = {
  title: string;
  standard?: string;
};

function toNumber(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function SelectField({
  label,
  value,
  options,
  onChange,
  chips,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  chips?: { value: string; label: string }[];
}) {
  return (
    <FieldSelect
      label={label}
      value={value}
      options={options}
      chips={chips ? chipsInOptions(chips, options) : undefined}
      onChange={onChange}
      hint={fieldLabelHint(label)}
    />
  );
}

export default function FlangeGasketStressCalculator({
  title,
  standard,
}: FlangeGasketStressCalculatorProps) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<FlangeGasketStressInputs>(
      DEFAULT_FLANGE_GASKET_STRESS_INPUTS,
      FLANGE_GASKET_STRESS_URL_CONFIG,
      { type: "flange-gasket-stress" },
    );

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
    if (!allowUnitConvertRef.current) return;
    allowUnitConvertRef.current = false;
    setInputs((current) =>
      convertFlangeGasketStressUnitSystem({ ...current, unitSystem: from }, to),
    );
  }, [inputs.unitSystem, setInputs]);

  useEffect(() => {
    const sizes = listFlangeGasketStressNps();
    if (sizes.length > 0 && !sizes.includes(inputs.nps)) {
      setField("nps", sizes[0]!);
    }
  }, [inputs.nps, setField]);

  useEffect(() => {
    const classes = listFlangeGasketStressClassesForNps(inputs.nps);
    if (classes.length > 0 && !classes.includes(inputs.flangeClass)) {
      setField("flangeClass", classes[0]!);
    }
  }, [inputs.nps, inputs.flangeClass, setField]);

  const resolvedInputs = useMemo(() => {
    const sizes = listFlangeGasketStressNps();
    const classes = listFlangeGasketStressClassesForNps(inputs.nps);
    return {
      ...inputs,
      nps: sizes.includes(inputs.nps) ? inputs.nps : (sizes[0] ?? ""),
      flangeClass: classes.includes(inputs.flangeClass)
        ? inputs.flangeClass
        : (classes[0] ?? ""),
    };
  }, [inputs]);

  const output = useMemo(
    () => calculateFlangeGasketStress(resolvedInputs),
    [resolvedInputs],
  );
  usePublishCalculatorOutput(output);

  const sizeMeta = listFlangeNps().find((s) => s.nps === resolvedInputs.nps);
  const gasketLabel =
    GASKET_STRESS_TYPE_OPTIONS.find((t) => t.value === resolvedInputs.gasketType)
      ?.label ?? resolvedInputs.gasketType;

  const pressureUnit = resolvedInputs.unitSystem === "imperial" ? "psi" : "bar";
  const stressUnit = resolvedInputs.unitSystem === "imperial" ? "psi" : "MPa";

  const npsOptions = listFlangeGasketStressNps().map((nps) => {
    const size = listFlangeNps().find((item) => item.nps === nps);
    return {
      value: nps,
      label: size ? `${size.npsLabel} (DN ${size.dn})` : `${nps}"`,
    };
  });

  const classOptions = listFlangeGasketStressClassesForNps(
    resolvedInputs.nps,
  ).map((cls) => ({
    value: cls,
    label: `Class ${cls}`,
  }));

  const pressureDisplay =
    resolvedInputs.unitSystem === "imperial"
      ? Math.round(resolvedInputs.pressure)
      : Number(resolvedInputs.pressure.toFixed(2));
  const boltDisplay =
    resolvedInputs.unitSystem === "imperial"
      ? Math.round(resolvedInputs.targetBoltStress)
      : Number(resolvedInputs.targetBoltStress.toFixed(1));

  const inputRows = [
    { label: "NPS", value: sizeMeta?.npsLabel ?? `${resolvedInputs.nps}"` },
    { label: "Class", value: `Class ${resolvedInputs.flangeClass}` },
    { label: "Gasket type", value: gasketLabel },
    {
      label: "Pressure",
      value: `${pressureDisplay} ${pressureUnit}`,
    },
    {
      label: "Target bolt stress",
      value: `${boltDisplay} ${stressUnit}`,
    },
    { label: "Unit system", value: resolvedInputs.unitSystem },
  ];

  return (
    <CalculatorBaseLayout
      layout="formula"
      wideResult
      resultDashboard
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      resultPanel={
        <FlangeGasketStressResultPanel
          output={output}
          exportTitle={title}
          standard={standard}
          inputRows={inputRows}
        />
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Joint & gasket duty
          </h3>
          <SelectField
            label="Nominal pipe size (NPS)"
            value={resolvedInputs.nps}
            options={npsOptions}
            chips={COMMON_NPS_CHIPS}
            onChange={(value) => setField("nps", value)}
          />
          <SelectField
            label="Pressure class"
            value={resolvedInputs.flangeClass}
            options={classOptions}
            chips={COMMON_CLASS_CHIPS}
            onChange={(value) => setField("flangeClass", value)}
          />
          <SelectField
            label="Gasket type"
            value={resolvedInputs.gasketType}
            options={GASKET_STRESS_TYPE_OPTIONS.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            onChange={(value) =>
              setField("gasketType", value as GasketStressTypeId)
            }
          />
          <FieldGroup
            label="Operating / design pressure (P)"
            hint="Used for hydrostatic end force H and App. 2 m·P operating check. Screening G = OD_g."
            value={pressureDisplay}
            onChange={(value) =>
              setField("pressure", toNumber(value, resolvedInputs.pressure))
            }
            unit={pressureUnit}
            highlight="P"
          />
          <FieldGroup
            label="Target bolt stress (S_bolt)"
            hint="PCC-1 style target stud stress. Preload F_b = N_b · S_bolt · A_b (nominal shank area)."
            value={boltDisplay}
            onChange={(value) =>
              setField(
                "targetBoltStress",
                toNumber(value, resolvedInputs.targetBoltStress),
              )
            }
            unit={stressUnit}
            highlight="S"
          />
        </div>
      }
    />
  );
}
