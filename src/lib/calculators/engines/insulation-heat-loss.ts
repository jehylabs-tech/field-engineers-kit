/**
 * Piping Insulation Thickness & Heat Loss — ASTM C680 / ISO 12241 screening.
 *
 * Steady radial conduction through insulation + outer surface convection/radiation:
 *   Q = (T_h − T_a) / R_tot
 *   R_tot = ln(r₂/r₁)/(2πk) + 1/(2π r₂ h_o)
 *   h_o = h_c + h_r
 *   h_c,nat = 1.32 ((T_s − T_a)/d₂)^0.25          (horizontal cylinder, SI)
 *   h_c,forced ≈ 2.2 · v^0.6 / d₂^0.4               (mild outdoor wind screening)
 *   h_c = (h_c,nat³ + h_c,forced³)^(1/3)            (Churchill blend)
 *   h_r = ε σ (T_s⁴ − T_a⁴)/(T_s − T_a)
 *
 * The forced term is intentionally mild so light wind does not erase the ASTM C680
 * natural-convection formula (Churchill cube-root keeps still-air cases natural-led).
 *
 * k = k(T_m) from ASTM C533 / C547-style polynomials (mean insulation temp).
 * Personnel protection screen: T_s ≤ 60 °C (140 °F) per ASTM C1055 (≈5 s contact).
 *
 * Screening only — confirm jacket emissivity, wind turbulence, and manufacturer k(T).
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";
import { getPipeScheduleSize } from "@/lib/data/loaders";

export type InsulationMaterial =
  | "calcium-silicate"
  | "mineral-wool"
  | "cellular-glass"
  | "polyurethane";

export type InsulationHeatLossInputs = {
  unitSystem: UnitSystem;
  nps: string;
  insulationThickness: number;
  material: InsulationMaterial;
  operatingTemp: number;
  ambientTemp: number;
  windSpeed: number;
  /** Surface / jacketing emissivity (default 0.90 per screening practice). */
  emissivity: number;
};

export const INSULATION_MATERIAL_OPTIONS: {
  value: InsulationMaterial;
  label: string;
  shortLabel: string;
  standard: string;
}[] = [
  {
    value: "mineral-wool",
    label: "Mineral wool (ASTM C547)",
    shortLabel: "Mineral wool",
    standard: "ASTM C547",
  },
  {
    value: "calcium-silicate",
    label: "Calcium silicate (ASTM C533)",
    shortLabel: "Calcium silicate",
    standard: "ASTM C533",
  },
  {
    value: "cellular-glass",
    label: "Cellular glass (ASTM C552)",
    shortLabel: "Cellular glass",
    standard: "ASTM C552",
  },
  {
    value: "polyurethane",
    label: "Polyurethane foam (ASTM C591)",
    shortLabel: "Polyurethane",
    standard: "ASTM C591",
  },
];

export const DEFAULT_INSULATION_HEAT_LOSS_INPUTS: InsulationHeatLossInputs = {
  unitSystem: "metric",
  nps: "4",
  insulationThickness: 50,
  material: "mineral-wool",
  operatingTemp: 200,
  ambientTemp: 25,
  windSpeed: 2,
  emissivity: 0.9,
};

const SIGMA = 5.670374419e-8; // W/m²·K⁴
const PERSONNEL_LIMIT_C = 60; // ASTM C1055 screening
const W_PER_M_TO_BTU_HR_FT = 1.040014; // W/m → Btu/hr·ft
const WMK_TO_BTU_IN = 6.933; // W/m·K → Btu·in/(hr·ft²·°F)
const HOURS_PER_YEAR = 8760;
const THICK_MM_MIN = 12.5;
const THICK_MM_MAX = 200;
const THICK_IN_MIN = 0.5;
const THICK_IN_MAX = 8;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function finite(n: number, fallback: number) {
  return Number.isFinite(n) ? n : fallback;
}

function cToF(c: number) {
  return (c * 9) / 5 + 32;
}

function fToC(f: number) {
  return ((f - 32) * 5) / 9;
}

function tempToC(value: number, unitSystem: UnitSystem) {
  return unitSystem === "imperial" ? fToC(value) : value;
}

function thicknessToM(value: number, unitSystem: UnitSystem) {
  return unitSystem === "imperial" ? (value * 25.4) / 1000 : value / 1000;
}

function windToMs(value: number, unitSystem: UnitSystem) {
  return unitSystem === "imperial" ? value * 0.44704 : value;
}

