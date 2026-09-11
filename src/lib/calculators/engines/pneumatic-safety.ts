import type { CalculatorOutput, UnitSystem } from "@/lib/calculators/definitions";
import {
  defaultScheduleForNps,
  getPipeScheduleEntry,
  listAvailableNps,
} from "@/lib/data/loaders";

/**
 * ASME PCC-2 Article 501 — Pneumatic Test Safety Distance (screening).
 *
 * Stored energy of an ideal gas expanding to atmosphere, then cube-root
 * scaling to a personnel exclusion radius (Nonmandatory Appendix energy method).
 *
 * E = [P₁ V / (γ − 1)] [1 − (P₀ / P₁)^((γ − 1)/γ)]
 * D = R₀ × (E / E_TNT)^{1/3}
 *
 * Field screening only — not a site-specific blast analysis.
 */

export type PneumaticGas = "air" | "nitrogen" | "helium";
export type PneumaticVolumeMode = "volume" | "pipe";

export type PneumaticSafetyInputs = {
  unitSystem: UnitSystem;
  mode: PneumaticVolumeMode;
  /** Gauge test pressure: bar (metric) or psi (imperial). */
  testPressure: number;
  /** Direct volume: m³ (metric) or ft³ (imperial). Used when mode = volume. */
  volume: number;
  nps: string;
  schedule: string;
  /** Pipe run length: m (metric) or ft (imperial). Used when mode = pipe. */
  length: number;
  gas: PneumaticGas;
};

const P_ATM_PA = 101_325;
/** 1 lb TNT ≈ 1.4×10⁶ ft·lbf (ASME convention) → Joules. */
const E_TNT_J_PER_LB = 1.4e6 * 1.3558179483314;
/**
 * Reference standoff for 1 lb TNT at ~1 psi side-on overpressure
 * (unprotected personnel screening). Site AHJ may require larger.
 */
const R0_FT = 45;

const GAS_GAMMA: Record<PneumaticGas, number> = {
  air: 1.4,
  nitrogen: 1.4,
  helium: 1.667,
};

export const PNEUMATIC_GAS_OPTIONS: { value: PneumaticGas; label: string }[] = [
  { value: "air", label: "Air (γ = 1.40)" },
  { value: "nitrogen", label: "Nitrogen (γ = 1.40)" },
  { value: "helium", label: "Helium (γ = 1.67)" },
];

export const PNEUMATIC_MODE_OPTIONS: {
  value: PneumaticVolumeMode;
  label: string;
}[] = [
  { value: "volume", label: "Direct volume" },
  { value: "pipe", label: "Pipe run (NPS × Sch × L)" },
];

/** Field quick picks — keep in sync with worked example / pSEO defaults. */
export const PNEUMATIC_METRIC_PRESETS = [
  { testPressure: 5, volume: 1, label: "5 bar · 1 m³" },
  { testPressure: 10, volume: 2, label: "10 bar · 2 m³" },
  { testPressure: 15, volume: 5, label: "15 bar · 5 m³" },
  { testPressure: 20, volume: 10, label: "20 bar · 10 m³" },
] as const;

export const PNEUMATIC_IMPERIAL_PRESETS = [
  { testPressure: 75, volume: 25, label: "75 psi · 25 ft³" },
  { testPressure: 150, volume: 50, label: "150 psi · 50 ft³" },
  { testPressure: 200, volume: 100, label: "200 psi · 100 ft³" },
] as const;

export const DEFAULT_PNEUMATIC_SAFETY_INPUTS: PneumaticSafetyInputs = {
  unitSystem: "metric",
  mode: "volume",
  testPressure: 10,
  volume: 2,
  nps: "6",
  schedule: "40",
  length: 100,
  gas: "air",
};

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function barToPaGauge(bar: number): number {
  return bar * 1e5;
}

function psiToPaGauge(psi: number): number {
  return psi * 6894.757293168;
}

function m3FromFt3(ft3: number): number {
  return ft3 * 0.028316846592;
}

function ft3FromM3(m3: number): number {
  return m3 / 0.028316846592;
}

export function gasGamma(gas: PneumaticGas): number {
  return GAS_GAMMA[gas] ?? 1.4;
}

/** Absolute test pressure (Pa) from gauge display value. */
export function absoluteTestPressurePa(inputs: PneumaticSafetyInputs): number {
  const gauge = Math.max(0, finite(inputs.testPressure));
  const gaugePa =
    inputs.unitSystem === "imperial"
      ? psiToPaGauge(gauge)
      : barToPaGauge(gauge);
  return gaugePa + P_ATM_PA;
}

/** Internal volume under test (m³). */
export function resolveVolumeM3(inputs: PneumaticSafetyInputs): number {
  if (inputs.mode === "pipe") {
    const sch =
      defaultScheduleForNps(inputs.nps, inputs.schedule) || inputs.schedule;
    const entry = getPipeScheduleEntry(inputs.nps, sch);
    if (!entry) return 0;
    const idM = entry.row.insideDiameterMm / 1000;
    const lengthM =
      inputs.unitSystem === "imperial"
        ? finite(inputs.length) * 0.3048
        : finite(inputs.length);
    if (idM <= 0 || lengthM <= 0) return 0;
    return (Math.PI / 4) * idM * idM * lengthM;
  }
  const vol = Math.max(0, finite(inputs.volume));
  return inputs.unitSystem === "imperial" ? m3FromFt3(vol) : vol;
}

