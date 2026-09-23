/**
 * Socket Weld & Threaded Fitting Dimensions — ASME B16.11 / B1.20.1 screening.
 */

import type {
  CalculatorOutput,
  ResultCallout,
  ResultRow,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  B1611_NPS_OPTIONS,
  SW_GAP_MM,
  classesForConnection,
  computeNptL2In,
  findB1611Row,
  fittingsForConnection,
  isClassAllowed,
  listB1611NpsFor,
  type B1611Class,
  type B1611Connection,
  type B1611Fitting,
} from "@/lib/calculators/data/b1611ForgedFittings";
import { formatLength } from "@/utils/unitConverter";

export type SocketWeldThreadedFittingDimensionInputs = {
  unitSystem: UnitSystem;
  connection: B1611Connection;
  fitting: B1611Fitting;
  nps: string;
  rating: B1611Class;
};

export const B1611_CONNECTION_OPTIONS: {
  value: B1611Connection;
  label: string;
}[] = [
  { value: "socket-weld", label: "Socket weld (SW)" },
  { value: "threaded-npt", label: "Threaded (NPT)" },
];

export const B1611_FITTING_OPTIONS: {
  value: B1611Fitting;
  label: string;
}[] = [
  { value: "elbow-90", label: "90° Elbow" },
  { value: "elbow-45", label: "45° Elbow" },
  { value: "tee", label: "Tee" },
  { value: "cross", label: "Cross" },
  { value: "coupling", label: "Coupling" },
  { value: "half-coupling", label: "Half-coupling" },
  { value: "cap", label: "Cap" },
  { value: "street-elbow", label: "Street elbow" },
];

export const DEFAULT_SOCKET_WELD_THREADED_FITTING_DIMENSION_INPUTS: SocketWeldThreadedFittingDimensionInputs =
  {
    unitSystem: "metric",
    connection: "socket-weld",
    fitting: "elbow-90",
    nps: "1",
    rating: "3000",
  };

export const DEFAULT_SOCKET_WELD_THREADED_FITTING_DIMENSION_INPUTS_IMPERIAL: SocketWeldThreadedFittingDimensionInputs =
  {
    unitSystem: "imperial",
    connection: "socket-weld",
    fitting: "coupling",
    nps: "1.5",
    rating: "6000",
  };

export {
  classesForConnection,
  fittingsForConnection,
  isClassAllowed,
  listB1611NpsFor,
  B1611_NPS_OPTIONS,
  type B1611Class,
  type B1611Connection,
  type B1611Fitting,
};

const IN_TO_MM = 25.4;

export type SocketWeldThreadedFittingDimensionComputed = {
  invalid: boolean;
  invalidReason?: string;
  primaryMm: number;
  bandOdMm: number;
  wallGMm: number;
  socketBMm: number | null;
  socketJMm: number | null;
  pipeOdMm: number;
  l2Mm: number | null;
  gapMm: number;
  primaryLabel: string;
  primarySymbol: string;
  npsLabel: string;
  connectionLabel: string;
  fittingLabel: string;
};

function npsLabelOf(nps: string): string {
  return B1611_NPS_OPTIONS.find((o) => o.value === nps)?.label ?? `NPS ${nps}`;
}

