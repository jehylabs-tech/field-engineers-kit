/**
 * Tank & Pressure Vessel Volume — ASME VIII Div 1 head volumes +
 * API 650 / ISO 7507 level–capacity screening.
 *
 * Geometry (SI metres internally):
 *   V_shell = π r² L,  r = Di/2
 *   V_total = V_shell + 2 · V_head
 *
 * One-head full volumes:
 *   flat:              0
 *   2:1 ellipsoidal:   π/24 · Di³   (h_head = 0.25 Di)
 *   hemispherical:     π/6  · Di³
 *   torispherical F&D: ≈ 0.084766 · Di³  (ASME F&D / Klöpper R=Di, r_k=0.06 Di)
 *                      head depth ≈ 0.1690 · Di
 *
 * Horizontal partial liquid:
 *   Shell segment: L · (r² acos((r−h)/r) − (r−h) √(2rh−h²)), h ∈ [0, 2r]
 *   Heads: 2 · V_head · f with f = circular segment area / (π r²) (strapping approx)
 *
 * Vertical partial liquid (h from bottom of vessel):
 *   bottom head → shell → top head using cap formulas / cylindrical slice.
 *
 * Volume constants: 1 m³ = 1000 L = 264.172052 US gal = 6.28981 oil bbl (42 gal).
 * Screening only — no internals, nozzles, or code-stamped strapping charts.
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";

export type TankOrientation = "horizontal" | "vertical";

export type TankHeadType =
  | "flat"
  | "2to1-ellipsoidal"
  | "torispherical-klopper"
  | "hemispherical";

export type TankFluid =
  | "water"
  | "diesel"
  | "crude"
  | "h2so4"
  | "custom";

export type TankVesselVolumeInputs = {
  unitSystem: UnitSystem;
  orientation: TankOrientation;
  headType: TankHeadType;
  /** Inside diameter Di — mm (metric) or in (imperial). */
  diameter: number;
  /** Shell straight length L — mm (metric) or in (imperial). */
  length: number;
  /**
   * Liquid height h from bottom — mm or in.
   * Horizontal: clamped to [0, Di]. Vertical: clamped to [0, 2·headDepth + L].
   */
  liquidLevel: number;
  fluid: TankFluid;
  /** Density kg/m³ — used when fluid === custom; otherwise preset overrides. */
  densityKgM3: number;
};

export const TANK_ORIENTATION_OPTIONS: {
  value: TankOrientation;
  label: string;
}[] = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];

export const TANK_HEAD_TYPE_OPTIONS: {
  value: TankHeadType;
  label: string;
  shortLabel: string;
}[] = [
  { value: "flat", label: "Flat (ASME flat cover)", shortLabel: "Flat" },
  {
    value: "2to1-ellipsoidal",
    label: "2:1 ellipsoidal (ASME SE)",
    shortLabel: "2:1 SE",
  },
  {
    value: "torispherical-klopper",
    label: "Torispherical / Klöpper (ASME F&D)",
    shortLabel: "F&D / Klöpper",
  },
  {
    value: "hemispherical",
    label: "Hemispherical",
    shortLabel: "Hemi",
  },
];

export const TANK_FLUID_OPTIONS: {
  value: TankFluid;
  label: string;
  densityKgM3: number;
}[] = [
  { value: "water", label: "Water", densityKgM3: 998 },
  { value: "diesel", label: "Diesel", densityKgM3: 850 },
  { value: "crude", label: "Crude oil", densityKgM3: 870 },
  { value: "h2so4", label: "H₂SO₄ (conc.)", densityKgM3: 1830 },
  { value: "custom", label: "Custom density", densityKgM3: 998 },
];

export const DEFAULT_TANK_VESSEL_VOLUME_INPUTS: TankVesselVolumeInputs = {
  unitSystem: "metric",
  orientation: "horizontal",
  headType: "2to1-ellipsoidal",
  diameter: 2000,
  length: 6000,
  liquidLevel: 1200,
  fluid: "water",
  densityKgM3: 998,
};

/** US gallon / oil barrel conversion factors (exact enough for screening). */
export const M3_TO_L = 1000;
export const M3_TO_US_GAL = 264.172052;
export const M3_TO_BBL = 6.28981;

