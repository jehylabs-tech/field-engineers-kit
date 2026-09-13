/**
 * Total Dynamic Head (TDH) & Pump Power — field screening.
 *
 * Basis:
 * - Hydraulic Institute ANSI/HI 14.3 — rotodynamic pump hydraulic performance
 * - Classical duty sizing:
 *     TDH = Hs + Hf + Hp
 *     BHP = Q·TDH·SG / (3960·η_p)          [US gpm · ft]
 *     P_brake = ρ·g·Q·TDH / η_p             [SI W → kW]
 *
 * Hs = discharge elevation − suction elevation (may be negative downhill).
 * Hf ≥ 0 from piping (Pressure Drop → ΔP/(ρ g)).
 * Hp = (Pd − Ps)/(ρ g); open tanks at same Patm → ≈ 0.
 *
 * Screening only — confirm OEM curves, HI viscosity charts, and motor SF.
 */

import type {
  CalculatorOutput,
  StatusLevel,
  UnitSystem,
} from "@/lib/calculators/definitions";

export type TdhFluid = "water" | "seawater" | "condensate" | "light-hc" | "custom";
export type TdhFlowUnit = "m3h" | "gpm";

export type PumpTdhInputs = {
  unitSystem: UnitSystem;
  fluid: TdhFluid;
  /** Flow: m³/h or GPM depending on flowUnit. */
  flow: number;
  flowUnit: TdhFlowUnit;
  /** Static head Hs (discharge − suction elevation), m or ft. May be negative. */
  staticHead: number;
  /** Friction head Hf ≥ 0, m or ft. */
  frictionHead: number;
  /** Pressure head Hp = (Pd − Ps)/(ρ g), m or ft. */
  pressureHead: number;
  /** Density: kg/m³ (metric) or lb/ft³ (imperial). */
  density: number;
  /** Dynamic viscosity (cP) — awareness only; no HI derate applied. */
  viscosityCp: number;
  /** Pump efficiency fraction 0–1. */
  pumpEfficiency: number;
  /** Motor efficiency fraction 0–1. */
  motorEfficiency: number;
  /** Motor service factor applied to recommended rating (≥1). */
  serviceFactor: number;
};

export const TDH_FLUID_OPTIONS: {
  value: TdhFluid;
  label: string;
  shortLabel: string;
  densityKgM3: number;
  viscosityCp: number;
}[] = [
  {
    value: "water",
    label: "Fresh water (20 °C)",
    shortLabel: "Water",
    densityKgM3: 998,
    viscosityCp: 1.0,
  },
  {
    value: "seawater",
    label: "Seawater",
    shortLabel: "Seawater",
    densityKgM3: 1025,
    viscosityCp: 1.1,
  },
  {
    value: "condensate",
    label: "Steam condensate",
    shortLabel: "Condensate",
    densityKgM3: 960,
    viscosityCp: 0.3,
  },
  {
    value: "light-hc",
    label: "Light hydrocarbon (screening)",
    shortLabel: "Light HC",
    densityKgM3: 750,
    viscosityCp: 0.6,
  },
  {
    value: "custom",
    label: "Custom density / viscosity",
    shortLabel: "Custom",
    densityKgM3: 998,
    viscosityCp: 1.0,
  },
];

/** IEC standard motor ratings (kW). */
export const IEC_MOTOR_KW = [
  0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37,
  45, 55, 75, 90, 110, 132, 160, 200, 250, 315, 355, 400, 450, 500,
] as const;

/** Common NEMA / US motor ratings (HP). */
export const NEMA_MOTOR_HP = [
  0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100,
  125, 150, 200, 250, 300, 350, 400, 450, 500,
] as const;

export const DEFAULT_PUMP_TDH_INPUTS: PumpTdhInputs = {
  unitSystem: "metric",
  fluid: "water",
  flow: 50,
  flowUnit: "m3h",
  staticHead: 20,
  frictionHead: 5,
  pressureHead: 0,
  density: 998,
  viscosityCp: 1.0,
  pumpEfficiency: 0.7,
  motorEfficiency: 0.92,
  serviceFactor: 1.15,
};

