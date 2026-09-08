import type {
  CalculatorOutput,
  ResultRow,
  UnitSystem,
} from "@/lib/calculators/definitions";
import {
  LINK_SEAL_ANNULAR_WARN_MAX_MM,
  LINK_SEAL_ANNULAR_WARN_MIN_MM,
  LINK_SEAL_HEAD_FT,
  LINK_SEAL_HEAD_M,
  LINK_SEAL_MODELS,
  LINK_SEAL_PRESSURE_BAR,
  LINK_SEAL_PRESSURE_MPA,
  LINK_SEAL_PRESSURE_PSIG,
  type LinkSealModelSpec,
} from "@/lib/calculators/engines/link-seal-catalog";

export type LinkSealOpeningType = "core_drilled" | "steel_sleeve";

export type LinkSealHardwareId = "C" | "S316" | "T";

export type LinkSealInputs = {
  unitSystem: UnitSystem;
  /** NPS token for OD autofill (e.g. "4"). Empty = manual OD only. */
  nps: string;
  /** Pipe outside diameter in the active unit system. */
  pipeOd: number;
  openingType: LinkSealOpeningType;
  /** Wall opening / sleeve inner diameter in the active unit system. */
  sleeveId: number;
  hardware: LinkSealHardwareId;
};

const HARDWARE_LABEL: Record<LinkSealHardwareId, string> = {
  C: "C — Carbon steel zinc-plated",
  S316: "S316 — Stainless steel 316",
  T: "T — Silicone high-temp elastomer",
};

const OPENING_LABEL: Record<LinkSealOpeningType, string> = {
  core_drilled: "Cast hole / core drilled",
  steel_sleeve: "Steel pipe sleeve",
};

function toMm(value: number, unitSystem: UnitSystem): number {
  if (!Number.isFinite(value)) return NaN;
  return unitSystem === "imperial" ? value * 25.4 : value;
}

function formatDim(mm: number, unitSystem: UnitSystem): string {
  if (!Number.isFinite(mm)) return "—";
  if (unitSystem === "imperial") {
    return `${(mm / 25.4).toFixed(3)} in`;
  }
  return `${mm.toFixed(1)} mm`;
}

/** Continuous-service screening rating — follows navbar metric/imperial. */
export function formatLinkSealPressureRating(unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") {
    return `${LINK_SEAL_PRESSURE_PSIG} psig (~${LINK_SEAL_HEAD_FT} ft head)`;
  }
  return `${LINK_SEAL_PRESSURE_MPA.toFixed(2)} MPa (${LINK_SEAL_PRESSURE_BAR.toFixed(2)} bar) · ${LINK_SEAL_HEAD_M.toFixed(1)} m H₂O`;
}

function formatAnnularWarnBounds(unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") {
    return `${(LINK_SEAL_ANNULAR_WARN_MIN_MM / 25.4).toFixed(3)}–${(LINK_SEAL_ANNULAR_WARN_MAX_MM / 25.4).toFixed(3)} in`;
  }
  return `${LINK_SEAL_ANNULAR_WARN_MIN_MM}–${LINK_SEAL_ANNULAR_WARN_MAX_MM} mm`;
}

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/** Pick model whose free thickness is slightly under C and C ∈ [min, max]. */
export function matchLinkSealModel(
  annularClearanceMm: number,
): LinkSealModelSpec | null {
  if (!Number.isFinite(annularClearanceMm) || annularClearanceMm <= 0) {
    return null;
  }
  const candidates = LINK_SEAL_MODELS.filter(
    (m) =>
      annularClearanceMm >= m.annularMinMm &&
      annularClearanceMm <= m.annularMaxMm &&
      m.freeThicknessMm <= annularClearanceMm + 0.5,
  );
  if (candidates.length === 0) return null;
  // Prefer free thickness closest to (but ≤) clearance.
  return [...candidates].sort((a, b) => {
    const da = Math.abs(annularClearanceMm - a.freeThicknessMm);
    const db = Math.abs(annularClearanceMm - b.freeThicknessMm);
    return da - db || b.freeThicknessMm - a.freeThicknessMm;
  })[0];
}