/** ASME F&D / Klöpper head volume coefficient: V_head ≈ k · Di³. */
const FD_VOLUME_COEFF = 0.084766;
/** F&D head depth ≈ 0.1690 · Di (R=Di, r_knuckle=0.06·Di). */
const FD_DEPTH_FRAC = 0.169;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function finite(n: number, fallback: number) {
  return Number.isFinite(n) ? n : fallback;
}

function dimToM(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? (value * 25.4) / 1000 : value / 1000;
}

export function headDepthM(headType: TankHeadType, diM: number): number {
  switch (headType) {
    case "flat":
      return 0;
    case "2to1-ellipsoidal":
      return 0.25 * diM;
    case "hemispherical":
      return 0.5 * diM;
    case "torispherical-klopper":
      return FD_DEPTH_FRAC * diM;
    default:
      return 0;
  }
}

/** Full volume of one head (m³). */
export function headFullVolumeM3(headType: TankHeadType, diM: number): number {
  const di3 = diM * diM * diM;
  switch (headType) {
    case "flat":
      return 0;
    case "2to1-ellipsoidal":
      // V = π/6 · Di² · h_head with h_head = 0.25 Di → π/24 · Di³
      return (Math.PI / 24) * di3;
    case "hemispherical":
      return (Math.PI / 6) * di3;
    case "torispherical-klopper":
      // Common ASME F&D head volume coefficient (R=Di, r_k=0.06 Di).
      return FD_VOLUME_COEFF * di3;
    default:
      return 0;
  }
}

/**
 * Circular segment area of a circle of radius r filled to height h from bottom.
 * Returns area in m²; h clamped to [0, 2r].
 */
export function circularSegmentArea(r: number, h: number): number {
  const hh = clamp(h, 0, 2 * r);
  if (hh <= 0 || r <= 0) return 0;
  if (hh >= 2 * r) return Math.PI * r * r;
  // Standard: A = r² acos((r−h)/r) − (r−h) √(2rh−h²)
  const arg = clamp((r - hh) / r, -1, 1);
  return r * r * Math.acos(arg) - (r - hh) * Math.sqrt(Math.max(0, 2 * r * hh - hh * hh));
}

/** Filled-area fraction of the circular cross-section. */
export function fillAreaFraction(r: number, h: number): number {
  const full = Math.PI * r * r;
  if (full <= 0) return 0;
  return clamp(circularSegmentArea(r, h) / full, 0, 1);
}

/** Arc length of wetted shell circumference for liquid height h. */
function wettedArcLength(r: number, h: number): number {
  const hh = clamp(h, 0, 2 * r);
  if (r <= 0 || hh <= 0) return 0;
  if (hh >= 2 * r) return 2 * Math.PI * r;
  const arg = clamp((r - hh) / r, -1, 1);
  return 2 * r * Math.acos(arg);
}

/**
 * Spherical cap volume from apex (or from bottom of sphere) of height h_cap
 * into a sphere of radius R: V = π h² (3R − h) / 3.
 */
function sphericalCapVolume(R: number, hCap: number): number {
  const h = clamp(hCap, 0, 2 * R);
  if (h <= 0 || R <= 0) return 0;
  if (h >= 2 * R) return (4 / 3) * Math.PI * R * R * R;
  return (Math.PI * h * h * (3 * R - h)) / 3;
}

/**
 * Ellipsoidal (oblate SE) cap volume for 2:1 head.
 * Semi-axes a = b = r, c = headDepth. Cap height h from apex into ellipsoid:
 *   V = π a² h² (3c − h) / (3 c²)
 */
function ellipsoidalCapVolume(a: number, c: number, hCap: number): number {
  if (a <= 0 || c <= 0 || hCap <= 0) return 0;
  const h = clamp(hCap, 0, 2 * c);
  if (h >= 2 * c) return (4 / 3) * Math.PI * a * a * c; // full ellipsoid
  // One head is half-ellipsoid of depth c; cap from bottom of head:
  if (h >= c) {
    const fullHalf = (2 / 3) * Math.PI * a * a * c;
    const rem = h - c;
    // Remaining past equator into upper half — rare for a single head depth c
    return fullHalf + ellipsoidalCapVolume(a, c, rem);
  }
  return (Math.PI * a * a * h * h * (3 * c - h)) / (3 * c * c);
}

/**
 * Partial liquid volume inside one vertical head measured from the closed end
 * (bottom head from bottom, or top head from liquid immersion depth).
 */
