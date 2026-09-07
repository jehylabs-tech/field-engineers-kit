import type {
  CalculatorOutput,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  barToPsi,
  cToF,
  gpmToM3h,
  psiToBar,
  fToC,
} from "@/lib/unitConverter";

export type ValveCvFluid = "liquid" | "gas";

export type ValveCvInputs = {
  unitSystem: UnitSystem;
  fluid: ValveCvFluid;
  flowRate: number;
  inletPressure: number;
  outletPressure: number;
  specificGravity: number;
  temperature: number;
  requiredCv: number;
};

/** m³/h → US gpm */
const M3H_TO_GPM = 4.402867655;
/** bar → psi */
const BAR_TO_PSI = 14.5037738;
/** Nm³/h → scfh */
const NM3H_TO_SCFH = 35.314666721;
/** Standard atmosphere for gauge → absolute conversion */
const ATM_BAR = 1.01325;

/**
 * ISA/IEC liquid sizing, US Cv. Q in m³/h, ΔP in bar (gauge differential = absolute differential).
 * Cv = Q_gpm * √(SG / ΔP_psi)
 */
export function liquidCvUs(flowM3h: number, deltaPBar: number, sg: number): number {
  if (deltaPBar <= 0 || flowM3h < 0 || sg <= 0) return 0;
  const qGpm = flowM3h * M3H_TO_GPM;
  const dpPsi = deltaPBar * BAR_TO_PSI;
  return qGpm * Math.sqrt(sg / dpPsi);
}

/**
 * ISA S75.01 simplified gas (non-choked). Q in Nm³/h, P1/P2 as absolute bar(a),
 * T in °C. Returns 0 if the square-root argument is not finite.
 */
export function gasCvUs(
  flowNm3h: number,
  p1BarAbs: number,
  p2BarAbs: number,
  sg: number,
  tempC: number,
): number {
  if (
    flowNm3h <= 0 ||
    p1BarAbs <= 0 ||
    p2BarAbs < 0 ||
    p1BarAbs <= p2BarAbs ||
    sg <= 0
  ) {
    return 0;
  }
  const tR = (tempC + 273.15) * 1.8;
  if (tR <= 0) return 0;
  const qScfh = flowNm3h * NM3H_TO_SCFH;
  const p1Psia = p1BarAbs * BAR_TO_PSI;
  const dpPsi = (p1BarAbs - p2BarAbs) * BAR_TO_PSI;
  const inner = (sg * tR) / (dpPsi * p1Psia);
  if (!Number.isFinite(inner) || inner <= 0) return 0;
  return qScfh / (1360 * p1Psia) * Math.sqrt(sg * tR * p1Psia / dpPsi);
}

function toMetricProcess(inputs: ValveCvInputs): {
  flowM3hOrNm3h: number;
  p1BarGauge: number;
  p2BarGauge: number;
  tempC: number;
} {
  if (inputs.unitSystem !== "imperial") {
    return {
      flowM3hOrNm3h: inputs.flowRate,
      p1BarGauge: inputs.inletPressure,
      p2BarGauge: inputs.outletPressure,
      tempC: inputs.temperature,
    };
  }
  const isGas = inputs.fluid === "gas";
  return {
    flowM3hOrNm3h: isGas
      ? inputs.flowRate / NM3H_TO_SCFH
      : gpmToM3h(inputs.flowRate),
    p1BarGauge: psiToBar(inputs.inletPressure),
    p2BarGauge: psiToBar(inputs.outletPressure),
    tempC: fToC(inputs.temperature),
  };
}

