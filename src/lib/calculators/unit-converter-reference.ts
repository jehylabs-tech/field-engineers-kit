import type { UnitCategory } from "@/lib/units/engineering";

export type UnitConverterSeoVariable = {
  symbol: string;
  name: string;
  definition: string;
};

export type UnitConverterCategoryReference = {
  label: string;
  standards: string[];
  formulaHtml: string;
  formulaNotes: string;
  variables: UnitConverterSeoVariable[];
  tableCaption: string;
  tableHeaders: string[];
  tableRows: string[][];
  tableFootnote: string;
  howToSteps: { name: string; text: string }[];
  faq: { question: string; answer: string }[];
};

function fmt(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "—";
  const fixed = value.toFixed(digits);
  return fixed.replace(/\.?0+$/, "") || "0";
}

const PRESSURE_ROWS = [1, 5, 10, 20, 50, 100].map((bar) => [
  `${bar} bar`,
  fmt(bar * 14.5037738, 3),
  fmt(bar / 10, 2),
  fmt(bar * 1.01971621, 4),
]);

const DIMENSION_ROWS = [25.4, 100, 150, 300, 1000].map((mm) => [
  `${fmt(mm, 1)} mm`,
  fmt(mm / 25.4, 4),
  fmt(mm / 304.8, 4),
  fmt(mm / 1000, 4),
]);

const TEMPERATURE_ROWS = [0, 20, 100, 200, 400].map((c) => [
  `${c} °C`,
  fmt(c * 1.8 + 32, 1),
  fmt(c + 273.15, 2),
]);

const FLOW_ROWS = [1, 10, 50, 100, 200].map((m3h) => [
  `${m3h} m³/h`,
  fmt(m3h * 4.402867655, 2),
  fmt(m3h * (1000 / 60), 2),
]);

const TORQUE_ROWS = [10, 50, 100, 200, 500].map((nm) => [
  `${nm} N·m`,
  fmt(nm * 0.737562149, 3),
  fmt(nm / 9.80665, 4),
]);

const WEIGHT_ROWS = [1, 10, 50, 100, 1000].map((kg) => [
  `${kg} kg`,
  fmt(kg / 0.45359237, 3),
  fmt(kg / 1000, 3),
]);

const VELOCITY_ROWS = [1, 2, 3, 5, 10].map((ms) => [
  `${ms} m/s`,
  fmt(ms / 0.3048, 3),
  fmt(ms * 3.6, 2),
]);

/** Complete per-category reference payload for Unit Converter sections 1–4. */
export const UNIT_CONVERTER_CATEGORY_REFERENCE: Record<
  UnitCategory,
  UnitConverterCategoryReference