/** Nearest model when clearance is outside every envelope (for guidance only). */
export function nearestLinkSealModel(
  annularClearanceMm: number,
): LinkSealModelSpec | null {
  if (!Number.isFinite(annularClearanceMm) || annularClearanceMm <= 0) {
    return null;
  }
  return [...LINK_SEAL_MODELS].sort(
    (a, b) =>
      Math.abs(annularClearanceMm - a.freeThicknessMm) -
      Math.abs(annularClearanceMm - b.freeThicknessMm),
  )[0];
}

/**
 * Pitch diameter Dp = OD + 2·FT; N = round(π·Dp / belt width).
 * Minimum 3 links for a closed belt.
 */
export function linkSealLinkCount(
  pipeOdMm: number,
  model: LinkSealModelSpec,
): { pitchDiameterMm: number; linkCount: number } {
  const pitchDiameterMm = pipeOdMm + 2 * model.freeThicknessMm;
  const raw = (Math.PI * pitchDiameterMm) / model.beltWidthMm;
  const linkCount = Math.max(3, Math.round(raw));
  return { pitchDiameterMm, linkCount };
}

/** Ideal sleeve/hole ID that seats free thickness (C ≈ t_free). */
export function idealSleeveIdMm(
  pipeOdMm: number,
  model: LinkSealModelSpec,
): number {
  return Number((pipeOdMm + 2 * model.freeThicknessMm).toFixed(1));
}

/**
 * Default screening model by carrier OD — small pipes use LS-200/300;
 * mid NPS → LS-400; large OD → LS-500 class.
 */
export function defaultModelForPipeOdMm(pipeOdMm: number): LinkSealModelSpec {
  if (pipeOdMm < 50) {
    return LINK_SEAL_MODELS.find((m) => m.id === "LS-300") ?? LINK_SEAL_MODELS[1];
  }
  if (pipeOdMm < 100) {
    return LINK_SEAL_MODELS.find((m) => m.id === "LS-315") ?? LINK_SEAL_MODELS[2];
  }
  if (pipeOdMm < 220) {
    return LINK_SEAL_MODELS.find((m) => m.id === "LS-400") ?? LINK_SEAL_MODELS[3];
  }
  if (pipeOdMm < 350) {
    return LINK_SEAL_MODELS.find((m) => m.id === "LS-475") ?? LINK_SEAL_MODELS[5];
  }
  return LINK_SEAL_MODELS.find((m) => m.id === "LS-500") ?? LINK_SEAL_MODELS[6];
}

/** Display-unit sleeve ID for autofill after NPS / OD change. */
export function sleeveIdForUnitSystem(
  sleeveIdMm: number,
  unitSystem: UnitSystem,
): number {
  if (unitSystem === "imperial") {
    return Number((sleeveIdMm / 25.4).toFixed(3));
  }
  return Number(sleeveIdMm.toFixed(1));
}

export type LinkSealResult = {
  annularClearanceMm: number;
  model: LinkSealModelSpec | null;
  /** Nearest catalog model when `model` is null (guidance only). */
  nearestModel: LinkSealModelSpec | null;
  linkCount: number;
  pitchDiameterMm: number;
  recommendedSleeveIdMm: number;
  outOfRange: boolean;
  /** True when C is geometrically large vs pipe OD (stale / oversized hole). */
  oversizedAnnulus: boolean;
  hardwareSuffix: string;
  modelLabel: string;
};

