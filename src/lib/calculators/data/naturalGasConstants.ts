/**
 * Natural-gas screening constants (Standing / Wichert-Aziz / Hall-Yarborough).
 * Not a full AGA-8 / GERG-2008 composition implementation.
 */

/** Air molecular weight (g/mol ≈ kg/kmol). */
export const M_AIR = 28.9625;

/** Universal gas constant J/(mol·K) = Pa·m³/(mol·K). */
export const R_UNIVERSAL = 8.314462618;

/** US oilfield gas constant psia·ft³/(lbmol·°R). */
export const R_US_OILFIELD = 10.73159;

/** N2 pseudo-criticals for Kay blending (°R, psia). */
export const N2_TPC_R = 227.16;
export const N2_PPC_PSIA = 493.0;

/** CO2 pseudo-criticals (°R, psia) — reference only. */
export const CO2_TPC_R = 547.58;
export const CO2_PPC_PSIA = 1071.0;
