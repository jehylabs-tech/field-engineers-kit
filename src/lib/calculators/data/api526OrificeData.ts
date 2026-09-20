/**
 * API 526 standard effective orifice areas (flanged steel PRVs).
 * Areas from API 526 Table 1 (effective orifice area).
 */

export type Api526OrificeLetter =
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "P"
  | "Q"
  | "R"
  | "T";

export type Api526Orifice = {
  letter: Api526OrificeLetter;
  /** Effective orifice area (in²). */
  areaIn2: number;
};

/** API 526 effective orifice areas D–T (in²). */
export const API_526_ORIFICES: Api526Orifice[] = [
  { letter: "D", areaIn2: 0.11 },
  { letter: "E", areaIn2: 0.196 },
  { letter: "F", areaIn2: 0.307 },
  { letter: "G", areaIn2: 0.503 },
  { letter: "H", areaIn2: 0.785 },
  { letter: "J", areaIn2: 1.287 },
  { letter: "K", areaIn2: 1.838 },
  { letter: "L", areaIn2: 2.853 },
  { letter: "M", areaIn2: 3.6 },
  { letter: "N", areaIn2: 4.34 },
  { letter: "P", areaIn2: 6.38 },
  { letter: "Q", areaIn2: 11.05 },
  { letter: "R", areaIn2: 16.0 },
  { letter: "T", areaIn2: 26.0 },
];

export const IN2_TO_MM2 = 645.16;

export function orificeAreaMm2(areaIn2: number): number {
  return areaIn2 * IN2_TO_MM2;
}

/** Smallest orifice with A_API ≥ A_req (in²). Null if larger than T. */
export function selectApi526Orifice(
  requiredAreaIn2: number,
): Api526Orifice | null {
  if (!(requiredAreaIn2 > 0) || !Number.isFinite(requiredAreaIn2)) return null;
  for (const row of API_526_ORIFICES) {
    if (row.areaIn2 + 1e-9 >= requiredAreaIn2) return row;
  }
  return null;
}
