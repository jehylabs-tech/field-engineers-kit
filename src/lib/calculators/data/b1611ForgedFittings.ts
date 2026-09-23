/**
 * ASME B16.11 forged fittings — Socket-Welding & Threaded screening dimensions.
 *
 * Inch values follow ASME B16.11 published tables / Bonney Forge-style charts
 * (Class 2000 / 3000 / 6000 / 9000). Confirm the current OEM chart before purchase.
 *
 * Assert anchors (engine tests):
 * - SW 90° elbow NPS 1 Class 3000: A = 1.12 in (28.4 mm), J = 0.50 in (12.7 mm), G = 0.196 in (4.98 mm)
 * - Threaded tee NPS 2 Class 3000: A = 1.88 in (47.8 mm); L2 ≈ 19.2 mm (B1.20.1)
 * - SW coupling NPS 1.5 Class 6000: length = 2.88 in, G = 0.315 in
 * - Threaded cap NPS 0.75 Class 2000: height = 1.44 in, band OD = 1.46 in
 *
 * Class rules: 2000 = threaded only; 9000 = socket-weld only (high-pressure).
 */

export type B1611Connection = "socket-weld" | "threaded-npt";

export type B1611Fitting =
  | "elbow-90"
  | "elbow-45"
  | "tee"
  | "cross"
  | "coupling"
  | "half-coupling"
  | "cap"
  | "street-elbow";

export type B1611Class = "2000" | "3000" | "6000" | "9000";

/** Shared body / socket geometry for a class × NPS (inches). */
export type B1611BodyIn = {
  /** Minimum body wall thickness G (in). */
  G_in: number;
  /** Socket bore diameter B (in) — SW only. */
  B_in?: number;
  /** Socket depth J min (in) — SW only. */
  J_in?: number;
  /** Outside diameter of band / body (C or H) (in). */
  bandOd_in: number;
};

/**
 * Envelope primary dimension (inches):
 * - elbow / tee / cross / street-elbow → center-to-bottom (SW) or center-to-end (THRD) A
 * - coupling / half-coupling → end-to-end length
 * - cap → overall height
 */
export type B1611EnvelopeIn = {
  primary_in: number;
};

const SW_J: Record<string, number> = {
  "0.125": 0.38,
  "0.25": 0.38,
  "0.375": 0.38,
  "0.5": 0.38,
  "0.75": 0.44,
  "1": 0.5,
  "1.25": 0.56,
  "1.5": 0.62,
  "2": 0.75,
  "2.5": 0.88,
  "3": 1.0,
  "4": 1.12,
};

const SW_B: Record<string, number> = {
  "0.125": 0.427,
  "0.25": 0.564,
  "0.375": 0.699,
  "0.5": 0.855,
  "0.75": 1.065,
  "1": 1.33,
  "1.25": 1.675,
  "1.5": 1.915,
  "2": 2.406,
  "2.5": 2.906,
  "3": 3.535,
  "4": 4.545,
};

/** NPT threads per inch (ASME B1.20.1). */
export const NPT_TPI: Record<string, number> = {
  "0.125": 27,
  "0.25": 18,
  "0.375": 18,
  "0.5": 14,
  "0.75": 14,
  "1": 11.5,
  "1.25": 11.5,
  "1.5": 11.5,
  "2": 11.5,
  "2.5": 8,
  "3": 8,
  "4": 8,
};

/** Pipe OD inches (ASME B36) for L2 — aligns with getPipeScheduleSize. */
export const PIPE_OD_IN: Record<string, number> = {
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
};

export const B1611_NPS_OPTIONS: { value: string; label: string; dn: number }[] =
  [
    { value: "0.125", label: '1/8"', dn: 6 },
    { value: "0.25", label: '1/4"', dn: 8 },
    { value: "0.375", label: '3/8"', dn: 10 },
    { value: "0.5", label: '1/2"', dn: 15 },
    { value: "0.75", label: '3/4"', dn: 20 },
    { value: "1", label: '1"', dn: 25 },
    { value: "1.25", label: '1-1/4"', dn: 32 },
    { value: "1.5", label: '1-1/2"', dn: 40 },
    { value: "2", label: '2"', dn: 50 },
    { value: "2.5", label: '2-1/2"', dn: 65 },
    { value: "3", label: '3"', dn: 80 },
    { value: "4", label: '4"', dn: 100 },
  ];

function body(
  G_in: number,
  bandOd_in: number,
  nps: string,
  withSocket: boolean,
): B1611BodyIn {
  return {
    G_in,
    bandOd_in,
    ...(withSocket
      ? { B_in: SW_B[nps], J_in: SW_J[nps] }
      : {}),
  };
}

