"use client";

import { useEffect, useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import type { OrificeTapType } from "@/lib/calculators/data/iso5167OrificeData";
import {
  calculateOrificePlateFlow,
  DEFAULT_ORIFICE_PLATE_FLOW_INPUTS,
  DELTA_P_RANGE,
  DENSITY_RANGE,
  ORIFICE_AIR_DENSITY_KG_M3,
  ORIFICE_AIR_VISCOSITY_CP,
  ORIFICE_DIAMETER_RANGE,
  ORIFICE_WATER_DENSITY_KG_M3,
  ORIFICE_WATER_VISCOSITY_CP,
  VISCOSITY_RANGE,
  type OrificePlateFlowInputs,
} from "@/lib/calculators/engines/orifice-plate-flow-meter";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { ORIFICE_PLATE_FLOW_URL_CONFIG } from "@/lib/calculators/url-configs/orifice-plate-flow-meter";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
  listAvailableNps,
  listScheduleOptionsForNps,
} from "@/lib/data/loaders";
import { kgM3ToLbFt3, mmToIn } from "@/lib/unitConverter";

type Props = { title: string; standard?: string };

type DraftKey =
  | "orificeDiameter"
  | "deltaP"
  | "fluidDensity"
  | "dynamicViscosity";

function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function OrificePlateFlowMeterCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField } = useCalculatorUrlSync<OrificePlateFlowInputs>(
    DEFAULT_ORIFICE_PLATE_FLOW_INPUTS,
    ORIFICE_PLATE_FLOW_URL_CONFIG,
    { type: "orifice-plate-flow-meter" },
  );

  const [drafts, setDrafts] = useState<Partial<Record<DraftKey, string>>>({});

  useEffect(() => {
    const options = listScheduleOptionsForNps(inputs.nps);
    if (
      options.length > 0 &&
      !options.some((o) => o.value === inputs.schedule)
    ) {
      setField(
        "schedule",
        defaultScheduleForNps(inputs.nps) ?? options[0].value,
      );
    }
  }, [inputs.nps, inputs.schedule, setField]);

  // Stale drafts keep metric strings after a unit flip (e.g. "50" shown as inches).
  useEffect(() => {
    setDrafts({});
  }, [inputs.unitSystem]);

  const output = useMemo(
    () => calculateOrificePlateFlow(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const imperial = inputs.unitSystem === "imperial";
  const dUnit = imperial ? "in" : "mm";
  const dpUnit = imperial ? "psi" : "kPa";
  const rhoUnit = imperial ? "lb/ft³" : "kg/m³";

  const npsOptions = useMemo(
    () =>
      listAvailableNps()
        .filter((p) => {
          const n = Number.parseFloat(p.nps);
          return Number.isFinite(n) && n >= 0.5 && n <= 24;
        })
        .map((p) => ({
          value: p.nps,
          label: imperial ? `NPS ${p.nps}` : `DN ${p.dn} (NPS ${p.nps})`,
        })),
    [imperial],
  );

  const scheduleOptions = useMemo(
    () =>
      listScheduleOptionsForNps(inputs.nps).map((o) => ({
        value: o.value,
        label: o.label,
      })),
    [inputs.nps],
  );

  const pipeEntry = useMemo(
    () => getPipeScheduleEntry(inputs.nps, inputs.schedule),
    [inputs.nps, inputs.schedule],
  );
  const diMm = pipeEntry?.row.insideDiameterMm ?? 0;
  const rangeDMax = imperial
    ? ORIFICE_DIAMETER_RANGE.max / 25.4
    : ORIFICE_DIAMETER_RANGE.max;
  const dMin = imperial
    ? ORIFICE_DIAMETER_RANGE.min / 25.4
    : ORIFICE_DIAMETER_RANGE.min;
  // Keep β < 1 so the ISO mass-flow term √(1−β⁴) stays real.
  const dMax =
    diMm > 0
      ? Math.min(
          rangeDMax,
          imperial ? mmToIn(diMm) * 0.99 : diMm * 0.99,
        )
      : rangeDMax;
  const dpMin = imperial ? DELTA_P_RANGE.min / 6.894757 : DELTA_P_RANGE.min;
  const dpMax = imperial ? DELTA_P_RANGE.max / 6.894757 : DELTA_P_RANGE.max;
  const rhoMin = imperial
    ? kgM3ToLbFt3(DENSITY_RANGE.min)
    : DENSITY_RANGE.min;
  const rhoMax = imperial
    ? kgM3ToLbFt3(DENSITY_RANGE.max)
    : DENSITY_RANGE.max;

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

  function densityDisplay(kgM3: number): number {
    return imperial
      ? Number(kgM3ToLbFt3(kgM3).toFixed(kgM3 < 10 ? 3 : 1))
      : kgM3;
  }

  function applyFluidPreset(kind: "water" | "air") {
    const rho =
      kind === "water"
        ? densityDisplay(ORIFICE_WATER_DENSITY_KG_M3)
        : densityDisplay(ORIFICE_AIR_DENSITY_KG_M3);
    const mu =
      kind === "water"
        ? ORIFICE_WATER_VISCOSITY_CP
        : ORIFICE_AIR_VISCOSITY_CP;
    setField("fluidDensity", rho);
    setField("dynamicViscosity", mu);
    setDrafts((prev) => {
      if (!("fluidDensity" in prev) && !("dynamicViscosity" in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next.fluidDensity;
      delete next.dynamicViscosity;
      return next;
    });
  }

  const waterRhoChip = String(densityDisplay(ORIFICE_WATER_DENSITY_KG_M3));
  const airRhoChip = String(densityDisplay(ORIFICE_AIR_DENSITY_KG_M3));

  const npsLabel =
    npsOptions.find((o) => o.value === inputs.nps)?.label ??
    `NPS ${inputs.nps}`;

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputNaturalHeight
      inputRows={[
        {
          label: imperial ? "NPS / Sch" : "DN / Sch",
          value: `${npsLabel} · Sch ${inputs.schedule}`,
        },
        {
          label: "Bore d",
          value: `${inputs.orificeDiameter} ${dUnit}`,
        },
        {
          label: "Δp",
          value: `${inputs.deltaP} ${dpUnit}`,
        },
        {
          label: "ρ",
          value: `${inputs.fluidDensity} ${rhoUnit}`,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSelect
              label={imperial ? "Pipe NPS" : "Pipe size"}
              value={inputs.nps}
              options={npsOptions}
              onChange={(value) => setField("nps", value)}
              hint="Sets ASME B36 inside diameter D_i for beta ratio"
            />
            <FieldSelect
              label="Schedule"
              value={inputs.schedule}
              options={scheduleOptions}
              onChange={(value) => setField("schedule", value)}
              hint="Wall schedule that fixes D_i"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Orifice bore d"
              unit={dUnit}
              compactUnit
              value={display("orificeDiameter")}
              allowZero={false}
              onChange={(v) => onNumChange("orificeDiameter", v, dMin, dMax)}
              onBlur={() => onNumBlur("orificeDiameter", dMin, dMax)}
              hint={`β = d/D_i · must be < D_i · ISO 0.10–0.75`}
            />
            <FieldGroup
              label="Differential pressure Δp"
              unit={dpUnit}
              compactUnit
              value={display("deltaP")}
              allowZero={false}
              onChange={(v) => onNumChange("deltaP", v, dpMin, dpMax)}
              onBlur={() => onNumBlur("deltaP", dpMin, dpMax)}
              hint="Tap differential (flange taps default)"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup
              label="Fluid density ρ"
              unit={rhoUnit}
              value={display("fluidDensity")}
              allowZero={false}
              onChange={(v) => {
                if (v === waterRhoChip) applyFluidPreset("water");
                else if (v === airRhoChip) applyFluidPreset("air");
                else onNumChange("fluidDensity", v, rhoMin, rhoMax);
              }}
              onBlur={() => onNumBlur("fluidDensity", rhoMin, rhoMax)}
              hint="Upstream ρ₁ · Water/Air also set μ"
              chips={[
                { label: "Water", value: waterRhoChip },
                { label: "Air", value: airRhoChip },
              ]}
            />
            <FieldGroup
              label="Viscosity μ"
              unit="cP"
              compactUnit
              value={display("dynamicViscosity")}
              allowZero={false}
              onChange={(v) =>
                onNumChange(
                  "dynamicViscosity",
                  v,
                  VISCOSITY_RANGE.min,
                  VISCOSITY_RANGE.max,
                )
              }
              onBlur={() =>
                onNumBlur(
                  "dynamicViscosity",
                  VISCOSITY_RANGE.min,
                  VISCOSITY_RANGE.max,
                )
              }
              hint="Water ≈ 1.0 cP · air ≈ 0.018 cP"
            />
          </div>

          <FieldSelect
            label="Pressure taps"
            value={inputs.tapType}
            options={[
              { value: "flange", label: "Flange taps" },
              { value: "corner", label: "Corner taps" },
              { value: "d-and-d2", label: "D and D/2 taps" },
            ]}
            onChange={(value) =>
              setField("tapType", value as OrificeTapType)
            }
            hint="ISO 5167-2 tap geometry for C"
          />
        </div>
      }
    />
  );
}