const G = 9.80665;
/** SG reference: pure water at 4 °C ≈ 1000 kg/m³. */
const WATER_SG_REF_KG_M3 = 1000;
const KW_PER_HP = 0.745699872;
const M3H_TO_GPM = 4.402867513;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function densityToKgM3(density: number, unitSystem: UnitSystem): number {
  const d = Math.max(0, finite(density));
  return unitSystem === "imperial" ? d / 0.06242796 : d;
}

export function specificGravity(densityKgM3: number): number {
  if (densityKgM3 <= 0) return 0;
  return densityKgM3 / WATER_SG_REF_KG_M3;
}

function headToM(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? finite(value) * 0.3048 : finite(value);
}

function mToHead(m: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? m / 0.3048 : m;
}

export function flowToM3s(flow: number, flowUnit: TdhFlowUnit): number {
  const q = Math.max(0, finite(flow));
  if (flowUnit === "gpm") return q * 6.30901964e-5;
  return q / 3600;
}

export function flowToGpm(flow: number, flowUnit: TdhFlowUnit): number {
  const q = Math.max(0, finite(flow));
  if (flowUnit === "gpm") return q;
  return q * M3H_TO_GPM;
}

/** Convert displayed flow when the user switches flow unit. */
export function convertFlowBetweenUnits(
  flow: number,
  from: TdhFlowUnit,
  to: TdhFlowUnit,
): number {
  if (from === to) return flow;
  if (from === "m3h" && to === "gpm") {
    return Number((finite(flow) * M3H_TO_GPM).toFixed(2));
  }
  return Number((finite(flow) / M3H_TO_GPM).toFixed(2));
}

export function applyFluidPreset(
  fluid: TdhFluid,
  unitSystem: UnitSystem,
): Pick<PumpTdhInputs, "density" | "viscosityCp"> {
  const row =
    TDH_FLUID_OPTIONS.find((f) => f.value === fluid) ?? TDH_FLUID_OPTIONS[0];
  const density =
    unitSystem === "imperial"
      ? Number((row.densityKgM3 * 0.06242796).toFixed(2))
      : row.densityKgM3;
  return { density, viscosityCp: row.viscosityCp };
}

export function recommendIecKw(requiredKw: number): number | null {
  if (!Number.isFinite(requiredKw) || requiredKw <= 0) return null;
  const hit = IEC_MOTOR_KW.find((kw) => kw >= requiredKw - 1e-9);
  return hit ?? IEC_MOTOR_KW[IEC_MOTOR_KW.length - 1];
}

export function recommendNemaHp(requiredHp: number): number | null {
  if (!Number.isFinite(requiredHp) || requiredHp <= 0) return null;
  const hit = NEMA_MOTOR_HP.find((hp) => hp >= requiredHp - 1e-9);
  return hit ?? NEMA_MOTOR_HP[NEMA_MOTOR_HP.length - 1];
}

export type PumpTdhComputed = {
  densityKgM3: number;
  sg: number;
  tdhM: number;
  staticM: number;
  frictionM: number;
  pressureM: number;
  flowM3s: number;
  flowGpm: number;
  etaPump: number;
  etaMotor: number;
  serviceFactor: number;
  hydraulicKw: number;
  brakeKw: number;
  brakeHp: number;
  motorInputKw: number;
  motorInputHp: number;
  /** Motor input × service factor (sizing basis). */
  sizedKw: number;
  sizedHp: number;
  recommendedKw: number | null;
  recommendedHp: number | null;
  invalid: boolean;
};