export function calculateValveCv(inputs: ValveCvInputs): CalculatorOutput {
  const metric = toMetricProcess(inputs);
  const deltaPBar = metric.p1BarGauge - metric.p2BarGauge;
  let calculatedCv = 0;

  if (
    deltaPBar > 0 &&
    Number.isFinite(metric.flowM3hOrNm3h) &&
    metric.flowM3hOrNm3h > 0 &&
    Number.isFinite(inputs.specificGravity) &&
    inputs.specificGravity > 0
  ) {
    if (inputs.fluid === "liquid") {
      calculatedCv = liquidCvUs(
        metric.flowM3hOrNm3h,
        deltaPBar,
        inputs.specificGravity,
      );
    } else {
      // Gas sizing requires absolute pressures; UI inputs are gauge.
      calculatedCv = gasCvUs(
        metric.flowM3hOrNm3h,
        metric.p1BarGauge + ATM_BAR,
        metric.p2BarGauge + ATM_BAR,
        inputs.specificGravity,
        metric.tempC,
      );
    }
  }

  if (!Number.isFinite(calculatedCv) || calculatedCv < 0) {
    calculatedCv = 0;
  }

  const catalogCv = inputs.requiredCv;
  const fillPercent =
    catalogCv > 0
      ? Math.min(100, (calculatedCv / catalogCv) * 100)
      : 0;
  const passes = calculatedCv > 0 && catalogCv > 0 && calculatedCv <= catalogCv;

  const imperial = inputs.unitSystem === "imperial";
  const flowUnit = imperial
    ? inputs.fluid === "liquid"
      ? "GPM"
      : "SCFH"
    : inputs.fluid === "liquid"
      ? "m³/h"
      : "Nm³/h";
  const pressureUnit = imperial ? "psig" : "bar g";
  const tempUnit = imperial ? "°F" : "°C";
  const deltaPUnit = imperial ? "psi" : "bar";
  const deltaPDisplay = imperial
    ? barToPsi(deltaPBar)
    : deltaPBar;
  const tempDisplay = imperial
    ? cToF(metric.tempC)
    : metric.tempC;
  const cvLabel = calculatedCv > 0 ? calculatedCv.toFixed(2) : "—";
  const fluidLabel = inputs.fluid === "liquid" ? "Liquid" : "Gas";

  return {
    heroLabel: "Required Cv (calculated)",
    heroValue: cvLabel,
    heroStatus: calculatedCv <= 0
      ? "Invalid pressure drop — check P1 > P2 and flow"
      : passes
        ? "Catalog Cv is adequate (Cv ≤ Cv,sel)"
        : catalogCv <= 0
          ? "Enter catalog Cv,sel to check headroom"
          : "Catalog Cv undersized — increase Cv,sel",
    heroStatusLevel:
      calculatedCv <= 0 ? "warn" : passes ? "pass" : catalogCv <= 0 ? "warn" : "fail",
    heroBadges: calculatedCv > 0
      ? [
          { label: "Fluid", value: fluidLabel },
          {
            label: "ΔP",
            value: `${deltaPDisplay.toFixed(imperial ? 2 : 3)} ${deltaPUnit}`,
          },
          {
            label: "Cv,sel",
            value: catalogCv > 0 ? catalogCv.toFixed(2) : "—",
          },
        ]
      : undefined,
    summary: [
      { label: "Required Cv", value: cvLabel },
      {
        label: "Catalog Cv,sel",
        value: catalogCv > 0 ? catalogCv.toFixed(2) : "—",
      },
    ],
    summaryStatus: {
      label:
        calculatedCv <= 0
          ? "Check input conditions"
          : passes
            ? "Valve sizing OK"
            : catalogCv <= 0
              ? "Set catalog Cv,sel for travel check"
              : "Undersized — increase Cv,sel",
      level:
        calculatedCv <= 0
          ? "warn"
          : passes
            ? "pass"
            : catalogCv <= 0
              ? "warn"
              : "fail",
    },
    gauge:
      calculatedCv > 0 && catalogCv > 0
        ? {
            fillPercent,
            limitPercent: 100,
            minLabel: "0",
            limitLabel: `Cv,sel ${catalogCv.toFixed(0)}`,
            maxLabel: `${(catalogCv * 1.3).toFixed(0)}`,
          }
        : undefined,
    rows: [
      { label: "Fluid type", value: fluidLabel },
      { label: "Flow rate (Q)", value: `${inputs.flowRate.toFixed(2)} ${flowUnit}` },
      {
        label: "Inlet pressure (P1, gauge)",
        value: `${inputs.inletPressure.toFixed(2)} ${pressureUnit}`,
      },
      {
        label: "Outlet pressure (P2, gauge)",
        value: `${inputs.outletPressure.toFixed(2)} ${pressureUnit}`,
      },
      {
        label: "Pressure drop (ΔP)",
        value: `${deltaPDisplay.toFixed(3)} ${deltaPUnit}`,
        warn: deltaPBar <= 0,
      },
      { label: "Specific gravity (SG)", value: inputs.specificGravity.toFixed(3) },
      {
        label: inputs.fluid === "gas" ? "Temperature (T)" : "Temperature (T, gas only)",
        value: `${tempDisplay.toFixed(0)} ${tempUnit}`,
      },
      {
        label: "Required Cv (calculated)",
        value: cvLabel,
        emphasis: true,
      },
      {
        label: "Catalog Cv,sel",
        value: catalogCv > 0 ? catalogCv.toFixed(2) : "—",
      },
      {
        label: "Sizing result",
        value:
          calculatedCv <= 0
            ? "—"
            : passes
              ? "Adequate"
              : catalogCv <= 0
                ? "Cv calculated — set Cv,sel"
                : "Undersized",
        warn: calculatedCv > 0 && catalogCv > 0 && !passes,
      },
    ],
    exportRows: [
      { label: "Standard", value: "ISA-75.01 / IEC 60534 (US Cv screening)" },
      { label: "Fluid type", value: inputs.fluid },
      { label: "Required Cv", value: cvLabel },
      { label: "Catalog Cv,sel", value: catalogCv > 0 ? catalogCv.toFixed(2) : "—" },
      { label: "Flow rate", value: `${inputs.flowRate.toFixed(2)} ${flowUnit}` },
      { label: "Pressure drop", value: `${deltaPDisplay.toFixed(3)} ${deltaPUnit}` },
      {
        label: "Result",
        value:
          calculatedCv <= 0
            ? "Invalid inputs"
            : passes
              ? "Adequate"
              : catalogCv <= 0
                ? "Cv only"
                : "Undersized",
      },
    ],
  };
}

export const DEFAULT_VALVE_CV_INPUTS: ValveCvInputs = {
  unitSystem: "metric",
  fluid: "liquid",
  flowRate: 120,
  inletPressure: 10,
  outletPressure: 7,
  specificGravity: 1.0,
  temperature: 25,
  /** Catalog headroom — default above calculated ~80 Cv at Q=120, ΔP=3 bar */
  requiredCv: 100,
};
