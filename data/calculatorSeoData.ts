export type SeoVariable = {
  symbol: string;
  name: string;
  definition: string;
};

export type SeoToleranceItem = {
  label: string;
  value?: string;
  description: string;
};

export type SeoAllowancesAndTolerances = {
  title?: string;
  summary: string;
  items: SeoToleranceItem[];
};

export type SeoMaterialLimitationItem = {
  materialGroup: string;
  temperatureLimit?: string;
  stressLimit?: string;
  notes: string;
};

export type SeoMaterialAndCodeLimitations = {
  title?: string;
  summary: string;
  items: SeoMaterialLimitationItem[];
  codeRestrictions?: string[];
};

export type SeoWorkedExampleStep = {
  step: string;
  name: string;
  formula?: string;
  calculation?: string;
  result?: string;
  note?: string;
};

export type SeoWorkedExample = {
  title: string;
  scenario: string;
  designConditions: { label: string; value: string }[];
  steps: SeoWorkedExampleStep[];
  conclusion?: string;
};

export type CalculatorSeoEntry = {
  slug: string;
  formulaTitle: string;
  formulaHtml: string;
  formulaLatex: string;
  formulaNotes: string;
  /** Optional scannable coefficient chips under the main formula.
   *  Use `value` for "label · value" chips, or omit `value` for a single mono string. */
  formulaBadges?: { label: string; value?: string }[];
  /** When true, every table column is numeric (right-align + tabular). */
  tableAllNumeric?: boolean;
  /** Soft blue highlight on the main formula box (Section 1). */
  formulaHighlight?: boolean;
  /** Column indexes whose cells are torque in N·m; follow navbar metric/imperial toggle. */
  tableTorqueNmColumns?: number[];
  /**
   * SI-stored numeric columns converted when navbar is imperial.
   * Prefer this over tableTorqueNmColumns for new calculators.
   */
  tableColumnUnits?: {
    index: number;
    quantity:
      | "flow"
      | "velocity"
      | "pressure"
      | "torque"
      | "density"
      | "length"
      | "lengthLarge"
      | "temperature";
    digits?: number;
  }[];
  /** Column indexes to render in bold for field scanning (e.g. required thickness). */
  tableBoldColumns?: number[];
  variables: SeoVariable[];
  standards: string[];
  tableCaption: string;
  tableHeaders: string[];
  tableRows: string[][];
  tableFootnote?: string;
  allowancesAndTolerances?: SeoAllowancesAndTolerances;
  materialLimitations?: SeoMaterialAndCodeLimitations;
  workedExample?: SeoWorkedExample;
  howToName: string;
  howToSteps: { name: string; text: string }[];
  /** FAQ answers may use **bold** markers for field-scan emphasis. */
  faq: { question: string; answer: string }[];
};

const BAR_TO_PSI = 14.5037738;
const BAR_TO_KGFCM2 = 1.01971621;

function tminMm(outsideDiameterMm: number, pMpa = 2, sMpa = 138, e = 1, y = 0.4) {
  return (pMpa * outsideDiameterMm) / (2 * (sMpa * e + pMpa * y));
}

function blindTmm(diameterMm: number, pMpa = 2.5, sMpa = 138, cMm = 3) {
  return diameterMm * Math.sqrt((0.3 * pMpa) / sMpa) + cMm;
}

const GPM_PER_M3H = 4.402867655;

function liquidCv(qM3h: number, dpBar: number) {
  return qM3h * GPM_PER_M3H * Math.sqrt(1 / (dpBar * BAR_TO_PSI));
}

function fmt(value: number, digits = 3) {
  return value.toFixed(digits);
}

const PRESSURE_LOOKUP_ROWS = [1, 5, 10, 20, 50, 100].map((bar) => [
  `${bar} bar`,
  fmt(bar * BAR_TO_PSI, 3),
  fmt(bar / 10, 2),
  fmt(bar * BAR_TO_KGFCM2, 4),
]);

const NPS_WALL = [
  { nps: '2"', od: 60.32, sch40: 3.91, sch80: 5.54 },
  { nps: '4"', od: 114.3, sch40: 6.02, sch80: 8.56 },
  { nps: '6"', od: 168.28, sch40: 7.11, sch80: 10.97 },
  { nps: '8"', od: 219.1, sch40: 8.18, sch80: 12.7 },
  { nps: '10"', od: 273.05, sch40: 9.27, sch80: 15.09 },
  { nps: '12"', od: 323.85, sch40: 10.31, sch80: 17.48 },
];

function howTo(
  title: string,
  steps: { name: string; text: string }[],
): Pick<CalculatorSeoEntry, "howToName" | "howToSteps"> {
  return { howToName: title, howToSteps: steps };
}