export function computeSocketWeldThreadedFittingDimension(
  inputs: SocketWeldThreadedFittingDimensionInputs,
): SocketWeldThreadedFittingDimensionComputed {
  const connectionLabel =
    B1611_CONNECTION_OPTIONS.find((c) => c.value === inputs.connection)
      ?.label ?? inputs.connection;
  const fittingLabel =
    B1611_FITTING_OPTIONS.find((f) => f.value === inputs.fitting)?.label ??
    inputs.fitting;
  const npsLabel = npsLabelOf(inputs.nps);

  const empty = (
    reason: string,
  ): SocketWeldThreadedFittingDimensionComputed => ({
    invalid: true,
    invalidReason: reason,
    primaryMm: NaN,
    bandOdMm: NaN,
    wallGMm: NaN,
    socketBMm: null,
    socketJMm: null,
    pipeOdMm: NaN,
    l2Mm: null,
    gapMm: SW_GAP_MM,
    primaryLabel: "Dimension",
    primarySymbol: "A",
    npsLabel,
    connectionLabel,
    fittingLabel,
  });

  if (!isClassAllowed(inputs.connection, inputs.rating)) {
    return empty(
      inputs.connection === "socket-weld"
        ? "Class 2000 is threaded-only — use Class 3000 / 6000 / 9000 for socket weld"
        : "Class 9000 is socket-weld-only — use Class 2000 / 3000 / 6000 for threaded",
    );
  }

  const row = findB1611Row(
    inputs.connection,
    inputs.fitting,
    inputs.nps,
    inputs.rating,
  );
  if (!row) {
    return empty(
      "No B16.11 screening row for this connection / fitting / NPS / class",
    );
  }

  const pipeOdIn =
    (
      {
        "0.125": 0.405,
        "0.25": 0.54,
        "0.375": 0.675,
        "0.5": 0.84,
        "0.75": 1.05,
        "1": 1.315,
        "1.25": 1.66,
        "1.5": 1.9,
        "2": 2.375,
        "2.5": 2.875,
        "3": 3.5,
        "4": 4.5,
      } as Record<string, number>
    )[inputs.nps] ?? NaN;

  const l2In =
    inputs.connection === "threaded-npt" ? computeNptL2In(inputs.nps) : null;

  return {
    invalid: false,
    primaryMm: row.envelope.primary_in * IN_TO_MM,
    bandOdMm: row.body.bandOd_in * IN_TO_MM,
    wallGMm: row.body.G_in * IN_TO_MM,
    socketBMm:
      row.body.B_in != null ? row.body.B_in * IN_TO_MM : null,
    socketJMm:
      row.body.J_in != null ? row.body.J_in * IN_TO_MM : null,
    pipeOdMm: pipeOdIn * IN_TO_MM,
    l2Mm: l2In != null ? l2In * IN_TO_MM : null,
    gapMm: SW_GAP_MM,
    primaryLabel: row.primaryLabel,
    primarySymbol: row.primarySymbol,
    npsLabel,
    connectionLabel,
    fittingLabel,
  };
}

