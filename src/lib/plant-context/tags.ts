import type { CalculatorType } from "@/lib/calculators/definitions";
import type { Calculator } from "@/lib/calculators/types";
import {
  plantContextLabel,
  type PlantContext,
  type PlantContextKey,
  buildCalculatorHref,
} from "@/lib/plant-context/dictionary";

export const CALCULATOR_TYPE_SLUG: Record<CalculatorType, string> = {
  "pipe-thickness": "pipe-wall-thickness",
  "pipe-schedule": "pipe-schedule-dimension",
  "flange-dimension": "flange-dimension-weight",
  "fitting-valve-dimension": "fitting-valve-dimension",
  "butt-weld-fitting": "butt-weld-fitting-dimension",
  "bolt-torque": "bolt-torque-tensioning",
  "bolt-sequence": "flange-bolt-tightening-sequence",
  "gasket-dimension": "gasket-dimension-selection",
  "hydro-test": "hydro-test-pressure",
  "blind-flange": "blind-flange-thickness",
  "valve-cv": "valve-cv-sizing",
  "metal-weight": "metal-weight-cost",
  "alloy-weight": "stainless-alloy-weight-density",
  "thermal-expansion": "thermal-expansion-loop",
  "pressure-drop": "pressure-drop-friction",
  "flow-velocity": "flow-velocity-erosion",
  "unit-converter": "unit-converter",
  "link-seal": "link-seal-penetration-sleeve",
  "pipe-coping": "pipe-coping-branch-cut-layout",
  "pneumatic-safety": "pneumatic-test-safety-distance",
  "pump-npsh": "pump-npsh-cavitation",
  "pump-tdh": "pump-tdh-power",
  "pump-affinity": "pump-affinity-trimming",
  "pump-mcsf": "pump-mcsf-thermal-protection",
  "multi-pump": "multiple-pump-parallel-series",
  "bolt-wrench-lookup": "flange-bolt-wrench-size-lookup",
  "insulation-heat-loss": "insulation-heat-loss",
  "tank-vessel-volume": "tank-vessel-volume",
  "nitrogen-purging-volume": "nitrogen-purging-volume",
  "flange-pressure-temperature-rating":
    "flange-pressure-temperature-rating",
  "flange-gasket-stress": "flange-gasket-stress",
  "pipe-branch-reinforcement": "pipe-branch-reinforcement",
  "water-thermodynamic-properties": "water-thermodynamic-properties",
  "noise-criterion": "noise-criterion",
  "pipe-slope-calculator": "pipe-slope-calculator",
  "piping-equivalent-length": "piping-equivalent-length",
  "control-valve-noise": "control-valve-noise",
  "orifice-plate-flow-meter": "orifice-plate-flow-meter",
  "darby-3k-fitting-loss": "darby-3k-fitting-loss",
  "steam-properties-iapws": "steam-properties-iapws",
  "pipe-support-span": "pipe-support-span",
  "control-valve-choked-screening": "control-valve-choked-screening",
  "psv-prv-screening": "psv-prv-screening",
  "natural-gas-z-density": "natural-gas-z-density",
  "heat-exchanger-lmtd-duty": "heat-exchanger-lmtd-duty",
  "compressor-polytropic-power": "compressor-polytropic-power",
  "api650-tank-shell-thickness": "api650-tank-shell-thickness",
  "olet-fitting-dimensions": "olet-fitting-dimensions",
  "pipe-steam-tracing-duty": "pipe-steam-tracing-duty",
  "socket-weld-threaded-fitting-dimension":
    "socket-weld-threaded-fitting-dimension",
  "pressure-vessel-head-thickness": "pressure-vessel-head-thickness",
  "pressure-vessel-nozzle-reinforcement":
    "pressure-vessel-nozzle-reinforcement",
  "bearing-life-l10h": "bearing-life-l10h",
  "lifting-lug-rigging-capacity": "lifting-lug-rigging-capacity",
  "steam-turbine-power-ssc": "steam-turbine-power-ssc",
  "shaft-torque-key-sizing": "shaft-torque-key-sizing",
  "api2000-tank-venting": "api2000-tank-venting",
  "valve-wall-thickness-rating": "valve-wall-thickness-rating",
  "psv-reaction-force": "psv-reaction-force",
  "non-metallic-gasket-b1621": "non-metallic-gasket-b1621",
};

export const SLUG_TO_CALCULATOR_TYPE: Record<string, CalculatorType> =
  Object.fromEntries(
    Object.entries(CALCULATOR_TYPE_SLUG).map(([type, slug]) => [slug, type]),
  ) as Record<string, CalculatorType>;

