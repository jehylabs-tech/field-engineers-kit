import type { CalculatorType } from "@/lib/calculators/definitions";
import {
  ALLOY_MATERIAL_BY_ID,
  ALLOY_PSEO_MATERIALS,
} from "@/lib/calculators/engines/alloy-weight";
import { listPipeCopingPseoRoutes } from "@/lib/calculators/engines/pipe-coping";
import {
  expansionMaterialSeoLabel,
  listThermalExpansionPseoRoutes,
  THERMAL_EXPANSION_PSEO_MATERIALS,
  type ExpansionMaterial,
} from "@/lib/calculators/engines/thermal-expansion";
import { listPneumaticSafetyPseoRoutes } from "@/lib/calculators/pseo/pneumatic-safety-routes";
import { listPumpNpshPseoRoutes } from "@/lib/calculators/pseo/pump-npsh-routes";
import { listPumpTdhPseoRoutes } from "@/lib/calculators/pseo/pump-tdh-routes";
import { listPumpAffinityPseoRoutes } from "@/lib/calculators/pseo/pump-affinity-routes";
import { listPumpMcsfPseoRoutes } from "@/lib/calculators/pseo/pump-mcsf-routes";
import { listMultiPumpPseoRoutes } from "@/lib/calculators/pseo/multi-pump-routes";
import { listBoltWrenchLookupPseoRoutes } from "@/lib/calculators/pseo/bolt-wrench-lookup-routes";
import { listInsulationHeatLossPseoRoutes } from "@/lib/calculators/pseo/insulation-heat-loss-routes";
import { listTankVesselVolumePseoRoutes } from "@/lib/calculators/pseo/tank-vessel-volume-routes";
import { listNitrogenPurgingVolumePseoRoutes } from "@/lib/calculators/pseo/nitrogen-purging-volume-routes";
import { listFlangePtRatingPseoRoutes } from "@/lib/calculators/pseo/flange-pressure-temperature-rating-routes";
import {
  listAvailableNps,
  listFlangeClassesForNps,
  listFlangeNps,
  listFittingValveClassesForNps,
  listGasketClassesForNps,
  listSchedulesForNps,
} from "@/lib/data/loaders";
import { SLUG_TO_CALCULATOR_TYPE } from "@/lib/plant-context/tags";

export type SpecRoute = {
  slug: string;
  spec: string;
  query: Record<string, string>;
  label: string;
};

export type SpecSeoCopy = {
  title: string;
  description: string;
  h1: string;
  h2: string;
};

/** High-volume NPS set for class-based tools. */
const PSEO_NPS = new Set([
  "0.5",
  "1",
  "1.5",
  "2",
  "3",
  "4",
  "6",
  "8",
  "10",
  "12",
]);

/** NPS × schedule matrix tools. */
const PSEO_SCH_NPS = new Set([
  "0.5",
  "1",
  "1.5",
  "2",
  "3",
  "4",
  "6",
  "8",
  "10",
  "12",
]);

const SCH_SPECS = ["40", "80", "160", "STD", "XS"] as const;
const PSEO_CLASSES = new Set(["150", "300", "600", "900"]);

function sizeQuery(nps: string): Record<string, string> {
  return { nps, size: `${nps}in` };
}

function schQuery(nps: string, schedule: string): Record<string, string> {
  return { ...sizeQuery(nps), sch: schedule, schedule: `Sch ${schedule}` };
}

function classQuery(nps: string, pressureClass: string): Record<string, string> {
  return {
    ...sizeQuery(nps),
    class: pressureClass,
    class_rating: `Class ${pressureClass}`,
  };
}

function pushUnique(list: SpecRoute[], route: SpecRoute) {
  if (list.some((item) => item.slug === route.slug && item.spec === route.spec)) {
    return;
  }
  list.push(route);
}

function npsSchRoutes(slug: string): SpecRoute[] {
  const routes: SpecRoute[] = [];
  for (const pipe of listAvailableNps()) {
    if (!PSEO_SCH_NPS.has(pipe.nps)) continue;
    const schedules = listSchedulesForNps(pipe.nps);
    for (const sch of SCH_SPECS) {
      if (!schedules.some((row) => row.schedule === sch)) continue;
      const spec = `${pipe.nps}-inch-sch-${sch}`;
      pushUnique(routes, {
        slug,
        spec,
        query: schQuery(pipe.nps, sch),
        label: `${pipe.npsLabel} Sch ${sch}`,
      });
    }
  }
  return routes;
}

function npsClassRoutes(
  slug: string,
  classesFor: (nps: string) => { class: string }[],
  sizes: { nps: string; npsLabel: string }[],
): SpecRoute[] {
  const routes: SpecRoute[] = [];
  const allowedSizes = sizes.filter((size) => PSEO_NPS.has(size.nps));
  for (const size of allowedSizes) {
    for (const row of classesFor(size.nps)) {
      if (!PSEO_CLASSES.has(row.class)) continue;
      const spec = `${size.nps}-inch-class-${row.class}`;
      pushUnique(routes, {
        slug,
        spec,
        query: classQuery(size.nps, row.class),
        label: `${size.npsLabel} Class ${row.class}`,
      });
    }
  }
  return routes;
}