/**
 * Thermal conductivity k(T_m) in W/m·K from mean insulation temperature °C.
 * Polynomials approximate published ASTM mean curves (screening, not certified lab data).
 */
export function materialConductivityWmK(
  material: InsulationMaterial,
  meanTempC: number,
): number {
  const T = clamp(meanTempC, -40, 650);
  switch (material) {
    case "mineral-wool":
      return 0.032 + 1.05e-4 * T + 2.2e-7 * T * T;
    case "calcium-silicate":
      return 0.046 + 1.15e-4 * T + 8e-8 * T * T;
    case "cellular-glass":
      return 0.04 + 9e-5 * T + 1.5e-7 * T * T;
    case "polyurethane":
      return 0.02 + 1.0e-4 * T + 3e-7 * T * T;
    default:
      return 0.04;
  }
}

function surfaceCoefficients(
  tsC: number,
  taC: number,
  d2M: number,
  windMs: number,
  emissivity: number,
): { hc: number; hr: number; ho: number; hcNat: number; hcForced: number } {
  const dT = Math.max(tsC - taC, 0.05);
  const d2 = Math.max(d2M, 0.01);
  const hcNat = 1.32 * Math.pow(dT / d2, 0.25);
  const v = Math.max(0, windMs);
  // Mild outdoor screening — does not overwhelm ASTM C680 natural hc at ~2 m/s.
  const hcForced =
    v > 0.05 ? (2.2 * Math.pow(v, 0.6)) / Math.pow(d2, 0.4) : 0;
  const hc = Math.pow(hcNat ** 3 + hcForced ** 3, 1 / 3);
  const tsK = tsC + 273.15;
  const taK = taC + 273.15;
  const hr =
    (clamp(emissivity, 0.05, 1) * SIGMA * (tsK ** 4 - taK ** 4)) / dT;
  return { hc, hr, ho: hc + hr, hcNat, hcForced };
}

export type InsulationHeatLossComputed = {
  odMm: number;
  r1M: number;
  r2M: number;
  thicknessM: number;
  thC: number;
  taC: number;
  tsC: number;
  windMs: number;
  emissivity: number;
  kWmK: number;
  meanTempC: number;
  hc: number;
  hr: number;
  ho: number;
  hcNat: number;
  hcForced: number;
  rIns: number;
  rConv: number;
  qWm: number;
  qBareWm: number;
  savingsPct: number;
  annualKwhPerM: number;
  personnelPass: boolean;
  invalid: boolean;
  materialWarn: string | null;
};

function solveSurfaceTemp(args: {
  r1M: number;
  r2M: number;
  thC: number;
  taC: number;
  windMs: number;
  emissivity: number;
  material: InsulationMaterial;
}): {
  tsC: number;
  kWmK: number;
  meanTempC: number;
  hc: number;
  hr: number;
  ho: number;
  hcNat: number;
  hcForced: number;
  rIns: number;
  rConv: number;
  qWm: number;
} {
  const { r1M, r2M, thC, taC, windMs, emissivity, material } = args;
  const d2 = 2 * r2M;
  let tsC = clamp(taC + (thC - taC) * 0.15, taC + 1, thC - 1);

  for (let i = 0; i < 80; i += 1) {
    const meanTempC = 0.5 * (thC + tsC);
    const kWmK = materialConductivityWmK(material, meanTempC);
    const coeffs = surfaceCoefficients(tsC, taC, d2, windMs, emissivity);
    const rIns = Math.log(r2M / r1M) / (2 * Math.PI * kWmK);
    const rConv = 1 / (2 * Math.PI * r2M * coeffs.ho);
    const qWm = (thC - taC) / (rIns + rConv);
    const tsNext = taC + qWm / (2 * Math.PI * r2M * coeffs.ho);
    if (Math.abs(tsNext - tsC) < 1e-4) {
      tsC = tsNext;
      break;
    }
    tsC = 0.35 * tsC + 0.65 * tsNext;
  }

  const meanTempC = 0.5 * (thC + tsC);
  const kWmK = materialConductivityWmK(material, meanTempC);
  const coeffs = surfaceCoefficients(tsC, taC, d2, windMs, emissivity);
  const rIns = Math.log(r2M / r1M) / (2 * Math.PI * kWmK);
  const rConv = 1 / (2 * Math.PI * r2M * coeffs.ho);
  const qWm = (thC - taC) / (rIns + rConv);

  return {
    tsC,
    kWmK,
    meanTempC,
    ...coeffs,
    rIns,
    rConv,
    qWm,
  };
}

