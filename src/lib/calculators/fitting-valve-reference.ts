/** Valve-focused SEO helpers for Fitting & Valve (B16.10). BW fittings use calculatorSeoData. */

export type FittingValveFaqItem = {
  question: string;
  answer: string;
};

export type FittingValveComponentKind =
  | "gate"
  | "globe"
  | "check"
  | "ball"
  | "butterfly";

const SHARED_FORMULA_HTML =
  '<p class="eng-eq">Valve face-to-face <i>L</i> — ASME B16.10 table (by NPS &amp; class)</p>' +
  '<p class="eng-plain">Flanged RF gate · globe · check · ball · butterfly screening</p>';

const SHARED_FORMULA_NOTES =
  "Flanged valve interchangeability follows ASME B16.10 face-to-face. " +
  "Butt-weld elbows, tees, reducers, and caps are in the separate Butt-Weld Fitting Dimensions calculator (ASME B16.9).";

const SHARED_VARIABLES = [
  {
    symbol: "L",
    name: "Face-to-face",
    definition:
      "RF flange sealing-face to sealing-face on flanged gate, globe, check, and ball valves (B16.10).",
  },
  {
    symbol: "Install",
    name: "Total installation length",
    definition:
      "FTF + optional gasket takeout (default 1.5 mm × 2 joints).",
  },
];

const FAQ_VALVE_GATE: FittingValveFaqItem = {
  question: "What is the face-to-face of a 4 inch Class 150 gate valve?",
  answer:
    "229 mm (9.00 in) for solid-wedge / double-disc flanged RF per ASME B16.10. Globe and swing check at the same NPS/class are 292 mm.",
};

const FAQ_VALVE_CLASS: FittingValveFaqItem = {
  question: "Are Class 300 face-to-face lengths the same as Class 150?",
  answer:
    "No. Class 300 gate NPS 4 is 305 mm (12.00 in). Never assume the Class 150 spool fits a Class 300 valve.",
};

const FAQ_GLOBE_CHECK: FittingValveFaqItem = {
  question: "Why are globe and swing-check longer than gate at the same class?",
  answer:
    "B16.10 assigns separate face-to-face series. At Class 150 NPS 4, gate is 229 mm while globe and swing check are 292 mm — plan the spool to the selected body type.",
};

const FAQ_BALL: FittingValveFaqItem = {
  question: "Is a flanged ball valve face-to-face the same as a gate?",
  answer:
    "Often close on common Class 150 sizes in this table, but always read the B16.10 / manufacturer row for the ball series — do not assume gate FTF without checking.",
};

const FAQ_BUTTERFLY: FittingValveFaqItem = {
  question: "Does B16.10 include wafer butterfly valves?",
  answer:
    "Wafer and lug butterflies are covered in other documents (e.g. API 609 / ISO 5752). This calculator’s butterfly rows are screening face-to-face values — confirm against the vendor GA.",
};

const FAQ_GASKET: FittingValveFaqItem = {
  question: "What is Total Installation Length?",
  answer:
    "Primary FTF plus optional gasket takeout (default 1.5 mm × 2 joints). Toggle the gasket option when laying out flanged spools.",
};

const FAQ_BW_POINTER: FittingValveFaqItem = {
  question: "Where do I look up butt-weld elbow and tee dimensions?",
  answer:
    "Use the Butt-Weld Fitting Dimensions calculator (ASME B16.9) for LR/SR elbows, tees, reducers, and caps.",
};

const KIND_FAQ_PRIORITY: Record<FittingValveComponentKind, FittingValveFaqItem[]> = {
  gate: [FAQ_VALVE_GATE, FAQ_VALVE_CLASS, FAQ_GASKET, FAQ_BUTTERFLY, FAQ_BW_POINTER],
  globe: [FAQ_GLOBE_CHECK, FAQ_VALVE_GATE, FAQ_VALVE_CLASS, FAQ_GASKET, FAQ_BW_POINTER],
  check: [FAQ_GLOBE_CHECK, FAQ_VALVE_GATE, FAQ_VALVE_CLASS, FAQ_GASKET, FAQ_BW_POINTER],
  ball: [FAQ_BALL, FAQ_VALVE_GATE, FAQ_VALVE_CLASS, FAQ_GASKET, FAQ_BW_POINTER],
  butterfly: [FAQ_BUTTERFLY, FAQ_VALVE_CLASS, FAQ_GASKET, FAQ_VALVE_GATE, FAQ_BW_POINTER],
};

export function resolveFittingValveComponentKind(
  componentId: string | null | undefined,
): FittingValveComponentKind {
  switch (componentId) {
    case "globe_valve":
      return "globe";
    case "check_valve":
      return "check";
    case "ball_valve":
      return "ball";
    case "butterfly_valve":
      return "butterfly";
    case "gate_valve":
    default:
      return "gate";
  }
}

export function getFittingValveCategoryReference(
  componentId: string | null | undefined,
) {
  const kind = resolveFittingValveComponentKind(componentId);
  return {
    kind,
    formulaHtml: SHARED_FORMULA_HTML,
    formulaNotes: SHARED_FORMULA_NOTES,
    variables: SHARED_VARIABLES,
    faq: KIND_FAQ_PRIORITY[kind],
  };
}

export const FITTING_VALVE_LOOKUP = {
  caption: "B16.10 Class 150 RF face-to-face (selected sizes)",
  headers: ["NPS", "Gate FTF (mm)", "Globe FTF (mm)", "Swing check (mm)", "Ball FTF (mm)"],
  rows: [
    ["2\"", "178", "203", "203", "178"],
    ["4\"", "229", "292", "292", "229"],
    ["6\"", "267", "406", "406", "267"],
    ["8\"", "292", "495", "495", "292"],
    ["10\"", "330", "622", "622", "330"],
    ["12\"", "356", "698", "698", "356"],
  ],
  footnote:
    "Gate/globe/check/ball from ASME B16.10 Class 150 flanged RF screening rows in this app.",
};

export const FITTING_VALVE_HOW_TO = [
  {
    name: "1. Select valve type",
    text: "Gate, globe, swing check, ball, or butterfly.",
  },
  {
    name: "2. Select NPS and class",
    text: "Class 150 or 300 for flanged RF bodies.",
  },
  {
    name: "3. Read face-to-face L",
    text: "Use L for spool fit-up. Optionally add gasket takeout for Total Installation Length.",
  },
  {
    name: "4. Verify and export",
    text: "Confirm against the vendor GA before field cut. Use Butt-Weld Fitting Dimensions for B16.9 elbows/tees.",
  },
];
