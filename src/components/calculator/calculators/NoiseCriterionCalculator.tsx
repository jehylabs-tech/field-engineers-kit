"use client";

import { useMemo, useState } from "react";
import CalculatorBaseLayout from "@/components/calculator/CalculatorBaseLayout";
import FieldGroup, { FieldSelect } from "@/components/calculator/FieldGroup";
import NcRatingChart from "@/components/calculator/schematics/NcRatingChart";
import { usePublishCalculatorOutput } from "@/components/calculator/usePublishCalculatorOutput";
import {
  calculateNoiseCriterion,
  computeNoiseCriterion,
  DEFAULT_NOISE_CRITERION_INPUTS,
  NC_FREQUENCIES_HZ,
  NOISE_SPACE_OPTIONS,
  SPL_FIELD_KEYS,
  SPL_RANGE,
  type NoiseCriterionInputs,
  type NoiseSpaceType,
  type SplFieldKey,
} from "@/lib/calculators/engines/noise-criterion";
import { useCalculatorUrlSync } from "@/lib/calculators/url-sync";
import { NOISE_CRITERION_URL_CONFIG } from "@/lib/calculators/url-configs/noise-criterion";

type Props = { title: string; standard?: string };

const BAND_LABELS: Record<SplFieldKey, string> = {
  spl63Hz: "63 Hz",
  spl125Hz: "125 Hz",
  spl250Hz: "250 Hz",
  spl500Hz: "500 Hz",
  spl1000Hz: "1000 Hz",
  spl2000Hz: "2000 Hz",
  spl4000Hz: "4000 Hz",
  spl8000Hz: "8000 Hz",
};

function parseSplDraft(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === ".") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function NoiseCriterionCalculator({ title, standard }: Props) {
  const { inputs, setField } = useCalculatorUrlSync<NoiseCriterionInputs>(
    DEFAULT_NOISE_CRITERION_INPUTS,
    NOISE_CRITERION_URL_CONFIG,
    { type: "noise-criterion" },
  );

  /** Draft strings so clearing / retyping a band does not snap back mid-edit. */
  const [splDrafts, setSplDrafts] = useState<
    Partial<Record<SplFieldKey, string>>
  >({});

  const output = useMemo(() => calculateNoiseCriterion(inputs), [inputs]);
  const computed = useMemo(() => computeNoiseCriterion(inputs), [inputs]);
  usePublishCalculatorOutput(output);

  const chart = (
    <NcRatingChart
      spectrum={computed.spectrum}
      ncRating={computed.ncRating}
      tangentBandIndex={computed.tangentBandIndex}
      spaceMaxNc={computed.maxNcAllowed}
      invalid={computed.invalid}
    />
  );

  function splDisplay(key: SplFieldKey): string {
    return splDrafts[key] ?? String(inputs[key]);
  }

  return (
    <CalculatorBaseLayout
      layout="formula"
      output={output}
      exportTitle={title}
      standard={standard}
      inputNaturalHeight
      afterHero={chart}
      inputRows={[
        {
          label: "Space",
          value:
            NOISE_SPACE_OPTIONS.find((s) => s.value === inputs.spaceType)
              ?.label ?? inputs.spaceType,
        },
      ]}
      inputPanel={
        <div className="flex w-full min-w-0 flex-col gap-3">
          <FieldSelect
            label="Space type"
            value={inputs.spaceType}
            options={NOISE_SPACE_OPTIONS.map((s) => ({
              value: s.value,
              label: `${s.label} (max NC-${s.maxNc})`,
            }))}
            onChange={(value) =>
              setField("spaceType", value as NoiseSpaceType)
            }
            hint="ASHRAE HVAC Applications screening limit for Pass/Fail"
          />

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              Octave-band SPL L_p (dB) · {NC_FREQUENCIES_HZ[0]}–
              {NC_FREQUENCIES_HZ[NC_FREQUENCIES_HZ.length - 1]} Hz
            </p>
            <p className="mb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Enter sound pressure level for each octave band from a meter or
              HVAC report. Rated NC updates live; Pass/Fail uses the space
              limit above.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SPL_FIELD_KEYS.map((key) => (
                <FieldGroup
                  key={key}
                  label={BAND_LABELS[key]}
                  unit="dB"
                  compactUnit
                  value={splDisplay(key)}
                  allowZero
                  onChange={(value) => {
                    setSplDrafts((prev) => ({ ...prev, [key]: value }));
                    const parsed = parseSplDraft(value);
                    if (parsed != null) {
                      setField(
                        key,
                        Math.min(
                          SPL_RANGE.max,
                          Math.max(SPL_RANGE.min, parsed),
                        ),
                      );
                    }
                  }}
                  onBlur={() => {
                    setSplDrafts((prev) => {
                      const raw = prev[key];
                      if (raw !== undefined) {
                        const parsed = parseSplDraft(raw);
                        if (parsed != null) {
                          setField(
                            key,
                            Math.min(
                              SPL_RANGE.max,
                              Math.max(SPL_RANGE.min, parsed),
                            ),
                          );
                        }
                      }
                      if (!(key in prev)) return prev;
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                  }}
                  hint={`${SPL_RANGE.min}–${SPL_RANGE.max} dB`}
                />
              ))}
            </div>
          </div>
        </div>
      }
    />
  );
}