function verticalHeadLiquidM3(
  headType: TankHeadType,
  diM: number,
  fillFromClosedEnd: number,
): number {
  const depth = headDepthM(headType, diM);
  const Vfull = headFullVolumeM3(headType, diM);
  if (Vfull <= 0 || depth <= 0) return 0;
  const h = clamp(fillFromClosedEnd, 0, depth);
  if (h <= 0) return 0;
  if (h >= depth - 1e-12) return Vfull;

  const r = diM / 2;
  switch (headType) {
    case "flat":
      return 0;
    case "hemispherical":
      return sphericalCapVolume(r, h);
    case "2to1-ellipsoidal":
      return ellipsoidalCapVolume(r, depth, h);
    case "torispherical-klopper":
      // Screening: treat F&D as spherical cap with crown radius R ≈ Di.
      return Math.min(Vfull, sphericalCapVolume(diM, h));
    default:
      return 0;
  }
}

/** Interior surface area of one head (m²) — screening. */
export function headInteriorAreaM2(headType: TankHeadType, diM: number): number {
  const r = diM / 2;
  switch (headType) {
    case "flat":
      return Math.PI * r * r;
    case "hemispherical":
      return 2 * Math.PI * r * r;
    case "2to1-ellipsoidal": {
      // Oblate spheroid zone (open at equator): a=r, c=r/2, e=√(1−(c/a)²)
      const a = r;
      const c = r / 2;
      const e = Math.sqrt(Math.max(0, 1 - (c * c) / (a * a)));
      if (e < 1e-9) return 2 * Math.PI * a * a;
      return (
        Math.PI *
        a *
        a *
        (1 + ((1 - e * e) / (2 * e)) * Math.log((1 + e) / (1 - e)))
      );
    }
    case "torispherical-klopper": {
      // Screening surface ≈ slightly less than hemi; use depth-scaled hemi blend.
      const depth = headDepthM(headType, diM);
      const hemi = 2 * Math.PI * r * r;
      return hemi * (depth / (0.5 * diM));
    }
    default:
      return Math.PI * r * r;
  }
}

export type TankVesselVolumeComputed = {
  diM: number;
  lengthM: number;
  hM: number;
  rM: number;
  headDepthM: number;
  vHeadM3: number;
  vShellM3: number;
  vTotalM3: number;
  vLiquidM3: number;
  vUllageM3: number;
  fillPct: number;
  densityKgM3: number;
  massKg: number;
  wettedAreaM2: number;
  totalInteriorAreaM2: number;
  invalid: boolean;
};

export function resolveFluidDensity(
  fluid: TankFluid,
  densityKgM3: number,
): number {
  if (fluid === "custom") {
    return Math.max(1, finite(densityKgM3, 998));
  }
  const preset = TANK_FLUID_OPTIONS.find((f) => f.value === fluid);
  return preset?.densityKgM3 ?? 998;
}

