/**
 * Pattern B: /calculator/noise-criterion/{spec}
 * Spec: {space}-nc{NN}  e.g. control-room-nc35
 */

import type { SpecRoute } from "@/lib/calculators/spec-routes";
import {
  NOISE_SPACE_OPTIONS,
  spectrumForNc,
  type NoiseSpaceType,
} from "@/lib/calculators/engines/noise-criterion";

const DUTIES: Array<{
  /** URL path segment before -ncNN (may alias space id). */
  specSpace: string;
  space: NoiseSpaceType;
  nc: number;
  label: string;
}> = [
  {
    specSpace: "control-room",
    space: "control-room",
    nc: 35,
    label: "Control Room · NC-35",
  },
  {
    specSpace: "office",
    space: "executive-office",
    nc: 30,
    label: "Executive Office · NC-30",
  },
  {
    specSpace: "equipment-room",
    space: "equipment-room",
    nc: 50,
    label: "Equipment Room · NC-50",
  },
  {
    specSpace: "workshop",
    space: "workshop",
    nc: 55,
    label: "Workshop · NC-55",
  },
];

const SPEC_SPACE_TO_TYPE: Record<string, NoiseSpaceType> = {
  "control-room": "control-room",
  office: "executive-office",
  "executive-office": "executive-office",
  "equipment-room": "equipment-room",
  workshop: "workshop",
};

function spectrumQuery(nc: number): Record<string, string> {
  const spectrum = spectrumForNc(nc);
  if (!spectrum) return {};
  return {
    s63: String(spectrum[0]),
    s125: String(spectrum[1]),
    s250: String(spectrum[2]),
    s500: String(spectrum[3]),
    s1k: String(spectrum[4]),
    s2k: String(spectrum[5]),
    s4k: String(spectrum[6]),
    s8k: String(spectrum[7]),
  };
}

export function listNoiseCriterionPseoRoutes(slug: string): SpecRoute[] {
  return DUTIES.map((duty) => ({
    slug,
    spec: `${duty.specSpace}-nc${duty.nc}`,
    query: {
      units: "metric",
      space: duty.space,
      ...spectrumQuery(duty.nc),
    },
    label: duty.label,
  }));
}

export function parseNoiseCriterionSpec(
  value: string,
): Record<string, string> | null {
  const match = value.match(
    /^(control-room|office|executive-office|equipment-room|workshop)-nc(\d+)$/i,
  );
  if (!match) return null;
  const specSpace = match[1].toLowerCase();
  const space = SPEC_SPACE_TO_TYPE[specSpace];
  const nc = Number(match[2]);
  if (!space) return null;
  if (!NOISE_SPACE_OPTIONS.some((s) => s.value === space)) return null;
  if (![15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65].includes(nc)) return null;
  return {
    units: "metric",
    space,
    ...spectrumQuery(nc),
  };
}