export function parseSpecToQuery(spec: string): Record<string, string> | null {
  const value = spec.trim().toLowerCase();

  const inchClassBlind = value.match(
    /^(\d+(?:\.\d+)?)-inch-class-(\d+)(?:-blind)?$/,
  );
  if (inchClassBlind) {
    return classQuery(inchClassBlind[1], inchClassBlind[2]);
  }

  const inchLb = value.match(/^(\d+(?:\.\d+)?)inch-(\d+)lb(?:-blind)?$/);
  if (inchLb) {
    return classQuery(inchLb[1], inchLb[2]);
  }

  const inchLbFacing = value.match(
    /^(\d+(?:\.\d+)?)inch-(\d+)lb-(rf|rtj|ff)$/,
  );
  if (inchLbFacing) {
    return {
      ...classQuery(inchLbFacing[1], inchLbFacing[2]),
      facing: inchLbFacing[3],
    };
  }

  // Sch tokens may be numeric or STD/XS (case-insensitive in URL).
  const inchSch = value.match(
    /^(?:nps-)?(\d+(?:\.\d+)?)(?:-inch)?-sch-?([a-z0-9]+)$/i,
  );
  if (inchSch) {
    const schRaw = inchSch[2];
    const sch =
      schRaw.toUpperCase() === "STD" || schRaw.toUpperCase() === "XS"
        ? schRaw.toUpperCase()
        : schRaw;
    return schQuery(inchSch[1], sch);
  }

  const inchOnly = value.match(/^(?:nps-)?(\d+(?:\.\d+)?)(?:-inch)?$/);
  if (inchOnly) {
    return sizeQuery(inchOnly[1]);
  }

  const boltPattern = value.match(
    /^(\d+)-bolt-(star|circular|cross|sequence)$/,
  );
  if (boltPattern) {
    const pattern =
      boltPattern[2] === "circular" ? "circular" : "star";
    return { bolts: boltPattern[1], pattern };
  }

  const coping = value.match(
    /^(\d+(?:\.\d+)?)-on-(\d+(?:\.\d+)?)-sch-([a-z0-9]+)-(\d+)deg$/,
  );
  if (coping) {
    const schRaw = coping[3];
    const sch =
      schRaw.toUpperCase() === "STD" || schRaw.toUpperCase() === "XS"
        ? schRaw.toUpperCase()
        : schRaw;
    return {
      bnps: coping[1],
      hnps: coping[2],
      hsch: sch,
      bsch: sch,
      theta: coping[4],
    };
  }

  // Thermal expansion: `{material}-{nps}-sch-{sch}` (cpvc-4-sch-40, steam-6-sch-80).
  const thermalMat = THERMAL_EXPANSION_PSEO_MATERIALS.join("|");
  const thermal = value.match(
    new RegExp(`^(${thermalMat})-(\\d+(?:\\.\\d+)?)-sch-([a-z0-9]+)$`, "i"),
  );
  if (thermal) {
    const schRaw = thermal[3];
    const sch =
      schRaw.toUpperCase() === "STD" || schRaw.toUpperCase() === "XS"
        ? schRaw.toUpperCase()
        : schRaw;
    return {
      material: thermal[1].toLowerCase(),
      nps: thermal[2],
      sch,
    };
  }

  // Pneumatic safety: `{P}-bar-{V}-m3` or `{P}-psi-{V}-ft3` (0.5 m³ → 0p5).
  const pneumatic = value.match(
    /^(\d+(?:\.\d+)?)-(bar|psi)-(\d+(?:p\d+)?)-(m3|ft3)$/i,
  );
  if (pneumatic) {
    const volRaw = pneumatic[3].replace("p", ".");
    const punit = pneumatic[2].toLowerCase();
    const vunit = pneumatic[4].toLowerCase();
    return {
      units: punit === "psi" || vunit === "ft3" ? "imperial" : "metric",
      pt: pneumatic[1],
      vol: volRaw,
      mode: "volume",
      gas: "air",
    };
  }

  // Pump NPSH: `{fluid}-{temp}{c|f}-{flooded|lift}-{height}{m|ft}`
  const npsh = value.match(
    /^(water|seawater|condensate|light-hc)-(\d+(?:p\d+)?)(c|f)-(flooded|lift)-(\d+(?:p\d+)?)(m|ft)$/i,
  );
  if (npsh) {
    const tempRaw = npsh[2].replace("p", ".");
    const hsRaw = npsh[5].replace("p", ".");
    const tempUnit = npsh[3].toLowerCase();
    const lenUnit = npsh[6].toLowerCase();
    const imperial = tempUnit === "f" || lenUnit === "ft";
    return {
      units: imperial ? "imperial" : "metric",
      fluid: npsh[1].toLowerCase(),
      temp: tempRaw,
      arr: npsh[4].toLowerCase(),
      hs: hsRaw,
      ps: imperial ? "14.696" : "1.01325",
    };
  }

  // Pump TDH: `{fluid}-{flow}{m3h|gpm}-hs-{H}{m|ft}-hf-{F}{m|ft}`
  const tdh = value.match(
    /^(water|seawater|condensate|light-hc)-(\d+(?:p\d+)?)(m3h|gpm)-hs-(\d+(?:p\d+)?)(m|ft)-hf-(\d+(?:p\d+)?)(m|ft)$/i,
  );
  if (tdh) {
    const flowRaw = tdh[2].replace("p", ".");
    const hsRaw = tdh[4].replace("p", ".");
    const hfRaw = tdh[6].replace("p", ".");
    const qunit = tdh[3].toLowerCase();
    const lenUnit = tdh[5].toLowerCase();
    const imperial = qunit === "gpm" || lenUnit === "ft";
    return {
      units: imperial ? "imperial" : "metric",
      fluid: tdh[1].toLowerCase(),
      q: flowRaw,
      qunit,
      hs: hsRaw,
      hf: hfRaw,
      hp: "0",
    };
  }

  // Pump affinity — speed: `speed-{N1}-to-{N2}-rpm-{Q}{m3h|gpm}-{H}{m|ft}`
  const affSpeed = value.match(
    /^speed-(\d+(?:p\d+)?)-to-(\d+(?:p\d+)?)-rpm-(\d+(?:p\d+)?)(m3h|gpm)-(\d+(?:p\d+)?)(m|ft)$/i,
  );
  if (affSpeed) {
    const qunit = affSpeed[4].toLowerCase();
    const imperial = qunit === "gpm" || affSpeed[6].toLowerCase() === "ft";
    return {
      units: imperial ? "imperial" : "metric",
      mode: "speed",
      n1: affSpeed[1].replace("p", "."),
      n2: affSpeed[2].replace("p", "."),
      q: affSpeed[3].replace("p", "."),
      qunit,
      head: affSpeed[5].replace("p", "."),
    };
  }

  // Pump affinity — trim: `trim-{D1}-to-{D2}{mm|in}-{Q}{m3h|gpm}-{H}{m|ft}`
  const affTrim = value.match(
    /^trim-(\d+(?:p\d+)?)-to-(\d+(?:p\d+)?)(mm|in)-(\d+(?:p\d+)?)(m3h|gpm)-(\d+(?:p\d+)?)(m|ft)$/i,
  );
  if (affTrim) {
    const dimUnit = affTrim[3].toLowerCase();
    const qunit = affTrim[5].toLowerCase();
    const imperial = dimUnit === "in" || qunit === "gpm";
    return {
      units: imperial ? "imperial" : "metric",
      mode: "diameter",
      d1: affTrim[1].replace("p", "."),
      d2: affTrim[2].replace("p", "."),
      q: affTrim[4].replace("p", "."),
      qunit,
      head: affTrim[6].replace("p", "."),
    };
  }

  // Pump affinity — combined: `combined-{N1}-to-{N2}-rpm-d-{D1}-to-{D2}{mm|in}-{Q}{m3h|gpm}`
  const affComb = value.match(
    /^combined-(\d+(?:p\d+)?)-to-(\d+(?:p\d+)?)-rpm-d-(\d+(?:p\d+)?)-to-(\d+(?:p\d+)?)(mm|in)-(\d+(?:p\d+)?)(m3h|gpm)$/i,
  );
  if (affComb) {
    const dimUnit = affComb[5].toLowerCase();
    const qunit = affComb[7].toLowerCase();
    const imperial = dimUnit === "in" || qunit === "gpm";
    return {
      units: imperial ? "imperial" : "metric",
      mode: "combined",
      n1: affComb[1].replace("p", "."),
      n2: affComb[2].replace("p", "."),
      d1: affComb[3].replace("p", "."),
      d2: affComb[4].replace("p", "."),
      q: affComb[6].replace("p", "."),
      qunit,
    };
  }

  // Pump MCSF: `{fluid}-{Q}{m3h|gpm}-hso-{H}{m|ft}-p-{P}{kw|hp}`
  const mcsf = value.match(
    /^(water-hot|water|naphtha|crude|amine)-(\d+(?:p\d+)?)(m3h|gpm)-hso-(\d+(?:p\d+)?)(m|ft)-p-(\d+(?:p\d+)?)(kw|hp)$/i,
  );
  if (mcsf) {
    const qunit = mcsf[3].toLowerCase();
    const lenUnit = mcsf[5].toLowerCase();
    const pUnit = mcsf[7].toLowerCase();
    const imperial =
      qunit === "gpm" || lenUnit === "ft" || pUnit === "hp";
    return {
      units: imperial ? "imperial" : "metric",
      fluid: mcsf[1].toLowerCase(),
      q: mcsf[2].replace("p", "."),
      qunit,
      hso: mcsf[4].replace("p", "."),
      pwr: mcsf[6].replace("p", "."),
    };
  }

  // Multi-pump: `{par|ser}-{N}p-{Q}{m3h|gpm}-hso-{Hso}{m|ft}-hr-{Hr}{m|ft}-hs-{Hs}{m|ft}-hf-{Hf}{m|ft}`
  const multi = value.match(
    /^(par|ser)-(\d+)p-(\d+(?:p\d+)?)(m3h|gpm)-hso-(\d+(?:p\d+)?)(m|ft)-hr-(\d+(?:p\d+)?)(m|ft)-hs-(\d+(?:p\d+)?)(m|ft)-hf-(\d+(?:p\d+)?)(m|ft)$/i,
  );
  if (multi) {
    const qunit = multi[4].toLowerCase();
    const lenUnit = multi[6].toLowerCase();
    const imperial = qunit === "gpm" || lenUnit === "ft";
    return {
      units: imperial ? "imperial" : "metric",
      mode: multi[1].toLowerCase() === "ser" ? "series" : "parallel",
      n: multi[2],
      q: multi[3].replace("p", "."),
      qunit,
      hso: multi[5].replace("p", "."),
      hr: multi[7].replace("p", "."),
      hs: multi[9].replace("p", "."),
      hf: multi[11].replace("p", "."),
    };
  }

  // Insulation heat loss: `{nps}inch-{material}-{thickness}{mm|in}`
  const insulation = value.match(
    /^(?:nps-)?(\d+(?:\.\d+)?)inch-(mineral-wool|calcium-silicate|cellular-glass|polyurethane)-(\d+(?:p\d+)?)(mm|in)$/i,
  );
  if (insulation) {
    const thickRaw = insulation[3].replace("p", ".");
    const thickUnit = insulation[4].toLowerCase();
    return {
      units: thickUnit === "in" ? "imperial" : "metric",
      nps: insulation[1],
      material: insulation[2].toLowerCase(),
      insulationThickness: thickRaw,
    };
  }

  // Tank / vessel volume: `{orientation}-{head}-{Di}{mm|in}-{L}{mm|in}`
  // Spec token `2inch1-ellipsoidal` maps to headType `2to1-ellipsoidal`.
  const tank = value.match(
    /^(horizontal|vertical)-(flat|2inch1-ellipsoidal|torispherical-klopper|hemispherical)-(\d+(?:p\d+)?)(mm|in)-(\d+(?:p\d+)?)(mm|in)$/i,
  );
  if (tank) {
    const dimUnit = tank[4].toLowerCase();
    const headToken = tank[2].toLowerCase();
    const headType =
      headToken === "2inch1-ellipsoidal" ? "2to1-ellipsoidal" : headToken;
    return {
      units: dimUnit === "in" ? "imperial" : "metric",
      orientation: tank[1].toLowerCase(),
      headType,
      diameter: tank[3].replace("p", "."),
      length: tank[5].replace("p", "."),
    };
  }

  // Flange P-T: `group-{1-1|2-2}-class{N}-{T}{c|f}`
  const flangePt = value.match(
    /^group-(1-1|2-2)-class(150|300|600|900|1500|2500)-(\d+(?:p\d+)?)(c|f)$/i,
  );
  if (flangePt) {
    const unitTok = flangePt[4].toLowerCase();
    return {
      units: unitTok === "f" ? "imperial" : "metric",
      materialGroup: flangePt[1].replace("-", "."),
      flangeClass: flangePt[2],
      designTemperature: flangePt[3].replace("p", "."),
    };
  }

  if (value === "liquid" || value === "gas") {
    return { fluid: value };
  }
  if (value === "hydrostatic" || value === "pneumatic") {
    return { fluid: value };
  }
  if (
    value === "pressure" ||
    value === "flow" ||
    value === "dimension" ||
    value === "temperature" ||
    value === "torque" ||
    value === "weight" ||
    value === "velocity"
  ) {
    return { cat: value, category: value };
  }
  if (
    value === "carbon-steel" ||
    value === "stainless-304" ||
    value === "stainless-316" ||
    value in ALLOY_MATERIAL_BY_ID
  ) {
    return { material: value };
  }
  return null;
}