export function computeLinkSeal(inputs: LinkSealInputs): LinkSealResult {
  const pipeOdMm = toMm(finite(inputs.pipeOd), inputs.unitSystem);
  const sleeveIdMm = toMm(finite(inputs.sleeveId), inputs.unitSystem);
  const annularClearanceMm = (sleeveIdMm - pipeOdMm) / 2;
  const model = matchLinkSealModel(annularClearanceMm);
  /** Stale NPS change often leaves a large hole on a small OD. */
  const oversizedAnnulus =
    Number.isFinite(annularClearanceMm) &&
    Number.isFinite(pipeOdMm) &&
    pipeOdMm > 0 &&
    annularClearanceMm > pipeOdMm * 0.75;
  /**
   * Guidance model when no chart match: for oversized holes prefer the
   * OD-class default (not nearest-by-C, which can pick LS-575 and suggest
   * an even larger sleeve).
   */
  const nearestModel =
    model ??
    (oversizedAnnulus
      ? defaultModelForPipeOdMm(pipeOdMm)
      : nearestLinkSealModel(annularClearanceMm));
  const guide = model ?? nearestModel;
  const { pitchDiameterMm, linkCount } = guide
    ? linkSealLinkCount(pipeOdMm, guide)
    : { pitchDiameterMm: NaN, linkCount: 0 };
  const recommendedSleeveIdMm = guide
    ? idealSleeveIdMm(pipeOdMm, guide)
    : NaN;
  const outOfRange =
    !Number.isFinite(annularClearanceMm) ||
    annularClearanceMm < LINK_SEAL_ANNULAR_WARN_MIN_MM ||
    annularClearanceMm > LINK_SEAL_ANNULAR_WARN_MAX_MM ||
    !model;
  const hardwareSuffix = inputs.hardware;
  const modelLabel = model
    ? `${model.id}-${hardwareSuffix}`
    : nearestModel
      ? `${nearestModel.id}-${hardwareSuffix}`
      : "—";

  return {
    annularClearanceMm,
    model,
    nearestModel,
    linkCount: model ? linkCount : nearestModel ? linkCount : 0,
    pitchDiameterMm: model ? pitchDiameterMm : nearestModel ? pitchDiameterMm : NaN,
    recommendedSleeveIdMm,
    outOfRange,
    oversizedAnnulus,
    hardwareSuffix,
    modelLabel,
  };
}

