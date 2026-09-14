import {
  formatSequenceArrowText,
  generateBoltSequence,
} from "@/lib/calculators/engines/bolt-sequence";
import {
  expansionMaterialSeoLabel,
  THERMAL_EXPANSION_PSEO_MATERIALS,
  type ExpansionMaterial,
} from "@/lib/calculators/engines/thermal-expansion";
import { ALLOY_MATERIAL_BY_ID } from "@/lib/calculators/engines/alloy-weight";
import { getPipeScheduleEntry } from "@/lib/data/loaders";
import type { SpecRoute } from "@/lib/calculators/spec-route-types";

export type SpecFactRow = {
  label: string;
  value: string;
};

/**
 * Lightweight SpecRoute → fact table for SpecProgrammaticPanel.
 * Kept separate from spec-routes.ts so the client panel does not pull the
 * full pSEO route registry (avoids Turbopack SSR React dispatcher breakage).
 */
export function buildSpecFactRows(route: SpecRoute): SpecFactRow[] {
  const rows: SpecFactRow[] = [];
  const q = route.query;

  if (q.nps) {
    rows.push({ label: "Nominal pipe size (NPS)", value: `${q.nps}"` });
  }
  if (q.bolts) {
    rows.push({ label: "Bolt count", value: q.bolts });
  }
  if (q.hnps) {
    rows.push({ label: "Header NPS", value: `${q.hnps}"` });
  }
  if (q.bnps) {
    rows.push({ label: "Branch NPS", value: `${q.bnps}"` });
  }
  if (q.hsch) {
    rows.push({ label: "Schedule", value: `Sch ${q.hsch}` });
  }
  if (q.theta) {
    rows.push({ label: "Intersection angle θ", value: `${q.theta}°` });
  }
  if (q.pattern) {
    rows.push({
      label: "Pattern",
      value: q.pattern === "circular" ? "Circular" : "Star / cross",
    });
  }
  if (q.bolts && q.pattern) {
    const count = Number(q.bolts);
    if (Number.isFinite(count) && count >= 4) {
      const pattern = q.pattern === "circular" ? "circular" : "star";
      const seq = generateBoltSequence(count, pattern);
      if (seq.length === count) {
        rows.push({
          label: "Sequence",
          value: formatSequenceArrowText(seq),
        });
      }
    }
  }
  if (q.sch) {
    rows.push({ label: "Schedule", value: `Sch ${q.sch}` });
  }
  if (q.class) {
    rows.push({ label: "Pressure class", value: `Class ${q.class}` });
  }
  if (q.fluid) {
    rows.push({
      label: "Service fluid",
      value: q.fluid.charAt(0).toUpperCase() + q.fluid.slice(1),
    });
  }
  if (q.pt) {
    rows.push({
      label: "Test pressure",
      value: `${q.pt} ${q.units === "imperial" ? "psi" : "bar"} g`,
    });
  }
  if (q.vol) {
    rows.push({
      label: "Volume under test",
      value: `${q.vol} ${q.units === "imperial" ? "ft³" : "m³"}`,
    });
  }
  if (q.gas) {
    rows.push({
      label: "Test gas",
      value: q.gas.charAt(0).toUpperCase() + q.gas.slice(1),
    });
  }
  if (q.material) {
    const thermalHit = THERMAL_EXPANSION_PSEO_MATERIALS.includes(
      q.material as ExpansionMaterial,
    );
    rows.push({
      label: "Material",
      value: thermalHit
        ? expansionMaterialSeoLabel(q.material as ExpansionMaterial)
        : q.material.replace(/-/g, " "),
    });
    const alloy =
      ALLOY_MATERIAL_BY_ID[q.material as keyof typeof ALLOY_MATERIAL_BY_ID];
    if (alloy) {
      rows.push({
        label: "Density",
        value: `${alloy.densityKgM3} kg/m³ (${(alloy.densityKgM3 / 1000).toFixed(2)} g/cm³)`,
      });
    }
  }
  if (q.insulationThickness) {
    rows.push({
      label: "Insulation thickness",
      value: `${q.insulationThickness} ${q.units === "imperial" ? "in" : "mm"}`,
    });
  }
  if (q.orientation) {
    rows.push({
      label: "Orientation",
      value: q.orientation.charAt(0).toUpperCase() + q.orientation.slice(1),
    });
  }
  if (q.headType) {
    rows.push({
      label: "Head type",
      value: q.headType.replace(/-/g, " "),
    });
  }
  if (q.diameter) {
    rows.push({
      label: "Inside diameter Di",
      value: `${q.diameter} ${q.units === "imperial" ? "in" : "mm"}`,
    });
  }
  if (q.length && (q.orientation || q.headType)) {
    rows.push({
      label: "Shell length L",
      value: `${q.length} ${q.units === "imperial" ? "in" : "mm"}`,
    });
  }
  if (q.liquidLevel) {
    rows.push({
      label: "Liquid level h",
      value: `${q.liquidLevel} ${q.units === "imperial" ? "in" : "mm"}`,
    });
  }
  if (q.cat || q.category) {
    rows.push({ label: "Unit category", value: route.label });
    if (q.from && q.to) {
      rows.push({ label: "Default conversion", value: `${q.from} → ${q.to}` });
    }
  }

  if (q.nps && q.sch) {
    const entry = getPipeScheduleEntry(q.nps, q.sch);
    if (entry) {
      rows.push({
        label: "Outside diameter (OD)",
        value: `${entry.pipe.outsideDiameterMm.toFixed(2)} mm (${entry.pipe.outsideDiameterIn.toFixed(3)} in)`,
      });
      rows.push({
        label: "Wall thickness (t)",
        value: `${entry.row.wallThicknessMm.toFixed(2)} mm`,
      });
      rows.push({
        label: "Inside diameter (ID)",
        value: `${entry.row.insideDiameterMm.toFixed(2)} mm`,
      });
    }
  }

  return rows;
}