/** Class 3000 SW body (G + band OD). */
const SW3000_BODY: Record<string, B1611BodyIn> = {
  "0.125": body(0.125, 0.88, "0.125", true),
  "0.25": body(0.13, 1.0, "0.25", true),
  "0.375": body(0.138, 1.25, "0.375", true),
  "0.5": body(0.161, 1.33, "0.5", true),
  "0.75": body(0.168, 1.58, "0.75", true),
  "1": body(0.196, 1.95, "1", true),
  "1.25": body(0.208, 2.44, "1.25", true),
  "1.5": body(0.218, 2.72, "1.5", true),
  "2": body(0.238, 3.31, "2", true),
  "2.5": body(0.302, 4.0, "2.5", true),
  "3": body(0.327, 4.75, "3", true),
  "4": body(0.368, 6.0, "4", true),
};

const SW6000_BODY: Record<string, B1611BodyIn> = {
  "0.5": body(0.236, 1.5, "0.5", true),
  "0.75": body(0.252, 1.81, "0.75", true),
  "1": body(0.273, 2.25, "1", true),
  "1.25": body(0.307, 2.69, "1.25", true),
  "1.5": body(0.315, 3.0, "1.5", true),
  "2": body(0.344, 3.62, "2", true),
};

const SW9000_BODY: Record<string, B1611BodyIn> = {
  "0.5": body(0.315, 1.62, "0.5", true),
  "0.75": body(0.333, 1.94, "0.75", true),
  "1": body(0.358, 2.44, "1", true),
  "1.25": body(0.4, 2.88, "1.25", true),
  "1.5": body(0.4, 3.25, "1.5", true),
  "2": body(0.458, 4.0, "2", true),
};

/** Threaded Class 2000 body. */
const TH2000_BODY: Record<string, B1611BodyIn> = {
  "0.125": body(0.11, 0.84, "0.125", false),
  "0.25": body(0.12, 1.0, "0.25", false),
  "0.375": body(0.12, 1.19, "0.375", false),
  "0.5": body(0.13, 1.45, "0.5", false),
  "0.75": body(0.14, 1.46, "0.75", false),
  "1": body(0.17, 1.95, "1", false),
  "1.25": body(0.18, 2.44, "1.25", false),
  "1.5": body(0.19, 2.72, "1.5", false),
  "2": body(0.2, 3.31, "2", false),
  "2.5": body(0.26, 4.0, "2.5", false),
  "3": body(0.28, 4.75, "3", false),
  "4": body(0.32, 6.0, "4", false),
};

const TH3000_BODY: Record<string, B1611BodyIn> = {
  "0.125": body(0.125, 0.88, "0.125", false),
  "0.25": body(0.13, 1.0, "0.25", false),
  "0.375": body(0.138, 1.25, "0.375", false),
  "0.5": body(0.161, 1.45, "0.5", false),
  "0.75": body(0.168, 1.7, "0.75", false),
  "1": body(0.196, 2.12, "1", false),
  "1.25": body(0.208, 2.5, "1.25", false),
  "1.5": body(0.218, 2.88, "1.5", false),
  "2": body(0.238, 3.5, "2", false),
  "2.5": body(0.302, 4.12, "2.5", false),
  "3": body(0.327, 5.0, "3", false),
  "4": body(0.368, 6.25, "4", false),
};

const TH6000_BODY: Record<string, B1611BodyIn> = {
  "0.5": body(0.236, 1.62, "0.5", false),
  "0.75": body(0.252, 1.94, "0.75", false),
  "1": body(0.273, 2.44, "1", false),
  "1.25": body(0.307, 2.88, "1.25", false),
  "1.5": body(0.315, 3.25, "1.5", false),
  "2": body(0.344, 4.0, "2", false),
};

/** Center-to-bottom A — SW 90° elbow / tee / cross Class 3000. */
const SW3000_A90: Record<string, number> = {
  "0.125": 0.81,
  "0.25": 0.81,
  "0.375": 0.88,
  "0.5": 0.88,
  "0.75": 0.97,
  "1": 1.12,
  "1.25": 1.31,
  "1.5": 1.5,
  "2": 1.75,
  "2.5": 2.06,
  "3": 2.44,
  "4": 3.12,
};

const SW3000_A45: Record<string, number> = {
  "0.125": 0.75,
  "0.25": 0.75,
  "0.375": 0.75,
  "0.5": 0.75,
  "0.75": 0.81,
  "1": 0.88,
  "1.25": 1.0,
  "1.5": 1.12,
  "2": 1.31,
  "2.5": 1.5,
  "3": 1.75,
  "4": 2.25,
};

