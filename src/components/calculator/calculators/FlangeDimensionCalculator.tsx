"use client";

import { useEffect, useMemo } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateFlangeDimension,
  DEFAULT_FLANGE_DIMENSION_INPUTS,
  type FlangeDimensionInputs,
} from "@/lib/calculators/engines/flange-dimension";
import {
  facingLabel,
  flangeTypeLabel,
  isRtjClass,
  lookupRtjRingNumber,
  resolveFacing,
  resolveFlangeType,
} from "@/lib/calculators/engines/flange-options";
import FlangeLookupSchematic from "@/components/calculator/schematics/FlangeLookupSchematic";
import FlangeReferenceNotes from "@/components/calculator/calculators/FlangeReferenceNotes";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { FLANGE_DIMENSION_URL_CONFIG } from "@/lib/calculators/url-configs/flange-dimension";
import {
  FieldChipRadio,
  FieldSelect,
  fieldLabelHint,
} from "@/components/calculator/FieldGroup";
import {
  FACING_CHIPS,
  FLANGE_TYPE_CHIPS,
  chipsInOptions,
  COMMON_NPS_CHIPS,
} from "@/components/calculator/presets";
import {
  defaultScheduleForNps,
  formatPipeScheduleLabel,
  getFlangeDimensionEntry,
  getPipeScheduleEntry,
  listFlangeClassesForNps,
  listFlangeNps,
  listScheduleOptionsForNps,
  resolveScheduleOptionValue,
} from "@/lib/data/loaders";

type FlangeDimensionCalculatorProps = {
  title: string;
  standard?: string;
};

const CARD_SHELL =
  "w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-spec-border dark:bg-spec-panel";

const RTJ_DISABLED_HINT =
  "RTJ facing is available for Class 300 and above per ASME B16.5";

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

  useEffect(() => {
    const resolved = defaultScheduleForNps(inputs.nps, inputs.pipeSchedule);
    if (resolved && resolved !== inputs.pipeSchedule) {
      setField("pipeSchedule", resolved);
    }
  }, [inputs.nps, inputs.pipeSchedule, setField]);

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
      value: String(row.class),
      label: `Class ${row.class}`,
    }));
  }, [inputs.nps]);

  const scheduleOptions = useMemo(() => {
    return listScheduleOptionsForNps(inputs.nps).map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }, [inputs.nps]);

  const resolvedInputs = useMemo(() => {
    const classes = listFlangeClassesForNps(inputs.nps);
    const classExists = classes.some((row) => row.class === inputs.pressureClass);
    const pipeSchedule = defaultScheduleForNps(
      inputs.nps,
      inputs.pipeSchedule,
    );
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
      pipeSchedule,
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
  const schedule = resolveScheduleOptionValue(
    resolvedInputs.nps,
    resolvedInputs.pipeSchedule ?? "40",
  );
  const pipe = getPipeScheduleEntry(resolvedInputs.nps, schedule);
  const flangeType = resolveFlangeType(resolvedInputs.flangeType);
  const facing = resolveFacing(
    resolvedInputs.facing,
    resolvedInputs.pressureClass,
  );
  const rtjEnabled = isRtjClass(resolvedInputs.pressureClass);
  const facingChips = FACING_CHIPS.map((item) =>
    item.value === "rtj" && !rtjEnabled
      ? {
          ...item,
          disabled: true,
          title: RTJ_DISABLED_HINT,
        }
      : item,
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
    ...(flangeType === "wn"
      ? [
          {
            label: "Pipe schedule",
            value: formatPipeScheduleLabel(schedule),
          },
        ]
      : []),
    { label: "Unit system", value: resolvedInputs.unitSystem },
  ];

  const jointPreview = (
    <>
      <p className="text-xs leading-snug text-spec-text2">
        OD, thickness, and bolting follow ASME B16.5. WN hub bore uses the selected
        pipe schedule ID (default Sch 40 / STD). Mated-pair mass = 2 flanges + gasket
        + full stud/nut set.
      </p>
      {Number(resolvedInputs.nps) > 2 && flangeType === "sw" ? (
        <p className="text-xs leading-snug text-spec-sponText">
          Socket-weld flanges are typically limited to NPS 2 and smaller in B16.5.
          Treat larger sizes as screening only.
        </p>
      ) : null}
      {entry ? (
        <div className="space-y-1 rounded-md border border-spec-border bg-spec-panel px-2.5 py-1.5 text-xs text-spec-text2">
          <div>
            Bolting:{" "}
            <span className="font-mono text-spec-text">
              {entry.rating.boltHoleCount} × {entry.rating.studDiameterIn} in studs
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
    </>
  );

  return (
    <CalculatorBaseLayout
      layout="formula"
      wideResult
      resultDashboard
      inputNaturalHeight
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
      chart={
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-spec-border">
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Live joint preview
          </h3>
          <div className="space-y-2.5">{jointPreview}</div>
        </div>
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Flange selection
          </h3>
          <FieldChipRadio
            wide
            label="Flange type"
            value={flangeType}
            options={[...FLANGE_TYPE_CHIPS]}
            onChange={(value) => setField("flangeType", value)}
          />
          <FieldChipRadio
            wide
            label="Facing"
            hint={
              rtjEnabled
                ? "RF / FF / RTJ. RTJ enabled for Class 300 and above."
                : RTJ_DISABLED_HINT
            }
            value={facing}
            options={facingChips}
            onChange={(value) => setField("facing", value)}
          />
          <FieldSelect
            label="Nominal pipe size (NPS)"
            value={resolvedInputs.nps}
            options={npsOptions}
            chips={chipsInOptions(COMMON_NPS_CHIPS, npsOptions)}
            onChange={(value) => setField("nps", value)}
            highlight="od"
            hint={fieldLabelHint("Nominal pipe size (NPS)")}
          />
          <FieldChipRadio
            wide
            label="Pressure class"
            value={resolvedInputs.pressureClass}
            options={classOptions}
            onChange={(value) => setField("pressureClass", value)}
          />
          {flangeType === "wn" ? (
            <FieldSelect
              label="Pipe schedule (WN hub bore)"
              value={schedule}
              options={scheduleOptions}
              onChange={(value) => setField("pipeSchedule", value)}
              highlight="bore"
              hint="WN hub bore follows ASME B36.10M pipe ID for the selected schedule (default Sch 40 / STD)."
            />
          ) : null}
        </div>
      }
      footerPanel={
        <div className={`${CARD_SHELL} px-4 py-5`}>
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Engineering reference
          </h3>
          <FlangeReferenceNotes />
        </div>
      }
    />
  );
}