export function specLabelFromQuery(
  spec: string,
  query: Record<string, string>,
): string {
  if (query.bolts) {
    const pattern =
      query.pattern === "circular" ? "circular" : "star";
    return `${query.bolts}-Bolt ${pattern === "circular" ? "Circular" : "Star"}`;
  }
  if (query.bnps && query.hnps) {
    const sch = query.hsch || query.bsch || "";
    const ang = query.theta ? `${query.theta}°` : "";
    return `${query.bnps}" on ${query.hnps}"${sch ? ` Sch ${sch}` : ""}${ang ? ` · ${ang}` : ""}`;
  }
  if (query.insulationThickness && query.nps && query.material) {
    const thickUnit = query.units === "imperial" ? "in" : "mm";
    const mat = query.material
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return `NPS ${query.nps} · ${mat} · ${query.insulationThickness} ${thickUnit}`;
  }
  if (query.orientation && query.headType && query.diameter && query.length) {
    const dimUnit = query.units === "imperial" ? "in" : "mm";
    const head =
      query.headType === "2to1-ellipsoidal"
        ? "2:1 SE"
        : query.headType === "torispherical-klopper"
          ? "F&D / Klöpper"
          : query.headType === "hemispherical"
            ? "hemi"
            : query.headType;
    return `${query.orientation} · ${head} · Di ${query.diameter} ${dimUnit} · L ${query.length} ${dimUnit}`;
  }
  if (
    query.material &&
    THERMAL_EXPANSION_PSEO_MATERIALS.includes(
      query.material as ExpansionMaterial,
    ) &&
    query.nps &&
    query.sch
  ) {
    return `${expansionMaterialSeoLabel(query.material as ExpansionMaterial)} · ${query.nps}" Sch ${query.sch}`;
  }
  if (query.pt && query.vol && (query.units === "metric" || query.units === "imperial")) {
    const pUnit = query.units === "imperial" ? "psi" : "bar";
    const vUnit = query.units === "imperial" ? "ft³" : "m³";
    return `${query.pt} ${pUnit} · ${query.vol} ${vUnit}`;
  }
  if (
    query.fluid &&
    query.temp &&
    query.arr &&
    query.hs &&
    (query.arr === "flooded" || query.arr === "lift")
  ) {
    const fluid =
      query.fluid === "seawater"
        ? "Seawater"
        : query.fluid === "condensate"
          ? "Condensate"
          : query.fluid === "light-hc"
            ? "Light HC"
            : "Water";
    const tUnit = query.units === "imperial" ? "°F" : "°C";
    const hUnit = query.units === "imperial" ? "ft" : "m";
    return `${fluid} ${query.temp} ${tUnit} · ${query.arr} ${query.hs} ${hUnit}`;
  }
  if (query.fluid && query.q && query.hs && query.hf && query.qunit) {
    const fluid =
      query.fluid === "seawater"
        ? "Seawater"
        : query.fluid === "condensate"
          ? "Condensate"
          : query.fluid === "light-hc"
            ? "Light HC"
            : "Water";
    const qLabel = query.qunit === "gpm" ? `${query.q} GPM` : `${query.q} m³/h`;
    const hUnit = query.units === "imperial" ? "ft" : "m";
    return `${fluid} ${qLabel} · Hs ${query.hs} ${hUnit} · Hf ${query.hf} ${hUnit}`;
  }
  if (query.mode === "speed" && query.n1 && query.n2) {
    const qLabel =
      query.qunit === "gpm"
        ? `${query.q} GPM`
        : query.q
          ? `${query.q} m³/h`
          : "";
    return `Speed ${query.n1}→${query.n2} RPM${qLabel ? ` · ${qLabel}` : ""}`;
  }
  if (query.mode === "diameter" && query.d1 && query.d2) {
    return `Trim ${query.d1}→${query.d2} · Q ${query.q ?? ""}`;
  }
  if (query.mode === "combined" && query.n1 && query.d1) {
    return `VFD+trim ${query.n1}→${query.n2} · D ${query.d1}→${query.d2}`;
  }
  if (query.class && query.nps) return `${query.nps}" Class ${query.class}`;
  if (query.sch && query.nps) return `${query.nps}" Sch ${query.sch}`;
  if (query.nps) return `${query.nps}"`;
  if (query.fluid) {
    return query.fluid.charAt(0).toUpperCase() + query.fluid.slice(1);
  }
  if (query.cat) return query.cat;
  if (query.category) return query.category;
  if (query.material) {
    return query.material
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  if (query.query) return query.query;
  return spec.replace(/-/g, " ");
}

export function listSpecRoutesForSlug(slug: string): SpecRoute[] {
  const type = SLUG_TO_CALCULATOR_TYPE[slug];
  if (!type) return [];

  switch (type) {
    case "pipe-schedule":
    case "pressure-drop":
    case "flow-velocity":
    case "butt-weld-fitting":
    case "pipe-thickness":
    case "hydro-test":
    case "link-seal":
      return npsSchRoutes(slug);
    case "thermal-expansion":
      return listThermalExpansionPseoRoutes(slug);
    case "flange-dimension":
      return npsClassRoutes(slug, listFlangeClassesForNps, listFlangeNps());
    case "bolt-torque":
      return npsClassRoutes(slug, listFlangeClassesForNps, listFlangeNps());
    case "bolt-sequence": {
      const routes: SpecRoute[] = [];
      const counts = [4, 8, 12, 16, 20, 24, 32, 36, 40, 48, 56, 64];
      for (const bolts of counts) {
        for (const pattern of ["star", "circular"] as const) {
          const spec = `${bolts}-bolt-${pattern}`;
          pushUnique(routes, {
            slug,
            spec,
            query: { bolts: String(bolts), pattern },
            label: `${bolts}-Bolt ${pattern === "star" ? "Star" : "Circular"}`,
          });
        }
      }
      return routes;
    }
    case "fitting-valve-dimension":
      return npsClassRoutes(
        slug,
        (nps) => listFittingValveClassesForNps("gate_valve", nps),
        listFlangeNps(),
      );
    case "gasket-dimension":
      return npsClassRoutes(
        slug,
        (nps) => listGasketClassesForNps("spiral_wound", nps),
        listFlangeNps(),
      );
    case "blind-flange":
      return npsClassRoutes(slug, listFlangeClassesForNps, listFlangeNps());
    case "valve-cv":
      return [
        { slug, spec: "liquid", query: { fluid: "liquid" }, label: "Liquid" },
        { slug, spec: "gas", query: { fluid: "gas" }, label: "Gas" },
      ];
    case "metal-weight":
      return [
        {
          slug,
          spec: "carbon-steel",
          query: { material: "carbon-steel" },
          label: "Carbon steel",
        },
        {
          slug,
          spec: "stainless-304",
          query: { material: "stainless-304" },
          label: "Stainless 304",
        },
        {
          slug,
          spec: "stainless-316",
          query: { material: "stainless-316" },
          label: "Stainless 316",
        },
      ];
    case "alloy-weight":
      return ALLOY_PSEO_MATERIALS.map((id) => ({
        slug,
        spec: id,
        query: { material: id },
        label: ALLOY_MATERIAL_BY_ID[id].label,
      }));
    case "pipe-coping":
      return listPipeCopingPseoRoutes(slug);
    case "pneumatic-safety":
      return listPneumaticSafetyPseoRoutes(slug);
    case "pump-npsh":
      return listPumpNpshPseoRoutes(slug);
    case "pump-tdh":
      return listPumpTdhPseoRoutes(slug);
    case "pump-affinity":
      return listPumpAffinityPseoRoutes(slug);
    case "pump-mcsf":
      return listPumpMcsfPseoRoutes(slug);
    case "multi-pump":
      return listMultiPumpPseoRoutes(slug);
    case "bolt-wrench-lookup":
      return listBoltWrenchLookupPseoRoutes(slug);
    case "insulation-heat-loss":
      return listInsulationHeatLossPseoRoutes(slug);
    case "tank-vessel-volume":
      return listTankVesselVolumePseoRoutes(slug);
    case "nitrogen-purging-volume":
      return listNitrogenPurgingVolumePseoRoutes(slug);
    case "flange-pressure-temperature-rating":
      return listFlangePtRatingPseoRoutes(slug);
    case "unit-converter":
      return [
        {
          slug,
          spec: "pressure",
          query: {
            cat: "pressure",
            category: "pressure",
            from: "bar",
            to: "psi",
          },
          label: "Pressure",
        },
        {
          slug,
          spec: "dimension",
          query: {
            cat: "dimension",
            category: "dimension",
            from: "mm",
            to: "in",
          },
          label: "Dimension",
        },
        {
          slug,
          spec: "temperature",
          query: {
            cat: "temperature",
            category: "temperature",
            from: "C",
            to: "F",
          },
          label: "Temperature",
        },
        {
          slug,
          spec: "flow",
          query: { cat: "flow", category: "flow", from: "m3/h", to: "GPM" },
          label: "Flow Rate",
        },
        {
          slug,
          spec: "torque",
          query: {
            cat: "torque",
            category: "torque",
            from: "N·m",
            to: "ft·lb",
          },
          label: "Torque",
        },
        {
          slug,
          spec: "weight",
          query: { cat: "weight", category: "weight", from: "kg", to: "lb" },
          label: "Weight",
        },
        {
          slug,
          spec: "velocity",
          query: {
            cat: "velocity",
            category: "velocity",
            from: "m/s",
            to: "ft/s",
          },
          label: "Velocity",
        },
      ];
    default:
      return [];
  }
}

export function listAllSpecRoutes(slugs: string[]): SpecRoute[] {
  return slugs.flatMap((slug) => listSpecRoutesForSlug(slug));
}

export function resolveSpecRoute(
  slug: string,
  spec: string,
): SpecRoute | undefined {
  const listed = listSpecRoutesForSlug(slug).find((item) => item.spec === spec);
  if (listed) return listed;

  const query = parseSpecToQuery(spec);
  if (!query) return undefined;
  return {
    slug,
    spec,
    query,
    label: specLabelFromQuery(spec, query),
  };
}

export function buildSpecPath(slug: string, spec: string): string {
  return `/calculator/${slug}/${spec}`;
}

/**
 * Match current UI / URL query keys to a listed SpecRoute for path sync.
 * Prefer the most specific match (nps+sch, nps+class, then single-key routes).
 */
export function findSpecRouteForInputs(
  slug: string,
  partial: Record<string, string | number | undefined | null>,
): SpecRoute | undefined {
  const routes = listSpecRoutesForSlug(slug);
  if (routes.length === 0) return undefined;

  const nps = partial.nps != null && partial.nps !== "" ? String(partial.nps) : "";
  const sch =
    partial.sch != null && partial.sch !== ""
      ? String(partial.sch)
      : partial.schedule != null && partial.schedule !== ""
        ? String(partial.schedule).replace(/^Sch\s+/i, "")
        : "";
  const pressureClass =
    partial.class != null && partial.class !== ""
      ? String(partial.class)
      : partial.class_rating != null && partial.class_rating !== ""
        ? String(partial.class_rating).replace(/^Class\s+/i, "")
        : "";
  const fluid = partial.fluid != null ? String(partial.fluid) : "";
  const material = partial.material != null ? String(partial.material) : "";
  const cat =
    partial.cat != null
      ? String(partial.cat)
      : partial.category != null
        ? String(partial.category)
        : "";
  const bolts =
    partial.bolts != null && partial.bolts !== ""
      ? String(partial.bolts)
      : "";
  const pattern =
    partial.pattern != null && partial.pattern !== ""
      ? String(partial.pattern)
      : "";
  const facing =
    partial.facing != null && partial.facing !== ""
      ? String(partial.facing).toLowerCase()
      : "";
  const hnps =
    partial.hnps != null && partial.hnps !== ""
      ? String(partial.hnps)
      : "";
  const bnps =
    partial.bnps != null && partial.bnps !== ""
      ? String(partial.bnps)
      : "";
  const hsch =
    partial.hsch != null && partial.hsch !== ""
      ? String(partial.hsch)
      : "";
  const theta =
    partial.theta != null && partial.theta !== ""
      ? String(Math.round(Number(partial.theta)) || partial.theta)
      : "";
  const pt =
    partial.pt != null && partial.pt !== ""
      ? String(partial.pt)
      : partial.testPressure != null && partial.testPressure !== ""
        ? String(partial.testPressure)
        : "";
  const vol =
    partial.vol != null && partial.vol !== ""
      ? String(partial.vol)
      : partial.volume != null && partial.volume !== ""
        ? String(partial.volume)
        : "";
  const units =
    partial.units != null && partial.units !== ""
      ? String(partial.units)
      : partial.unitSystem != null && partial.unitSystem !== ""
        ? String(partial.unitSystem)
        : "";
  const temp =
    partial.temp != null && partial.temp !== ""
      ? String(partial.temp)
      : partial.temperature != null && partial.temperature !== ""
        ? String(partial.temperature)
        : "";
  const arr =
    partial.arr != null && partial.arr !== ""
      ? String(partial.arr)
      : partial.arrangement != null && partial.arrangement !== ""
        ? String(partial.arrangement)
        : "";
  const hs =
    partial.hs != null && partial.hs !== ""
      ? String(partial.hs)
      : partial.staticHeight != null && partial.staticHeight !== ""
        ? String(partial.staticHeight)
        : partial.staticHead != null && partial.staticHead !== ""
          ? String(partial.staticHead)
          : "";
  const hf =
    partial.hf != null && partial.hf !== ""
      ? String(partial.hf)
      : partial.frictionLoss != null && partial.frictionLoss !== ""
        ? String(partial.frictionLoss)
        : partial.frictionHead != null && partial.frictionHead !== ""
          ? String(partial.frictionHead)
          : "";
  const qFlow =
    partial.q != null && partial.q !== ""
      ? String(partial.q)
      : partial.flow != null && partial.flow !== ""
        ? String(partial.flow)
        : "";
  const qunit =
    partial.qunit != null && partial.qunit !== ""
      ? String(partial.qunit)
      : partial.flowUnit != null && partial.flowUnit !== ""
        ? String(partial.flowUnit)
        : "";
  const mode =
    partial.mode != null && partial.mode !== "" ? String(partial.mode) : "";
  const n1 =
    partial.n1 != null && partial.n1 !== ""
      ? String(partial.n1)
      : partial.speed1 != null && partial.speed1 !== ""
        ? String(partial.speed1)
        : "";
  const n2 =
    partial.n2 != null && partial.n2 !== ""
      ? String(partial.n2)
      : partial.speed2 != null && partial.speed2 !== ""
        ? String(partial.speed2)
        : "";
  const d1 =
    partial.d1 != null && partial.d1 !== ""
      ? String(partial.d1)
      : partial.diameter1 != null && partial.diameter1 !== ""
        ? String(partial.diameter1)
        : "";
  const d2 =
    partial.d2 != null && partial.d2 !== ""
      ? String(partial.d2)
      : partial.diameter2 != null && partial.diameter2 !== ""
        ? String(partial.diameter2)
        : "";
  const head =
    partial.head != null && partial.head !== ""
      ? String(partial.head)
      : partial.head1 != null && partial.head1 !== ""
        ? String(partial.head1)
        : "";
  const hso =
    partial.hso != null && partial.hso !== ""
      ? String(partial.hso)
      : partial.headShutoff != null && partial.headShutoff !== ""
        ? String(partial.headShutoff)
        : "";
  const pwr =
    partial.pwr != null && partial.pwr !== ""
      ? String(partial.pwr)
      : partial.powerRated != null && partial.powerRated !== ""
        ? String(partial.powerRated)
        : "";
  const hr =
    partial.hr != null && partial.hr !== ""
      ? String(partial.hr)
      : partial.headRated != null && partial.headRated !== ""
        ? String(partial.headRated)
        : "";
  const nPumps =
    partial.n != null && partial.n !== ""
      ? String(partial.n)
      : partial.pumpCount != null && partial.pumpCount !== ""
        ? String(partial.pumpCount)
        : "";
  const insulationThickness =
    partial.insulationThickness != null && partial.insulationThickness !== ""
      ? String(partial.insulationThickness)
      : "";
  const orientation =
    partial.orientation != null && partial.orientation !== ""
      ? String(partial.orientation)
      : "";
  const headType =
    partial.headType != null && partial.headType !== ""
      ? String(partial.headType)
      : "";
  const diameter =
    partial.diameter != null && partial.diameter !== ""
      ? String(partial.diameter)
      : "";
  const length =
    partial.length != null && partial.length !== ""
      ? String(partial.length)
      : "";
  const geometryType =
    partial.geometryType != null && partial.geometryType !== ""
      ? String(partial.geometryType)
      : "";
  const purgeMethod =
    partial.purgeMethod != null && partial.purgeMethod !== ""
      ? String(partial.purgeMethod)
      : "";
  const pipeNps =
    partial.pipeNps != null && partial.pipeNps !== ""
      ? String(partial.pipeNps).replace(/^NPS\s*/i, "").replace(/"/g, "")
      : "";
  const pipeLength =
    partial.pipeLength != null && partial.pipeLength !== ""
      ? String(partial.pipeLength)
      : "";
  const vesselDiameter =
    partial.vesselDiameter != null && partial.vesselDiameter !== ""
      ? String(partial.vesselDiameter)
      : "";
  const vesselLength =
    partial.vesselLength != null && partial.vesselLength !== ""
      ? String(partial.vesselLength)
      : "";
  const customVolume =
    partial.customVolume != null && partial.customVolume !== ""
      ? String(partial.customVolume)
      : "";
  const materialGroup =
    partial.materialGroup != null && partial.materialGroup !== ""
      ? String(partial.materialGroup)
      : "";
  const flangeClass =
    partial.flangeClass != null && partial.flangeClass !== ""
      ? String(partial.flangeClass)
      : "";
  const designTemperature =
    partial.designTemperature != null && partial.designTemperature !== ""
      ? String(partial.designTemperature)
      : "";

  if (bolts && pattern) {
    const hit = routes.find(
      (route) =>
        route.query.bolts === bolts && route.query.pattern === pattern,
    );
    if (hit) return hit;
  }
  if (bolts) {
    const hit = routes.find(
      (route) =>
        route.query.bolts === bolts &&
        (route.query.pattern === "star" || !route.query.pattern),
    );
    if (hit) return hit;
  }

  if (hnps && bnps && hsch && theta) {
    const hit = routes.find(
      (route) =>
        route.query.hnps === hnps &&
        route.query.bnps === bnps &&
        route.query.hsch === hsch &&
        route.query.theta === theta,
    );
    if (hit) return hit;
  }
  if (hnps && bnps && theta) {
    const hit = routes.find(
      (route) =>
        route.query.hnps === hnps &&
        route.query.bnps === bnps &&
        route.query.theta === theta,
    );
    if (hit) return hit;
  }

  if (material && nps && sch) {
    const hit = routes.find(
      (route) =>
        route.query.material === material &&
        route.query.nps === nps &&
        route.query.sch === sch,
    );
    if (hit) return hit;
  }

  if (pt && vol) {
    const hit = routes.find((route) => {
      if (route.query.pt !== pt) return false;
      const routeVol = Number(route.query.vol);
      const wantVol = Number(vol);
      if (
        Number.isFinite(routeVol) &&
        Number.isFinite(wantVol) &&
        Math.abs(routeVol - wantVol) < 1e-9
      ) {
        if (units && route.query.units && route.query.units !== units) {
          return false;
        }
        return true;
      }
      return route.query.vol === vol;
    });
    if (hit) return hit;
  }

  if (fluid && temp && arr && hs) {
    const hit = routes.find((route) => {
      if (route.query.fluid !== fluid) return false;
      if (route.query.arr !== arr) return false;
      if (units && route.query.units && route.query.units !== units) {
        return false;
      }
      const routeTemp = Number(route.query.temp);
      const wantTemp = Number(temp);
      const routeHs = Number(route.query.hs);
      const wantHs = Number(hs);
      const tempOk =
        Number.isFinite(routeTemp) && Number.isFinite(wantTemp)
          ? Math.abs(routeTemp - wantTemp) < 1e-9
          : route.query.temp === temp;
      const hsOk =
        Number.isFinite(routeHs) && Number.isFinite(wantHs)
          ? Math.abs(routeHs - wantHs) < 1e-9
          : route.query.hs === hs;
      return tempOk && hsOk;
    });
    if (hit) return hit;
  }

  if (fluid && qFlow && hs && hf) {
    const hit = routes.find((route) => {
      if (route.query.fluid !== fluid) return false;
      if (units && route.query.units && route.query.units !== units) {
        return false;
      }
      if (qunit && route.query.qunit && route.query.qunit !== qunit) {
        return false;
      }
      const routeQ = Number(route.query.q);
      const wantQ = Number(qFlow);
      const routeHs = Number(route.query.hs);
      const wantHs = Number(hs);
      const routeHf = Number(route.query.hf);
      const wantHf = Number(hf);
      const qOk =
        Number.isFinite(routeQ) && Number.isFinite(wantQ)
          ? Math.abs(routeQ - wantQ) < 1e-9
          : route.query.q === qFlow;
      const hsOk =
        Number.isFinite(routeHs) && Number.isFinite(wantHs)
          ? Math.abs(routeHs - wantHs) < 1e-9
          : route.query.hs === hs;
      const hfOk =
        Number.isFinite(routeHf) && Number.isFinite(wantHf)
          ? Math.abs(routeHf - wantHf) < 1e-9
          : route.query.hf === hf;
      return qOk && hsOk && hfOk;
    });
    if (hit) return hit;
  }

  // Pump affinity — speed / trim / combined (Pattern B)
  if (mode === "speed" && n1 && n2 && qFlow) {
    const hit = routes.find((route) => {
      if (route.query.mode !== "speed") return false;
      if (units && route.query.units && route.query.units !== units) {
        return false;
      }
      if (qunit && route.query.qunit && route.query.qunit !== qunit) {
        return false;
      }
      const numEq = (a: string, b: string) => {
        const na = Number(a);
        const nb = Number(b);
        return Number.isFinite(na) && Number.isFinite(nb)
          ? Math.abs(na - nb) < 1e-9
          : a === b;
      };
      if (!numEq(route.query.n1 ?? "", n1) || !numEq(route.query.n2 ?? "", n2)) {
        return false;
      }
      if (!numEq(route.query.q ?? "", qFlow)) return false;
      if (head && route.query.head && !numEq(route.query.head, head)) {
        return false;
      }
      return true;
    });
    if (hit) return hit;
  }

  if (mode === "diameter" && d1 && d2 && qFlow) {
    const hit = routes.find((route) => {
      if (route.query.mode !== "diameter") return false;
      if (units && route.query.units && route.query.units !== units) {
        return false;
      }
      if (qunit && route.query.qunit && route.query.qunit !== qunit) {
        return false;
      }
      const numEq = (a: string, b: string) => {
        const na = Number(a);
        const nb = Number(b);
        return Number.isFinite(na) && Number.isFinite(nb)
          ? Math.abs(na - nb) < 1e-9
          : a === b;
      };
      if (!numEq(route.query.d1 ?? "", d1) || !numEq(route.query.d2 ?? "", d2)) {
        return false;
      }
      if (!numEq(route.query.q ?? "", qFlow)) return false;
      if (head && route.query.head && !numEq(route.query.head, head)) {
        return false;
      }
      return true;
    });
    if (hit) return hit;
  }

  if (mode === "combined" && n1 && n2 && d1 && d2 && qFlow) {
    const hit = routes.find((route) => {
      if (route.query.mode !== "combined") return false;
      if (units && route.query.units && route.query.units !== units) {
        return false;
      }
      if (qunit && route.query.qunit && route.query.qunit !== qunit) {
        return false;
      }
      const numEq = (a: string, b: string) => {
        const na = Number(a);
        const nb = Number(b);
        return Number.isFinite(na) && Number.isFinite(nb)
          ? Math.abs(na - nb) < 1e-9
          : a === b;
      };
      return (
        numEq(route.query.n1 ?? "", n1) &&
        numEq(route.query.n2 ?? "", n2) &&
        numEq(route.query.d1 ?? "", d1) &&
        numEq(route.query.d2 ?? "", d2) &&
        numEq(route.query.q ?? "", qFlow)
      );
    });
    if (hit) return hit;
  }

  // Pump MCSF — `{fluid}-{Q}-hso-{H}-p-{P}`
  if (fluid && qFlow && hso && pwr) {
    const hit = routes.find((route) => {
      if (!route.query.hso || !route.query.pwr) return false;
      if (route.query.fluid !== fluid) return false;
      if (units && route.query.units && route.query.units !== units) {
        return false;
      }
      if (qunit && route.query.qunit && route.query.qunit !== qunit) {
        return false;
      }
      const numEq = (a: string, b: string) => {
        const na = Number(a);
        const nb = Number(b);
        return Number.isFinite(na) && Number.isFinite(nb)
          ? Math.abs(na - nb) < 1e-9
          : a === b;
      };
      return (
        numEq(route.query.q ?? "", qFlow) &&
        numEq(route.query.hso, hso) &&
        numEq(route.query.pwr, pwr)
      );
    });
    if (hit) return hit;
  }

  // Multi-pump parallel / series
  if (
    (mode === "parallel" || mode === "series") &&
    nPumps &&
    qFlow &&
    hso &&
    hr
  ) {
    const hit = routes.find((route) => {
      if (route.query.mode !== mode) return false;
      if (units && route.query.units && route.query.units !== units) {
        return false;
      }
      if (qunit && route.query.qunit && route.query.qunit !== qunit) {
        return false;
      }
      const numEq = (a: string, b: string) => {
        const na = Number(a);
        const nb = Number(b);
        return Number.isFinite(na) && Number.isFinite(nb)
          ? Math.abs(na - nb) < 1e-9
          : a === b;
      };
      return (
        numEq(route.query.n ?? "", nPumps) &&
        numEq(route.query.q ?? "", qFlow) &&
        numEq(route.query.hso ?? "", hso) &&
        numEq(route.query.hr ?? "", hr) &&
        (!hs || !route.query.hs || numEq(route.query.hs, hs)) &&
        (!hf || !route.query.hf || numEq(route.query.hf, hf))
      );
    });
    if (hit) return hit;
  }

  // Insulation heat loss — nps + material + thickness
  if (insulationThickness && nps && material) {
    const hit = routes.find((route) => {
      if (route.query.nps !== nps) return false;
      if (route.query.material !== material) return false;
      if (units && route.query.units && route.query.units !== units) {
        return false;
      }
      const routeT = Number(route.query.insulationThickness);
      const wantT = Number(insulationThickness);
      return Number.isFinite(routeT) && Number.isFinite(wantT)
        ? Math.abs(routeT - wantT) < 1e-9
        : route.query.insulationThickness === insulationThickness;
    });
    if (hit) return hit;
  }

  // Tank / vessel volume — orientation + head + Di + L
  if (orientation && headType && diameter && length) {
    const hit = routes.find((route) => {
      if (route.query.orientation !== orientation) return false;
      if (route.query.headType !== headType) return false;
      if (units && route.query.units && route.query.units !== units) {
        return false;
      }
      const numEq = (a: string, b: string) => {
        const na = Number(a);
        const nb = Number(b);
        return Number.isFinite(na) && Number.isFinite(nb)
          ? Math.abs(na - nb) < 1e-9
          : a === b;
      };
      return (
        numEq(route.query.diameter ?? "", diameter) &&
        numEq(route.query.length ?? "", length)
      );
    });
    if (hit) return hit;
  }

  // Nitrogen purging — geometry + method + key size/volume
  if (geometryType && purgeMethod) {
    const numEq = (a: string, b: string) => {
      const na = Number(a);
      const nb = Number(b);
      return Number.isFinite(na) && Number.isFinite(nb)
        ? Math.abs(na - nb) < 1e-9
        : a === b;
    };
    const hit = routes.find((route) => {
      if (route.query.geometryType !== geometryType) return false;
      if (route.query.purgeMethod !== purgeMethod) return false;
      if (units && route.query.units && route.query.units !== units) {
        return false;
      }
      if (geometryType === "piping") {
        const routeNps = (route.query.pipeNps ?? "").replace(/^NPS\s*/i, "");
        return (
          routeNps === pipeNps &&
          numEq(route.query.pipeLength ?? "", pipeLength)
        );
      }
      if (geometryType === "vessel") {
        return (
          numEq(route.query.vesselDiameter ?? "", vesselDiameter) &&
          numEq(route.query.vesselLength ?? "", vesselLength)
        );
      }
      return numEq(route.query.customVolume ?? "", customVolume);
    });
    if (hit) return hit;
  }

  // Flange P-T rating — material group + class (+ temp when present)
  if (materialGroup && flangeClass) {
    const numEq = (a: string, b: string) => {
      const na = Number(a);
      const nb = Number(b);
      return Number.isFinite(na) && Number.isFinite(nb)
        ? Math.abs(na - nb) < 1e-6
        : a === b;
    };
    const withTemp =
      designTemperature !== ""
        ? routes.find((route) => {
            if (route.query.materialGroup !== materialGroup) return false;
            if (route.query.flangeClass !== flangeClass) return false;
            if (units && route.query.units && route.query.units !== units) {
              return false;
            }
            return numEq(route.query.designTemperature ?? "", designTemperature);
          })
        : undefined;
    if (withTemp) return withTemp;
    const hit = routes.find((route) => {
      if (route.query.materialGroup !== materialGroup) return false;
      if (route.query.flangeClass !== flangeClass) return false;
      if (units && route.query.units && route.query.units !== units) {
        return false;
      }
      return true;
    });
    if (hit) return hit;
  }

  if (nps && sch) {
    const withMat =
      material !== ""
        ? routes.find(
            (route) =>
              route.query.nps === nps &&
              route.query.sch === sch &&
              route.query.material === material,
          )
        : undefined;
    if (withMat) return withMat;
    const plain = routes.find(
      (route) =>
        route.query.nps === nps &&
        route.query.sch === sch &&
        !route.query.material,
    );
    if (plain) return plain;
    const hit = routes.find(
      (route) => route.query.nps === nps && route.query.sch === sch,
    );
    if (hit) return hit;
  }
  if (nps && pressureClass) {
    if (facing) {
      const withFacing = routes.find(
        (route) =>
          route.query.nps === nps &&
          route.query.class === pressureClass &&
          (route.query.facing ?? "").toLowerCase() === facing,
      );
      if (withFacing) return withFacing;
      // Faced routes exist for this tool — do not fall back to a different face.
      if (routes.some((route) => Boolean(route.query.facing))) {
        return undefined;
      }
    }
    const plain = routes.find(
      (route) =>
        route.query.nps === nps &&
        route.query.class === pressureClass &&
        !route.query.facing,
    );
    if (plain) return plain;
    if (!facing || facing === "rf") {
      const rfHit = routes.find(
        (route) =>
          route.query.nps === nps &&
          route.query.class === pressureClass &&
          (!route.query.facing || route.query.facing === "rf"),
      );
      if (rfHit) return rfHit;
    }
  }
  if (fluid) {
    const hit = routes.find((route) => route.query.fluid === fluid);
    if (hit) return hit;
  }
  if (material) {
    const hit = routes.find((route) => route.query.material === material);
    if (hit) return hit;
  }
  if (cat) {
    const hit = routes.find(
      (route) => route.query.cat === cat || route.query.category === cat,
    );
    if (hit) return hit;
  }
  if (nps) {
    const hit = routes.find(
      (route) =>
        route.query.nps === nps && !route.query.sch && !route.query.class,
    );
    if (hit) return hit;
    // Default to Sch 40 only when the UI did not supply a schedule (tools
    // without a schedule control). If sch is set but unmatched (e.g. Sch 10
    // outside the Pattern B SCH_SPECS list), return undefined so url-sync
    // drops the stale /…/4-inch-sch-40 path instead of advertising Sch 40.
    if (!sch) {
      const sch40 = routes.find(
        (route) => route.query.nps === nps && route.query.sch === "40",
      );
      if (sch40) return sch40;
    }
  }
  return undefined;
}

function humanNps(nps: string): string {
  return `${nps} Inch`;
}

function humanSch(sch: string): string {
  return `Schedule ${sch}`;
}

function humanClass(cls: string): string {
  return `Class ${cls}`;
}

/**
 * Long-tail title / description / headings for programmatic SEO pages.
 */
export function buildSpecSeoCopy(
  calculatorTitle: string,
  calculatorType: CalculatorType | undefined,
  route: SpecRoute,
  metaDescription?: string | null,
): SpecSeoCopy {
  const q = route.query;
  const brand = "FieldEngineersKit";
  const shortTitle = calculatorTitle.replace(/\s+Calculator$/i, "").trim();

  if (q.bolts) {
    const count = q.bolts;
    const mode = q.pattern === "circular" ? "Circular" : "Star";
    const focus = `${count}-Bolt ${mode} Pattern`;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Interactive ASME PCC-1 ${mode.toLowerCase()} tightening sequence for a ${count}-bolt flange circle.`;
    return {
      title,
      description,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} sequence & PCC-1 rounds`,
    };
  }

  if (q.bnps && q.hnps) {
    const focus = route.label;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Pipe coping / branch cut layout template for ${focus} with unwrapped ordinate marking table (ASME B31.3 fabrication screening).`;
    return {
      title,
      description,
      // Page H1 stays the clean tool name; focus lives in <title> + Spec panel.
      h1: shortTitle,
      h2: "Branch Cut Layout Summary",
    };
  }

  if (
    q.material &&
    THERMAL_EXPANSION_PSEO_MATERIALS.includes(q.material as ExpansionMaterial) &&
    q.nps &&
    q.sch
  ) {
    const focus = route.label;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `ASME B31.3 thermal expansion ΔL, expansion loop H/W, and F_anchor screening for ${focus}.`;
    return {
      title,
      description,
      h1: shortTitle,
      h2: "Expansion & Anchor Load Summary",
    };
  }

  if (q.pt && q.vol) {
    const focus = route.label;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `ASME PCC-2 Article 501 pneumatic test safety distance for ${focus} (stored-energy exclusion radius screening).`;
    return {
      title,
      description,
      h1: shortTitle,
      h2: "Pneumatic Safety Distance Summary",
    };
  }

  if (q.fluid && q.temp && q.arr && q.hs) {
    const focus = route.label;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Pump NPSHa / cavitation margin screening for ${focus} (HI 9.6.1 · ASME B73.1 · API 610).`;
    return {
      title,
      description,
      h1: shortTitle,
      h2: "NPSH & Cavitation Summary",
    };
  }

  if (q.fluid && q.q && q.hs && q.hf && q.qunit) {
    const focus = route.label;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Pump TDH and brake power screening for ${focus} (HI 14.3 · BHP = Q·TDH·SG/(3960·η)).`;
    return {
      title,
      description,
      h1: shortTitle,
      h2: "TDH & Pump Power Summary",
    };
  }

  if (q.mode && (q.n1 || q.d1) && q.q) {
    const focus = route.label;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Pump affinity / impeller trim screening for ${focus} (Q∝ND, H∝(ND)², P∝(ND)³).`;
    return {
      title,
      description,
      h1: shortTitle,
      h2: "Affinity & Impeller Trim Summary",
    };
  }

  if (q.fluid && q.q && q.hso && q.pwr) {
    const focus = route.label;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Pump MCSF / thermal min-flow screening for ${focus} (API 610 · HI 9.6.1).`;
    return {
      title,
      description,
      h1: shortTitle,
      h2: "MCSF & Thermal Protection Summary",
    };
  }

  if (
    (q.mode === "parallel" || q.mode === "series") &&
    q.n &&
    q.q &&
    q.hso &&
    q.hr
  ) {
    const focus = route.label;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Parallel / series pump–system curve intersection for ${focus} (HI 14.3).`;
    return {
      title,
      description,
      h1: shortTitle,
      h2: "Parallel & Series Pump Summary",
    };
  }

  if (q.insulationThickness && q.nps && q.material) {
    const focus = route.label;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Pipe insulation thickness and heat-loss screening for ${focus} (surface temperature, Q, and personnel-touch check).`;
    return {
      title,
      description,
      h1: shortTitle,
      h2: "Insulation Heat Loss Summary",
    };
  }

  if (q.orientation && q.headType && q.diameter && q.length) {
    const focus = route.label;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Tank and pressure-vessel liquid volume / fill% screening for ${focus} (ASME vessel geometry).`;
    return {
      title,
      description,
      h1: shortTitle,
      h2: "Tank & Vessel Volume Summary",
    };
  }

  if (q.nps && q.sch) {
    const size = humanNps(q.nps);
    const schedule = humanSch(q.sch);
    const focus = `${size} ${schedule}`;
    const title = `${shortTitle} for ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Calculate ${shortTitle.toLowerCase()} for ${focus} pipe with verified ASME/API screening formulas.`;
    return {
      title,
      description,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} specification summary`,
    };
  }

  if (q.nps && q.class && q.facing) {
    const size = humanNps(q.nps);
    const cls = humanClass(q.class);
    const face = String(q.facing).toUpperCase();
    const focus = `${size} ${cls} ${face}`;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `ASME B16.5 / B18.2.2 heavy-hex wrench AF, stud diameter, bolt count, and stud length for ${focus}.`;
    return {
      title,
      description,
      h1: shortTitle,
      h2: "Bolt & Wrench Size Summary",
    };
  }

  if (q.nps && q.class) {
    const size = humanNps(q.nps);
    const cls = humanClass(q.class);
    const focus = `${size} ${cls}`;
    const title = `${shortTitle} for ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `Look up ${shortTitle.toLowerCase()} for ${focus} per ASME B16 dimensional tables.`;
    return {
      title,
      description,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} specification summary`,
    };
  }

  if (q.fluid) {
    const focus = q.fluid === "gas" ? "Gas Service" : "Liquid Service";
    return {
      title: `${shortTitle} — ${focus} | ${brand}`,
      description:
        metaDescription ??
        `${shortTitle} screening for ${focus.toLowerCase()} with ISA/IEC flow equations.`,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} calculation inputs`,
    };
  }

  if (q.material) {
    const focus = route.label;
    if (calculatorType === "alloy-weight") {
      return {
        title: `${shortTitle} — ${focus} | ${brand}`,
        description:
          metaDescription ??
          `${focus} plate, pipe, and bar weight from catalog density for MTO / procurement screening.`,
        h1: `${shortTitle} — ${focus}`,
        h2: "Material Weight & Cost Summary",
      };
    }
    return {
      title: `${shortTitle} — ${focus} | ${brand}`,
      description:
        metaDescription ??
        `${shortTitle} for ${focus} stock with density-based mass and cost screening.`,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} material summary`,
    };
  }

  if (q.geometryType && q.purgeMethod) {
    const focus = route.label;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `NFPA 69 nitrogen purging / inerting volume for ${focus.toLowerCase()} with dilution or pressure-cycle screening.`;
    const clipped =
      description.length > 160
        ? `${description.slice(0, 157).trimEnd()}…`
        : description;
    return {
      title,
      description: clipped,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} purge duty summary`,
    };
  }

  if (q.materialGroup && q.flangeClass) {
    const focus = route.label;
    const title = `${shortTitle} — ${focus} | ${brand}`;
    const description =
      metaDescription != null && metaDescription.length > 0
        ? `${focus}: ${metaDescription}`
        : `ASME B16.5 flange pressure-temperature rating MAWP for ${focus} with linear interpolation between table nodes.`;
    const clipped =
      description.length > 160
        ? `${description.slice(0, 157).trimEnd()}…`
        : description;
    return {
      title,
      description: clipped,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} P-T rating summary`,
    };
  }

  if (q.cat || q.category) {
    const focus = route.label;
    return {
      title: `${shortTitle} — ${focus} Units | ${brand}`,
      description:
        metaDescription ??
        `Convert ${focus.toLowerCase()} engineering units instantly with FieldEngineersKit.`,
      h1: `${shortTitle} — ${focus}`,
      h2: `${focus} conversion presets`,
    };
  }

  void calculatorType;
  return {
    title: `${route.label} ${shortTitle} | ${brand}`,
    description:
      metaDescription ??
      `${route.label} calculation and reference data for ${shortTitle}.`,
    h1: `${route.label} · ${shortTitle}`,
    h2: `${route.label} specification summary`,
  };
}

export type { SpecFactRow } from "@/lib/calculators/spec-fact-rows";
export { buildSpecFactRows } from "@/lib/calculators/spec-fact-rows";
