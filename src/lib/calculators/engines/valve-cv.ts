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

  const passes = calculatedCv <= inputs.requiredCv && calculatedCv > 0;
  const fillPercent =
    inputs.requiredCv > 0
      ? Math.min(100, (calculatedCv / inputs.requiredCv) * 100)
      : 0;

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

  return {
    heroLabel: "Required Flow Coefficient (Cv)",
    heroValue: calculatedCv > 0 ? calculatedCv.toFixed(2) : "—",
    heroStatus: passes
      ? "Selected valve Cv is adequate"
      : calculatedCv <= 0
        ? "Invalid pressure drop — check inputs"
        : "Selected valve Cv is undersized",
    heroStatusLevel:
      calculatedCv <= 0 ? "warn" : passes ? "pass" : "fail",
    summary: [
      { label: "Calculated Cv", value: calculatedCv > 0 ? calculatedCv.toFixed(2) : "—" },
      { label: "Selected Cv", value: inputs.requiredCv.toFixed(2) },
    ],
    summaryStatus: {
      label:
        calculatedCv <= 0
          ? "Check input conditions"
          : passes
            ? "Valve sizing OK"
            : "Undersized — increase Cv",
      level: calculatedCv <= 0 ? "warn" : passes ? "pass" : "fail",
    },
    gauge:
      calculatedCv > 0
        ? {
            fillPercent,
            limitPercent: 100,
            minLabel: "0",
            limitLabel: `Selected ${inputs.requiredCv.toFixed(0)}`,
            maxLabel: `${(inputs.requiredCv * 1.3).toFixed(0)}`,
          }
        : undefined,
    rows: [
      { label: "Fluid type", value: inputs.fluid === "liquid" ? "Liquid" : "Gas" },
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
      { label: "Temperature", value: `${tempDisplay.toFixed(1)} ${tempUnit}` },
      {
        label: "Sizing result",
        value: passes ? "Adequate" : "Undersized",
        warn: !passes,
      },
    ],
    exportRows: [
      { label: "Fluid type", value: inputs.fluid },
      { label: "Calculated Cv", value: calculatedCv.toFixed(2) },
      { label: "Selected Cv", value: inputs.requiredCv.toFixed(2) },
      { label: "Flow rate", value: `${inputs.flowRate.toFixed(2)} ${flowUnit}` },
      { label: "Pressure drop", value: `${deltaPDisplay.toFixed(3)} ${deltaPUnit}` },
      { label: "Result", value: passes ? "Adequate" : "Undersized" },
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
  requiredCv: 45,
};
