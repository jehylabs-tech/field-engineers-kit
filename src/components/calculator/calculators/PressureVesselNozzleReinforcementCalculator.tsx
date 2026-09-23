"use client";

import { useEffect, useMemo, useRef } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import NozzleReinforcementResultPanel from "@/components/calculator/calculators/NozzleReinforcementResultPanel";
import NozzleRepadSchematic from "@/components/calculator/schematics/NozzleRepadSchematic";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  ASME_VIII_NOZZLE_MATERIAL_IDS,
  ASME_VIII_SHELL_MATERIAL_IDS,
  type AsmeViiiNozzleMaterialId,
  type AsmeViiiShellMaterialId,
} from "@/lib/calculators/data/asmeViiiDiv1AllowableStress";
import {
  CA_RANGE_IN,
  CA_RANGE_MM,
  DI_RANGE_IN,
  DI_RANGE_MM,
  DP_RANGE_IN,
  DP_RANGE_MM,
  JOINT_EFFICIENCY_OPTIONS,
  P_RANGE_MPA,
  P_RANGE_PSI,
  SHELL_TYPE_OPTIONS,
  T_NOZ_RANGE_IN,
  T_NOZ_RANGE_MM,
  T_RANGE_C,
  T_RANGE_F,
  T_SHELL_RANGE_IN,
  T_SHELL_RANGE_MM,
  TP_RANGE_IN,
  TP_RANGE_MM,
  calculatePressureVesselNozzleReinforcement,
  computePressureVesselNozzleReinforcement,
  convertPressureVesselNozzleReinforcementUnitSystem,
  formatNozzleLength,
  formatNozzleMaterialOption,
  listNozzleNpsOptions,
  lookupNozzlePipeGeometry,
  type NozzleJointEfficiencyId,
  type NozzleShellTypeId,
  type PressureVesselNozzleReinforcementInputs,
} from "@/lib/calculators/engines/pressure-vessel-nozzle-reinforcement";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import {
  DEFAULT_PRESSURE_VESSEL_NOZZLE_REINFORCEMENT_INPUTS,
  PRESSURE_VESSEL_NOZZLE_REINFORCEMENT_URL_CONFIG,
} from "@/lib/calculators/url-configs/pressure-vessel-nozzle-reinforcement";
import { listScheduleOptionsForNps } from "@/lib/data/loaders";

type Props = { title: string; standard?: string };

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type Preset = {
  id: string;
  label: string;
  patch: Partial<PressureVesselNozzleReinforcementInputs>;
};

function presetMatches(
  inputs: PressureVesselNozzleReinforcementInputs,
  preset: Preset,
): boolean {
  const p = preset.patch;
  return (
    (p.shellInsideDiameter == null ||
      inputs.shellInsideDiameter === p.shellInsideDiameter) &&
    (p.designPressure == null || inputs.designPressure === p.designPressure) &&
    (p.nozzleNps == null || inputs.nozzleNps === p.nozzleNps) &&
    (p.shellThickness == null || inputs.shellThickness === p.shellThickness) &&
    (p.padThickness == null || inputs.padThickness === p.padThickness) &&
    (p.unitSystem == null || inputs.unitSystem === p.unitSystem)
  );
}

const METRIC_PRESETS: Preset[] = [
  {
    id: "nps6-1200-2",
    label: "NPS 6 · 1200 mm · 2.0 MPa",
    patch: {
      unitSystem: "metric",
      shellType: "cylindrical-shell",
      shellInsideDiameter: 1200,
      designPressure: 2,
      designTemperature: 150,
      shellThickness: 16,
      shellMaterialId: "SA-516-70",
      jointEfficiency: 1,
      nozzleNps: "6",
      nozzleOutsideDiameter: 168.3,
      nozzleThickness: 11,
      nozzleMaterialId: "SA-106-B",
      corrosionAllowance: 3,
      padOutsideDiameter: 300,
      padThickness: 12,
    },
  },
  {
    id: "nps12-1500-3",
    label: "NPS 12 · 1500 mm · 3.0 MPa",
    patch: {
      unitSystem: "metric",
      shellType: "cylindrical-shell",
      shellInsideDiameter: 1500,
      designPressure: 3,
      designTemperature: 200,
      shellThickness: 18,
      shellMaterialId: "SA-516-70",
      jointEfficiency: 1,
      nozzleNps: "12",
      nozzleOutsideDiameter: 323.85,
      nozzleThickness: 12.7,
      nozzleMaterialId: "SA-106-B",
      corrosionAllowance: 3,
      padOutsideDiameter: 500,
      padThickness: 16,
    },
  },
];