function barePipeHeatLossWm(
  r1M: number,
  thC: number,
  taC: number,
  windMs: number,
  emissivity: number,
): number {
  const coeffs = surfaceCoefficients(thC, taC, 2 * r1M, windMs, emissivity);
  return 2 * Math.PI * r1M * coeffs.ho * (thC - taC);
}

export function computeInsulationHeatLoss(
  inputs: InsulationHeatLossInputs,
): InsulationHeatLossComputed {
  const pipe = getPipeScheduleSize(inputs.nps);
  const odMm = pipe?.outsideDiameterMm ?? 114.3;
  const r1M = odMm / 2000;
  const rawThick = finite(inputs.insulationThickness, 50);
  const clampedThick =
    inputs.unitSystem === "imperial"
      ? clamp(rawThick, THICK_IN_MIN, THICK_IN_MAX)
      : clamp(rawThick, THICK_MM_MIN, THICK_MM_MAX);
  const thicknessM = thicknessToM(clampedThick, inputs.unitSystem);
  const r2M = r1M + Math.max(thicknessM, 0.001);
  const thC = tempToC(finite(inputs.operatingTemp, 200), inputs.unitSystem);
  const taC = tempToC(finite(inputs.ambientTemp, 25), inputs.unitSystem);
  const windMs = Math.max(
    0,
    windToMs(finite(inputs.windSpeed, 0), inputs.unitSystem),
  );
  const emissivity = clamp(finite(inputs.emissivity, 0.9), 0.05, 1);

  const invalid =
    !Number.isFinite(odMm) ||
    odMm <= 0 ||
    thicknessM <= 0 ||
    thC <= taC ||
    r2M <= r1M;

  let materialWarn: string | null = null;
  if (inputs.material === "polyurethane" && thC > 120) {
    materialWarn =
      "Polyurethane continuous service is typically limited near ~120 °C — confirm manufacturer rating.";
  }

  if (invalid) {
    return {
      odMm,
      r1M,
      r2M,
      thicknessM,
      thC,
      taC,
      tsC: taC,
      windMs,
      emissivity,
      kWmK: 0,
      meanTempC: taC,
      hc: 0,
      hr: 0,
      ho: 0,
      hcNat: 0,
      hcForced: 0,
      rIns: 0,
      rConv: 0,
      qWm: 0,
      qBareWm: 0,
      savingsPct: 0,
      annualKwhPerM: 0,
      personnelPass: false,
      invalid: true,
      materialWarn,
    };
  }

  const solved = solveSurfaceTemp({
    r1M,
    r2M,
    thC,
    taC,
    windMs,
    emissivity,
    material: inputs.material,
  });

  const qBareWm = barePipeHeatLossWm(r1M, thC, taC, windMs, emissivity);
  const savingsPct =
    qBareWm > 0
      ? clamp(((qBareWm - solved.qWm) / qBareWm) * 100, 0, 99.9)
      : 0;
  const annualKwhPerM = (solved.qWm * HOURS_PER_YEAR) / 1000;
  const personnelPass = solved.tsC <= PERSONNEL_LIMIT_C + 1e-6;

  return {
    odMm,
    r1M,
    r2M,
    thicknessM,
    thC,
    taC,
    tsC: solved.tsC,
    windMs,
    emissivity,
    kWmK: solved.kWmK,
    meanTempC: solved.meanTempC,
    hc: solved.hc,
    hr: solved.hr,
    ho: solved.ho,
    hcNat: solved.hcNat,
    hcForced: solved.hcForced,
    rIns: solved.rIns,
    rConv: solved.rConv,
    qWm: solved.qWm,
    qBareWm,
    savingsPct,
    annualKwhPerM,
    personnelPass,
    invalid: false,
    materialWarn,
  };
}

function fmtTempDual(c: number): string {
  if (!Number.isFinite(c)) return "—";
  return `${c.toFixed(1)} °C · ${cToF(c).toFixed(1)} °F`;
}

function fmtHeatLoss(qWm: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(qWm) || qWm < 0) return "—";
  const btu = qWm * W_PER_M_TO_BTU_HR_FT;
  if (unitSystem === "imperial") {
    return `${btu.toFixed(1)} Btu/hr·ft · ${qWm.toFixed(1)} W/m`;
  }
  return `${qWm.toFixed(1)} W/m · ${btu.toFixed(1)} Btu/hr·ft`;
}

function fmtResistance(r: number): string {
  if (!Number.isFinite(r)) return "—";
  return `${r.toFixed(3)} K·m/W`;
}

