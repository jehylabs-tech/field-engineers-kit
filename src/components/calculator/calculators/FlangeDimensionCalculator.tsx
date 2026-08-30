"use client";

import { useEffect, useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import SectionBlock from "@/components/calculator/SectionBlock";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateFlangeDimension,
  DEFAULT_FLANGE_DIMENSION_INPUTS,
  type FlangeDimensionInputs,
} from "@/lib/calculators/engines/flange-dimension";
import {
  FACING_OPTIONS,
  FLANGE_TYPE_OPTIONS,
  facingLabel,
  flangeTypeLabel,
  isRtjClass,
  lookupRtjRingNumber,
  resolveFacing,
  resolveFlangeType,
} from "@/lib/calculators/engines/flange-options";
import FlangeLookupSchematic from "@/components/calculator/schematics/FlangeLookupSchematic";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { FLANGE_DIMENSION_URL_CONFIG } from "@/lib/calculators/url-configs/flange-dimension";
import { FieldSelect, fieldLabelHint } from "@/components/calculator/FieldGroup";
import {
  chipsInOptions,
  COMMON_CLASS_CHIPS,
  COMMON_NPS_CHIPS,
  FACING_CHIPS,
  FLANGE_TYPE_CHIPS,
} from "@/components/calculator/presets";
import {
  defaultScheduleForNps,
  getFlangeDimensionEntry,
  getPipeScheduleEntry,
  listFlangeClassesForNps,
  listFlangeNps,
} from "@/lib/data/loaders";

type FlangeDimensionCalculatorProps = {
  title: string;
  standard?: string;
};

function SelectField({
  label,
  value,
  options,
  onChange,
  highlight,
  chips,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  highlight?: string;
  chips?: { value: string; label: string }[];
}) {
  return (
    <FieldSelect
      label={label}
      value={value}
      options={options}
      chips={chips ? chipsInOptions(chips, options) : undefined}
      onChange={onChange}
      highlight={highlight}
      hint={fieldLabelHint(label)}
    />
  );
}