const IMPERIAL_PRESETS: Preset[] = [
  {
    id: "nps4-48-300",
    label: "NPS 4 · 48 in · 300 psi",
    patch: {
      unitSystem: "imperial",
      shellType: "cylindrical-shell",
      shellInsideDiameter: 48,
      designPressure: 300,
      designTemperature: 300,
      shellThickness: 0.625,
      shellMaterialId: "SA-516-70",
      jointEfficiency: 1,
      nozzleNps: "4",
      nozzleOutsideDiameter: 4.5,
      nozzleThickness: 0.337,
      nozzleMaterialId: "SA-106-B",
      corrosionAllowance: 0.125,
      padOutsideDiameter: 12,
      padThickness: 0.5,
    },
  },
  {
    id: "nps10-60-450",
    label: "NPS 10 · 60 in · 450 psi",
    patch: {
      unitSystem: "imperial",
      shellType: "cylindrical-shell",
      shellInsideDiameter: 60,
      designPressure: 450,
      designTemperature: 350,
      shellThickness: 0.75,
      shellMaterialId: "SA-240-316L",
      jointEfficiency: 1,
      nozzleNps: "10",
      nozzleOutsideDiameter: 10.75,
      nozzleThickness: 0.365,
      nozzleMaterialId: "SA-312-316L",
      corrosionAllowance: 0,
      padOutsideDiameter: 20,
      padThickness: 0.5,
    },
  },
];