export type CalculatorPlantTags = {
  consumes: PlantContextKey[];
  produces: PlantContextKey[];
};

export const CALCULATOR_PLANT_TAGS: Record<CalculatorType, CalculatorPlantTags> =
  {
    "pipe-thickness": {
      consumes: ["size", "pressure", "material"],
      produces: ["size", "pressure"],
    },
    "pipe-schedule": {
      consumes: ["size", "schedule"],
      produces: ["size", "schedule"],
    },
    "flange-dimension": {
      consumes: ["size", "class_rating", "schedule"],
      produces: ["size", "class_rating", "schedule"],
    },
    "fitting-valve-dimension": {
      consumes: ["size", "class_rating"],
      produces: ["size", "class_rating"],
    },
    "butt-weld-fitting": {
      consumes: ["size", "schedule"],
      produces: ["size", "schedule"],
    },
    "bolt-torque": {
      consumes: ["size", "class_rating"],
      produces: ["size", "class_rating"],
    },
    "bolt-sequence": {
      consumes: ["size", "class_rating"],
      produces: ["size", "class_rating"],
    },
    "gasket-dimension": {
      consumes: ["size", "class_rating"],
      produces: ["size", "class_rating"],
    },
    "flange-gasket-stress": {
      consumes: ["size", "class_rating", "pressure"],
      produces: ["size", "class_rating", "pressure"],
    },
    "hydro-test": {
      consumes: ["size", "pressure"],
      produces: ["size", "pressure"],
    },
    "blind-flange": {
      consumes: ["pressure", "class_rating"],
      produces: ["pressure"],
    },
    "valve-cv": {
      consumes: ["pressure", "temperature"],
      produces: ["pressure", "temperature"],
    },
    "metal-weight": {
      consumes: ["size", "schedule", "material"],
      produces: ["size", "schedule", "material"],
    },
    "alloy-weight": {
      consumes: ["material"],
      produces: ["material"],
    },
    "thermal-expansion": {
      consumes: ["size", "material", "temperature"],
      produces: ["size", "material", "temperature"],
    },
    "pressure-drop": {
      consumes: ["size", "schedule"],
      produces: ["size", "schedule"],
    },
    "flow-velocity": {
      consumes: ["size", "schedule"],
      produces: ["size", "schedule"],
    },
    "unit-converter": {
      consumes: [],
      produces: [],
    },
    "link-seal": {
      consumes: ["size"],
      produces: ["size"],
    },
    "pipe-coping": {
      consumes: ["size", "schedule"],
      produces: ["size", "schedule"],
    },
    "pneumatic-safety": {
      consumes: ["size", "schedule", "pressure"],
      produces: ["size", "schedule", "pressure"],
    },
    "pump-npsh": {
      consumes: ["temperature"],
      produces: ["temperature"],
    },
    "pump-tdh": {
      // Carry pipe size from Pressure Drop → enter Hf here; TDH itself does not invent size.
      consumes: ["size", "schedule"],
      produces: [],
    },
    "pump-affinity": {
      consumes: [],
      produces: [],
    },
    "pump-mcsf": {
      consumes: [],
      produces: [],
    },
    "multi-pump": {
      consumes: [],
      produces: [],
    },
    "bolt-wrench-lookup": {
      consumes: ["size", "class_rating"],
      produces: ["size", "class_rating"],
    },
    "insulation-heat-loss": {
      consumes: ["size", "temperature"],
      produces: ["size", "temperature"],
    },
    "tank-vessel-volume": {
      consumes: [],
      produces: [],
    },
    "nitrogen-purging-volume": {
      consumes: ["size"],
      produces: ["size"],
    },
    "flange-pressure-temperature-rating": {
      consumes: ["class_rating", "temperature", "material"],
      produces: ["class_rating", "temperature"],
    },
    "pipe-branch-reinforcement": {
      consumes: ["size", "schedule", "pressure"],
      produces: ["size", "schedule", "pressure"],
    },
    "water-thermodynamic-properties": {
      consumes: ["temperature", "pressure"],
      produces: ["temperature", "pressure"],
    },
    "noise-criterion": {
      consumes: [],
      produces: [],
    },
    "pipe-slope-calculator": {
      consumes: ["size"],
      produces: ["size"],
    },
    "piping-equivalent-length": {
      consumes: ["size", "schedule"],
      produces: ["size", "schedule"],
    },
    "control-valve-noise": {
      consumes: ["size", "schedule", "pressure", "temperature"],
      produces: ["size", "schedule", "pressure", "temperature"],
    },
    "orifice-plate-flow-meter": {
      consumes: ["size", "schedule"],
      produces: ["size", "schedule"],
    },
    "darby-3k-fitting-loss": {
      consumes: ["size", "schedule"],
      produces: ["size", "schedule"],
    },
    "steam-properties-iapws": {
      consumes: ["temperature", "pressure"],
      produces: ["temperature", "pressure"],
    },
    "pipe-support-span": {
      consumes: ["size", "schedule"],
      produces: ["size", "schedule"],
    },
    "control-valve-choked-screening": {
      consumes: ["pressure"],
      produces: ["pressure"],
    },
    "psv-prv-screening": {
      consumes: ["pressure", "temperature"],
      produces: ["pressure"],
    },
    "natural-gas-z-density": {
      consumes: ["pressure", "temperature"],
      produces: ["pressure", "temperature"],
    },
    "heat-exchanger-lmtd-duty": {
      consumes: ["temperature", "pressure"],
      produces: ["temperature"],
    },
    "compressor-polytropic-power": {
      consumes: ["pressure", "temperature"],
      produces: ["pressure", "temperature"],
    },
    "api650-tank-shell-thickness": {
      consumes: ["material"],
      produces: ["material"],
    },
    "olet-fitting-dimensions": {
      consumes: ["size", "material", "pressure"],
      produces: ["size", "material", "pressure"],
    },
    "pipe-steam-tracing-duty": {
      consumes: ["size", "temperature"],
      produces: ["size", "temperature"],
    },
    "socket-weld-threaded-fitting-dimension": {
      consumes: ["size", "class_rating"],
      produces: ["size", "class_rating"],
    },
    "pressure-vessel-head-thickness": {
      consumes: ["pressure", "temperature", "material"],
      produces: ["pressure", "temperature", "material"],
    },
    "pressure-vessel-nozzle-reinforcement": {
      consumes: ["size", "pressure", "temperature", "material"],
      produces: ["size", "pressure", "temperature", "material"],
    },
    "bearing-life-l10h": {
      consumes: [],
      produces: [],
    },
    "lifting-lug-rigging-capacity": {
      consumes: [],
      produces: [],
    },
    "steam-turbine-power-ssc": {
      consumes: [],
      produces: [],
    },
    "shaft-torque-key-sizing": {
      consumes: [],
      produces: [],
    },
    "api2000-tank-venting": {
      consumes: [],
      produces: [],
    },
    "valve-wall-thickness-rating": {
      consumes: ["size", "class_rating", "temperature", "pressure", "material"],
      produces: ["size", "class_rating", "temperature", "pressure"],
    },
    "psv-reaction-force": {
      consumes: ["size", "schedule", "temperature"],
      produces: ["size", "schedule", "temperature"],
    },
    "non-metallic-gasket-b1621": {
      consumes: ["size", "class_rating", "pressure"],
      produces: ["size", "class_rating", "pressure"],
    },
  };

