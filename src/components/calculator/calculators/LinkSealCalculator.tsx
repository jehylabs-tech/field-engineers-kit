"use client";

import { useEffect, useMemo, useRef } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateLinkSeal,
  computeLinkSeal,
  DEFAULT_LINK_SEAL_INPUTS,
  defaultModelForPipeOdMm,
  idealSleeveIdMm,
  LINK_SEAL_HARDWARE_OPTIONS,
  LINK_SEAL_OPENING_OPTIONS,
  sleeveIdForUnitSystem,
  type LinkSealInputs,
} from "@/lib/calculators/engines/link-seal";
import { LINK_SEAL_MODELS } from "@/lib/calculators/engines/link-seal-catalog";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { LINK_SEAL_URL_CONFIG } from "@/lib/calculators/url-configs/link-seal";
import FieldGroup, {
  FieldChipRadio,
  FieldSelect,
  fieldLabelHint,
} from "@/components/calculator/FieldGroup";
import {
  chipsInOptions,
  COMMON_NPS_CHIPS,
} from "@/components/calculator/presets";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
  listFlangeNps,
} from "@/lib/data/loaders";

type LinkSealCalculatorProps = {
  title: string;
  standard?: string;
};

const CARD_SHELL =
  "w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-spec-border dark:bg-spec-panel";

