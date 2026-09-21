/**
 * API 650 Table 5.2a / 5.2b screening allowables (product design & hydrotest).
 * Values are standard SI / USC tabulations for ambient design metal temperature
 * screening (≤ ~90 °C / 200 °F) — confirm with the edition in force for the project.
 */

export type Api650MaterialId = "A283-C" | "A36" | "A516-70" | "A537-1";

export type Api650MaterialRow = {
  id: Api650MaterialId;
  label: string;
  /** Product design allowable S_d — MPa. */
  sdMpa: number;
  /** Hydrostatic test allowable S_t — MPa. */
  stMpa: number;
  /** Product design allowable S_d — psi. */
  sdPsi: number;
  /** Hydrostatic test allowable S_t — psi. */
  stPsi: number;
};

/** API 650 Table 5.2a (SI) / 5.2b (USC) carbon & HSLA plate screening rows. */
export const API650_MATERIALS: readonly Api650MaterialRow[] = [
  {
    id: "A283-C",
    label: "ASTM A283 Grade C",
    sdMpa: 137,
    stMpa: 154,
    sdPsi: 20_000,
    stPsi: 22_500,
  },
  {
    id: "A36",
    label: "ASTM A36",
    sdMpa: 160,
    stMpa: 171,
    sdPsi: 23_200,
    stPsi: 24_900,
  },
  {
    id: "A516-70",
    label: "ASTM A516 Grade 70",
    sdMpa: 183,
    stMpa: 196,
    sdPsi: 26_600,
    stPsi: 28_500,
  },
  {
    id: "A537-1",
    label: "ASTM A537 Class 1",
    sdMpa: 200,
    stMpa: 214,
    sdPsi: 29_000,
    stPsi: 31_100,
  },
] as const;

export function getApi650Material(
  id: Api650MaterialId,
): Api650MaterialRow {
  return API650_MATERIALS.find((m) => m.id === id) ?? API650_MATERIALS[1];
}
