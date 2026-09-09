import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";

/** Form factor for volume screening. */
export type AlloyShape =
  | "pipe"
  | "plate"
  | "round-bar"
  | "rect-bar"
  | "structural";

export type AlloyMaterialId =
  | "ss304"
  | "ss304l"
  | "ss316"
  | "ss316l"
  | "ss321"
  | "ss347"
  | "ss310"
  | "duplex-2205"
  | "super-duplex-2507"
  | "inconel-600"
  | "inconel-625"
  | "incoloy-800"
  | "incoloy-825"
  | "hastelloy-c276"
  | "monel-400"
  | "carbon-steel"
  | "titanium-gr2"
  | "aluminum-6061"
  | "brass"
  | "copper";

export type AlloyMaterialGroup =
  | "stainless"
  | "duplex"
  | "nickel"
  | "other";

export type AlloyMaterial = {
  id: AlloyMaterialId;
  label: string;
  group: AlloyMaterialGroup;
  /** Density kg/m³ (screening / catalog typical). */
  densityKgM3: number;
  /** Short aliases for search filter. */
  aliases: string[];
};

/**
 * Typical annealed / catalog densities for procurement screening.
 * SS304 7.93 vs SS316 8.00 g/cm³ is intentional for the comparison callout.
 */
export const ALLOY_MATERIALS: AlloyMaterial[] = [
  {
    id: "ss304",
    label: "SS304",
    group: "stainless",
    densityKgM3: 7930,
    aliases: ["304", "uns s30400", "1.4301"],
  },
  {
    id: "ss304l",
    label: "SS304L",
    group: "stainless",
    densityKgM3: 7930,
    aliases: ["304l", "uns s30403", "1.4307"],
  },
  {
    id: "ss316",
    label: "SS316",
    group: "stainless",
    densityKgM3: 8000,
    aliases: ["316", "uns s31600", "1.4401"],
  },
  {
    id: "ss316l",
    label: "SS316L",
    group: "stainless",
    densityKgM3: 8000,
    aliases: ["316l", "uns s31603", "1.4404"],
  },
  {
    id: "ss321",
    label: "SS321",
    group: "stainless",
    densityKgM3: 8020,
    aliases: ["321", "uns s32100"],
  },
  {
    id: "ss347",
    label: "SS347",
    group: "stainless",
    densityKgM3: 8000,
    aliases: ["347", "uns s34700"],
  },
  {
    id: "ss310",
    label: "SS310",
    group: "stainless",
    densityKgM3: 7900,
    aliases: ["310", "uns s31000"],
  },
  {
    id: "duplex-2205",
    label: "Duplex 2205 (S31803)",
    group: "duplex",
    densityKgM3: 7800,
    aliases: ["2205", "s31803", "duplex"],
  },
  {
    id: "super-duplex-2507",
    label: "Super Duplex 2507 (S32750)",
    group: "duplex",
    densityKgM3: 7800,
    aliases: ["2507", "s32750", "super duplex"],
  },
  {
    id: "inconel-600",
    label: "Inconel 600",
    group: "nickel",
    densityKgM3: 8470,
    aliases: ["n06600", "alloy 600"],
  },
  {
    id: "inconel-625",
    label: "Inconel 625",
    group: "nickel",
    densityKgM3: 8440,
    aliases: ["n06625", "alloy 625"],
  },
  {
    id: "incoloy-800",
    label: "Incoloy 800",
    group: "nickel",
    densityKgM3: 7940,
    aliases: ["n08800", "alloy 800"],
  },
  {
    id: "incoloy-825",
    label: "Incoloy 825",
    group: "nickel",
    densityKgM3: 8140,
    aliases: ["n08825", "alloy 825"],
  },
  {
    id: "hastelloy-c276",
    label: "Hastelloy C-276",
    group: "nickel",
    densityKgM3: 8890,
    aliases: ["c276", "n10276", "hastelloy"],
  },
  {
    id: "monel-400",
    label: "Monel 400",
    group: "nickel",
    densityKgM3: 8830,
    aliases: ["n04400", "monel"],
  },
  {
    id: "carbon-steel",
    label: "Carbon Steel",
    group: "other",
    densityKgM3: 7850,
    aliases: ["cs", "a36", "mild steel"],
  },
  {
    id: "titanium-gr2",
    label: "Titanium Gr. 2",
    group: "other",
    densityKgM3: 4510,
    aliases: ["ti", "grade 2", "r50400"],
  },
  {
    id: "aluminum-6061",
    label: "Aluminum 6061",
    group: "other",
    densityKgM3: 2700,
    aliases: ["al", "6061", "aluminium"],
  },
  {
    id: "brass",
    label: "Brass",
    group: "other",
    densityKgM3: 8500,
    aliases: ["cuZn"],
  },
  {
    id: "copper",
    label: "Copper",
    group: "other",
    densityKgM3: 8960,
    aliases: ["cu", "c110"],
  },
];