export const CALCULATOR_SEO: Record<string, CalculatorSeoEntry> = {
  "unit-converter": {
    slug: "unit-converter",
    formulaTitle: "Core Formula & Conversion Standards",
    formulaHtml:
      '<p class="eng-eq"><i>P</i><sub>psi</sub> = <i>P</i><sub>bar</sub> × 14.5037738 &nbsp;·&nbsp; <i>T</i><sub>°F</sub> = <i>T</i><sub>°C</sub> × 1.8 + 32 &nbsp;·&nbsp; <i>L</i><sub>mm</sub> = <i>L</i><sub>in</sub> × 25.4</p>' +
      '<p class="eng-eq">1 ft·lb = 1.355817948 N·m &nbsp;·&nbsp; 1 m³/h = 4.402867655 GPM &nbsp;·&nbsp; <i>ṁ</i> = <i>Q</i> × ρ</p>' +
      '<p class="eng-plain">ISO 80000-1 Quantities and Units &amp; NIST Special Publication 811 Guide for SI</p>',
    formulaLatex:
      "P_{\\text{psi}} = 14.5037738 \\cdot P_{\\text{bar}},\\quad T_{^{\\circ}\\text{F}} = 1.8 T_{^{\\circ}\\text{C}} + 32,\\quad L_{\\text{mm}} = 25.4 \\cdot L_{\\text{in}},\\quad 1\\text{ ft}\\cdot\\text{lb} = 1.355818\\text{ N}\\cdot\\text{m}",
    formulaNotes:
      "Precision engineering conversions follow ISO 80000-1 and NIST SP 811 authoritative standards. 1 bar is defined as exactly 100,000 Pa (100 kPa / 0.1 MPa). Exact standard inch-millimetre relationship is defined as 1 in = 25.4 mm (International Yard and Pound Agreement of 1959). Fluid volumetric and mass flow conversions use fluid density ρ at flowing reference temperature (default 1,000 kg/m³ for water).",
    formulaBadges: [
      { label: "1 bar", value: "14.5037738 psi (10⁵ Pa)" },
      { label: "1 inch", value: "25.4 mm (Exact)" },
      { label: "1 ft·lb", value: "1.355818 N·m" },
      { label: "1 m³/h", value: "4.402868 US GPM" },
    ],
    variables: [
      { symbol: "P", name: "Pressure Conversion", definition: "1 bar = 14.5037738 psi = 0.10 MPa = 100 kPa = 1.019716 kgf/cm²." },
      { symbol: "T", name: "Temperature Conversion", definition: "T(°F) = 1.8·T(°C) + 32; T(K) = T(°C) + 273.15; T(°R) = T(°F) + 459.67." },
      { symbol: "L", name: "Length / Dimension", definition: "1 inch = 25.4 mm (exact); 1 foot = 0.3048 m; 1 meter = 39.3700787 inches." },
      { symbol: "τ", name: "Torque Conversion", definition: "1 ft·lb = 1.355817948 N·m; 1 N·m = 0.737562149 ft·lb; 1 kgf·m = 9.80665 N·m." },
      { symbol: "Q / ṁ", name: "Volumetric & Mass Flow", definition: "1 m³/h = 4.402867655 US GPM; Mass flow ṁ (kg/h) = Q (m³/h) × ρ (kg/m³)." },
      { symbol: "ρ", name: "Fluid Reference Density", definition: "Density used for mass-to-volumetric flow rate translation (kg/m³ or lb/ft³)." },
    ],
    standards: [
      "ISO 80000-1 (Quantities and Units - General)",
      "NIST SP 811 (Guide for the Use of the International System of Units)",
      "ASME B31.3 / B16.5 (Engineering Units and Conversion Conventions)",
      "ASTM E380 / IEEE SI 10 (American National Standard for Metric Practice)",
    ],
    allowancesAndTolerances: {
      title: "Gauge vs Absolute Pressure, SI Tolerances & Significant Digits",
      summary:
        "Field engineering calculations require strict differentiation between gauge and absolute pressures, standard vs normal gas volumes, and preservation of significant digits.",
      items: [
        {
          label: "Gauge vs Absolute Pressure (barg vs bara)",
          value: "P_abs = P_gauge + P_atm (1.01325 bar / 14.696 psi)",
          description:
            "Pressure gauges read zero at atmospheric ambient. Thermodynamic gas calculations (ideal gas law, compressor sizing) require absolute pressure (bara / psia); hydraulic piping calculations use gauge pressure (barg / psig).",
        },
        {
          label: "Gas Flow Standard Reference Conditions",
          value: "Normal (Nm³/h @ 0 °C) vs Standard (Sm³/h / SCFM @ 15 °C or 60 °F)",
          description:
            "Normal m³/h (Nm³/h) is referenced to 0 °C (273.15 K) and 1.01325 bar abs per DIN/ISO. Standard m³/h (Sm³/h) is referenced to 15 °C (288.15 K) per ISO 13443. Standard Cubic Feet per Minute (SCFM) uses 60 °F and 14.696 psia.",
        },
        {
          label: "US Gallon vs UK Imperial Gallon",
          value: "1 US Gallon = 3.7854 L vs 1 UK Gal = 4.5461 L (+20.1%)",
          description:
            "American plant nameplates (GPM) refer to US gallons (231 in³ / 3.7854 L). UK / Commonwealth legacy documentation often cites Imperial gallons (4.5461 L); confusing the two leads to a 20.1% flow sizing error.",
        },
        {
          label: "Rounding & Significant Digit Practice",
          value: "Maintain 6 Digits in Engines, 2–3 in Reports",
          description:
            "All internal conversion arithmetic must use double-precision IEEE-754 factors. Final engineering deliverable reports round pressure to 1 decimal place (bar) or whole number (psi), and thickness to 2 decimal places (mm).",
        },
      ],
    },
    tableCaption: "Pressure quick reference — bar to psi, MPa, and kgf/cm²",
    tableHeaders: ["Input", "psi", "MPa", "kgf/cm²"],
    tableRows: PRESSURE_LOOKUP_ROWS,
    tableFootnote: "1 bar = 14.5037738 psi = 0.1 MPa = 1.019716 kgf/cm². Screening values; use the live converter for other magnitudes.",
    materialLimitations: {
      title: "Physical Property Conversions & Temperature Baselines",
      summary:
        "Unit conversions involving material properties (thermal expansion, elasticity, density) depend on physical temperature baselines and reference states.",
      items: [
        {
          materialGroup: "Stress & Elastic Modulus Units",
          temperatureLimit: "1 MPa = 1 N/mm² = 10 bar = 145.0377 psi = 0.145038 ksi",
          stressLimit: "Standard ASME Section II-D Conversion",
          notes: "SI structural stress is expressed in MPa (N/mm²); US customary is ksi (1,000 psi).",
        },
        {
          materialGroup: "Thermal Expansion Coefficient (α)",
          temperatureLimit: "1 × 10⁻⁶ /°C = 0.555556 × 10⁻⁶ /°F (Factor 5/9)",
          stressLimit: "Linear Thermal Strain Rate",
          notes: "Converting thermal expansion coefficients between °C and °F requires multiplying by 5/9 (1.8 inverse).",
        },
        {
          materialGroup: "Liquid Density vs Specific Gravity",
          temperatureLimit: "SG = ρ_fluid / ρ_water @ 4 °C (1,000 kg/m³ / 62.428 lb/ft³)",
          stressLimit: "Dimensionless Density Ratio",
          notes: "In pump hydraulic calculations, water density shifts from 1,000 kg/m³ (62.4 lb/ft³) at 4 °C to 998 kg/m³ (62.3 lb/ft³) at 20 °C and 958 kg/m³ (59.8 lb/ft³) at 100 °C.",
        },
        {
          materialGroup: "Energy, Power & Heat Rate",
          temperatureLimit: "1 kW = 1.341022 HP = 3,412.142 BTU/hr = 859.845 kcal/hr",
          stressLimit: "Equipment Mechanical Power",
          notes: "Pump brake horsepower (BHP) and heat exchanger duty conversions across international project consortiums.",
        },
      ],
      codeRestrictions: [
        "Prohibition of Dual-Unit Mixing in Governing Formulas: Never mix metric and imperial units within a single empirical code formula (e.g. ASME B31.3 wall thickness or API RP 14E erosion); convert all inputs to the formula's native unit system before evaluation.",
        "Absolute Zero Temperature Conversion: When performing thermodynamic gas volume or expansion calculations, always convert to absolute Rankine (°R = °F + 459.67) or Kelvin (K = °C + 273.15).",
        "Torque Wrench Scaling Verification: When calibrating pneumatic or hydraulic torque tools, verify whether torque charts cite N·m, ft·lb, or kgf·m to prevent over-torquing flange studs by 35% (1 ft·lb ≈ 1.356 N·m).",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Multi-Unit Process Data Sheet Conversion",
      scenario:
        "Convert an overseas piping data sheet for a high-pressure pump system: internal design pressure P = 35.0 bar gauge, design temperature T = 180.0 °C, volumetric flow rate Q = 150.0 m³/h (water at 180 °C, density ρ = 887.0 kg/m³), and stud bolt tightening torque τ = 450 N·m into US Customary engineering units (psig, °F, US GPM, lb/hr mass flow, and ft·lb torque).",
      designConditions: [
        { label: "Gauge Pressure (P)", value: "35.0 bar gauge (barg)" },
        { label: "Design Temperature (T)", value: "180.0 °C" },
        { label: "Volumetric Flow (Q)", value: "150.0 m³/h" },
        { label: "Fluid Density (ρ @ 180 °C)", value: "887.0 kg/m³ (Hot Boiler Feedwater)" },
        { label: "Bolt Assembly Torque (τ)", value: "450.0 N·m" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Convert Pressure from bar to psig",
          formula: "P_{\\text{psig}} = P_{\\text{bar}} · 14.5037738",
          calculation: "P_psig = 35.0 × 14.5037738 = 507.632 psi gauge.",
          result: "P = 507.6\\text{ psig} (3.50\\text{ MPa / 35.7 kgf/cm}^2)",
          note: "Standard Class 300 pressure range.",
        },
        {
          step: "Step 2",
          name: "Convert Temperature from °C to °F",
          formula: "T_{^{\\circ}\\text{F}} = T_{^{\\circ}\\text{C}} · 1.8 + 32",
          calculation: "T_°F = (180.0 × 1.8) + 32 = 324.0 + 32 = 356.0 °F (Absolute T = 453.15 K / 815.67 °R).",
          result: "T = 356.0\\text{ }^{\\circ}\\text{F}",
          note: "Exact conversion without rounding errors.",
        },
        {
          step: "Step 3",
          name: "Convert Volumetric Flow Rate from m³/h to US GPM",
          formula: "Q_{\\text{GPM}} = Q_{\\text{m}^3/\\text{h}} · 4.402867655",
          calculation: "Q_GPM = 150.0 × 4.402867655 = 660.430 US gpm.",
          result: "Q = 660.4\\text{ US GPM} (41.67\\text{ L/s})",
          note: "Based on 1 US gallon = 3.785411784 L.",
        },
        {
          step: "Step 4",
          name: "Calculate Mass Flow Rate in kg/h and Convert to lb/hr",
          formula: "\\dot{m}_{\\text{kg/h}} = Q · \\rho,\\quad \\dot{m}_{\\text{lb/hr}} = \\dot{m}_{\\text{kg/h}} · 2.20462262",
          calculation: "Mass flow = 150.0 m³/h × 887.0 kg/m³ = 133,050 kg/h. In US pounds: 133,050 × 2.20462262 = 293,325.04 lb/hr.",
          result: "\\dot{m} = 133,050\\text{ kg/h} = 293,325\\text{ lb/hr}",
          note: "Density at 180 °C (887 kg/m³) accounts for thermal liquid expansion.",
        },
        {
          step: "Step 5",
          name: "Convert Bolt Assembly Torque from N·m to ft·lb",
          formula: "\\tau_{\\text{ft}\\cdot\\text{lb}} = \\tau_{\\text{N}\\cdot\\text{m}} · 0.737562149",
          calculation: "τ_ft·lb = 450.0 × 0.737562149 = 331.903 ft·lb (or 450 / 1.355817948 = 331.903 ft·lb).",
          result: "\\tau = 331.9\\text{ ft}\\cdot\\text{lb} (45.89\\text{ kgf}\\cdot\\text{m})",
          note: "Directly dial into torque wrench calibration certificate.",
        },
      ],
      conclusion:
        "The converted process operating conditions are 507.6 psig design pressure, 356.0 °F design temperature, 660.4 US GPM volumetric flow (293,325 lb/hr mass flow), and 331.9 ft·lb stud bolt makeup torque, fully verified against ISO 80000-1 and NIST standards.",
    },
    ...howTo("How to convert plant engineering units", [
      { name: "1. Select category", text: "Choose pressure, dimension, temperature, flow, torque, weight, or velocity so the factor set matches the quantity." },
      { name: "2. Input value", text: "Enter the numeric reading from the gauge, isometric, or P&ID and pick the from/to units." },
      { name: "3. Set density when converting mass flow", text: "kg/h ↔ m³/h needs density. Water at 20 °C is about 998–1000 kg/m³." },
      { name: "4. Verify output and export PDF", text: "Confirm the result against this lookup table, then copy or export the conversion with the rest of the work pack." },
    ]),
    faq: [
      {
        question: "What is the exact physical difference between barg and bara?",
        answer:
          "**barg (bar gauge)** is the pressure relative to local atmospheric pressure (gauges read 0.0 at sea level). **bara (bar absolute)** is the total pressure relative to a perfect absolute vacuum (\\(P_{\\text{abs}} = P_{\\text{gauge}} + 1.01325\\text{ bar}\\) at sea level). Process piping design pressures on P&IDs and datasheets are almost universally **gauge pressures (barg / psig)**, while thermodynamic thermodynamic gas expansion formulas require **absolute pressures (bara / psia)**.",
      },
      {
        question: "Why is 1 bar equal to 14.5037738 psi rather than rounded 14.5 psi?",
        answer:
          "By international SI definition, **1 bar = 100,000 Pa (exact)** and **1 psi = 6,894.757293 Pa (exact)**. Dividing yields \\(100,000 / 6,894.757293 = 14.5037738...\\). Using the rounded shortcut **14.5 psi** introduces a **0.026% error**, which creates significant cumulative volume and custody transfer billing discrepancies in high-pressure gas headers (e.g. at 100 bar, 14.5 yields 1,450 psi instead of the true 1,450.38 psi).",
      },
      {
        question: "How does fluid temperature affect the conversion between m³/h and kg/h?",
        answer:
          "Volumetric flow rate \\(Q\\) and mass flow rate \\(\\dot{m}\\) are linked by fluid density (\\(\\dot{m} = Q \\times \\rho\\)). Water density is **1,000 kg/m³ at 4 °C**, but expands to **998.2 kg/m³ at 20 °C**, **958.4 kg/m³ at 100 °C**, and **887.0 kg/m³ at 180 °C**. Converting \\(100\\text{ m}^3/\\text{h}\\) of hot boiler feedwater at 180 °C produces **88,700 kg/h**, not 100,000 kg/h.",
      },
      {
        question: "Why is the US gallon different from the UK Imperial gallon?",
        answer:
          "A **US liquid gallon** is historically defined as **231 cubic inches = 3.785411784 liters**. A **UK Imperial gallon** is defined as the volume of 10 pounds of distilled water at 62 °F = **4.54609 liters**. A UK gallon is **20.1% larger** than a US gallon. Control valve and pump sizing datasheets from US manufacturers universally use US GPM.",
      },
    ],
  },

  "pipe-wall-thickness": {
    slug: "pipe-wall-thickness",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><i>t</i> = <span class="eng-frac"><span class="eng-num"><i>P</i> · <i>D</i></span><span class="eng-den">2(<i>S</i> · <i>E</i> + <i>P</i> · <i>Y</i>)</span></span></p>' +
      '<p class="eng-eq"><i>t</i><sub>min</sub> = <i>t</i> + <i>c</i></p>' +
      '<p class="eng-eq"><i>t</i><sub>nom,req</sub> = <i>t</i><sub>min</sub> / 0.875</p>' +
      '<p class="eng-plain">ASME B31.3 Para. 304.1.2(a) Eq. (3a) · Thin-wall pipe (t &lt; D/6) · mill under-tolerance −12.5%</p>',
    formulaLatex:
      "t = \\frac{P \\cdot D}{2(S \\cdot E + P \\cdot Y)},\\quad t_{\\min} = t + c,\\quad t_{\\mathrm{nom,req}} = t_{\\min}/0.875",
    formulaNotes:
      "Minimum required wall thickness for straight process pipe under internal design pressure follows ASME B31.3 paragraph 304.1.2(a) Equation (3a). For ferritic steels at or below 482 °C (900 °F), coefficient Y = 0.4. Pressure P and allowable stress S must share identical stress units (MPa or psi); outside diameter D, thickness t, and corrosion allowance c share length units (mm or in). This calculator labels B31.3 code symbol t_m as t_min for consistency with t_nom_req.",
    formulaBadges: [
      { label: "Y (Ferritic ≤ 482°C)", value: "0.4" },
      { label: "E (Seamless)", value: "1.00" },
      { label: "E (ERW)", value: "0.85" },
      { label: "Mill Tolerance", value: "-12.5%" },
    ],
    variables: [
      { symbol: "t", name: "Pressure design thickness", definition: "Net wall thickness required solely to resist internal design gauge pressure P (mm or in)." },
      { symbol: "c", name: "Corrosion / mechanical allowance", definition: "Sum of corrosion, erosion, and thread/groove allowances (Para. 304.1.1). Calculator defaults: 1.50 mm Metric or 0.063 in (1/16″ commercial) Imperial — not a pure unit conversion." },
      { symbol: "t_min", name: "Minimum required thickness (t + c)", definition: "Pressure design thickness plus allowances. Same quantity as ASME B31.3 notation t_m (mm or in)." },
      { symbol: "t_nom_req", name: "Required nominal purchase thickness", definition: "Ordered schedule wall after −12.5% mill under-tolerance: t_nom_req = t_min / 0.875. Safety margin compares t_actual to this value." },
      { symbol: "t_actual", name: "Selected schedule wall", definition: "Nominal wall of the chosen B36.10M / B36.19M schedule (mm or in)." },
      { symbol: "P", name: "Internal design pressure", definition: "Internal gauge design pressure from piping material specification (MPa or psi)." },
      { symbol: "D", name: "Outside diameter", definition: "Outside diameter per ASME B36.10M / B36.19M (not nominal pipe size NPS) in mm or in." },
      { symbol: "S", name: "Basic allowable stress", definition: "Allowable stress from ASME B31.3 Table A-1 at metal design temperature. Calculator binds A106 Gr.B ambient as 138 MPa / 20,000 psi (20.0 ksi)." },
      { symbol: "E", name: "Longitudinal weld joint quality factor", definition: "Quality factor per Table 302.3.4 (1.00 for Seamless, 0.85 for ERW, 0.60 for Furnace Butt-Welded)." },
      { symbol: "Y", name: "Wall thickness coefficient", definition: "Geometry/material factor per Table 304.1.1 (0.4 for Ferritic/Austenitic steels at T ≤ 482 °C when t < D/6)." },
    ],
    standards: [
      "ASME B31.3 Para. 304.1.2",
      "ASME B36.10M",
      "ASTM A106 / A53 / API 5L",
      "ASME B31.3 Table A-1 & 302.3.4",
    ],
    allowancesAndTolerances: {
      title: "Manufacturing Tolerances & Design Allowances",
      summary:
        "Per ASME B31.3 and ASTM specifications, the pressure design thickness (t) must be augmented by corrosion and mechanical allowances (c) to obtain t_min = t + c. Before selecting a commercial schedule, apply mill under-tolerance so the finished pipe never falls below t_min: order t_actual ≥ t_nom_req = t_min / 0.875.",
      items: [
        {
          label: "Mill Under-Tolerance (ASTM A106 / A53)",
          value: "-12.5%",
          description:
            "Seamless and welded steel pipe manufacturing standards permit up to a 12.5% reduction below nominal wall thickness during fabrication. The ordered nominal schedule wall must satisfy: t_nom_req = t_min / 0.875 (i.e. t_actual ≥ t_min / 0.875).",
        },
        {
          label: "Corrosion Allowance (CA)",
          value: "1.5 ~ 3.0 mm",
          description:
            "Specified in project Piping Material Specifications (PMS). Typical values: 1.5 mm for dry hydrocarbons/utilities, 3.0 mm for corrosive wet gas/produced water, and 0.0 mm for corrosion-resistant stainless alloys. Imperial calculator default uses 0.063 in (1/16″ ≈ 1.59 mm), not exact 1.50÷25.4 ≈ 0.059 in.",
        },
        {
          label: "Mechanical / Threading Allowance",
          value: "ASME B1.20.1",
          description:
            "For male threaded pipe connections, thread root depth must be included in allowance c (typically ~1.5 mm for NPS ≤ 2). Grooved couplings require allowance equal to cut groove depth.",
        },
        {
          label: "Structural Minimum Wall",
          value: "Span / Rigidity Cap",
          description:
            "Small calculated t_min values for low pressure lines may lack sufficient structural stiffness. Pipe must maintain adequate wall thickness to prevent deflection and vibration across support spans.",
        },
      ],
    },
    tableCaption:
      "B31.3 t (pressure design) at 20 bar (2.0 MPa), A106 Gr.B, S = 138 MPa, E = 1, Y = 0.4, c = 0 vs Sch 40 / Sch 80 mill wall",
    tableHeaders: ["NPS", "OD (mm)", "t (mm)", "Sch 40 t (mm)", "Sch 80 t (mm)"],
    tableRows: NPS_WALL.map((row) => [
      row.nps,
      fmt(row.od, 2),
      fmt(tminMm(row.od), 3),
      fmt(row.sch40, 2),
      fmt(row.sch80, 2),
    ]),
    tableColumnUnits: [
      { index: 1, quantity: "length", digits: 3 },
      { index: 2, quantity: "length", digits: 3 },
      { index: 3, quantity: "length", digits: 3 },
      { index: 4, quantity: "length", digits: 3 },
    ],
    tableFootnote:
      "OD from ASME B36.10M. Column t is pressure design thickness only (c = 0). Add CA and divide by 0.875 before schedule selection. NPS 12 Sch 40/80 walls are handbook values (10.31 / 17.48 mm).",
    materialLimitations: {
      title: "Material Specifications & Temperature Derating",
      summary:
        "Allowable stress S is strongly temperature-dependent. As metal temperature increases, allowable stress derates significantly according to ASME B31.3 Table A-1.",
      items: [
        {
          materialGroup: "ASTM A106 Gr. B (Carbon Steel)",
          temperatureLimit: "-29 °C to 427 °C (-20 °F to 800 °F)",
          stressLimit: "138 MPa (20.0 ksi / 20,000 psi) @ ≤204 °C → ~103 MPa @ 400 °C",
          notes: "Primary material for non-corrosive hydrocarbons and steam. Graphitization risk occurs above 427 °C under long-term exposure. Calculator ambient preset matches Table A-1 20.0 ksi as 138 MPa / 20,000 psi.",
        },
        {
          materialGroup: "ASTM A333 Gr. 6 (Low-Temp Carbon Steel)",
          temperatureLimit: "-45 °C to 427 °C (-50 °F to 800 °F)",
          stressLimit: "138 MPa (20.0 ksi / 20,000 psi) @ ≤204 °C",
          notes: "Charpy V-notch impact tested at -45 °C for cryogenic blowdown, flare headers, and cold ambient services.",
        },
        {
          materialGroup: "ASTM A312 TP304L (Austenitic SS)",
          temperatureLimit: "-196 °C to 427 °C (-320 °F to 800 °F)",
          stressLimit: "115 MPa (16.7 ksi) @ ≤38 °C → ~79 MPa @ 300 °C",
          notes: "Low-carbon austenitic stainless steel for corrosive chemical media. Lower yield strength than carbon steel at ambient temperature.",
        },
        {
          materialGroup: "ASTM A312 TP316L (Austenitic SS)",
          temperatureLimit: "-196 °C to 450 °C (-320 °F to 842 °F)",
          stressLimit: "115 MPa (16.7 ksi) @ ≤38 °C → ~82 MPa @ 300 °C",
          notes: "Molybdenum addition (2.0–3.0%) provides enhanced resistance to pitting and crevice corrosion in chloride-containing environments.",
        },
      ],
      codeRestrictions: [
        "Thin-Wall Formula Boundary: Valid only when t < D/6 and P/SE ≤ 0.385. For thick-wall high-pressure piping (e.g. LDPE, HP injection), Lamé thick-wall equations per B31.3 Para. 304.1.2(b) are mandatory.",
        "External Pressure / Vacuum: Internal pressure sizing does not protect against compressive elastic buckling. Piping under external pressure or vacuum must be analyzed per ASME BPVC Section VIII, Div 1, UG-28.",
        "Sustained & Cyclic Load Analysis: This calculation verifies only circumferential hoop stress from internal pressure. Longitudinal bending stresses from deadweight spans, thermal expansion, and seismic/slug dynamics must be verified per B31.3 Chapter II stress intensification rules.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Process Hydrocarbon Header",
      scenario:
        "Verify the minimum required wall thickness and select the required commercial pipe schedule for an NPS 6 hydrocarbon line operating at 3.50 MPa (35.0 bar) and 150 °C with 2.0 mm corrosion allowance using ASTM A106 Gr. B seamless pipe.",
      designConditions: [
        { label: "Nominal Size", value: "NPS 6 (OD = 168.28 mm)" },
        { label: "Design Pressure (P)", value: "3.50 MPa (35.0 bar / 508 psi)" },
        { label: "Design Temperature (T)", value: "150 °C (302 °F)" },
        { label: "Pipe Material", value: "ASTM A106 Gr. B Seamless" },
        { label: "Allowable Stress (S)", value: "138 MPa (20.0 ksi / 20,000 psi)" },
        { label: "Joint Quality (E)", value: "1.00 (Seamless)" },
        { label: "Corrosion Allowance (c)", value: "2.00 mm" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Determine Pipe Geometry and Material Factors",
          calculation: "Outside Diameter D = 168.28 mm (ASME B36.10M), S = 138 MPa (B31.3 Table A-1 binding used by calculator), E = 1.00 (Seamless), Y = 0.40 (Ferritic steel ≤ 482 °C)",
          result: "D = 168.28 mm, S = 138 MPa, E = 1.00, Y = 0.40",
          note: "Outside diameter is fixed by standard; coefficient Y = 0.4 applies to ductile ferritic steels under 482 °C.",
        },
        {
          step: "Step 2",
          name: "Calculate Pressure Design Wall Thickness (t)",
          formula: "t = (P · D) / [2 · (S · E + P · Y)]",
          calculation: "t = (3.50 × 168.28) / [2 × (138 × 1.00 + 3.50 × 0.40)] = 588.98 / [2 × (138 + 1.40)] = 588.98 / 278.80",
          result: "t = 2.113 mm",
          note: "This represents the net wall thickness required strictly to contain internal hoop pressure.",
        },
        {
          step: "Step 3",
          name: "Calculate Minimum Required Thickness (t_min) with Corrosion Allowance",
          formula: "t_min = t + c",
          calculation: "t_min = 2.113 mm + 2.000 mm",
          result: "t_min = 4.113 mm",
          note: "Minimum thickness threshold (B31.3 t_m) that the pipe wall must never fall below during operation.",
        },
        {
          step: "Step 4",
          name: "Apply Mill Under-Tolerance (−12.5%) for Nominal Purchase Wall",
          formula: "t_nom_req = t_min / 0.875",
          calculation: "t_nom_req = 4.113 mm / 0.875",
          result: "t_nom_req = 4.701 mm",
          note: "Commercial pipe must have a nominal thickness of at least 4.701 mm so that after −12.5% mill thinning, wall ≥ 4.113 mm.",
        },
        {
          step: "Step 5",
          name: "Select Commercial Schedule from ASME B36.10M & Verify Compliance",
          calculation: "ASME B36.10M NPS 6 standard schedules: Sch 40 (STD) nominal wall = 7.11 mm, min mill wall (0.875 × 7.11) = 6.22 mm vs Sch 80 (XS) nominal wall = 10.97 mm.",
          result: "Select NPS 6 Schedule 40 (STD, 7.11 mm nominal)",
          note: "Sch 40 t_actual (7.11 mm) ≥ t_nom_req (4.701 mm); min mill wall (6.22 mm) ≥ t_min (4.113 mm). Safety margin = (7.11 / 4.701 − 1) × 100% ≈ +51% vs t_nom_req.",
        },
      ],
      conclusion:
        "NPS 6 Schedule 40 (STD, 7.11 mm nominal wall) is fully code-compliant for 3.50 MPa at 150 °C with 2.0 mm corrosion allowance, providing a substantial safety buffer against pressure and external bending.",
    },
    ...howTo("How to check process pipe wall thickness", [
      { name: "1. Enter design pressure and outside diameter", text: "Use the line class P and B36.10M OD for the NPS (4 in Sch 40 OD is 114.3 mm, not 4.000 in)." },
      { name: "2. Set S, E, Y, and corrosion allowance", text: "A106 Gr.B ambient uses 138 MPa / 20,000 psi. Seamless E = 1. Add site CA (often 1.5–3 mm / 0.063 in)." },
      { name: "3. Compare t_nom_req with selected schedule wall", text: "PASS requires t_actual ≥ t_nom_req (= t_min / 0.875). Comparing only to t_min ignores mandatory mill under-tolerance." },
      { name: "4. Verify output and export PDF", text: "Carry the same NPS and pressure into hydrotest and flange tools, then export the work-pack PDF." },
    ]),
    faq: [
      {
        question: "Is ASME B31.3 t_min the same as ASME B31.1 Power Piping?",
        answer:
          "No. ASME B31.3 uses **t = PD / [2(SE + PY)]** where Y = 0.4 for ferritic steels. ASME B31.1 power piping formulas use different stress basis factors and weld strength reduction factors (W). Applying B31.1 equations to chemical process piping or vice versa without code verification can lead to non-compliant wall sizing.",
      },
      {
        question: "Why must mill under-tolerance (12.5%) be applied to nominal schedule selection?",
        answer:
          "ASTM manufacturing specifications (ASTM A106, A53, API 5L) permit seamless and ERW pipe to be fabricated up to **12.5% thinner** than nominal catalog wall. If you purchase pipe matching **t_min** exactly without dividing by 0.875, the delivered pipe wall could legally be thinner than code-required minimum wall. Always select schedule against **t_nom_req = t_min / 0.875**.",
      },
      {
        question: "Can this formula be used for vacuum lines or jacketed piping under external pressure?",
        answer:
          "**No**. Internal pressure failure is governed by tensile plastic yielding (hoop stress), whereas vacuum or external pressure piping fails by **elastic/plastic buckling (instability)** at much lower stresses. External pressure sizing must be performed using the strain-chart methodology in **ASME BPVC Section VIII, Division 1, Paragraph UG-28**.",
      },
      {
        question: "When does pipe transition from thin-wall to thick-wall Lamé equations in B31.3?",
        answer:
          "Per ASME B31.3 paragraph 304.1.2, this equation is valid when **t < D/6** and **P/SE ≤ 0.385**. When design pressure exceeds 0.385 × SE or thickness exceeds one-sixth of the outside diameter, stress distribution across the pipe wall becomes non-linear and thick-wall Lamé equations (Para. 304.1.2(b)) must be used.",
      },
    ],
  },

  "pipe-schedule-dimension": {
    slug: "pipe-schedule-dimension",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><i>ID</i> = <i>OD</i> − 2<i>t</i> &nbsp;·&nbsp; <i>W</i><sub>tot</sub> = <i>W</i><sub>m</sub> · <i>L</i> · <i>n</i></p>' +
      '<p class="eng-eq">Catalog: <i>W</i><sub>m</sub> ≈ 0.0246615 · <i>t</i> · (<i>OD</i> − <i>t</i>) &nbsp;(steel screening)</p>' +
      '<p class="eng-plain">ASME B36.10M / B36.19M pipe schedule lookup (this app)</p>',
    formulaLatex: "ID = OD - 2t,\\quad W_{tot} = W_m \\cdot L \\cdot n",
    formulaNotes:
      "This calculator looks up OD, t, ID, and unit mass W_m from the app pipeSchedule table (B36.10M carbon/alloy; B36.19M stainless S schedules). Hero is nominal wall thickness t. Optional MTO inputs L and n give W_tot = W_m × L × n (plain-end screening mass). NPS is dimensionless: for NPS ≤ 12, OD exceeds the nominal inch size; from NPS 14 upward OD equals the nominal inch. STD ≈ Sch 40 through NPS 10; XS ≈ Sch 80 through NPS 8 — above those sizes weight-class walls diverge.",
    formulaBadges: [
      { label: "Hero", value: "t (wall)" },
      { label: "ID", value: "OD − 2t" },
      { label: "W_tot", value: "W_m × L × n" },
      { label: "B36.19M", value: "5S / 10S / 40S / 80S" },
    ],
    variables: [
      { symbol: "NPS / DN", name: "Nominal Size", definition: "Dimensionless size tag (NPS inch designation; DN per ISO 6708)." },
      { symbol: "OD", name: "Outside Diameter", definition: "Standardized outside diameter from B36.10M / B36.19M (mm or in)." },
      { symbol: "t", name: "Nominal Wall Thickness", definition: "Hero output — catalog wall for the selected schedule (mm or in)." },
      { symbol: "ID", name: "Inside Diameter", definition: "Bore for flow: ID = OD − 2t (stored in the lookup row)." },
      { symbol: "W_m", name: "Unit Linear Mass", definition: "Plain-end mass per unit length (kg/m or lb/ft)." },
      { symbol: "W_tot", name: "Total Mass (MTO)", definition: "W_m × L × n for the entered length and piece count." },
    ],
    standards: [
      "ASME B36.10M (Welded and Seamless Wrought Steel Pipe)",
      "ASME B36.19M (Stainless Steel Pipe)",
      "ISO 6708 (DN Designation)",
      "ASTM A53 / A106 / A312 (material specs — not dimensional source for this lookup)",
    ],
    allowancesAndTolerances: {
      title: "Tolerances & Schedule Equivalence (This App)",
      summary:
        "Dimensions and W_m are screening lookups. Mill OD / wall under-tolerance and exact PO walls must still follow ASTM / project specs.",
      items: [
        {
          label: "Wall Under-Tolerance (typical ASTM)",
          value: "−12.5% of nominal t",
          description:
            "Pressure design uses minimum wall (≈ 0.875 × t_nom). This calculator returns nominal catalog t and ID — not under-tolerance walls.",
        },
        {
          label: "STD / XS vs Sch 40 / Sch 80",
          value: "NPS ≤ 10 / ≤ 8 equivalent",
          description:
            "STD = Sch 40 for NPS ≤ 10; XS = Sch 80 for NPS ≤ 8. Above those sizes walls diverge (e.g. NPS 12 STD = 9.53 mm, Sch 40 = 10.31 mm).",
        },
        {
          label: "B36.19M Stainless (S)",
          value: "5S / 10S / 40S / 80S",
          description:
            "Stainless schedules follow B36.19M. For NPS ≤ 12, Sch 40S usually matches Sch 40; from NPS 14, Sch 40S often stays 9.53 mm while carbon Sch 40 increases.",
        },
        {
          label: "MTO Mass Scope",
          value: "Plain-end W_tot only",
          description:
            "W_tot excludes flanges, fittings, contents, and coatings. Water-filled rack loads need a separate calculation.",
        },
      ],
    },
    tableCaption: "ASME B36.10M — matches pipeSchedule.json (this app) Sch 40 / Sch 80",
    tableHeaders: ["NPS", "OD (mm)", "Sch 40 t (mm)", "Sch 40 ID (mm)", "Sch 80 t (mm)"],
    tableRows: [
      ["2\"", "60.33", "3.91", "52.51", "5.54"],
      ["4\"", "114.3", "6.02", "102.26", "8.56"],
      ["6\"", "168.28", "7.11", "154.06", "10.97"],
      ["8\"", "219.1", "8.18", "202.74", "12.7"],
      ["10\"", "273.05", "9.27", "254.51", "15.09"],
      ["12\"", "323.85", "10.31", "303.23", "17.48"],
    ],
    tableColumnUnits: [
      { index: 1, quantity: "length", digits: 2 },
      { index: 2, quantity: "length", digits: 2 },
      { index: 3, quantity: "length", digits: 2 },
      { index: 4, quantity: "length", digits: 2 },
    ],
    tableFootnote:
      "Values match data/piping/pipeSchedule.json. Live lookup also covers additional schedules (10, 160, XXS, STD where listed) and B36.19M S schedules. Unit toggle converts OD / t / ID columns.",
    materialLimitations: {
      title: "Material Classes & Code Notes",
      summary:
        "Schedule chooses geometry only. Allowable stress, MAWP, and metallurgy follow the piping code and ASTM grade — outside this dimension engine.",
      items: [
        {
          materialGroup: "Carbon Steel (ASTM A106 / A53)",
          temperatureLimit: "Per B31.3 / material listing",
          stressLimit: "Density screening ≈ 7,850 kg/m³",
          notes: "Default industrial choice. Sch 40/STD for general service; Sch 80/XS for higher pressure or threaded ends as required by code.",
        },
        {
          materialGroup: "Stainless (ASTM A312) — B36.19M",
          temperatureLimit: "Per B31.3 / material listing",
          stressLimit: "Density ≈ 7,930–7,980 kg/m³",
          notes: "Use S schedules in the app (10S / 40S / 80S). Confirm thin 10S support spacing on long spans.",
        },
        {
          materialGroup: "STD vs Sch 40 Divergence",
          temperatureLimit: "N/A",
          stressLimit: "NPS ≥ 12",
          notes: "Do not assume STD = Sch 40 above NPS 10. State schedule or exact wall on the MTO.",
        },
        {
          materialGroup: "Threaded Ends (B31.3 guidance)",
          temperatureLimit: "N/A",
          stressLimit: "Often Sch 80 for small NPS",
          notes: "Male CS threaded connections commonly need heavier walls on small sizes — confirm project / B31.3 rules; this tool does not enforce threading rules.",
        },
      ],
      codeRestrictions: [
        "Calculator scope: B36.10M / B36.19M OD–t–ID–W_m lookup and optional W_tot = W_m × L × n. It does not size pressure design thickness (use the B31.3 thickness calculator).",
        "Use ID for velocity / ΔP; use OD for insulation and B31.3 design thickness inputs.",
        "W_tot is plain-end screening mass only — not water-filled rack load.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: NPS 4 Sch 40 — Match the Calculator Default",
      scenario:
        "Reproduce the app default path: NPS 4 Schedule 40, L = 6 m, n = 1. Read OD, t, ID, W_m from pipeSchedule.json and compute W_tot.",
      designConditions: [
        { label: "Nominal Size", value: "NPS 4 (DN 100)" },
        { label: "Schedule", value: "Schedule 40 (STD equivalent at this size)" },
        { label: "Length L", value: "6 m (single-random screening)" },
        { label: "Quantity n", value: "1 piece" },
        { label: "Standard", value: "ASME B36.10M (carbon / alloy row)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Read OD and wall t from the app table",
          calculation: "NPS 4 Sch 40: OD = 114.3 mm, t = 6.02 mm.",
          result: "OD = 114.3 mm, t = 6.02 mm",
          note: "Hero displays wall thickness t = 6.02 mm.",
        },
        {
          step: "Step 2",
          name: "Confirm inside diameter ID",
          formula: "ID = OD - 2t",
          calculation: "ID = 114.3 − 2 × 6.02 = 102.26 mm (stored row value).",
          result: "ID = 102.26 mm",
          note: "Use ID for hydraulic velocity and pressure-drop tools.",
        },
        {
          step: "Step 3",
          name: "Read unit mass W_m",
          calculation: "Catalog W_m = 16.07 kg/m for NPS 4 Sch 40 in pipeSchedule.json.",
          result: "W_m = 16.07 kg/m",
          note: "Plain-end screening mass per metre.",
        },
        {
          step: "Step 4",
          name: "Compute total MTO mass W_tot",
          formula: "W_{tot} = W_m \\cdot L \\cdot n",
          calculation: "W_tot = 16.07 kg/m × 6 m × 1 = 96.42 kg.",
          result: "W_tot = 96.42 kg",
          note: "Matches the calculator total for the default inputs.",
        },
        {
          step: "Step 5",
          name: "Optional: double quantity",
          formula: "W_{tot} = W_m \\cdot L \\cdot n",
          calculation: "With n = 2: W_tot = 16.07 × 6 × 2 = 192.84 kg.",
          result: "W_tot = 192.84 kg (n = 2)",
          note: "Same L, doubled piece count.",
        },
      ],
      conclusion:
        "Default app case NPS 4 Sch 40: OD 114.3 mm, t 6.02 mm, ID 102.26 mm, W_m 16.07 kg/m, W_tot 96.42 kg for L = 6 m and n = 1. Carry the same NPS/schedule into thickness, velocity, and ΔP tools.",
    },
    ...howTo("How to look up pipe schedule dimensions", [
      { name: "1. Select NPS", text: "Use the isometric pipe size (not OD)." },
      { name: "2. Select schedule", text: "Sch 40 / STD and Sch 80 / XS are the usual carbon pair; pick S schedules for stainless." },
      { name: "3. Read t, OD, ID, W_m", text: "Hero is wall t. Use ID for flow tools; OD for insulation / B31.3 inputs." },
      { name: "4. Optional MTO (1.2)", text: "Set L and n to get W_tot = W_m × L × n, then export or carry NPS/Sch downstream." },
    ]),
    faq: [
      {
        question: "Why is 4 inch pipe 114.3 mm OD instead of 101.6 mm?",
        answer:
          "NPS is a **dimensionless designator**. For **NPS ≤ 12**, OD is larger than the nominal inch size (**NPS 4 = 114.3 mm OD**). From **NPS 14** upward, OD equals the nominal inch size.",
      },
      {
        question: "What is the relationship between STD/XS and Schedule 40/80?",
        answer:
          "**STD = Sch 40 for NPS ≤ 10** and **XS = Sch 80 for NPS ≤ 8**. Above those sizes they diverge (e.g. **NPS 12 STD = 9.53 mm** vs **Sch 40 = 10.31 mm**). State schedule or exact wall on the PO.",
      },
      {
        question: "How does stainless Schedule 40S differ from carbon Schedule 40?",
        answer:
          "**Sch 40** is B36.10M; **Sch 40S** is B36.19M. For **NPS ≤ 12** walls usually match; from **NPS 14**, Sch 40S often stays **9.53 mm** while carbon Sch 40 increases.",
      },
      {
        question: "What does the hero and W_tot include?",
        answer:
          "Hero is **nominal wall t**. **W_tot = W_m × L × n** is plain-end screening mass only — not water-filled rack load, flanges, or fittings.",
      },
      {
        question: "Which diameter for velocity vs pressure design?",
        answer:
          "Use **ID** for velocity and ΔP (**v = Q / A**, A = π ID²/4). Use **OD** for B31.3 thickness design and insulation sizing.",
      },
    ],
  },

  "flange-dimension-weight": {
    slug: "flange-dimension-weight",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><i>W</i><sub>pair</sub> = 2 · <i>W</i><sub>f</sub> + <i>W</i><sub>g</sub> + <i>n</i> · (<i>W</i><sub>stud</sub> + 2 · <i>W</i><sub>nut</sub>)</p>' +
      '<p class="eng-eq">Lookup: OD, <i>T</i>, PCD, bolt holes · WN hub bore = Sch 40 / STD pipe ID (B36.10M)</p>' +
      '<p class="eng-plain">ASME B16.5 flange envelope &amp; mated-pair screening mass (this app)</p>',
    formulaLatex: "W_{pair} = 2W_f + W_g + n(W_{stud}+2W_{nut})",
    formulaNotes:
      "This calculator looks up ASME B16.5 dimensions and screening masses for NPS ½–24 (Classes 150–1500; Class 2500 through NPS 12). Select flange type (WN / SO / SW / BL) and facing (RF / FF / RTJ≥300). WN hub bore uses Sch 40 / STD pipe ID; SO/SW use pipe OD as slip bore. Type factors scale W_f (WN=1, SO=0.7, SW=0.75, BL=0.85). Facing adjusts gasket mass and stud length. Hero W_pair = 2 flanges + gasket + full stud/nut set. Stud lengths are screening — confirm B16.5 / vendor lists before PO. Large diameters NPS 26–60 are B16.47 (not in this table).",
    formulaBadges: [
      { label: "Scope", value: "B16.5 NPS ½–24" },
      { label: "W_pair", value: "2 W_f + W_g + hardware" },
      { label: "WN bore", value: "Sch 40 / STD ID" },
      { label: "Type factors", value: "SO 0.7 · SW 0.75 · BL 0.85" },
    ],
    variables: [
      { symbol: "OD", name: "Flange Outside Diameter", definition: "Circular flange forging OD from the B16.5 row (mm or in)." },
      { symbol: "T", name: "Flange Thickness", definition: "Minimum flange ring thickness from the table (mm or in)." },
      { symbol: "PCD", name: "Bolt Circle / Pitch Circle Diameter", definition: "Circle through bolt-hole centers (mm or in)." },
      { symbol: "n", name: "Bolt Hole Count", definition: "Number of studs / bolt holes on the flange." },
      { symbol: "W_f", name: "Single Flange Mass", definition: "Catalog WN RF mass × type factor (kg or lb)." },
      { symbol: "W_g", name: "Gasket Mass (screening)", definition: "Spiral-wound RF / FF / RTJ screening mass with facing factor." },
      { symbol: "W_pair", name: "Mated Pair Assembly Mass", definition: "Hero output: 2×W_f + W_g + n×(W_stud + 2×W_nut)." },
    ],
    standards: [
      "ASME B16.5 (Pipe Flanges and Flanged Fittings NPS ½–24)",
      "ASME B16.47 (Large Diameter Steel Flanges NPS 26–60) — reference only; not tabulated here",
      "ASME B16.20 (Metallic Gaskets for Pipe Flanges)",
      "ASME B36.10M (Welded and Seamless Wrought Steel Pipe) — WN hub bore",
    ],
    allowancesAndTolerances: {
      title: "Facing, Bore & Assembly Rules (This App)",
      summary:
        "Dimensions and masses are screening lookups. Confirm vendor drawings for facing height, RTJ ring, and stud length before procurement.",
      items: [
        {
          label: "Raised Face Height (B16.5)",
          value: "1/16\" Cl 150/300 · 1/4\" Cl ≥ 600",
          description:
            "Cl 150/300 RF height is typically included in catalog T. Cl ≥ 600 adds 6.4 mm RF beyond minimum T. This calculator stores T from the app table — verify facing on the mill drawing.",
        },
        {
          label: "Hub Bore Mapping",
          value: "WN → pipe ID · SO/SW → pipe OD · BL → solid",
          description:
            "WN uses default Sch 40 / STD inside diameter. Slip-on / socket-weld use pipe OD. Blind has no bore. SW above NPS 2 is flagged as screening-only in the UI.",
        },
        {
          label: "Stud Length Screening",
          value: "RF / FF / RTJ deltas by class",
          description:
            "Base stud length from the table is adjusted for facing and rounded to 5 mm. Confirm ASME B16.5 Appendix / vendor stud charts for purchase.",
        },
        {
          label: "B16.47 Series A vs B",
          value: "Not interchangeable · out of scope",
          description:
            "NPS 26–60 use B16.47 Series A or B bolt patterns that do not mate. This lookup stops at NPS 24.",
        },
      ],
    },
    tableCaption: "ASME B16.5 WN RF Class 150 — matches flangeDimension.json (this app)",
    tableHeaders: ["NPS", "Flange OD (mm)", "Thickness T (mm)", "Bolt circle (mm)", "Bolts"],
    tableRows: [
      ["2\"", "152.4", "19.1", "120.7", "4 × 5/8\""],
      ["4\"", "228.6", "23.8", "190.5", "8 × 5/8\""],
      ["6\"", "280", "23.9", "241.3", "8 × 3/4\""],
      ["8\"", "342.9", "28.4", "298.5", "8 × 3/4\""],
      ["10\"", "405", "28.6", "362", "12 × 7/8\""],
      ["12\"", "485", "30.2", "431.8", "12 × 7/8\""],
    ],
    tableColumnUnits: [
      { index: 1, quantity: "length", digits: 1 },
      { index: 2, quantity: "length", digits: 1 },
      { index: 3, quantity: "length", digits: 1 },
    ],
    tableFootnote:
      "Values match data/piping/flangeDimension.json Class 150 WN RF rows. Live lookup also covers Classes 300–1500 (2500 through NPS 12) and type/facing factors. Unit toggle converts OD / T / PCD columns.",
    materialLimitations: {
      title: "Pressure-Temperature Ratings & Material Groups",
      summary:
        "Pressure Class is not a constant psi/bar rating. MAWP follows ASME B16.5 Table 2 by material group and temperature — outside the dimension engine.",
      items: [
        {
          materialGroup: "Group 1.1: Carbon Steel (ASTM A105 / A350 LF2)",
          temperatureLimit: "-29 °C to 425 °C (-20 °F to 800 °F)",
          stressLimit: "Cl 150 ≈ 19.6 bar @ 38 °C → ~6.5 bar @ 300 °C (A105)",
          notes: "Most common forged flange material. Confirm Table 2 for the actual group.",
        },
        {
          materialGroup: "Group 2.1 / 2.2: Stainless (A182 F304/L, F316/L)",
          temperatureLimit: "-196 °C to 538 °C (-320 °F to 1000 °F)",
          stressLimit: "Often lower ambient MAWP than A105 for the same class",
          notes: "Use stainless ratings when the isometric specifies SS flanges.",
        },
        {
          materialGroup: "Facing Compatibility (RF / FF / RTJ)",
          temperatureLimit: "Per gasket / ring OEM",
          stressLimit: "RTJ enabled in-app for Class ≥ 300",
          notes: "Do not mate cast-iron FF to steel RF without full-face gasket / face machining — bending can crack CI.",
        },
        {
          materialGroup: "Type Weight Factors (this app)",
          temperatureLimit: "N/A",
          stressLimit: "WN 1.00 · SO 0.70 · SW 0.75 · BL 0.85",
          notes: "Applied to the WN RF catalog mass to estimate other types. Confirm vendor weights for PO.",
        },
      ],
      codeRestrictions: [
        "Calculator scope: B16.5 OD/T/PCD/bolting lookup, type/facing mass scaling, WN Sch 40 bore, and W_pair. It does not compute MAWP or B16.47 large flanges.",
        "Always use W_pair (not W_f alone) for spool rigging and rack deadload estimates.",
        "RTJ ring numbers are B16.20 screening IDs — confirm the gasket OEM chart.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: NPS 6 Class 300 WN RF — Match the Calculator",
      scenario:
        "Reproduce the app path for NPS 6 Class 300 weld-neck RF: read OD, T, PCD, bolting, W_f, and W_pair from flangeDimension.json (same source as the live calculator).",
      designConditions: [
        { label: "Nominal Size", value: "NPS 6 (DN 150)" },
        { label: "Pressure Class", value: "Class 300" },
        { label: "Type & Facing", value: "Weld Neck RF (default)" },
        { label: "Hub Bore Basis", value: "Sch 40 / STD pipe ID (B36.10M)" },
        { label: "Mass Basis", value: "CS screening densities in the app table" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Read B16.5 envelope from the app table",
          calculation:
            "NPS 6 Class 300: OD = 320 mm, T = 35 mm, PCD = 269.9 mm, raised-face sealing OD = 215.9 mm.",
          result: "OD = 320 mm, T = 35 mm, PCD = 269.9 mm",
          note: "These values match data/piping/flangeDimension.json (not older handbook rounded SEO).",
        },
        {
          step: "Step 2",
          name: "Read bolting layout",
          calculation:
            "n = 12 holes, stud diameter = 3/4\", screening stud length = 120 mm (RF), wrench AF = 1-1/4\" (32 mm).",
          result: "12 × 3/4\" studs · L = 120 mm",
          note: "Shown in Field bolt & tool specs and the live joint preview.",
        },
        {
          step: "Step 3",
          name: "Single flange mass W_f",
          formula: "W_f = W_{table} \\cdot f_{type}",
          calculation: "WN factor = 1.00. W_f = 19.1 kg (table).",
          result: "W_f = 19.1 kg",
          note: "SO would use 0.7 × 19.1 ≈ 13.4 kg.",
        },
        {
          step: "Step 4",
          name: "Hardware + gasket",
          formula: "W_{hw} = n(W_{stud}+2W_{nut}),\\ W_g = 0.29\\text{ kg}",
          calculation:
            "Table W_stud = 0.268 kg → app rounds to 0.27 kg; W_nut = 0.118 kg → per set 0.506 kg. W_hw = 12 × 0.506 = 6.07 kg. W_g = 0.29 kg.",
          result: "W_hw = 6.07 kg, W_g = 0.29 kg",
          note: "Screening masses from the same JSON row; stud mass is rounded to 0.01 kg in the engine.",
        },
        {
          step: "Step 5",
          name: "Mated pair W_pair (hero)",
          formula: "W_{pair} = 2W_f + W_g + W_{hw}",
          calculation: "W_pair = 2 × 19.1 + 0.29 + 6.07 = 44.56 kg.",
          result: "W_pair = 44.56 kg",
          note: "Matches the calculator hero for NPS 6 Class 300 WN RF.",
        },
      ],
      conclusion:
        "NPS 6 Class 300 WN RF in this app: OD 320 mm, T 35 mm, PCD 269.9 mm, 12 × 3/4\" × 120 mm studs, W_f = 19.1 kg, W_pair = 44.56 kg. Use W_pair for rigging — not the single-flange catalog mass alone.",
    },
    ...howTo("How to look up flange dimensions", [
      { name: "1. Select type and facing", text: "WN / SO / SW / BL and RF / FF / RTJ (RTJ from Class 300)." },
      { name: "2. Select NPS and class", text: "Use pipe NPS, not flange OD. Classes follow the B16.5 row set in this app." },
      { name: "3. Read OD, T, PCD, bore, studs, W_pair", text: "Hero is mated-pair weight. WN bore follows Sch 40 / STD ID." },
      { name: "4. Export / carry over", text: "Confirm stud length and RTJ ring on vendor charts; carry NPS/class into gasket and bolt-torque tools." },
    ]),
    faq: [
      {
        question: "Does Class 150 mean the flange is rated for 150 psi?",
        answer:
          "**No.** Class is a **dimensionless designator**. MAWP comes from **ASME B16.5 Table 2** by material group and temperature (e.g. A105 Class 150 ≈ **19.6 bar at 38 °C**, much lower at 300 °C).",
      },
      {
        question: "What does the hero weight include?",
        answer:
          "**W_pair = 2 × W_f + W_g + full stud/nut set.** It is the mated joint screening mass for rigging — not a single flange catalog weight.",
      },
      {
        question: "How is WN hub bore chosen?",
        answer:
          "Weld-neck bore uses the **default Sch 40 / STD pipe ID** from the pipe-schedule table (B36.10M). Slip-on / socket-weld use **pipe OD**. Blind is solid.",
      },
      {
        question: "Why do SO / SW / BL weights differ from WN?",
        answer:
          "The table stores **WN RF** masses. This app applies type factors **SO 0.70, SW 0.75, BL 0.85** (WN = 1.00). Confirm vendor weights for purchasing.",
      },
      {
        question: "When is ASME B16.47 required?",
        answer:
          "**B16.5 covers NPS ½–24.** **NPS 26–60** use **B16.47** Series A or B (non-interchangeable). Those sizes are **not** in this calculator.",
      },
    ],
  },

  "fitting-valve-dimension": {
    slug: "fitting-valve-dimension",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><i>L</i><sub>total</sub> = <i>L</i><sub>FTF</sub> + 2 · <i>t</i><sub>gasket</sub> &nbsp;·&nbsp; <i>L</i><sub>FTF</sub> = <i>f</i>(Valve Type, NPS, Class)</p>' +
      '<p class="eng-plain">ASME B16.10 Face-to-Face and End-to-End Dimensions of Valves &amp; API Standards</p>',
    formulaLatex: "L_{\\text{total}} = L_{\\text{FTF}} + 2 \\cdot t_{\\text{gasket}},\\quad L_{\\text{FTF}} = f(\\text{Type},\\; \\text{NPS},\\; \\text{Class})",
    formulaNotes:
      "ASME B16.10 establishes standardized face-to-face (FTF) and end-to-end (ETE) dimensions for flanged, butt-weld, and wafer/lug valves (Gate, Globe, Swing Check, Ball, and Butterfly), guaranteeing physical dimensional interchangeability across different valve manufacturers. Total installation spool length L_total incorporates the standardized FTF length plus compressed gasket takeouts (typically 1.5 to 3.2 mm per flanged joint).",
    formulaBadges: [
      { label: "ASME B16.10", value: "Face-to-Face Standard" },
      { label: "API 600 / 602", value: "Steel Gate Valves" },
      { label: "API 608 / 6D", value: "Ball & Pipeline Valves" },
      { label: "API 594 / 609", value: "Check & Butterfly" },
    ],
    variables: [
      { symbol: "L_FTF", name: "Face-to-Face Dimension", definition: "Distance between the extreme flanged sealing faces of the valve body per ASME B16.10 tables (mm or in)." },
      { symbol: "L_total", name: "Total Installation Length", definition: "Total spool cutout gap between mating pipe flanges including compressed gaskets: L_total = L_FTF + 2·t_gasket (mm or in)." },
      { symbol: "t_gasket", name: "Compressed Gasket Takeout", definition: "Effective compressed gasket thickness (typically 3.2 mm for ASME B16.20 spiral-wound or 1.5 mm for flat sheet)." },
      { symbol: "NPS / DN", name: "Nominal Valve Size", definition: "Nominal Pipe Size or Diameter Nominal of the flanged valve body (NPS 1/2\" to 36\" / DN 15 to 900)." },
      { symbol: "Class", name: "Pressure Rating Class", definition: "ASME B16.34 / B16.5 pressure rating (Class 150, 300, 600, 900, 1500, 2500)." },
      { symbol: "Facing", name: "Flange End Preparation", definition: "Raised Face (RF), Flat Face (FF), Ring-Type Joint (RTJ), or Buttwelding End (BWE)." },
    ],
    standards: [
      "ASME B16.10 (Face-to-Face and End-to-End Dimensions of Valves)",
      "ASME B16.34 (Valves - Flanged, Threaded, and Welding End)",
      "API 600 / API 602 / API 603 (Bolted Bonnet Steel Gate Valves)",
      "API 6D / API 594 / API 609 (Pipeline, Check, and Butterfly Valves)",
    ],
    allowancesAndTolerances: {
      title: "ASME B16.10 Face-to-Face Tolerances & Facing Offsets",
      summary:
        "ASME B16.10 specifies strict manufacturing length tolerances and defines how raised-face heights and RTJ groove depths alter overall end-to-end dimensions.",
      items: [
        {
          label: "Face-to-Face Length Tolerances",
          value: "NPS ≤ 10: ±2.0 mm; NPS 12 to 24: ±3.0 mm",
          description:
            "Per ASME B16.10 Para. 2.4, manufactured valve body FTF tolerances are: NPS ≤ 10: ±2.0 mm (±0.06 in); NPS 12 to 24: ±3.0 mm (±0.12 in); NPS ≥ 26: ±3.0 mm to ±5.0 mm. Spool fabrication must allow for these fit-up tolerances.",
        },
        {
          label: "Raised Face (RF) Inclusion in FTF",
          value: "1/16\" RF Included (Cl 150/300) vs 1/4\" Excluded (Cl ≥ 600)",
          description:
            "For Class 150 and 300 valves, the standard 1.6 mm (1/16 in) raised face is included in catalog FTF. For Class 600+ valves, published FTF includes the 6.4 mm (1/4 in) raised face; confirm exact datum on vendor GA drawings.",
        },
        {
          label: "Ring-Type Joint (RTJ) End-to-End Offset",
          value: "+5.0 mm to +12.0 mm longer than RF FTF",
          description:
            "RTJ flanged valves have larger end-to-end dimensions than RF valves because octagonal ring grooves are machined into the flange face; RTJ ETE dimensions are tabulated separately in ASME B16.10 Table 1/2.",
        },
        {
          label: "Wafer & Lug Butterfly Face-to-Face (API 609)",
          value: "Short / Long Pattern (ISO 5752 / API 609 Category A/B)",
          description:
            "Butterfly valves have ultra-compact FTF dimensions. Category A (rubber-lined) and Category B (high-performance offset) have distinct face-to-face standards; disc protrusion beyond the valve body must clear adjacent pipe bores.",
        },
      ],
    },
    tableCaption: "B16.10 Class 150 RF face-to-face (selected sizes)",
    tableHeaders: ["NPS", "Gate FTF (mm)", "Globe FTF (mm)", "Swing check (mm)", "Ball FTF (mm)"],
    tableRows: [
      ["2\"", "178", "203", "203", "178"],
      ["4\"", "229", "292", "292", "229"],
      ["6\"", "267", "406", "406", "267"],
      ["8\"", "292", "495", "495", "292"],
      ["10\"", "330", "622", "622", "330"],
      ["12\"", "356", "698", "698", "356"],
    ],
    tableFootnote: "Gate/globe/check/ball from ASME B16.10 Class 150 flanged RF screening rows in this app.",
    materialLimitations: {
      title: "Valve Type Selection & Operational Characteristics",
      summary:
        "Valve types are engineered for specific process functions: isolation (gate/ball), throttling (globe), backflow prevention (check), or rapid shutoff (butterfly).",
      items: [
        {
          materialGroup: "Wedge Gate Valves (API 600 / API 603)",
          temperatureLimit: "Standard Body: ASTM A216 WCB / A351 CF8M (-29 °C to 425 °C)",
          stressLimit: "On/Off Isolation Only (Strictly No Throttling)",
          notes: "Straight-through full bore with minimum pressure drop (L/D ≈ 8). Partially cracked gate suffers severe high-velocity seat chatter and wire-drawing.",
        },
        {
          materialGroup: "Globe Valves (BS 1873 / API 623)",
          temperatureLimit: "-196 °C to 538 °C (per body/trim metallurgy)",
          stressLimit: "Precision Throttling & Flow Regulation",
          notes: "Tortuous S-path flow profile generates high pressure drop (L/D ≈ 340), but allows linear fine throttling without seat vibration.",
        },
        {
          materialGroup: "Floating & Trunnion Ball Valves (API 608 / API 6D)",
          temperatureLimit: "Soft Seat (PTFE/PEEK): -50 °C to 200 °C; Metal Seat: up to 450 °C",
          stressLimit: "Quick Quarter-Turn Bubble-Tight Shutoff",
          notes: "Zero pressure drop full-bore flow. Soft seats give zero-leakage Class VI shutoff but are limited by polymer temperature limits.",
        },
        {
          materialGroup: "Swing & Dual-Plate Check Valves (API 594 / API 6D)",
          temperatureLimit: "Gravity & Flow Dependent Backflow Prevention",
          stressLimit: "Minimum Cracking Velocity Required to Prevent Slam",
          notes: "Horizontal or vertical-up flow only. Requires sufficient fluid velocity (v > 1.5 m/s / 5 ft/s) to keep disc fully open against gravity.",
        },
      ],
      codeRestrictions: [
        "Class 150 vs Class 300 FTF Incompatibility: Class 300 valve face-to-face lengths are substantially longer than Class 150 (e.g. 4\" Gate: 229 mm in Cl 150 vs 305 mm in Cl 300); never interchange valves without redesigning spool spools.",
        "Butterfly Disc Interference Check: In high-schedule thick-wall pipe (Sch 80/160), opening butterfly valve discs can collide with the pipe inside diameter; pipe ID chamfering or spool spacers may be required.",
        "Gear Operator & Stem Clearance: When modeling 3D piping layouts, always allocate vertical handwheel stem clearance (min 1.5× valve height) for gate/globe rising stems and horizontal gearbox envelopes on quarter-turn valves.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Piping Spool Cutout Gap for NPS 6 Class 300 Valve Station",
      scenario:
        "Determine the standardized ASME B16.10 face-to-face length, required pipe spool cutout gap (L_total) with two 3.2 mm spiral-wound gaskets, and verify the weight difference between an ASME B16.10 Class 300 flanged gate valve and globe valve in an NPS 6 (DN 150) process line.",
      designConditions: [
        { label: "Nominal Pipe Size", value: "NPS 6 (DN 150)" },
        { label: "Pressure Class", value: "Class 300 Raised Face (RF)" },
        { label: "Valve Types Compared", value: "API 600 Wedge Gate Valve vs BS 1873 Globe Valve" },
        { label: "Gasket Specification", value: "Two ASME B16.20 Style CGI Spiral-Wound Gaskets (t_compressed = 3.2 mm each)" },
        { label: "Mating Flanges", value: "Two ASME B16.5 NPS 6 Class 300 WN RF Flanges" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Extract ASME B16.10 Face-to-Face Dimension for Class 300 Gate Valve",
          calculation: "Per ASME B16.10 Table 1 (Item 1, Gate Valve NPS 6 Class 300 RF): Standard Face-to-Face length L_FTF,gate = 403.2 mm (15.88 in).",
          result: "L_{\\text{FTF, gate}} = 403.2\\text{ mm} (15.88\\text{ in})",
          note: "Standard dimension across all certified API 600 valve manufacturers.",
        },
        {
          step: "Step 2",
          name: "Extract ASME B16.10 Face-to-Face Dimension for Class 300 Globe Valve",
          calculation: "Per ASME B16.10 Table 1 (Item 2, Globe Valve NPS 6 Class 300 RF): Standard Face-to-Face length L_FTF,globe = 444.5 mm (17.50 in).",
          result: "L_{\\text{FTF, globe}} = 444.5\\text{ mm} (17.50\\text{ in})",
          note: "Globe valve body is 41.3 mm (1.62 in) longer than the gate valve due to the internal S-bridge seat path.",
        },
        {
          step: "Step 3",
          name: "Calculate Total Piping Spool Installation Cutout Gap (Gate Valve)",
          formula: "L_{\\text{total, gate}} = L_{\\text{FTF, gate}} + 2 · t_{\\text{gasket}}",
          calculation: "L_total,gate = 403.2 mm + (2 × 3.2 mm) = 403.2 mm + 6.4 mm = 409.6 mm (16.13 in).",
          result: "L_{\\text{total, gate}} = 409.6\\text{ mm}",
          note: "Exact distance required between mating pipe flange raised faces.",
        },
        {
          step: "Step 4",
          name: "Calculate Total Piping Spool Installation Cutout Gap (Globe Valve)",
          formula: "L_{\\text{total, globe}} = L_{\\text{FTF, globe}} + 2 · t_{\\text{gasket}}",
          calculation: "L_total,globe = 444.5 mm + (2 × 3.2 mm) = 444.5 mm + 6.4 mm = 450.9 mm (17.75 in).",
          result: "L_{\\text{total, globe}} = 450.9\\text{ mm}",
          note: "Replacing a gate valve with a globe valve requires extending the pipe spool gap by exactly 41.3 mm.",
        },
        {
          step: "Step 5",
          name: "Compare Weight and Structural Support Deadload",
          calculation: "Standard catalog weight for NPS 6 Class 300 cast steel gate valve W_gate ≈ 125 kg (275 lb); NPS 6 Class 300 globe valve W_globe ≈ 165 kg (364 lb) (+32% heavier). Pipe support spans must accommodate the concentrated point load.",
          result: "W_{\\text{gate}} \\approx 125\\text{ kg},\\quad W_{\\text{globe}} \\approx 165\\text{ kg}",
          note: "Place pipe supports adjacent to the valve station to prevent flange bending moments.",
        },
      ],
      conclusion:
        "For an NPS 6 Class 300 flanged installation, the ASME B16.10 gate valve requires a pipe cutout gap of 409.6 mm (403.2 mm FTF + 6.4 mm gaskets), while a globe valve requires 450.9 mm (444.5 mm FTF + 6.4 mm gaskets). Piping isometrics and support bents must be detailed to exact B16.10 standards.",
    },
    ...howTo("How to look up valve face-to-face", [
      { name: "1. Select valve type", text: "Gate, globe, swing check, ball, or butterfly." },
      { name: "2. Select NPS and class", text: "Class 150 or 300 for flanged RF bodies." },
      { name: "3. Read face-to-face L", text: "Use L for spool fit-up. Optionally add gasket takeout for Total Installation Length." },
      { name: "4. Verify and export", text: "Confirm against the vendor GA before field cut." },
    ]),
    faq: [
      {
        question: "What is the primary engineering purpose of ASME B16.10?",
        answer:
          "**ASME B16.10** standardizes **face-to-face (FTF) and end-to-end (ETE) dimensions** across all commercial valve types and pressure classes. This ensures **complete dimensional interchangeability**: if an installed valve fails, any certified valve of the same size, class, and type from any global manufacturer can be dropped into the exact same piping spool gap without torching, re-welding, or modifying pipe flanges.",
      },
      {
        question: "Why do Gate, Globe, and Ball valves of the same NPS and Class have different FTF lengths?",
        answer:
          "Internal hydrodynamic flow paths dictate body length. **Gate valves** have a narrow, straight-through wedge bore and relatively short FTF. **Globe valves** require a tortuous internal S-bridge structure to direct fluid vertically through the seat ring, requiring **longer face-to-face dimensions (typically 10% to 50% longer than gate valves)**. **Ball valves** can be standard length or long pattern depending on full-port vs reduced-port design.",
      },
      {
        question: "Can a Class 150 valve be replaced with a Class 300 valve in an emergency?",
        answer:
          "**No**. In addition to having a different bolt circle diameter (PCD) and bolt hole count, **Class 300 valves have significantly longer face-to-face dimensions** than Class 150 (e.g. an NPS 4 Gate valve is **229 mm in Class 150 vs 305 mm in Class 300**). The Class 300 valve will physically not fit between the existing Class 150 pipe flanges.",
      },
      {
        question: "How do wafer and lug butterfly valve dimensions compare to flanged valves?",
        answer:
          "Wafer and lug butterfly valves (governed by **API 609 / ISO 5752**) have **extremely short face-to-face dimensions** (e.g. NPS 6 Butterfly FTF is only **56 mm**, compared to **267 mm** for a flanged gate valve). They clamp directly between two pipe flanges using long all-thread studs spanning across the entire valve body, saving significant weight, space, and cost.",
      },
    ],
  },

  "butt-weld-fitting-dimension": {
    slug: "butt-weld-fitting-dimension",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq">90° LR: <i>A</i> = 1.5 × <i>NPS</i><sub>in</sub> = 38.1 × <i>NPS</i> &nbsp;·&nbsp; 90° SR: <i>A</i> = 1.0 × <i>NPS</i><sub>in</sub> = 25.4 × <i>NPS</i></p>' +
      '<p class="eng-eq">45° LR: <i>B</i> ≈ 0.625 × <i>NPS</i><sub>in</sub> &nbsp;·&nbsp; Equal Tee: <i>C</i> &nbsp;·&nbsp; Reducer: <i>H</i> &nbsp;·&nbsp; Cap: <i>E</i></p>' +
      '<p class="eng-plain">ASME B16.9 / ASME B16.25 Butt-Weld Fitting Center-to-End &amp; Bevel Prep</p>',
    formulaLatex:
      "A_{LR} = 1.5\\cdot NPS_{in} = 38.1\\cdot NPS_{mm},\\quad A_{SR} = 1.0\\cdot NPS_{in} = 25.4\\cdot NPS_{mm},\\quad B_{45^\\circ} \\approx 0.625\\cdot NPS_{in}",
    formulaNotes:
      "ASME B16.9 standardizes overall envelope dimensions, center-to-end takeouts, and manufacturing tolerances for factory-made wrought buttwelding fittings (NPS 1/2 through NPS 48). Long-radius 90° elbows follow A = 1.5 × NPS in inches (38.1 mm per NPS). Short-radius 90° elbows follow A = 1.0 × NPS (25.4 mm per NPS). 45° LR elbows use B ≈ 0.625 × NPS in inches with published standard overrides (e.g. NPS 12 = 229 mm). Equal tees use center-to-end dimension C; concentric/eccentric reducers use overall length H; pipe caps use height E. Weld bevel ends follow ASME B16.25 (standard 37.5° bevel with 1.6 mm root face).",
    formulaBadges: [
      { label: "90° LR Elbow", value: "A = 1.5 × NPS" },
      { label: "90° SR Elbow", value: "A = 1.0 × NPS" },
      { label: "45° LR Elbow", value: "B ≈ 0.625 × NPS" },
      { label: "Bevel Prep (B16.25)", value: "37.5° ± 2.5°" },
    ],
    variables: [
      { symbol: "A", name: "Elbow Center-to-End Dimension", definition: "Distance from the center of curvature to either weld bevel end face for 90° LR and SR elbows (mm or in)." },
      { symbol: "B", name: "45° Elbow Center-to-End Dimension", definition: "Center-to-face distance for 45° long-radius elbows (mm or in)." },
      { symbol: "C / M", name: "Tee Center-to-End Dimension", definition: "Run center-to-end (C) and branch center-to-end (M) for equal and reducing tees (mm or in)." },
      { symbol: "H", name: "Reducer Overall Length", definition: "End-to-end length for concentric and eccentric reducers per B16.9 tables (mm or in)." },
      { symbol: "E", name: "Cap Height", definition: "Total length/height from weld bevel face to outer crown center for standard pipe caps (mm or in)." },
      { symbol: "OD / t", name: "Bevel End Matching Geometry", definition: "Outside diameter and nominal wall thickness matching the connected ASME B36.10M / B36.19M pipe schedule (mm or in)." },
    ],
    standards: [
      "ASME B16.9 (Factory-Made Wrought Buttwelding Fittings)",
      "ASME B16.25 (Buttwelding Ends & Bevel Preparation)",
      "ASME B36.10M / B36.19M (Matching Pipe Schedules)",
      "ASTM A234 / A403 / A420 (Wrought Fitting Material Specs)",
    ],
    allowancesAndTolerances: {
      title: "ASME B16.9 Manufacturing Tolerances & Fitting Rules",
      summary:
        "ASME B16.9 defines precise product tolerances on center-to-end takeout, off-plane angularity, and wall thickness to guarantee accurate spool prefabrication and field alignment.",
      items: [
        {
          label: "Center-to-End Takeout Tolerance",
          value: "±1.5 mm ~ ±3.0 mm",
          description:
            "For NPS ≤ 2½: ±1.5 mm; for NPS 3 to 8: ±2.0 mm; for NPS 10 to 18: ±2.0 mm; for NPS 20 to 24: ±3.0 mm. Essential for piping spool cutting lengths and isometric fit-up.",
        },
        {
          label: "Minimum Wall Thickness (t_min)",
          value: "87.5% of Nominal Wall",
          description:
            "Per ASME B16.9 Para. 2.2, the minimum wall thickness at any point of the fitting body must not be less than 87.5% of nominal pipe schedule wall thickness (incorporating the standard -12.5% mill tolerance).",
        },
        {
          label: "Bevel Angle & Land (ASME B16.25)",
          value: "37.5° ± 2.5°, Root Land 1.6 ± 0.8 mm",
          description:
            "For wall thickness t ≤ 22 mm, bevel angle is 37.5° ± 2.5° with a 1.6 mm root land. For t > 22 mm, compound bevel (37.5° transitioning to 10°) is required.",
        },
        {
          label: "Off-Plane Angular Alignment",
          value: "Max 1.0 mm ~ 2.0 mm",
          description:
            "Angular misalignment between bevel face and true 90°/45° plane is limited to 0.8 mm for NPS ≤ 4, 1.6 mm for NPS 5 to 8, and 2.4 mm for NPS ≥ 10.",
        },
      ],
    },
    tableCaption: "B16.9 elbow A with matching Sch 40 OD and wall (selected sizes)",
    tableHeaders: ["NPS", "LR A (mm)", "SR A (mm)", "OD (mm)", "Sch 40 t (mm)"],
    tableRows: [
      ["2\"", "76", "51", "60.3", "3.91"],
      ["4\"", "152", "102", "114.3", "6.02"],
      ["6\"", "229", "152", "168.3", "7.11"],
      ["8\"", "305", "203", "219.1", "8.18"],
      ["10\"", "381", "254", "273.0", "9.27"],
      ["12\"", "457", "305", "323.8", "10.31"],
    ],
    tableFootnote:
      "LR/SR A from ASME B16.9 relationships (A_LR = 38.1×NPS, A_SR = 25.4×NPS). OD and Sch 40 wall from B36.10M screening in this app.",
    materialLimitations: {
      title: "Fitting Material Grades & Hydraulic Limitations",
      summary:
        "Butt-weld fittings are seamless or welded wrought components manufactured from pipe, plate, or forging billets. Fitting pressure-temperature rating equals that of seamless straight pipe of matching material and schedule.",
      items: [
        {
          materialGroup: "ASTM A234 WPB (Wrought Carbon Steel)",
          temperatureLimit: "-29 °C to 427 °C (-20 °F to 800 °F)",
          stressLimit: "Matches ASTM A106 Gr. B Pipe",
          notes: "Universal fitting grade for carbon steel piping systems. Manufactured from A106B pipe or A285/A516 plate with full radiography.",
        },
        {
          materialGroup: "ASTM A420 WPL6 (Low-Temperature CS)",
          temperatureLimit: "-45 °C to 427 °C (-50 °F to 800 °F)",
          stressLimit: "Matches ASTM A333 Gr. 6 Pipe",
          notes: "Impact-tested fitting grade for low-temperature service, refrigerated gas, and cold climate process units.",
        },
        {
          materialGroup: "ASTM A403 WP304L / WP316L (Stainless Steel)",
          temperatureLimit: "-196 °C to 450 °C (-320 °F to 842 °F)",
          stressLimit: "Matches ASTM A312 TP304L/316L",
          notes: "Class WP-S (seamless) or WP-W (welded with RT). Excellent corrosion resistance for chemical, pharmaceutical, and offshore utilities.",
        },
        {
          materialGroup: "ASTM A815 UNS S31803 / S32750 (Duplex)",
          temperatureLimit: "-50 °C to 280 °C (-58 °F to 536 °F)",
          stressLimit: "Matches ASTM A790 Duplex Pipe",
          notes: "High strength and chloride pitting resistance (PREN ≥ 35 for 2205, ≥ 42 for Super Duplex 2507).",
        },
      ],
      codeRestrictions: [
        "LR vs SR Elbow Hydraulic Resistance: Short-radius (SR) elbows have an equivalent length L/D ≈ 50 compared to LR elbows L/D ≈ 30. SR fittings should not be used in slurry, high-velocity gas, or erosion-prone services.",
        "Reducer Slope & Cavitation: In pump suction lines, eccentric reducers must be installed flat-on-top (FOT) to prevent air/vapor pocket formation and pump cavitation.",
        "Code Pressure Equivalence: Per ASME B16.9 Para. 2.1, the pressure design rating of a B16.9 fitting is identical to straight seamless pipe of matching wall thickness and material specification; no de-rating factor is applied.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Pipe Spool Cut-Length Calculation with 90° LR Elbows",
      scenario:
        "Calculate the exact pipe cut length for an NPS 4 (DN 100) Schedule 40 carbon steel spool connecting two 90° LR butt-weld elbows with a total center-to-center distance of 1,800 mm, accounting for elbow takeouts and welding root gaps.",
      designConditions: [
        { label: "Nominal Size", value: "NPS 4 (DN 100)" },
        { label: "Fittings", value: "Two 90° LR Butt-Weld Elbows (ASME B16.9)" },
        { label: "Center-to-Center Distance (L_cc)", value: "1,800 mm" },
        { label: "Schedule", value: "Schedule 40 (OD = 114.30 mm, t = 6.02 mm)" },
        { label: "Fitting Material", value: "ASTM A234 WPB Seamless" },
        { label: "WPS Root Gap (G)", value: "3.2 mm (1/8 in) per joint" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Calculate 90° LR Elbow Center-to-End Takeout (A)",
          formula: "A = 1.5 · NPS_{in} · 25.4 mm/in = 38.1 · NPS",
          calculation: "A = 38.1 × 4 = 152.4 mm → ASME B16.9 standardized dimension = 152.4 mm (6.00 in).",
          result: "A = 152.4 mm per elbow",
          note: "Long-radius 90° elbow takeout is exactly 1.5 times nominal pipe size in inches (152.4 mm).",
        },
        {
          step: "Step 2",
          name: "Determine Total Fitting Takeout for Both Elbows",
          formula: "Takeout_total = 2 · A",
          calculation: "Takeout_total = 2 × 152.4 mm = 304.8 mm",
          result: "Takeout_total = 304.8 mm",
          note: "Total center-to-face distance deducted from overall center-to-center dimension.",
        },
        {
          step: "Step 3",
          name: "Account for Welding Root Gap Deductions",
          formula: "Gap_total = 2 · Root_Gap",
          calculation: "Per welding procedure specification (WPS), root gap = 3.2 mm per butt weld. For 2 welds: Gap_total = 2 × 3.2 mm = 6.4 mm.",
          result: "Gap_total = 6.4 mm",
          note: "Root gap must be subtracted from pipe cut length so final fabricated spool matches 1,800 mm.",
        },
        {
          step: "Step 4",
          name: "Calculate Net Pipe Spool Cut Length (L_cut)",
          formula: "L_cut = L_cc - Takeout_total - Gap_total",
          calculation: "L_cut = 1,800.0 mm - 304.8 mm - 6.4 mm = 1,488.8 mm",
          result: "L_cut = 1,488.8 mm (1,489 mm)",
          note: "Pipe shop cuts exactly 1,488.8 mm of NPS 4 Schedule 40 bare pipe.",
        },
        {
          step: "Step 5",
          name: "Verify Fitting Bevel Match & Material Rating",
          calculation: "Fitting OD = 114.3 mm, wall = 6.02 mm (t_min = 5.27 mm); bevel angle = 37.5° ± 2.5° with 1.6 mm land. Internal bore ID = 102.26 mm perfectly matches pipe schedule.",
          result: "Bevel 37.5° · ID 102.26 mm · Full Code Match",
          note: "ASME B16.9 fitting pressure rating matches straight ASTM A106 Gr. B Sch 40 pipe.",
        },
      ],
      conclusion:
        "For an NPS 4 center-to-center run of 1,800 mm with two 90° LR elbows, the straight pipe cut length is 1,488.8 mm (allowing for 2 × 152.4 mm takeouts and 2 × 3.2 mm weld root gaps).",
    },
    ...howTo("How to look up butt-weld fitting dimensions", [
      { name: "1. Select component", text: "90° LR/SR elbow, 45° LR elbow, equal tee, concentric/eccentric reducer, or cap." },
      { name: "2. Select NPS and schedule", text: "Schedule sets bevel OD, ID, and wall (and scales screening weight)." },
      { name: "3. Read A / E / H", text: "Use center-to-end or overall length for ISO take-out. Confirm bevel prep (typically 37.5°)." },
      { name: "4. Verify and export", text: "Confirm against the governing B16.9 edition and mill cert before cut." },
    ]),
    faq: [
      {
        question: "What is the dimensional difference between 90° LR and 90° SR elbows?",
        answer:
          "**Long-Radius (LR) elbows** have a centerline radius of **1.5 × NPS in inches** (A = 38.1 × NPS in mm). **Short-Radius (SR) elbows** have a centerline radius of **1.0 × NPS in inches** (A = 25.4 × NPS in mm). For example, at NPS 4, LR takeout is 152.4 mm whereas SR takeout is 101.6 mm. SR elbows save space in tight skids but exhibit ~67% higher pressure drop and higher erosion risk.",
      },
      {
        question: "Does the pipe schedule change the center-to-end dimension A of a fitting?",
        answer:
          "**No**. In ASME B16.9, center-to-end dimensions (A, B, C) and overall lengths (H, E) are **governed strictly by Nominal Pipe Size (NPS)**. Changing from Schedule 40 to Schedule 80 or Schedule 160 alters the outside bevel match, wall thickness, inside diameter, and fitting weight, but **the center-to-end takeout remains constant**.",
      },
      {
        question: "What is the standard weld bevel preparation for ASME B16.9 butt-weld fittings?",
        answer:
          "Per **ASME B16.25 / B16.9**, fittings with nominal wall thickness **t ≤ 22 mm (0.88 in)** are machined with a **plain bevel of 37.5° ± 2.5° and a root land of 1.6 mm ± 0.8 mm (1/16 in)**. For thick-wall fittings where t > 22 mm, a compound bevel (37.5° outer angle transitioning to a 10° angle) is required to reduce weld metal volume.",
      },
      {
        question: "What is the pressure rating of an ASME B16.9 buttwelding fitting?",
        answer:
          "Per ASME B16.9 paragraph 2.1, **fittings have the exact same pressure-temperature rating as seamless straight pipe** of matching nominal size, wall thickness (schedule), and material grade. If an NPS 6 Sch 40 fitting is welded to NPS 6 Sch 40 A106-B pipe, the fitting’s allowable working pressure is 100% equivalent to the pipe.",
      },
    ],
  },

  "gasket-dimension-selection": {
    slug: "gasket-dimension-selection",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq">Spiral-wound hero: <i>ID</i> × <i>SE</i><sub>OD</sub> × <i>OR</i><sub>OD</sub> &nbsp;·&nbsp; also <i>IR</i><sub>OD</sub></p>' +
      '<p class="eng-eq">RTJ hero: Ring No. · <i>P</i> · <i>w</i>×<i>h</i> &nbsp;(octagonal R-series screening)</p>' +
      '<p class="eng-plain">ASME B16.20 dimension lookup (this app) — seating Wm / torque → PCC-1 tool</p>',
    formulaLatex: "\\text{SW: } ID \\times SE_{OD} \\times OR_{OD},\\quad \\text{RTJ: Ring}\\cdot P \\cdot (w \\times h)",
    formulaNotes:
      "This calculator looks up ASME B16.20 spiral-wound and RTJ ring dimensions from gasketDimension.json for NPS ½–24 and Class 150–1500. Spiral-wound hero is ID × sealing-element OD × outer-ring OD (inner-ring OD also shown). RTJ hero is ring number, pitch diameter P, and section w×h. It does not compute ASME VIII-1 Appendix 2 Wm1/Wm2 seating loads — use the bolt-torque (PCC-1) calculator for assembly targets. Confirm OEM datasheets before procurement.",
    formulaBadges: [
      { label: "Scope", value: "B16.20 NPS ½–24" },
      { label: "Spiral", value: "ID · IR_OD · SE_OD · OR_OD" },
      { label: "RTJ", value: "Ring No. · P · w×h" },
      { label: "Not in-app", value: "Wm1 / Wm2 seating" },
    ],
    variables: [
      { symbol: "ID", name: "Inner Diameter", definition: "Spiral bore / RTJ ring ID from the lookup row (mm or in)." },
      { symbol: "IR_OD", name: "Inner Ring OD", definition: "Solid inner-ring outside diameter (spiral Style CGI screening)." },
      { symbol: "SE_OD", name: "Sealing Element OD", definition: "Active winding outside diameter (spiral)." },
      { symbol: "OR_OD", name: "Outer / Centering Ring OD", definition: "Guide ring OD — typically near the B16.5 bolt-circle envelope." },
      { symbol: "P", name: "RTJ Pitch Diameter", definition: "Pitch diameter of the octagonal ring (mm or in)." },
      { symbol: "w × h", name: "RTJ Section", definition: "Ring width × height from B16.20." },
      { symbol: "Ring No.", name: "RTJ Ring Number", definition: "R-series designation (e.g. R-37) — must match both flanges." },
    ],
    standards: [
      "ASME B16.20 (Metallic Gaskets for Pipe Flanges)",
      "ASME B16.5 (flange facing / bolt-circle matching)",
      "ASME PCC-1 (assembly / torque — separate calculator)",
      "ASME VIII-1 Appendix 2 (m, y seating — reference only; not computed here)",
    ],
    allowancesAndTolerances: {
      title: "B16.20 Rules Matching This Lookup",
      summary:
        "Dimensions are screening lookups. Winding thickness, hardness, and fill material remain OEM / project items.",
      items: [
        {
          label: "Spiral Compression (typical)",
          value: "4.5 mm → ~3.2 mm compressed",
          description:
            "Common SWG winding compresses to the outer guide-ring thickness under target bolt load — not a calculator output.",
        },
        {
          label: "Inner Ring (CGI)",
          value: "Required on high class / PTFE / large NPS",
          description:
            "B16.20 requires solid inner rings on Class ≥ 900, large NPS, and PTFE-filled spirals to stop inward buckling.",
        },
        {
          label: "Outer Ring Centering",
          value: "OR_OD ≈ bolt-circle envelope",
          description:
            "Outer ring sits inside the studs so the winding stays concentric during makeup.",
        },
        {
          label: "RTJ Hardness",
          value: "Ring softer than groove",
          description:
            "Soft iron / SS rings must be softer than the flange groove so the ring yields, not the facing.",
        },
      ],
    },
    tableCaption:
      "ASME B16.20 Class 150 spiral-wound — matches gasketDimension.json (this app)",
    tableHeaders: ["NPS", "IR_OD (mm)", "SE_OD (mm)", "OR_OD (mm)", "ID (mm)"],
    tableBoldColumns: [1, 2, 3, 4],
    tableRows: [
      ["2\"", "62", "91.9", "120.7", "54"],
      ["4\"", "87", "117.5", "190.5", "78"],
      ["6\"", "111.1", "149.4", "241.3", "98.4"],
      ["8\"", "131", "176", "298.5", "118"],
      ["10\"", "157.2", "215.9", "362", "144.5"],
      ["12\"", "182.6", "241.3", "419.1", "168.1"],
    ],
    tableColumnUnits: [
      { index: 1, quantity: "length", digits: 1 },
      { index: 2, quantity: "length", digits: 1 },
      { index: 3, quantity: "length", digits: 1 },
      { index: 4, quantity: "length", digits: 1 },
    ],
    tableFootnote:
      "Values match data/piping/gasketDimension.json Class 150 spiral rows. NPS 4 OR_OD = 190.5 mm equals the Class 150 bolt circle. Live lookup also covers Classes 300–1500 and RTJ rings.",
    materialLimitations: {
      title: "Fillers, Rings & Reuse (Reference)",
      summary:
        "Material choice is project-driven. This tool only returns geometry for the selected type / NPS / class.",
      items: [
        {
          materialGroup: "316L + Flexible Graphite (typical SWG)",
          temperatureLimit: "Often to ~450 °C in air (higher in inert/steam — OEM)",
          stressLimit: "Common m ≈ 3.0, y ≈ 69 MPa (reference)",
          notes: "Workhorse hydrocarbon / steam filler. Graphite oxidizes in air at high T.",
        },
        {
          materialGroup: "316L + PTFE filler",
          temperatureLimit: "Typically ≤ ~260 °C",
          stressLimit: "Lower y; inner ring required",
          notes: "Chemical service. Creep/relaxation risk — do not omit CGI inner ring.",
        },
        {
          materialGroup: "RTJ Soft Iron / SS Octagonal",
          temperatureLimit: "Per ring metallurgy",
          stressLimit: "High-pressure Class ≥ 300 common",
          notes: "Ring number must match both grooved flanges (e.g. NPS 4 → R-37 in this app).",
        },
        {
          materialGroup: "Reuse",
          temperatureLimit: "N/A",
          stressLimit: "Never reuse SWG / RTJ",
          notes: "Plastic set after makeup — PCC-1 prohibits reuse.",
        },
      ],
      codeRestrictions: [
        "Calculator scope: B16.20 spiral and RTJ dimension lookup only. It does not solve Wm1/Wm2 or bolt torque.",
        "Carry NPS/class into flange dimension and PCC-1 torque tools after selecting the gasket.",
        "Confirm OEM winding ID / RTJ hardness against the mill certificate before PO.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Match the Calculator Default",
      scenario:
        "Reproduce the app default: spiral-wound NPS 4 Class 150 from gasketDimension.json, then spot-check RTJ NPS 4 Class 300.",
      designConditions: [
        { label: "Type", value: "Spiral Wound (ASME B16.20)" },
        { label: "NPS / Class", value: "NPS 4 (DN 100) · Class 150" },
        { label: "Source", value: "data/piping/gasketDimension.json" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Select spiral-wound · NPS 4 · Class 150",
          calculation: "Open the gasket calculator with the default inputs.",
          result: "Type = Spiral Wound · Class 150",
          note: "Class must match the flange, not the pipe schedule.",
        },
        {
          step: "Step 2",
          name: "Read ID, IR_OD, SE_OD, OR_OD",
          calculation:
            "JSON row: ID = 78 mm, IR_OD = 87 mm, SE_OD = 117.5 mm, OR_OD = 190.5 mm.",
          result: "ID = 78 mm · SE_OD = 117.5 mm · OR_OD = 190.5 mm",
          note: "Hero shows ID × SE_OD × OR_OD = 78.000 × 117.500 × 190.500 mm.",
        },
        {
          step: "Step 3",
          name: "Interpret outer ring",
          calculation:
            "OR_OD = 190.5 mm matches the ASME B16.5 Class 150 NPS 4 bolt circle, centering the gasket inside the studs.",
          result: "OR_OD = PCD envelope",
          note: "Field makeup uses the outer ring against the bolt circle.",
        },
        {
          step: "Step 4",
          name: "Optional: Class 300 spiral",
          calculation:
            "Same NPS spiral Class 300: OR_OD increases to 200 mm; ID / SE_OD stay 78 / 117.5 mm in this app table.",
          result: "Class 300 OR_OD = 200 mm",
          note: "Outer ring follows the Class 300 bolt pattern.",
        },
        {
          step: "Step 5",
          name: "Optional: RTJ NPS 4 Class 300",
          calculation:
            "Switch type to RTJ: Ring R-37, P = 123.8 mm, w×h = 11.1 × 17.5 mm, ID = 112.7 mm.",
          result: "R-37 · P = 123.8 mm · 11.1×17.5 mm",
          note: "Ring number must match both RTJ flanges. Torque still uses the PCC-1 tool.",
        },
      ],
      conclusion:
        "Default spiral NPS 4 Class 150: ID 78 mm, SE_OD 117.5 mm, OR_OD 190.5 mm. RTJ NPS 4 Class 300: R-37. Geometry only — seating load and torque are separate tools.",
    },
    ...howTo("How to select gasket dimensions", [
      { name: "1. Select gasket type", text: "Spiral-wound for RF; RTJ when both flanges are grooved." },
      { name: "2. Select NPS and class", text: "Match the flange class, not the pipe schedule." },
      { name: "3. Read hero dimensions", text: "Spiral: ID × SE_OD × OR_OD. RTJ: Ring No. · P · w×h." },
      { name: "4. Carry to torque / flange tools", text: "Confirm OEM datasheet; use PCC-1 for bolt torque and flange lookup for studs." },
    ]),
    faq: [
      {
        question: "Why does the NPS 4 Class 150 outer ring equal 190.5 mm?",
        answer:
          "In this app table, **OR_OD = 190.5 mm** matches the **B16.5 Class 150 NPS 4 bolt circle**, so the centering ring sits inside the studs and keeps the winding concentric.",
      },
      {
        question: "Does this calculator compute gasket seating load Wm?",
        answer:
          "**No.** It is a **B16.20 dimension lookup**. For assembly targets use the **PCC-1 bolt torque** calculator (and project m/y values).",
      },
      {
        question: "Can spiral-wound or RTJ gaskets be reused?",
        answer:
          "**No.** They take a **permanent set** on first makeup. ASME PCC-1 requires a **new gasket** after breakout.",
      },
      {
        question: "What is the difference between R, RX, and BX rings?",
        answer:
          "**Type R** (octagonal/oval) is the B16.5 standard in this lookup. **RX** fits R grooves with pressure energizing. **BX** needs BX grooves (API 6A) and is **not interchangeable** with R.",
      },
    ],
  },

  "valve-cv-sizing": {
    slug: "valve-cv-sizing",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><b>Liquid:</b> <i>Cv</i> = <i>Q</i><sub>gpm</sub> · √(<span class="eng-frac"><span class="eng-num"><i>SG</i></span><span class="eng-den">Δ<i>P</i><sub>psi</sub></span></span>) &nbsp;(metric Q/ΔP converted inside the app)</p>' +
      '<p class="eng-eq"><b>Gas (simplified non-choked):</b> screening form with P1/P2 absolute = gauge + 1 atm</p>' +
      '<p class="eng-eq">Adequate when <i>Cv</i> ≤ <i>Cv</i><sub>sel</sub> &nbsp;·&nbsp; Travel proxy ≈ <i>Cv</i> / <i>Cv</i><sub>sel</sub></p>' +
      '<p class="eng-plain">ISA-75.01 / IEC 60534 US Cv screening — choked FL / xT purchase checks are out of scope</p>',
    formulaLatex: "C_v = Q_{\\text{gpm}} \\sqrt{SG / \\Delta P_{\\text{psi}}},\\quad \\text{adequate if } C_v \\le C_{v,\\text{sel}}",
    formulaNotes:
      "This calculator returns US Cv. Liquid mode converts metric Q (m³/h) and ΔP (bar) to gpm/psi, then Cv = Q_gpm √(SG / ΔP_psi). P1/P2 are gauge; liquid ΔP is the gauge differential. Gas mode converts gauge to absolute with +1.01325 bar (+14.696 psi) and applies a simplified non-choked screening equation — not a full IEC 60534-2-1 purchase calculation with xT / Fγ. Enter catalog Cv,sel to check headroom (adequate when calculated Cv ≤ Cv,sel). Temperature is used for gas only.",
    formulaBadges: [
      { label: "Liquid", value: "Cv = Q_gpm √(SG/ΔP_psi)" },
      { label: "1 m³/h", value: "4.403 GPM" },
      { label: "1 bar", value: "14.504 psi" },
      { label: "Adequate", value: "Cv ≤ Cv,sel" },
    ],
    variables: [
      { symbol: "Cv", name: "Required US Flow Coefficient", definition: "Hero output — US gpm of 60 °F water at 1 psi ΔP capacity needed for the process case." },
      { symbol: "Cv,sel", name: "Catalog / Selected Cv", definition: "Manufacturer full-open rated Cv (Advanced 1.2). Gauge fill ≈ Cv / Cv,sel. Adequate when Cv ≤ Cv,sel." },
      { symbol: "Q", name: "Volumetric Flow Rate", definition: "Liquid: m³/h or GPM. Gas: Nm³/h or SCFH." },
      { symbol: "P1 / P2", name: "Upstream / Downstream Pressure", definition: "Gauge inputs (bar g or psig). Liquid uses ΔP = P1 − P2. Gas converts each to absolute before sizing." },
      { symbol: "ΔP", name: "Valve Differential Pressure", definition: "P1 − P2 (must be > 0). Same magnitude in gauge or absolute for liquid." },
      { symbol: "SG", name: "Specific Gravity", definition: "Liquid: relative to water (= 1.0). Gas: relative to air (= 1.0 for air)." },
      { symbol: "T", name: "Fluid Temperature", definition: "Used in the gas equation. Documented for liquid but not used in the liquid US Cv formula." },
    ],
    standards: [
      "ISA-75.01.01 / IEC 60534-2-1 (Flow Equations for Sizing Control Valves) — screening use",
      "ISA-75.02.01 / IEC 60534-2-3 (Control Valve Capacity Test Procedures)",
      "ASME B16.34 (Valves — Flanged, Threaded, and Welding End)",
    ],
    allowancesAndTolerances: {
      title: "Sizing Rules Matching This Calculator",
      summary:
        "The app computes required Cv and compares it to catalog Cv,sel. Choked-flow, Fp, and noise checks remain site / vendor steps.",
      items: [
        {
          label: "Catalog Headroom (this app)",
          value: "Adequate when Cv ≤ Cv,sel",
          description:
            "Enter the manufacturer full-open Cv as Cv,sel. The result gauge shows calculated Cv as a fraction of Cv,sel (travel proxy, not true stem lift).",
        },
        {
          label: "Typical Selection Practice",
          value: "Cv,sel ≈ 1.25–1.30 × normal Cv",
          description:
            "Field practice often sizes catalog Cv about 25–30% above normal calculated Cv so normal travel sits near mid-range. Not auto-applied — set Cv,sel yourself.",
        },
        {
          label: "Default Liquid Case",
          value: "Q = 120 m³/h, ΔP = 3 bar → Cv ≈ 80.1",
          description:
            "Matches the Quick Reference row and the calculator defaults (with Cv,sel = 100 → adequate).",
        },
        {
          label: "Out of Scope Here",
          value: "FL choked ceiling · Fp · noise · true lift curve",
          description:
            "FL / FF choked checks, piping geometry Fp, and equal-percentage lift maps are not solved in-app. Confirm on the vendor sizing sheet before purchase.",
        },
      ],
    },
    tableCaption: "Liquid Cv screening (SG = 1.0) — same conversion as the calculator (Q m³/h, ΔP bar → US Cv)",
    tableHeaders: ["Q (m³/h)", "ΔP 1 bar", "ΔP 2 bar", "ΔP 3 bar", "ΔP 5 bar"],
    tableRows: [10, 20, 50, 80, 120, 150].map((q) => [
      String(q),
      fmt(liquidCv(q, 1), 2),
      fmt(liquidCv(q, 2), 2),
      fmt(liquidCv(q, 3), 2),
      fmt(liquidCv(q, 5), 2),
    ]),
    tableColumnUnits: [{ index: 0, quantity: "flow", digits: 1 }],
    tableFootnote:
      "Non-choked incompressible screening only. Default calculator case Q = 120 m³/h @ ΔP = 3 bar → Cv ≈ 80.1. Gas mode uses a simplified absolute-pressure form — apply full IEC 60534-2-1 with xT for purchase.",
    materialLimitations: {
      title: "Body / Trim Notes (Selection Context)",
      summary:
        "Material choice is outside the Cv equation but governs whether the calculated ΔP is serviceable.",
      items: [
        {
          materialGroup: "ASTM A216 WCB / WCC (Cast Carbon Steel)",
          temperatureLimit: "-29 °C to 425 °C (-20 °F to 800 °F)",
          stressLimit: "ASME B16.34 class rating for the body",
          notes: "Common for non-corrosive water, hydrocarbons, and utility steam.",
        },
        {
          materialGroup: "ASTM A351 CF8M / CF3M (Cast 316 / 316L)",
          temperatureLimit: "-196 °C to 538 °C (-320 °F to 1000 °F)",
          stressLimit: "Corrosion + cryogenic / hot service per class",
          notes: "Chemicals, amine, sour gas, LNG.",
        },
        {
          materialGroup: "Hardened / Stellite Trim",
          temperatureLimit: "Per trim OEM",
          stressLimit: "High ΔP / flashing / slurry erosion",
          notes: "Use when ΔP is large or flashing is expected — Cv alone does not select trim.",
        },
        {
          materialGroup: "Cr-Mo Alloy Bodies (WC9 / C12A)",
          temperatureLimit: "Elevated steam / hydroprocessing",
          stressLimit: "Creep-resistant class ratings",
          notes: "Boiler feedwater and high-temperature steam headers.",
        },
      ],
      codeRestrictions: [
        "Calculator scope: liquid US Cv and simplified gas Cv, plus Cv ≤ Cv,sel headroom. It does not compute FL choked ΔP, Fp, aerodynamic noise, or stem-lift curves.",
        "If P2 < Pv (flashing) or ΔP approaches choked limits, use anti-cavitation / severe-service trim — not covered here.",
        "Avoid chronic operation at very low opening fractions; set Cv,sel so normal Cv/Cv,sel stays in a controllable band.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Match the Calculator Liquid Path",
      scenario:
        "Reproduce the app default liquid case: Q = 120 m³/h water (SG = 1.0), P1 = 10 bar g, P2 = 7 bar g (ΔP = 3 bar), catalog Cv,sel = 100. Confirm required Cv and adequacy.",
      designConditions: [
        { label: "Fluid", value: "Liquid water, SG = 1.00" },
        { label: "Flow rate (Q)", value: "120 m³/h (≈ 528.3 GPM)" },
        { label: "Inlet / Outlet", value: "P1 = 10 bar g, P2 = 7 bar g" },
        { label: "Differential (ΔP)", value: "3.00 bar (≈ 43.51 psi)" },
        { label: "Catalog Cv,sel", value: "100 (Advanced 1.2)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Convert to US units (as the engine does)",
          calculation:
            "Q_gpm = 120 × 4.402867655 = 528.34 GPM. ΔP_psi = 3 × 14.5037738 = 43.51 psi.",
          result: "Q = 528.34 GPM, ΔP = 43.51 psi",
          note: "Metric inputs are converted before the US Cv equation.",
        },
        {
          step: "Step 2",
          name: "Compute required Cv",
          formula: "C_v = Q_{gpm} \\cdot \\sqrt{SG / \\Delta P_{psi}}",
          calculation: "Cv = 528.34 × √(1.00 / 43.51) = 528.34 × 0.1516 ≈ 80.08.",
          result: "Cv ≈ 80.1",
          note: "Matches the calculator hero for the default liquid case.",
        },
        {
          step: "Step 3",
          name: "Compare to catalog Cv,sel",
          formula: "C_v \\le C_{v,sel}",
          calculation: "80.1 ≤ 100 → Adequate. Travel proxy ≈ 80.1 / 100 = 80%.",
          result: "Adequate (Cv / Cv,sel ≈ 80%)",
          note: "If Cv,sel were 45 (older demo), the app would flag Undersized.",
        },
        {
          step: "Step 4",
          name: "Optional 25% selection margin",
          calculation:
            "1.25 × 80.1 ≈ 100.1 — a catalog Cv near 100–115 is a common pick for this normal case.",
          result: "Cv,sel ≈ 100–115 typical",
          note: "Margin is guidance only; enter the actual manufacturer Cv in 1.2.",
        },
        {
          step: "Step 5",
          name: "Site checks outside the app",
          calculation:
            "Confirm non-choked service with FL / Pv, noise, and equal-percentage lift on the vendor sheet before purchase.",
          result: "Export / copy the sizing sheet",
          note: "Gas cases need absolute P1/P2 and are screening-only here.",
        },
      ],
      conclusion:
        "For Q = 120 m³/h water with ΔP = 3 bar, required Cv ≈ 80.1. With Cv,sel = 100 the calculator reports Adequate at ~80% of catalog capacity — the same path as the live default case.",
    },
    ...howTo("How to size a control-valve Cv", [
      { name: "1. Choose liquid or gas", text: "Liquid uses US Cv after unit conversion. Gas needs absolute P1/P2 (gauge + 1 atm) and temperature." },
      { name: "2. Enter Q, P1, P2", text: "{{pick:Q in m³/h (Nm³/h gas), P1/P2 in bar g.|Q in GPM (SCFH gas), P1/P2 in psig.}} ΔP must be positive." },
      { name: "3. Open 1.2 for SG, T, Cv,sel", text: "Water SG = 1. Set catalog Cv,sel to check Cv ≤ Cv,sel headroom." },
      { name: "4. Read hero Cv and export", text: "If Undersized, raise Cv,sel or reduce required capacity. Export the sizing sheet." },
    ]),
    faq: [
      {
        question: "Does this calculator output Kv or Cv?",
        answer:
          "**US Cv only.** Metric inputs are converted to gpm/psi (or SCFH/psia) before the equation. The relationship **Cv ≈ 1.156 × Kv** is reference context — the app does not display Kv.",
      },
      {
        question: "What is Cv,sel and when is the valve “Adequate”?",
        answer:
          "**Cv,sel** is the manufacturer full-open catalog Cv entered in Advanced 1.2. The result is **Adequate** when **calculated Cv ≤ Cv,sel**. The gauge fill is calculated Cv / Cv,sel (a capacity proxy, not a true stem-lift curve).",
      },
      {
        question: "Are P1 and P2 gauge or absolute?",
        answer:
          "UI inputs are **gauge** (bar g / psig). **Liquid** sizing uses the gauge ΔP directly. **Gas** sizing adds **1 atm** to each pressure before the simplified gas equation.",
      },
      {
        question: "Does the app check choked flow or cavitation?",
        answer:
          "**No.** FL / FF choked ceilings and cavitation indices are **not** computed. Treat the result as **non-choked screening** and confirm severe-service cases on a vendor IEC 60534 worksheet.",
      },
      {
        question: "Why doesn’t liquid Cv use temperature?",
        answer:
          "The liquid US Cv screening equation uses **Q, SG, and ΔP** only. Temperature is shown for documentation and is **required for gas** sizing.",
      },
    ],
  },

  "bolt-torque-tensioning": {
    slug: "bolt-torque-tensioning",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><i>T</i> = <i>T</i><sub>table</sub> · (<span class="eng-frac"><span class="eng-num"><i>K</i></span><span class="eng-den"><i>K</i><sub>ref</sub></span></span>) · <i>f</i><sub>grade</sub> &nbsp;·&nbsp; <i>K</i><sub>ref</sub> = 0.13 (moly)</p>' +
      '<p class="eng-eq">Round 1 = 0.30 <i>T</i> · Round 2 = 0.60 <i>T</i> · Round 3/4 = 1.00 <i>T</i> (star → circular check)</p>' +
      '<p class="eng-plain">ASME PCC-1 screening lookup · ASME B16.5 stud geometry · rescale by nut factor K</p>',
    formulaLatex:
      "T = T_{\\text{table}} \\cdot (K / 0.13) \\cdot f_{\\text{grade}},\\quad \\text{Rounds } 30\\%/60\\%/100\\%/100\\%\\text{ circular}",
    formulaNotes:
      "This calculator looks up ASME B16.5 flange stud size and bolt count, then returns a PCC-1-style moly assembly torque T_table (K_ref = 0.13, A193 B7 baseline). Selected lubricant scales torque as T = T_table × (K / 0.13) × f_grade. A193 B8 / B8M Class 2 use f_grade = 0.85; B7 uses 1.00. The Torque & Passes tab shows Round 1–4 at 30% / 60% / 100% / circular 100% of T. The Sequence tab draws clockwise bolt numbering; Joint Details lists NPS, class, studs, K, and T. First-principles T = K · D · Fp is not solved in-app — confirm critical joints against the owner’s PCC-1 appendix.",
    formulaBadges: [
      { label: "Moly baseline", value: "K_ref = 0.13" },
      { label: "Dry / lightly oiled", value: "K = 0.20" },
      { label: "PTFE coated", value: "K = 0.11" },
      { label: "B8/B8M Class 2", value: "f_grade = 0.85" },
    ],
    variables: [
      { symbol: "T", name: "Target Assembly Torque", definition: "Hero output after K and grade scaling (N·m or ft·lb). Same value labeled Target assembly torque (T) in Joint Details." },
      { symbol: "T_table", name: "Tabulated Moly Torque", definition: "Stored PCC-1-style screening torque for moly K = 0.13 and A193 B7 at the selected NPS × class (see Quick Reference and boltTorque.json)." },
      { symbol: "K", name: "Nut Friction Factor", definition: "Advanced 1.2 presets: moly 0.13, PTFE 0.11, dry / lightly oiled 0.20." },
      { symbol: "K_ref", name: "Table Reference Nut Factor", definition: "Fixed 0.13 — the lubricant assumed when T_table was stored." },
      { symbol: "f_grade", name: "Bolt Grade Factor", definition: "1.00 for A193 B7; 0.85 for A193 B8 / B8M Class 2. Annealed B8 Class 1 is not offered." },
      { symbol: "N", name: "Number of Studs", definition: "Bolt count from the B16.5 joint row (shown in hero badges and Joint Details)." },
      { symbol: "D", name: "Nominal Stud Diameter", definition: "Stud size from the same table row (e.g. 3/4\" / M20 for NPS 6 Class 300)." },
    ],
    standards: [
      "ASME PCC-1 (Guidelines for Pressure Boundary Bolted Flange Joint Assembly)",
      "ASME B16.5 / B16.47 (Flange bolting count & stud size)",
      "ASME B1.1 (Unified Inch Screw Threads)",
      "ASTM A193 / A194 (Alloy and stainless fastener grades)",
    ],
    allowancesAndTolerances: {
      title: "ASME PCC-1 Tightening Procedures & Friction Variance",
      summary:
        "Round fractions and star sequences match this calculator’s Torque & Passes / Sequence tabs. Torque remains a screening method — verify critical joints per project procedure.",
      items: [
        {
          label: "PCC-1 4-Round Pattern (this app)",
          value: "Round 1 30% → Round 2 60% → Round 3 100% star → Round 4 100% circular",
          description:
            "Rounds 1–3 follow the joint star/cross sequence from the data table; Round 4 is a continuous circular check at 100% T until nuts stop rotating.",
        },
        {
          label: "Nut Factor (K) Scaling",
          value: "T = T_table × (K / 0.13) × f_grade",
          description:
            "Changing from moly (0.13) to dry (0.20) raises required wrench torque by ~54% for the same target preload. Applying a moly table value on dry threads under-loads the gasket.",
        },
        {
          label: "Thread Engagement & Extension",
          value: "Full nut + 2 to 3 exposed threads",
          description:
            "Per ASME PCC-1, studs should fully engage nuts with a few exposed threads for inspection — not computed by this tool.",
        },
        {
          label: "Flange Alignment Limits",
          value: "Centerline / parallelism per procedure",
          description:
            "Align flanges before torquing. Misalignment causes uneven gasket crush and stud bending; outside calculator scope.",
        },
      ],
    },
    tableCaption:
      "Quick reference — NPS 2\"–12\", Class 150 / 300 moly torque (K = 0.13, A193 B7) — identical to calculator T_table",
    tableHeaders: [
      "NPS",
      "Class 150 (N·m)",
      "Class 150 studs",
      "Class 300 (N·m)",
      "Class 300 studs",
    ],
    tableAllNumeric: false,
    tableTorqueNmColumns: [1, 3],
    tableRows: [
      ["2\"", "135", "4 × 5/8\"", "190", "8 × 5/8\""],
      ["4\"", "190", "8 × 5/8\"", "340", "8 × 3/4\""],
      ["6\"", "271", "8 × 3/4\"", "366", "12 × 3/4\""],
      ["8\"", "340", "8 × 3/4\"", "475", "12 × 7/8\""],
      ["10\"", "434", "12 × 7/8\"", "824", "16 × 1\""],
      ["12\"", "434", "12 × 7/8\"", "1098", "16 × 1-1/8\""],
    ],
    tableFootnote:
      "Lookup also covers Class 600 (e.g. NPS 6 Class 600 → 1037 N·m, 12 × 1\") and NPS ½\"–24\". Values match data/mechanical/boltTorque.json. Dry or PTFE rescale T ∝ K/0.13; B8/B8M Class 2 × 0.85. Unit toggle converts the N·m columns to ft·lb.",
    materialLimitations: {
      title: "Fastener Material Grades & Preload Limits",
      summary:
        "Grade selection changes allowable preload. This calculator offers B7 and strain-hardened B8/B8M Class 2 only — never apply B7 table torque to annealed B8 Class 1.",
      items: [
        {
          materialGroup: "ASTM A193 B7 / A194 2H (calculator baseline)",
          temperatureLimit: "-29 °C to 427 °C (-20 °F to 800 °F)",
          stressLimit: "Sy ≈ 724 MPa (105 ksi); f_grade = 1.00",
          notes: "Default in Advanced 1.2. All T_table values assume B7 with moly K = 0.13.",
        },
        {
          materialGroup: "ASTM A320 L7 / A194 7 (low-temperature)",
          temperatureLimit: "-101 °C to 343 °C (-150 °F to 650 °F)",
          stressLimit: "Sy ≈ 724 MPa (105 ksi) when impact-qualified",
          notes: "Not a separate dropdown — use B7 outputs only when the project specifies equivalent preload.",
        },
        {
          materialGroup: "ASTM A193 B8 / B8M Class 2 (in-app option)",
          temperatureLimit: "-196 °C to 538 °C (-320 °F to 1000 °F)",
          stressLimit: "f_grade = 0.85 × B7 T_table (e.g. NPS 6 Cl 300 → 311 N·m)",
          notes: "Strain-hardened stainless option in Advanced 1.2. Confirm owner appendix before use.",
        },
        {
          materialGroup: "ASTM A193 B8 / B8M Class 1 (annealed — not offered)",
          temperatureLimit: "-196 °C to 538 °C (-320 °F to 1000 °F)",
          stressLimit: "Sy ≈ 207 MPa (30 ksi) — far below B7",
          notes: "Do not use B7 or Class 2 calculator outputs on Class 1 studs; they will yield.",
        },
      ],
      codeRestrictions: [
        "Calculator scope: NPS × class table lookup, K scaling, grade factor, Round 1–4 torque targets, and star diagram. It does not solve Fp from σb·As or check gasket Wm.",
        "For studs about D ≥ 1-1/2\" or Class 900+ / critical service, prefer hydraulic tensioning per project PCC-1 appendix.",
        "Lubricate threads and nut faces. Dry makeup with a moly torque value under-compresses the gasket.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: NPS 6 Class 300 — Match the Calculator",
      scenario:
        "Follow the same UI path: select NPS 6 / Class 300, keep moly K = 0.13 and A193 B7, read T from the hero card, then open Torque & Passes for Round 1–4. Finally rescale for dry lubricant (K = 0.20) in Advanced 1.2.",
      designConditions: [
        { label: "Nominal Flange Size", value: "NPS 6 (DN 150) Class 300" },
        { label: "Fastener Quantity & Size", value: "N = 12 × 3/4\" (M20) — Joint Details / B16.5" },
        { label: "Stud Material Grade", value: "ASTM A193 B7 (f_grade = 1.00)" },
        { label: "Baseline Lubricant", value: "Moly anti-seize (K = 0.13 = K_ref)" },
        { label: "Alternate Lubricant (Step 4)", value: "Dry / lightly oiled (K = 0.20)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Read tabulated moly torque (T_table)",
          calculation:
            "Calculator / boltTorque.json for NPS 6 Class 300: T_table = 366 N·m (270 ft·lb), 12 × 3/4\" studs.",
          result: "T_table = 366 N·m",
          note: "Hero shows Target Assembly Torque (T) = 366 N·m with badges for K, grade, and studs.",
        },
        {
          step: "Step 2",
          name: "Apply K and grade factors",
          formula: "T = T_{table} \\cdot (K / 0.13) \\cdot f_{grade}",
          calculation: "K = 0.13, f_grade = 1.00 → T = 366 × 1 × 1 = 366 N·m.",
          result: "T = 366 N·m (270 ft·lb)",
          note: "Switching to B8 Class 2 multiplies by 0.85 → 311 N·m.",
        },
        {
          step: "Step 3",
          name: "Read Round 1–4 on Torque & Passes",
          formula: "0.30T,\\ 0.60T,\\ 1.00T,\\ 1.00T\\ (circular)",
          calculation:
            "Round 1 = 0.30 × 366 = 110 N·m; Round 2 = 0.60 × 366 = 220 N·m; Round 3/4 = 366 N·m. Sequence tab: 1-7-4-10-2-8-5-11-3-9-6-12.",
          result: "R1 = 110 N·m, R2 = 220 N·m, R3/R4 = 366 N·m",
          note: "Whole-N·m rounding matches formatTorque in the engine.",
        },
        {
          step: "Step 4",
          name: "Rescale for dry lubricant (K = 0.20)",
          formula: "T_{dry} = 366 \\cdot (0.20 / 0.13)",
          calculation: "T_dry = 366 × 1.5385 ≈ 563 N·m (415 ft·lb).",
          result: "T_dry = 563 N·m",
          note: "Same preload intent needs higher wrench torque when friction rises.",
        },
        {
          step: "Step 5",
          name: "Export / site confirmation",
          calculation:
            "Copy or export T, K, grade, studs, and star sequence. Confirm against the owner’s PCC-1 appendix and calibrated wrench certificate.",
          result: "Joint checklist ready for the work pack",
          note: "Hand calc T = K·D·Fp may differ from screening tables — project appendix governs.",
        },
      ],
      conclusion:
        "NPS 6 Class 300 with moly + B7 returns T = 366 N·m and Rounds 110 / 220 / 366 / 366 N·m on the 12-bolt star. Dry makeup (K = 0.20) scales to 563 N·m — do not apply the moly number to dry threads.",
    },
    ...howTo("How to apply flange bolt torque", [
      { name: "1. Select NPS and class", text: "Match the B16.5 flange (½\"–24\" × 150 / 300 / 600)." },
      { name: "2. Open 1.2 for K and grade", text: "Default moly K = 0.13 and A193 B7. Dry uses K = 0.20; B8/B8M Class 2 uses 0.85×." },
      { name: "3. Read Torque & Passes", text: "Round 1–4 at 30% / 60% / 100% / circular 100% of target T." },
      { name: "4. Use the Sequence diagram", text: "Numbering is clockwise from top; follow the joint sequence text under the diagram." },
      { name: "5. Check Joint Details & export", text: "Confirm studs, K, and T, then export / copy the checklist sheet." },
    ]),
    faq: [
      {
        question: "Why is bolt torque governed by ASME PCC-1 rather than ASME B16.5?",
        answer:
          "**ASME B16.5** defines flange dimensions, bolt circles, and stud counts. **ASME PCC-1** covers bolted flange joint assembly — nut factors and multi-pass sequences. This calculator combines B16.5 geometry with PCC-1-style screening torques.",
      },
      {
        question: "How does this calculator apply the nut factor K?",
        answer:
          "Stored torques assume **moly K_ref = 0.13**. The engine computes **T = T_table × (K / 0.13) × f_grade**. Dry / lightly oiled uses **K = 0.20**; PTFE uses **0.11**. Using a moly table value on dry threads under-loads the joint.",
      },
      {
        question: "Does the app offer ASTM A193 B8 Class 1?",
        answer:
          "**No.** Options are **B7** and **B8 / B8M Class 2** (0.85× factor). Annealed **B8 Class 1** has much lower yield (~207 MPa) — never apply B7 table torque to Class 1 studs.",
      },
      {
        question: "Why doesn’t the hero torque match T = K·D·Fp from a hand calc?",
        answer:
          "The app is a **table lookup + K/grade rescale**, not a live Appendix O solver. Screening tables embed owner-style target stress assumptions. Use the worked example path (NPS 6 Class 300 → **366 N·m**) and confirm critical joints against the project PCC-1 appendix.",
      },
      {
        question: "What do the three result tabs show?",
        answer:
          "**Torque & Passes** — hero T plus Round 1–4. **Bolt Sequence Diagram** — clockwise numbering and the star/cross text. **Joint Details** — NPS, class, stud size, count, grade, K, and T.",
      },
      {
        question: "When is hydraulic bolt tensioning preferred?",
        answer:
          "Prefer tensioning on **large studs (about D ≥ 1-1/2\")**, **high classes (900+)**, or **critical services**. Tensioners apply axial load without relying on nut factor K.",
      },
    ],
  },

  "blind-flange-thickness": {
    slug: "blind-flange-thickness",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><b>Permanent Blind:</b> <i>t</i><sub>m</sub> = <i>d</i> · √(<span class="eng-frac"><span class="eng-num"><i>C</i> · <i>P</i></span><span class="eng-den"><i>S</i> · <i>E</i></span></span>) + <i>c</i> &nbsp; (<i>C</i> = 0.30, <i>c</i> ≥ 3.0 mm)</p>' +
      '<p class="eng-eq"><b>Hydrotest Blank:</b> <i>t</i><sub>m</sub> = <i>d</i> · √(<span class="eng-frac"><span class="eng-num"><i>C</i> · <i>P</i><sub>t</sub></span><span class="eng-den"><i>S</i><sub>amb</sub> · <i>E</i></span></span>) &nbsp; (<i>C</i> = 0.30, <i>c</i> = 0.0 mm)</p>' +
      '<p class="eng-plain">ASME B31.3 Para. 304.4.1 &amp; ASME BPVC Section VIII Div 1 UG-34 / ASME B31.3 Ch. VI</p>',
    formulaLatex:
      "t_{\\text{m, perm}} = d \\cdot \\sqrt{\\frac{C \\cdot P}{S \\cdot E}} + c,\\quad t_{\\text{m, test}} = d \\cdot \\sqrt{\\frac{C \\cdot P_t}{S_{\\text{amb}} \\cdot E}},\\quad C = 0.30",
    formulaNotes:
      "ASME B31.3 Para. 304.4.1 and ASME BPVC Section VIII Div 1 UG-34 define the minimum required design thickness for flat unstayed circular blind covers bolted with ring or full-face gaskets. The structural attachment factor C = 0.30 accounts for edge-clamping moments on bolted flanges with gasket reaction within the bolt circle. For permanent operating blinds, allowable stress S is evaluated at design temperature and corrosion allowance c is added (typically 3.0 mm). For temporary hydrotest blanks (ASME B31.3 Chapter VI), test pressure Pt is applied at ambient temperature with S_amb and corrosion allowance c = 0.0 mm.",
    formulaBadges: [
      { label: "ASME B31.3 304.4.1", value: "C = 0.30" },
      { label: "Permanent Blind", value: "c ≥ 3.0 mm / 0.125 in" },
      { label: "Hydrotest Blank", value: "c = 0" },
      { label: "Seamless Plate", value: "E = 1.00" },
    ],
    variables: [
      { symbol: "t_m", name: "Required Minimum Thickness", definition: "Minimum design thickness of the flat blind plate or temporary test blank (mm or in). Calculator safety margin compares recommended plate to t_m — not pipe t_nom_req." },
      { symbol: "d", name: "Gasket Contact / Reaction Diameter", definition: "Mean gasket reaction diameter or ASME B16.5 Raised Face (RF) contact diameter (mm or in)." },
      { symbol: "P", name: "Internal Design Pressure", definition: "Maximum internal design pressure at operating temperature for permanent blinds (MPa or psi)." },
      { symbol: "P_t", name: "Hydrotest Test Pressure", definition: "Shop or field hydrostatic/pneumatic test pressure applied to temporary test blanks (MPa or psi)." },
      { symbol: "S", name: "Design Allowable Stress", definition: "Basic allowable stress of plate material at design temperature. Calculator A516-70 design preset ≈ 125 MPa / 18,100 psi." },
      { symbol: "S_amb", name: "Ambient Allowable Stress", definition: "Ambient allowable for hydrotest blanks. Calculator binds A516-70 as 138 MPa / 20,000 psi (20.0 ksi)." },
      { symbol: "E", name: "Quality / Joint Factor", definition: "Weld joint efficiency factor (E = 1.00 for forged or seamless rolled plate stock)." },
      { symbol: "C", name: "Attachment Factor", definition: "Empirical structural attachment factor (C = 0.30 for bolted flat heads per ASME UG-34). Distinct from lowercase corrosion allowance c." },
      { symbol: "c", name: "Corrosion Allowance", definition: "Added after structural pressure term (typically ≥ 3.0 mm / 0.125 in permanent; 0 for hydrotest)." },
    ],
    standards: [
      "ASME B31.3 (Process Piping) · Para. 304.4.1 (Closure Plates) & Chapter VI (Inspection & Testing)",
      "ASME BPVC Section VIII, Division 1 · UG-34 (Unstayed Flat Heads and Covers)",
      "ASME B16.5 (Pipe Flanges & Flanged Fittings - Raised Face Dimensions)",
      "ASTM A516 / ASTM A36 / ASTM A240 (Carbon & Stainless Steel Plate Specs)",
    ],
    allowancesAndTolerances: {
      title: "Design Rules: Permanent Blind vs Temporary Hydrotest Blank",
      summary:
        "Permanent process blinds require full corrosion allowance and thermal stress derating, while temporary hydrotest blanks operate at ambient temperature with zero corrosion allowance.",
      items: [
        {
          label: "Permanent Blind Corrosion Allowance",
          value: "c = 3.0 mm (0.125 in) Standard",
          description:
            "For continuous plant operation, carbon steel blind plates must include the piping specification corrosion allowance (typically 1.5 to 3.0 mm) to protect structural integrity throughout the 25-year design life.",
        },
        {
          label: "Temporary Test Blank Rules",
          value: "c = 0.0 mm at Ambient Temperature",
          description:
            "Per ASME B31.3 Chapter VI, temporary test blinds and spades installed solely for hydrostatic/pneumatic testing operate with non-corrosive test fluid for short durations; setting c = 0.0 mm significantly reduces required plate stock thickness.",
        },
        {
          label: "Plate Mill Under-Tolerance (ASTM A20)",
          value: "-0.3 mm (-0.01 in) Allowance",
          description:
            "Rolled carbon steel plate (ASTM A516 Gr. 70 / A36) has an allowable mill under-thickness tolerance of 0.3 mm. Selected commercial plate stock must exceed calculated t_m by at least 0.3 mm.",
        },
        {
          label: "Gasket Contact Reaction Diameter (d)",
          value: "ASME B16.5 Raised Face (RF) OD",
          description:
            "In flanged joints with ring gaskets, d is taken as the ASME B16.5 raised-face diameter or mean gasket contact circle. Using pipe ID is unconservative for bolting moments.",
        },
      ],
    },
    tableCaption:
      "Hydrotest Temporary Blank Thickness Lookup: ASME B16.5 RF (c = 0 mm, A516-70 S = 138 MPa, C = 0.30)",
    tableHeaders: [
      "NPS",
      "RF Dia d (mm)",
      "Cl 150# Pt≈2.93 MPa tm (Plate)",
      "Cl 300# Pt≈7.71 MPa tm (Plate)",
      "Cl 600# Pt≈15.3 MPa tm (Plate)",
    ],
    tableBoldColumns: [2, 3, 4],
    tableRows: [
      ["2\"", "92.1", "7.4 mm (8T)", "12.0 mm (14T)", "16.8 mm (18T)"],
      ["3\"", "127.0", "10.3 mm (12T)", "16.5 mm (18T)", "23.2 mm (25T)"],
      ["4\"", "157.2", "12.7 mm (14T)", "20.4 mm (22T)", "28.7 mm (30T)"],
      ["6\"", "215.9", "17.4 mm (18T)", "28.0 mm (28T)", "39.4 mm (40T)"],
      ["8\"", "269.9", "21.8 mm (25T)", "35.0 mm (35T)", "49.3 mm (50T)"],
      ["10\"", "323.8", "26.2 mm (28T)", "42.0 mm (45T)", "59.1 mm (60T)"],
      ["12\"", "381.0", "30.8 mm (32T)", "49.4 mm (50T)", "69.6 mm (70T)"],
      ["16\"", "469.9", "38.0 mm (40T)", "60.9 mm (65T)", "85.8 mm (90T)"],
      ["20\"", "584.2", "47.2 mm (50T)", "75.7 mm (80T)", "106.7 mm (110T)"],
      ["24\"", "692.2", "55.9 mm (60T)", "89.7 mm (90T)", "126.4 mm (130T)"],
    ],
    tableColumnUnits: [
      { index: 1, quantity: "length", digits: 3 },
      { index: 2, quantity: "length", digits: 3 },
      { index: 3, quantity: "length", digits: 3 },
      { index: 4, quantity: "length", digits: 3 },
    ],
    tableFootnote:
      "Hydrotest pressure Pt ≈ 1.5 × ambient rating (Group 1.1): 150# ≈ 2.93 MPa (29.3 bar), 300# ≈ 7.71 MPa (77.1 bar), 600# ≈ 15.32 MPa (153.2 bar). Calculated with C = 0.30, E = 1.00, S_amb = 138 MPa (A516-70), c = 0.0 mm. Parentheses show recommended commercial plate stock (next size ≥ t_m).",
    materialLimitations: {
      title: "Plate Material Selection & Operating Temperature Limitations",
      summary:
        "Selecting the correct plate grade determines structural safety. Permanent process blinds require high-temperature derating, while temporary test blanks prioritize cost and toughness.",
      items: [
        {
          materialGroup: "ASTM A516 Gr. 70 (PV Quality Carbon Steel)",
          temperatureLimit: "-29 °C to 427 °C (-20 °F to 800 °F)",
          stressLimit: "S_amb = 138.0 MPa (20.0 ksi) @ 20 °C; 125.0 MPa @ 200 °C",
          notes: "Industry gold standard for fabricated permanent blinds, spectacle blinds, and high-pressure temporary hydrotest blanks.",
        },
        {
          materialGroup: "ASTM A36 / SS400 (Structural Carbon Steel)",
          temperatureLimit: "-20 °C to 343 °C (-4 °F to 650 °F)",
          stressLimit: "S_amb = 115.0 MPa (16.6 ksi) @ 20 °C; 100.0 MPa @ 200 °C",
          notes: "Widely stocked and economical for temporary hydrotest blanks; lower allowable stress requires ~10% thicker plate than A516-70.",
        },
        {
          materialGroup: "ASTM A240 Gr. 304 / 304L (Austenitic Stainless)",
          temperatureLimit: "-196 °C to 538 °C (-320 °F to 1000 °F)",
          stressLimit: "S_amb = 138 MPa (20.0 ksi / 20,000 psi) @ 20 °C; 104 MPa @ 200 °C",
          notes: "Mandatory for stainless/alloy lines where carbon steel blanks could cause galvanic contamination or corrosion.",
        },
        {
          materialGroup: "ASTM A240 Gr. 316 / 316L (Molybdenum Stainless)",
          temperatureLimit: "-196 °C to 538 °C (-320 °F to 1000 °F)",
          stressLimit: "S_amb = 138 MPa (20.0 ksi / 20,000 psi) @ 20 °C; 110 MPa @ 200 °C",
          notes: "Used in chloride, acid, and offshore marine process systems.",
        },
      ],
      codeRestrictions: [
        "Prohibition of Simply-Supported Plate Factor: Using C = 0.1875 (3/16) instead of C = 0.30 dangerously underestimates bolt-prying bending moments, violating ASME B31.3 Para. 304.4.1 and leading to edge deformation.",
        "Temporary Blind Identification & Removal: All temporary hydrotest blanks must have an extended paddle handle painted bright red/yellow, stamped with size/class, and logged on the P&ID blind register for mandatory removal prior to commissioning.",
        "Gasket Sealing Surface Quality: Fabricated flat plate blinds must have a phonographic serrated finish (Ra 3.2 ~ 6.3 µm / 125 ~ 250 µin) in the gasket contact zone to prevent spiral-wound gasket blowout under test pressure.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Temporary Hydrotest Blank Thickness for NPS 6 Class 300 Line",
      scenario:
        "Calculate the minimum required temporary test blank thickness and select standard commercial steel plate stock for shop hydrostatic testing of an NPS 6 (DN 150) Class 300 piping spool at a test pressure of Pt = 7.71 MPa (77.1 bar / 1,118 psi) using ASTM A516 Gr. 70 plate at ambient temperature (c = 0.0 mm). Pt matches ASME B16.5 Group 1.1 Class 300 hydrotest rating used by this calculator.",
      designConditions: [
        { label: "Nominal Pipe Size", value: "NPS 6 (DN 150)" },
        { label: "Flange Pressure Rating", value: "ASME B16.5 Class 300 Raised Face" },
        { label: "Test Condition", value: "Temporary Hydrostatic Test (ASME B31.3 Ch. VI)" },
        { label: "Hydrotest Pressure (Pt)", value: "7.71 MPa (77.1 bar / 1,118 psi)" },
        { label: "Plate Material", value: "ASTM A516 Gr. 70 (Ambient S_amb = 138 MPa / 20,000 psi)" },
        { label: "Joint Quality Factor (E)", value: "E = 1.00 (Seamless rolled plate)" },
        { label: "Attachment Factor (C)", value: "C = 0.30 (ASME UG-34 Bolted Flat Cover)" },
        { label: "Corrosion Allowance (c)", value: "0.0 mm (Temporary Test Blank)" },
        { label: "Gasket Contact Dia (d)", value: "215.9 mm (ASME B16.5 6\" Class 300 RF OD)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Determine Hydrotest Pressure & Material Parameters",
          calculation:
            "Hydrotest rating Pt ≈ 1.5 × ambient Class 300 working pressure = 77.1 bar = 7.71 MPa. For ASTM A516 Gr. 70 at ambient: S_amb = 138 MPa (20,000 psi). E = 1.00, C = 0.30, c = 0.0 mm.",
          result: "Pt = 7.71 MPa, S_amb = 138 MPa, E = 1.00, C = 0.30, c = 0.0 mm",
          note: "Temporary test blanks use c = 0.0 mm since water test duration is brief and non-corrosive.",
        },
        {
          step: "Step 2",
          name: "Calculate Dimensionless Stress & Pressure Ratio",
          formula: "\\text{Ratio} = \\frac{C · P_t}{S_{\\text{amb}} · E}",
          calculation:
            "Ratio = (0.30 × 7.71 MPa) / (138 MPa × 1.00) = 2.313 / 138 = 0.016761",
          result: "Ratio = 0.016761, \\sqrt{\\text{Ratio}} = 0.12946",
          note: "Square-root factor represents elastic bending deflection under uniform hydrostatic load.",
        },
        {
          step: "Step 3",
          name: "Calculate Minimum Required Test Blank Thickness (t_m)",
          formula: "t_{\\text{m}} = d · \\sqrt{\\frac{C · P_t}{S_{\\text{amb}} · E}} + c",
          calculation:
            "t_m = 215.9 mm × 0.12946 + 0.0 mm = 27.95 mm (1.100 in)",
          result: "t_m = 27.95 mm (1.100 in)",
          note: "Pure structural thickness required to resist edge bending moments at 7.71 MPa test pressure.",
        },
        {
          step: "Step 4",
          name: "Apply Plate Mill Under-Tolerance Verification",
          calculation:
            "Per ASTM A20, rolled carbon steel plate under-tolerance is about 0.3 mm. Minimum plate thickness to procure = 27.95 mm + 0.30 mm = 28.25 mm.",
          result: "t_{\\text{procure, min}} = 28.25 mm",
          note: "Procured plate stock should account for manufacturing rolling tolerances when the next stock size is tight.",
        },
        {
          step: "Step 5",
          name: "Select Commercial Plate Stock",
          calculation:
            "Commercial stocks include 25 / 28 / 30 / 32 mm. This calculator selects the next size ≥ t_m → 28 mm (28T). With ASTM A20 +0.3 mm, some yards prefer 30 mm (30T).",
          result: "Calculator recommendation: 28 mm (28T); yard practice may use 30T",
          note: "Safety margin vs t_m = (t_plate / t_m − 1) × 100%. Stamp paddle 'TEST BLANK NPS 6 CL300'.",
        },
      ],
      conclusion:
        "For an NPS 6 Class 300 hydrotest at 7.71 MPa (77.1 bar), ASME B31.3 / UG-34 gives t_m ≈ 27.95 mm. The calculator recommends 28 mm (28T) A516 Gr. 70 plate; applying ASTM A20 mill pad may justify stepping to 30 mm (30T).",
    },
    ...howTo("How to calculate blind flange & hydrotest blank thickness", [
      { name: "1. Select design mode", text: "Choose 'Permanent Design' (c ≥ 3mm, design temp) or 'Hydrotest Temporary' (c = 0mm, ambient temp)." },
      { name: "2. Select flange size & class", text: "Select NPS 1/2\" to 24\" and Class 150# to 2500# to auto-populate gasket contact diameter d." },
      { name: "3. Input pressure & plate material", text: "Enter operating pressure P or test pressure Pt, and choose plate material (A516-70, A36, SS304/316)." },
      { name: "4. Read required t_m & commercial plate", text: "Review calculated minimum thickness t_m and recommended commercial plate size (e.g. 16T, 25T, 30T)." },
    ]),
    faq: [
      {
        question: "What is the key difference between a Permanent Operating Blind and a Temporary Hydrotest Blank?",
        answer:
          "**Permanent Blinds** remain in continuous service throughout the plant life; they must account for **elevated temperature stress derating** (lower S) and include full **corrosion allowance (c ≥ 3.0 mm)**. **Temporary Hydrotest Blanks** are installed solely during pre-commissioning testing with treated water; they are evaluated at **ambient temperature (higher S_amb)** with **zero corrosion allowance (c = 0.0 mm)**, resulting in approximately **20% to 40% thinner plates**.",
      },
      {
        question: "Why is attachment factor C = 0.30 used instead of simply-supported 3/16 (0.1875)?",
        answer:
          "The factor **3/16 (0.1875)** applies only to ideal simply-supported circular plates under uniform load with zero edge restraint. In real bolted pipe flanges, **bolt pre-tensioning creates intense edge-bending moments and prying forces**. ASME Section VIII Div 1 UG-34 and ASME B31.3 mandate **C = 0.30**, which results in approximately **26% thicker plates** to prevent catastrophic edge yielding.",
      },
      {
        question: "Can structural steel plate (ASTM A36 / SS400) be used for hydrotest blanks?",
        answer:
          "**Yes**. ASTM A36 / SS400 plate is widely used for temporary test blanks due to high availability and low cost. However, because A36 has a lower allowable stress (**S_amb = 115 MPa vs 138 MPa for A516-70**), the calculated blank thickness will be approximately **10% thicker**. Always verify calculated t_m against available plate stock.",
      },
      {
        question: "What diameter should be used for variable 'd' in the blind calculation?",
        answer:
          "Per **ASME UG-34**, **d is the mean gasket reaction diameter** (or the ASME B16.5 Raised Face outer diameter for standard RF ring gaskets). For screening purposes, using pipe ID is an acceptable initial check for pressure flexure, but the full gasket reaction diameter d must be used for final fabrication sizing.",
      },
    ],
  },
  "metal-weight-cost": {
    slug: "metal-weight-cost",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><i>m</i> = ρ · <i>V</i> &nbsp;·&nbsp; <i>V</i><sub>pipe</sub> = π · (<i>OD</i> − <i>t</i>) · <i>t</i> · <i>L</i> &nbsp;·&nbsp; <i>V</i><sub>plate</sub> = <i>L</i> · <i>W</i> · <i>t</i></p>' +
      '<p class="eng-eq"><i>V</i><sub>bar</sub> = <span class="eng-frac"><span class="eng-num">π</span><span class="eng-den">4</span></span><i>D</i>² · <i>L</i> &nbsp;·&nbsp; Cost = <i>m</i> · Price<sub>/kg</sub> &nbsp;(or <i>m</i><sub>ton</sub> · Price<sub>/ton</sub>)</p>' +
      '<p class="eng-plain">ISO 80000-1 Quantities &amp; ASME B36.10M / ASTM Structural Mass Evaluation</p>',
    formulaLatex: "m = \\rho V,\\quad V_{\\text{pipe}} = \\pi(OD-t)t L,\\quad V_{\\text{plate}} = L \\cdot W \\cdot t,\\quad \\text{Cost} = m \\cdot \\text{Price}_{\\text{unit}}",
    formulaNotes:
      "Metallic raw material mass is the product of volume V and material density ρ at room temperature (20 °C). Hollow cylindrical pipe volume uses the thin/thick-wall annular identity V = π(OD - t)t L (derived from π/4(OD² - ID²)L). Metric dimensions in millimetres convert to metres before mass computation (1 m³ = 10⁹ mm³). Procurement expenditures scale directly with unit commodity price per kilogram or metric ton.",
    formulaBadges: [
      { label: "Carbon Steel", value: "7,850 kg/m³" },
      { label: "304 / 316 Stainless", value: "8,000 kg/m³" },
      { label: "Duplex 2205", value: "7,800 kg/m³" },
      { label: "Aluminum 6061", value: "2,700 kg/m³" },
    ],
    variables: [
      { symbol: "m", name: "Calculated Metal Mass", definition: "Total theoretical static bare steel/alloy mass (kg, metric tons, or lbs)." },
      { symbol: "ρ", name: "Material Density", definition: "Standard mass per unit volume at 20 °C (e.g. CS = 7,850 kg/m³, SS = 8,000 kg/m³, Al = 2,700 kg/m³)." },
      { symbol: "V", name: "Geometric Volume", definition: "Net solid volume of the hollow pipe, plate rectangular prism, or solid round bar (m³ or in³)." },
      { symbol: "OD / ID", name: "Outside / Inside Diameter", definition: "Pipe or tube outer diameter and inner flow bore per ASME B36.10M / B36.19M (mm or in)." },
      { symbol: "t", name: "Material Thickness / Wall", definition: "Plate thickness or nominal pipe schedule wall thickness (mm or in)." },
      { symbol: "L / W", name: "Length / Width Dimensions", definition: "Linear cut length of pipe/bar and planar width/length of plate stock (m or mm)." },
      { symbol: "Cost", name: "Total Material Purchase Cost", definition: "Estimated raw material procurement expenditure based on unit price per mass ($, €, or ₩)." },
    ],
    standards: [
      "ISO 80000-1 (Quantities and Units - General Physical Mass)",
      "ASME B36.10M / B36.19M (Standard Dimensions & Weights of Steel Pipe)",
      "ASTM A6 / A20 (General Requirements for Rolled Structural Steel & Plate)",
      "EN 10025 / ASTM A36 / A516 (Standard Specification for Structural Steel)",
    ],
    allowancesAndTolerances: {
      title: "Manufacturing Tolerances, Scrap Allowances & Coatings",
      summary:
        "Field fabrication requires adding scrap margins, accounting for plate mill under-thicknesses, and incorporating external protective coating masses.",
      items: [
        {
          label: "ASME B36.10M Pipe Weight Tolerance",
          value: "±3.5% (Carload) / ±10% (Single Length)",
          description:
            "Seamless and welded steel pipe manufacturing allows a weight variance of ±3.5% on bulk carloads and +10% / -3.5% on individual pipe sticks due to wall thickness mill variations.",
        },
        {
          label: "Plate Mill Thickness Tolerance (ASTM A20)",
          value: "-0.30 mm Under-Gauge Permitted",
          description:
            "Structural and pressure vessel steel plates permit a maximum mill under-thickness of 0.30 mm (0.01 in); actual plate weights are typically 1% ~ 2% lighter than theoretical nominal gauge.",
        },
        {
          label: "Fabrication Scrap & Weld Metal Margin",
          value: "+3% to +5% on MTO Takeoff",
          description:
            "When generating piping Bill of Materials (BOM) or structural MTOs, add 3% to 5% extra weight allowance to account for weld root/cap reinforcement and cutting drop scrap.",
        },
        {
          label: "External Coating & Internal Lining",
          value: "3LPE: ~930 kg/m³, Concrete: ~2,200 kg/m³",
          description:
            "Theoretical steel weight excludes external anti-corrosion 3LPE/FBE coating, thermal insulation (calcium silicate / mineral wool), and internal cement mortar linings, which must be added for crane rigging plans.",
        },
      ],
    },
    tableCaption: "Carbon steel (7850 kg/m³) screening masses",
    tableHeaders: ["Item", "Size", "Mass"],
    tableRows: [
      ["Plate", "3000 × 1500 × 12 mm", "423.9 kg"],
      ["Plate", "2000 × 1000 × 10 mm", "157.0 kg"],
      ["Pipe Sch 40", "NPS 4 (L = 6 m)", "96.4 kg"],
      ["Pipe Sch 40", "NPS 6 (L = 6 m)", "169.6 kg"],
      ["Pipe Sch 40", "NPS 8 (L = 6 m)", "255.3 kg"],
      ["Pipe Sch 40", "NPS 10 (L = 6 m)", "361.7 kg"],
      ["Pipe Sch 80", "NPS 4 (L = 6 m)", "133.9 kg"],
    ],
    tableFootnote: "Pipe unit weights from ASME B36.10M as stored in this app. Plate mass = L × W × t × 7850 with metres.",
    materialLimitations: {
      title: "Metal Density Standards & Engineering Limitations",
      summary:
        "Metals have characteristic alloy densities governed by chemical composition. Small percentage differences between carbon and stainless steel significantly impact multi-ton logistics.",
      items: [
        {
          materialGroup: "Carbon & Low-Alloy Steel (ASTM A36, A106, A516)",
          temperatureLimit: "Standard Density ρ = 7,850 kg/m³ (0.2836 lb/in³)",
          stressLimit: "Standard structural reference density",
          notes: "Universal density value for all carbon steels regardless of heat treatment, rolling method, or minor carbon/manganese variations.",
        },
        {
          materialGroup: "Austenitic Stainless Steel (ASTM A240 / A312 TP304 / TP316)",
          temperatureLimit: "Standard Density ρ = 8,000 kg/m³ (0.2890 lb/in³)",
          stressLimit: "~1.9% Heavier than Carbon Steel",
          notes: "Chromium and nickel alloying elements increase density. Multi-ton stainless shipments weigh ~2% more than carbon steel equivalents.",
        },
        {
          materialGroup: "Duplex & Super Duplex Stainless (2205 / 2507)",
          temperatureLimit: "Standard Density ρ = 7,800 kg/m³ (0.2818 lb/in³)",
          stressLimit: "~0.6% Lighter than Carbon Steel",
          notes: "High strength allows thinner walls, resulting in 30% ~ 50% overall weight savings on offshore topside modules.",
        },
        {
          materialGroup: "Aluminum Alloys (6061-T6 / 5083)",
          temperatureLimit: "Standard Density ρ = 2,700 kg/m³ (0.0975 lb/in³)",
          stressLimit: "~65% Lighter than Steel",
          notes: "High strength-to-weight ratio for cryogenic tanks, aerospace structures, and marine gangways.",
        },
      ],
      codeRestrictions: [
        "Rigging & Crane Capacity Safety Factor: Crane lifting plans must utilize total gross rigging weight (bare steel + weld bead + coating + lifting lugs) multiplied by a dynamic rigging factor of at least 1.25.",
        "Custody Transfer Weighing: MTO theoretical calculated weight is used strictly for design estimates and engineering purchase orders; commercial invoicing and shipping freight require certified weigh-scale tickets (mill scale cert).",
        "Galvanizing Weight Addition: Hot-dip galvanizing per ASTM A123 adds approximately 3.5% to 6.0% additional zinc mass to structural steel members, which must be incorporated into structural foundation deadload calculations.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Piping Spool & Baseplate Mass and Procurement Cost",
      scenario:
        "Calculate the total bare metal mass and estimated raw material procurement cost for a 48.0-meter run of NPS 8 (DN 200) Schedule 40 carbon steel pipe (ASTM A106 Gr. B) and two 2,000 × 1,000 × 12.0 mm structural baseplates (ASTM A36) at an assumed raw steel commodity price of $1.85 / kg.",
      designConditions: [
        { label: "Pipe Size & Schedule", value: "NPS 8 (DN 200) Schedule 40 (OD = 219.08 mm, t = 8.18 mm)" },
        { label: "Total Pipe Length (L)", value: "48.0 meters (8 standard 6 m sticks)" },
        { label: "Plate Dimensions", value: "Two plates @ 2,000 mm (L) × 1,000 mm (W) × 12.0 mm (t)" },
        { label: "Steel Density (ρ)", value: "7,850 kg/m³ (Carbon Steel)" },
        { label: "Unit Steel Price", value: "$1.85 per kg ($1,850 per metric ton)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Calculate Pipe Cross-Sectional Metal Area (A_metal)",
          formula: "A_{metal} = \\pi · (OD - t) · t",
          calculation: "A_metal = π × (219.08 mm - 8.18 mm) × 8.18 mm = π × 210.90 mm × 8.18 mm = 5,417.84 mm² = 0.0054178 m².",
          result: "A_{metal} = 5,417.8\\text{ mm}^2 = 0.005418\\text{ m}^2",
          note: "Hollow cylindrical cross-sectional area matching ASME B36.10M geometry.",
        },
        {
          step: "Step 2",
          name: "Calculate Pipe Linear Mass (kg/m)",
          formula: "w_{linear} = A_{metal} · \\rho = 0.0054178\\text{ m}^2 · 7,850\\text{ kg/m}^3",
          calculation: "w_linear = 0.0054178 × 7,850 = 42.53 kg/m (28.58 lb/ft). (ASME B36.10M handbook tabulated = 42.55 kg/m).",
          result: "w_{linear} = 42.53\\text{ kg/m}",
          note: "Matches ASME B36.10M published weight within 0.05%.",
        },
        {
          step: "Step 3",
          name: "Calculate Total Pipe Run Mass (M_pipe)",
          formula: "M_{pipe} = w_{linear} · L",
          calculation: "M_pipe = 42.53 kg/m × 48.0 m = 2,041.44 kg (4,500.6 lb).",
          result: "M_{pipe} = 2,041.4\\text{ kg} (2.041\\text{ metric tons})",
          note: "Total bare steel mass for the 48-meter piping run.",
        },
        {
          step: "Step 4",
          name: "Calculate Structural Baseplate Mass (M_plate)",
          formula: "M_{plate} = N · (L · W · t) · \\rho",
          calculation: "Volume per plate V = 2.0 m × 1.0 m × 0.012 m = 0.024 m³. Mass per plate = 0.024 m³ × 7,850 kg/m³ = 188.40 kg. For 2 plates: M_plate = 2 × 188.40 kg = 376.80 kg.",
          result: "M_{plate} = 376.8\\text{ kg} (188.4\\text{ kg each})",
          note: "Solid rectangular prism plate mass for 2 equipment mounting bases.",
        },
        {
          step: "Step 5",
          name: "Calculate Total Combined Mass & Raw Material Procurement Cost",
          formula: "M_{total} = M_{pipe} + M_{plate},\\quad \\text{Cost} = M_{total} · \\text{Price}_{/kg}",
          calculation: "M_total = 2,041.44 kg + 376.80 kg = 2,418.24 kg (2.418 metric tons). Total Cost = 2,418.24 kg × $1.85 / kg = $4,473.74.",
          result: "M_{total} = 2,418.2\\text{ kg} (2.418\\text{ t}),\\quad \\text{Cost} = \\$4,473.74",
          note: "Add 5% contingency margin ($223.69) for MTO cutting scrap and weld metal.",
        },
      ],
      conclusion:
        "The combined bill of materials for 48 meters of NPS 8 Sch 40 pipe and two 12 mm baseplates totals 2,418.24 kg (2.418 metric tons) of ASTM carbon steel, representing an estimated raw material procurement cost of $4,473.74.",
    },
    ...howTo("How to estimate metal weight and cost", [
      { name: "1. Select shape and material", text: "Plate, pipe, or bar; CS / 304 / aluminium / copper." },
      { name: "2. Input dimensions", text: "Metric millimetres or imperial inches — the engine converts inches with 25.4 mm/in." },
      { name: "3. Enter unit price", text: "Input unit price per kg or ton to dynamically estimate total raw material expenditure for budget planning." },
      { name: "4. Verify output and export PDF", text: "Cross-check pipe mass against the B36.10M kg/m column, then export for the PO." },
    ]),
    faq: [
      {
        question: "Why does the formula V = π(OD - t)t give the exact same result as π/4(OD² - ID²)?",
        answer:
          "Algebraically, **\\((OD^2 - ID^2) = (OD - ID)(OD + ID)\\)**. Since the inside diameter **\\(ID = OD - 2t\\)**, substituting yields \\((2t)(2OD - 2t) = 4t(OD - t)\\). Multiplying by \\(\\pi/4\\) yields **\\(\\pi(OD - t)t\\)**. The formula \\(\\pi(OD - t)t\\) directly calculates the annular cross-section using mean wall diameter, avoiding squaring large numbers and reducing numerical floating-point rounding errors.",
      },
      {
        question: "Why is austenitic stainless steel (304/316) heavier than carbon steel?",
        answer:
          "Austenitic stainless steels contain **16%~18% Chromium and 8%~12% Nickel**, which have higher atomic masses and a more tightly packed Face-Centered Cubic (FCC) austenitic crystal structure. Consequently, stainless steel has a standardized density of **8,000 kg/m³ (0.289 lb/in³)**, making it **1.91% heavier** than carbon steel (**7,850 kg/m³ / 0.284 lb/in³**).",
      },
      {
        question: "How do external coatings, galvanizing, and insulation affect shipping weight?",
        answer:
          "Theoretical metal weight accounts only for bare steel. In real piping and structural spools: **Hot-dip galvanizing adds 3.5% ~ 6.0% mass**; **3-layer polyethylene (3LPE) external coating adds 5 ~ 15 kg/m** depending on pipe size; **internal cement mortar lining adds 25% ~ 40% mass**. Crane rigging and freight truck weight limits must include all coatings.",
      },
      {
        question: "What is the difference between theoretical weight (MTO) and scale weight (Mill Cert)?",
        answer:
          "**Theoretical Weight (MTO)** is calculated from nominal geometric dimensions and standard density for purchasing and engineering estimates. **Scale Weight (Mill Cert)** is the actual physical weight measured on calibrated industrial scales at the steel mill. Due to manufacturing thickness tolerances (ASTM -12.5% mill tolerance), scale weight is typically **1% to 3% lighter than theoretical MTO weight**.",
      },
    ],
  },

  "hydro-test-pressure": {
    slug: "hydro-test-pressure",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><i>Pt</i> = 1.5 · <i>P</i> · (<span class="eng-frac"><span class="eng-num"><i>St</i></span><span class="eng-den"><i>S</i></span></span>) &nbsp;[Hydrostatic] &nbsp;·&nbsp; <i>Pt</i> = 1.1 · <i>P</i> · (<span class="eng-frac"><span class="eng-num"><i>St</i></span><span class="eng-den"><i>S</i></span></span>) &nbsp;[Pneumatic]</p>' +
      '<p class="eng-eq"><span class="eng-frac"><span class="eng-num"><i>St</i></span><span class="eng-den"><i>S</i></span></span> ≤ 6.5 &nbsp;(field screening cap) &nbsp;·&nbsp; σ<sub>h</sub> ≤ 0.90 · <i>Sy</i> &nbsp;(site yield check — not computed in-app)</p>' +
      '<p class="eng-plain">ASME B31.3 Para. 345.4.2 · Calculator: Pt from P × multiplier × (St/S); NPS holding-time guide</p>',
    formulaLatex:
      "Pt = 1.5 \\cdot P \\cdot (St/S)\\ [\\text{hydro}],\\quad Pt = 1.1 \\cdot P \\cdot (St/S)\\ [\\text{pneumatic}],\\quad St/S \\le 6.5",
    formulaHighlight: true,
    formulaNotes:
      "ASME B31.3 para. 345.4.2: hydrostatic Pt = 1.5 × P × (St/S); pneumatic Pt = 1.1 × P × (St/S). St is allowable at test temperature; S at design temperature. This calculator stores P, St, and S in MPa (metric) or psi (imperial), defaults St/S = 1.0, and caps St/S at 6.5 as a field yield-limit screen. Ambient Table A-1 binding for CS examples uses 138 MPa / 20,000 psi. Holding time is an NPS screening guide (≤2\" → 10 min; 2-1/2\"–4\" → 30 min; ≥6\" → 60 min). Hoop stress vs 0.90 Sy is a site verification step shown in the worked example — the app does not solve σh.",
    formulaBadges: [
      { label: "Hydrostatic", value: "Pt = 1.5 × P × (St/S)" },
      { label: "Pneumatic", value: "Pt = 1.1 × P × (St/S)" },
      { label: "St/S default / cap", value: "1.0 / ≤ 6.5" },
      { label: "Ambient S binding", value: "138 MPa / 20,000 psi" },
    ],
    variables: [
      { symbol: "Pt", name: "Required Test Pressure", definition: "Minimum gauge pressure held at the highest point during leak examination. Calculator hero output (MPa or psi)." },
      { symbol: "P", name: "Internal Design Pressure", definition: "Governing design gauge pressure of the weakest component in the test circuit. Calculator primary input (MPa or psi)." },
      { symbol: "St", name: "Allowable Stress at Test Temperature", definition: "Table A-1 allowable at test temperature. Advanced input; ambient CS binding 138 MPa / 20,000 psi." },
      { symbol: "S", name: "Allowable Stress at Design Temperature", definition: "Table A-1 allowable at design temperature. Advanced input used with St to refresh St/S." },
      { symbol: "St/S", name: "Temperature Stress Ratio", definition: "Explicit ratio or St÷S from advanced fields. Default 1.0; field guide cap 6.5 applied in the engine." },
      { symbol: "σh", name: "Test Hoop Stress", definition: "Circumferential membrane stress at Pt. Site check vs 0.90 Sy (worked example only — not an in-app output)." },
      { symbol: "Sy", name: "Specified Minimum Yield Strength", definition: "Material SMYS (e.g. 240 MPa for A106 Gr. B). Used for the 90% yield ceiling discussion, not computed by the calculator." },
    ],
    standards: [
      "ASME B31.3 (Process Piping) · Para. 345.4.2 (Hydrostatic) & 345.5 (Pneumatic)",
      "ASME B31.3 · Para. 345.2.2 (Test fluid temperature / MDMT margin)",
      "ASME BPVC Section VIII, Division 1 · UG-99 / UG-100 (vessel testing context)",
      "ASME B40.100 (Pressure Gauges and Gauge Attachments)",
    ],
    allowancesAndTolerances: {
      title: "Instrumentation, Holding Time & Field Limits",
      summary:
        "Code minimum hold is 10 minutes; this app’s NPS bands are a stricter field screening guide. Confirm site procedure before pressurization.",
      items: [
        {
          label: "Test Pressure Gauge Tolerance",
          value: "Grade 2A (±0.5%) or Grade 1A (±1.0%)",
          description:
            "Per ASME B40.100, gauges must be calibrated. Prefer dial range about 1.5×–4× Pt so the reading sits near mid-scale. Use two calibrated gauges when procedure requires.",
        },
        {
          label: "Code Minimum Holding Time",
          value: "≥ 10 min at Pt (B31.3)",
          description:
            "ASME B31.3 requires at least 10 minutes at test pressure before reducing toward design pressure for joint examination. This calculator’s NPS guide (10 / 30 / 60 min) is longer for mid/large sizes and does not replace the project test package.",
        },
        {
          label: "App NPS Holding-Time Guide",
          value: "≤2\" → 10 min · 2½\"–4\" → 30 min · ≥6\" → 60 min",
          description:
            "Matches the calculator Minimum holding time row. NPS ≥ 6\" output also reminds to confirm site procedure. Elevation head and relief setpoints are outside the engine scope.",
        },
        {
          label: "Hydrostatic Head & Venting",
          value: "+0.098 bar/m liquid head · full de-aeration",
          description:
            "Vertical liquid head raises pressure at low points (~9.81 kPa / 1.42 psi per meter). Vent high points during fill; trapped air stores energy and can invalidate the hydrotest.",
        },
      ],
    },
    tableCaption: "Quick Pt lookup — Pt = 1.5 P (St/S) and 1.1 P; stored in bar, converts with unit toggle",
    tableAllNumeric: true,
    tableHeaders: ["Design P (bar)", "Hydro 1.5P (St/S=1)", "Hydro 1.5P (St/S=1.2)", "Pneumatic 1.1P"],
    tableRows: [1, 5, 10, 20, 50, 100].map((bar) => [
      `${bar} bar`,
      `${fmt(1.5 * bar, 1)} bar`,
      `${fmt(1.5 * bar * 1.2, 1)} bar`,
      `${fmt(1.1 * bar, 1)} bar`,
    ]),
    tableColumnUnits: [
      { index: 0, quantity: "pressure", digits: 1 },
      { index: 1, quantity: "pressure", digits: 1 },
      { index: 2, quantity: "pressure", digits: 1 },
      { index: 3, quantity: "pressure", digits: 1 },
    ],
    tableFootnote:
      "Lookup cells are stored in bar for field convenience and convert with the metric/imperial toggle. Calculator inputs/outputs use MPa or psi. Holding-time guide: NPS ≤ 2 → 10 min; NPS 2-1/2–4 → 30 min; NPS ≥ 6 → 60 min (site procedure may be longer).",
    materialLimitations: {
      title: "Material Limits, Brittle Fracture & Pneumatic Hazards",
      summary:
        "The calculator returns Pt and screens St/S ≤ 6.5. Yield hoop check, water chemistry, and pneumatic energy control remain site engineering responsibilities.",
      items: [
        {
          materialGroup: "Carbon Steel (ASTM A106 Gr. B / A53 Gr. B)",
          temperatureLimit: "Test water ≥ MDMT + 17 °C (30 °F)",
          stressLimit: "Sy = 240 MPa (35 ksi); keep σh ≤ 0.90 Sy (site check)",
          notes: "Ambient allowable binding in this app: 138 MPa / 20,000 psi. Avoid near-freezing water in thick CS; prefer ~15–50 °C when practical.",
        },
        {
          materialGroup: "Stainless Steel (ASTM A312 TP304L / TP316L)",
          temperatureLimit: "Chloride control per material / owner spec",
          stressLimit: "Sy typically ~170–205 MPa (25–30 ksi)",
          notes: "Prefer low-chloride demineralized water. Untreated raw water risks pitting and chloride SCC on austenitics.",
        },
        {
          materialGroup: "Low-Temperature Alloy (ASTM A333 Gr. 6)",
          temperatureLimit: "Impact-qualified to about −45 °C (−50 °F)",
          stressLimit: "Sy = 240 MPa (35 ksi) typical",
          notes: "Often allows colder fill water in winter packages when MDMT and impact qualifications are satisfied.",
        },
        {
          materialGroup: "Pneumatic Testing Fluid (Dry Air / Nitrogen)",
          temperatureLimit: "Per procedure (often about −29 °C to 50 °C)",
          stressLimit: "Pt = 1.1 × P × (St/S); stepwise pressurization",
          notes: "Pneumatic mode in this calculator uses the 1.1 multiplier. Compressed gas stores large energy — written authorization and barriers are mandatory.",
        },
      ],
      codeRestrictions: [
        "Calculator scope: Pt = multiplier × P × (St/S) with St/S capped at 6.5, plus NPS holding-time guide. It does not compute σh, flange ratings, or relief-valve setpoints.",
        "If Pt would drive hoop stress above 0.90 Sy, B31.3 para. 345.4.2(c) allows reducing Pt to stay within that limit — verify on site with D and t_act.",
        "Blind off or remove sensitive in-line equipment (control valves, PSVs, bellows, orifice plates) before pressurization; protect the circuit with temporary relief set near 105%–110% of Pt when procedure requires.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: High-Temperature Hydrocarbon Line Hydrostatic Test Pressure",
      scenario:
        "Match this calculator: hydrostatic Pt for NPS 10 Sch 40 A106 Gr. B at P = 2.80 MPa, design 350 °C, tested with ambient water at 20 °C. Use St = 138 MPa (app ambient binding), S = 117.5 MPa, then confirm holding-time guide and a site 0.90 Sy hoop check.",
      designConditions: [
        { label: "Nominal Pipe Size", value: "NPS 10 (DN 250) Schedule 40" },
        { label: "Outside Diameter (D)", value: "273.05 mm (10.750 in) — for site hoop check only" },
        { label: "Nominal Wall / t_act", value: "9.27 mm (0.365 in); t_act @ 87.5% = 8.11 mm — site hoop check only" },
        { label: "Pipe Material", value: "ASTM A106 Gr. B (Sy = 240 MPa / 35.0 ksi)" },
        { label: "Internal Design Pressure (P)", value: "2.80 MPa (28.0 bar / 406 psi)" },
        { label: "Design Temperature", value: "350 °C (662 °F)" },
        { label: "Test Fluid & Temperature", value: "Clean potable water @ 20 °C (68 °F)" },
        { label: "Calculator ambient St binding", value: "138 MPa / 20,000 psi (20.0 ksi)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Enter allowables St and S (Advanced 1.2)",
          calculation:
            "Table A-1 / calculator ambient binding: St = 138 MPa at 20 °C. At 350 °C design temperature take S = 117.5 MPa (17.04 ksi).",
          result: "St = 138 MPa, S = 117.5 MPa",
          note: "Same ambient St used by Pipe Thickness / Blind tools in this kit (138 MPa ↔ 20,000 psi).",
        },
        {
          step: "Step 2",
          name: "Compute St/S (capped at 6.5 in-app)",
          formula: "St/S \\le 6.5",
          calculation: "St/S = 138 / 117.5 = 1.1745 (below the 6.5 field screening cap).",
          result: "St/S = 1.1745",
          note: "In the UI, editing St or S refreshes the Stress ratio (St/S) field automatically.",
        },
        {
          step: "Step 3",
          name: "Compute hydrostatic Pt (calculator hero result)",
          formula: "Pt = 1.5 \\cdot P \\cdot (St/S)",
          calculation: "Pt = 1.5 × 2.80 × 1.1745 = 4.933 MPa (49.33 bar / 715 psi).",
          result: "Pt = 4.93 MPa (49.3 bar / 715 psi)",
          note: "Pneumatic mode would use 1.1 instead of 1.5 with the same St/S.",
        },
        {
          step: "Step 4",
          name: "Site yield check (not computed by the calculator)",
          formula: "\\sigma_h = Pt \\cdot D / (2 \\cdot t_{act}) \\le 0.90 \\cdot Sy",
          calculation:
            "t_act = 9.27 × 0.875 = 8.111 mm. σh = (4.933 × 273.05) / (2 × 8.111) = 83.0 MPa. Limit = 0.90 × 240 = 216 MPa.",
          result: "σh = 83.0 MPa ≤ 216 MPa (safe)",
          note: "The app screens St/S ≤ 6.5 and shows yield-limit callouts; confirm σh with D and t_act on site.",
        },
        {
          step: "Step 5",
          name: "Apply NPS holding-time guide",
          calculation:
            "NPS 10 → Minimum 60 minutes at test pressure (NPS ≥ 6\"), then reduce toward design pressure for examination per procedure.",
          result: "60 min hold @ Pt → visual exam near P",
          note: "Matches the calculator Minimum holding time row for NPS 10.",
        },
      ],
      conclusion:
        "Hydrostatic Pt = 4.93 MPa (49.3 bar / 715 psi) for P = 2.80 MPa with St/S = 1.1745 using St = 138 MPa. The calculator returns that Pt and a 60 min NPS-10 holding guide; the 83 MPa hoop vs 216 MPa (0.90 Sy) check remains a site verification step.",
    },
    ...howTo("How to set hydrotest pressure", [
      { name: "1. Choose test fluid", text: "Hydrostatic uses 1.5×; pneumatic uses 1.1× and needs written authorization." },
      { name: "2. Enter design pressure P", text: "Use MPa or psi from the unit toggle — same scale as the isometric." },
      { name: "3. Select NPS", text: "Sets the holding-time guide (10 / 30 / 60 min bands)." },
      { name: "4. Open 1.2 for St/S", text: "Leave St/S = 1.0 for ambient-design lines, or enter St and S (or St/S) for a hot line tested cold. Cap is 6.5." },
      { name: "5. Read Pt and export", text: "Confirm Pt vs relief set and site yield check, then export / copy the result sheet." },
    ]),
    faq: [
      {
        question: "Why must the temperature stress ratio (St/S) be applied during hydrostatic testing?",
        answer:
          "When piping operates hot, design allowable S is lower than ambient St. Testing cold at plain 1.5P under-stresses the system relative to hot operation. **Pt = 1.5 × P × (St/S)** raises the cold test pressure so the metal sees about 150% of the design condition (ASME B31.3 para. 345.4.2). This calculator defaults St/S = 1.0 and lets you set St, S, or St/S in Advanced 1.2.",
      },
      {
        question: "Does this calculator check hoop stress against 90% SMYS?",
        answer:
          "**No.** The engine computes **Pt** and screens **St/S ≤ 6.5**, plus an NPS holding-time guide. The **0.90 Sy** hoop check needs D and t_act from the line class — shown in the worked example as a site step. If σh would exceed 0.90 Sy, B31.3 allows reducing Pt.",
      },
      {
        question: "Why is pneumatic testing more hazardous than hydrostatic testing?",
        answer:
          "Water stores little elastic energy; gas stores a large amount. ASME B31.3 limits pneumatic test pressure to **1.1 × P × (St/S)** (this app’s pneumatic mode) and expects written authorization, barriers, and stepwise pressurization.",
      },
      {
        question: "What holding time does the app use versus the code minimum?",
        answer:
          "B31.3’s **minimum** hold is typically **10 minutes** at Pt. This calculator’s guide is **NPS ≤ 2\" → 10 min**, **2½\"–4\" → 30 min**, **≥ 6\" → 60 min**, and may still be shorter than the project procedure — always follow the approved test package.",
      },
      {
        question: "Why is hydrotest water temperature critical for carbon steel?",
        answer:
          "Carbon steel can be brittle near or below MDMT. Per B31.3 para. 345.2.2, keep test fluid about **17 °C (30 °F) above MDMT**. Near-freezing fill water in thick CS is a fracture risk even when Pt is correctly calculated.",
      },
    ],
  },

  "thermal-expansion-loop": {
    slug: "thermal-expansion-loop",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq">Δ<i>L</i> = α · <i>L</i> · Δ<i>T</i> &nbsp;·&nbsp; Δ<i>L</i><sub>leg</sub> = Δ<i>L</i> / 2</p>' +
      '<p class="eng-eq"><i>H</i> = <i>L</i><sub>leg</sub> = √(<span class="eng-frac"><span class="eng-num">3 · <i>E</i><sub>h</sub> · <i>D</i> · Δ<i>L</i><sub>leg</sub></span><span class="eng-den"><i>S</i><sub>A</sub></span></span>) &nbsp;·&nbsp; <i>W</i> = <i>H</i> / 2</p>' +
      '<p class="eng-eq"><i>F</i><sub>bending</sub> = <span class="eng-frac"><span class="eng-num">12 · <i>E</i><sub>h</sub> · <i>I</i> · Δ<i>L</i></span><span class="eng-den"><i>H</i>³</span></span> &nbsp;·&nbsp; <i>F</i><sub>anchor</sub> = <i>F</i><sub>bending</sub> + μ · <i>W</i><sub>pipe</sub></p>' +
      '<p class="eng-plain">ASME B31.3 guided-cantilever loop screening (this app)</p>',
    formulaLatex: "\\Delta L = \\alpha L \\Delta T,\\quad H = \\sqrt{\\frac{3 E_h D (\\Delta L/2)}{S_A}},\\quad W = H/2,\\quad F_{anchor} = F_{bending} + \\mu W_{pipe}",
    formulaNotes:
      "This calculator computes unrestrained growth ΔL = α · L · ΔT with app mean α values (CS 12.1, 304SS 17.3, 316SS 16.2, Cr-Mo 13.7 ×10⁻⁶ /°C). Guided-cantilever leg H uses hot modulus E_h at T2, pipe OD D, ΔL_leg = ΔL/2, and S_A. U-loop width W = H/2. Anchor force adds rack friction μ · W_pipe. Guide spacing G₁ = 4·OD, G₂ = 14·OD. Screening only — not CAESAR II / B31.3 formal analysis.",
    formulaBadges: [
      { label: "CS α", value: "12.1 × 10⁻⁶ /°C" },
      { label: "304SS α", value: "17.3 × 10⁻⁶ /°C" },
      { label: "H (leg)", value: "√(3 E_h D · ΔL/2 / S_A)" },
      { label: "W", value: "H / 2" },
    ],
    variables: [
      { symbol: "ΔL", name: "Total Thermal Growth", definition: "Hero output — unrestrained expansion between anchors (mm or in)." },
      { symbol: "α", name: "Mean Expansion Coefficient", definition: "App screening α per material family (µm/m·°C)." },
      { symbol: "L", name: "Straight Run Length", definition: "Anchor-to-anchor free length (m or ft)." },
      { symbol: "ΔT", name: "Temperature Difference", definition: "T2 − T1 (°C or °F in the active unit system)." },
      { symbol: "H", name: "L-shape / Loop Leg", definition: "Guided-cantilever minimum leg: √(3 E_h D · ΔL_leg / S_A)." },
      { symbol: "W", name: "U-loop Width", definition: "Taken as H/2 in this app (2:1 aspect)." },
      { symbol: "E_h", name: "Hot Modulus", definition: "Elastic modulus at operating T2 (interpolated screening curve)." },
      { symbol: "S_A", name: "Allowable Displacement Stress Range", definition: "Default 138 MPa (20 ksi) screening; override for B31.3 Eq. 1a." },
      { symbol: "F_anchor", name: "Total Anchor Force", definition: "F_bending + μ · pipe weight on the run." },
    ],
    standards: [
      "ASME B31.3 (Process Piping) — flexibility & support (screening use)",
      "ASME B31.3 Appendix C (thermal expansion & modulus tables — α/E basis)",
      "M.W. Kellogg guided-cantilever method (loop leg screening)",
      "ASME B36.10M / B36.19M (OD, t, I from selected schedule)",
    ],
    allowancesAndTolerances: {
      title: "Loop Geometry & Guides (This App)",
      summary:
        "Results are field screening. Confirm with project stress engineering before steel fabrication.",
      items: [
        {
          label: "U-loop Aspect (this app)",
          value: "W = H / 2",
          description:
            "Symmetrical U-loop with H = 2W. Midpoint loop absorbs ΔL/2 on each leg.",
        },
        {
          label: "Guide Spacing",
          value: "G₁ = 4·OD · G₂ = 14·OD",
          description:
            "First and second directional guides from the loop tangent to keep growth in-plane.",
        },
        {
          label: "Friction Screening",
          value: "μ ≈ 0.30 steel · 0.10 PTFE",
          description:
            "F_friction = μ · W_pipe for the entered straight length. Does not include fittings or contents.",
        },
        {
          label: "Cold Spring",
          value: "No S_A credit",
          description:
            "B31.3 does not credit cold spring against the displacement stress range — same rule in this screening tool.",
        },
      ],
    },
    tableCaption: "Carbon-steel ΔL for L = 20 m (α = 12.1×10⁻⁶ /°C) — matches this app",
    tableHeaders: ["T1 (°C)", "T2 (°C)", "ΔT (°C)", "ΔL (mm)"],
    tableRows: [
      ["21", "70", "49", fmt(12.1e-6 * 20 * 49 * 1000, 1)],
      ["21", "100", "79", fmt(12.1e-6 * 20 * 79 * 1000, 1)],
      ["21", "150", "129", fmt(12.1e-6 * 20 * 129 * 1000, 1)],
      ["21", "200", "179", fmt(12.1e-6 * 20 * 179 * 1000, 1)],
      ["21", "300", "279", fmt(12.1e-6 * 20 * 279 * 1000, 1)],
      ["15", "180", "165", fmt(12.1e-6 * 20 * 165 * 1000, 1)],
    ],
    tableColumnUnits: [{ index: 3, quantity: "length", digits: 1 }],
    tableFootnote:
      "Default case 21 → 150 °C on 20 m CS gives ΔL = 31.2 mm. Scale linearly with L at the same α and ΔT. Unit toggle converts the ΔL column.",
    materialLimitations: {
      title: "α Values Used in This App",
      summary:
        "α and E_h curves are screening approximations aligned to B31.3 App. C order of magnitude — confirm project tables for formal analysis.",
      items: [
        {
          materialGroup: "Carbon Steel (A106 / A53)",
          temperatureLimit: "α = 12.1 × 10⁻⁶ /°C",
          stressLimit: "Default S_A = 138 MPa (20 ksi)",
          notes: "Baseline industrial piping material in the calculator.",
        },
        {
          materialGroup: "304 / 304L Stainless",
          temperatureLimit: "α = 17.3 × 10⁻⁶ /°C",
          stressLimit: "Default S_A = 138 MPa",
          notes: "~43% more growth than CS → deeper loops (H ∝ √ΔL).",
        },
        {
          materialGroup: "316 / 316L Stainless",
          temperatureLimit: "α = 16.2 × 10⁻⁶ /°C",
          stressLimit: "Default S_A = 138 MPa",
          notes: "Slightly lower α than 304 in this app’s table.",
        },
        {
          materialGroup: "Cr-Mo Alloy (P11 / P22 / P91)",
          temperatureLimit: "α = 13.7 × 10⁻⁶ /°C",
          stressLimit: "Default S_A = 138 MPa",
          notes: "High T2 still drives large ΔL despite moderate α.",
        },
      ],
      codeRestrictions: [
        "Calculator scope: ΔL, guided-cantilever H/W, G₁/G₂, and F_anchor screening. It does not satisfy B31.3 formal computer analysis requirements.",
        "Rotating-equipment nozzles and severe cyclic service need CAESAR II / AutoPIPE (or equal).",
        "Confirm slide-plate travel ≥ ~1.5 × ΔL so shoes do not walk off the steel.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Match the Calculator Default",
      scenario:
        "Reproduce the app default: CS A106, T1 = 21 °C, T2 = 150 °C, L = 20 m, NPS 4 Sch 40, S_A = 138 MPa, μ = 0.30.",
      designConditions: [
        { label: "Material", value: "Carbon steel · α = 12.1 × 10⁻⁶ /°C" },
        { label: "Temperatures", value: "T1 = 21 °C · T2 = 150 °C (ΔT = 129 °C)" },
        { label: "Straight length L", value: "20 m" },
        { label: "Pipe", value: "NPS 4 Sch 40 (OD = 114.3 mm, t = 6.02 mm)" },
        { label: "S_A / μ", value: "138 MPa · μ = 0.30" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Compute ΔL",
          formula: "\\Delta L = \\alpha L \\Delta T",
          calculation: "ΔL = 12.1×10⁻⁶ × 20 m × 129 °C × 1000 = 31.22 mm.",
          result: "ΔL = 31.2 mm",
          note: "Matches the calculator hero for the default inputs.",
        },
        {
          step: "Step 2",
          name: "Split growth per leg",
          formula: "\\Delta L_{leg} = \\Delta L / 2",
          calculation: "ΔL_leg = 31.22 / 2 = 15.61 mm.",
          result: "ΔL_leg = 15.61 mm",
          note: "Midpoint U-loop / L-bend assumption.",
        },
        {
          step: "Step 3",
          name: "Hot modulus E_h at 150 °C",
          calculation:
            "CS screening curve: E(100 °C) = 198 GPa, E(200 °C) = 191 GPa → E_h(150 °C) = 194.5 GPa.",
          result: "E_h = 194,500 MPa",
          note: "Same interpolation used in the engine.",
        },
        {
          step: "Step 4",
          name: "Guided-cantilever leg H and width W",
          formula: "H = \\sqrt{\\frac{3 E_h D \\Delta L_{leg}}{S_A}},\\ W = H/2",
          calculation:
            "H = √(3 × 194500 × 114.3 × 15.61 / 138) ≈ 2747 mm = 2.75 m. W = 1.37 m.",
          result: "H = 2.75 m · W = 1.37 m",
          note: "Matches the calculator L-shape / U-loop recommendations.",
        },
        {
          step: "Step 5",
          name: "Guides and anchor force",
          formula: "G_1 = 4D,\\ G_2 = 14D,\\ F_{anchor} = F_{bending} + \\mu W_{pipe}",
          calculation:
            "G₁ = 4 × 114.3 = 457 mm · G₂ = 14 × 114.3 = 1600 mm. With μ = 0.30, F_anchor ≈ 11.53 kN (bending + friction).",
          result: "G₁ = 457 mm · G₂ = 1600 mm · F_anchor ≈ 11.53 kN",
          note: "Screening anchor load for support design — confirm with stress analysis.",
        },
      ],
      conclusion:
        "Default app case: ΔL = 31.2 mm, H = 2.75 m, W = 1.37 m, G₁/G₂ = 457 / 1600 mm, F_anchor ≈ 11.53 kN. Use for layout budgeting only.",
    },
    ...howTo("How to estimate thermal expansion", [
      { name: "1. Select material & pipe", text: "CS / 304 / 316 / Cr-Mo plus NPS and schedule (sets D and I)." },
      { name: "2. Enter T1, T2, and L", text: "Install and operating temperatures and the free straight run." },
      { name: "3. Read ΔL, H, W, F_anchor", text: "Optional 1.2 overrides S_A and μ. Guides use 4·OD / 14·OD." },
      { name: "4. Export / escalate", text: "Attach the screening sheet; escalate to CAESAR II where B31.3 requires formal analysis." },
    ]),
    faq: [
      {
        question: "Why does 304SS need a deeper loop than carbon steel?",
        answer:
          "App **α(304SS) = 17.3×10⁻⁶ /°C** vs **α(CS) = 12.1×10⁻⁶ /°C** (~43% more ΔL). Because **H ∝ √ΔL**, the leg is roughly **~19% deeper** for the same L, ΔT, D, and S_A.",
      },
      {
        question: "Does this replace CAESAR II?",
        answer:
          "**No.** Guided-cantilever sizing is a **layout screening** method. B31.3 still requires formal flexibility analysis for complex 3D systems, rotating equipment nozzles, and severe cyclic service.",
      },
      {
        question: "How is U-loop width defined here?",
        answer:
          "This app sets **W = H / 2** (aspect H:W = 2:1) with **ΔL_leg = ΔL / 2** for a midpoint loop.",
      },
      {
        question: "What does F_anchor include?",
        answer:
          "**F_anchor = F_bending + μ · W_pipe**, where F_bending uses the guided-cantilever stiffness form and W_pipe is plain-end mass × g for the entered length.",
      },
    ],
  },

  "pressure-drop-friction": {
    slug: "pressure-drop-friction",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq">Δ<i>P</i> = <i>f</i> · (<span class="eng-frac"><span class="eng-num"><i>L</i> + Σ <i>L</i><sub>eq</sub></span><span class="eng-den"><i>D</i></span></span>) · (<span class="eng-frac"><span class="eng-num">1</span><span class="eng-den">2</span></span> ρ <i>v</i>²)</p>' +
      '<p class="eng-eq"><span class="eng-frac"><span class="eng-num">1</span><span class="eng-den">√<i>f</i></span></span> = −1.8 log<sub>10</sub> [ (ε/<i>D</i>/3.7)<sup>1.11</sup> + 6.9/<i>Re</i> ] &nbsp;(Haaland)</p>' +
      '<p class="eng-eq"><i>L</i><sub>eq</sub> = (<i>L</i>/<i>D</i>) · <i>D</i> &nbsp;·&nbsp; elbow 30 · gate 8 · globe 340</p>' +
      '<p class="eng-plain">Darcy–Weisbach + Crane TP-410 L/D screening (this app)</p>',
    formulaLatex: "\\Delta P = f \\left(\\frac{L+\\sum L_{eq}}{D}\\right)\\frac{1}{2}\\rho v^2,\\quad \\frac{1}{\\sqrt{f}}=-1.8\\log_{10}\\left[(\\varepsilon/D/3.7)^{1.11}+6.9/Re\\right]",
    formulaNotes:
      "Hero ΔP is total friction drop on L + Σ L_eq. Friction factor f uses the Haaland explicit approximation to Colebrook–White. ID comes from the B36.10M / B36.19M schedule row. Fitting L/D values are Crane TP-410 screening factors (90° LR elbow 30, gate 8, globe 340). Steam/air/crude/condensate use fixed screening ρ and μ — HP steam and compressed air are order-of-magnitude only. ΔP/100 is reported for straight pipe only (no fittings).",
    formulaBadges: [
      { label: "Darcy–Weisbach", value: "ΔP = f (L_tot/D) (½ρv²)" },
      { label: "Haaland f", value: "explicit Colebrook approx." },
      { label: "ε (new CS)", value: "0.045 mm" },
      { label: "Crane L/D", value: "30 / 8 / 340" },
    ],
    variables: [
      { symbol: "ΔP", name: "Total Friction Pressure Drop", definition: "Hero output — friction loss on L + Σ L_eq (bar or psi)." },
      { symbol: "f", name: "Darcy Friction Factor", definition: "Haaland / laminar 64/Re (dimensionless)." },
      { symbol: "L", name: "Straight Pipe Length", definition: "Physical run length (m or ft)." },
      { symbol: "L_eq", name: "Fitting Equivalent Length", definition: "Σ (L/D)·D for elbows, gates, globes." },
      { symbol: "D", name: "Inside Diameter (ID)", definition: "Schedule bore from the pipe table (m)." },
      { symbol: "v", name: "Mean Velocity", definition: "v = Q / A with A = π D²/4." },
      { symbol: "ε", name: "Absolute Roughness", definition: "Selectable surface roughness (mm)." },
      { symbol: "Re", name: "Reynolds Number", definition: "Re = ρ v D / μ." },
    ],
    standards: [
      "Darcy–Weisbach equation (closed-conduit friction)",
      "Haaland (1983) explicit friction-factor approximation",
      "Crane Technical Paper No. 410 (fitting L/D factors)",
      "ASME B36.10M / B36.19M (pipe ID by NPS/schedule)",
    ],
    allowancesAndTolerances: {
      title: "Roughness, L/D & Regime Rules (This App)",
      summary:
        "Results are single-phase Newtonian screening. Confirm pump curves and project velocity limits separately.",
      items: [
        {
          label: "Absolute Roughness ε",
          value: "0.015 / 0.045 / 0.15 / 0.30 mm",
          description:
            "Presets for SS/PVC, new CS, corroded CS, and heavily corroded steel.",
        },
        {
          label: "Crane L/D (this app)",
          value: "Elbow 30 · Gate 8 · Globe 340",
          description:
            "Converted as L_eq = (L/D) × D and added to straight L before ΔP.",
        },
        {
          label: "ΔP / 100 reporting",
          value: "Straight pipe only",
          description:
            "Gradient excludes fittings. Imperial shows psi per 100 ft (scaled from the 100 m straight basis).",
        },
        {
          label: "Flow Regime",
          value: "Re < 2300 → f = 64/Re",
          description:
            "Otherwise Haaland turbulent branch. Transition band is not specially smoothed.",
        },
      ],
    },
    tableCaption:
      "Water ~20 °C — NPS 4 Sch 40, 100 m straight, no fittings (Haaland, ε = 0.045 mm)",
    tableHeaders: ["Q (m³/h)", "v (m/s)", "ΔP (bar)", "ΔP (psi)"],
    tableRows: [
      ["20", "0.676", "~0.045", "~0.65"],
      ["40", "1.353", "~0.168", "~2.44"],
      ["50", "1.691", "0.259", "3.76"],
      ["80", "2.706", "~0.66", "~9.6"],
      ["100", "3.382", "~1.03", "~14.9"],
      ["150", "5.073", "~2.33", "~33.8"],
    ],
    tableColumnUnits: [
      { index: 0, quantity: "flow", digits: 1 },
      { index: 1, quantity: "velocity", digits: 2 },
      { index: 2, quantity: "pressure", digits: 3 },
    ],
    tableFootnote:
      "50 m³/h is independently verified near 0.259 bar (3.76 psi) with ρ ≈ 998 kg/m³. Live calculator uses the app water ρ(T) correlation (~999 kg/m³ at 20 °C) and recomputes f(Re). Other rows are v²-scaled screens.",
    materialLimitations: {
      title: "Velocity & Fluid Screening Limits",
      summary:
        "Keep liquid headers near 1.5–3.0 m/s when practical. Steam/air densities in this tool are fixed screening values.",
      items: [
        {
          materialGroup: "Liquid headers (CS)",
          temperatureLimit: "Typical v ≈ 1.5–3.0 m/s",
          stressLimit: "Economic ΔP often ≤ ~0.1–0.2 bar / 100 m",
          notes: "Default case (~1.35 m/s at 40 m³/h in NPS 4 Sch 40) sits in the usual band.",
        },
        {
          materialGroup: "Pump suction",
          temperatureLimit: "Often 0.6–1.5 m/s",
          stressLimit: "Protect NPSHa",
          notes: "Prefer larger ID and fewer fittings on suction lines.",
        },
        {
          materialGroup: "Steam / air (this app)",
          temperatureLimit: "Fixed ρ / μ presets",
          stressLimit: "Order-of-magnitude only",
          notes: "HP steam and compressed air need project properties — not the LP presets.",
        },
        {
          materialGroup: "Non-Newtonian fluids",
          temperatureLimit: "Out of scope",
          stressLimit: "N/A",
          notes: "Slurries and polymers need specialized rheology models.",
        },
      ],
      codeRestrictions: [
        "Calculator scope: single-phase Darcy–Weisbach ΔP with Haaland f and Crane L/D elbows/gates/globes.",
        "Does not size pumps, control valves, or two-phase / flashing flow.",
        "Globe valves (L/D = 340) can dominate — remove or resize before blaming pipe ID.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Match the Calculator Default",
      scenario:
        "Reproduce the app default: water @ 20 °C, Q = 40 m³/h, NPS 4 Sch 40, L = 100 m, ε = 0.045 mm, four 90° LR elbows, two gate valves.",
      designConditions: [
        { label: "Fluid", value: "Water @ 20 °C (app ρ ≈ 999 kg/m³, μ ≈ 0.001 Pa·s)" },
        { label: "Flow Q", value: "40 m³/h" },
        { label: "Pipe", value: "NPS 4 Sch 40 (ID = 102.26 mm)" },
        { label: "Straight length L", value: "100 m" },
        { label: "Fittings", value: "4 × elbow (L/D=30) + 2 × gate (L/D=8)" },
        { label: "Roughness ε", value: "0.045 mm (new commercial steel)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Velocity from ID",
          formula: "v = Q / (\\pi D^2 / 4)",
          calculation:
            "D = 0.10226 m → A = 0.008213 m². Q = 40/3600 = 0.01111 m³/s → v = 1.353 m/s.",
          result: "v = 1.353 m/s",
          note: "Within typical liquid header guidance.",
        },
        {
          step: "Step 2",
          name: "Reynolds number",
          formula: "Re = \\rho v D / \\mu",
          calculation: "Re ≈ 999 × 1.353 × 0.10226 / 0.001 ≈ 1.38 × 10⁵ (turbulent).",
          result: "Re ≈ 1.38×10⁵",
          note: "Haaland turbulent branch applies.",
        },
        {
          step: "Step 3",
          name: "Haaland friction factor",
          formula: "1/\\sqrt{f} = -1.8\\log_{10}[(\\varepsilon/D/3.7)^{1.11}+6.9/Re]",
          calculation: "ε/D ≈ 0.000440 → f ≈ 0.01903.",
          result: "f ≈ 0.01903",
          note: "Matches the calculator friction factor for the default case.",
        },
        {
          step: "Step 4",
          name: "Equivalent length with fittings",
          formula: "L_{tot} = L + \\sum (L/D)·D",
          calculation:
            "Σ L/D = 4×30 + 2×8 = 136 → Σ L_eq = 136 × 0.10226 ≈ 13.91 m. L_tot ≈ 113.9 m.",
          result: "L_tot ≈ 113.9 m",
          note: "Fittings add ~14% equivalent length.",
        },
        {
          step: "Step 5",
          name: "Total ΔP (hero)",
          formula: "\\Delta P = f (L_{tot}/D) (1/2 \\rho v^2)",
          calculation:
            "ΔP ≈ 0.194 bar (≈ 2.81 psi). Straight-only gradient ≈ 0.170 bar / 100 m.",
          result: "ΔP ≈ 0.194 bar · ΔP/100 m ≈ 0.170 bar",
          note: "Hero includes fittings; ΔP/100 badge is straight pipe only.",
        },
      ],
      conclusion:
        "Default app case: v ≈ 1.35 m/s, f ≈ 0.0190, L_tot ≈ 113.9 m, ΔP ≈ 0.194 bar (2.81 psi). Raise NPS or cut globe valves if ΔP is excessive.",
    },
    ...howTo("How to estimate pipe pressure drop", [
      { name: "1. Select fluid, NPS, schedule", text: "ID comes from the pipe table. Steam/air use fixed screening densities." },
      { name: "2. Enter Q, L, ε, and T", text: "Flow in m³/h, GPM, or kg/h. Length follows the unit toggle." },
      { name: "3. Optional 1.2 fittings", text: "Elbows, gates, and globes convert to L_eq and raise total ΔP." },
      { name: "4. Read ΔP, v, Re, f", text: "If ΔP is large, increase NPS or remove globe valves, then export." },
    ]),
    faq: [
      {
        question: "Why Haaland instead of Colebrook–White?",
        answer:
          "Colebrook–White is **implicit** in √f. **Haaland** is an **explicit** approximation typically within **~1.5%** of Colebrook — adequate versus roughness uncertainty.",
      },
      {
        question: "Darcy f vs Fanning f_F?",
        answer:
          "This app uses the **Darcy** factor in ΔP = f (L/D)(½ρv²). **f = 4 f_F** relative to the Fanning factor common in some chemical-engineering texts.",
      },
      {
        question: "Does ΔP / 100 include fittings?",
        answer:
          "**No.** The gradient is **straight pipe only**. Hero **ΔP** includes **L + Σ L_eq**.",
      },
      {
        question: "Are steam and air densities fixed?",
        answer:
          "**Yes** — typical screening presets. For HP steam or compressed air, treat results as **order-of-magnitude** only.",
      },
    ],
  },

  "flow-velocity-erosion": {
    slug: "flow-velocity-erosion",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><i>v</i> = <span class="eng-frac"><span class="eng-num"><i>Q</i></span><span class="eng-den"><i>A</i></span></span> &nbsp;·&nbsp; <i>v</i><sub>c</sub> = <span class="eng-frac"><span class="eng-num"><i>C</i></span><span class="eng-den">√ρ</span></span> &nbsp;[API RP 14E, ρ in lb/ft³ → convert to m/s]</p>' +
      '<p class="eng-eq">Status: Safe if <i>v</i> &lt; 0.8 <i>v</i><sub>c</sub> and liquid <i>v</i> ≤ cap &nbsp;·&nbsp; Warning ≥ 0.8 <i>v</i><sub>c</sub> or liquid cap &nbsp;·&nbsp; Erosion Risk if <i>v</i> ≥ <i>v</i><sub>c</sub></p>' +
      '<p class="eng-eq">Liquid warning cap: CS 3.5 m/s (11.5 ft/s) · SS/CRA 5.0 m/s (16.4 ft/s)</p>' +
      '<p class="eng-plain">API RP 14E erosional velocity screening (this app)</p>',
    formulaLatex: "v = Q/A,\\quad v_c = C/\\sqrt{\\rho_{\\mathrm{lb/ft^3}}}\\ (\\times 0.3048\\ \\mathrm{to\\ m/s})",
    formulaNotes:
      "Hero is mean velocity v = Q/A using schedule ID (B36.10M for CS, B36.19M for SS). Erosion limit vc follows API RP 14E with user density converted to lb/ft³ inside the engine. Default C = 100 (CS) or 150 (SS). Liquid services also apply a practical warning cap (CS 3.5 m/s, SS 5.0 m/s). Multiphase mixture-density formulas are out of scope — enter ρ directly. Sand-laden slurries need dedicated erosion models.",
    formulaBadges: [
      { label: "Hero", value: "v = Q / A" },
      { label: "API RP 14E", value: "vc = C / √ρ" },
      { label: "CS default", value: "C = 100 · cap 3.5 m/s" },
      { label: "SS default", value: "C = 150 · cap 5.0 m/s" },
    ],
    variables: [
      { symbol: "v", name: "Mean Velocity", definition: "Hero output — Q / A through the schedule ID bore (m/s or ft/s)." },
      { symbol: "vc", name: "Erosional Velocity Limit", definition: "API RP 14E limit from C / √ρ (ρ in lb/ft³), converted to the active unit system." },
      { symbol: "C", name: "Empirical Factor", definition: "Default 100 (CS continuous) or 150 (SS/CRA). Override in Advanced 1.2." },
      { symbol: "ρ", name: "Fluid Density", definition: "User density (kg/m³ or lb/ft³). Converted to lb/ft³ for the RP 14E formula." },
      { symbol: "Q", name: "Volumetric Flow", definition: "m³/h or GPM." },
      { symbol: "A", name: "Flow Area", definition: "π ID² / 4 from the selected NPS/schedule." },
      { symbol: "v / vc", name: "Utilization Ratio", definition: "Safe < 80%; Warning 80–100% (or liquid cap); Erosion Risk ≥ 100%." },
    ],
    standards: [
      "API Recommended Practice 14E (erosional velocity screening)",
      "Norsok P-002 / ISO 13703 (CRA C-factor guidance — reference)",
      "ASME B36.10M (CS schedules) / ASME B36.19M (SS schedules)",
    ],
    allowancesAndTolerances: {
      title: "Status Rules (This App)",
      summary:
        "Screening only. Confirm project velocity standards and sand content before PO.",
      items: [
        {
          label: "Safe",
          value: "v < 0.8·vc and liquid v ≤ cap",
          description: "Normal continuous operation band for this calculator.",
        },
        {
          label: "Warning",
          value: "v ≥ 0.8·vc or liquid v > cap",
          description:
            "CS liquid cap 3.5 m/s; SS/CRA liquid cap 5.0 m/s. Consider larger NPS.",
        },
        {
          label: "Erosion Risk",
          value: "v ≥ vc",
          description: "At or above the RP 14E erosional limit for the entered C and ρ.",
        },
        {
          label: "Sand / slurry",
          value: "Out of scope",
          description:
            "If sand ≫ ~1 lb/1000 bbl, do not rely on RP 14E — use particulate erosion models.",
        },
      ],
    },
    tableCaption:
      "NPS 4 Sch 40 (ID 102.26 mm) — water ρ = 998 kg/m³, C = 100 (vc ≈ 3.86 m/s)",
    tableHeaders: ["Q (m³/h)", "v (m/s)", "v / vc", "Status"],
    tableRows: [
      ["20", "0.68", "18%", "Safe"],
      ["40", "1.35", "35%", "Safe"],
      ["50", "1.69", "44%", "Safe"],
      ["80", "2.71", "70%", "Safe"],
      ["100", "3.38", "88%", "Warning"],
      ["130", "4.40", "114%", "Erosion Risk"],
    ],
    tableColumnUnits: [
      { index: 0, quantity: "flow", digits: 1 },
      { index: 1, quantity: "velocity", digits: 2 },
    ],
    tableFootnote:
      "Matches this app’s rules: Warning if v ≥ 0.8·vc or liquid v > 3.5 m/s (CS); Erosion Risk if v ≥ vc. Default Q = 40 m³/h is Safe (~35% of vc).",
    materialLimitations: {
      title: "Material Caps & C Factors (This App)",
      summary:
        "Material family selects schedule set (B36.10M vs B36.19M), default C, and liquid warning cap.",
      items: [
        {
          materialGroup: "Carbon & Alloy Steel",
          temperatureLimit: "Liquid warning cap 3.5 m/s (11.5 ft/s)",
          stressLimit: "Default C = 100",
          notes: "B36.10M schedules. Continuous solids-free screening.",
        },
        {
          materialGroup: "Stainless / CRA",
          temperatureLimit: "Liquid warning cap 5.0 m/s (16.4 ft/s)",
          stressLimit: "Default C = 150",
          notes: "B36.19M S schedules. Higher C reflects tougher passive films.",
        },
        {
          materialGroup: "Gas service",
          temperatureLimit: "Typical band ~10–25 m/s (screening note)",
          stressLimit: "Still compare v to vc",
          notes: "Liquid cap does not apply when ρ < 400 kg/m³ in this app.",
        },
        {
          materialGroup: "Two-phase / sand",
          temperatureLimit: "Enter mixture ρ if screening",
          stressLimit: "RP 14E clean-fluid assumption",
          notes: "Formal multiphase / sand erosion analysis is outside this tool.",
        },
      ],
      codeRestrictions: [
        "Calculator scope: v = Q/A, vc = C/√ρ (RP 14E), CS/SS liquid caps, and Safe/Warning/Erosion Risk.",
        "Does not replace particulate erosion models (DNV-RP-O501 / Tulsa) for sand service.",
        "Does not check AIV/FIV acoustic limits on high-velocity gas lines.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Match the Calculator Default",
      scenario:
        "Reproduce the app default: CS NPS 4 Sch 40, Q = 40 m³/h, ρ = 998 kg/m³, C = 100.",
      designConditions: [
        { label: "Material", value: "Carbon steel · C = 100 · liquid cap 3.5 m/s" },
        { label: "Pipe", value: "NPS 4 Sch 40 (ID = 102.26 mm)" },
        { label: "Flow Q", value: "40 m³/h" },
        { label: "Density ρ", value: "998 kg/m³ (62.3 lb/ft³)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Flow area A",
          formula: "A = \\pi D^2 / 4",
          calculation: "D = 0.10226 m → A = 0.008213 m².",
          result: "A = 0.008213 m²",
          note: "From pipeSchedule.json Sch 40 ID.",
        },
        {
          step: "Step 2",
          name: "Mean velocity v",
          formula: "v = Q / A",
          calculation: "Q = 40/3600 = 0.01111 m³/s → v = 1.353 m/s.",
          result: "v = 1.35 m/s",
          note: "Hero output for the default case.",
        },
        {
          step: "Step 3",
          name: "API RP 14E limit vc",
          formula: "v_c = C / \\sqrt{\\rho_{lb/ft^3}}\\ (\\mathrm{ft/s})",
          calculation:
            "ρ = 998 × 0.062428 = 62.30 lb/ft³ → vc = 100/√62.30 = 12.67 ft/s = 3.86 m/s.",
          result: "vc = 3.86 m/s",
          note: "Same conversion used in the engine.",
        },
        {
          step: "Step 4",
          name: "Ratio and liquid cap",
          formula: "v/v_c,\\quad v \\le 3.5\\ \\mathrm{m/s}",
          calculation: "v/vc = 1.353/3.862 = 35%. Liquid cap check: 1.35 < 3.5 m/s.",
          result: "v/vc = 35% · below liquid cap",
          note: "Both Safe criteria satisfied.",
        },
        {
          step: "Step 5",
          name: "Status",
          calculation: "v < 0.8·vc and v ≤ liquid cap → Safe.",
          result: "Status: Safe",
          note: "Matches the calculator default screening result.",
        },
      ],
      conclusion:
        "Default app case: v ≈ 1.35 m/s, vc ≈ 3.86 m/s (35% utilization), Status Safe. Raise NPS or cut Q if Warning / Erosion Risk appears.",
    },
    ...howTo("How to check flow velocity and erosion", [
      { name: "1. Select material, NPS, schedule", text: "CS uses B36.10M; SS uses B36.19M. ID sets area A." },
      { name: "2. Enter flow Q", text: "m³/h or GPM. Hero shows v = Q/A." },
      { name: "3. Optional 1.2: ρ and C", text: "Defaults: water-like ρ and C = 100 (CS) / 150 (SS)." },
      { name: "4. Read v, vc, status", text: "If Warning or Erosion Risk, increase NPS or reduce Q, then export." },
    ]),
    faq: [
      {
        question: "What does vc = C / √ρ mean?",
        answer:
          "API RP 14E sets an **erosional velocity limit** from empirical factor **C** and density **ρ in lb/ft³**. This app converts your density input, computes **vc**, and compares it to **v = Q/A**.",
      },
      {
        question: "When should C be 100 vs 150?",
        answer:
          "**C = 100** is the CS continuous solids-free default. **C = 150** is the SS/CRA default here (Norsok / ISO style guidance). Intermittent CS service is often **125–150** — follow site standards.",
      },
      {
        question: "Why a 3.5 m/s liquid cap if vc is higher?",
        answer:
          "Even when RP 14E allows a higher **vc**, this app flags **Warning** for CS liquids above **3.5 m/s** (SS **5.0 m/s**) for FAC / film-stripping and plant hydraulic practice.",
      },
      {
        question: "Does this cover sand slurry erosion?",
        answer:
          "**No.** RP 14E assumes relatively clean fluids. High sand loadings need dedicated particulate erosion models — not this screening tool.",
      },
    ],
  },

};

export function getCalculatorSeo(slug: string): CalculatorSeoEntry | undefined {
  return CALCULATOR_SEO[slug];
}
