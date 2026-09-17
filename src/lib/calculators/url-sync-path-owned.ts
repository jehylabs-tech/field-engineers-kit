/**
 * Query keys encoded in `/calculator/{slug}/{spec}` — strip from ?query when
 * a SpecRoute match is active. Keep auxiliary keys (units, pressure, …).
 */
export const PATH_OWNED_PARAMS = new Set([
  "nps",
  "sch",
  "schedule",
  "class",
  "class_rating",
  "fluid",
  "material",
  "cat",
  "category",
  "size",
  "fittingType",
  "qty",
  "bolts",
  "pattern",
  "hnps",
  "bnps",
  "hsch",
  "bsch",
  "theta",
  "angle",
  "pt",
  "vol",
  "mode",
  "gas",
  "temp",
  "arr",
  "hs",
  "hf",
  "npshr",
  "ps",
  "q",
  "qunit",
  "dens",
  "etap",
  "etam",
  "hp",
  "visc",
  "sf",
  "mode",
  "n1",
  "n2",
  "d1",
  "d2",
  "head",
  "pwr",
  "hso",
  "dtmax",
  "mcsf",
  "sor",
  "etamin",
  "dp",
  "vmax",
  "cp",
  "sg",
  "qop",
  "hr",
  "n",
  "facing",
  "gasketType",
  "insulationThickness",
  "operatingTemp",
  "ambientTemp",
  "windSpeed",
  "emissivity",
  "orientation",
  "headType",
  "diameter",
  "length",
  "liquidLevel",
  "geometryType",
  "purgeMethod",
  "pipeNps",
  "pipeLength",
  "vesselDiameter",
  "vesselLength",
  "customVolume",
  "cycleHighPressure",
  "mixingEfficiency",
  "initialO2",
  "targetO2",
  "purgeFlowRate",
  "materialGroup",
  "flangeClass",
  "designTemperature",
  "space",
  "s63",
  "s125",
  "s250",
  "s500",
  "s1k",
  "s2k",
  "s4k",
  "s8k",
  "rise",
  "run",
  "mat",
]);

/**
 * Drop keys already encoded in `/calculator/{slug}/{spec}` (nps, class, gasketType, …).
 * Keeps auxiliary state: units, pressure, targetBoltStress, etc.
 */
export function omitPathOwnedSearchParams(
  params: URLSearchParams,
): URLSearchParams {
  const keep = new URLSearchParams();
  params.forEach((value, key) => {
    if (!PATH_OWNED_PARAMS.has(key)) {
      keep.set(key, value);
    }
  });
  return keep;
}

export function searchParamsHavePathOwnedKeys(
  params: URLSearchParams,
): boolean {
  let found = false;
  params.forEach((_value, key) => {
    if (PATH_OWNED_PARAMS.has(key)) found = true;
  });
  return found;
}