export function computePumpTdh(inputs: PumpTdhInputs): PumpTdhComputed {
  const densityKgM3 = densityToKgM3(inputs.density, inputs.unitSystem);
  const sg = specificGravity(densityKgM3);
  const staticM = headToM(inputs.staticHead, inputs.unitSystem);
  const frictionM = Math.max(0, headToM(inputs.frictionHead, inputs.unitSystem));
  const pressureM = headToM(inputs.pressureHead, inputs.unitSystem);
  const tdhM = staticM + frictionM + pressureM;
  const flowM3s = flowToM3s(inputs.flow, inputs.flowUnit);
  const flowGpm = flowToGpm(inputs.flow, inputs.flowUnit);
  const etaPump = clamp(finite(inputs.pumpEfficiency, 0.7), 0.05, 1);
  const etaMotor = clamp(finite(inputs.motorEfficiency, 0.92), 0.05, 1);
  const serviceFactor = clamp(finite(inputs.serviceFactor, 1.15), 1, 1.5);

  const invalid =
    densityKgM3 <= 0 ||
    flowM3s <= 0 ||
    tdhM <= 0 ||
    !Number.isFinite(tdhM);

  const hydraulicKw = invalid
    ? 0
    : (densityKgM3 * G * flowM3s * tdhM) / 1000;

  // Prefer the classical US BHP form when imperial (matches HI field worksheets);
  // SI path otherwise. Both agree within rounding for water.
  const tdhFt = mToHead(tdhM, "imperial");
  const brakeHpFromUs =
    invalid || etaPump <= 0
      ? 0
      : (flowGpm * tdhFt * sg) / (3960 * etaPump);
  const brakeKwFromSi = invalid || etaPump <= 0 ? 0 : hydraulicKw / etaPump;

  const brakeKw =
    inputs.unitSystem === "imperial"
      ? brakeHpFromUs * KW_PER_HP
      : brakeKwFromSi;
  const brakeHp = brakeKw / KW_PER_HP;

  const motorInputKw = etaMotor > 0 ? brakeKw / etaMotor : 0;
  const motorInputHp = motorInputKw / KW_PER_HP;
  const sizedKw = motorInputKw * serviceFactor;
  const sizedHp = motorInputHp * serviceFactor;

  return {
    densityKgM3,
    sg,
    tdhM,
    staticM,
    frictionM,
    pressureM,
    flowM3s,
    flowGpm,
    etaPump,
    etaMotor,
    serviceFactor,
    hydraulicKw,
    brakeKw,
    brakeHp,
    motorInputKw,
    motorInputHp,
    sizedKw,
    sizedHp,
    recommendedKw: recommendIecKw(sizedKw),
    recommendedHp: recommendNemaHp(sizedHp),
    invalid,
  };
}

function formatHead(m: number, unitSystem: UnitSystem, digits = 2): string {
  if (!Number.isFinite(m)) return unitSystem === "imperial" ? "— ft" : "— m";
  const v = mToHead(m, unitSystem);
  const sign = v < 0 ? "−" : "";
  const abs = Math.abs(v);
  return unitSystem === "imperial"
    ? `${sign}${abs.toFixed(digits)} ft`
    : `${sign}${abs.toFixed(digits)} m`;
}

function formatPowerKw(kw: number): string {
  if (!Number.isFinite(kw) || kw <= 0) return "— kW";
  if (kw < 10) return `${kw.toFixed(2)} kW`;
  return `${kw.toFixed(1)} kW`;
}

function formatPowerHp(hp: number): string {
  if (!Number.isFinite(hp) || hp <= 0) return "— HP";
  if (hp < 10) return `${hp.toFixed(2)} HP`;
  return `${hp.toFixed(1)} HP`;
}