const SW6000_A90: Record<string, number> = {
  "0.5": 1.06,
  "0.75": 1.25,
  "1": 1.5,
  "1.25": 1.75,
  "1.5": 2.0,
  "2": 2.38,
};

const SW6000_A45: Record<string, number> = {
  "0.5": 0.88,
  "0.75": 1.0,
  "1": 1.12,
  "1.25": 1.31,
  "1.5": 1.5,
  "2": 1.75,
};

const SW9000_A90: Record<string, number> = {
  "0.5": 1.25,
  "0.75": 1.44,
  "1": 1.75,
  "1.25": 2.0,
  "1.5": 2.25,
  "2": 2.75,
};

const SW9000_A45: Record<string, number> = {
  "0.5": 1.0,
  "0.75": 1.12,
  "1": 1.31,
  "1.25": 1.5,
  "1.5": 1.69,
  "2": 2.0,
};

/** SW coupling end-to-end length. */
const SW3000_COUP: Record<string, number> = {
  "0.125": 1.0,
  "0.25": 1.12,
  "0.375": 1.25,
  "0.5": 1.38,
  "0.75": 1.5,
  "1": 1.75,
  "1.25": 2.0,
  "1.5": 2.38,
  "2": 2.88,
  "2.5": 3.5,
  "3": 3.88,
  "4": 4.75,
};

const SW6000_COUP: Record<string, number> = {
  "0.5": 1.75,
  "0.75": 2.0,
  "1": 2.38,
  "1.25": 2.62,
  "1.5": 2.88,
  "2": 3.5,
};

const SW9000_COUP: Record<string, number> = {
  "0.5": 2.0,
  "0.75": 2.25,
  "1": 2.62,
  "1.25": 2.88,
  "1.5": 3.25,
  "2": 3.88,
};

/** SW half-coupling length (shorter). */
const SW3000_HALF: Record<string, number> = {
  "0.5": 0.75,
  "0.75": 0.81,
  "1": 0.94,
  "1.25": 1.06,
  "1.5": 1.19,
  "2": 1.44,
  "2.5": 1.69,
  "3": 1.88,
  "4": 2.25,
};

const SW6000_HALF: Record<string, number> = {
  "0.5": 0.94,
  "0.75": 1.06,
  "1": 1.25,
  "1.25": 1.38,
  "1.5": 1.5,
  "2": 1.75,
};

/** SW cap overall height. */
const SW3000_CAP: Record<string, number> = {
  "0.125": 0.69,
  "0.25": 0.75,
  "0.375": 0.81,
  "0.5": 0.88,
  "0.75": 0.94,
  "1": 1.12,
  "1.25": 1.25,
  "1.5": 1.38,
  "2": 1.56,
  "2.5": 1.81,
  "3": 2.0,
  "4": 2.38,
};

const SW6000_CAP: Record<string, number> = {
  "0.5": 1.06,
  "0.75": 1.19,
  "1": 1.38,
  "1.25": 1.5,
  "1.5": 1.62,
  "2": 1.88,
};

/** Threaded 90° / tee / cross center-to-end Class 3000. */
const TH3000_A90: Record<string, number> = {
  "0.125": 0.81,
  "0.25": 0.81,
  "0.375": 0.94,
  "0.5": 1.0,
  "0.75": 1.12,
  "1": 1.38,
  "1.25": 1.62,
  "1.5": 1.75,
  "2": 1.88,
  "2.5": 2.25,
  "3": 2.5,
  "4": 3.12,
};

const TH3000_A45: Record<string, number> = {
  "0.125": 0.69,
  "0.25": 0.75,
  "0.375": 0.81,
  "0.5": 0.81,
  "0.75": 0.94,
  "1": 1.06,
  "1.25": 1.25,
  "1.5": 1.38,
  "2": 1.5,
  "2.5": 1.75,
  "3": 1.88,
  "4": 2.38,
};

const TH2000_A90: Record<string, number> = {
  "0.125": 0.75,
  "0.25": 0.75,
  "0.375": 0.88,
  "0.5": 0.94,
  "0.75": 1.06,
  "1": 1.31,
  "1.25": 1.5,
  "1.5": 1.62,
  "2": 1.75,
  "2.5": 2.12,
  "3": 2.38,
  "4": 2.88,
};

const TH2000_A45: Record<string, number> = {
  "0.125": 0.62,
  "0.25": 0.69,
  "0.375": 0.75,
  "0.5": 0.75,
  "0.75": 0.88,
  "1": 1.0,
  "1.25": 1.12,
  "1.5": 1.25,
  "2": 1.38,
  "2.5": 1.62,
  "3": 1.75,
  "4": 2.12,
};