export function computeTankVesselVolume(
  inputs: TankVesselVolumeInputs,
): TankVesselVolumeComputed {
  const diM = Math.max(
    0,
    dimToM(finite(inputs.diameter, 2000), inputs.unitSystem),
  );
  const lengthM = Math.max(
    0,
    dimToM(finite(inputs.length, 6000), inputs.unitSystem),
  );
  const rM = diM / 2;
  const hRaw = dimToM(finite(inputs.liquidLevel, 0), inputs.unitSystem);
  // Clamp liquid level to [0, Di] per spec (vertical can exceed Di into heads+shell;
  // for vertical the physical max is 2·headDepth+L — clamp display input to Di only
  // for horizontal consistency; for vertical allow up to vessel height).
  const vesselHeightM =
    inputs.orientation === "vertical"
      ? 2 * headDepthM(inputs.headType, diM) + lengthM
      : diM;
  const hM = clamp(hRaw, 0, vesselHeightM);

  const densityKgM3 = resolveFluidDensity(inputs.fluid, inputs.densityKgM3);
  const depthHead = headDepthM(inputs.headType, diM);
  const vHeadM3 = headFullVolumeM3(inputs.headType, diM);
  const vShellM3 = Math.PI * rM * rM * lengthM;
  const vTotalM3 = vShellM3 + 2 * vHeadM3;

  const invalid = !(diM > 0 && lengthM >= 0 && Number.isFinite(vTotalM3));

  let vLiquidM3 = 0;
  let wettedAreaM2 = 0;

  if (!invalid) {
    if (inputs.orientation === "horizontal") {
      const hShell = clamp(hM, 0, diM);
      const vShellLiq =
        lengthM *
        (rM * rM * Math.acos(clamp((rM - hShell) / rM, -1, 1)) -
          (rM - hShell) *
            Math.sqrt(Math.max(0, 2 * rM * hShell - hShell * hShell)));
      const f = fillAreaFraction(rM, hShell);
      const vHeadsLiq = 2 * vHeadM3 * f;
      vLiquidM3 = vShellLiq + vHeadsLiq;

      const arc = wettedArcLength(rM, hShell);
      const aHead = headInteriorAreaM2(inputs.headType, diM);
      wettedAreaM2 = lengthM * arc + 2 * aHead * f;
    } else {
      // Vertical: h from bottom (bottom head + shell + top head)
      if (hM <= depthHead) {
        vLiquidM3 = verticalHeadLiquidM3(inputs.headType, diM, hM);
        const aHead = headInteriorAreaM2(inputs.headType, diM);
        const frac = depthHead > 0 ? hM / depthHead : 0;
        wettedAreaM2 = aHead * Math.min(1, frac); // screening
      } else if (hM <= depthHead + lengthM) {
        const hShell = hM - depthHead;
        vLiquidM3 = vHeadM3 + Math.PI * rM * rM * hShell;
        const aHead = headInteriorAreaM2(inputs.headType, diM);
        wettedAreaM2 =
          aHead + 2 * Math.PI * rM * hShell + Math.PI * rM * rM; // bottom covered
      } else {
        const intoTop = hM - depthHead - lengthM;
        const topLiq = verticalHeadLiquidM3(inputs.headType, diM, intoTop);
        vLiquidM3 = vHeadM3 + vShellM3 + topLiq;
        const aHead = headInteriorAreaM2(inputs.headType, diM);
        const topFrac = depthHead > 0 ? clamp(intoTop / depthHead, 0, 1) : 0;
        wettedAreaM2 =
          aHead +
          2 * Math.PI * rM * lengthM +
          Math.PI * rM * rM +
          aHead * topFrac;
      }
    }
  }

  vLiquidM3 = clamp(vLiquidM3, 0, vTotalM3 > 0 ? vTotalM3 : vLiquidM3);
  const fillPct = vTotalM3 > 0 ? clamp((vLiquidM3 / vTotalM3) * 100, 0, 100) : 0;
  const vUllageM3 = Math.max(0, vTotalM3 - vLiquidM3);
  const massKg = vLiquidM3 * densityKgM3;
  const totalInteriorAreaM2 =
    2 * Math.PI * rM * lengthM + 2 * headInteriorAreaM2(inputs.headType, diM);

  return {
    diM,
    lengthM,
    hM,
    rM,
    headDepthM: depthHead,
    vHeadM3,
    vShellM3,
    vTotalM3,
    vLiquidM3,
    vUllageM3,
    fillPct,
    densityKgM3,
    massKg,
    wettedAreaM2,
    totalInteriorAreaM2,
    invalid,
  };
}

export type DipstickRow = {
  /** Dip from bottom in display units (mm or in). */
  dip: number;
  /** Liquid volume at that dip (m³). */
  volumeM3: number;
  fillPct: number;
};

/**
 * Dipstick / strapping calibration table — ~10–12 steps over 0..Di (horizontal)
 * or 0..vessel height (vertical).
 */
export function buildDipstickTable(
  inputs: TankVesselVolumeInputs,
  steps = 11,
): DipstickRow[] {
  const c0 = computeTankVesselVolume(inputs);
  if (c0.invalid || c0.diM <= 0) return [];

  const maxDimDisplay =
    inputs.orientation === "vertical"
      ? inputs.unitSystem === "imperial"
        ? (c0.headDepthM * 2 + c0.lengthM) / 0.0254
        : (c0.headDepthM * 2 + c0.lengthM) * 1000
      : inputs.diameter;

  const n = Math.max(2, Math.min(20, steps));
  const rows: DipstickRow[] = [];
  for (let i = 0; i < n; i += 1) {
    const frac = i / (n - 1);
    const dip = Number((maxDimDisplay * frac).toFixed(inputs.unitSystem === "imperial" ? 2 : 0));
    const computed = computeTankVesselVolume({
      ...inputs,
      liquidLevel: dip,
    });
    rows.push({
      dip,
      volumeM3: computed.vLiquidM3,
      fillPct: computed.fillPct,
    });
  }
  return rows;
}