export default function FlangeDimensionCalculator({
  title,
  standard,
}: FlangeDimensionCalculatorProps) {
  const { inputs, setField } = useCalculatorUrlSync<FlangeDimensionInputs>(
    DEFAULT_FLANGE_DIMENSION_INPUTS,
    FLANGE_DIMENSION_URL_CONFIG,
    { type: "flange-dimension" },
  );

  useEffect(() => {
    const classes = listFlangeClassesForNps(inputs.nps);
    if (
      classes.length > 0 &&
      !classes.some((row) => row.class === inputs.pressureClass)
    ) {
      setField("pressureClass", classes[0].class);
    }
    if (inputs.facing === "rtj" && !isRtjClass(inputs.pressureClass)) {
      setField("facing", "rf");
    }
  }, [inputs.nps, inputs.pressureClass, inputs.facing, setField]);

  const npsOptions = useMemo(
    () =>
      listFlangeNps().map((flange) => ({
        value: flange.nps,
        label: `${flange.npsLabel} (DN ${flange.dn})`,
      })),
    [],
  );

  const classOptions = useMemo(() => {
    return listFlangeClassesForNps(inputs.nps).map((row) => ({
      value: row.class,
      label: `Class ${row.class}`,
    }));
  }, [inputs.nps]);

  const resolvedInputs = useMemo(() => {
    const classes = listFlangeClassesForNps(inputs.nps);
    const classExists = classes.some((row) => row.class === inputs.pressureClass);
    return {
      ...inputs,
      flangeType: resolveFlangeType(inputs.flangeType),
      facing: resolveFacing(
        inputs.facing,
        classExists ? inputs.pressureClass : (classes[0]?.class ?? ""),
      ),
      pressureClass: classExists
        ? inputs.pressureClass
        : (classes[0]?.class ?? ""),
    };
  }, [inputs]);

  const output = useMemo(
    () => calculateFlangeDimension(resolvedInputs),
    [resolvedInputs],
  );
  usePublishCalculatorOutput(output);

  const selectedFlange = listFlangeNps().find(
    (flange) => flange.nps === resolvedInputs.nps,
  );

  const entry = getFlangeDimensionEntry(
    resolvedInputs.nps,
    resolvedInputs.pressureClass,
  );
  const defaultSchedule = defaultScheduleForNps(resolvedInputs.nps);
  const pipe = getPipeScheduleEntry(resolvedInputs.nps, defaultSchedule);
  const flangeType = resolveFlangeType(resolvedInputs.flangeType);
  const facing = resolveFacing(
    resolvedInputs.facing,
    resolvedInputs.pressureClass,
  );
  const rtjEnabled = isRtjClass(resolvedInputs.pressureClass);
  const facingOptions = FACING_OPTIONS.filter(
    (item) => item.value !== "rtj" || rtjEnabled,
  );
  const facingChips = FACING_CHIPS.filter(
    (item) => item.value !== "rtj" || rtjEnabled,
  );
  const ringNumber =
    facing === "rtj"
      ? lookupRtjRingNumber(resolvedInputs.nps, resolvedInputs.pressureClass)
      : undefined;
  const boreMm =
    flangeType === "bl"
      ? 0
      : flangeType === "wn"
        ? pipe?.row.insideDiameterMm
        : pipe?.pipe.outsideDiameterMm;
  const lengthUnit = resolvedInputs.unitSystem === "metric" ? "mm" : "in";
  const dim = (mm: number) =>
    resolvedInputs.unitSystem === "metric"
      ? `${mm.toFixed(1)} mm`
      : `${(mm / 25.4).toFixed(2)} in`;

  const inputRows = [
    { label: "Flange type", value: flangeTypeLabel(flangeType) },
    { label: "Facing", value: facingLabel(facing) },
    { label: "NPS", value: selectedFlange?.npsLabel ?? resolvedInputs.nps },
    {
      label: "Pressure class",
      value: `Class ${resolvedInputs.pressureClass}`,
    },
    { label: "Unit system", value: resolvedInputs.unitSystem },
  ];

  return (
    <CalculatorBaseLayout
      layout="formula"
      wideResult
      resultDashboard
      diagramSection="Flange dimensions"
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      visual={
        <FlangeLookupSchematic
          npsLabel={selectedFlange?.npsLabel ?? `${resolvedInputs.nps}"`}
          classLabel={`Class ${resolvedInputs.pressureClass}`}
          odLabel={entry ? dim(entry.rating.outsideDiameterMm) : `— ${lengthUnit}`}
          thicknessLabel={entry ? dim(entry.rating.thicknessMm) : `— ${lengthUnit}`}
          pcdLabel={entry ? dim(entry.rating.boltCircleMm) : `— ${lengthUnit}`}
          holeLabel={entry ? dim(entry.rating.boltHoleDiameterMm) : `— ${lengthUnit}`}
          boreLabel={
            flangeType === "bl"
              ? "solid"
              : boreMm
                ? dim(boreMm)
                : `— ${lengthUnit}`
          }
          odMm={entry?.rating.outsideDiameterMm}
          thicknessMm={entry?.rating.thicknessMm}
          pcdMm={entry?.rating.boltCircleMm}
          holeMm={entry?.rating.boltHoleDiameterMm}
          boreMm={boreMm}
          holeCount={entry?.rating.boltHoleCount}
          flangeType={flangeType}
          facing={facing}
        />
      }
      inputPanel={
        <>
          <SectionBlock number={1} title="Flange Selection" twoColumn={false} compact>
            <SelectField
              label="Flange type"
              value={flangeType}
              options={[...FLANGE_TYPE_OPTIONS]}
              chips={FLANGE_TYPE_CHIPS}
              onChange={(value) => setField("flangeType", value)}
              highlight="T"
            />
            <SelectField
              label="Facing"
              value={facing}
              options={[...facingOptions]}
              chips={facingChips}
              onChange={(value) => setField("facing", value)}
            />
            <SelectField
              label="Nominal pipe size (NPS)"
              value={resolvedInputs.nps}
              options={npsOptions}
              chips={COMMON_NPS_CHIPS}
              onChange={(value) => setField("nps", value)}
              highlight="od"
            />
            <SelectField
              label="Pressure class"
              value={resolvedInputs.pressureClass}
              options={classOptions}
              chips={COMMON_CLASS_CHIPS}
              onChange={(value) => setField("pressureClass", value)}
              highlight="T"
            />
          </SectionBlock>

          <SectionBlock number={2} title="Reference Data" twoColumn={false} compact>
            <p className="text-xs leading-snug text-spec-text2">
              OD, thickness, and bolting follow ASME B16.5. WN hub bore uses Sch 40
              / STD pipe ID. Single-flange mass is the WN RF table value scaled for
              SO / SW / blind.
            </p>
            {Number(resolvedInputs.nps) > 2 && flangeType === "sw" ? (
              <p className="text-xs leading-snug text-spec-sponText">
                Socket-weld flanges are typically limited to NPS 2 and smaller in
                B16.5. Treat larger sizes as screening only.
              </p>
            ) : null}
            {entry ? (
              <div className="space-y-1 rounded-md border border-spec-border bg-spec-panel px-2.5 py-1.5 text-xs text-spec-text2">
                <div>
                  Bolting:{" "}
                  <span className="font-mono text-spec-text">
                    {entry.rating.boltHoleCount} × {entry.rating.studDiameterIn}{" "}
                    in studs
                  </span>
                </div>
                <div>
                  {facing === "rtj" ? (
                    <>
                      RTJ ring:{" "}
                      <span className="font-mono text-spec-text">
                        {ringNumber ?? "—"} (B16.20)
                      </span>
                    </>
                  ) : facing === "ff" ? (
                    <>Full-face gasket (FF) — no raised-face height in stud length.</>
                  ) : (
                    <>
                      Gasket (spiral-wound RF):{" "}
                      <span className="font-mono text-spec-text">
                        {dim(entry.rating.raisedFaceDiameterMm)} sealing OD
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </SectionBlock>
        </>
      }
    />
  );
}