> = {
  pressure: {
    label: "Pressure",
    standards: ["ISO 80000-1", "NIST SI", "ASME B31.3 (process units)"],
    formulaHtml:
      '<p class="eng-eq"><i>P</i><sub>psi</sub> = <i>P</i><sub>bar</sub> × 14.5037738</p><p class="eng-plain">1 bar = 10⁵ Pa = 0.1 MPa = 1.019716 kgf/cm²</p>',
    formulaNotes:
      "Exact SI pressure factors. Plant gauges in SI regions are typically barg (gauge). 1 bar is defined as 10⁵ Pa — not 1 atm.",
    variables: [
      { symbol: "bar", name: "Bar", definition: "10⁵ Pa. Usually read as barg on plant gauges." },
      { symbol: "psi", name: "Pound-force per square inch", definition: "1 bar = 14.5037738 psi." },
      { symbol: "barg / bara", name: "Gauge vs absolute", definition: "bara ≈ barg + 1.01325 bar at sea level." },
    ],
    tableCaption: "Pressure quick reference — bar to psi, MPa, and kgf/cm²",
    tableHeaders: ["Input", "psi", "MPa", "kgf/cm²"],
    tableRows: PRESSURE_ROWS,
    tableFootnote:
      "1 bar = 14.5037738 psi = 0.1 MPa = 1.019716 kgf/cm². Screening values; use the live converter for other magnitudes.",
    howToSteps: [
      { name: "1. Select Pressure", text: "Keep category on Pressure so bar / psi / MPa / kgf/cm² / kPa share the same SI factor set." },
      { name: "2. Enter gauge reading", text: "Type the numeric value from the gauge or datasheet, then pick From / To units." },
      { name: "3. Confirm gauge vs absolute", text: "Most B31.3 design pressures are gauge. Do not mix barg and bara without adding atmosphere." },
      { name: "4. Copy or export", text: "Use the result card decimals (2–3 dp) for work-pack notes, then export if needed." },
    ],
    faq: [
      {
        question: "What is the difference between barg and bara?",
        answer:
          "barg is gauge pressure (above atmosphere). bara is absolute. Approximate: bara ≈ barg + 1.01325 bar at sea level.",
      },
      {
        question: "Why is 1 bar equal to 14.5038 psi?",
        answer:
          "1 bar = 100,000 Pa and 1 psi = 6,894.757 Pa, so 100000 / 6894.757 = 14.5037738. Field cards that use 14.5 are rounded.",
      },
      {
        question: "Is 1 bar the same as 1 atm?",
        answer:
          "No. 1 atm = 1.01325 bar. Always check whether the document uses bar or atm.",
      },
    ],
  },
  dimension: {
    label: "Dimension",
    standards: ["ISO 80000-1", "NIST SI", "ASME B36.10M (pipe OD context)"],
    formulaHtml:
      '<p class="eng-eq"><i>L</i><sub>mm</sub> = <i>L</i><sub>in</sub> × 25.4</p><p class="eng-plain">1 ft = 304.8 mm = 0.3048 m · exact inch definition</p>',
    formulaNotes:
      "Length uses the exact international inch (25.4 mm). Pipe NPS is dimensionless — convert OD/ID lengths here, not the NPS tag itself.",
    variables: [
      { symbol: "in", name: "Inch", definition: "Exactly 25.4 mm by international agreement." },
      { symbol: "ft", name: "Foot", definition: "Exactly 0.3048 m = 304.8 mm." },
      { symbol: "NPS", name: "Nominal pipe size", definition: "Size tag, not a measured diameter. Use B36.10M OD for geometry." },
    ],
    tableCaption: "Dimension quick reference — mm to in, ft, and m",
    tableHeaders: ["Input", "in", "ft", "m"],
    tableRows: DIMENSION_ROWS,
    tableFootnote: "1 in = 25.4 mm · 1 ft = 304.8 mm. Confirm facing and OD on vendor drawings for flanges.",
    howToSteps: [
      { name: "1. Select Dimension", text: "Use Dimension for length, OD, thickness, and face-to-face conversions." },
      { name: "2. Enter the measured length", text: "Prefer millimetres from the isometric when working SI." },
      { name: "3. Swap with ↔ if needed", text: "Flip From / To when converting an imperial print to metric." },
      { name: "4. Verify against the table", text: "Cross-check 25.4 mm = 1 in before issuing cut lists." },
    ],
    faq: [
      {
        question: "Is 1 inch exactly 25.4 mm?",
        answer:
          "Yes. The international inch is defined as exactly 25.4 mm. This converter uses that exact factor.",
      },
      {
        question: "Should I convert NPS 4 to 4.000 in?",
        answer:
          "No. NPS is a size designation. NPS 4 pipe OD is 114.3 mm (4.500 in) per ASME B36.10M, not 4.000 in.",
      },
      {
        question: "What is 1 foot in millimetres?",
        answer: "Exactly 304.8 mm (0.3048 m).",
      },
    ],
  },
  temperature: {
    label: "Temperature",
    standards: ["ISO 80000-1", "NIST SI", "ASME B31.3 (process units)"],
    formulaHtml:
      '<p class="eng-eq"><i>T</i><sub>°F</sub> = <i>T</i><sub>°C</sub> × 1.8 + 32</p><p class="eng-plain"><i>T</i><sub>K</sub> = <i>T</i><sub>°C</sub> + 273.15</p>',
    formulaNotes:
      "Temperature scales are affine — do not multiply °C by 1.8 alone when converting to °F. Absolute kelvin is required for ideal-gas ratios.",
    variables: [
      { symbol: "°C", name: "Celsius", definition: "Common plant and hydrotest report scale." },
      { symbol: "°F", name: "Fahrenheit", definition: "T_F = 1.8 T_C + 32." },
      { symbol: "K", name: "Kelvin", definition: "T_K = T_C + 273.15. Absolute scale." },
    ],
    tableCaption: "Temperature quick reference — °C to °F and K",
    tableHeaders: ["Input", "°F", "K"],
    tableRows: TEMPERATURE_ROWS,
    tableFootnote: "0 °C = 32 °F = 273.15 K. Record the scale printed on the thermometer.",
    howToSteps: [
      { name: "1. Select Temperature", text: "Use Temperature when converting between °C, °F, and K." },
      { name: "2. Enter the thermometer reading", text: "Match the scale printed on the instrument." },
      { name: "3. Convert explicitly", text: "Never mix °C and °F on the same pressure-temperature pair without converting." },
      { name: "4. Export with the work pack", text: "Keep the same scale on hydrotest and heat-trace notes." },
    ],
    faq: [
      {
        question: "What temperature scale should hydrotest reports use?",
        answer:
          "Record the scale printed on the thermometer (°C or °F) and convert explicitly. 0 °C = 32 °F = 273.15 K.",
      },
      {
        question: "How do I convert 100 °C to °F?",
        answer: "T_F = 100 × 1.8 + 32 = 212 °F.",
      },
      {
        question: "When must I use kelvin?",
        answer:
          "Use K for absolute-temperature ratios (gas laws, St/S style stress ratios with absolute T). Do not use °C offsets alone.",
      },
    ],
  },
  flow: {
    label: "Flow Rate",
    standards: ["ISO 80000-1", "NIST SI", "ASME B16.34 / ISA (Cv context)"],
    formulaHtml:
      '<p class="eng-eq">1 m³/h = 4.402867655 US GPM</p><p class="eng-eq"><i>ṁ</i> (kg/h) = <i>Q</i> (m³/h) × <i>ρ</i> (kg/m³)</p><p class="eng-plain">1 m³/h = 16.6667 L/min · density required for kg/h</p>',
    formulaNotes:
      "Volumetric flow uses exact US gallon factors. Mass flow (kg/h) needs density ρ. Default density is 1000 kg/m³ (water screening). Water at 20 °C is about 998 kg/m³.",
    variables: [
      { symbol: "Q", name: "Volumetric flow", definition: "m³/h, L/min, or US GPM." },
      { symbol: "ṁ", name: "Mass flow", definition: "kg/h = Q × ρ with Q in m³/h and ρ in kg/m³." },
      { symbol: "ρ", name: "Density", definition: "Required for kg/h ↔ volumetric. Enter the fluid density at flowing conditions." },
    ],
    tableCaption: "Flow quick reference — m³/h to US GPM and L/min (volumetric)",
    tableHeaders: ["Input", "GPM", "L/min"],
    tableRows: FLOW_ROWS,
    tableFootnote:
      "1 m³/h = 4.402867655 US GPM = 16.6667 L/min. For kg/h, set density in the converter (default 1000 kg/m³).",
    howToSteps: [
      { name: "1. Select Flow Rate", text: "Use Flow Rate for m³/h, L/min, GPM, and kg/h." },
      { name: "2. Enter the flow value", text: "Match the unit on the P&ID or pump curve." },
      { name: "3. Set density for mass flow", text: "When From or To is kg/h, enter ρ in kg/m³. Water ≈ 998–1000 kg/m³ near 20 °C." },
      { name: "4. Verify GPM basis", text: "Nameplates usually mean US gallon. Do not use UK Imperial gallon factors." },
    ],
    faq: [
      {
        question: "How do I convert m³/h to US GPM?",
        answer:
          "1 m³/h = 4.40287 US GPM (1 US gallon = 3.785411784 L). 50 m³/h ≈ 220.14 GPM.",
      },
      {
        question: "Why do I need density for kg/h?",
        answer:
          "kg/h is mass flow. Volumetric units need ρ: ṁ = Q × ρ with Q in m³/h. Wrong density scales the whole result.",
      },
      {
        question: "What density should I use for water?",
        answer:
          "Screening default is 1000 kg/m³. At ~20 °C use about 998 kg/m³ if the duty sheet is more precise.",
      },
    ],
  },
  torque: {
    label: "Torque",
    standards: ["ISO 80000-1", "NIST SI", "ASME PCC-1 (bolt torque context)"],
    formulaHtml:
      '<p class="eng-eq"><i>T</i><sub>ft·lb</sub> = <i>T</i><sub>N·m</sub> × 0.737562</p><p class="eng-eq">1 ft·lb = 1.355817948 N·m</p><p class="eng-plain">1 kgf·m = 9.80665 N·m · exact SI factors</p>',
    formulaNotes:
      "Torque conversions use exact SI and standard gravity (gₙ = 9.80665 m/s²) for kgf·m. Field cards that use 0.738 ft·lb/N·m are rounded.",
    variables: [
      { symbol: "N·m", name: "Newton-metre", definition: "SI torque. Preferred for PCC-1 assembly notes." },
      { symbol: "ft·lb", name: "Foot-pound", definition: "1 ft·lb = 1.355817948 N·m · T_ft·lb = T_N·m × 0.737562." },
      { symbol: "kgf·m", name: "Kilogram-force metre", definition: "1 kgf·m = 9.80665 N·m." },
    ],
    tableCaption: "Torque quick reference — N·m to ft·lb and kgf·m",
    tableHeaders: ["Input", "ft·lb", "kgf·m"],
    tableRows: TORQUE_ROWS,
    tableFootnote: "1 N·m = 0.737562 ft·lb = 0.101972 kgf·m. Confirm wrench units before pull-up.",
    howToSteps: [
      { name: "1. Select Torque", text: "Use Torque for N·m, ft·lb, and kgf·m assembly values." },
      { name: "2. Enter the target torque", text: "Prefer N·m from the PCC-1 / OEM sheet, then convert for the wrench scale." },
      { name: "3. Match wrench units", text: "Swap From / To so the display matches the torque wrench face." },
      { name: "4. Round for the field", text: "Use 2–3 decimal places on the result card; do not over-precision a click-type wrench." },
    ],
    faq: [
      {
        question: "Why is 1 ft·lb equal to 1.3558 N·m?",
        answer:
          "By definition 1 ft = 0.3048 m and 1 lbf = 4.4482216152605 N, so 1 ft·lbf = 1.3558179483314 N·m. This converter keeps the full factor.",
      },
      {
        question: "How do I convert N·m to ft·lb quickly?",
        answer:
          "Multiply by 0.737562 (or divide by 1.355818). Example: 100 N·m ≈ 73.756 ft·lb.",
      },
      {
        question: "Is kgf·m the same as N·m?",
        answer:
          "No. 1 kgf·m = 9.80665 N·m using standard gravity. Mixing them understates or overstates bolt load.",
      },
    ],
  },
  weight: {
    label: "Weight",
    standards: ["ISO 80000-1", "NIST SI", "OIML (mass context)"],
    formulaHtml:
      '<p class="eng-eq">1 lb = 0.45359237 kg</p><p class="eng-eq">1 t = 1000 kg</p><p class="eng-plain">Avoirdupois pound · metric tonne (not US short ton)</p>',
    formulaNotes:
      "Mass conversions use the avoirdupois pound and the metric tonne (1000 kg). Do not confuse metric t with the US short ton (2000 lb). Density is not required for kg ↔ lb ↔ t.",
    variables: [
      { symbol: "kg", name: "Kilogram", definition: "SI mass unit." },
      { symbol: "lb", name: "Pound (mass)", definition: "Exactly 0.45359237 kg." },
      { symbol: "t", name: "Metric tonne", definition: "Exactly 1000 kg. Not the US short ton." },
    ],
    tableCaption: "Weight / mass quick reference — kg to lb and metric ton",
    tableHeaders: ["Input", "lb", "ton (t)"],
    tableRows: WEIGHT_ROWS,
    tableFootnote: "1 lb = 0.45359237 kg · 1 t = 1000 kg. US short ton = 2000 lb ≈ 907.185 kg — not used here.",
    howToSteps: [
      { name: "1. Select Weight", text: "Use Weight for kg, lb, and metric tonne (t) mass conversions." },
      { name: "2. Enter the mass", text: "MTO and mill certs are usually in kg or lb." },
      { name: "3. Confirm tonne basis", text: "This tool’s ton is metric t = 1000 kg. Say “short ton” explicitly if the PO uses US tons." },
      { name: "4. Export for the PO", text: "Copy the rounded mass into the requisition line." },
    ],
    faq: [
      {
        question: "Is 1 ton the same as 1000 kg here?",
        answer:
          "Yes — metric tonne (t). A US short ton is 2000 lb ≈ 907.185 kg and is not the default in this converter.",
      },
      {
        question: "Do I need density for kg to lb?",
        answer:
          "No. kg ↔ lb ↔ t are pure mass factors. Density is only for Flow Rate mass/volume (kg/h).",
      },
      {
        question: "What is 1 lb in kilograms?",
        answer: "Exactly 0.45359237 kg by international avoirdupois definition.",
      },
    ],
  },
  velocity: {
    label: "Velocity",
    standards: ["ISO 80000-1", "NIST SI", "API RP 14E (erosion context)"],
    formulaHtml:
      '<p class="eng-eq">1 m/s = 3.280839895 ft/s = 3.6 km/h</p><p class="eng-plain">1 ft = 0.3048 m · exact international foot</p>',
    formulaNotes:
      "Velocity uses the exact foot (0.3048 m). km/h is shown in the lookup table for plant screening; the live converter focuses on m/s and ft/s.",
    variables: [
      { symbol: "m/s", name: "Metres per second", definition: "SI velocity. Typical liquid line speeds ~1–3 m/s." },
      { symbol: "ft/s", name: "Feet per second", definition: "1 m/s = 3.280839895 ft/s." },
      { symbol: "km/h", name: "Kilometres per hour", definition: "1 m/s = 3.6 km/h." },
    ],
    tableCaption: "Velocity quick reference — m/s to ft/s and km/h",
    tableHeaders: ["Input", "ft/s", "km/h"],
    tableRows: VELOCITY_ROWS,
    tableFootnote: "1 m/s = 3.28084 ft/s = 3.6 km/h. Compare process limits in the Flow Velocity calculator when screening erosion.",
    howToSteps: [
      { name: "1. Select Velocity", text: "Use Velocity for m/s ↔ ft/s line-speed checks." },
      { name: "2. Enter mean velocity", text: "From Q/A or the Flow Velocity tool." },
      { name: "3. Compare to site limits", text: "Many liquid services stay near 1–3 m/s; confirm against RP 14E / owner specs." },
      { name: "4. Export if needed", text: "Carry the same NPS and flow into the erosion / ΔP calculators." },
    ],
    faq: [
      {
        question: "How many ft/s is 1 m/s?",
        answer: "Exactly 1 / 0.3048 ≈ 3.28084 ft/s.",
      },
      {
        question: "How do I convert m/s to km/h?",
        answer: "Multiply by 3.6. Example: 2 m/s = 7.2 km/h.",
      },
      {
        question: "Is ft/s the same as fps on US datasheets?",
        answer: "Yes — feet per second. Use the exact 0.3048 m foot, not survey-foot variants.",
      },
    ],
  },
};

export function resolveUnitConverterCategory(
  value: string | null | undefined,
): UnitCategory {
  const allowed: UnitCategory[] = [
    "pressure",
    "dimension",
    "temperature",
    "flow",
    "torque",
    "weight",
    "velocity",
  ];
  if (value && (allowed as string[]).includes(value)) {
    return value as UnitCategory;
  }
  return "pressure";
}

export function getUnitConverterCategoryReference(
  category: UnitCategory,
): UnitConverterCategoryReference {
  return UNIT_CONVERTER_CATEGORY_REFERENCE[category];
}