function fmtVolMulti(m3: number): string {
  if (!Number.isFinite(m3)) return "—";
  const L = m3 * M3_TO_L;
  const gal = m3 * M3_TO_US_GAL;
  const bbl = m3 * M3_TO_BBL;
  return `${m3.toFixed(2)} m³ · ${L.toFixed(0)} L · ${gal.toFixed(0)} US gal · ${bbl.toFixed(2)} bbl`;
}

function fmtVolShort(m3: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(m3)) return "—";
  if (unitSystem === "imperial") {
    return `${(m3 * M3_TO_US_GAL).toFixed(0)} US gal · ${m3.toFixed(2)} m³`;
  }
  return `${m3.toFixed(2)} m³ · ${(m3 * M3_TO_US_GAL).toFixed(0)} US gal`;
}

function fmtArea(m2: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(m2)) return "—";
  const ft2 = m2 * 10.7639104;
  if (unitSystem === "imperial") {
    return `${ft2.toFixed(1)} ft² · ${m2.toFixed(2)} m²`;
  }
  return `${m2.toFixed(2)} m² · ${ft2.toFixed(1)} ft²`;
}

function fmtMass(kg: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(kg)) return "—";
  const lb = kg * 2.20462262;
  if (unitSystem === "imperial") {
    return `${lb.toFixed(0)} lb · ${kg.toFixed(0)} kg`;
  }
  return `${kg.toFixed(0)} kg · ${lb.toFixed(0)} lb`;
}

function fmtDensity(kgM3: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(kgM3)) return "—";
  const lbFt3 = kgM3 * 0.06242796;
  if (unitSystem === "imperial") {
    return `${lbFt3.toFixed(2)} lb/ft³ · ${kgM3.toFixed(0)} kg/m³`;
  }
  return `${kgM3.toFixed(0)} kg/m³ · ${lbFt3.toFixed(2)} lb/ft³`;
}

function fmtDimM(m: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(m)) return "—";
  const mm = m * 1000;
  const inch = m / 0.0254;
  if (unitSystem === "imperial") {
    return `${inch.toFixed(2)} in · ${mm.toFixed(0)} mm`;
  }
  return `${mm.toFixed(0)} mm · ${inch.toFixed(2)} in`;
}

function dimLabel(value: number, unitSystem: UnitSystem): string {
  return unitSystem === "imperial" ? `${value} in` : `${value} mm`;
}

