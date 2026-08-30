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
  "gasket-dimension": "gasket-dimension-selection",
  "hydro-test": "hydro-test-pressure",
  "blind-flange": "blind-flange-thickness",
  "valve-cv": "valve-cv-sizing",
  "metal-weight": "metal-weight-cost",
  "thermal-expansion": "thermal-expansion-loop",
  "pressure-drop": "pressure-drop-friction",
  "flow-velocity": "flow-velocity-erosion",
  "unit-converter": "unit-converter",
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
    "gasket-dimension": {
      consumes: ["size", "class_rating"],
      produces: ["size", "class_rating"],
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
