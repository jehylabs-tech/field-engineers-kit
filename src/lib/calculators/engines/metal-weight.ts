import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";

export type MetalShape = "pipe" | "tube" | "plate" | "bar" | "structural";

export type MetalMaterial =
  | "ss316l"
  | "copper"
  | "brass"
  | "inconel"
  | "titanium"
  | "monel"
  | "carbon-steel"
  | "stainless-304"
  | "aluminum";

export type MetalCurrency = "USD" | "KRW" | "EUR";
export type MetalPriceBasis = "kg" | "ton" | "m";
/** Tube wall entry mode: linear dimension or Birmingham Wire Gauge. */
export type MetalWallMode = "dim" | "bwg";

/** Common tubing BWG → wall thickness (inch). */
export const BWG_WALL_INCH: Record<number, number> = {
  7: 0.18,
  8: 0.165,
  9: 0.148,
  10: 0.134,
  11: 0.12,
  12: 0.109,
  13: 0.095,
  14: 0.083,
  15: 0.072,
  16: 0.065,
  17: 0.058,
  18: 0.049,
  19: 0.042,
  20: 0.035,
  21: 0.032,
  22: 0.028,
  24: 0.022,
};

export const BWG_OPTIONS = Object.keys(BWG_WALL_INCH)
  .map(Number)
  .sort((a, b) => a - b);

export function wallFromBwg(
  bwg: number,
  unitSystem: UnitSystem,
): number {
  const inch = BWG_WALL_INCH[bwg];
  if (!inch) return 0;
  return unitSystem === "imperial"
    ? Number(inch.toFixed(4))
    : Number((inch * 25.4).toFixed(3));
}

/** Heat-exchanger / instrumentation alloys first, then general construction metals. */
export const METAL_DENSITIES: Record<
  MetalMaterial,
  { label: string; density: number; group: "hx" | "general" }
> = {
  ss316l: { label: "SS316L", density: 8000, group: "hx" },
  copper: { label: "Copper", density: 8960, group: "hx" },
  brass: { label: "Brass", density: 8500, group: "hx" },
  inconel: { label: "Inconel 625", density: 8440, group: "hx" },
  titanium: { label: "Titanium Gr.2", density: 4510, group: "hx" },
  monel: { label: "Monel 400", density: 8830, group: "hx" },
  "carbon-steel": { label: "Carbon Steel", density: 7850, group: "general" },
  "stainless-304": { label: "Stainless 304", density: 8000, group: "general" },
  aluminum: { label: "Aluminum 6061", density: 2700, group: "general" },
};

export const METAL_SHAPE_OPTIONS: { value: MetalShape; label: string }[] = [
  { value: "pipe", label: "Pipe" },
  { value: "tube", label: "Tube" },
  { value: "plate", label: "Plate / Sheet" },
  { value: "bar", label: "Round Bar" },
  { value: "structural", label: "Structural (Beam/Channel)" },
];

export const METAL_MATERIAL_ORDER: MetalMaterial[] = [
  "ss316l",
  "copper",
  "brass",
  "inconel",
  "titanium",
  "monel",
  "carbon-steel",
  "stainless-304",
  "aluminum",
];

export const METAL_CURRENCY_OPTIONS: {
  value: MetalCurrency;
  label: string;
  symbol: string;
}[] = [
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "KRW", label: "KRW (₩)", symbol: "₩" },
  { value: "EUR", label: "EUR (€)", symbol: "€" },
];

export const METAL_PRICE_BASIS_OPTIONS: {
  value: MetalPriceBasis;
  label: string;
}[] = [
  { value: "kg", label: "/kg" },
  { value: "ton", label: "/ton" },
  { value: "m", label: "/m" },
];

export type MetalWeightInputs = {
  unitSystem: UnitSystem;
  shape: MetalShape;
  material: MetalMaterial;
  length: number;
  width: number;
  /** Plate thickness, tube wall, or structural leg thickness. */
  thickness: number;
  outerDiameter: number;
  innerDiameter: number;
  nps: string;
  schedule: string;
  unitPrice: number;
  currency: MetalCurrency;
  priceBasis: MetalPriceBasis;
  quantity: number;
  /** Tube wall input: direct mm/in or BWG gauge. */
  wallMode: MetalWallMode;
  /** Selected BWG when wallMode === "bwg". */
  bwg: number;
};