export function calculateTankVesselVolume(
  inputs: TankVesselVolumeInputs,
): CalculatorOutput {
  const c = computeTankVesselVolume(inputs);
  const headMeta =
    TANK_HEAD_TYPE_OPTIONS.find((h) => h.value === inputs.headType) ??
    TANK_HEAD_TYPE_OPTIONS[1];
  const fluidMeta =
    TANK_FLUID_OPTIONS.find((f) => f.value === inputs.fluid) ??
    TANK_FLUID_OPTIONS[0];

  let heroStatusLevel: StatusLevel = "neutral";
  let heroStatus = "Enter valid diameter and length";
  if (!c.invalid) {
    heroStatusLevel = "pass";
    heroStatus = `${c.fillPct.toFixed(1)} % of total capacity`;
  }

  const headDepthLabel = c.invalid
    ? "—"
    : fmtDimM(c.headDepthM, inputs.unitSystem);

  const callouts: ResultCallout[] = [
    {
      tone: "info",
      title: "ASME VIII / API 650 screening",
      body: "Geometric level–capacity screening (ASME VIII Div 1 head volumes). No internals. Confirm with API 650 / ISO 7507 certified strapping for custody transfer.",
      items: [
        `${headMeta.shortLabel} · one-head ${fmtVolShort(c.vHeadM3, inputs.unitSystem)} · depth ${headDepthLabel}`,
      ],
    },
  ];

  const rows: ResultRow[] = [
    {
      section: "Capacity",
      label: "Ullage volume",
      value: c.invalid ? "—" : fmtVolShort(c.vUllageM3, inputs.unitSystem),
      emphasis: true,
    },
    {
      section: "Capacity",
      label: "Shell · both heads",
      value: c.invalid
        ? "—"
        : `${fmtVolShort(c.vShellM3, inputs.unitSystem)} · ${fmtVolShort(2 * c.vHeadM3, inputs.unitSystem)}`,
    },
    {
      section: "Mass",
      label: `Liquid mass (${fluidMeta.label})`,
      value: c.invalid ? "—" : fmtMass(c.massKg, inputs.unitSystem),
      emphasis: true,
    },
    {
      section: "Surface",
      label: "Wetted interior area",
      value: c.invalid ? "—" : fmtArea(c.wettedAreaM2, inputs.unitSystem),
    },
  ];

  const dipstick = buildDipstickTable(inputs, 11);
  const exportRows = [
    { label: "Orientation", value: inputs.orientation },
    { label: "Head type", value: headMeta.label },
    { label: "Diameter Di", value: dimLabel(inputs.diameter, inputs.unitSystem) },
    { label: "Shell length L", value: dimLabel(inputs.length, inputs.unitSystem) },
    {
      label: "Liquid level h",
      value: dimLabel(inputs.liquidLevel, inputs.unitSystem),
    },
    { label: "Fluid", value: fluidMeta.label },
    { label: "Density", value: fmtDensity(c.densityKgM3, inputs.unitSystem) },
    {
      label: "Liquid volume",
      value: c.invalid ? "—" : fmtVolMulti(c.vLiquidM3),
    },
    {
      label: "Fill %",
      value: c.invalid ? "—" : `${c.fillPct.toFixed(1)} %`,
    },
    {
      label: "V_total",
      value: c.invalid ? "—" : fmtVolShort(c.vTotalM3, inputs.unitSystem),
    },
    {
      label: "V_shell",
      value: c.invalid ? "—" : fmtVolShort(c.vShellM3, inputs.unitSystem),
    },
    {
      label: "2 × V_head",
      value: c.invalid ? "—" : fmtVolShort(2 * c.vHeadM3, inputs.unitSystem),
    },
    {
      label: "One-head depth",
      value: headDepthLabel,
    },
    {
      label: "Ullage",
      value: c.invalid ? "—" : fmtVolShort(c.vUllageM3, inputs.unitSystem),
    },
    {
      label: "Wetted area",
      value: c.invalid ? "—" : fmtArea(c.wettedAreaM2, inputs.unitSystem),
    },
    {
      label: "Total interior area",
      value: c.invalid ? "—" : fmtArea(c.totalInteriorAreaM2, inputs.unitSystem),
    },
    {
      label: "Liquid mass",
      value: c.invalid ? "—" : fmtMass(c.massKg, inputs.unitSystem),
    },
    ...dipstick.map((row) => ({
      label: `Dipstick ${row.dip}${inputs.unitSystem === "imperial" ? " in" : " mm"}`,
      value: fmtVolShort(row.volumeM3, inputs.unitSystem),
    })),
  ];

  const bbl = c.vLiquidM3 * M3_TO_BBL;
  const alsoVol = c.invalid
    ? "—"
    : inputs.unitSystem === "imperial"
      ? `${c.vLiquidM3.toFixed(2)} m³`
      : `${(c.vLiquidM3 * M3_TO_US_GAL).toFixed(0)} US gal`;

  return {
    heroLabel: "Partial liquid volume",
    heroValue: c.invalid ? "—" : fmtVolShort(c.vLiquidM3, inputs.unitSystem),
    heroStatus,
    heroStatusLevel,
    heroBadges: c.invalid
      ? undefined
      : [
          { label: "Also", value: alsoVol },
          { label: "Fill", value: `${c.fillPct.toFixed(1)} %` },
          { label: "Oil bbl", value: `${bbl.toFixed(2)} bbl` },
        ],
    summary: [
      {
        label: "Total capacity V_total",
        value: c.invalid ? "—" : fmtVolShort(c.vTotalM3, inputs.unitSystem),
      },
      {
        label: "Liquid mass",
        value: c.invalid ? "—" : fmtMass(c.massKg, inputs.unitSystem),
      },
      {
        label: "One-head depth",
        value: headDepthLabel,
      },
    ],
    summaryStatus: {
      label: heroStatus,
      level: heroStatusLevel,
    },
    rows,
    callouts,
    exportRows,
  };
}