const TH6000_A90: Record<string, number> = {
  "0.5": 1.25,
  "0.75": 1.44,
  "1": 1.62,
  "1.25": 1.88,
  "1.5": 2.0,
  "2": 2.25,
};

const TH6000_A45: Record<string, number> = {
  "0.5": 1.0,
  "0.75": 1.12,
  "1": 1.25,
  "1.25": 1.44,
  "1.5": 1.56,
  "2": 1.75,
};

const TH2000_COUP: Record<string, number> = {
  "0.5": 1.31,
  "0.75": 1.5,
  "1": 1.62,
  "1.25": 1.88,
  "1.5": 2.0,
  "2": 2.25,
  "2.5": 2.75,
  "3": 3.0,
  "4": 3.5,
};

const TH3000_COUP: Record<string, number> = {
  "0.125": 1.0,
  "0.25": 1.12,
  "0.375": 1.25,
  "0.5": 1.5,
  "0.75": 1.62,
  "1": 1.88,
  "1.25": 2.12,
  "1.5": 2.38,
  "2": 2.75,
  "2.5": 3.25,
  "3": 3.5,
  "4": 4.25,
};

const TH6000_COUP: Record<string, number> = {
  "0.5": 1.75,
  "0.75": 2.0,
  "1": 2.25,
  "1.25": 2.5,
  "1.5": 2.75,
  "2": 3.25,
};

const TH2000_CAP: Record<string, number> = {
  "0.125": 0.69,
  "0.25": 0.81,
  "0.375": 0.88,
  "0.5": 1.12,
  "0.75": 1.44,
  "1": 1.5,
  "1.25": 1.62,
  "1.5": 1.75,
  "2": 1.88,
  "2.5": 2.25,
  "3": 2.38,
  "4": 2.75,
};

const TH3000_CAP: Record<string, number> = {
  "0.125": 0.75,
  "0.25": 0.88,
  "0.375": 1.0,
  "0.5": 1.25,
  "0.75": 1.5,
  "1": 1.62,
  "1.25": 1.75,
  "1.5": 1.88,
  "2": 2.0,
  "2.5": 2.38,
  "3": 2.62,
  "4": 3.0,
};

const TH6000_CAP: Record<string, number> = {
  "0.5": 1.38,
  "0.75": 1.62,
  "1": 1.75,
  "1.25": 1.94,
  "1.5": 2.12,
  "2": 2.38,
};

/** Street elbow (threaded) center-to-end Class 3000. */
const TH3000_STREET: Record<string, number> = {
  "0.5": 1.12,
  "0.75": 1.31,
  "1": 1.5,
  "1.25": 1.75,
  "1.5": 1.88,
  "2": 2.12,
};

function mapEnv(src: Record<string, number>): Record<string, B1611EnvelopeIn> {
  return Object.fromEntries(
    Object.entries(src).map(([k, v]) => [k, { primary_in: v }]),
  );
}

export function classesForConnection(
  connection: B1611Connection,
): B1611Class[] {
  if (connection === "socket-weld") return ["3000", "6000", "9000"];
  return ["2000", "3000", "6000"];
}

export function isClassAllowed(
  connection: B1611Connection,
  rating: B1611Class,
): boolean {
  return classesForConnection(connection).includes(rating);
}

export function fittingsForConnection(
  connection: B1611Connection,
): B1611Fitting[] {
  if (connection === "socket-weld") {
    return [
      "elbow-90",
      "elbow-45",
      "tee",
      "cross",
      "coupling",
      "half-coupling",
      "cap",
    ];
  }
  return [
    "elbow-90",
    "elbow-45",
    "tee",
    "cross",
    "coupling",
    "cap",
    "street-elbow",
  ];
}

function getBodyMap(
  connection: B1611Connection,
  rating: B1611Class,
): Record<string, B1611BodyIn> | undefined {
  if (connection === "socket-weld") {
    if (rating === "3000") return SW3000_BODY;
    if (rating === "6000") return SW6000_BODY;
    if (rating === "9000") return SW9000_BODY;
    return undefined;
  }
  if (rating === "2000") return TH2000_BODY;
  if (rating === "3000") return TH3000_BODY;
  if (rating === "6000") return TH6000_BODY;
  return undefined;
}