function fmtH(h: number): string {
  if (!Number.isFinite(h)) return "—";
  return `${h.toFixed(2)} W/m²·K`;
}

export function calculateInsulationHeatLoss(
  inputs: InsulationHeatLossInputs,
): CalculatorOutput {
  const c = computeInsulationHeatLoss(inputs);
  const materialMeta =
    INSULATION_MATERIAL_OPTIONS.find((m) => m.value === inputs.material) ??
    INSULATION_MATERIAL_OPTIONS[0];

  let heroStatusLevel: StatusLevel = "neutral";
  let heroStatus = "Enter valid temperatures and thickness";
  if (!c.invalid) {
    if (c.personnelPass) {
      heroStatusLevel = "pass";
      heroStatus = `Personnel protection Pass · T_s ≤ ${PERSONNEL_LIMIT_C} °C (ASTM C1055)`;
    } else {
      heroStatusLevel = "fail";
      heroStatus = `Personnel protection Fail · T_s > ${PERSONNEL_LIMIT_C} °C (140 °F)`;
    }
  }

  const callouts: ResultCallout[] = [];
  if (!c.invalid && !c.personnelPass) {
    callouts.push({
      tone: "warn",
      title: "Personnel Protection Alert",
      body: `Surface temperature exceeds ${PERSONNEL_LIMIT_C} °C (140 °F) per ASTM C1055. Burn hazard exists for direct skin contact (>5 sec). Increase insulation thickness or add personnel guards.`,
    });
  }
  callouts.push({
    tone: "info",
    title: "ASTM C680 Screening Notice",
    body: "Iterative natural-convection solver with a mild outdoor wind blend (Churchill cube-root). Forced term is intentionally soft so light wind does not erase the ASTM C680 natural formula. Thermal conductivity k varies with mean temperature T_m. Field values may vary based on jacketing emissivity and wind turbulence.",
    items: [
      `ε = ${c.emissivity.toFixed(2)} (default painted-jacket emissivity)`,
      `k(T_m) ≈ ${c.kWmK.toFixed(4)} W/m·K at T_m ≈ ${c.meanTempC.toFixed(0)} °C (${materialMeta.standard})`,
      `h_c blend: nat ${c.hcNat.toFixed(2)} · forced ${c.hcForced.toFixed(2)} → ${c.hc.toFixed(2)} W/m²·K`,
    ],
  });
  if (c.materialWarn) {
    callouts.push({
      tone: "warn",
      title: "Material temperature limit",
      body: c.materialWarn,
    });
  }

  const r1Mm = c.r1M * 1000;
  const r2Mm = c.r2M * 1000;
  const thickMm = c.thicknessM * 1000;
  const kBtuIn = c.kWmK * WMK_TO_BTU_IN;
  const annualBtuPerFt = c.qWm * W_PER_M_TO_BTU_HR_FT * HOURS_PER_YEAR;
  const annualMmbtuPerFt = annualBtuPerFt / 1e6;
  const thicknessDisplay =
    inputs.unitSystem === "imperial"
      ? `${(thickMm / 25.4).toFixed(2)} in · ${thickMm.toFixed(1)} mm`
      : `${thickMm.toFixed(1)} mm · ${(thickMm / 25.4).toFixed(2)} in`;

  const rows: ResultRow[] = [
    {
      section: "Geometry",
      label: "Pipe OD (B36)",
      value: `${c.odMm.toFixed(1)} mm · ${(c.odMm / 25.4).toFixed(3)} in`,
    },
    {
      section: "Geometry",
      label: "Inner radius r₁",
      value: `${r1Mm.toFixed(1)} mm · ${(r1Mm / 25.4).toFixed(3)} in`,
    },
    {
      section: "Geometry",
      label: "Outer radius r₂",
      value: `${r2Mm.toFixed(1)} mm · ${(r2Mm / 25.4).toFixed(3)} in`,
    },
    {
      section: "Geometry",
      label: "Insulation thickness",
      value: thicknessDisplay,
      emphasis: true,
    },
    {
      section: "Conductivity",
      label: "Insulation k(T_m)",
      value: `${c.kWmK.toFixed(4)} W/m·K · ${kBtuIn.toFixed(3)} Btu·in/(hr·ft²·°F)`,
      emphasis: true,
    },
    {
      section: "Conductivity",
      label: "Mean insulation temp T_m",
      value: fmtTempDual(c.meanTempC),
    },
    {
      section: "Surface coefficients",
      label: "Natural convection h_c,nat",
      value: fmtH(c.hcNat),
    },
    {
      section: "Surface coefficients",
      label: "Forced convection h_c,forced (mild)",
      value: fmtH(c.hcForced),
    },
    {
      section: "Surface coefficients",
      label: "Blended convection h_c",
      value: fmtH(c.hc),
      emphasis: true,
    },
    {
      section: "Surface coefficients",
      label: "Radiative h_r",
      value: fmtH(c.hr),
    },
    {
      section: "Surface coefficients",
      label: "Combined h_o = h_c + h_r",
      value: fmtH(c.ho),
    },
    {
      section: "Thermal resistance",
      label: "Insulation resistance R_ins",
      value: fmtResistance(c.rIns),
      emphasis: true,
    },
    {
      section: "Thermal resistance",
      label: "Surface resistance R_conv",
      value: fmtResistance(c.rConv),
    },
    {
      section: "Thermal resistance",
      label: "Total resistance R_tot",
      value: fmtResistance(c.rIns + c.rConv),
      emphasis: true,
    },
    {
      section: "Energy",
      label: "Annual energy loss (screening)",
      value: Number.isFinite(c.annualKwhPerM)
        ? `${c.annualKwhPerM.toFixed(0)} kWh/m·yr · ${annualBtuPerFt.toFixed(0)} Btu/yr·ft (${annualMmbtuPerFt.toFixed(3)} MMBtu/yr·ft)`
        : "—",
      emphasis: true,
    },
  ];

  const thicknessLabel =
    inputs.unitSystem === "imperial"
      ? `${inputs.insulationThickness} in`
      : `${inputs.insulationThickness} mm`;

  return {
    heroLabel: "Outer surface temperature T_s",
    heroValue: c.invalid ? "—" : fmtTempDual(c.tsC),
    heroStatus,
    heroStatusLevel,
    heroBadges: c.invalid
      ? undefined
      : [
          {
            label: "Personnel protection",
            value: c.personnelPass ? "Pass" : "Fail",
          },
          {
            label: "Material",
            value: materialMeta.shortLabel,
          },
          {
            label: "Thickness",
            value: thicknessLabel,
          },
        ],
    summary: [
      {
        label: "Heat loss per meter Q",
        value: c.invalid ? "—" : fmtHeatLoss(c.qWm, inputs.unitSystem),
      },
      {
        label: "Bare pipe heat loss",
        value: c.invalid ? "—" : fmtHeatLoss(c.qBareWm, inputs.unitSystem),
      },
      {
        label: "Bare vs insulated savings",
        value: c.invalid ? "—" : `${c.savingsPct.toFixed(1)} %`,
      },
    ],
    summaryStatus: {
      label: heroStatus,
      level: heroStatusLevel,
    },
    rows,
    callouts,
    exportRows: [
      { label: "NPS", value: inputs.nps },
      { label: "Material", value: materialMeta.label },
      { label: "Insulation thickness", value: thicknessLabel },
      {
        label: "Operating temp",
        value: `${inputs.operatingTemp} ${inputs.unitSystem === "imperial" ? "°F" : "°C"}`,
      },
      {
        label: "Ambient temp",
        value: `${inputs.ambientTemp} ${inputs.unitSystem === "imperial" ? "°F" : "°C"}`,
      },
      {
        label: "Wind speed",
        value: `${inputs.windSpeed} ${inputs.unitSystem === "imperial" ? "mph" : "m/s"}`,
      },
      { label: "Emissivity ε", value: c.emissivity.toFixed(2) },
      { label: "Surface temp T_s", value: c.invalid ? "—" : fmtTempDual(c.tsC) },
      {
        label: "Heat loss Q",
        value: c.invalid ? "—" : fmtHeatLoss(c.qWm, inputs.unitSystem),
      },
      {
        label: "Bare heat loss",
        value: c.invalid ? "—" : fmtHeatLoss(c.qBareWm, inputs.unitSystem),
      },
      {
        label: "Energy savings",
        value: c.invalid ? "—" : `${c.savingsPct.toFixed(1)} %`,
      },
      {
        label: "Annual loss",
        value: c.invalid
          ? "—"
          : `${c.annualKwhPerM.toFixed(0)} kWh/m·yr · ${(c.qWm * W_PER_M_TO_BTU_HR_FT * HOURS_PER_YEAR).toFixed(0)} Btu/yr·ft`,
      },
      {
        label: "Personnel protection",
        value: c.invalid ? "—" : c.personnelPass ? "Pass" : "Fail",
      },
    ],
  };
}