export default function LinkSealCalculator({
  title,
  standard,
}: LinkSealCalculatorProps) {
  const { inputs, setField, setInputs } = useCalculatorUrlSync<LinkSealInputs>(
    DEFAULT_LINK_SEAL_INPUTS,
    LINK_SEAL_URL_CONFIG,
    { type: "link-seal" },
  );
  /** null = first mount (do not overwrite URL / default sleeve). */
  const lastNpsRef = useRef<string | null>(null);

  const npsOptions = useMemo(
    () =>
      listFlangeNps().map((flange) => ({
        value: flange.nps,
        label: `${flange.npsLabel} (DN ${flange.dn})`,
      })),
    [],
  );

  useEffect(() => {
    if (!inputs.nps) {
      lastNpsRef.current = "";
      return;
    }
    const schedule = defaultScheduleForNps(inputs.nps);
    const entry = getPipeScheduleEntry(inputs.nps, schedule);
    if (!entry) return;

    const odMm = entry.pipe.outsideDiameterMm;
    const od =
      inputs.unitSystem === "metric"
        ? odMm
        : Number((odMm / 25.4).toFixed(3));

    const npsChanged =
      lastNpsRef.current !== null && lastNpsRef.current !== inputs.nps;
    lastNpsRef.current = inputs.nps;

    // Changing NPS used to update OD only, leaving a large demo sleeve (e.g. 190 mm)
    // on small pipe → "No standard model". Reseed sleeve to Ideal ID for that OD class.
    if (npsChanged) {
      const model = defaultModelForPipeOdMm(odMm);
      const sleeve = sleeveIdForUnitSystem(
        idealSleeveIdMm(odMm, model),
        inputs.unitSystem,
      );
      setInputs((current) => ({
        ...current,
        pipeOd: od,
        sleeveId: sleeve,
      }));
      return;
    }

    if (Math.abs(od - inputs.pipeOd) > 0.05) {
      setField("pipeOd", od);
    }
  }, [inputs.nps, inputs.unitSystem, inputs.pipeOd, setField, setInputs]);

  const output = useMemo(() => calculateLinkSeal(inputs), [inputs]);
  usePublishCalculatorOutput(output);
  const result = useMemo(() => computeLinkSeal(inputs), [inputs]);

  const applyIdealSleeve = () => {
    if (!Number.isFinite(result.recommendedSleeveIdMm)) return;
    setField(
      "sleeveId",
      sleeveIdForUnitSystem(result.recommendedSleeveIdMm, inputs.unitSystem),
    );
  };

  const lengthUnit = inputs.unitSystem === "metric" ? "mm" : "in";
  const selectedNps = listFlangeNps().find((row) => row.nps === inputs.nps);

  const inputRows = [
    {
      label: "NPS",
      value: selectedNps?.npsLabel ?? (inputs.nps ? `${inputs.nps}"` : "Manual OD"),
    },
    { label: "Pipe OD", value: `${inputs.pipeOd} ${lengthUnit}` },
    {
      label: "Opening",
      value:
        LINK_SEAL_OPENING_OPTIONS.find((o) => o.value === inputs.openingType)
          ?.label ?? inputs.openingType,
    },
    { label: "Sleeve / hole ID", value: `${inputs.sleeveId} ${lengthUnit}` },
    {
      label: "Hardware",
      value:
        LINK_SEAL_HARDWARE_OPTIONS.find((o) => o.value === inputs.hardware)
          ?.label ?? inputs.hardware,
    },
  ];

  return (
    <CalculatorBaseLayout
      layout="formula"
      wideResult
      resultDashboard
      inputNaturalHeight
      output={output}
      exportTitle={title}
      standard={standard}
      inputRows={inputRows}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-2.5 [&_.calc-field]:mb-0">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Penetration geometry
          </h3>
          <FieldSelect
            label="Nominal pipe size (NPS)"
            value={inputs.nps || npsOptions[0]?.value || "4"}
            options={npsOptions}
            chips={chipsInOptions(COMMON_NPS_CHIPS, npsOptions)}
            onChange={(value) => setField("nps", value)}
            hint={fieldLabelHint("Nominal pipe size (NPS)")}
          />
          <FieldGroup
            label="Pipe outside diameter (OD)"
            hint="Autofills from NPS Sch 40 / STD. Override for coated, insulated, or non-standard OD."
            value={inputs.pipeOd}
            onChange={(value) => {
              const n = Number(value);
              setInputs((current) => ({
                ...current,
                pipeOd: Number.isFinite(n) ? n : current.pipeOd,
                nps: "",
              }));
            }}
            unit={lengthUnit}
            highlight="od"
            autoFocus
          />
          <FieldChipRadio
            wide
            label="Wall opening type"
            value={inputs.openingType}
            options={LINK_SEAL_OPENING_OPTIONS}
            onChange={(value) =>
              setField("openingType", value as LinkSealInputs["openingType"])
            }
            hint="Core-drilled / cast holes and steel Century-Line style sleeves use the same annular-space math; enter the finished ID."
          />
          <FieldGroup
            label="Sleeve ID / hole diameter"
            hint="Inner diameter of the wall sleeve or finished core-drilled hole. Changing NPS reseeds this to an Ideal ID for that pipe size."
            value={inputs.sleeveId}
            onChange={(value) => {
              const n = Number(value);
              if (Number.isFinite(n)) setField("sleeveId", n);
            }}
            unit={lengthUnit}
            highlight="bore"
          />
          {!result.model && Number.isFinite(result.recommendedSleeveIdMm) ? (
            <button
              type="button"
              onClick={applyIdealSleeve}
              className="self-start rounded-md border border-amber-300/80 bg-amber-50 px-2.5 py-1.5 text-left text-[11px] font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
            >
              Apply Ideal sleeve ID
              {result.nearestModel
                ? ` (${sleeveIdForUnitSystem(result.recommendedSleeveIdMm, inputs.unitSystem)} ${lengthUnit} → ${result.nearestModel.id})`
                : ""}
            </button>
          ) : null}
          <FieldChipRadio
            wide
            label="Hardware / elastomer"
            value={inputs.hardware}
            options={LINK_SEAL_HARDWARE_OPTIONS}
            onChange={(value) =>
              setField("hardware", value as LinkSealInputs["hardware"])
            }
            hint="C = zinc-plated CS bolts (standard). S316 = stainless hardware. T = silicone high-temperature links."
          />
        </div>
      }
      footerPanel={
        <div className={`${CARD_SHELL} px-4 py-5`}>
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Link-Seal model chart (screening)
          </h3>
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-spec-border">
            <table className="w-full min-w-[28rem] text-left text-[11px]">
              <thead className="bg-slate-100/80 font-semibold text-slate-700 dark:bg-spec-panel dark:text-slate-300">
                <tr>
                  <th className="px-2 py-1.5">Model</th>
                  <th className="px-2 py-1.5">Free t</th>
                  <th className="px-2 py-1.5">Belt</th>
                  <th className="px-2 py-1.5">Annular C range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-spec-border">
                {LINK_SEAL_MODELS.map((row) => {
                  const active =
                    Boolean(result.model) && result.model?.id === row.id;
                  const suggested =
                    !result.model && result.nearestModel?.id === row.id;
                  return (
                    <tr
                      key={row.id}
                      className={
                        active
                          ? "bg-emerald-50/80 dark:bg-emerald-950/30"
                          : suggested
                            ? "bg-amber-50/70 dark:bg-amber-950/25"
                            : "bg-white dark:bg-spec-bg"
                      }
                    >
                      <td className="px-2 py-1.5 font-semibold text-slate-800 dark:text-slate-100">
                        {row.id}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-slate-600 dark:text-slate-300">
                        {inputs.unitSystem === "metric"
                          ? `${row.freeThicknessMm.toFixed(1)} mm`
                          : `${(row.freeThicknessMm / 25.4).toFixed(3)} in`}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-slate-600 dark:text-slate-300">
                        {inputs.unitSystem === "metric"
                          ? `${row.beltWidthMm.toFixed(1)} mm`
                          : `${(row.beltWidthMm / 25.4).toFixed(3)} in`}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-slate-600 dark:text-slate-300">
                        {inputs.unitSystem === "metric"
                          ? `${row.annularMinMm.toFixed(1)}–${row.annularMaxMm.toFixed(1)} mm`
                          : `${(row.annularMinMm / 25.4).toFixed(3)}–${(row.annularMaxMm / 25.4).toFixed(3)} in`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-spec-text2">
            Screening envelopes ≈ 0.80–1.20 × free thickness. Pitch diameter (Dp) =
            link-bolt centerline; Ideal minimum sleeve ID = OD + 2·t_free (seats free
            thickness). Full formulas, worked example, and FAQ:{" "}
            <a
              href="#engineering-reference"
              className="font-medium text-spec-accent underline-offset-2 hover:underline"
            >
              Engineering Reference below
            </a>
            .
          </p>
          <aside
            className="mt-3 rounded-md border border-amber-200/80 bg-amber-50/60 px-3 py-2.5 text-[11px] leading-relaxed text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100"
            aria-label="Engineering disclaimer and trademark notice"
          >
            <p className="m-0 font-semibold">Engineering disclaimer &amp; legal notice</p>
            <p className="mt-1 mb-0">
              Screening only — verify model, link count, and clearances against the
              current official GPT Industries Link-Seal® sizing chart before procurement
              or installation. Provided AS IS without warranty. Link-Seal® and
              Century-Line® are registered trademarks of GPT Industries. FieldEngineersKit
              is an independent tool and is not affiliated with, sponsored, or endorsed by
              GPT Industries.
            </p>
          </aside>
        </div>
      }
    />
  );
}