export type NextAction = {
  slug: string;
  title: string;
  href: string;
  carry: string;
  overlap: PlantContextKey[];
};

function presentKeys(ctx: PlantContext): PlantContextKey[] {
  return (Object.keys(ctx) as PlantContextKey[]).filter((key) => {
    const value = ctx[key];
    return value !== undefined && value !== null && value !== "";
  });
}

export function getNextActions(
  currentType: CalculatorType,
  ctx: PlantContext,
  calculators: Pick<Calculator, "slug" | "title">[],
  limit = 3,
): NextAction[] {
  const available = presentKeys(ctx);
  const currentSlug = CALCULATOR_TYPE_SLUG[currentType];

  const ranked = calculators
    .map((calculator) => {
      const type = SLUG_TO_CALCULATOR_TYPE[calculator.slug];
      if (!type || calculator.slug === currentSlug) return null;
      const tags = CALCULATOR_PLANT_TAGS[type];
      if (!tags?.consumes?.length) return null;
      const overlap = tags.consumes.filter((key) => available.includes(key));
      if (overlap.length === 0) return null;
      return {
        slug: calculator.slug,
        title: calculator.title,
        href: buildCalculatorHref(calculator.slug, ctx, { carried: "1" }),
        carry: plantContextLabel(
          Object.fromEntries(
            overlap.map((key) => [key, ctx[key]]),
          ) as PlantContext,
        ),
        overlap,
      };
    })
    .filter((item): item is NextAction => Boolean(item))
    .sort((a, b) => b.overlap.length - a.overlap.length);

  return ranked.slice(0, limit);
}
