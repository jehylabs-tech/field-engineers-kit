/**
 * Screen gas MW and k = Cp/Cv for compressor polytropic screening.
 * Values are common GPSA / industrial handbook screening defaults — not EOS.
 */

export type CompressorGasType =
  | "air"
  | "natural_gas"
  | "nitrogen"
  | "custom";

export type GasPropertyRow = {
  id: CompressorGasType;
  label: string;
  /** Molecular weight g/mol (= kg/kmol). */
  molecularWeight: number;
  /** Specific heat ratio k = Cp/Cv. */
  kRatio: number;
  /** Typical average compressibility for moderate-pressure screening. */
  zDefault: number;
};

export const COMPRESSOR_GAS_PROPERTIES: readonly GasPropertyRow[] = [
  {
    id: "air",
    label: "Air",
    molecularWeight: 28.97,
    kRatio: 1.4,
    zDefault: 1.0,
  },
  {
    id: "natural_gas",
    label: "Natural gas (lean)",
    molecularWeight: 18.5,
    kRatio: 1.28,
    zDefault: 0.95,
  },
  {
    id: "nitrogen",
    label: "Nitrogen",
    molecularWeight: 28.01,
    kRatio: 1.4,
    zDefault: 1.0,
  },
  {
    id: "custom",
    label: "Custom",
    molecularWeight: 18.5,
    kRatio: 1.28,
    zDefault: 0.95,
  },
] as const;

export function getCompressorGasProps(
  gasType: CompressorGasType,
): GasPropertyRow {
  return (
    COMPRESSOR_GAS_PROPERTIES.find((g) => g.id === gasType) ??
    COMPRESSOR_GAS_PROPERTIES[1]
  );
}