export default function PressureVesselNozzleReinforcementCalculator({
  title,
  standard,
}: Props) {
  const { inputs, setField, setInputs } =
    useCalculatorUrlSync<PressureVesselNozzleReinforcementInputs>(
      DEFAULT_PRESSURE_VESSEL_NOZZLE_REINFORCEMENT_INPUTS,
      PRESSURE_VESSEL_NOZZLE_REINFORCEMENT_URL_CONFIG,
      { type: "pressure-vessel-nozzle-reinforcement" },
    );

  const output = useMemo(
    () => calculatePressureVesselNozzleReinforcement(inputs),
    [inputs],
  );
  const computed = useMemo(
    () => computePressureVesselNozzleReinforcement(inputs),
    [inputs],
  );
  usePublishCalculatorOutput(output);

  const seededUnitSystemRef = useRef(inputs.unitSystem);
  const allowUnitConvertRef = useRef(false);
  const lastNpsRef = useRef(inputs.nozzleNps);

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

    const shouldConvert = allowUnitConvertRef.current;
    allowUnitConvertRef.current = false;
    if (!shouldConvert) return;

    setInputs((current) =>
      convertPressureVesselNozzleReinforcementUnitSystem(
        { ...current, unitSystem: from },
        to,
      ),
    );
  }, [inputs.unitSystem, setInputs]);

  // When NPS changes, refresh B36 OD + Sch 80 wall (user can still edit after).
  useEffect(() => {
    if (lastNpsRef.current === inputs.nozzleNps) return;
    lastNpsRef.current = inputs.nozzleNps;
    const geo = lookupNozzlePipeGeometry(
      inputs.nozzleNps,
      "80",
      inputs.unitSystem,
    );
    if (!geo) return;
    setInputs((current) => ({
      ...current,
      nozzleOutsideDiameter: Number(geo.outsideDiameter.toFixed(3)),
      nozzleThickness: Number(geo.wallThickness.toFixed(3)),
    }));
  }, [inputs.nozzleNps, inputs.unitSystem, setInputs]);

  const unit = inputs.unitSystem === "imperial" ? "in" : "mm";
  const pressureUnit = inputs.unitSystem === "imperial" ? "psi" : "MPa";
  const tempUnit = inputs.unitSystem === "imperial" ? "°F" : "°C";

  const npsOptions = useMemo(() => listNozzleNpsOptions(), []);
  const scheduleOptions = useMemo(
    () => listScheduleOptionsForNps(inputs.nozzleNps),
    [inputs.nozzleNps],
  );
  const shellOptions = useMemo(
    () =>
      SHELL_TYPE_OPTIONS.map((o) => ({
        value: o.value,
        label: `${o.label} · ${o.ugRef}`,
      })),
    [],
  );
  const shellMatOptions = useMemo(
    () =>
      ASME_VIII_SHELL_MATERIAL_IDS.map((id) => ({
        value: id,
        label: formatNozzleMaterialOption(
          id,
          inputs.designTemperature,
          inputs.unitSystem,
        ),
      })),
    [inputs.designTemperature, inputs.unitSystem],
  );
  const nozMatOptions = useMemo(
    () =>
      ASME_VIII_NOZZLE_MATERIAL_IDS.map((id) => ({
        value: id,
        label: formatNozzleMaterialOption(
          id,
          inputs.designTemperature,
          inputs.unitSystem,
        ),
      })),
    [inputs.designTemperature, inputs.unitSystem],
  );
  const jointOptions = useMemo(
    () =>
      JOINT_EFFICIENCY_OPTIONS.map((o) => ({
        value: String(o.value),
        label: o.label,
      })),
    [],
  );

  const presets =
    inputs.unitSystem === "imperial" ? IMPERIAL_PRESETS : METRIC_PRESETS;

  function applyPreset(
    preset: (typeof METRIC_PRESETS)[number] | (typeof IMPERIAL_PRESETS)[number],
  ) {
    if (preset.patch.nozzleNps) {
      lastNpsRef.current = preset.patch.nozzleNps;
    }
    setInputs((current) => ({
      ...current,
      ...preset.patch,
    }));
  }

  function applySchedule(schedule: string) {
    const geo = lookupNozzlePipeGeometry(
      inputs.nozzleNps,
      schedule,
      inputs.unitSystem,
    );
    if (!geo) return;
    setInputs((current) => ({
      ...current,
      nozzleOutsideDiameter: Number(geo.outsideDiameter.toFixed(3)),
      nozzleThickness: Number(geo.wallThickness.toFixed(3)),
    }));
  }

  const diRange = inputs.unitSystem === "imperial" ? DI_RANGE_IN : DI_RANGE_MM;
  const pRange = inputs.unitSystem === "imperial" ? P_RANGE_PSI : P_RANGE_MPA;
  const tRange = inputs.unitSystem === "imperial" ? T_RANGE_F : T_RANGE_C;
  const caRange = inputs.unitSystem === "imperial" ? CA_RANGE_IN : CA_RANGE_MM;
  const tShellRange =
    inputs.unitSystem === "imperial" ? T_SHELL_RANGE_IN : T_SHELL_RANGE_MM;
  const tNozRange =
    inputs.unitSystem === "imperial" ? T_NOZ_RANGE_IN : T_NOZ_RANGE_MM;
  const dpRange = inputs.unitSystem === "imperial" ? DP_RANGE_IN : DP_RANGE_MM;
  const tpRange = inputs.unitSystem === "imperial" ? TP_RANGE_IN : TP_RANGE_MM;

  const shellMeta =
    SHELL_TYPE_OPTIONS.find((o) => o.value === inputs.shellType) ??
    SHELL_TYPE_OPTIONS[0];

  const sLiveShell = formatNozzleMaterialOption(
    inputs.shellMaterialId,
    inputs.designTemperature,
    inputs.unitSystem,
  ).split(" — ")[1];
  const sLiveNoz = formatNozzleMaterialOption(
    inputs.nozzleMaterialId,
    inputs.designTemperature,
    inputs.unitSystem,
  ).split(" — ")[1];

  const schematic = (
    <NozzleRepadSchematic
      dLabel={
        computed.invalid
          ? "—"
          : `${formatNozzleLength(computed.d, inputs.unitSystem)} ${unit}`
      }
      doutLabel={`${formatNozzleLength(inputs.nozzleOutsideDiameter, inputs.unitSystem)} ${unit}`}
      dpLabel={`${formatNozzleLength(inputs.padOutsideDiameter, inputs.unitSystem)} ${unit}`}
      tpLabel={`${formatNozzleLength(inputs.padThickness, inputs.unitSystem)} ${unit}`}
      tShellLabel={
        computed.invalid
          ? undefined
          : `${formatNozzleLength(computed.t, inputs.unitSystem)} ${unit}`
      }
      pressureLabel={`${
        inputs.unitSystem === "imperial"
          ? Math.round(inputs.designPressure)
          : Number(inputs.designPressure.toFixed(2))
      } ${pressureUnit}`}
    />
  );

  const inputRows = [
    { label: "Shell", value: shellMeta.label },
    {
      label: "D_i",
      value: `${formatNozzleLength(inputs.shellInsideDiameter, inputs.unitSystem)} ${unit}`,
    },
    {
      label: "P",
      value: `${
        inputs.unitSystem === "imperial"
          ? Math.round(inputs.designPressure)
          : Number(inputs.designPressure.toFixed(2))
      } ${pressureUnit}`,
    },
    { label: "Nozzle", value: `NPS ${inputs.nozzleNps}` },
    {
      label: "t_p",
      value: `${formatNozzleLength(inputs.padThickness, inputs.unitSystem)} ${unit}`,
    },
  ];

  return (
    <CalculatorBaseLayout
      layout="formula"
      resultDashboard
      inputNaturalHeight
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      resultPanel={
        <NozzleReinforcementResultPanel
          output={output}
          exportTitle={title}
          standard={standard}
          inputRows={inputRows}
          afterHero={schematic}
        />
      }
      inputPanel={
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2.5 [&_.calc-field]:mb-0 [&_.calc-field]:max-w-none">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active = presetMatches(inputs, preset);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
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

          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Shell / head
          </h3>
          <FieldSelect
            label="Shell type"
            value={inputs.shellType}
            options={shellOptions}
            onChange={(value) =>
              setField("shellType", value as NozzleShellTypeId)
            }
            hint="UG-27 cylinder or UG-32 head required thickness for t_r"
          />
          <div className="grid grid-cols-2 gap-2">
            <FieldGroup
              label="Shell inside diameter (D_i)"
              hint={`${diRange.min}–${diRange.max} ${unit}`}
              value={Number(
                formatNozzleLength(
                  inputs.shellInsideDiameter,
                  inputs.unitSystem,
                ),
              )}
              onChange={(value) =>
                setField(
                  "shellInsideDiameter",
                  Math.min(
                    diRange.max,
                    Math.max(
                      diRange.min,
                      toNumber(value, inputs.shellInsideDiameter),
                    ),
                  ),
                )
              }
              unit={unit}
              highlight="d"
            />
            <FieldGroup
              label="Design pressure (P)"
              hint={`${pRange.min}–${pRange.max} ${pressureUnit}`}
              value={
                inputs.unitSystem === "imperial"
                  ? Math.round(inputs.designPressure)
                  : Number(inputs.designPressure.toFixed(2))
              }
              onChange={(value) =>
                setField(
                  "designPressure",
                  Math.min(
                    pRange.max,
                    Math.max(
                      pRange.min,
                      toNumber(value, inputs.designPressure),
                    ),
                  ),
                )
              }
              unit={pressureUnit}
              highlight="P"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FieldGroup
              label="Design temperature (T)"
              hint={`${tRange.min}–${tRange.max} ${tempUnit}`}
              value={Math.round(inputs.designTemperature)}
              onChange={(value) =>
                setField(
                  "designTemperature",
                  Math.min(
                    tRange.max,
                    Math.max(
                      tRange.min,
                      toNumber(value, inputs.designTemperature),
                    ),
                  ),
                )
              }
              unit={tempUnit}
            />
            <FieldGroup
              label="Shell thickness (t_shell)"
              hint={`Nominal as-furnished · ${tShellRange.min}–${tShellRange.max} ${unit}`}
              value={Number(
                formatNozzleLength(inputs.shellThickness, inputs.unitSystem),
              )}
              onChange={(value) =>
                setField(
                  "shellThickness",
                  Math.min(
                    tShellRange.max,
                    Math.max(
                      tShellRange.min,
                      toNumber(value, inputs.shellThickness),
                    ),
                  ),
                )
              }
              unit={unit}
              highlight="t"
            />
          </div>
          <FieldSelect
            label="Shell material"
            value={inputs.shellMaterialId}
            options={shellMatOptions}
            onChange={(value) =>
              setField("shellMaterialId", value as AsmeViiiShellMaterialId)
            }
          />
          {sLiveShell ? (
            <p className="m-0 -mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              S<sub>shell</sub> = {sLiveShell} at {Math.round(inputs.designTemperature)}
              {tempUnit}
            </p>
          ) : null}
          <FieldSelect
            label="Joint efficiency (E₁)"
            value={String(inputs.jointEfficiency)}
            options={jointOptions}
            onChange={(value) =>
              setField(
                "jointEfficiency",
                Number(value) as NozzleJointEfficiencyId,
              )
            }
          />

          <h3 className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nozzle
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <FieldSelect
              label="Nozzle NPS"
              value={inputs.nozzleNps}
              options={npsOptions}
              onChange={(value) => setField("nozzleNps", value)}
              hint="Changing NPS loads B36.10M Sch 80 OD and wall — edit after if needed"
            />
            <FieldSelect
              label="Fill from schedule"
              value=""
              options={[
                { value: "", label: "Select schedule…" },
                ...scheduleOptions.map((o) => ({
                  value: o.value,
                  label: o.label,
                })),
              ]}
              onChange={(value) => {
                if (value) applySchedule(value);
              }}
              hint="Optional — writes d_out and t_nozzle from B36 schedule"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FieldGroup
              label="Nozzle OD (d_out)"
              value={Number(
                formatNozzleLength(
                  inputs.nozzleOutsideDiameter,
                  inputs.unitSystem,
                ),
              )}
              onChange={(value) =>
                setField(
                  "nozzleOutsideDiameter",
                  toNumber(value, inputs.nozzleOutsideDiameter),
                )
              }
              unit={unit}
            />
            <FieldGroup
              label="Nozzle wall (t_nozzle)"
              hint={`${tNozRange.min}–${tNozRange.max} ${unit}`}
              value={Number(
                formatNozzleLength(inputs.nozzleThickness, inputs.unitSystem),
              )}
              onChange={(value) =>
                setField(
                  "nozzleThickness",
                  Math.min(
                    tNozRange.max,
                    Math.max(
                      tNozRange.min,
                      toNumber(value, inputs.nozzleThickness),
                    ),
                  ),
                )
              }
              unit={unit}
            />
          </div>
          <FieldSelect
            label="Nozzle material"
            value={inputs.nozzleMaterialId}
            options={nozMatOptions}
            onChange={(value) =>
              setField("nozzleMaterialId", value as AsmeViiiNozzleMaterialId)
            }
          />
          {sLiveNoz ? (
            <p className="m-0 -mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              S<sub>noz</sub> = {sLiveNoz}
              {computed.fr2 < 1 - 1e-9
                ? ` · f_r2 = ${computed.fr2.toFixed(3)}`
                : ""}
            </p>
          ) : null}
          <FieldGroup
            label="Corrosion allowance (C.A.)"
            hint={`Deducted from shell and nozzle walls · ${caRange.min}–${caRange.max} ${unit}`}
            value={Number(
              formatNozzleLength(inputs.corrosionAllowance, inputs.unitSystem),
            )}
            onChange={(value) =>
              setField(
                "corrosionAllowance",
                Math.min(
                  caRange.max,
                  Math.max(
                    caRange.min,
                    toNumber(value, inputs.corrosionAllowance),
                  ),
                ),
              )
            }
            unit={unit}
          />

          <h3 className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Reinforcement pad
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <FieldGroup
              label="Pad outer diameter (D_p)"
              hint={`Must exceed d_out · ${dpRange.min}–${dpRange.max} ${unit}`}
              value={Number(
                formatNozzleLength(
                  inputs.padOutsideDiameter,
                  inputs.unitSystem,
                ),
              )}
              onChange={(value) =>
                setField(
                  "padOutsideDiameter",
                  Math.min(
                    dpRange.max,
                    Math.max(
                      dpRange.min,
                      toNumber(value, inputs.padOutsideDiameter),
                    ),
                  ),
                )
              }
              unit={unit}
              highlight="A"
            />
            <FieldGroup
              label="Pad thickness (t_p)"
              hint={`0 = screen without pad metal · ${tpRange.min}–${tpRange.max} ${unit}`}
              value={Number(
                formatNozzleLength(inputs.padThickness, inputs.unitSystem),
              )}
              onChange={(value) =>
                setField(
                  "padThickness",
                  Math.min(
                    tpRange.max,
                    Math.max(
                      tpRange.min,
                      toNumber(value, inputs.padThickness),
                    ),
                  ),
                )
              }
              unit={unit}
              highlight="A"
            />
          </div>
        </div>
      }
    />
  );
}
