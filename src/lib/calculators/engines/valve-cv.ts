import type { CalculatorOutput } from "@/lib/calculators/definitions";

export type ValveCvFluid = "liquid" | "gas";

export type ValveCvInputs = {
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

/**
 * ISA/IEC liquid sizing, US Cv. Q in m³/h, ΔP in bar.
 * Cv = Q_gpm * √(SG / ΔP_psi)
 */
export function liquidCvUs(flowM3h: number, deltaPBar: number, sg: number): number {
  if (deltaPBar <= 0 || flowM3h < 0 || sg <= 0) return 0;
  const qGpm = flowM3h * M3H_TO_GPM;
  const dpPsi = deltaPBar * BAR_TO_PSI;
  return qGpm * Math.sqrt(sg / dpPsi);
}

/**
 * ISA S75.01 simplified gas (non-choked). Q in Nm³/h, P in bar(a) treated as given,
 * T in °C. Returns 0 if the square-root argument is not finite.
 */
export function gasCvUs(
  flowNm3h: number,
  p1Bar: number,
  p2Bar: number,
  sg: number,
  tempC: number,
): number {
  if (flowNm3h <= 0 || p1Bar <= 0 || p2Bar < 0 || p1Bar <= p2Bar || sg <= 0) {
    return 0;
  }
  const tR = (tempC + 273.15) * 1.8;
  if (tR <= 0) return 0;
  const qScfh = flowNm3h * NM3H_TO_SCFH;
  const p1Psia = p1Bar * BAR_TO_PSI;
  const dpPsi = (p1Bar - p2Bar) * BAR_TO_PSI;
  const inner = (sg * tR) / (dpPsi * p1Psia);
  if (!Number.isFinite(inner) || inner <= 0) return 0;
  return qScfh / (1360 * p1Psia) * Math.sqrt(sg * tR * p1Psia / dpPsi);
}

export function calculateValveCv(inputs: ValveCvInputs): CalculatorOutput {
  const deltaP = inputs.inletPressure - inputs.outletPressure;
  let calculatedCv = 0;

  if (
    deltaP > 0 &&
    Number.isFinite(inputs.flowRate) &&
    inputs.flowRate > 0 &&
    Number.isFinite(inputs.specificGravity) &&
    inputs.specificGravity > 0
  ) {
    if (inputs.fluid === "liquid") {
      calculatedCv = liquidCvUs(inputs.flowRate, deltaP, inputs.specificGravity);
    } else {
      calculatedCv = gasCvUs(
        inputs.flowRate,
        inputs.inletPressure,
        inputs.outletPressure,
        inputs.specificGravity,
        inputs.temperature,
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

  const flowUnit = inputs.fluid === "liquid" ? "m³/h" : "Nm³/h";
  const pressureUnit = "bar";

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
        label: "Inlet pressure (P1)",
        value: `${inputs.inletPressure.toFixed(2)} ${pressureUnit}`,
      },
      {
        label: "Outlet pressure (P2)",
        value: `${inputs.outletPressure.toFixed(2)} ${pressureUnit}`,
      },
      {
        label: "Pressure drop (ΔP)",
        value: `${deltaP.toFixed(3)} ${pressureUnit}`,
        warn: deltaP <= 0,
      },
      { label: "Specific gravity (SG)", value: inputs.specificGravity.toFixed(3) },
      { label: "Temperature", value: `${inputs.temperature.toFixed(1)} °C` },
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
      { label: "Pressure drop", value: `${deltaP.toFixed(3)} ${pressureUnit}` },
      { label: "Result", value: passes ? "Adequate" : "Undersized" },
    ],
  };
}

export const DEFAULT_VALVE_CV_INPUTS: ValveCvInputs = {
  fluid: "liquid",
  flowRate: 120,
  inletPressure: 10,
  outletPressure: 7,
  specificGravity: 1.0,
  temperature: 25,
  requiredCv: 45,
};