export const ALLOY_MATERIAL_BY_ID: Record<AlloyMaterialId, AlloyMaterial> =
  Object.fromEntries(ALLOY_MATERIALS.map((m) => [m.id, m])) as Record<
    AlloyMaterialId,
    AlloyMaterial
  >;

export const ALLOY_SHAPE_OPTIONS: { value: AlloyShape; label: string }[] = [
  { value: "pipe", label: "Round pipe / tube" },
  { value: "plate", label: "Flat plate / sheet" },
  { value: "round-bar", label: "Round bar" },
  { value: "rect-bar", label: "Square / rectangular bar" },
  { value: "structural", label: "Structural (beam screening)" },
];

export const ALLOY_GROUP_LABEL: Record<AlloyMaterialGroup, string> = {
  stainless: "Stainless steel",
  duplex: "Duplex & super duplex",
  nickel: "Nickel alloys",
  other: "Other metals",
};

/** All catalog materials get SpecRoutes so path sync works for every grade. */
export const ALLOY_PSEO_MATERIALS: AlloyMaterialId[] = ALLOY_MATERIALS.map(
  (m) => m.id,
);

export type AlloyWeightInputs = {
  unitSystem: UnitSystem;
  material: AlloyMaterialId;
  shape: AlloyShape;
  /** Length along piece (mm or in). */
  length: number;
  /** Plate / rect width or structural flange width. */
  width: number;
  /** Plate thickness, pipe wall, rect height, or structural web thickness. */
  thickness: number;
  /** Pipe OD or round-bar diameter. */
  outerDiameter: number;
  quantity: number;
  /** Optional price per kg (metric) or per lb (imperial display path stores as /kg SI). */
  unitPrice: number;
};

export const DEFAULT_ALLOY_WEIGHT_INPUTS: AlloyWeightInputs = {
  unitSystem: "metric",
  material: "ss316",
  shape: "plate",
  length: 2000,
  width: 1000,
  thickness: 10,
  outerDiameter: 114.3,
  quantity: 1,
  unitPrice: 0,
};

