/**
 * API 520 Appendix B–style gas MW / k presets for PSV reaction-force screening.
 */

import gasesRaw from "../../../../data/piping/gas-properties-api520.json";

export type Api520GasId =
  | "co2"
  | "air"
  | "steam"
  | "nitrogen"
  | "methane"
  | "hydrocarbon"
  | "custom";

type GasRow = {
  id: Api520GasId;
  label: string;
  molecularWeight: number;
  kRatio: number;
};

const GASES = (gasesRaw as { gases: GasRow[] }).gases;

export const API520_GAS_OPTIONS = GASES.map((g) => ({
  value: g.id,
  label: g.label,
}));

export function resolveApi520Gas(id: Api520GasId): GasRow {
  return GASES.find((g) => g.id === id) ?? GASES[0];
}