function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)} %`;
}

function statusFor(
  c: PumpTdhComputed,
  viscosityCp: number,
): { level: StatusLevel; label: string } {
  if (c.invalid) {
    return {
      level: "warn",
      label: "Enter positive flow and TDH = Hs + Hf + Hp > 0",
    };
  }
  if (viscosityCp > 20) {
    return {
      level: "warn",
      label: "High viscosity — HI / OEM derate not applied; confirm water-curve correction",
    };
  }
  if (c.etaPump < 0.4) {
    return {
      level: "warn",
      label: "Very low pump η — verify duty point on the OEM curve",
    };
  }
  if (c.motorInputKw > 200) {
    return {
      level: "warn",
      label: "Large motor duty — confirm HI 14.3 / project motor SF with vendor",
    };
  }
  if (c.serviceFactor > 1.01) {
    return {
      level: "pass",
      label: `TDH & power OK — motor sized at SF ${c.serviceFactor.toFixed(2)}× input`,
    };
  }
  return {
    level: "pass",
    label: "TDH & brake power screening — confirm OEM η and project motor SF",
  };
}

export function calculatePumpTdh(inputs: PumpTdhInputs): CalculatorOutput {
  const c = computePumpTdh(inputs);
  const status = statusFor(c, finite(inputs.viscosityCp));

  const fluidLabel =
    TDH_FLUID_OPTIONS.find((f) => f.value === inputs.fluid)?.label ??
    inputs.fluid;
  const flowLabel =
    inputs.flowUnit === "gpm"
      ? `${finite(inputs.flow).toFixed(1)} GPM`
      : `${finite(inputs.flow).toFixed(1)} m³/h`;

  const tdhOut = c.invalid ? "—" : formatHead(c.tdhM, inputs.unitSystem);
  const brakeOut =
    c.invalid
      ? "—"
      : inputs.unitSystem === "imperial"
        ? formatPowerHp(c.brakeHp)
        : formatPowerKw(c.brakeKw);
  const motorRec =
    c.invalid
      ? "—"
      : inputs.unitSystem === "imperial"
        ? c.recommendedHp != null
          ? `${c.recommendedHp} HP (NEMA)`
          : "—"
        : c.recommendedKw != null
          ? `${c.recommendedKw} kW (IEC)`
          : "—";

  return {
    heroLabel: "Total dynamic head TDH",
    heroValue: tdhOut,
    heroStatus: status.label,
    heroStatusLevel: status.level,
    heroBadges: [
      {
        label: "Brake",
        value:
          inputs.unitSystem === "imperial"
            ? formatPowerHp(c.brakeHp)
            : formatPowerKw(c.brakeKw),
      },
      {
        label: "Motor in",
        value:
          inputs.unitSystem === "imperial"
            ? formatPowerHp(c.motorInputHp)
            : formatPowerKw(c.motorInputKw),
      },
      { label: "SF", value: `${c.serviceFactor.toFixed(2)}×` },
      { label: "Recommend", value: motorRec },
    ],
    summary: [
      { label: "TDH", value: tdhOut },
      { label: "Brake power", value: brakeOut },
      { label: "Motor recommendation", value: motorRec },
    ],
    summaryStatus: {
      label:
        "HI 14.3 / affinity screening — not a substitute for OEM curves or guaranteed motor SF",
      level: "neutral",
    },
    rows: [
      {
        label: "Fluid",
        value: fluidLabel,
        section: "Duty & fluid",
      },
      {
        label: "Flow Q",
        value: flowLabel,
        section: "Duty & fluid",
        emphasis: true,
      },
      {
        label: "Density ρ",
        value:
          inputs.unitSystem === "imperial"
            ? `${finite(inputs.density).toFixed(2)} lb/ft³`
            : `${c.densityKgM3.toFixed(1)} kg/m³`,
        section: "Duty & fluid",
      },
      {
        label: "Specific gravity SG",
        value: c.sg.toFixed(3),
        section: "Duty & fluid",
      },
      {
        label: "Viscosity μ",
        value: `${finite(inputs.viscosityCp).toFixed(2)} cP`,
        section: "Duty & fluid",
        warn: finite(inputs.viscosityCp) > 20,
      },
      {
        label: "Static head Hs",
        value: formatHead(c.staticM, inputs.unitSystem),
        section: "TDH breakdown",
      },
      {
        label: "Friction head Hf",
        value: formatHead(c.frictionM, inputs.unitSystem),
        section: "TDH breakdown",
        emphasis: true,
      },
      {
        label: "Pressure head Hp",
        value: formatHead(c.pressureM, inputs.unitSystem),
        section: "TDH breakdown",
      },
      {
        label: "TDH = Hs + Hf + Hp",
        value: formatHead(c.tdhM, inputs.unitSystem),
        section: "TDH breakdown",
        emphasis: true,
      },
      {
        label: "Pump efficiency η_p",
        value: formatPct(c.etaPump),
        section: "Power & motor",
      },
      {
        label: "Hydraulic power",
        value: `${formatPowerKw(c.hydraulicKw)} · ${formatPowerHp(c.hydraulicKw / KW_PER_HP)}`,
        section: "Power & motor",
      },
      {
        label: "Brake / shaft power",
        value: `${formatPowerKw(c.brakeKw)} · ${formatPowerHp(c.brakeHp)}`,
        section: "Power & motor",
        emphasis: true,
      },
      {
        label: "Motor efficiency η_m",
        value: formatPct(c.etaMotor),
        section: "Power & motor",
      },
      {
        label: "Motor input (est.)",
        value: `${formatPowerKw(c.motorInputKw)} · ${formatPowerHp(c.motorInputHp)}`,
        section: "Power & motor",
      },
      {
        label: "Service factor SF",
        value: `${c.serviceFactor.toFixed(2)}×`,
        section: "Power & motor",
      },
      {
        label: "Sizing basis (input × SF)",
        value: `${formatPowerKw(c.sizedKw)} · ${formatPowerHp(c.sizedHp)}`,
        section: "Power & motor",
      },
      {
        label: "Recommended motor",
        value: motorRec,
        section: "Power & motor",
        emphasis: true,
      },
    ],
    callouts: [
      {
        tone: "info",
        title: "Friction head from piping",
        body: "Estimate Hf with Pressure Drop & Friction (Darcy–Weisbach), convert ΔP → head Hf = ΔP/(ρ g), then enter it here. Include fittings and strainer equivalent lengths.",
        items: [
          "Hs is discharge elevation minus suction elevation (negative if downhill).",
          "Open tanks sharing atmosphere usually have Hp ≈ 0.",
          "BHP = Q·TDH·SG/(3960·η_p) (gpm·ft). Metric uses ρ·g·Q·H/η_p.",
          "Motor pick = next IEC kW / NEMA HP ≥ (brake/η_m)×SF.",
        ],
      },
      {
        tone: "warn",
        title: "HI 14.3 & viscosity",
        body: "ANSI/HI 14.3 is the hydraulic performance acceptance context. Viscous liquids can derate head and efficiency vs water curves — this app does not apply HI viscosity correction charts. Confirm with OEM data when μ ≫ 1 cP.",
      },
    ],
    exportRows: [
      { label: "Standard", value: "HI 14.3 (screening) · affinity BHP" },
      { label: "Fluid", value: fluidLabel },
      { label: "Flow Q", value: flowLabel },
      {
        label: "Density",
        value:
          inputs.unitSystem === "imperial"
            ? `${finite(inputs.density).toFixed(2)} lb/ft³`
            : `${c.densityKgM3.toFixed(1)} kg/m³`,
      },
      { label: "SG", value: c.sg.toFixed(3) },
      { label: "Viscosity", value: `${finite(inputs.viscosityCp).toFixed(2)} cP` },
      { label: "Hs", value: formatHead(c.staticM, inputs.unitSystem) },
      { label: "Hf", value: formatHead(c.frictionM, inputs.unitSystem) },
      { label: "Hp", value: formatHead(c.pressureM, inputs.unitSystem) },
      { label: "TDH", value: formatHead(c.tdhM, inputs.unitSystem) },
      { label: "η_p", value: formatPct(c.etaPump) },
      { label: "η_m", value: formatPct(c.etaMotor) },
      { label: "SF", value: `${c.serviceFactor.toFixed(2)}×` },
      { label: "Hydraulic kW", value: formatPowerKw(c.hydraulicKw) },
      { label: "Brake kW", value: formatPowerKw(c.brakeKw) },
      { label: "Brake HP", value: formatPowerHp(c.brakeHp) },
      { label: "Motor input kW", value: formatPowerKw(c.motorInputKw) },
      { label: "Sized kW (×SF)", value: formatPowerKw(c.sizedKw) },
      { label: "Recommended motor", value: motorRec },
    ],
  };
}