export function calculateLinkSeal(inputs: LinkSealInputs): CalculatorOutput {
  const result = computeLinkSeal(inputs);
  const pipeOdMm = toMm(finite(inputs.pipeOd), inputs.unitSystem);
  const sleeveIdMm = toMm(finite(inputs.sleeveId), inputs.unitSystem);
  const invalid =
    !Number.isFinite(pipeOdMm) ||
    !Number.isFinite(sleeveIdMm) ||
    pipeOdMm <= 0 ||
    sleeveIdMm <= pipeOdMm;

  if (invalid) {
    return {
      heroLabel: "Link-Seal selection",
      heroValue: "—",
      heroStatus: "Enter pipe OD and a sleeve / hole ID larger than the pipe OD",
      heroStatusLevel: "warn",
      summary: [
        { label: "Pipe OD", value: formatDim(pipeOdMm, inputs.unitSystem) },
        { label: "Sleeve / hole ID", value: formatDim(sleeveIdMm, inputs.unitSystem) },
      ],
      summaryStatus: {
        label: "Invalid geometry — sleeve ID must exceed pipe OD",
        level: "warn",
      },
      rows: [],
      exportRows: [],
    };
  }

  const model = result.model;
  const nearest = result.nearestModel;
  const guide = model ?? nearest;
  const heroValue = model
    ? `${result.modelLabel} × ${result.linkCount} Links`
    : nearest
      ? `Resize sleeve → ${nearest.id}`
      : "No standard model";
  const heroStatus = model
    ? `${OPENING_LABEL[inputs.openingType]} · C = ${formatDim(result.annularClearanceMm, inputs.unitSystem)}`
    : result.oversizedAnnulus
      ? `C = ${formatDim(result.annularClearanceMm, inputs.unitSystem)} is too large for this OD — sleeve/hole likely stale or oversized`
      : `C = ${formatDim(result.annularClearanceMm, inputs.unitSystem)} outside model envelope — resize sleeve or use Century-Line`;

  const dimRows: ResultRow[] = [
    {
      label: "Pipe outside diameter (OD)",
      value: formatDim(pipeOdMm, inputs.unitSystem),
      section: "Geometry",
      highlight: "od",
    },
    {
      label: "Wall opening / sleeve ID",
      value: formatDim(sleeveIdMm, inputs.unitSystem),
      section: "Geometry",
      highlight: "bore",
      warn: result.oversizedAnnulus,
    },
    {
      label: "Opening type",
      value: OPENING_LABEL[inputs.openingType],
      section: "Geometry",
    },
    {
      label: "Annular clearance (C)",
      value: formatDim(result.annularClearanceMm, inputs.unitSystem),
      section: "Geometry",
      emphasis: true,
      warn: result.outOfRange,
    },
  ];

  const sealRows: ResultRow[] = [
    {
      label: "Link-Seal model",
      value: model
        ? result.modelLabel
        : nearest
          ? `${nearest.id}-${inputs.hardware} (suggested after resize)`
          : "—",
      section: "Seal selection",
      emphasis: true,
      warn: !model,
    },
    {
      label: "Number of links (N)",
      value: guide && result.linkCount > 0 ? String(result.linkCount) : "—",
      section: "Seal selection",
      emphasis: true,
      warn: !model,
    },
    {
      label: "Hardware / elastomer",
      value: HARDWARE_LABEL[inputs.hardware],
      section: "Seal selection",
    },
    {
      label: "Free (unexpanded) thickness",
      value: guide
        ? formatDim(guide.freeThicknessMm, inputs.unitSystem)
        : "—",
      section: "Seal selection",
    },
    {
      label: "Belt width / link pitch",
      value: guide ? formatDim(guide.beltWidthMm, inputs.unitSystem) : "—",
      section: "Seal selection",
    },
    {
      label: "Expansion range (screening)",
      value: guide
        ? `${formatDim(guide.annularMinMm, inputs.unitSystem)} – ${formatDim(guide.annularMaxMm, inputs.unitSystem)}`
        : "—",
      section: "Seal selection",
    },
    {
      label: "Pitch diameter (Dp)",
      value: Number.isFinite(result.pitchDiameterMm)
        ? formatDim(result.pitchDiameterMm, inputs.unitSystem)
        : "—",
      section: "Seal selection",
    },
    {
      label: "Dp definition",
      value: "Link bolt / belt centerline (OD + 2·t_free)",
      section: "Seal selection",
    },
  ];

  const installRows: ResultRow[] = [
    {
      label: "Ideal minimum sleeve ID",
      value: Number.isFinite(result.recommendedSleeveIdMm)
        ? formatDim(result.recommendedSleeveIdMm, inputs.unitSystem)
        : "—",
      section: "Sleeve & rating",
      emphasis: !model,
      warn: !model,
    },
    {
      label: "Ideal ID basis",
      value: model
        ? "OD + 2·t_free (seats free thickness; C ≈ t_free)"
        : "Enter this sleeve ID (or close) to bring C into the suggested model range",
      section: "Sleeve & rating",
    },
    {
      label: "Pressure rating (screening)",
      value: formatLinkSealPressureRating(inputs.unitSystem),
      section: "Sleeve & rating",
    },
    {
      label: "Total belt thickness (free)",
      value: guide
        ? formatDim(guide.freeThicknessMm, inputs.unitSystem)
        : "—",
      section: "Sleeve & rating",
    },
  ];

  const callouts = !model
    ? [
        {
          tone: "warn" as const,
          title: result.oversizedAnnulus
            ? "Sleeve / hole ID is oversized for this pipe OD"
            : "Annular space outside standard Link-Seal envelope",
          body: result.oversizedAnnulus
            ? `Annular clearance C = ${formatDim(result.annularClearanceMm, inputs.unitSystem)} is far too large for this pipe OD (often a sleeve left over from a larger NPS). Set Sleeve ID to about ${Number.isFinite(result.recommendedSleeveIdMm) ? formatDim(result.recommendedSleeveIdMm, inputs.unitSystem) : "Ideal ID"} for ${nearest?.id ?? "a standard model"}, or use a Century-Line sleeve. Confirm the GPT chart before PO.`
            : `No catalog model seals C = ${formatDim(result.annularClearanceMm, inputs.unitSystem)} (screen window ${formatAnnularWarnBounds(inputs.unitSystem)}). ${nearest ? `Nearest model ${nearest.id} wants C ≈ ${formatDim(nearest.freeThicknessMm, inputs.unitSystem)} → Ideal sleeve ID ${formatDim(result.recommendedSleeveIdMm, inputs.unitSystem)}.` : ""} Resize the sleeve/core drill or use Century-Line.`,
        },
      ]
    : result.outOfRange
      ? [
          {
            tone: "warn" as const,
            title: "Annular space outside standard Link-Seal range",
            body: `Annular space is outside the standard Link-Seal screening window (${formatAnnularWarnBounds(inputs.unitSystem)}). Consider resizing the sleeve or using a Century-Line sleeve. Confirm against the current GPT Link-Seal sizing chart before procurement.`,
          },
        ]
      : [
          {
            tone: "info" as const,
            title: "Screening selection — verify before PO",
            body: "Model and link count are preliminary screening values. Pitch diameter (Dp) is the link-bolt centerline used for N; Ideal minimum sleeve ID is the bore that seats free thickness (OD + 2·t_free). Always verify against the current GPT Industries Link-Seal® chart. This tool is not affiliated with or endorsed by GPT Industries.",
          },
        ];

  return {
    heroLabel: "Link-Seal selection",
    heroValue,
    heroStatus,
    heroStatusLevel: model ? (result.outOfRange ? "warn" : "pass") : "fail",
    heroBadges: [
      {
        label: "C",
        value: formatDim(result.annularClearanceMm, inputs.unitSystem),
      },
      {
        label: "N",
        value: model ? String(result.linkCount) : "—",
      },
      {
        label: "Hw",
        value: inputs.hardware,
      },
    ],
    summary: [
      {
        label: "Model",
        value: model
          ? result.modelLabel
          : nearest
            ? `Try ${nearest.id}`
            : "—",
      },
      {
        label: "Links (N)",
        value: model ? String(result.linkCount) : "—",
      },
      {
        label: "Annular C",
        value: formatDim(result.annularClearanceMm, inputs.unitSystem),
      },
      {
        label: "Ideal sleeve ID",
        value: Number.isFinite(result.recommendedSleeveIdMm)
          ? formatDim(result.recommendedSleeveIdMm, inputs.unitSystem)
          : "—",
      },
    ],
    summaryStatus: {
      label: model
        ? `Up to ${formatLinkSealPressureRating(inputs.unitSystem)} · confirm GPT chart`
        : nearest
          ? `No match at this C — set sleeve ≈ ${formatDim(result.recommendedSleeveIdMm, inputs.unitSystem)} for ${nearest.id}`
          : "No matching Link-Seal model for this annular space",
      level: model ? "neutral" : "warn",
    },
    callouts,
    rows: [...dimRows, ...sealRows, ...installRows],
    exportRows: [
      { label: "Standard", value: "GPT Link-Seal modular mechanical seal (screening — independent tool)" },
      { label: "Pipe OD", value: formatDim(pipeOdMm, inputs.unitSystem) },
      { label: "Sleeve / hole ID", value: formatDim(sleeveIdMm, inputs.unitSystem) },
      { label: "Opening type", value: OPENING_LABEL[inputs.openingType] },
      {
        label: "Annular clearance C",
        value: formatDim(result.annularClearanceMm, inputs.unitSystem),
      },
      { label: "Model", value: model ? result.modelLabel : "—" },
      {
        label: "Suggested model (if resize)",
        value: nearest ? `${nearest.id}-${inputs.hardware}` : "—",
      },
      { label: "Links N", value: model ? String(result.linkCount) : "—" },
      { label: "Hardware", value: HARDWARE_LABEL[inputs.hardware] },
      {
        label: "Pitch diameter Dp (bolt centerline)",
        value: Number.isFinite(result.pitchDiameterMm)
          ? formatDim(result.pitchDiameterMm, inputs.unitSystem)
          : "—",
      },
      {
        label: "Ideal minimum sleeve ID",
        value: Number.isFinite(result.recommendedSleeveIdMm)
          ? formatDim(result.recommendedSleeveIdMm, inputs.unitSystem)
          : "—",
      },
      {
        label: "Pressure rating",
        value: formatLinkSealPressureRating(inputs.unitSystem),
      },
    ],
  };
}

export const DEFAULT_LINK_SEAL_INPUTS: LinkSealInputs = {
  unitSystem: "metric",
  nps: "4",
  pipeOd: 114.3,
  openingType: "steel_sleeve",
  sleeveId: 190,
  hardware: "C",
};

export const LINK_SEAL_HARDWARE_OPTIONS: {
  value: LinkSealHardwareId;
  label: string;
}[] = [
  { value: "C", label: "C — CS zinc" },
  { value: "S316", label: "S316 — SS316" },
  { value: "T", label: "T — Silicone HT" },
];

export const LINK_SEAL_OPENING_OPTIONS: {
  value: LinkSealOpeningType;
  label: string;
}[] = [
  { value: "core_drilled", label: "Cast / core drilled" },
  { value: "steel_sleeve", label: "Steel pipe sleeve" },
];

export { HARDWARE_LABEL, OPENING_LABEL };