function finiteDim(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function resolveAlloyMaterial(id: string): AlloyMaterial {
  return (
    ALLOY_MATERIAL_BY_ID[id as AlloyMaterialId] ?? ALLOY_MATERIAL_BY_ID.ss316
  );
}

export function densityGPerCm3(densityKgM3: number): number {
  return densityKgM3 / 1000;
}

export function densityLbPerIn3(densityKgM3: number): number {
  // 1 kg/m³ = 3.6127e-5 lb/in³
  return densityKgM3 * 3.6127292e-5;
}

export function filterAlloyMaterials(query: string): AlloyMaterial[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALLOY_MATERIALS;
  return ALLOY_MATERIALS.filter((m) => {
    const hay = [m.id, m.label, ...m.aliases].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

/** Piece volume in m³ from display-unit dimensions. */
export function alloyPieceVolumeM3(inputs: AlloyWeightInputs): number {
  const toM = (value: number) =>
    inputs.unitSystem === "imperial" ? value * 0.0254 : value / 1000;

  const lengthM = toM(finiteDim(inputs.length));
  const widthM = toM(finiteDim(inputs.width));
  const thickM = toM(finiteDim(inputs.thickness));
  const odM = toM(finiteDim(inputs.outerDiameter));

  if (inputs.shape === "plate" || inputs.shape === "structural") {
    return Math.max(0, lengthM * widthM * thickM);
  }
  if (inputs.shape === "rect-bar") {
    return Math.max(0, lengthM * widthM * thickM);
  }
  if (inputs.shape === "round-bar") {
    const d = odM > 0 ? odM : Math.min(widthM, thickM);
    return Math.max(0, (Math.PI / 4) * d ** 2 * lengthM);
  }
  // pipe / tube — hollow cylinder from OD and wall
  const wall = thickM;
  const od = odM;
  const id = Math.max(0, od - 2 * wall);
  return Math.max(0, (Math.PI / 4) * (od ** 2 - id ** 2) * lengthM);
}

export function calculateAlloyWeight(
  inputs: AlloyWeightInputs,
): CalculatorOutput {
  const material = resolveAlloyMaterial(inputs.material);
  const volumeM3 = alloyPieceVolumeM3(inputs);
  const qty =
    Number.isFinite(inputs.quantity) && inputs.quantity > 0
      ? inputs.quantity
      : 1;
  const pieceKg = volumeM3 * material.densityKgM3;
  const totalKg = pieceKg * qty;
  const totalLb = totalKg * 2.20462262;
  const volumeFt3 = volumeM3 * 35.3146667;
  const isMetric = inputs.unitSystem === "metric";
  const shapeLabel =
    ALLOY_SHAPE_OPTIONS.find((s) => s.value === inputs.shape)?.label ??
    inputs.shape;

  const weightDisplay = isMetric
    ? `${totalKg.toFixed(2)} kg`
    : `${totalLb.toFixed(2)} lb`;
  const pieceWeightDisplay = isMetric
    ? `${pieceKg.toFixed(2)} kg`
    : `${(pieceKg * 2.20462262).toFixed(2)} lb`;
  const volumeDisplay = isMetric
    ? `${(volumeM3 * 1e6).toFixed(1)} cm³ (${volumeM3.toExponential(3)} m³)`
    : `${(volumeFt3 * 1728).toFixed(2)} in³ (${volumeFt3.toFixed(4)} ft³)`;

  const densityDisplay = `${material.densityKgM3.toLocaleString()} kg/m³ · ${densityGPerCm3(material.densityKgM3).toFixed(2)} g/cm³ · ${densityLbPerIn3(material.densityKgM3).toFixed(4)} lb/in³`;

  const unitPrice = Number.isFinite(inputs.unitPrice) ? inputs.unitPrice : 0;
  // unitPrice is always treated as currency per kg for screening; show /lb when imperial UI.
  const pricePerKg = unitPrice;
  const totalCost =
    pricePerKg > 0
      ? isMetric
        ? totalKg * pricePerKg
        : totalLb * pricePerKg
      : 0;
  const costDisplay =
    pricePerKg > 0
      ? `$${totalCost.toFixed(2)} (${isMetric ? "/kg" : "/lb"} basis)`
      : "— (enter price)";

  const ss304 = ALLOY_MATERIAL_BY_ID.ss304;
  const ss316 = ALLOY_MATERIAL_BY_ID.ss316;
  const compareNote = `SS304 ${densityGPerCm3(ss304.densityKgM3).toFixed(2)} g/cm³ vs SS316 ${densityGPerCm3(ss316.densityKgM3).toFixed(2)} g/cm³ (~${(((ss316.densityKgM3 / ss304.densityKgM3) - 1) * 100).toFixed(1)}% denser).`;

  return {
    heroLabel: "Total weight",
    heroValue: weightDisplay,
    heroStatus: `${material.label} · ${shapeLabel} · Qty ${qty}`,
    heroStatusLevel: totalKg > 0 ? "pass" : "warn",
    heroBadges: [
      { label: "Density", value: `${densityGPerCm3(material.densityKgM3).toFixed(2)} g/cm³` },
      { label: "Material", value: material.label },
    ],
    summary: [
      { label: "Total weight", value: weightDisplay },
      {
        label: "Density",
        value: `${densityGPerCm3(material.densityKgM3).toFixed(2)} g/cm³`,
      },
      {
        label: "Est. cost",
        value: pricePerKg > 0 ? `$${totalCost.toFixed(2)}` : "—",
      },
    ],
    summaryStatus: {
      label:
        totalKg > 0
          ? "Weight ready for procurement screening"
          : "Enter positive dimensions",
      level: totalKg > 0 ? "pass" : "warn",
    },
    rows: [
      { label: "Material", value: material.label },
      { label: "Shape", value: shapeLabel },
      { label: "Density", value: densityDisplay },
      { label: "Volume (per piece)", value: volumeDisplay },
      { label: "Weight (per piece)", value: pieceWeightDisplay },
      { label: "Quantity", value: String(qty) },
      { label: "Total weight", value: weightDisplay, emphasis: true },
      {
        label: isMetric ? "Price basis" : "Price basis",
        value:
          pricePerKg > 0
            ? `$${pricePerKg.toFixed(2)} ${isMetric ? "/kg" : "/lb"}`
            : "Not set",
      },
      {
        label: "Estimated material cost",
        value: costDisplay,
        emphasis: pricePerKg > 0,
      },
    ],
    callouts: [
      {
        tone: "info",
        title: "SS304 vs SS316 density",
        body: compareNote,
      },
      {
        tone: "info",
        title: "Mill / heat chemistry tolerance",
        body: `Catalog screening values (e.g., ${material.label} ρ = ${densityGPerCm3(material.densityKgM3).toFixed(2)} g/cm³). Actual shipping weight may vary ±1–2% depending on heat chemistry tolerances.`,
      },
    ],
    exportRows: [
      { label: "Material", value: material.label },
      { label: "Shape", value: shapeLabel },
      { label: "Density (kg/m³)", value: String(material.densityKgM3) },
      { label: "Volume per piece (m³)", value: volumeM3.toExponential(6) },
      { label: "Weight per piece (kg)", value: pieceKg.toFixed(3) },
      { label: "Quantity", value: String(qty) },
      { label: "Total weight (kg)", value: totalKg.toFixed(3) },
      { label: "Total weight (lb)", value: totalLb.toFixed(3) },
      {
        label: "Estimated cost (USD)",
        value: pricePerKg > 0 ? totalCost.toFixed(2) : "—",
      },
    ],
  };
}