/**
 * Ideal-gas stored energy released expanding to atmosphere (Joules).
 * ASME PCC-2 Article 501 Nonmandatory Appendix form.
 */
export function pneumaticStoredEnergyJ(inputs: PneumaticSafetyInputs): number {
  const p1 = absoluteTestPressurePa(inputs);
  const v = resolveVolumeM3(inputs);
  const gamma = gasGamma(inputs.gas);
  if (p1 <= P_ATM_PA || v <= 0 || gamma <= 1) return 0;
  const ratio = P_ATM_PA / p1;
  const exponent = (gamma - 1) / gamma;
  const term = 1 - ratio ** exponent;
  const e = ((p1 * v) / (gamma - 1)) * term;
  return Number.isFinite(e) && e > 0 ? e : 0;
}

export function tntEquivalentLb(energyJ: number): number {
  if (energyJ <= 0) return 0;
  return energyJ / E_TNT_J_PER_LB;
}

/** Minimum personnel exclusion distance (metres). */
export function pneumaticSafeDistanceM(inputs: PneumaticSafetyInputs): number {
  const e = pneumaticStoredEnergyJ(inputs);
  const wLb = tntEquivalentLb(e);
  if (wLb <= 0) return 0;
  const dFt = R0_FT * wLb ** (1 / 3);
  return dFt * 0.3048;
}

export function listPneumaticNpsOptions(): {
  value: string;
  label: string;
}[] {
  return listAvailableNps()
    .filter((pipe) => {
      const n = Number(pipe.nps);
      return Number.isFinite(n) && n >= 0.5 && n <= 24;
    })
    .map((pipe) => ({ value: pipe.nps, label: pipe.npsLabel }));
}

function formatDistance(m: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(m) || m <= 0) return unitSystem === "imperial" ? "— ft" : "— m";
  if (unitSystem === "imperial") {
    return `${(m / 0.3048).toFixed(1)} ft`;
  }
  return `${m.toFixed(1)} m`;
}

function formatEnergyMj(j: number): string {
  if (!Number.isFinite(j) || j <= 0) return "— MJ";
  return `${(j / 1e6).toFixed(3)} MJ`;
}

function formatPressure(inputs: PneumaticSafetyInputs): string {
  const unit = inputs.unitSystem === "imperial" ? "psi" : "bar";
  return `${finite(inputs.testPressure).toFixed(inputs.unitSystem === "imperial" ? 0 : 2)} ${unit} g`;
}

function formatAbsolutePressure(pAbsPa: number, unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") {
    return `${(pAbsPa / 6894.757293168).toFixed(1)} psi a`;
  }
  return `${(pAbsPa / 1e5).toFixed(3)} bar a`;
}

function formatVolumeDisplay(inputs: PneumaticSafetyInputs, volM3: number): string {
  if (inputs.unitSystem === "imperial") {
    return `${ft3FromM3(volM3).toFixed(2)} ft³`;
  }
  return `${volM3.toFixed(3)} m³`;
}