export function calculateSocketWeldThreadedFittingDimension(
  inputs: SocketWeldThreadedFittingDimensionInputs,
): CalculatorOutput {
  const c = computeSocketWeldThreadedFittingDimension(inputs);
  const classLabel = `Class ${inputs.rating}`;

  if (c.invalid) {
    return {
      heroLabel: c.primaryLabel,
      heroValue: "—",
      heroStatus: c.invalidReason ?? "Select a valid B16.11 combination",
      heroStatusLevel: "warn",
      summary: [
        { label: "Min wall G", value: "—" },
        { label: "Socket / thread depth", value: "—" },
        { label: "Band OD", value: "—" },
      ],
      summaryStatus: {
        label: c.invalidReason ?? "No matching B16.11 row",
        level: "warn",
      },
      rows: [],
      callouts: [
        {
          tone: "info",
          title: "ASME B16.11 class scope",
          body: "Class 2000 is threaded-only. Class 9000 is high-pressure socket-weld-only. Forged SW/THRD fittings above NPS 4 are outside the regular B16.11 size range.",
        },
      ],
      exportRows: [],
    };
  }

  const primary = formatLength(c.primaryMm, inputs.unitSystem);
  const band = formatLength(c.bandOdMm, inputs.unitSystem);
  const wall = formatLength(c.wallGMm, inputs.unitSystem, 2);
  const depth =
    c.socketJMm != null
      ? formatLength(c.socketJMm, inputs.unitSystem, 2)
      : c.l2Mm != null
        ? formatLength(c.l2Mm, inputs.unitSystem, 2)
        : "—";
  const depthLabel =
    inputs.connection === "socket-weld"
      ? "Socket depth J"
      : "Thread engagement L₂";

  const callouts: ResultCallout[] = [];
  if (inputs.connection === "socket-weld") {
    callouts.push({
      tone: "warn",
      title: "Socket weld gap (B31.3)",
      body: `Leave ${SW_GAP_MM} mm (1/16 in) between pipe end and socket bottom after insertion (ASME B31.3 Para. 328.5.2).`,
    });
  } else {
    callouts.push({
      tone: "info",
      title: "ASME B16.11 class scope",
      body: "Class 2000 is threaded-only; Class 9000 is SW-only. Regular forged SW/THRD sizes stop at NPS 4 — confirm OEM chart.",
    });
  }

  // Lean screen rows — primary A/W is hero; keep geometry details only.
  const rows: ResultRow[] = [
    {
      section: "Envelope",
      label: "Outside diameter of band (C)",
      value: band,
      emphasis: true,
    },
  ];

  if (c.socketBMm != null) {
    rows.push({
      section: "Socket",
      label: "Socket diameter (B)",
      value: formatLength(c.socketBMm, inputs.unitSystem, 2),
    });
  }
  if (c.socketJMm != null) {
    rows.push({
      section: "Socket",
      label: "Socket depth (J)",
      value: formatLength(c.socketJMm, inputs.unitSystem, 2),
      emphasis: true,
    });
  }
  if (c.l2Mm != null) {
    rows.push({
      section: "Thread",
      label: "Min thread engagement L₂",
      value: formatLength(c.l2Mm, inputs.unitSystem, 2),
      emphasis: true,
    });
  }

  rows.push({
    section: "Wall & pipe",
    label: "Minimum fitting wall (G)",
    value: wall,
    emphasis: true,
  });

  if (inputs.connection === "socket-weld") {
    rows.push({
      section: "Wall & pipe",
      label: "SW gap allowance g_sw",
      value: formatLength(c.gapMm, inputs.unitSystem, 2),
    });
  }

  return {
    heroLabel: `${c.primaryLabel} (${c.primarySymbol})`,
    heroValue: primary,
    heroStatus: `${c.fittingLabel} · ${c.npsLabel} · ${classLabel}`,
    heroStatusLevel: "neutral",
    heroBadges: [
      { label: "Wall G", value: wall },
      { label: depthLabel.includes("J") ? "J" : "L₂", value: depth },
      { label: "Band C", value: band },
    ],
    summary: [
      { label: "Min wall G", value: wall },
      { label: depthLabel, value: depth },
      { label: "Band OD C", value: band },
    ],
    summaryStatus: {
      label: `ASME B16.11 · ${classLabel}`,
      level: "neutral",
    },
    rows,
    callouts,
    exportRows: [
      { label: "Connection", value: c.connectionLabel },
      { label: "Fitting", value: c.fittingLabel },
      { label: "NPS", value: c.npsLabel },
      { label: "Class", value: classLabel },
      {
        label: `${c.primarySymbol} (${c.primaryLabel})`,
        value: primary,
      },
      { label: `${c.primarySymbol} mm`, value: c.primaryMm.toFixed(3) },
      { label: "Band OD C mm", value: c.bandOdMm.toFixed(3) },
      { label: "Wall G mm", value: c.wallGMm.toFixed(3) },
      {
        label: "Socket B mm",
        value: c.socketBMm != null ? c.socketBMm.toFixed(3) : "—",
      },
      {
        label: "Socket J mm",
        value: c.socketJMm != null ? c.socketJMm.toFixed(3) : "—",
      },
      {
        label: "L2 mm",
        value: c.l2Mm != null ? c.l2Mm.toFixed(3) : "—",
      },
      { label: "Pipe OD mm", value: c.pipeOdMm.toFixed(3) },
      { label: "SW gap mm", value: String(SW_GAP_MM) },
    ],
  };
}
