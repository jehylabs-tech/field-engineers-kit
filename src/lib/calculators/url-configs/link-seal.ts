import {
  DEFAULT_LINK_SEAL_INPUTS,
  type LinkSealHardwareId,
  type LinkSealInputs,
  type LinkSealOpeningType,
} from "@/lib/calculators/engines/link-seal";
import type { UnitSystem } from "@/lib/calculators/definitions";
import { type ParamConfig } from "@/lib/calculators/url-sync";

export const LINK_SEAL_URL_CONFIG: ParamConfig<LinkSealInputs> = {
  unitSystem: {
    param: "units",
    serialize: (value: UnitSystem) => value,
    deserialize: (value: string | null, fallback: UnitSystem) =>
      value === "imperial" ? "imperial" : value === "metric" ? "metric" : fallback,
  },
  nps: {
    param: "nps",
    serialize: (value: string) => value,
    deserialize: (value: string | null, fallback: string) => value ?? fallback,
  },
  pipeOd: {
    param: "od",
    serialize: (value: number) => String(value),
    deserialize: (value: string | null, fallback: number) => {
      const n = value == null ? NaN : Number(value);
      return Number.isFinite(n) ? n : fallback;
    },
  },
  sleeveId: {
    param: "sleeve",
    serialize: (value: number) => String(value),
    deserialize: (value: string | null, fallback: number) => {
      const n = value == null ? NaN : Number(value);
      return Number.isFinite(n) ? n : fallback;
    },
  },
  openingType: {
    param: "opening",
    serialize: (value: LinkSealOpeningType) => value,
    deserialize: (value: string | null, fallback: LinkSealOpeningType) =>
      value === "core_drilled" || value === "steel_sleeve" ? value : fallback,
  },
  hardware: {
    param: "hw",
    serialize: (value: LinkSealHardwareId) => value,
    deserialize: (value: string | null, fallback: LinkSealHardwareId) =>
      value === "C" || value === "S316" || value === "T" ? value : fallback,
  },
};

export { DEFAULT_LINK_SEAL_INPUTS };