export function calculatePneumaticSafety(
  inputs: PneumaticSafetyInputs,
): CalculatorOutput {
  const volM3 = resolveVolumeM3(inputs);
  const energyJ = pneumaticStoredEnergyJ(inputs);
  const wLb = tntEquivalentLb(energyJ);
  const distM = pneumaticSafeDistanceM(inputs);
  const gamma = gasGamma(inputs.gas);
  const pAbsPa = absoluteTestPressurePa(inputs);
  const invalid = volM3 <= 0 || finite(inputs.testPressure) <= 0 || energyJ <= 0;

  const distOut = invalid
    ? "—"
    : formatDistance(distM, inputs.unitSystem);
  const level: CalculatorOutput["heroStatusLevel"] = invalid
    ? "warn"
    : distM >= 50
      ? "warn"
      : "pass";

  const gasOptionLabel =
    PNEUMATIC_GAS_OPTIONS.find((g) => g.value === inputs.gas)?.label ??
    inputs.gas;

  const sch =
    defaultScheduleForNps(inputs.nps, inputs.schedule) || inputs.schedule;
  const entry =
    inputs.mode === "pipe" ? getPipeScheduleEntry(inputs.nps, sch) : null;

  const heroStatus = invalid
    ? "Enter positive test pressure and volume (or valid pipe run)"
    : distM >= 50
      ? `Large exclusion zone · ${formatDistance(distM, inputs.unitSystem)} — confirm barriers / AHJ before pressurization · E = ${formatEnergyMj(energyJ)}`
      : `ASME PCC-2 Art. 501 screening · E = ${formatEnergyMj(energyJ)} · ${wLb.toFixed(3)} lb TNT eq.`;

  return {
    heroLabel: "Min. safe distance D",
    heroValue: invalid ? "—" : formatDistance(distM, inputs.unitSystem),
    heroStatus,
    heroStatusLevel: level,
    heroBadges: [
      { label: "E", value: formatEnergyMj(energyJ) },
      { label: "TNT eq.", value: `${wLb.toFixed(3)} lb` },
      { label: "P_test", value: formatPressure(inputs) },
      { label: "V", value: formatVolumeDisplay(inputs, volM3) },
    ],
    summary: [
      { label: "Safe distance D", value: distOut },
      { label: "Stored energy E", value: formatEnergyMj(energyJ) },
      { label: "TNT equivalent", value: `${wLb.toFixed(3)} lb` },
    ],
    summaryStatus: {
      label:
        "PCC-2 Art. 501 energy method · R₀ = 45 ft per lb TNT (~1 psi side-on) — not a blast analysis",
      level: "neutral",
    },
    rows: [
      {
        label: "Test pressure (gauge)",
        value: formatPressure(inputs),
        section: "Test conditions",
      },
      {
        label: "Absolute pressure P₁",
        value: formatAbsolutePressure(pAbsPa, inputs.unitSystem),
        section: "Test conditions",
      },
      {
        label: "Test gas",
        value: gasOptionLabel,
        section: "Test conditions",
      },
      {
        label: "Ratio of specific heats γ",
        value: gamma.toFixed(2),
        section: "Test conditions",
      },
      {
        label: "Volume mode",
        value: inputs.mode === "pipe" ? "Pipe run" : "Direct volume",
        section: "Volume",
      },
      {
        label: "Volume under test V",
        value: formatVolumeDisplay(inputs, volM3),
        section: "Volume",
        emphasis: true,
      },
      ...(inputs.mode === "pipe" && entry
        ? [
            {
              label: "Pipe",
              value: `NPS ${inputs.nps}" Sch ${entry.row.schedule} · ID ${entry.row.insideDiameterMm.toFixed(2)} mm`,
              section: "Volume",
            },
            {
              label: "Run length L",
              value:
                inputs.unitSystem === "imperial"
                  ? `${finite(inputs.length).toFixed(1)} ft`
                  : `${finite(inputs.length).toFixed(1)} m`,
              section: "Volume",
            },
          ]
        : []),
      {
        label: "Stored energy E",
        value: formatEnergyMj(energyJ),
        section: "Energy & distance",
        emphasis: true,
      },
      {
        label: "TNT equivalent W",
        value: `${wLb.toFixed(4)} lb`,
        section: "Energy & distance",
      },
      {
        label: "Reference R₀ (1 lb TNT)",
        value: `${R0_FT} ft (${(R0_FT * 0.3048).toFixed(1)} m)`,
        section: "Energy & distance",
      },
      {
        label: "Min. personnel distance D",
        value: formatDistance(distM, inputs.unitSystem),
        section: "Energy & distance",
        emphasis: true,
      },
    ],
    callouts: [
      {
        tone: "warn",
        title: "Safety boundary",
        body: "This is ASME PCC-2 Article 501 field screening for an unprotected personnel exclusion radius. Barriers, blast mats, stepwise pressurization, written authorization (B31.3), and AHJ rules may require a larger zone — escalate to a pressure-test / inspection contractor for formal packages.",
        items: [
          "Keep non-essential personnel outside D during pressurization and hold.",
          "Pneumatic stored energy ≫ hydrostatic — prefer hydrotest when practical.",
          "Export / PDF this sheet for the test package; it is not a stamped engineering report.",
        ],
      },
      {
        tone: "info",
        title: "B2B inspection / PDF package",
        body: "Need a signed pneumatic-test procedure, barrier layout, or third-party witness package? Use this screening distance as the starting exclusion radius, then engage an authorized inspector / NDE firm for PCC-2 Article 501 documentation.",
      },
    ],
    exportRows: [
      { label: "Standard", value: "ASME PCC-2 Article 501 (screening)" },
      { label: "Test pressure", value: formatPressure(inputs) },
      {
        label: "Absolute pressure P1",
        value: formatAbsolutePressure(pAbsPa, inputs.unitSystem),
      },
      { label: "Gas", value: gasOptionLabel },
      { label: "Gamma", value: gamma.toFixed(2) },
      { label: "Volume mode", value: inputs.mode === "pipe" ? "Pipe run" : "Direct volume" },
      { label: "Volume V", value: formatVolumeDisplay(inputs, volM3) },
      ...(inputs.mode === "pipe" && entry
        ? [
            {
              label: "Pipe",
              value: `NPS ${inputs.nps}" Sch ${entry.row.schedule}`,
            },
            {
              label: "Run length L",
              value:
                inputs.unitSystem === "imperial"
                  ? `${finite(inputs.length).toFixed(1)} ft`
                  : `${finite(inputs.length).toFixed(1)} m`,
            },
          ]
        : []),
      { label: "Stored energy E", value: formatEnergyMj(energyJ) },
      { label: "TNT equivalent", value: `${wLb.toFixed(4)} lb` },
      { label: "Safe distance D", value: formatDistance(distM, inputs.unitSystem) },
      { label: "R0 reference", value: `${R0_FT} ft per lb TNT` },
    ],
  };
}