function finiteDim(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function currencySymbol(currency: MetalCurrency): string {
  return (
    METAL_CURRENCY_OPTIONS.find((item) => item.value === currency)?.symbol ?? "$"
  );
}

function formatMoney(amount: number, currency: MetalCurrency): string {
  const symbol = currencySymbol(currency);
  const digits = currency === "KRW" ? 0 : 2;
  return `${symbol}${amount.toFixed(digits)}`;
}

function pieceWeightKg(inputs: MetalWeightInputs): number {
  const material =
    METAL_DENSITIES[inputs.material] ?? METAL_DENSITIES["carbon-steel"];
  const toM = (value: number) =>
    inputs.unitSystem === "imperial" ? value * 0.0254 : value / 1000;

  const lengthM = toM(finiteDim(inputs.length));
  const widthM = toM(finiteDim(inputs.width));
  const thickM = toM(finiteDim(inputs.thickness));
  const odM = toM(finiteDim(inputs.outerDiameter));
  const idM = toM(finiteDim(inputs.innerDiameter));

  let volumeM3 = 0;

  if (inputs.shape === "plate" || inputs.shape === "structural") {
    volumeM3 = Math.max(0, lengthM * widthM * thickM);
  } else if (inputs.shape === "bar") {
    const d = odM > 0 ? odM : Math.min(widthM, thickM);
    volumeM3 = Math.max(0, (Math.PI / 4) * d ** 2 * lengthM);
  } else if (inputs.shape === "tube") {
    const wall = thickM;
    const od = odM;
    const id = Math.max(0, od - 2 * wall);
    volumeM3 = Math.max(0, (Math.PI / 4) * (od ** 2 - id ** 2) * lengthM);
  } else {
    // pipe — hollow cylinder from OD/ID (NPS+schedule filled)
    const od = Math.max(odM, idM);
    const id = Math.min(odM, idM);
    volumeM3 = Math.max(0, (Math.PI / 4) * (od ** 2 - id ** 2) * lengthM);
  }

  if (!Number.isFinite(volumeM3)) volumeM3 = 0;
  return volumeM3 * material.density;
}

function pieceCost(
  inputs: MetalWeightInputs,
  weightKg: number,
  lengthM: number,
): number {
  const unitPrice = Number.isFinite(inputs.unitPrice) ? inputs.unitPrice : 0;
  if (inputs.priceBasis === "ton") {
    return (weightKg / 1000) * unitPrice;
  }
  if (inputs.priceBasis === "m") {
    return lengthM * unitPrice;
  }
  return weightKg * unitPrice;
}

export function calculateMetalWeight(inputs: MetalWeightInputs): CalculatorOutput {
  const material =
    METAL_DENSITIES[inputs.material] ?? METAL_DENSITIES["carbon-steel"];
  const toM = (value: number) =>
    inputs.unitSystem === "imperial" ? value * 0.0254 : value / 1000;

  const lengthM = toM(finiteDim(inputs.length));
  const weightKg = pieceWeightKg(inputs);
  const weightLb = weightKg * 2.20462;
  const qty =
    Number.isFinite(inputs.quantity) && inputs.quantity > 0 ? inputs.quantity : 1;
  const pieceCostValue = pieceCost(inputs, weightKg, lengthM);
  const totalWeightKg = weightKg * qty;
  const totalWeightLb = weightLb * qty;
  const totalCost = pieceCostValue * qty;
  const isMetric = inputs.unitSystem === "metric";
  const symbol = currencySymbol(inputs.currency);
  const basisLabel =
    METAL_PRICE_BASIS_OPTIONS.find((item) => item.value === inputs.priceBasis)
      ?.label ?? "/kg";
  const shapeLabel =
    METAL_SHAPE_OPTIONS.find((item) => item.value === inputs.shape)?.label ??
    inputs.shape;

  const weightDisplay = isMetric
    ? `${totalWeightKg.toFixed(2)} kg`
    : `${totalWeightLb.toFixed(2)} lb`;
  const pieceWeightDisplay = isMetric
    ? `${weightKg.toFixed(2)} kg`
    : `${weightLb.toFixed(2)} lb`;
  const costDisplay = formatMoney(totalCost, inputs.currency);
  const volumeM3 = weightKg / material.density;

  return {
    heroLabel: "Estimated Weight",
    heroValue: weightDisplay,
    heroStatus: `Material: ${material.label} · Qty ${qty}`,
    heroStatusLevel: "neutral",
    summary: [
      { label: "Total weight", value: weightDisplay },
      { label: "Total cost", value: costDisplay },
    ],
    summaryStatus: {
      label: "Estimate ready for procurement",
      level: "pass",
    },
    rows: [
      { label: "Shape", value: shapeLabel },
      { label: "Material", value: material.label },
      { label: "Density", value: `${material.density.toLocaleString()} kg/m³` },
      {
        label: "Volume (per piece)",
        value: `${(volumeM3 * 1e6).toFixed(1)} cm³`,
      },
      { label: "Weight (per piece)", value: pieceWeightDisplay },
      { label: "Quantity", value: String(qty) },
      {
        label: "Total weight",
        value: weightDisplay,
        emphasis: true,
      },
      {
        label: "Unit price",
        value: `${symbol}${inputs.unitPrice.toFixed(inputs.currency === "KRW" ? 0 : 2)} ${basisLabel}`,
      },
      {
        label: "Cost (per piece)",
        value: formatMoney(pieceCostValue, inputs.currency),
      },
      {
        label: "Total material cost",
        value: costDisplay,
        emphasis: true,
      },
    ],
    exportRows: [
      { label: "Shape", value: shapeLabel },
      { label: "Material", value: material.label },
      { label: "Weight per piece (kg)", value: weightKg.toFixed(2) },
      { label: "Quantity", value: String(qty) },
      { label: "Total weight (kg)", value: totalWeightKg.toFixed(2) },
      {
        label: `Unit price (${inputs.currency}${basisLabel})`,
        value: inputs.unitPrice.toFixed(2),
      },
      { label: `Total cost (${inputs.currency})`, value: totalCost.toFixed(2) },
    ],
  };
}

export const DEFAULT_METAL_INPUTS: MetalWeightInputs = {
  unitSystem: "metric",
  shape: "pipe",
  material: "carbon-steel",
  length: 6000,
  width: 1500,
  thickness: 2.0,
  outerDiameter: 114.3,
  innerDiameter: 102.26,
  nps: "4",
  schedule: "40",
  unitPrice: 1.85,
  currency: "USD",
  priceBasis: "kg",
  quantity: 1,
  wallMode: "dim",
  bwg: 16,
};

/** Piece mass in kg (quantity not applied). */
export function metalWeightKg(inputs: MetalWeightInputs): number {
  return pieceWeightKg(inputs);
}