function getEnvelopeMap(
  connection: B1611Connection,
  fitting: B1611Fitting,
  rating: B1611Class,
): Record<string, B1611EnvelopeIn> | undefined {
  if (connection === "socket-weld") {
    if (fitting === "elbow-90" || fitting === "tee" || fitting === "cross") {
      if (rating === "3000") return mapEnv(SW3000_A90);
      if (rating === "6000") return mapEnv(SW6000_A90);
      if (rating === "9000") return mapEnv(SW9000_A90);
    }
    if (fitting === "elbow-45") {
      if (rating === "3000") return mapEnv(SW3000_A45);
      if (rating === "6000") return mapEnv(SW6000_A45);
      if (rating === "9000") return mapEnv(SW9000_A45);
    }
    if (fitting === "coupling") {
      if (rating === "3000") return mapEnv(SW3000_COUP);
      if (rating === "6000") return mapEnv(SW6000_COUP);
      if (rating === "9000") return mapEnv(SW9000_COUP);
    }
    if (fitting === "half-coupling") {
      if (rating === "3000") return mapEnv(SW3000_HALF);
      if (rating === "6000") return mapEnv(SW6000_HALF);
    }
    if (fitting === "cap") {
      if (rating === "3000") return mapEnv(SW3000_CAP);
      if (rating === "6000") return mapEnv(SW6000_CAP);
    }
    return undefined;
  }

  // threaded
  if (fitting === "elbow-90" || fitting === "tee" || fitting === "cross") {
    if (rating === "2000") return mapEnv(TH2000_A90);
    if (rating === "3000") return mapEnv(TH3000_A90);
    if (rating === "6000") return mapEnv(TH6000_A90);
  }
  if (fitting === "elbow-45") {
    if (rating === "2000") return mapEnv(TH2000_A45);
    if (rating === "3000") return mapEnv(TH3000_A45);
    if (rating === "6000") return mapEnv(TH6000_A45);
  }
  if (fitting === "coupling") {
    if (rating === "2000") return mapEnv(TH2000_COUP);
    if (rating === "3000") return mapEnv(TH3000_COUP);
    if (rating === "6000") return mapEnv(TH6000_COUP);
  }
  if (fitting === "cap") {
    if (rating === "2000") return mapEnv(TH2000_CAP);
    if (rating === "3000") return mapEnv(TH3000_CAP);
    if (rating === "6000") return mapEnv(TH6000_CAP);
  }
  if (fitting === "street-elbow" && rating === "3000") {
    return mapEnv(TH3000_STREET);
  }
  return undefined;
}

export type B1611LookupResult = {
  body: B1611BodyIn;
  envelope: B1611EnvelopeIn;
  primaryLabel: string;
  primarySymbol: string;
};

export function primaryMeta(
  connection: B1611Connection,
  fitting: B1611Fitting,
): { label: string; symbol: string } {
  if (fitting === "coupling" || fitting === "half-coupling") {
    return { label: "End-to-end length", symbol: "W" };
  }
  if (fitting === "cap") {
    return { label: "Overall height", symbol: "W" };
  }
  if (connection === "socket-weld") {
    return { label: "Center-to-bottom of socket", symbol: "A" };
  }
  return { label: "Center-to-end", symbol: "A" };
}

export function findB1611Row(
  connection: B1611Connection,
  fitting: B1611Fitting,
  nps: string,
  rating: B1611Class,
): B1611LookupResult | null {
  if (!isClassAllowed(connection, rating)) return null;
  if (!fittingsForConnection(connection).includes(fitting)) return null;
  const bodyMap = getBodyMap(connection, rating);
  const envMap = getEnvelopeMap(connection, fitting, rating);
  const bodyRow = bodyMap?.[nps];
  const envRow = envMap?.[nps];
  if (!bodyRow || !envRow) return null;
  const meta = primaryMeta(connection, fitting);
  return {
    body: bodyRow,
    envelope: envRow,
    primaryLabel: meta.label,
    primarySymbol: meta.symbol,
  };
}

export function listB1611NpsFor(
  connection: B1611Connection,
  fitting: B1611Fitting,
  rating: B1611Class,
): string[] {
  const envMap = getEnvelopeMap(connection, fitting, rating);
  if (!envMap) return [];
  return Object.keys(envMap).sort((a, b) => Number(a) - Number(b));
}

/**
 * ASME B1.20.1 effective thread length screening:
 *   L2 = (0.80·D + 6.86) · p
 * with D = pipe OD (in), p = 1/TPI.
 */
export function computeNptL2In(nps: string): number | null {
  const od = PIPE_OD_IN[nps];
  const tpi = NPT_TPI[nps];
  if (!(od > 0) || !(tpi > 0)) return null;
  const p = 1 / tpi;
  return (0.8 * od + 6.86) * p;
}

export const SW_GAP_MM = 1.5;
export const SW_GAP_IN = 1 / 16;
