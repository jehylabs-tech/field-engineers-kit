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
          notes: "In pump hydraulic calculations, water density shifts from 1,000 kg/m³ at 4 °C to 998 kg/m³ at 20 °C and 958 kg/m³ at 100 °C.",
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
      '<p class="eng-eq"><i>t</i><sub>m</sub> = <i>t</i> + <i>c</i></p>' +
      '<p class="eng-plain">ASME B31.3 Para. 304.1.2(a) Eq. (3a) · Thin-wall pipe (t &lt; D/6)</p>',
    formulaLatex:
      "t = \\frac{P \\cdot D}{2(S \\cdot E + P \\cdot Y)},\\quad t_m = t + c",
    formulaNotes:
      "Minimum required wall thickness for straight process pipe under internal design pressure follows ASME B31.3 paragraph 304.1.2(a) Equation (3a). For ferritic steels at or below 482 °C (900 °F), coefficient Y = 0.4. Pressure P and allowable stress S must share identical stress units (MPa or psi); outside diameter D, thickness t, and corrosion allowance c share length units (mm or in).",
    formulaBadges: [
      { label: "Y (Ferritic ≤ 482°C)", value: "0.4" },
      { label: "E (Seamless)", value: "1.00" },
      { label: "E (ERW)", value: "0.85" },
      { label: "Mill Tolerance", value: "-12.5%" },
    ],
    variables: [
      { symbol: "t_m", name: "Total minimum required thickness", definition: "Pressure design thickness t plus mechanical, corrosion, and erosion allowances c (mm or in)." },
      { symbol: "t", name: "Pressure design thickness", definition: "Net wall thickness required solely to resist internal design gauge pressure P (mm or in)." },
      { symbol: "P", name: "Internal design pressure", definition: "Internal gauge design pressure from piping material specification (MPa, bar, or psi)." },
      { symbol: "D", name: "Outside diameter", definition: "Outside diameter per ASME B36.10M / B36.19M (not nominal pipe size NPS) in mm or in." },
      { symbol: "S", name: "Basic allowable stress", definition: "Allowable stress value from ASME B31.3 Table A-1 at metal design temperature (e.g. A106 Gr.B = 137.9 MPa / 20.0 ksi up to 204 °C)." },
      { symbol: "E", name: "Longitudinal weld joint quality factor", definition: "Quality factor per Table 302.3.4 (1.00 for Seamless, 0.85 for ERW, 0.60 for Furnace Butt-Welded)." },
      { symbol: "Y", name: "Wall thickness coefficient", definition: "Geometry/material factor per Table 304.1.1 (0.4 for Ferritic/Austenitic steels at T ≤ 482 °C when t < D/6)." },
      { symbol: "c", name: "Allowances sum", definition: "Sum of corrosion allowance (CA), erosion allowance, and thread/groove depth allowances (mm or in)." },
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
        "Per ASME B31.3 and ASTM specifications, the pressure design thickness (t) must be augmented by corrosion and mechanical allowances (c) to calculate the minimum required thickness (tm). Before selecting a commercial schedule, the manufacturing under-tolerance must be incorporated so the finished pipe never falls below tm.",
      items: [
        {
          label: "Mill Under-Tolerance (ASTM A106 / A53)",
          value: "-12.5%",
          description:
            "Seamless and welded steel pipe manufacturing standards permit up to a 12.5% reduction below nominal wall thickness during fabrication. The ordered nominal schedule wall must satisfy: t_nom ≥ t_m / (1 - 0.125) = t_m / 0.875.",
        },
        {
          label: "Corrosion Allowance (CA)",
          value: "1.5 ~ 3.0 mm",
          description:
            "Specified in project Piping Material Specifications (PMS). Typical values: 1.5 mm for dry hydrocarbons/utilities, 3.0 mm for corrosive wet gas/produced water, and 0.0 mm for corrosion-resistant stainless alloys.",
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
      "B31.3 tmin at 20 bar (2.0 MPa), A106 Gr.B, S = 138 MPa, E = 1, Y = 0.4, c = 0 vs Sch 40 / Sch 80 mill wall",
    tableHeaders: ["NPS", "OD (mm)", "tmin (mm)", "Sch 40 t (mm)", "Sch 80 t (mm)"],
    tableRows: NPS_WALL.map((row) => [
      row.nps,
      fmt(row.od, 2),
      fmt(tminMm(row.od), 3),
      fmt(row.sch40, 2),
      fmt(row.sch80, 2),
    ]),
    tableFootnote:
      "OD from ASME B36.10M. NPS 12 Sch 40/80 walls are handbook values (10.31 / 17.48 mm). Confirm mill tolerance and CA on the isometric before cutting or rerate.",
    materialLimitations: {
      title: "Material Specifications & Temperature Derating",
      summary:
        "Allowable stress S is strongly temperature-dependent. As metal temperature increases, allowable stress derates significantly according to ASME B31.3 Table A-1.",
      items: [
        {
          materialGroup: "ASTM A106 Gr. B (Carbon Steel)",
          temperatureLimit: "-29 °C to 427 °C (-20 °F to 800 °F)",
          stressLimit: "137.9 MPa (20.0 ksi) @ ≤204 °C → 103.4 MPa @ 400 °C",
          notes: "Primary material for non-corrosive hydrocarbons and steam. Graphitization risk occurs above 427 °C under long-term exposure.",
        },
        {
          materialGroup: "ASTM A333 Gr. 6 (Low-Temp Carbon Steel)",
          temperatureLimit: "-45 °C to 427 °C (-50 °F to 800 °F)",
          stressLimit: "137.9 MPa (20.0 ksi) @ ≤204 °C",
          notes: "Charpy V-notch impact tested at -45 °C for cryogenic blowdown, flare headers, and cold ambient services.",
        },
        {
          materialGroup: "ASTM A312 TP304L (Austenitic SS)",
          temperatureLimit: "-196 °C to 427 °C (-320 °F to 800 °F)",
          stressLimit: "115.1 MPa (16.7 ksi) @ ≤38 °C → 78.6 MPa @ 300 °C",
          notes: "Low-carbon austenitic stainless steel for corrosive chemical media. Lower yield strength than carbon steel at ambient temperature.",
        },
        {
          materialGroup: "ASTM A312 TP316L (Austenitic SS)",
          temperatureLimit: "-196 °C to 450 °C (-320 °F to 842 °F)",
          stressLimit: "115.1 MPa (16.7 ksi) @ ≤38 °C → 82.0 MPa @ 300 °C",
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
        { label: "Design Pressure (P)", value: "3.50 MPa (35.0 bar / 507.6 psi)" },
        { label: "Design Temperature (T)", value: "150 °C (302 °F)" },
        { label: "Pipe Material", value: "ASTM A106 Gr. B Seamless" },
        { label: "Allowable Stress (S)", value: "137.9 MPa (20.0 ksi)" },
        { label: "Joint Quality (E)", value: "1.00 (Seamless)" },
        { label: "Corrosion Allowance (c)", value: "2.00 mm" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Determine Pipe Geometry and Material Factors",
          calculation: "Outside Diameter D = 168.28 mm (ASME B36.10M), S = 137.9 MPa (B31.3 Table A-1 @ 150 °C), E = 1.00 (Seamless), Y = 0.40 (Ferritic steel ≤ 482 °C)",
          result: "D = 168.28 mm, S = 137.9 MPa, E = 1.00, Y = 0.40",
          note: "Outside diameter is fixed by standard; coefficient Y = 0.4 applies to ductile ferritic steels under 482 °C.",
        },
        {
          step: "Step 2",
          name: "Calculate Pressure Design Wall Thickness (t)",
          formula: "t = (P · D) / [2 · (S · E + P · Y)]",
          calculation: "t = (3.50 × 168.28) / [2 × (137.9 × 1.00 + 3.50 × 0.40)] = 588.98 / [2 × (137.9 + 1.40)] = 588.98 / 278.60",
          result: "t = 2.114 mm",
          note: "This represents the net wall thickness required strictly to contain internal hoop pressure.",
        },
        {
          step: "Step 3",
          name: "Calculate Total Minimum Required Thickness (tm) with Corrosion Allowance",
          formula: "t_m = t + c",
          calculation: "t_m = 2.114 mm + 2.000 mm",
          result: "t_m = 4.114 mm",
          note: "Total minimum thickness threshold that the pipe wall must never fall below during operation.",
        },
        {
          step: "Step 4",
          name: "Apply Mill Under-Tolerance (-12.5%) for Nominal Purchase Wall",
          formula: "t_req,nom = t_m / (1 - 0.125) = t_m / 0.875",
          calculation: "t_req,nom = 4.114 mm / 0.875",
          result: "t_req,nom = 4.702 mm",
          note: "Commercial pipe must have a nominal thickness of at least 4.702 mm so that after -12.5% mill thinning, wall ≥ 4.114 mm.",
        },
        {
          step: "Step 5",
          name: "Select Commercial Schedule from ASME B36.10M & Verify Compliance",
          calculation: "ASME B36.10M NPS 6 standard schedules: Sch 40 (STD) nominal wall = 7.11 mm, min mill wall (0.875 × 7.11) = 6.22 mm vs Sch 80 (XS) nominal wall = 10.97 mm.",
          result: "Select NPS 6 Schedule 40 (STD, 7.11 mm nominal)",
          note: "Sch 40 nominal wall (7.11 mm) > 4.702 mm required nominal; minimum mill wall (6.22 mm) > 4.114 mm t_m. Safety margin = +51.2% over t_m.",
        },
      ],
      conclusion:
        "NPS 6 Schedule 40 (STD, 7.11 mm nominal wall) is fully code-compliant for 3.50 MPa at 150 °C with 2.0 mm corrosion allowance, providing a substantial safety buffer against pressure and external bending.",
    },
    ...howTo("How to check process pipe wall thickness", [
      { name: "1. Enter design pressure and outside diameter", text: "Use the line class P and B36.10M OD for the NPS (4 in Sch 40 OD is 114.3 mm, not 4.000 in)." },
      { name: "2. Set S, E, Y, and corrosion allowance", text: "A106 Gr.B at 100 °C uses about 138 MPa. Seamless E = 1. Add site CA (often 1.5–3 mm)." },
      { name: "3. Compare tmin with actual / schedule wall", text: "If actual wall (UT or purchase Sch) is below tmin, the spool fails the screening check." },
      { name: "4. Verify output and export PDF", text: "Carry the same NPS and pressure into hydrotest and flange tools, then export the work-pack PDF." },
    ]),
    faq: [
      {
        question: "Is ASME B31.3 tmin the same as ASME B31.1 Power Piping?",
        answer:
          "No. ASME B31.3 uses **t = PD / [2(SE + PY)]** where Y = 0.4 for ferritic steels. ASME B31.1 power piping formulas use different stress basis factors and weld strength reduction factors (W). Applying B31.1 equations to chemical process piping or vice versa without code verification can lead to non-compliant wall sizing.",
      },
      {
        question: "Why must mill under-tolerance (12.5%) be applied to nominal schedule selection?",
        answer:
          "ASTM manufacturing specifications (ASTM A106, A53, API 5L) permit seamless and ERW pipe to be fabricated up to **12.5% thinner** than nominal catalog wall. If you purchase pipe matching t_m exactly without dividing by 0.875, the delivered pipe wall could legally be thinner than code-required minimum wall t_m.",
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
      '<p class="eng-eq"><i>ID</i> = <i>OD</i> − 2<i>t</i> &nbsp;·&nbsp; <i>W</i><sub>m</sub> = 0.0246615 × <i>t</i> × (<i>OD</i> − <i>t</i>)</p>' +
      '<p class="eng-plain">ASME B36.10M / B36.19M Standard Pipe Geometry &amp; Unit Linear Weight</p>',
    formulaLatex: "ID = OD - 2t,\\quad W_m = 0.0246615\\cdot t\\cdot (OD - t)",
    formulaNotes:
      "Nominal Pipe Size (NPS) is a dimensionless designator; it equals actual outside diameter only at NPS 14 (355.6 mm) and above. For NPS 1/8 through NPS 12, outside diameter is larger than the nominal inch size. Wall thickness by schedule number is standardized in ASME B36.10M (welded and seamless wrought steel pipe) and ASME B36.19M (stainless steel pipe with 'S' suffix).",
    formulaBadges: [
      { label: "Steel Density", value: "7,850 kg/m³" },
      { label: "NPS ≤ 12", value: "OD > Nominal" },
      { label: "NPS ≥ 14", value: "OD = Nominal" },
      { label: "B36.19M", value: "S-Suffix (5S/10S/40S/80S)" },
    ],
    variables: [
      { symbol: "NPS / DN", name: "Nominal Size", definition: "Dimensionless size tag (NPS in inches, DN per ISO 6708 in mm, e.g. NPS 4 = DN 100)." },
      { symbol: "OD", name: "Outside Diameter", definition: "Governing outside diameter standardized in ASME B36.10M / B36.19M (mm or in)." },
      { symbol: "t", name: "Nominal Wall Thickness", definition: "Catalog nominal wall thickness specified by schedule designation (mm or in)." },
      { symbol: "ID", name: "Inside Diameter", definition: "Internal bore diameter available for fluid flow: ID = OD - 2t (mm or in)." },
      { symbol: "W_m", name: "Unit Linear Weight", definition: "Plain end pipe mass per unit length (kg/m in metric, lb/ft in imperial)." },
      { symbol: "A_flow", name: "Internal Flow Area", definition: "Cross-sectional flow area: A = π · ID² / 4 (mm² or in²)." },
    ],
    standards: [
      "ASME B36.10M (Carbon & Alloy Steel)",
      "ASME B36.19M (Stainless Steel)",
      "ISO 6708 (DN Designation)",
      "ASTM A53 / A106 / A312",
    ],
    allowancesAndTolerances: {
      title: "Manufacturing Tolerances & Schedule Equivalence",
      summary:
        "ASME B36.10M and ASTM pipe manufacturing specifications impose precise dimensional tolerances for outside diameter, wall thickness, and straightness. Understanding schedule naming rules is critical during procurement and isometric drafting.",
      items: [
        {
          label: "Wall Thickness Under-Tolerance",
          value: "-12.5% (ASTM)",
          description:
            "Standard seamless/welded pipe specifications (ASTM A106/A53/API 5L) permit the minimum wall thickness at any point to be up to 12.5% thinner than nominal t. Hydraulic calculations use nominal ID, while pressure containment requires minimum wall t × 0.875.",
        },
        {
          label: "Outside Diameter Tolerance",
          value: "±0.79 mm ~ ±1.6 mm",
          description:
            "ASTM specifications limit OD variations: for NPS 2 to 4 typically ±0.79 mm (1/32 in); for NPS 5 to 8 +1.59/-0.79 mm; for NPS ≥ 10 +1.6%/-0.8% of nominal OD to ensure proper butt-weld fit-up.",
        },
        {
          label: "STD / XS vs Sch 40 / Sch 80",
          value: "NPS ≤ 10 Equivalent",
          description:
            "Standard Weight (STD) equals Schedule 40 from NPS 1/8 to NPS 10. Extra Strong (XS) equals Schedule 80 from NPS 1/8 to NPS 8. Above these sizes, schedule numbers and weight classes diverge (e.g. NPS 12 STD = 9.53 mm, Sch 40 = 10.31 mm).",
        },
        {
          label: "Carbon Steel vs Stainless (B36.19M)",
          value: "Schedule S Divergence",
          description:
            "Stainless schedules with 'S' suffix (Sch 5S, 10S, 40S, 80S) are tailored for corrosion resistance. In sizes NPS 12 and above, Sch 40S and Sch 80S walls differ from carbon steel B36.10M Sch 40 and Sch 80.",
        },
      ],
    },
    tableCaption: "ASME B36.10M carbon steel — selected NPS Sch 40 / Sch 80",
    tableHeaders: ["NPS", "OD (mm)", "Sch 40 t (mm)", "Sch 40 ID (mm)", "Sch 80 t (mm)"],
    tableRows: [
      ["2\"", "60.32", "3.91", "52.51", "5.54"],
      ["4\"", "114.30", "6.02", "102.26", "8.56"],
      ["6\"", "168.28", "7.11", "154.06", "10.97"],
      ["8\"", "219.10", "8.18", "202.74", "12.70"],
      ["10\"", "273.05", "9.27", "254.51", "15.09"],
      ["12\"", "323.85", "10.31", "303.23", "17.48"],
    ],
    tableFootnote: "NPS 2–10 match this app’s lookup table. NPS 12 is B36.10M handbook data for crawler/reference use.",
    materialLimitations: {
      title: "Material Weight Classes & Code Applicability",
      summary:
        "Pipe weight, internal volume, and rigidity dictate structural pipe rack support spacing and maximum allowable fluid velocity across different material grades.",
      items: [
        {
          materialGroup: "Carbon Steel (ASTM A106 / A53)",
          temperatureLimit: "-29 °C to 427 °C (-20 °F to 800 °F)",
          stressLimit: "Density = 7,850 kg/m³ (0.284 lb/in³)",
          notes: "Primary material for oil, gas, steam, and utility headers. Standard schedule choice is Sch 40/STD for general lines, Sch 80/XS for high-pressure or threaded connections.",
        },
        {
          materialGroup: "Stainless Steel (ASTM A312 304L/316L)",
          temperatureLimit: "-196 °C to 450 °C (-320 °F to 842 °F)",
          stressLimit: "Density = 7,930 ~ 7,980 kg/m³",
          notes: "Governed by ASME B36.19M. Thinner Sch 10S/40S commonly selected to reduce procurement cost while maintaining corrosion resistance.",
        },
        {
          materialGroup: "Duplex SS (ASTM A790 UNS S31803 / S32750)",
          temperatureLimit: "-50 °C to 280 °C (-58 °F to 536 °F)",
          stressLimit: "Density = 7,800 kg/m³",
          notes: "High yield strength allows 20–40% wall thickness reduction compared to 316L, yielding substantial weight and fabrication savings.",
        },
        {
          materialGroup: "High-Yield Line Pipe (API 5L X52 to X70)",
          temperatureLimit: "-29 °C to 120 °C (-20 °F to 248 °F)",
          stressLimit: "Density = 7,850 kg/m³",
          notes: "Cross-country and gathering lines; customized thin-wall high-strength pipe often ordered outside standard B36.10M schedule tables.",
        },
      ],
      codeRestrictions: [
        "Threaded Pipe Limitations: Per ASME B31.3 Para. 314.2, male threaded connections on carbon steel require minimum Schedule 80 for NPS ≤ 1½ and Schedule 40 for NPS 2 to prevent mechanical shearing at the thread root.",
        "Support Span and Deflection: Thinner schedules (Sch 10S / Sch 20) in larger diameters have lower second moment of area (I); support spacing must be reduced to prevent liquid pooling and excessive sagging deflection (L/360 limit).",
        "Erosion and Velocity Impact: Increasing schedule number from Sch 40 to Sch 80 reduces internal cross-sectional area (e.g. -24% in NPS 4), accelerating fluid velocity and pressure loss for identical volumetric flow rate.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Hydraulic & Weight Calculation for NPS 8 Schedule 80",
      scenario:
        "Determine the precise outside diameter, inside diameter, cross-sectional flow area, empty plain-end linear weight, and water-filled linear weight for an NPS 8 Schedule 80 carbon steel pipe run.",
      designConditions: [
        { label: "Nominal Size", value: "NPS 8 (DN 200)" },
        { label: "Schedule Designation", value: "Schedule 80 (XS)" },
        { label: "Material", value: "ASTM A106 Gr. B Carbon Steel (ρ = 7,850 kg/m³)" },
        { label: "Process Medium", value: "Water @ 20 °C (ρ_w = 998 kg/m³)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Extract Standard Outside Diameter (OD) and Nominal Wall (t)",
          calculation: "Per ASME B36.10M Table 1 for NPS 8: Outside Diameter OD = 219.08 mm (8.625 in), Nominal Wall Thickness t = 12.70 mm (0.500 in).",
          result: "OD = 219.08 mm, t = 12.70 mm",
          note: "Outside diameter is exactly 8.625 inches (219.08 mm); nominal wall is 0.500 inches (12.70 mm).",
        },
        {
          step: "Step 2",
          name: "Calculate Actual Inside Diameter (ID)",
          formula: "ID = OD - 2 · t",
          calculation: "ID = 219.08 mm - 2 × 12.70 mm = 219.08 mm - 25.40 mm",
          result: "ID = 193.68 mm (7.625 in)",
          note: "Notice that Sch 40 NPS 8 has ID = 202.74 mm; Sch 80 reduces inside bore by 9.06 mm.",
        },
        {
          step: "Step 3",
          name: "Calculate Cross-Sectional Flow Area (A_flow)",
          formula: "A_flow = π · ID² / 4",
          calculation: "A_flow = π × (193.68 mm)² / 4 = 3.14159 × 37,511.94 / 4 = 29,461.3 mm² = 0.02946 m²",
          result: "A_flow = 29,461 mm² (45.66 in²)",
          note: "Internal flow area is used to compute line velocity: v = Q / A_flow.",
        },
        {
          step: "Step 4",
          name: "Calculate Plain-End Pipe Linear Weight (W_pipe)",
          formula: "W_pipe = 0.0246615 · t · (OD - t)",
          calculation: "W_pipe = 0.0246615 × 12.70 × (219.08 - 12.70) = 0.31320 × 206.38",
          result: "W_pipe = 64.64 kg/m (43.43 lb/ft)",
          note: "Standard catalog nominal linear mass for bare steel pipe.",
        },
        {
          step: "Step 5",
          name: "Calculate Full-Water Line Weight for Pipe Rack Loading (W_total)",
          formula: "W_water = A_flow · ρ_water = 0.02946 m² × 998 kg/m³ = 29.40 kg/m; W_total = W_pipe + W_water",
          calculation: "W_total = 64.64 kg/m + 29.40 kg/m",
          result: "W_total = 94.04 kg/m (63.19 lb/ft)",
          note: "Structural engineers require water-filled line weight (including hydrotest water) for pipe rack beam and support sizing.",
        },
      ],
      conclusion:
        "For NPS 8 Schedule 80, the pipe has OD = 219.08 mm, ID = 193.68 mm, dry linear weight = 64.64 kg/m, and water-filled weight = 94.04 kg/m. Structural rack spans must be planned accordingly.",
    },
    ...howTo("How to look up pipe schedule dimensions", [
      { name: "1. Select NPS", text: "Pick the isometric size (2, 4, 6, 8, 10 in this table set)." },
      { name: "2. Select schedule", text: "Sch 40 / STD and Sch 80 / XS are the usual carbon-steel pair." },
      { name: "3. Read OD, ID, t, and unit weight", text: "Use ID for velocity and ΔP; use OD for B31.3 thickness and insulation." },
      { name: "4. Verify output and export PDF", text: "Carry NPS/schedule into thickness, velocity, and weight calculators." },
    ]),
    faq: [
      {
        question: "Why is 4 inch pipe 114.3 mm OD instead of 101.6 mm?",
        answer:
          "Nominal Pipe Size (NPS) is a **dimensionless nominal designator**, not a direct measurement of outside diameter for sizes under NPS 14. Historically established in the wrought-iron era, **NPS 4 pipe is standardized at 4.500 in (114.3 mm) OD**. Only at **NPS 14 and larger** does the numerical NPS match the actual outside diameter in inches (e.g. NPS 14 = 14.000 in / 355.6 mm OD).",
      },
      {
        question: "What is the exact relationship between STD/XS and Schedule 40/80?",
        answer:
          "For **NPS 1/8 through NPS 10**, Standard Weight (STD) wall is identical to **Schedule 40**. For **NPS 1/8 through NPS 8**, Extra Strong (XS) wall is identical to **Schedule 80**. Above these sizes, they diverge: for example, **NPS 12 STD is 9.53 mm** (0.375 in) whereas **NPS 12 Sch 40 is 10.31 mm** (0.406 in). Material requisitions must explicitly state the schedule number or exact wall thickness.",
      },
      {
        question: "How does stainless Schedule 40S differ from carbon steel Schedule 40?",
        answer:
          "Schedule 40 is defined in **ASME B36.10M** for carbon steel, while Schedule 40S is governed by **ASME B36.19M** for stainless alloys. For sizes **NPS 12 and smaller, Sch 40 and Sch 40S wall thicknesses are identical**. However, at **NPS 14 and above**, ASME B36.19M Sch 40S wall is standardized at 9.53 mm (0.375 in), whereas B36.10M Sch 40 increases with diameter (e.g. NPS 16 Sch 40 = 12.70 mm).",
      },
      {
        question: "Which diameter (OD or ID) must be used when sizing for fluid velocity vs pressure rating?",
        answer:
          "Fluid flow calculations (velocity, Reynolds number, pressure drop) must strictly use the **Inside Diameter (ID)** because flow occurs through the internal bore: **v = Q / (π ID² / 4)**. Conversely, code pressure containment design (ASME B31.3 / B31.1) and thermal insulation sizing are calculated based on the **Outside Diameter (OD)**.",
      },
    ],
  },

  "flange-dimension-weight": {
    slug: "flange-dimension-weight",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><i>W</i><sub>pair</sub> = 2<i>W</i><sub>f</sub> + <i>W</i><sub>g</sub> + <i>n</i>(<i>W</i><sub>stud</sub> + 2<i>W</i><sub>nut</sub>)</p>' +
      '<p class="eng-plain">ASME B16.5 / B16.47 Flange Envelope, Bolt Pattern &amp; Total Joint Assembly Mass</p>',
    formulaLatex: "W_{pair} = 2W_f + W_g + n(W_{stud}+2W_{nut})",
    formulaNotes:
      "Weld-neck raised-face (WN RF), slip-on (SO), and blind flanges for NPS 1/2 through NPS 24 in Pressure Classes 150 through 2500 are dimensioned in ASME B16.5. Large diameter flanges (NPS 26 through NPS 60) are governed by ASME B16.47 (Series A / MSS SP-44 vs Series B / API 605). Hub bore matches standard pipe schedule inside diameter per ASME B36.10M. Total mated-pair mass accounts for two flanges, one gasket, and all threaded stud bolts with two heavy-hex nuts each.",
    formulaBadges: [
      { label: "B16.5 Scope", value: "NPS ½ ~ 24" },
      { label: "B16.47 Scope", value: "NPS 26 ~ 60" },
      { label: "Classes", value: "150 ~ 2500" },
      { label: "Facings", value: "RF (1/16\" or 1/4\") / FF / RTJ" },
    ],
    variables: [
      { symbol: "Class", name: "Pressure Rating Class", definition: "Dimensionless class designation (150, 300, 600, 900, 1500, 2500) representing pressure-temperature envelope." },
      { symbol: "OD_f", name: "Flange Outside Diameter", definition: "Total outside diameter of the circular flange forging (mm or in)." },
      { symbol: "T_f", name: "Minimum Flange Thickness", definition: "Flange ring thickness excluding raised face height (mm or in)." },
      { symbol: "PCD", name: "Pitch Circle Diameter (Bolt Circle)", definition: "Diameter of the circle passing through the centers of all bolt holes (mm or in)." },
      { symbol: "n × d_h", name: "Bolt Hole Configuration", definition: "Total number of bolt holes (n) and drilled hole diameter (d_h = stud diameter + 1/8 in / 3.2 mm)." },
      { symbol: "W_f", name: "Single Flange Mass", definition: "Nominal catalog weight of bare forged flange (kg or lb)." },
      { symbol: "W_pair", name: "Mated Joint Assembly Mass", definition: "Combined weight of 2 flanges + 1 gasket + n complete stud/nut sets (kg or lb)." },
    ],
    standards: [
      "ASME B16.5 (Pipe Flanges and Flanged Fittings NPS 1/2 - 24)",
      "ASME B16.47 (Large Diameter Steel Flanges NPS 26 - 60)",
      "ASME B16.20 (Metallic Gaskets for Pipe Flanges)",
      "ASME B18.2.1 / B18.2.2 (Heavy Hex Bolts & Nuts)",
    ],
    allowancesAndTolerances: {
      title: "Manufacturing Tolerances & Assembly Rules",
      summary:
        "ASME B16.5 establishes strict dimensional tolerances on flange forging, bolt hole spacing, and facing finishes to guarantee leak-tight sealability and bolt alignment across field spools.",
      items: [
        {
          label: "Raised Face Height & Finish",
          value: "1/16\" (Cl 150/300) vs 1/4\" (Cl ≥ 600)",
          description:
            "Class 150 & 300 have a 1.6 mm (1/16 in) raised face included in catalog thickness T. Class 600 through 2500 have a 6.4 mm (1/4 in) raised face added on top of thickness T. Standard RF finish is serrated concentric or spiral grooves (Ra 3.2 ~ 6.3 µm / 125 ~ 250 µin).",
        },
        {
          label: "Bolt Circle & Hole Spacing Tolerance",
          value: "±1.5 mm (±0.06 in)",
          description:
            "ASME B16.5 limits center-to-center adjacent bolt hole spacing tolerance to ±0.8 mm (±0.03 in), and pitch circle diameter tolerance to ±1.5 mm (±0.06 in) to prevent bolt binding during stud makeup.",
        },
        {
          label: "Bore & Hub Thickness Tolerance",
          value: "+0.8 mm / -0.0 mm",
          description:
            "Weld-neck hub bore diameter tolerance is +0.8 mm / -0.0 mm for NPS ≤ 10, and +1.6 mm / -0.0 mm for NPS 12 to 18 to minimize internal step discontinuity and flow turbulence at the butt-weld seam.",
        },
        {
          label: "B16.47 Series A vs Series B",
          value: "Non-Interchangeable",
          description:
            "Series A (MSS SP-44 origin) has heavier flanges, larger bolt circles, and fewer, thicker bolts designed for piping. Series B (API 605 origin) has compact flanges with smaller, more numerous bolts for equipment nozzles. Bolt patterns do not mate.",
        },
      ],
    },
    tableCaption: "ASME B16.5 weld-neck RF — Class 150 selected sizes",
    tableHeaders: ["NPS", "Flange OD (mm)", "Thickness T (mm)", "Bolt circle (mm)", "Bolts"],
    tableRows: [
      ["2\"", "152.4", "17.5", "120.7", "4 × 5/8\""],
      ["4\"", "228.6", "23.8", "190.5", "8 × 5/8\""],
      ["6\"", "279.4", "25.4", "241.3", "8 × 3/4\""],
      ["8\"", "342.9", "28.6", "298.5", "8 × 3/4\""],
      ["10\"", "406.4", "30.2", "362.0", "12 × 7/8\""],
      ["12\"", "482.6", "31.8", "431.8", "12 × 7/8\""],
    ],
    tableFootnote: "NPS 4 values match this app’s Class 150 row. Other sizes are B16.5 handbook screening dimensions — confirm facing and hub on the vendor drawing.",
    materialLimitations: {
      title: "Pressure-Temperature Ratings & Material Groups",
      summary:
        "Pressure Class (e.g. 150, 300) does not represent working pressure in psi or bar. Maximum allowable working pressure (MAWP) decreases drastically with increasing operating temperature per ASME B16.5 Table 2 rating charts.",
      items: [
        {
          materialGroup: "Group 1.1: Carbon Steel (ASTM A105 / A350 LF2)",
          temperatureLimit: "-29 °C to 425 °C (-20 °F to 800 °F)",
          stressLimit: "Cl 150: 19.6 bar @ 38 °C → 6.5 bar @ 300 °C; Cl 300: 51.1 bar @ 38 °C → 39.8 bar @ 300 °C",
          notes: "Most common flange material. Class 150 undergoes severe thermal derating above 100 °C due to bolt relaxing and gasket deformation risks.",
        },
        {
          materialGroup: "Group 2.1: Stainless Steel (ASTM A182 F304 / F304L)",
          temperatureLimit: "-196 °C to 538 °C (-320 °F to 1000 °F)",
          stressLimit: "Cl 150 (F304L): 15.9 bar @ 38 °C → 8.4 bar @ 200 °C",
          notes: "Lower allowable pressure at ambient than carbon steel because austenitic low-carbon stainless has lower yield strength.",
        },
        {
          materialGroup: "Group 2.2: Stainless Steel (ASTM A182 F316 / F316L)",
          temperatureLimit: "-196 °C to 538 °C (-320 °F to 1000 °F)",
          stressLimit: "Cl 150 (F316L): 15.9 bar @ 38 °C → 8.9 bar @ 200 °C; Cl 300: 41.4 bar @ 38 °C",
          notes: "Resistant to pitting corrosion in chloride/acid service. Mo content provides slightly higher allowable rating than 304L at elevated temperatures.",
        },
        {
          materialGroup: "Group 2.8: Duplex Stainless (ASTM A182 F51 / F53)",
          temperatureLimit: "-50 °C to 300 °C (-58 °F to 572 °F)",
          stressLimit: "Cl 150: 20.0 bar @ 38 °C → 14.8 bar @ 200 °C",
          notes: "High strength duplex alloy provides superior pressure ratings up to 300 °C max limit (avoid 475 °C embrittlement range).",
        },
      ],
      codeRestrictions: [
        "Class 150 Flange Limitations: ASME B16.5 Class 150 flanges are prohibited from severe cyclic conditions and should not be tested above 1.5× ambient rating (max 29.4 bar for A105) or used above 425 °C.",
        "Flat Face (FF) vs Raised Face (RF) Mating: Never mate a cast iron or bronze FF flange to a carbon steel RF flange without removing the raised face or using a full-face gasket; bending moments from bolting will crack the cast iron flange.",
        "Rigging & Lifting Mass Calculation: When planning pipe spool crane lifts, always use total mated-pair assembly weight (2 flanges + gasket + studs + nuts) rather than individual flange catalog weights.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Flange Geometry & Total Mated Assembly Mass for NPS 6 Class 300 WN RF",
      scenario:
        "Determine the flange envelope dimensions, bolt pattern, stud specification, and total mated-pair assembly rigging weight for an NPS 6 (DN 150) Class 300 Weld-Neck Raised-Face (WN RF) joint connected to Schedule 40 pipe using ASTM A105 flanges and ASTM A193 B7 stud bolts.",
      designConditions: [
        { label: "Nominal Size", value: "NPS 6 (DN 150)" },
        { label: "Pressure Class", value: "Class 300" },
        { label: "Facing & Type", value: "Weld-Neck Raised-Face (WN RF, 1.6 mm RF)" },
        { label: "Pipe Schedule", value: "Schedule 40 (OD = 168.28 mm, t = 7.11 mm, ID = 154.06 mm)" },
        { label: "Flange Material", value: "ASTM A105 Forged Carbon Steel" },
        { label: "Fasteners", value: "ASTM A193 B7 Studs + A194 2H Heavy Hex Nuts" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Extract ASME B16.5 Envelope Dimensions",
          calculation: "Per ASME B16.5 Table 11 for NPS 6 Class 300: Flange Outside Diameter OD_f = 317.5 mm (12.50 in), Minimum Thickness T_f = 36.5 mm (1.44 in), Overall Length through Hub L_h = 98.4 mm (3.88 in), Hub Bore ID = 154.06 mm (matches Sch 40).",
          result: "OD_f = 317.5 mm, T_f = 36.5 mm, Bore = 154.06 mm",
          note: "Hub bore precisely matches Schedule 40 pipe ID to ensure smooth fluid transition without lip.",
        },
        {
          step: "Step 2",
          name: "Determine Bolting Layout (PCD, Hole Count & Stud Size)",
          calculation: "Per ASME B16.5 Table 12: Pitch Circle Diameter PCD = 269.9 mm (10.62 in), Number of Bolt Holes n = 12, Hole Diameter d_h = 22.2 mm (7/8 in), Stud Bolt Diameter = 3/4 in (M20), Recommended Stud Length L_stud = 120 mm (4.75 in) for RF facing.",
          result: "PCD = 269.9 mm, 12 × 3/4\" Studs (L = 120 mm)",
          note: "12 holes require a star-pattern tightening sequence across 3 torque passes.",
        },
        {
          step: "Step 3",
          name: "Calculate Bare Flange Weight (2 Flanges)",
          formula: "W_2f = 2 · W_single_flange",
          calculation: "Per ASME B16.5 catalog data, single NPS 6 Class 300 WN RF flange weight W_f ≈ 26.50 kg (58.4 lb). For 2 flanges: W_2f = 2 × 26.50 kg = 53.00 kg.",
          result: "W_2f = 53.00 kg (116.8 lb)",
          note: "Represents bare forged steel mass for both mating flanges.",
        },
        {
          step: "Step 4",
          name: "Calculate Complete Stud Bolt and Heavy-Hex Nut Mass",
          formula: "W_fasteners = n · (W_stud + 2 · W_nut)",
          calculation: "3/4\" × 120 mm B7 stud mass ≈ 0.38 kg; two 3/4\" 2H heavy-hex nuts mass ≈ 2 × 0.15 kg = 0.30 kg. Per stud assembly = 0.68 kg. Total for 12 sets: W_fasteners = 12 × 0.68 kg = 8.16 kg.",
          result: "W_fasteners = 8.16 kg (18.0 lb)",
          note: "Never omit heavy-hex nuts and stud extension when evaluating pipe rack deadload.",
        },
        {
          step: "Step 5",
          name: "Calculate Total Mated-Pair Assembly Rigging Weight",
          formula: "W_pair = W_2f + W_gasket + W_fasteners",
          calculation: "W_pair = 53.00 kg (flanges) + 0.35 kg (ASME B16.20 6\" Cl 300 spiral-wound gasket) + 8.16 kg (bolting) = 61.51 kg.",
          result: "W_pair = 61.51 kg (135.6 lb)",
          note: "Spool weight sheet and crane rigging plan must account for ~61.5 kg per NPS 6 Class 300 joint.",
        },
      ],
      conclusion:
        "The complete NPS 6 Class 300 WN RF flanged joint has OD = 317.5 mm, PCD = 269.9 mm with 12 × 3/4\" studs (120 mm length), and a total mated assembly weight of 61.51 kg. Hydrotest rating at ambient is 76.7 bar (1.5× ambient MAWP 51.1 bar).",
    },
    ...howTo("How to look up flange dimensions", [
      { name: "1. Select NPS", text: "Use the pipe NPS, not the flange OD." },
      { name: "2. Select Pressure Class & Facing", text: "Select Class 150 / 300 / 600 and Facing type (RF / FF / RTJ). Hub bore ID automatically applies standard Sch 40 / STD." },
      { name: "3. Read OD, T, PCD, bore, studs, and assembly weight", text: "Match gasket PCD; pick wrench size and check the mated-pair lift weight before issuing a PO." },
      { name: "4. Verify output and export PDF", text: "Carry class and schedule into gasket, bolt-torque (PCC-1), and hydrotest tools." },
    ]),
    faq: [
      {
        question: "Does Class 150 mean the flange is rated for 150 psi?",
        answer:
          "**No**. Pressure class (150, 300, 600, etc.) is a **dimensionless rating designator**, not a constant pressure limit. Maximum Allowable Working Pressure (MAWP) is governed by **material group and operating temperature per ASME B16.5 Table 2**. For example, an ASTM A105 Class 150 flange is rated for **19.6 bar (285 psi) at 38 °C**, but derates to **6.5 bar (95 psi) at 300 °C**.",
      },
      {
        question: "When must ASME B16.47 be used instead of ASME B16.5?",
        answer:
          "**ASME B16.5 covers sizes from NPS 1/2 up to NPS 24**. For large-diameter piping **NPS 26 through NPS 60**, you must specify **ASME B16.47**. Crucially, B16.47 contains two non-interchangeable standards: **Series A** (heavier, fewer large bolts, MSS SP-44 origin) and **Series B** (compact, many small bolts, API 605 origin). Series A and B will not bolt together.",
      },
      {
        question: "Why does Class 600 have a 1/4 inch raised face while Class 150/300 has 1/16 inch?",
        answer:
          "Per ASME B16.5, **Class 150 and 300 flanges have a 1.6 mm (1/16 in) raised face**, which is included within the nominal flange thickness T. **Class 600, 900, 1500, and 2500 flanges have a 6.4 mm (1/4 in) raised face**, which is added in addition to the minimum flange thickness T to provide deeper gasket containment under extreme hydrostatic bolt loads.",
      },
      {
        question: "What is total mated-pair assembly weight and why is it critical for field engineering?",
        answer:
          "Total mated-pair assembly weight equals **2 flanges + 1 gasket + full stud & nut set** (two heavy-hex nuts per stud). In field construction and piping stress analysis, using only single-flange catalog mass severely underestimates pipe rack deadweight and rigging crane loads (e.g. 12 large studs and 24 nuts can add 15–25% extra weight to the joint).",
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
          notes: "Horizontal or vertical-up flow only. Requires sufficient fluid velocity (v > 1.5 m/s) to keep disc fully open against gravity.",
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
      '<p class="eng-eq"><i>W</i><sub>m1</sub> = <span class="eng-frac"><span class="eng-num">π</span><span class="eng-den">4</span></span><i>G</i>²<i>P</i> + 2<i>b</i>π<i>GmP</i> &nbsp;·&nbsp; <i>W</i><sub>m2</sub> = π<i>bGy</i></p>' +
      '<p class="eng-plain">ASME B16.20 Metallic Gasket Dimensions &amp; ASME VIII-1 App. 2 Seating Rules</p>',
    formulaLatex: "W_{m1} = \\tfrac{\\pi}{4}G^2 P + 2b\\pi GmP,\\quad W_{m2} = \\pi bGy",
    formulaNotes:
      "ASME B16.20 governs metallic and semi-metallic gaskets for ASME B16.5 and B16.47 flanged joints, including spiral-wound gaskets (SWG) with centering/inner rings and Ring-Type Joint (RTJ) metallic rings. Gasket seating design follows ASME Section VIII Division 1 Appendix 2 / ASME PCC-1. The gasket maintenance factor m ensures sealing under internal operating pressure P, while yield factor y defines the initial minimum compressive seating stress.",
    formulaBadges: [
      { label: "B16.20 Spiral-Wound", value: "Style CG / CGI" },
      { label: "B16.20 RTJ", value: "Octagonal / Oval (R/RX/BX)" },
      { label: "Graphite Filler m / y", value: "m = 3.00, y = 10,000 psi" },
      { label: "PTFE Filler m / y", value: "m = 2.00, y = 2,500 psi" },
    ],
    variables: [
      { symbol: "OD_g / ID_g", name: "Sealing Element Dimensions", definition: "Outside and inside diameter of the active spiral-wound metal/filler sealing package (mm or in)." },
      { symbol: "OD_outer", name: "Centering (Outer) Ring OD", definition: "Outer guide ring diameter sized to fit inside flange bolts for concentric alignment (mm or in)." },
      { symbol: "ID_inner", name: "Internal (Inner) Ring ID", definition: "Solid metal inner ring bore preventing radial inward buckling into the pipe flow stream (mm or in)." },
      { symbol: "G", name: "Gasket Pitch Reaction Diameter", definition: "Mean diameter of gasket contact face per ASME VIII-1 App. 2 (mm or in)." },
      { symbol: "b", name: "Effective Gasket Width", definition: "Effective seating width calculated from basic width b0 (mm or in)." },
      { symbol: "m", name: "Gasket Maintenance Factor", definition: "Multiplier factor representing residual compressive stress required to hold process pressure P." },
      { symbol: "y", name: "Gasket Seating Stress", definition: "Minimum initial compressive stress required to yield filler and conform to flange face serrations (MPa or psi)." },
    ],
    standards: [
      "ASME B16.20 (Metallic Gaskets for Pipe Flanges)",
      "ASME B16.5 (Flange Facings & Bolt Circle Matching)",
      "ASME Section VIII, Div 1, Appendix 2 (Gasket Factors m & y)",
      "ASME PCC-1 (Flange Joint Assembly Guidelines)",
    ],
    allowancesAndTolerances: {
      title: "ASME B16.20 Manufacturing Tolerances & Gasket Rules",
      summary:
        "ASME B16.20 sets strict manufacturing tolerances on active winding thickness, centering ring diameters, and groove machining to ensure gasket containment and prevent catastrophic blowout.",
      items: [
        {
          label: "Winding Thickness & Compression",
          value: "4.5 mm initial → 3.2 ± 0.13 mm compressed",
          description:
            "Standard spiral-wound sealing elements are manufactured at 4.5 mm (0.177 in) uncompressed thickness. Under target bolt load, windings compress to the thickness of the 3.2 mm (0.125 in) solid steel outer guide ring.",
        },
        {
          label: "Mandatory Inner Ring Rules",
          value: "Class ≥ 900 & All PTFE Fillers",
          description:
            "ASME B16.20 mandates solid internal rings (Style CGI) on all Class 900+ flanges, all NPS 24+ Class 150–600 flanges, and all PTFE-filled spiral-wound gaskets to eliminate inward radial buckling into the pipe bore.",
        },
        {
          label: "Outer Guide Ring Tolerance",
          value: "±0.8 mm (±0.03 in)",
          description:
            "Centering ring outer diameter is machined to fit snugly inside the flange bolt circle (PCD minus bolt hole diameter) with a ±0.8 mm tolerance, ensuring automatic centering during vertical/horizontal makeup.",
        },
        {
          label: "RTJ Ring Hardness Requirement",
          value: "Gasket < Flange by ≥ 20 HBW",
          description:
            "Per ASME B16.20, metallic RTJ rings must have lower hardness than the mating flange groove (Soft Iron max 90 HRB / 56 HBW, 316 SS max 160 HBW) so the ring deforms plastically into the groove without gouging the flange facing.",
        },
      ],
    },
    tableCaption:
      "ASME B16.20 Class 150 Spiral-Wound Reference Table (Selected Sizes)",
    tableHeaders: ["NPS", "Inner ring OD (mm)", "Sealing OD (mm)", "Outer ring OD (mm)", "ID (mm)"],
    tableBoldColumns: [1, 2, 3, 4],
    tableRows: [
      ["2\"", "60.3", "92.1", "104.8", "52.4"],
      ["4\"", "87.0", "117.5", "190.5", "78.0"],
      ["6\"", "130.2", "167.0", "241.3", "116.8"],
      ["8\"", "161.9", "215.9", "298.5", "146.1"],
      ["10\"", "215.9", "266.7", "362.0", "193.7"],
      ["12\"", "254.0", "320.7", "431.8", "242.9"],
    ],
    tableFootnote: "NPS 4 Class 150 matches this app (outer ring 190.5 mm = Class 150 bolt circle). Other rows are B16.20 screening; confirm winding ID with the gasket OEM.",
    materialLimitations: {
      title: "Gasket Material Selection & Operating Limits",
      summary:
        "Gasket selection depends on process fluid corrosiveness, operating temperature limits, and cyclic thermal shock. Gasket windings and fillers have distinct upper temperature thresholds.",
      items: [
        {
          materialGroup: "316L SS Winding + Flexible Graphite Filler",
          temperatureLimit: "-200 °C to 450 °C in air (650 °C in steam/inert)",
          stressLimit: "Seating Stress y = 69.0 MPa (10,000 psi), m = 3.0",
          notes: "Workhorse gasket for hydrocarbons, steam, and general process utilities. Graphite oxidizes in air above 450 °C.",
        },
        {
          materialGroup: "316L SS Winding + Expanded PTFE Filler",
          temperatureLimit: "-200 °C to 260 °C (-320 °F to 500 °F)",
          stressLimit: "Seating Stress y = 17.2 MPa (2,500 psi), m = 2.0",
          notes: "Universal chemical resistance for strong acids, caustics, and high-purity media. Subject to creep/relaxation above 200 °C; inner ring strictly required.",
        },
        {
          materialGroup: "Inconel 625 / Monel 400 Winding",
          temperatureLimit: "-200 °C to 650 °C (Inconel 625)",
          stressLimit: "Seating Stress y = 69.0 MPa, m = 3.0",
          notes: "Severe sour gas (NACE MR0175), hydrofluoric acid (Monel), and seawater cooling piping.",
        },
        {
          materialGroup: "RTJ Soft Iron / 316L Octagonal Rings",
          temperatureLimit: "-196 °C to 538 °C (per metal grade)",
          stressLimit: "Seating Stress y = 124.1 MPa (18,000 psi), m = 5.5 ~ 6.0",
          notes: "High-pressure Class 600–2500 services, offshore wellheads, and lethal gas pipelines.",
        },
      ],
      codeRestrictions: [
        "Strict Reuse Prohibition: Spiral-wound and metallic RTJ gaskets undergo irreversible plastic deformation during initial bolt makeup. Reusing a compressed gasket is a primary cause of joint leaks and is strictly prohibited by ASME PCC-1.",
        "Style CG vs Style CGI: On high-pressure lines (Class ≥ 300) and vacuum systems, Style CG (outer ring only) must not be substituted for Style CGI (inner + outer ring) due to inward radial collapse risks.",
        "Flange Facing Finish Matching: Spiral-wound gaskets require a serrated concentric or phonographic spiral finish (Ra 3.2 ~ 6.3 µm / 125 ~ 250 µin). Smooth finishes (< 1.6 µm) allow graphite filler extrusion under compression.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Gasket Sizing & Bolt Seating Load for NPS 4 Class 300 Joint",
      scenario:
        "Select the ASME B16.20 spiral-wound gasket dimensions and calculate the minimum required bolt seating load (Wm2) and operating bolt load (Wm1) for an NPS 4 (DN 100) Class 300 flange operating at 3.0 MPa (30.0 bar) design pressure using 316L/Graphite filler (m = 3.0, y = 69.0 MPa).",
      designConditions: [
        { label: "Nominal Size", value: "NPS 4 (DN 100)" },
        { label: "Pressure Class", value: "Class 300" },
        { label: "Gasket Type", value: "ASME B16.20 Style CGI (Inner & Outer Rings)" },
        { label: "Winding / Filler", value: "316L Stainless Steel / Flexible Graphite (m = 3.0, y = 69.0 MPa)" },
        { label: "Design Pressure (P)", value: "3.00 MPa (30.0 bar / 435 psi)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Extract ASME B16.20 Standard Gasket Dimensions",
          calculation: "Per ASME B16.20 Table SW-2.1 for NPS 4 Class 300: Inner Ring ID = 102.4 mm (4.03 in), Sealing Element ID = 127.0 mm (5.00 in), Sealing Element OD = 149.4 mm (5.88 in), Outer Centering Ring OD = 181.0 mm (7.13 in).",
          result: "Inner ID = 102.4 mm, Sealing ID = 127.0 mm, Sealing OD = 149.4 mm, Outer OD = 181.0 mm",
          note: "Outer ring OD fits inside the 190.5 mm PCD bolt envelope; inner ring matches Sch 40 pipe bore.",
        },
        {
          step: "Step 2",
          name: "Calculate Basic and Effective Gasket Width (b)",
          formula: "w = (OD_{sealing} - ID_{sealing}) / 2; b_0 = w / 2; b = 2.52 \\sqrt{b_0} \\text{ (for } b_0 > 6.35\\text{ mm)}",
          calculation: "w = (149.4 - 127.0) / 2 = 11.20 mm; basic width b0 = 11.20 / 2 = 5.60 mm. Since b0 ≤ 6.35 mm, effective width b = b0 = 5.60 mm.",
          result: "b = 5.60 mm (0.220 in)",
          note: "Effective width accounts for contact pressure distribution across the compressed winding spiral.",
        },
        {
          step: "Step 3",
          name: "Calculate Gasket Pitch Reaction Diameter (G)",
          formula: "G = OD_{sealing} - 2 · b",
          calculation: "G = 149.40 mm - 2 × 5.60 mm = 149.40 mm - 11.20 mm = 138.20 mm",
          result: "G = 138.20 mm (5.441 in)",
          note: "Mean reaction line where the total compressive force acts against hydrostatic fluid end-thrust.",
        },
        {
          step: "Step 4",
          name: "Calculate Minimum Initial Bolt Seating Load (Wm2)",
          formula: "W_{m2} = \\pi · b · G · y",
          calculation: "W_{m2} = \\pi × 0.00560 m × 0.13820 m × (69.0 × 10^6 N/m²) = 3.14159 × 0.0007739 × 69,000,000",
          result: "W_{m2} = 167.75 kN (37,712 lbf)",
          note: "Total minimum tensile load across all 8 bolts to seat the graphite filler into the flange face serrations.",
        },
        {
          step: "Step 5",
          name: "Calculate Minimum Operating Bolt Load (Wm1) & Per-Bolt Target",
          formula: "W_{m1} = \\frac{\\pi}{4} G^2 P + 2 b \\pi G m P; F_{bolt} = \\max(W_{m1}, W_{m2}) / 8",
          calculation: "Hydrostatic end force H = (π/4) × (0.1382)² × (3.0 × 10^6) = 45.00 kN; Gasket compression load H_p = 2 × 0.0056 × π × 0.1382 × 3.0 × (3.0 × 10^6) = 43.74 kN. W_{m1} = 45.00 + 43.74 = 88.74 kN. Since W_{m2} (167.75 kN) > W_{m1} (88.74 kN), governing load is W_{m2}. Per bolt: F = 167.75 kN / 8 = 20.97 kN.",
          result: "W_{m2} = 167.75 kN (Governing), F_{bolt} = 21.0 kN per stud",
          note: "Seating load governs over operating pressure for low/medium pressure joints.",
        },
      ],
      conclusion:
        "For the NPS 4 Class 300 flanged joint, the ASME B16.20 Style CGI gasket requires an initial seating load of 167.75 kN (21.0 kN per stud across 8 studs), perfectly achievable with standard 3/4\" A193 B7 bolting torqued per ASME PCC-1.",
    },
    ...howTo("How to select gasket dimensions", [
      { name: "1. Select gasket type", text: "Spiral-wound for RF; RTJ when the flange is grooved." },
      { name: "2. Select NPS and class", text: "Class must match the flange, not the pipe schedule." },
      { name: "3. Read ring OD / pitch diameter", text: "Outer ring should sit inside the bolts; RTJ ring number must match both flanges." },
      {
        name: "4. Verify seating, torque, and export",
        text: "Check **ASME PCC-1** guidelines for proper gasket seating and bolt torque procedures, then carry NPS/class into flange and torque tools and export the PDF.",
      },
    ]),
    faq: [
      {
        question: "Why does a 4 inch Class 150 spiral-wound outer ring equal the bolt circle?",
        answer:
          "The outer centering guide ring is standardized to the **B16.5 bolt circle envelope (PCD)** so the gasket is automatically centered when placed inside the bolt circle. During field makeup, the outer ring contacts the inner bolt shanks, **preventing the active sealing spiral from shifting off-center**.",
      },
      {
        question: "Why does ASME B16.20 mandate inner rings on spiral-wound gaskets?",
        answer:
          "High bolt compression causes spiral windings to expand radially. Without a solid inner metal ring (Style CGI), the windings can **buckle inward into the pipe bore**, obstructing fluid flow and shedding metal windings into downstream pumps and control valves. Inner rings are mandatory on **Class 900+ flanges, large diameters, and all PTFE-filled gaskets**.",
      },
      {
        question: "Can a spiral-wound or RTJ gasket ever be reused after a hydrotest or maintenance break?",
        answer:
          "**Strictly No**. Spiral-wound metal windings and RTJ soft iron rings undergo **permanent plastic deformation and work-hardening** during initial bolt makeup. Once compressed, a used gasket will not achieve the required spring-back elasticity or seal conformity upon re-tightening, resulting in high probability of flange leaks.",
      },
      {
        question: "What is the difference between R, RX, and BX Ring-Type Joint (RTJ) gaskets?",
        answer:
          "**Type R** (octagonal or oval) is standard for ASME B16.5 Class 300–2500 flanged grooves. **Type RX** is pressure-energized with higher standoff, fitting standard R-grooves for extreme vibration. **Type BX** is pressure-energized for API 6A ultra-high pressure (up to 20,000 psi / 1380 bar) with a through-hole for pressure equalization; **BX rings only fit specialized BX grooves and are not interchangeable with Type R**.",
      },
    ],
  },

  "valve-cv-sizing": {
    slug: "valve-cv-sizing",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><i>C</i><sub>v</sub> = <i>Q</i><sub>gpm</sub> · √(<span class="eng-frac"><span class="eng-num"><i>SG</i></span><span class="eng-den">Δ<i>P</i><sub>psi</sub></span></span>) &nbsp;·&nbsp; <i>K</i><sub>v</sub> = <i>Q</i><sub>m³/h</sub> · √(<span class="eng-frac"><span class="eng-num"><i>SG</i></span><span class="eng-den">Δ<i>P</i><sub>bar</sub></span></span>) &nbsp;·&nbsp; <i>C</i><sub>v</sub> ≈ 1.156 · <i>K</i><sub>v</sub></p>' +
      '<p class="eng-eq">Δ<i>P</i><sub>max</sub> = <i>F</i><sub>L</sub>² · (<i>P</i><sub>1</sub> − <i>F</i><sub>F</sub><i>P</i><sub>v</sub>) &nbsp;[Choked Flow Ceiling]</p>' +
      '<p class="eng-plain">ISA-75.01.01 &amp; IEC 60534-2-1 Control Valve Sizing Equations</p>',
    formulaLatex: "C_v = Q_{\\text{gpm}} \\sqrt{\\frac{SG}{\\Delta P_{\\text{psi}}}},\\quad K_v = Q_{\\text{m}^3/\\text{h}} \\sqrt{\\frac{SG}{\\Delta P_{\\text{bar}}}},\\quad C_v \\approx 1.156 \\cdot K_v",
    formulaNotes:
      "ISA-75.01.01 and IEC 60534-2-1 define control valve flow capacity using the US flow coefficient Cv (gallons per minute of 60 °F water at 1 psi pressure drop) and metric Kv (m³/h of water at 1 bar pressure drop). For incompressible liquids, flow is proportional to the square root of differential pressure divided by specific gravity until vena-contracta cavitation reaches the choked flow limit (governed by the liquid pressure recovery factor FL).",
    formulaBadges: [
      { label: "1 m³/h = 4.403 gpm" },
      { label: "1 bar = 14.504 psi" },
      { label: "Cv ≈ 1.156 × Kv" },
      { label: "Travel Target: 60% ~ 80%" },
    ],
    variables: [
      { symbol: "C_v", name: "US Flow Coefficient", definition: "Volumetric flow capacity in US gpm of 60 °F water across a 1.0 psi differential pressure." },
      { symbol: "K_v", name: "Metric Flow Coefficient", definition: "Flow capacity in m³/h of 5–40 °C water across a 1.0 bar differential pressure (Cv = 1.156 × Kv)." },
      { symbol: "Q", name: "Volumetric Flow Rate", definition: "Process liquid or gas flow rate passing through the fully or partially open valve body (m³/h, gpm, or scfh)." },
      { symbol: "P_1 / P_2", name: "Upstream / Downstream Pressure", definition: "Static process pressure measured at upstream (P1) and downstream (P2) pipe taps (bar, MPa, or psi)." },
      { symbol: "ΔP", name: "Valve Differential Pressure", definition: "Actual pressure drop across the valve body: ΔP = P1 - P2 (must be positive and below choked limit)." },
      { symbol: "SG", name: "Specific Gravity", definition: "Ratio of process fluid density to clean water density at standard reference temperature (SG = 1.00 for water)." },
      { symbol: "F_L", name: "Liquid Pressure Recovery Factor", definition: "Valve trim recovery coefficient (typically 0.85 ~ 0.90 for globe, 0.55 ~ 0.65 for ball/butterfly)." },
    ],
    standards: [
      "ISA-75.01.01 / IEC 60534-2-1 (Flow Equations for Sizing Control Valves)",
      "ISA-75.02.01 / IEC 60534-2-3 (Control Valve Capacity Test Procedures)",
      "IEC 60534-8-3 (Control Valve Aerodynamic Noise Prediction)",
      "ASME B16.34 (Valves - Flanged, Threaded, and Welding End)",
    ],
    allowancesAndTolerances: {
      title: "Control Valve Sizing Rules, Margins & Piping Geometry",
      summary:
        "Proper control valve sizing requires applying safety margins across operating flow cases (min, normal, max) and accounting for line reducer capacity losses.",
      items: [
        {
          label: "Stem Travel Sizing Rule",
          value: "Normal: 60% ~ 80%, Max: < 90%, Min: > 15%",
          description:
            "A well-sized control valve operates between 60% and 80% stem opening at normal continuous flow, remains below 90% at maximum surge, and stays above 15% at minimum turndown to prevent trim wire-drawing.",
        },
        {
          label: "Oversizing Safety Margin",
          value: "+25% to +30% on Normal Flow Cv",
          description:
            "Select a valve body whose rated full-open catalog Cv is at least 1.25 to 1.30 times the calculated normal operating Cv to provide adequate control headroom for process upsets.",
        },
        {
          label: "Piping Geometry Factor (F_p)",
          value: "Reduces Effective Cv by 2% ~ 8%",
          description:
            "When installing a reduced-bore control valve between larger pipe sizes (e.g. 3\" valve in 4\" line), upstream/downstream reducers introduce pressure losses represented by piping geometry factor Fp (Fp < 1.0).",
        },
        {
          label: "Cavitation Index Check (σ)",
          value: "σ = (P1 - Pv) / (P1 - P2) ≥ σ_mr",
          description:
            "If the operating cavitation index σ drops below the manufacturer's incipient cavitation threshold, liquid vaporizes at the vena contracta and implodes, requiring multi-stage anti-cavitation trim.",
        },
      ],
    },
    tableCaption: "Liquid Cv screening (SG = 1.0 water) — Q in m³/h, ΔP in bar",
    tableHeaders: ["Q (m³/h)", "ΔP 1 bar", "ΔP 2 bar", "ΔP 3 bar", "ΔP 5 bar"],
    tableRows: [10, 20, 50, 80, 120, 150].map((q) => [
      String(q),
      fmt(liquidCv(q, 1), 2),
      fmt(liquidCv(q, 2), 2),
      fmt(liquidCv(q, 3), 2),
      fmt(liquidCv(q, 5), 2),
    ]),
    tableFootnote: "Non-choked incompressible screening only. Gas sizing uses a simplified Crane/ISA non-choked form; apply IEC 60534-2-1 with xT and Fγ for purchase.",
    materialLimitations: {
      title: "Valve Body Materials & Severe Service Trim Selection",
      summary:
        "Control valve body pressure ratings and internal trim hardness must be selected to resist erosion, flashing, cavitation, and high-velocity wire-drawing.",
      items: [
        {
          materialGroup: "ASTM A216 WCB / WCC (Cast Carbon Steel)",
          temperatureLimit: "-29 °C to 425 °C (-20 °F to 800 °F)",
          stressLimit: "ASME B16.34 Class 150 / 300 / 600 Rating",
          notes: "Universal cast body material for non-corrosive hydrocarbons, cooling water, and utility steam.",
        },
        {
          materialGroup: "ASTM A351 CF8M / CF3M (Cast 316 / 316L Stainless)",
          temperatureLimit: "-196 °C to 538 °C (-320 °F to 1000 °F)",
          stressLimit: "Full cryogenic to high-temperature corrosion rating",
          notes: "Standard choice for corrosive chemicals, amine systems, sour gas, and low-temperature LNG service.",
        },
        {
          materialGroup: "Stellite 6 / Tungsten Carbide Hardened Trim",
          temperatureLimit: "-50 °C to 550 °C",
          stressLimit: "Hardness > 40 ~ 60 HRC (Severe Erosion Resistance)",
          notes: "Mandatory for valve plug and seat rings in flashing, high-pressure drop (> 30 bar), and slurry control services.",
        },
        {
          materialGroup: "ASTM A217 WC9 / C12A (Cr-Mo Alloy Steel)",
          temperatureLimit: "-29 °C to 593 °C (-20 °F to 1100 °F)",
          stressLimit: "High creep strength for supercritical power generation",
          notes: "High-pressure boiler feedwater, superheated steam headers, and refinery hydrocrackers.",
        },
      ],
      codeRestrictions: [
        "Flashing vs Cavitation Distinction: If downstream pressure P2 is lower than liquid vapor pressure Pv (P2 < Pv), flashing occurs permanently; no valve trim can eliminate flashing. The valve body must be stainless steel with expanded downstream piping.",
        "Aerodynamic Noise Limit: High-pressure gas and steam throttling valves must not exceed 85 dBA sound pressure level at 1 meter per OSHA / IEC 60534-8-3; install multi-hole whisper cages if predicted noise exceeds limits.",
        "Prohibition of Undersized Trims on High Turndown: Operating a control valve below 10% opening causes intense high-velocity impingement on the seat line, resulting in rapid wire-drawing and seat leakage.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Cooling Water Control Valve Sizing & Selection",
      scenario:
        "Size and select an ASME Class 300 globe control valve with equal percentage trim for an industrial cooling water supply header operating at normal flow Q = 85.0 m³/h (374.2 gpm), inlet pressure P1 = 6.00 bar (87.0 psi), outlet pressure P2 = 4.00 bar (58.0 psi), differential pressure ΔP = 2.00 bar (29.0 psi), water SG = 1.00 at 25 °C.",
      designConditions: [
        { label: "Fluid Type", value: "Treated Cooling Water (SG = 1.00, Pv = 0.032 bar)" },
        { label: "Normal Flow Rate (Q)", value: "85.0 m³/h (374.24 gpm)" },
        { label: "Inlet Pressure (P1)", value: "6.00 bar gauge (87.02 psig / 7.01 bar abs)" },
        { label: "Outlet Pressure (P2)", value: "4.00 bar gauge (58.02 psig / 5.01 bar abs)" },
        { label: "Differential Pressure (ΔP)", value: "2.00 bar (29.01 psi)" },
        { label: "Valve Body Style", value: "Equal Percentage Globe Valve (FL = 0.90)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Verify Incompressible Non-Choked Flow Regime",
          formula: "\\Delta P_{choked} = F_L^2 \\cdot (P_1 - F_F \\cdot P_v)",
          calculation: "Liquid critical ratio factor FF = 0.96 - 0.28√(0.032 / 221.2) = 0.957. ΔP_choked = (0.90)² × (7.01 - 0.957 × 0.032) = 0.81 × 6.98 = 5.65 bar. Since actual ΔP (2.00 bar) < ΔP_choked (5.65 bar), flow is subcritical and non-choked.",
          result: "\\Delta P = 2.00\\text{ bar} < 5.65\\text{ bar (Non-Choked Safe)}",
          note: "No choked flow or destructive cavitation at this operating differential pressure.",
        },
        {
          step: "Step 2",
          name: "Calculate Required Metric Flow Coefficient (Kv)",
          formula: "K_v = Q_{\\text{m}^3/\\text{h}} \\cdot \\sqrt{\\frac{SG}{\\Delta P_{\\text{bar}}}}",
          calculation: "Kv = 85.0 × √(1.00 / 2.00) = 85.0 × √0.50 = 85.0 × 0.7071 = 60.10 m³/h.",
          result: "K_v = 60.10\\text{ m}^3/\\text{h}",
          note: "Base metric flow coefficient representing required orifice capacity.",
        },
        {
          step: "Step 3",
          name: "Convert to US Flow Coefficient (Cv)",
          formula: "C_v = 1.156 \\cdot K_v = Q_{\\text{gpm}} \\cdot \\sqrt{\\frac{SG}{\\Delta P_{\\text{psi}}}}",
          calculation: "Using conversion factor: Cv = 1.156 × 60.10 = 69.48. Alternatively in US units: 374.24 gpm × √(1.0 / 29.01 psi) = 374.24 × 0.18566 = 69.48 US Cv.",
          result: "C_v = 69.5\\text{ US gpm/psi}^{0.5}",
          note: "Standard US sizing value used by valve manufacturers.",
        },
        {
          step: "Step 4",
          name: "Apply 25% Control Headroom Margin for Maximum Surge",
          formula: "C_{v, \\text{rated, min}} = 1.25 \\cdot C_{v, \\text{normal}}",
          calculation: "Cv,rated,min = 1.25 × 69.48 = 86.85. The valve's rated full-open catalog capacity must be at least 87 Cv.",
          result: "C_{v, \\text{rated, min}} = 86.9",
          note: "Ensures valve operates within linear controllable range during maximum peak demand.",
        },
        {
          step: "Step 5",
          name: "Select Standard Valve Body Size & Verify Travel Percentage",
          calculation: "Per manufacturer catalog for Class 300 globe valves: 2-1/2\" body rated Cv = 75 (too small); 3\" (DN 80) body rated Cv = 115.0. Operating percentage: 69.5 / 115.0 = 60.4% Cv capacity. On an equal percentage trim, 60.4% Cv corresponds to approximately 72% valve lift/travel.",
          result: "Select 3\" (DN 80) Class 300 Globe Valve (Rated C_v = 115, Lift = 72%)",
          note: "72% stem travel is ideal, falling precisely within the recommended 60% ~ 80% control band.",
        },
      ],
      conclusion:
        "For the 85.0 m³/h water cooling requirement with 2.0 bar pressure drop, the calculated normal Cv is 69.5. Selecting a 3\" (DN 80) Class 300 globe valve with rated Cv = 115 places normal operation at 72% stem travel, providing superior control stability, low noise, and ample surge capacity.",
    },
    ...howTo("How to size a control-valve Cv", [
      { name: "1. Select fluid type", text: "Liquid uses the gpm/psi equation. Gas needs P1, P2, SG, and temperature." },
      { name: "2. Input flow and pressures", text: "Q in m³/h (or Nm³/h for gas), P1/P2 in bar. ΔP must be positive." },
      { name: "3. Enter SG and selected valve Cv", text: "Water SG = 1. Compare calculated Cv with the catalog Cv." },
      { name: "4. Verify output and export PDF", text: "If calculated Cv exceeds selected Cv the valve is undersized. Export the sizing sheet." },
    ]),
    faq: [
      {
        question: "What is the exact mathematical difference between Cv and Kv?",
        answer:
          "**Cv (US Flow Coefficient)** is defined as the flow rate of water at 60 °F in **US gallons per minute (gpm)** through a valve with a pressure drop of **1.0 psi**. **Kv (Metric Flow Coefficient)** is defined as the flow rate of water at 5–40 °C in **m³/h** with a pressure drop of **1.0 bar**. The exact mathematical relationship is **Cv = 1.156 × Kv** (or Kv = 0.865 × Cv). Entering m³/h and bar directly into a US Cv formula will severely undersize the valve.",
      },
      {
        question: "What is the recommended valve opening percentage (stem travel) for normal flow?",
        answer:
          "For stable and precise process control, a control valve should operate between **60% and 80% stem opening (lift)** at normal design flow. Operating below **15% opening** leads to severe seat erosion (wire-drawing) and hunting, while operating above **90% opening** leaves no margin for process surges or control upset recovery.",
      },
      {
        question: "What happens when liquid differential pressure exceeds the choked flow limit (ΔP_choked)?",
        answer:
          "When differential pressure ΔP exceeds the choked flow threshold (\(\\Delta P_{choked} = F_L^2 (P_1 - F_F P_v)\)), the liquid reaches acoustic sonic velocity at the internal vena contracta. **Increasing pressure drop further will not increase flow rate**. Vapor bubbles form and collapse violently against metal surfaces, causing **destructive cavitation, severe vibration, and body hole-through**. Anti-cavitation tortuous-path trims must be used.",
      },
      {
        question: "How do pipe reducers affect control valve capacity (Piping Geometry Factor Fp)?",
        answer:
          "When a control valve is smaller than the adjacent pipeline (e.g. a 2\" valve in a 3\" line), the upstream and downstream pipe reducers introduce frictional flow resistance. This reduces the effective flow coefficient by the **piping geometry factor Fp (typically 0.92 ~ 0.98)**. The valve's effective installed capacity must be calculated as \(C_v = F_p \cdot C_{v, \text{body}}\).",
      },
    ],
  },

  "bolt-torque-tensioning": {
    slug: "bolt-torque-tensioning",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><i>T</i> = <i>K</i> · <i>D</i> · <i>F</i><sub>p</sub> &nbsp;·&nbsp; <i>F</i><sub>p</sub> = σ<sub>b</sub> · <i>A</i><sub>s</sub></p>' +
      '<p class="eng-eq"><i>A</i><sub>s</sub> = 0.7854 · (<i>D</i> − <span class="eng-frac"><span class="eng-num">0.9743</span><span class="eng-den"><i>n</i><sub>t</sub></span></span>)² &nbsp;·&nbsp; σ<sub>b</sub> = (0.40 ∼ 0.70) · <i>S</i><sub>y</sub></p>' +
      '<p class="eng-plain">ASME PCC-1 Flange Joint Assembly &amp; Target Bolt Preload Sizing</p>',
    formulaLatex: "T = K \\cdot D \\cdot F_p,\\quad F_p = \\sigma_b \\cdot A_s,\\quad A_s = 0.7854 \\left(D - \\frac{0.9743}{n_t}\\right)^2",
    formulaNotes:
      "ASME PCC-1 establishes authoritative guidelines for pressure-boundary bolted flange joint assembly (BFJA). Torque T is proportional to the nominal bolt diameter D, target stud preload tension Fp, and empirical nut factor K. Stud tensile stress area As accounts for UNC thread pitch root reduction. ASME B16.5 specifies bolt circle and stud dimensions, while ASME PCC-1 Appendix O dictates target assembly bolt stress (typically 40% to 70% of bolt material yield strength Sy).",
    formulaBadges: [
      { label: "1 N·m = 0.7376 ft·lbs" },
      { label: "Moly Paste K = 0.13 (Default)" },
      { label: "Target Stress 50% Sy" },
      { label: "ASME PCC-1 4-Pass Star" },
    ],
    variables: [
      { symbol: "T", name: "Target Assembly Torque", definition: "Calculated torque applied to the heavy-hex nut using a calibrated torque wrench (N·m or ft·lb)." },
      { symbol: "K", name: "Nut Friction Factor", definition: "Empirical factor combining thread friction and nut-face collar friction: Moly paste ≈ 0.13, PTFE paste ≈ 0.11, lightly oiled ≈ 0.18, dry steel ≈ 0.20." },
      { symbol: "D", name: "Nominal Stud Diameter", definition: "Major nominal diameter of the stud bolt in inches or mm (e.g. 5/8\", 3/4\", 7/8\", 1\")." },
      { symbol: "F_p", name: "Target Stud Preload Force", definition: "Clamping tensile preload induced in each stud bolt (kN or lbf)." },
      { symbol: "A_s", name: "Tensile Stress Area", definition: "Effective cross-sectional tensile area through the threaded root section per ASME B1.1 (mm² or in²)." },
      { symbol: "n_t", name: "Threads Per Inch (TPI)", definition: "Thread pitch count per inch for UNC / 8UN series fasteners." },
      { symbol: "σ_b / S_y", name: "Bolt Target Stress & Yield", definition: "Target assembly bolt tensile stress (σb) as a percentage of specified minimum yield strength (Sy)." },
    ],
    standards: [
      "ASME PCC-1 (Guidelines for Pressure Boundary Bolted Flange Joint Assembly)",
      "ASME B16.5 / B16.47 (Flange Bolting Dimensions & Count)",
      "ASME B1.1 (Unified Inch Screw Threads - UN / UNR)",
      "ASTM A193 / A194 / A320 (High & Low Temperature Fastener Specs)",
    ],
    allowancesAndTolerances: {
      title: "ASME PCC-1 Tightening Procedures & Friction Variance",
      summary:
        "ASME PCC-1 defines standardized star-pattern torque sequencing and accounts for torque scatter (±20% to ±30% tension variance) caused by friction and tool tolerances.",
      items: [
        {
          label: "PCC-1 4-Pass Star Tightening Pattern",
          value: "Pass 1 (30%) → Pass 2 (60%) → Pass 3 (100%) → Pass 4 (100% Circular)",
          description:
            "Pass 1: Snug to 20–30% target torque in cross-star sequence. Pass 2: 50–70% in cross-star. Pass 3: 100% in cross-star. Pass 4: Final 100% continuous circular pass clockwise until all nuts cease rotation.",
        },
        {
          label: "Nut Factor (K) Friction Sensitivity",
          value: "±25% Clamping Force Scatter",
          description:
            "Friction consumes ~90% of applied torque (50% under nut face, 40% in thread flank). Changing from moly (K=0.13) to dry rusty threads (K=0.20+) cuts actual clamping force by 35%, risking joint blowout.",
        },
        {
          label: "Thread Engagement & Extension",
          value: "Full Nut + 2 to 3 Exposed Threads",
          description:
            "Per ASME PCC-1, studs must fully engage heavy-hex nuts across 100% of thread length, extending 2 to 3 exposed threads past the outer nut face for tensioner fit and corrosion inspection.",
        },
        {
          label: "Flange Alignment Limits",
          value: "Centerline < 3 mm, Parallelism < 1.5 mm",
          description:
            "Flange faces must be aligned parallel to within 1.5 mm/m of OD, and bolt holes aligned to within 3 mm before torquing to avoid uneven gasket crushing and localized stud bending.",
        },
      ],
    },
    tableCaption:
      "Quick reference — common flanges (2\"–12\"), Class 150 / 300 assembly torque (moly K = 0.13, A193 B7)",
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
      "Live table covers NPS ½\"–24\" × Class 150 / 300 / 600. NPS 2 / 4 / 8 Class 150–600 match preserved screening values; other sizes use B16.5 stud geometry with PCC-1-style moly torques — confirm against the owner’s PCC-1 appendix. Dry or PTFE lubricants rescale T ∝ K. Navbar units toggle N·m ↔ ft-lb for the Class torque columns.",
    materialLimitations: {
      title: "Fastener Material Grades & Preload Limits",
      summary:
        "Fastener selection dictates maximum allowable assembly stress. Torquing low-strength stainless studs to carbon steel torque values will cause severe plastic necking and stripped threads.",
      items: [
        {
          materialGroup: "ASTM A193 B7 / A194 2H (High-Strength Alloy Steel)",
          temperatureLimit: "-29 °C to 427 °C (-20 °F to 800 °F)",
          stressLimit: "Yield Sy = 724 MPa (105 ksi); Target Stress 362 MPa (50% Sy)",
          notes: "Universal industrial workhorse for carbon steel and low-alloy piping flanges.",
        },
        {
          materialGroup: "ASTM A320 L7 / A194 7 (Low-Temperature Quenched Alloy)",
          temperatureLimit: "-101 °C to 343 °C (-150 °F to 650 °F)",
          stressLimit: "Yield Sy = 724 MPa (105 ksi); Target Stress 362 MPa (50% Sy)",
          notes: "Charpy V-Notch impact tested at -101 °C for LNG, LPG, and cryogenic pipelines.",
        },
        {
          materialGroup: "ASTM A193 B8 / B8M Class 1 (Solution Annealed 304/316)",
          temperatureLimit: "-196 °C to 538 °C (-320 °F to 1000 °F)",
          stressLimit: "Yield Sy = 207 MPa (30 ksi); Target Stress 80 ~ 100 MPa (40% Sy)",
          notes: "DANGER: Extremely low yield strength. Never apply B7 torque to B8 Class 1 studs or bolts will yield immediately.",
        },
        {
          materialGroup: "ASTM A193 B8 / B8M Class 2 (Strain-Hardened Stainless)",
          temperatureLimit: "-196 °C to 538 °C (-320 °F to 1000 °F)",
          stressLimit: "Yield Sy = 450 ~ 655 MPa (65 ~ 95 ksi per diameter)",
          notes: "Strain hardened for elevated strength; provides reliable gasket sealing in corrosive marine/acid service.",
        },
      ],
      codeRestrictions: [
        "Torque vs Tensioning Transition: For stud diameters D ≥ 1-1/2\" (M38) or Class 1500+ service, hydraulic bolt tensioning is strongly recommended over manual torque wrenches to eliminate torsional stress and achieve uniform bolt elongation.",
        "Anti-Seize Lubricant Application: Always lubricate both stud threads and heavy-hex nut contact faces. Dry makeup creates excessive frictional galling, leaving the gasket under-compressed.",
        "Hot Bolting & Re-Torquing Limits: Hot re-torquing should only be performed after cooling or under strict permit with reduced torque (max 70% ambient) to prevent thermal-stress yielding of studs.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Target Torque Calculation for NPS 6 Class 300 Flanged Joint",
      scenario:
        "Determine the thread tensile area, target preload force, and 4-pass star tightening torque values for an NPS 6 (DN 150) Class 300 flange joint assembled with twelve 3/4\"-10 UNC ASTM A193 B7 studs and molybdenum disulfide anti-seize paste (K = 0.13).",
      designConditions: [
        { label: "Nominal Flange Size", value: "NPS 6 (DN 150) Class 300" },
        { label: "Fastener Quantity & Size", value: "12 Studs × 3/4\"-10 UNC (D = 0.750 in / 19.05 mm)" },
        { label: "Stud Material Grade", value: "ASTM A193 B7 (Specified Min Yield Sy = 724 MPa / 105 ksi)" },
        { label: "Lubricant Condition", value: "Molybdenum Disulfide Paste (Nut Factor K = 0.13)" },
        { label: "Target Assembly Bolt Stress", value: "50% of Yield Strength (σb = 0.50 × 724 = 362 MPa / 52.5 ksi)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Calculate Bolt Tensile Stress Area (As)",
          formula: "A_s = 0.7854 \\cdot \\left(D - \\frac{0.9743}{n_t}\\right)^2",
          calculation: "For 3/4\"-10 UNC: D = 0.750 in, nt = 10 TPI. As = 0.7854 × (0.750 - 0.9743/10)² = 0.7854 × (0.750 - 0.09743)² = 0.7854 × (0.65257)² = 0.3345 in² (215.8 mm²).",
          result: "A_s = 215.8 mm² (0.3345 in²)",
          note: "Tensile stress area accounts for thread root stress concentration per ASME B1.1.",
        },
        {
          step: "Step 2",
          name: "Calculate Required Target Stud Preload (Fp)",
          formula: "F_p = \\sigma_b · A_s = (0.50 · S_y) · A_s",
          calculation: "Fp = (362.0 × 10^6 N/m²) × (215.8 × 10^-6 m²) = 78,119.6 N ≈ 78.12 kN (17,562 lbf).",
          result: "F_p = 78.12 kN (17,562 lbf) per stud",
          note: "50% yield target ensures sufficient gasket seating while leaving 50% elastic margin for thermal/pressure expansion.",
        },
        {
          step: "Step 3",
          name: "Calculate Final 100% Target Assembly Torque (T)",
          formula: "T = K · D · F_p",
          calculation: "Nominal diameter D = 19.05 mm = 0.01905 m. T = 0.13 × 0.01905 m × 78,119.6 N = 193.46 N·m (142.7 ft·lb). Tabulated standard target = 190 ~ 195 N·m.",
          result: "T_{final} = 193.5 N·m (142.7 ft·lb)",
          note: "Target torque applied with calibrated manual or hydraulic torque wrench.",
        },
        {
          step: "Step 4",
          name: "Establish ASME PCC-1 4-Pass Tightening Increments",
          formula: "Pass 1 (30%), Pass 2 (60%), Pass 3 (100%), Pass 4 (100% Circular)",
          calculation: "Pass 1 (30% Star): T1 = 0.30 × 193.5 = 58.0 N·m (42.8 ft·lb); Pass 2 (60% Star): T2 = 0.60 × 193.5 = 116.1 N·m (85.6 ft·lb); Pass 3 (100% Star): T3 = 193.5 N·m (142.7 ft·lb); Pass 4 (100% Circular): T4 = 193.5 N·m until no nut moves.",
          result: "P1 = 58 N·m, P2 = 116 N·m, P3/P4 = 193.5 N·m",
          note: "Follow ASME PCC-1 12-bolt star sequence: 1-7-4-10-2-8-5-11-3-9-6-12.",
        },
        {
          step: "Step 5",
          name: "Verify Total Gasket Clamping Force Across Joint",
          formula: "F_{total} = 12 · F_p",
          calculation: "F_total = 12 × 78.12 kN = 937.44 kN (210,745 lbf). Comparing with gasket seating requirement (Wm2 = 245 kN for NPS 6 Cl 300 SWG), total clamping force provides a robust 3.8× safety factor against leakage.",
          result: "F_{total} = 937.4 kN (Gasket Seating Verified)",
          note: "Joint has robust sealing integrity against internal pressure and thermal transients.",
        },
      ],
      conclusion:
        "The NPS 6 Class 300 flanged joint requires a 100% target torque of 193.5 N·m (142.7 ft·lb) across twelve 3/4\" A193 B7 studs with moly paste, applied systematically over 4 ASME PCC-1 star passes to generate 937.4 kN of uniform gasket clamping force.",
    },
    ...howTo("How to apply flange bolt torque", [
      { name: "1. Select NPS and class", text: "Match the B16.5 flange (½\"–24\"), not a guessed stud diameter." },
      { name: "2. Select lubricant K and bolt grade", text: "Default is moly K = 0.13 and A193 B7. Dry / lightly oiled steel needs a higher K; B8/B8M Class 2 use a lower preload factor." },
      { name: "3. Follow the star pattern rounds", text: "Apply Round 1–4 at 30% / 60% / 100% / circular 100% of target torque." },
      { name: "4. Verify output and export PDF", text: "Record final torque, K, grade, and pattern on the joint checklist PDF." },
    ]),
    faq: [
      {
        question: "Why is bolt torque governed by ASME PCC-1 rather than ASME B16.5?",
        answer:
          "**ASME B16.5** is strictly a **dimensional and pressure rating standard** defining flange dimensions, bolt circle diameters, and bolt hole quantities. **ASME PCC-1** is the dedicated **post-construction standard for Bolted Flange Joint Assembly (BFJA)**, providing engineering methods for target bolt stress selection, nut friction factors, and multi-pass tightening sequences.",
      },
      {
        question: "Why does bolt lubricant (Nut Factor K) drastically alter joint clamp load?",
        answer:
          "In any threaded fastener, **approximately 90% of applied torque is consumed by friction** (50% under the nut face and 40% in thread flank contact). With a high-performance **moly lubricant (K = 0.13)**, torque efficiently translates into stud stretch. If studs are tightened **dry or rusty (K = 0.20 ~ 0.25)** at the same torque, clamping force drops by up to 50%, causing gasket leakage.",
      },
      {
        question: "Why can't ASTM A193 B8 Class 1 stainless bolts be torqued like A193 B7 bolts?",
        answer:
          "**ASTM A193 B8 Class 1** (solution annealed 304 SS) has a yield strength of only **207 MPa (30 ksi)**, compared to **724 MPa (105 ksi)** for alloy steel B7. Applying B7 torque values to B8 Class 1 studs will exceed yield strength by 250%, permanently stretching the studs, stripping threads, and crushing the joint.",
      },
      {
        question: "When is hydraulic bolt tensioning preferred over manual torque wrenches?",
        answer:
          "Hydraulic bolt tensioning is preferred on **large diameter studs (D ≥ 1-1/2\" / M38)**, **high pressure classes (Class 900+)**, and **critical services (e.g. lethal gas, hydrogen)**. Tensioners pull studs purely in axial tension with zero frictional torsion, eliminating nut factor K uncertainties and providing 100% simultaneous load across all bolts.",
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
      { label: "Permanent Blind", value: "c ≥ 3.0 mm" },
      { label: "Hydrotest Blank", value: "c = 0.0 mm" },
      { label: "Seamless Plate", value: "E = 1.00" },
    ],
    variables: [
      { symbol: "t_m", name: "Required Minimum Thickness", definition: "Minimum design thickness of the flat blind plate or temporary test blank (mm or in)." },
      { symbol: "d", name: "Gasket Contact / Reaction Diameter", definition: "Mean gasket reaction diameter or ASME B16.5 Raised Face (RF) contact diameter (mm or in)." },
      { symbol: "P", name: "Internal Design Pressure", definition: "Maximum internal design pressure at operating temperature for permanent blinds (MPa, bar, or psi)." },
      { symbol: "P_t", name: "Hydrotest Test Pressure", definition: "Shop or field hydrostatic/pneumatic test pressure applied to temporary test blanks (MPa, bar, or psi)." },
      { symbol: "S", name: "Design Allowable Stress", definition: "Basic allowable stress of plate material at design temperature per ASME B31.3 Table A-1 (MPa or psi)." },
      { symbol: "S_amb", name: "Ambient Allowable Stress", definition: "Basic allowable stress of plate material at ambient temperature (20 °C) for hydrotest blanks (MPa or psi)." },
      { symbol: "E", name: "Quality / Joint Factor", definition: "Weld joint efficiency factor (E = 1.00 for forged or seamless rolled plate stock)." },
      { symbol: "C", name: "Attachment Factor", definition: "Empirical structural attachment factor (C = 0.30 for bolted flat heads per ASME UG-34(c)(2)(b))." },
      { symbol: "c", name: "Corrosion Allowance", definition: "Specified corrosion allowance added after structural pressure term (c ≥ 3.0 mm for permanent, c = 0.0 mm for hydrotest)." },
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
      "Cl 150# Pt=3.0 MPa tm (Plate)",
      "Cl 300# Pt=7.7 MPa tm (Plate)",
      "Cl 600# Pt=15.3 MPa tm (Plate)",
    ],
    tableBoldColumns: [2, 3, 4],
    tableRows: [
      ["2\"", "92.1", "7.4 mm (8T)", "12.0 mm (14T)", "16.8 mm (18T)"],
      ["3\"", "127.0", "10.3 mm (12T)", "16.5 mm (18T)", "23.2 mm (25T)"],
      ["4\"", "157.2", "12.7 mm (14T)", "20.4 mm (22T)", "28.7 mm (30T)"],
      ["6\"", "215.9", "17.4 mm (18T)", "28.0 mm (30T)", "39.4 mm (40T)"],
      ["8\"", "269.9", "21.8 mm (25T)", "35.0 mm (38T)", "49.3 mm (50T)"],
      ["10\"", "323.8", "26.2 mm (28T)", "42.0 mm (45T)", "59.1 mm (60T)"],
      ["12\"", "381.0", "30.8 mm (32T)", "49.4 mm (50T)", "69.6 mm (70T)"],
      ["16\"", "469.9", "38.0 mm (40T)", "60.9 mm (65T)", "85.8 mm (90T)"],
      ["20\"", "584.2", "47.2 mm (50T)", "75.7 mm (80T)", "106.7 mm (110T)"],
      ["24\"", "692.2", "55.9 mm (60T)", "89.7 mm (90T)", "126.4 mm (130T)"],
    ],
    tableFootnote:
      "Hydrotest pressure Pt = 1.5 × P_rating @ ambient (150#: 3.0 MPa, 300#: 7.73 MPa, 600#: 15.32 MPa). Calculated with C = 0.30, E = 1.00, S_amb = 138 MPa (A516-70), c = 0.0 mm. Parentheses show recommended commercial plate stock.",
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
          stressLimit: "S_amb = 137.9 MPa (20.0 ksi) @ 20 °C; 104.0 MPa @ 200 °C",
          notes: "Mandatory for stainless/alloy lines where carbon steel blanks could cause galvanic contamination or corrosion.",
        },
        {
          materialGroup: "ASTM A240 Gr. 316 / 316L (Molybdenum Stainless)",
          temperatureLimit: "-196 °C to 538 °C (-320 °F to 1000 °F)",
          stressLimit: "S_amb = 137.9 MPa (20.0 ksi) @ 20 °C; 110.0 MPa @ 200 °C",
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
        "Calculate the minimum required temporary test blank thickness and select standard commercial steel plate stock for shop hydrostatic testing of an NPS 6 (DN 150) Class 300 piping spool at a test pressure of Pt = 7.73 MPa (77.3 bar / 1121 psi) using ASTM A516 Gr. 70 plate at ambient temperature (c = 0.0 mm).",
      designConditions: [
        { label: "Nominal Pipe Size", value: "NPS 6 (DN 150)" },
        { label: "Flange Pressure Rating", value: "ASME B16.5 Class 300 Raised Face" },
        { label: "Test Condition", value: "Temporary Hydrostatic Test (ASME B31.3 Ch. VI)" },
        { label: "Hydrotest Pressure (Pt)", value: "7.73 MPa (77.3 bar / 1,121 psi)" },
        { label: "Plate Material", value: "ASTM A516 Gr. 70 (Ambient S_amb = 138.0 MPa)" },
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
            "Hydrotest test pressure Pt = 1.5 × P_design = 1.5 × 5.15 MPa = 7.73 MPa (77.3 bar). For ASTM A516 Gr. 70 at ambient temperature (20 °C): allowable stress S_amb = 138.0 MPa (20.0 ksi). Joint efficiency E = 1.00, attachment factor C = 0.30, and corrosion allowance c = 0.0 mm.",
          result: "Pt = 7.73 MPa, S_amb = 138.0 MPa, E = 1.00, C = 0.30, c = 0.0 mm",
          note: "Temporary test blanks use c = 0.0 mm since water test duration is brief and non-corrosive.",
        },
        {
          step: "Step 2",
          name: "Calculate Dimensionless Stress & Pressure Ratio",
          formula: "\\text{Ratio} = \\frac{C · P_t}{S_{\\text{amb}} · E}",
          calculation:
            "Ratio = (0.30 × 7.73 MPa) / (138.0 MPa × 1.00) = 2.319 / 138.0 = 0.016804",
          result: "Ratio = 0.016804, \\sqrt{\\text{Ratio}} = 0.12963",
          note: "Square-root factor represents elastic bending deflection under uniform hydrostatic load.",
        },
        {
          step: "Step 3",
          name: "Calculate Minimum Required Test Blank Thickness (t_m)",
          formula: "t_{\\text{m}} = d · \\sqrt{\\frac{C · P_t}{S_{\\text{amb}} · E}} + c",
          calculation:
            "t_m = 215.9 mm × 0.12963 + 0.0 mm = 27.99 mm (1.102 in)",
          result: "t_m = 27.99 mm (1.102 in)",
          note: "Pure structural thickness required to resist edge bending moments at 7.73 MPa test pressure.",
        },
        {
          step: "Step 4",
          name: "Apply Plate Mill Under-Tolerance Verification",
          calculation:
            "Per ASTM A20, rolled carbon steel plate under-tolerance is 0.3 mm. Minimum plate thickness to procure = 27.99 mm + 0.30 mm = 28.29 mm.",
          result: "t_{\\text{procure, min}} = 28.29 mm",
          note: "Procured plate stock must account for manufacturing rolling tolerances.",
        },
        {
          step: "Step 5",
          name: "Select Commercial Plate Stock & Compare with Permanent Blind",
          calculation:
            "Standard commercial plate thicknesses available: 25 mm (25T), 28 mm (28T), 30 mm (30T), 32 mm (32T). Since 27.99 mm exceeds 28T with mill tolerance, select 30.0 mm (30T) or 32.0 mm (32T / 1-1/4\") plate. For comparison, a permanent operating blind with c = 3.0 mm requires 31.0 mm (recommended 32T / 35T).",
          result: "Selected: 30 mm (30T) Plate (Safety Margin: +2.01 mm)",
          note: "Temporary blank requires extended paddle handle stamped 'TEST BLANK NPS 6 CL300'.",
        },
      ],
      conclusion:
        "For an NPS 6 Class 300 hydrotest at 7.73 MPa (77.3 bar), the ASME B31.3 / UG-34 calculated minimum required temporary test blank thickness is 27.99 mm. Selecting standard 30.0 mm (30T) or 32.0 mm (1-1/4\") ASTM A516 Gr. 70 plate provides complete elastic structural safety.",
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
      '<p class="eng-eq"><i>P</i><sub>t</sub> = 1.5 · <i>P</i> · (<span class="eng-frac"><span class="eng-num"><i>S</i><sub>t</sub></span><span class="eng-den"><i>S</i></span></span>) &nbsp;[Hydrostatic] &nbsp;·&nbsp; <i>P</i><sub>t</sub> = 1.1 · <i>P</i> · (<span class="eng-frac"><span class="eng-num"><i>S</i><sub>t</sub></span><span class="eng-den"><i>S</i></span></span>) &nbsp;[Pneumatic]</p>' +
      '<p class="eng-eq">σ<sub>h, test</sub> = <span class="eng-frac"><span class="eng-num"><i>P</i><sub>t</sub> · <i>D</i></span><span class="eng-den">2 · <i>t</i><sub>act</sub></span></span> ≤ 0.90 · <i>S</i><sub>y</sub> &nbsp;·&nbsp; <span class="eng-frac"><span class="eng-num"><i>S</i><sub>t</sub></span><span class="eng-den"><i>S</i></span></span> ≤ 6.5</p>' +
      '<p class="eng-plain">ASME B31.3 Chapter VI &amp; ASME Section VIII Div 1 Pressure Testing</p>',
    formulaLatex: "P_t = 1.5 \\cdot P \\cdot \\left(\\frac{S_t}{S}\\right) \\quad [\\text{Hydrostatic}], \\quad P_t = 1.1 \\cdot P \\cdot \\left(\\frac{S_t}{S}\\right) \\quad [\\text{Pneumatic}]",
    formulaHighlight: true,
    formulaNotes:
      "ASME B31.3 paragraph 345.4.2 mandates that the minimum hydrostatic test pressure of a piping system be not less than 1.5 times the internal design pressure, adjusted by the ratio of the allowable stress at test temperature (St) to that at design temperature (S). When piping operates at elevated temperatures, cold testing at unadjusted 1.5P under-stresses the system compared to hot operating conditions. Test hoop stress must be verified below 90% of material yield strength (Sy) to prevent permanent plastic deformation.",
    formulaBadges: [
      { label: "Hydrostatic 1.5P · (St/S)" },
      { label: "Pneumatic 1.1P · (St/S)" },
      { label: "Yield Margin ≤ 90% Sy" },
      { label: "Stress Ratio Cap ≤ 6.5" },
    ],
    variables: [
      { symbol: "P_t", name: "Required Test Pressure", definition: "Minimum gauge pressure held at the highest point of the piping system during leak examination (bar, MPa, or psi)." },
      { symbol: "P", name: "Internal Design Pressure", definition: "Governing internal design pressure of the weakest component in the isolated test circuit (bar, MPa, or psi)." },
      { symbol: "S_t", name: "Allowable Stress at Test Temperature", definition: "Basic allowable stress from ASME B31.3 Table A-1 at ambient test temperature (typically 20 °C / 70 °F)." },
      { symbol: "S", name: "Allowable Stress at Design Temperature", definition: "Basic allowable stress from Table A-1 at maximum operating design temperature." },
      { symbol: "S_t / S", name: "Temperature Stress Ratio", definition: "Stress compensation ratio representing material strength derating at elevated operating temperatures." },
      { symbol: "σ_h, test", name: "Test Hoop Stress", definition: "Circumferential membrane stress induced in the pipe wall during testing (MPa or psi)." },
      { symbol: "S_y", name: "Specified Minimum Yield Strength", definition: "Material SMYS from ASME Section II-D (e.g. 240 MPa for A106 Gr. B)." },
    ],
    standards: [
      "ASME B31.3 (Process Piping) · Chapter VI (Inspection, Examination, and Testing)",
      "ASME BPVC Section VIII, Division 1 · UG-99 (Hydrostatic) & UG-100 (Pneumatic)",
      "API 570 (Piping Inspection Code: In-Service Piping Systems)",
      "ASME B40.100 (Pressure Gauges and Gauge Attachments)",
    ],
    allowancesAndTolerances: {
      title: "Testing Tolerances, Instrumentation & Holding Time",
      summary:
        "Field pressure testing requires calibrated instrumentation, systematic air venting, and compliant hold times to guarantee leak-tight integrity.",
      items: [
        {
          label: "Test Pressure Gauge Tolerance",
          value: "Grade 2A (±0.5%) or Grade 1A (±1.0%)",
          description:
            "Per ASME B40.100, gauges must be calibrated within 30 days. Test gauge range must be between 1.5× and 4× test pressure (ideally dial reads at 50% ~ 60% full scale). Two calibrated gauges required.",
        },
        {
          label: "Minimum Code Holding Time",
          value: "≥ 10 min hold before visual inspection",
          description:
            "ASME B31.3 requires holding at test pressure for at least 10 minutes, after which pressure may be reduced to design pressure for complete visual examination of all flanged and welded joints.",
        },
        {
          label: "Hydrostatic Head Allowance",
          value: "+0.098 bar per meter of vertical elevation",
          description:
            "In tall piping columns and vertical pipe racks, liquid head adds 9.81 kPa (0.098 bar / 1.42 psi) per vertical meter at the bottom drain blind; the lowest point must not exceed the 90% SMYS hoop limit.",
        },
        {
          label: "High-Point Venting Rule",
          value: "100% De-aeration Before Pressurization",
          description:
            "All high points must have open vents during water filling to purge trapped air pockets. Trapped air compresses elastically, creating explosive blast risks upon failure.",
        },
      ],
    },
    tableCaption: "Hydrostatic Pt = 1.5 P (St/S) — St/S = 1.0 and 1.2",
    tableAllNumeric: true,
    tableHeaders: ["Design P", "1.5P (St/S=1)", "1.5P (St/S=1.2)", "Pneumatic 1.1P", "psi @ St/S=1"],
    tableRows: [1, 5, 10, 20, 50, 100].map((bar) => [
      `${bar} bar`,
      `${fmt(1.5 * bar, 1)} bar`,
      `${fmt(1.5 * bar * 1.2, 1)} bar`,
      `${fmt(1.1 * bar, 1)} bar`,
      fmt(1.5 * bar * BAR_TO_PSI, 1),
    ]),
    tableFootnote: "Holding time in this app: NPS ≤ 2 → 10 min; NPS 2-1/2–4 → 30 min; NPS ≥ 6 → 60 min (site procedure may be longer).",
    materialLimitations: {
      title: "Material Limits, Brittle Fracture & Pneumatic Hazards",
      summary:
        "Pressure testing introduces extreme mechanical stresses. Water temperature and pneumatic energy release pose severe hazards if not rigorously controlled.",
      items: [
        {
          materialGroup: "Carbon Steel (ASTM A106 Gr. B / A53 Gr. B)",
          temperatureLimit: "Minimum Test Water Temp: MDMT + 17 °C (30 °F)",
          stressLimit: "Yield Sy = 240 MPa (35.0 ksi); Max Test Hoop ≤ 216 MPa (90% Sy)",
          notes: "Testing cold water (< 10 °C) in thick carbon steel introduces brittle fracture risk. Water temp should be 15 °C to 50 °C.",
        },
        {
          materialGroup: "Stainless Steel (ASTM A312 TP304L / TP316L)",
          temperatureLimit: "Chloride Content < 50 ppm (or < 30 ppm for austenitic)",
          stressLimit: "Yield Sy = 170 ~ 205 MPa (25 ~ 30 ksi)",
          notes: "Demineralized water with chloride test is mandatory. Untreated raw water causes rapid pitting and chloride stress corrosion cracking (CSCC).",
        },
        {
          materialGroup: "Low-Temperature Alloy (ASTM A333 Gr. 6)",
          temperatureLimit: "Impact tested down to -45 °C (-50 °F)",
          stressLimit: "Yield Sy = 240 MPa (35.0 ksi)",
          notes: "Permits lower ambient water temperature without pre-heating during winter hydrostatic test packages.",
        },
        {
          materialGroup: "Pneumatic Testing Fluid (Dry Air / Nitrogen)",
          temperatureLimit: "-29 °C to 50 °C (-20 °F to 122 °F)",
          stressLimit: "Pt = 1.1 · P · (St / S); Step pressurization mandatory",
          notes: "Compressed gas stores massive explosive kinetic energy. Requires formal engineering risk assessment and 50% / +10% step staging.",
        },
      ],
      codeRestrictions: [
        "Yield Stress Limit Check: If calculated test pressure Pt results in a test hoop stress σh > 0.90 Sy in any straight pipe or fitting, Pt must be reduced to the maximum pressure that keeps hoop stress ≤ 0.90 Sy per B31.3 Para. 345.4.2(c).",
        "Isolation of Sensitive In-Line Equipment: Control valves, safety relief valves (PSVs), expansion bellows, orifice plates, and turbine nozzles must be blinded off or removed and replaced with temporary test spools before hydrotesting.",
        "Overpressure Relief Protection: The test manifold must be equipped with a calibrated temporary pressure relief valve set at 105% ~ 110% of test pressure Pt to prevent thermal overpressure from solar heating.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: High-Temperature Hydrocarbon Line Hydrostatic Test Pressure",
      scenario:
        "Calculate the minimum hydrostatic test pressure (Pt), determine the required holding time, and verify the 90% SMYS yield limit for an NPS 10 (DN 250) Schedule 40 ASTM A106 Gr. B piping system operating at 2.80 MPa (28.0 bar / 406 psi) design pressure and 350 °C, tested with ambient water at 20 °C.",
      designConditions: [
        { label: "Nominal Pipe Size", value: "NPS 10 (DN 250) Schedule 40" },
        { label: "Outside Diameter (D)", value: "273.05 mm (10.750 in)" },
        { label: "Nominal Wall Thickness (t)", value: "9.27 mm (0.365 in), t_act (87.5%) = 8.11 mm" },
        { label: "Pipe Material", value: "ASTM A106 Gr. B (SMYS Sy = 240 MPa / 35.0 ksi)" },
        { label: "Internal Design Pressure (P)", value: "2.80 MPa (28.0 bar / 406 psi)" },
        { label: "Design Temperature", value: "350 °C (662 °F)" },
        { label: "Test Fluid & Temperature", value: "Clean Potable Water @ 20 °C (68 °F)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Extract Material Allowable Stresses (St and S)",
          calculation: "Per ASME B31.3 Table A-1 for ASTM A106 Gr. B: Allowable stress at 20 °C test temp St = 137.9 MPa (20.0 ksi). Allowable stress at 350 °C design temp S = 117.5 MPa (17.04 ksi).",
          result: "S_t = 137.9 MPa, S = 117.5 MPa",
          note: "Allowable stress is derated by 14.8% at 350 °C due to reduced tensile strength.",
        },
        {
          step: "Step 2",
          name: "Calculate Temperature Stress Ratio (St / S)",
          formula: "\\text{Ratio} = \\frac{S_t}{S} \\le 6.5",
          calculation: "Ratio = 137.9 MPa / 117.5 MPa = 1.1736",
          result: "S_t / S = 1.1736",
          note: "Ratio compensates for testing the hot operating line at cold ambient conditions.",
        },
        {
          step: "Step 3",
          name: "Calculate Required Minimum Hydrostatic Test Pressure (Pt)",
          formula: "P_t = 1.5 · P · \\left(\\frac{S_t}{S}\\right)",
          calculation: "Pt = 1.5 × 2.80 MPa × 1.1736 = 4.20 MPa × 1.1736 = 4.929 MPa (49.29 bar / 714.9 psi).",
          result: "P_t = 4.93 MPa (49.3 bar / 715 psi)",
          note: "Minimum test pressure held at high point gauge.",
        },
        {
          step: "Step 4",
          name: "Verify Pipe Hoop Stress Against 90% SMYS Yield Limit",
          formula: "\\sigma_h = \\frac{P_t · D}{2 · t_{min}} \\le 0.90 · S_y",
          calculation: "Minimum actual wall t_min = 9.27 mm × 0.875 = 8.111 mm. Test hoop stress σh = (4.929 MPa × 273.05 mm) / (2 × 8.111 mm) = 1345.86 / 16.222 = 82.97 MPa. Allowable yield limit = 0.90 × 240 MPa = 216.0 MPa.",
          result: "\\sigma_h = 83.0 MPa \\le 216.0 MPa (Yield Ratio = 38.4% - Safe)",
          note: "Hoop stress is far below the 90% yield ceiling; no pressure reduction is required.",
        },
        {
          step: "Step 5",
          name: "Determine Holding Time & Inspection Sequence",
          formula: "\\text{Hold Time per ASME B31.3 Para. 345.4.2}",
          calculation: "For NPS 10 (DN 250), standard procedure specifies 60 minutes minimum hold at 4.93 MPa. Reduce pressure to design pressure (2.80 MPa) before personnel approach for close visual inspection of 100% weld seams and flanges.",
          result: "60 Min Hold @ 49.3 bar → Visual Exam @ 28.0 bar",
          note: "Visual examination at design pressure ensures inspector safety.",
        },
      ],
      conclusion:
        "For the NPS 10 Sch 40 line operating at 2.80 MPa and 350 °C, the required ASME B31.3 hydrostatic test pressure is 4.93 MPa (49.3 bar / 715 psi). The resulting test hoop stress of 83.0 MPa utilizes only 38.4% of material yield strength, ensuring complete integrity with zero permanent deformation.",
    },
    ...howTo("How to set hydrotest pressure", [
      { name: "1. Enter design pressure P", text: "Use the same unit as the isometric (MPa or psi)." },
      { name: "2. Input St/S", text: "Leave 1.0 for ambient-design lines. For a hot line tested cold, St/S > 1 from Appendix A." },
      { name: "3. Choose hydro or pneumatic", text: "Pneumatic is 1.1P and needs written authorization." },
      { name: "4. Verify output and export PDF", text: "Confirm Pt is below relief-valve set and below yield, then export the permit sheet." },
    ]),
    faq: [
      {
        question: "Why must the temperature stress ratio (St/S) be applied during hydrostatic testing?",
        answer:
          "When process piping operates at high temperatures (e.g. 350 °C), material allowable stress S drops significantly. If tested at cold ambient temperature using unadjusted 1.5P, the pipe metal experiences lower proportional stress than it will during hot operation. **Applying St/S scales the cold test pressure upward to ensure the piping is stressed to 150% of its operating condition (ASME B31.3 Para. 345.4.2)**.",
      },
      {
        question: "What is the reason for checking test hoop stress against 90% SMYS?",
        answer:
          "During hydrostatic testing, the pipe must remain strictly in its **elastic deformation regime**. If test pressure causes hoop stress to exceed 90% of Specified Minimum Yield Strength (SMYS), the pipe wall risks **permanent plastic swelling, thinning, or ovality distortion**. If hoop stress exceeds 0.90 Sy, ASME B31.3 permits reducing test pressure to stay within 90% yield.",
      },
      {
        question: "Why is pneumatic testing considered significantly more hazardous than hydrostatic testing?",
        answer:
          "Water is virtually incompressible, storing minimal elastic energy under pressure; a leak causes instantaneous pressure drop. **Compressed gas (air/nitrogen) stores immense compressible potential energy**, acting like an explosive bomb if a brittle rupture occurs. ASME B31.3 restricts pneumatic test pressure to **1.1P** and requires mandatory blast radius barriers and step-wise pressurization.",
      },
      {
        question: "Why is hydrotest water temperature critical for carbon steel piping?",
        answer:
          "Carbon steel exhibits a **ductile-to-brittle transition temperature (DBTT)**. Testing with near-freezing water (< 10 °C) can cause catastrophic brittle fracture at stress concentrations without warning. Per ASME B31.3 Para. 345.2.2, test fluid temperature should be **at least 17 °C (30 °F) above the Minimum Design Metal Temperature (MDMT)**.",
      },
    ],
  },

  "thermal-expansion-loop": {
    slug: "thermal-expansion-loop",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq">Δ<i>L</i> = α · <i>L</i> · Δ<i>T</i> &nbsp;·&nbsp; <i>L</i><sub>leg</sub> = √(<span class="eng-frac"><span class="eng-num">3 · <i>E</i> · <i>D</i> · Δ<i>L</i></span><span class="eng-den"><i>S</i><sub>A</sub></span></span>)</p>' +
      '<p class="eng-eq"><i>S</i><sub>A</sub> = <i>f</i> · [1.25(<i>S</i><sub>c</sub> + <i>S</i><sub>h</sub>) − <i>S</i><sub>L</sub>] &nbsp;·&nbsp; <i>F</i><sub>anchor</sub> = <span class="eng-frac"><span class="eng-num">12 · <i>E</i> · <i>I</i> · Δ<i>L</i></span><span class="eng-den"><i>L</i><sub>leg</sub>³</span></span></p>' +
      '<p class="eng-plain">ASME B31.3 Appendix C &amp; Guided-Cantilever Thermal Flexibility Sizing</p>',
    formulaLatex: "\\Delta L = \\alpha \\cdot L \\cdot \\Delta T,\\quad L_{\\text{leg}} = \\sqrt{\\frac{3 \\cdot E \\cdot D \\cdot \\Delta L}{S_A}},\\quad S_A = f \\left[ 1.25(S_c + S_h) - S_L \\right]",
    formulaNotes:
      "ASME B31.3 paragraph 319 governs thermal expansion and flexibility in process piping systems. Unrestrained thermal growth ΔL is calculated using the mean linear thermal expansion coefficient α from installation temperature T1 to operating temperature T2. The guided-cantilever method determines the minimum flexible leg length Lleg (loop height H or offset run) required to absorb ΔL without exceeding the allowable displacement stress range SA.",
    formulaBadges: [
      { label: "Carbon Steel α", value: "12.1 × 10⁻⁶ /°C" },
      { label: "304 / 316 SS α", value: "17.3 × 10⁻⁶ /°C (+43%)" },
      { label: "Guided-Cantilever", value: "L_leg = √(3ED·ΔL / SA)" },
      { label: "Loop Aspect Ratio", value: "H = 2W (Typical)" },
    ],
    variables: [
      { symbol: "ΔL", name: "Total Thermal Growth", definition: "Unrestrained linear thermal expansion between fixed terminal anchor points (mm or in)." },
      { symbol: "α", name: "Mean Thermal Expansion Coefficient", definition: "Mean thermal expansion rate per degree from 20 °C to operating temperature per ASME B31.3 App. C (mm/m/°C or 10⁻⁶/°C)." },
      { symbol: "L", name: "Anchor-to-Anchor Distance", definition: "Total straight pipe length between two rigid anchor supports (m or ft)." },
      { symbol: "ΔT", name: "Operating Temperature Differential", definition: "Difference between maximum operating/upset temperature and minimum ambient installation temperature (°C or °F)." },
      { symbol: "L_leg (H)", name: "Expansion Loop Leg Length", definition: "Minimum perpendicular cantilever leg height or loop depth required to absorb ΔL elastically (m or ft)." },
      { symbol: "E", name: "Modulus of Elasticity", definition: "Cold elastic modulus of pipe material at room temperature per ASME B31.3 Table C-6 (e.g. 200,000 MPa for carbon steel)." },
      { symbol: "D", name: "Pipe Outside Diameter", definition: "Nominal outside diameter of the expanding pipe spool per ASME B36.10M (mm or in)." },
      { symbol: "S_A", name: "Allowable Displacement Stress Range", definition: "Maximum permissible thermal expansion stress range per ASME B31.3 Eq. 1a (MPa or psi)." },
    ],
    standards: [
      "ASME B31.3 (Process Piping) · Chapter II, Part 5 (Flexibility & Support)",
      "ASME B31.3 Appendix C (Thermal Expansion & Modulus of Elasticity Tables)",
      "M.W. Kellogg (Design of Piping Systems - Guided Cantilever Method)",
      "MSS SP-58 (Pipe Hangers and Supports - Materials, Design and Manufacture)",
    ],
    allowancesAndTolerances: {
      title: "Piping Flexibility Rules, Guides & Loop Geometry",
      summary:
        "Expansion loops must be positioned midway between anchors and provided with directional guides to prevent out-of-plane buckling and pipe derailment.",
      items: [
        {
          label: "Standard U-Loop Aspect Ratio",
          value: "Height H = 2 × Width W (or H = W)",
          description:
            "A standard symmetrical U-loop uses a 2:1 height-to-width ratio (H = 2W). The loop absorbs thermal expansion equally from both anchor sides (ΔL/2 per leg), minimizing structural steel rack footprint.",
        },
        {
          label: "Directional Guide Placement Rules",
          value: "First Guide at 4D, Second Guide at 14D",
          description:
            "To ensure the pipe expands strictly into the loop without lateral column buckling, locate the first guide at 4× pipe OD from the loop tangent and the second guide at 14× pipe OD.",
        },
        {
          label: "Cold Springing Credit Restriction",
          value: "No Stress Reduction Credit Permitted",
          description:
            "Per ASME B31.3 Para. 319.5.1, cold pre-springing (pre-stretching during installation) reduces initial equipment nozzle reactions but is not credited in reducing the fatigue displacement stress range SA.",
        },
        {
          label: "Pipe Rack Friction Considerations",
          value: "PTFE Sliders (μ ≈ 0.10) vs Steel (μ ≈ 0.30)",
          description:
            "High thermal expansion runs generate massive longitudinal friction loads on support bents (F_fric = μ · W_pipe); low-friction PTFE/graphite slide plates must be specified on large lines.",
        },
      ],
    },
    tableCaption: "Carbon-steel expansion for a 20 m run (α = 12.1×10⁻⁶ /°C)",
    tableHeaders: ["T1 (°C)", "T2 (°C)", "ΔT (°C)", "ΔL (mm)"],
    tableRows: [
      ["21", "70", "49", fmt(12.1e-6 * 20 * 49 * 1000, 1)],
      ["21", "100", "79", fmt(12.1e-6 * 20 * 79 * 1000, 1)],
      ["21", "150", "129", fmt(12.1e-6 * 20 * 129 * 1000, 1)],
      ["21", "200", "179", fmt(12.1e-6 * 20 * 179 * 1000, 1)],
      ["21", "300", "279", fmt(12.1e-6 * 20 * 279 * 1000, 1)],
      ["15", "180", "165", fmt(12.1e-6 * 20 * 165 * 1000, 1)],
    ],
    tableFootnote: "21 → 150 °C on 20 m is +31.2 mm. Multiply ΔL by L/20 m for other lengths at the same α and ΔT.",
    materialLimitations: {
      title: "Thermal Expansion Rates & Material Selection",
      summary:
        "Thermal expansion coefficients vary substantially across alloy families. Austenitic stainless steel expands over 40% more than carbon steel, requiring significantly larger loops.",
      items: [
        {
          materialGroup: "Carbon Steel (ASTM A106 Gr. B / A53)",
          temperatureLimit: "Mean α = 12.1 × 10⁻⁶ /°C @ 200 °C (E = 203 GPa)",
          stressLimit: "Standard baseline for process piping flexibility",
          notes: "Universal piping material with moderate thermal growth; easily absorbed by 2D offsets and standard U-bends.",
        },
        {
          materialGroup: "Austenitic Stainless Steel (ASTM A312 TP304 / TP316)",
          temperatureLimit: "Mean α = 17.3 × 10⁻⁶ /°C @ 200 °C (E = 195 GPa)",
          stressLimit: "43% Higher Growth than Carbon Steel",
          notes: "Requires ~19% longer expansion loop legs (L_leg ∝ √α) to absorb the much greater thermal displacement.",
        },
        {
          materialGroup: "Duplex Stainless Steel (UNS S31803 / 2205)",
          temperatureLimit: "Mean α = 13.5 × 10⁻⁶ /°C @ 200 °C (E = 200 GPa)",
          stressLimit: "Intermediate growth rate (between CS and 316 SS)",
          notes: "Lower expansion than austenitic stainless reduces loop size requirements on offshore platforms.",
        },
        {
          materialGroup: "Low-Alloy Chrome-Moly (ASTM A335 P11 / P22)",
          temperatureLimit: "Mean α = 12.8 × 10⁻⁶ /°C @ 400 °C (E = 175 GPa)",
          stressLimit: "High creep strength for steam service up to 550 °C",
          notes: "High operating temperatures (400–550 °C) create large total growth ΔL despite moderate α.",
        },
      ],
      codeRestrictions: [
        "ASME B31.3 Formal Analysis Exemption (Para. 319.4.1): A piping system is exempt from formal computer analysis only if Dy / (L - U)² ≤ 208,300 (metric) or if it is duplicate/identical to an existing safe design.",
        "Prohibition of Locked Sliders: Pipe shoes must have adequate slide travel length (min 1.5 × ΔL) to prevent shoes from falling off rack crossbeams and jamming.",
        "Rotating Equipment Nozzle Overload: Simple guided-cantilever loops protect pipe stress, but piping connecting to API 610 pumps or API 617 compressors requires CAESAR II modeling to keep nozzle loads within strict vendor limits.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Steam Header Expansion Loop Sizing",
      scenario:
        "Determine the unrestrained thermal growth, required guided-cantilever leg height (H), and loop width (W) for an NPS 6 (DN 150) Schedule 40 carbon steel steam header (ASTM A106 Gr. B, OD = 168.28 mm, E = 200,000 MPa) spanning L = 80.0 meters between rigid anchors, operating from 20 °C ambient to 220 °C steam service (ΔT = 200 °C, mean α = 12.5 × 10⁻⁶ /°C) with an allowable displacement stress range SA = 190.0 MPa.",
      designConditions: [
        { label: "Nominal Pipe Size", value: "NPS 6 (DN 150) Schedule 40 (OD = 168.28 mm)" },
        { label: "Anchor Distance (L)", value: "80.0 meters (262.5 ft) straight run" },
        { label: "Operating Temperatures", value: "Install T1 = 20 °C, Operating T2 = 220 °C (ΔT = 200 °C)" },
        { label: "Material & Properties", value: "ASTM A106 Gr. B (E = 200,000 MPa, mean α = 12.5 × 10⁻⁶ /°C)" },
        { label: "Allowable Stress Range (SA)", value: "SA = 190.0 MPa (27.55 ksi)" },
        { label: "Loop Configuration", value: "Symmetrical U-Loop located at midpoint (Aspect Ratio H = 2W)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Calculate Total Unrestrained Thermal Expansion (ΔL)",
          formula: "\\Delta L = \\alpha · L · \\Delta T",
          calculation: "ΔL = (12.5 × 10⁻⁶ /°C) × (80.0 m × 1,000 mm/m) × 200 °C = 12.5 × 10⁻⁶ × 80,000 mm × 200 = 200.0 mm (7.87 in).",
          result: "\\Delta L = 200.0\\text{ mm} (7.87\\text{ in})",
          note: "Total axial expansion of the 80-meter header that must be absorbed by the central loop.",
        },
        {
          step: "Step 2",
          name: "Determine Thermal Growth Absorbed Per Loop Leg (ΔL_leg)",
          formula: "\\Delta L_{\\text{leg}} = \\frac{\\Delta L}{2}",
          calculation: "With the symmetrical U-loop located at the exact pipeline midpoint, each flexible leg absorbs half the total expansion: ΔL_leg = 200.0 mm / 2 = 100.0 mm.",
          result: "\\Delta L_{\\text{leg}} = 100.0\\text{ mm}",
          note: "Symmetrical anchor layout halves the deflection requirement for each perpendicular cantilever leg.",
        },
        {
          step: "Step 3",
          name: "Calculate Minimum Guided-Cantilever Leg Height (L_leg / H)",
          formula: "L_{\\text{leg}} = \\sqrt{\\frac{3 · E · D · \\Delta L_{\\text{leg}}}{S_A}}",
          calculation: "L_leg = √[ (3 × 200,000 N/mm² × 168.28 mm × 100.0 mm) / 190.0 N/mm² ] = √[ 10,096,800,000 / 190.0 ] = √53,141,052.6 = 7,289.8 mm ≈ 7.29 meters.",
          result: "H = L_{\\text{leg}} = 7.30\\text{ meters} (23.95\\text{ ft})",
          note: "Minimum perpendicular leg length required to keep thermal bending stress within 190 MPa.",
        },
        {
          step: "Step 4",
          name: "Dimension U-Loop Width and Aspect Ratio",
          formula: "W = \\frac{H}{2}",
          calculation: "Using standard 2:1 aspect ratio: Loop width W = 7.30 m / 2 = 3.65 meters. Total loop envelope = 7.30 m depth × 3.65 m width.",
          result: "W = 3.65\\text{ m},\\quad H = 7.30\\text{ m} (H/W = 2.0)",
          note: "Composed of four 90° LR elbows welded with Schedule 40 straight pipe spools.",
        },
        {
          step: "Step 5",
          name: "Determine Pipe Guide Spacing from Loop Tangent",
          formula: "G_1 = 4 · D,\\quad G_2 = 14 · D",
          calculation: "First directional guide G1 = 4 × 168.28 mm = 673 mm (0.67 m); Second directional guide G2 = 14 × 168.28 mm = 2,356 mm (2.36 m).",
          result: "G_1 = 0.67\\text{ m},\\quad G_2 = 2.36\\text{ m}",
          note: "Prevents lateral column instability while allowing free axial expansion into the loop.",
        },
      ],
      conclusion:
        "To absorb 200.0 mm of thermal expansion on the 80-meter steam header, a symmetrical U-loop with a leg depth of 7.30 meters (H) and width of 3.65 meters (W) is required. Directional guides at 0.67 m and 2.36 m ensure safe, code-compliant flexibility within ASME B31.3 limits.",
    },
    ...howTo("How to estimate thermal expansion", [
      { name: "1. Select material", text: "CS, 304, 316, or Cr-Mo — α changes the growth." },
      { name: "2. Input T1, T2, and length", text: "T1 is install temperature, T2 operating. Length is the free run." },
      { name: "3. Read ΔL and loop screening legs", text: "Large ΔL needs expansion loops or stops — confirm with stress engineering." },
      { name: "4. Verify output and export PDF", text: "Attach the screening sheet to the ISO; it does not replace a flexibility analysis." },
    ]),
    faq: [
      {
        question: "Why does austenitic stainless steel (304/316) require much larger expansion loops than carbon steel?",
        answer:
          "Austenitic stainless steel has a mean thermal expansion coefficient (**α ≈ 17.3 × 10⁻⁶ /°C**), which is **~43% higher than carbon steel (α ≈ 12.1 × 10⁻⁶ /°C)**. For an identical pipe size, length, and operating temperature differential, stainless steel develops 43% more axial expansion (ΔL). Since guided-cantilever leg height scales as \\(L_{\\text{leg}} \\propto \\sqrt{\\Delta L}\\), **stainless steel loops must be ~19% deeper**.",
      },
      {
        question: "Should I use mean thermal expansion coefficient (α_mean) or instantaneous coefficient (α_inst)?",
        answer:
          "Per **ASME B31.3 Appendix C**, **mean thermal expansion coefficient α_mean** (or total unit expansion \\(e\\) in mm/m from 20 °C reference) must be used. Instantaneous expansion coefficients only represent expansion rate at a single exact temperature point and will result in incorrect total thermal displacement if multiplied across a large temperature span.",
      },
      {
        question: "Does the guided-cantilever hand calculation replace formal CAESAR II stress analysis?",
        answer:
          "**No**. Guided-cantilever loop sizing is a reliable engineering screening method for 2D expansion loops and field layout budgeting. ASME B31.3 requires comprehensive computer analysis (e.g. CAESAR II / AutoPIPE) for **3D complex piping systems, lines connected to strain-sensitive rotating equipment (API 610 pumps / turbines), and severe cyclic services**.",
      },
      {
        question: "Why doesn't cold springing reduce the allowable displacement stress range (SA) in ASME B31.3?",
        answer:
          "Cold springing (pre-cutting pipe short and stretching it during installation) reduces initial nozzle reaction forces when hot. However, **fatigue failure in piping is governed by the total cyclical stress range between ambient and operating conditions (Δσ)**, which remains constant regardless of the initial starting point. ASME B31.3 Para. 319.5.1 explicitly prohibits taking credit for cold spring in stress range calculations.",
      },
    ],
  },

  "pressure-drop-friction": {
    slug: "pressure-drop-friction",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq">Δ<i>P</i> = <i>f</i> · (<span class="eng-frac"><span class="eng-num"><i>L</i><sub>total</sub></span><span class="eng-den"><i>D</i></span></span>) · (<span class="eng-frac"><span class="eng-num">1</span><span class="eng-den">2</span></span>ρ<i>v</i>²) &nbsp;·&nbsp; <i>h</i><sub>f</sub> = <span class="eng-frac"><span class="eng-num">Δ<i>P</i></span><span class="eng-den">ρ<i>g</i></span></span></p>' +
      '<p class="eng-eq"><span class="eng-frac"><span class="eng-num">1</span><span class="eng-den">√<i>f</i></span></span> = −1.8 · log₁₀ [ (<span class="eng-frac"><span class="eng-num">ε / <i>D</i></span><span class="eng-den">3.7</span></span>)<sup>1.11</sup> + <span class="eng-frac"><span class="eng-num">6.9</span><span class="eng-den"><i>Re</i></span></span> ] &nbsp;·&nbsp; <i>Re</i> = <span class="eng-frac"><span class="eng-num">ρ<i>vD</i></span><span class="eng-den">μ</span></span></p>' +
      '<p class="eng-plain">Darcy-Weisbach Equation, Haaland Explicit Friction &amp; Crane TP-410 Fitting Equivalents</p>',
    formulaLatex: "\\Delta P = f \\cdot \\left(\\frac{L + \\sum L_{\\text{eq}}}{D}\\right) \\left(\\frac{1}{2}\\rho v^2\\right),\\quad \\frac{1}{\\sqrt{f}} = -1.8 \\log_{10} \\left[ \\left(\\frac{\\varepsilon / D}{3.7}\\right)^{1.11} + \\frac{6.9}{Re} \\right]",
    formulaNotes:
      "The Darcy-Weisbach equation is the universally accepted fluid mechanics standard for calculating frictional head loss and pressure drop in closed conduits. Friction factor f is computed using the Haaland equation (an explicit approximation to the implicit Colebrook-White equation with < 1.5% error). Pipe fittings, valves, and bends are integrated as equivalent straight pipe lengths (L_eq = (L/D) × D) per Crane Technical Paper No. 410.",
    formulaBadges: [
      { label: "Darcy-Weisbach", value: "Exact Fluid Mechanics" },
      { label: "Haaland Equation", value: "Explicit f(Re, ε/D)" },
      { label: "Commercial Steel ε", value: "0.045 mm (45 μm)" },
      { label: "Crane TP-410", value: "Standard L/D Factors" },
    ],
    variables: [
      { symbol: "ΔP", name: "Friction Pressure Drop", definition: "Total frictional pressure drop across the straight pipe run and all in-line fittings (bar, Pa, or psi)." },
      { symbol: "h_f", name: "Frictional Head Loss", definition: "Pressure loss expressed as equivalent fluid column height: hf = ΔP / (ρ · g) (meters or feet)." },
      { symbol: "f", name: "Darcy Friction Factor", definition: "Dimensionless Darcy-Weisbach friction coefficient (4× the Fanning friction factor)." },
      { symbol: "L_total", name: "Total Equivalent Length", definition: "Sum of straight physical pipe length L plus all fitting equivalent lengths ΣLeq (m or ft)." },
      { symbol: "D", name: "Pipe Inside Diameter (ID)", definition: "Actual internal bore diameter of the pipe schedule per ASME B36.10M (m or mm)." },
      { symbol: "ρ / μ", name: "Fluid Density & Viscosity", definition: "Dynamic fluid properties at flowing temperature (ρ in kg/m³, dynamic viscosity μ in Pa·s / cP)." },
      { symbol: "v", name: "Mean Flow Velocity", definition: "Average fluid velocity across the cross-section: v = Q / A (m/s or ft/s)." },
      { symbol: "ε", name: "Absolute Pipe Roughness", definition: "Average microscopic surface roughness height (ε = 0.045 mm for commercial carbon steel)." },
      { symbol: "Re", name: "Reynolds Number", definition: "Dimensionless ratio of inertial forces to viscous forces: Re = ρ v D / μ." },
    ],
    standards: [
      "Crane Technical Paper No. 410 (Flow of Fluids Through Valves, Fittings, and Pipe)",
      "ISO 80000-1 / ISO 5167 (Measurement of Fluid Flow in Closed Conduits)",
      "ASME B36.10M (Welded and Seamless Wrought Steel Pipe)",
      "Hydraulic Institute Standards (HI General Piping Friction Loss Tables)",
    ],
    allowancesAndTolerances: {
      title: "Roughness Standards, Crane L/D Factors & Velocity Limits",
      summary:
        "Accurate hydraulic sizing requires selecting realistic pipe roughness values, summing valve/fitting equivalent lengths, and adhering to economic velocity rules.",
      items: [
        {
          label: "Absolute Pipe Roughness (ε) Standards",
          value: "New CS: 45 μm, Corroded CS: 150~300 μm, SS/PVC: 15 μm",
          description:
            "New commercial carbon steel has ε = 0.045 mm. Over years of service with untreated water, internal scaling and corrosion pit formation increase roughness to 0.15 ~ 0.30 mm, increasing ΔP by up to 30%.",
        },
        {
          label: "Crane TP-410 Fitting Equivalent Lengths",
          value: "90° LR Elbow: L/D = 30, Globe: L/D = 340, Gate: L/D = 8",
          description:
            "Every in-line component is converted to equivalent straight pipe length: 90° LR elbow = 30D, 45° elbow = 16D, swing check valve = 100D, fully open globe valve = 340D, full-port gate valve = 8D.",
        },
        {
          label: "Mill Wall Tolerance Effect on Internal Diameter",
          value: "-12.5% Mill Tolerance Alters ID and Velocity",
          description:
            "Under ASME B36.10M, maximum -12.5% mill thinning slightly enlarges ID and decreases velocity; minimum positive tolerance shrinks ID, increasing velocity and pressure drop (ΔP ∝ 1/D⁵).",
        },
        {
          label: "Flow Regime Thresholds",
          value: "Laminar: Re < 2,000, Turbulent: Re > 4,000",
          description:
            "For laminar flow (Re < 2,000), f = 64/Re independent of pipe roughness. For turbulent flow (Re > 4,000), friction is governed by the Haaland/Colebrook relation.",
        },
      ],
    },
    tableCaption:
      "Water 20 °C (998 kg/m³) — NPS 4 Sch 40, 100 m straight, no fittings (Haaland, ε = 45 µm)",
    tableHeaders: ["Q (m³/h)", "v (m/s)", "ΔP (bar)", "ΔP (psi)"],
    tableRows: [
      ["20", "0.676", "~0.045", "~0.65"],
      ["40", "1.353", "~0.168", "~2.44"],
      ["50", "1.691", "0.259", "3.76"],
      ["80", "2.706", "~0.66", "~9.6"],
      ["100", "3.382", "~1.03", "~14.9"],
      ["150", "5.073", "~2.33", "~33.8"],
    ],
    tableFootnote: "50 m³/h is independently verified at 0.259 bar. Other flows are v²-scaled screens; live calculator recomputes f(Re).",
    materialLimitations: {
      title: "Flow Velocity Guidelines & Material Hydraulic Limits",
      summary:
        "Piping systems must be designed within economic and hydraulic velocity thresholds to prevent erosional wear, excessive pumping power consumption, and water hammer.",
      items: [
        {
          materialGroup: "Liquid Pump Suction Piping",
          temperatureLimit: "Recommended Velocity: 0.6 to 1.5 m/s (2 to 5 ft/s)",
          stressLimit: "Low ΔP to prevent pump cavitation (NPSHa > NPSHr)",
          notes: "Suction lines require large diameters and minimal fittings to maximize available net positive suction head.",
        },
        {
          materialGroup: "Liquid Pump Discharge / Plant Headers",
          temperatureLimit: "Recommended Velocity: 1.5 to 3.0 m/s (5 to 10 ft/s)",
          stressLimit: "Economic optimum balancing pipe CAPEX and pump OPEX",
          notes: "Standard sizing rule for carbon steel cooling water, process chemicals, and hydrocarbon transfer headers.",
        },
        {
          materialGroup: "High-Pressure Steam & Gas Lines",
          temperatureLimit: "Recommended Velocity: 15 to 35 m/s (50 to 115 ft/s)",
          stressLimit: "Noise limit < 85 dBA, Erosion threshold per API RP 14E",
          notes: "Superheated steam and natural gas lines operate at high velocities without erosion in dry clean service.",
        },
        {
          materialGroup: "Maximum Velocity Cap for Carbon Steel Liquids",
          temperatureLimit: "Practical Cap: 3.5 m/s (11.5 ft/s)",
          stressLimit: "Erosion-corrosion protection limit",
          notes: "Velocities exceeding 3.5 m/s in carbon steel strip protective iron oxide films, drastically accelerating corrosion rates.",
        },
      ],
      codeRestrictions: [
        "Economic Pressure Drop Limits: For continuous liquid transfer lines, design pressure drop should not exceed 0.10 to 0.20 bar per 100 meters (1.0 to 2.0 psi per 100 ft) to keep pump electrical energy costs within economic limits.",
        "Water Hammer Surge Pressure: Rapid closure of in-line quarter-turn valves generates water hammer pressure spikes (Joukowsky Equation: ΔP_surge = ρ · c_wave · Δv); liquid velocities must be kept moderate.",
        "Non-Newtonian Fluid Limitation: The standard Darcy-Haaland formulation applies strictly to Newtonian single-phase fluids; slurries, polymer solutions, and drilling muds require Bingham-Plastic or Power-Law models.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Cooling Water Header Friction Loss & Head Loss",
      scenario:
        "Calculate the mean fluid velocity, Reynolds number, Darcy friction factor, total equivalent length, and pressure drop for an NPS 6 (DN 150) Schedule 40 carbon steel cooling water line (ID = 154.06 mm, absolute roughness ε = 0.045 mm) delivering Q = 120.0 m³/h of water (ρ = 998 kg/m³, dynamic viscosity μ = 1.002 × 10⁻³ Pa·s) over a straight run of 150.0 meters containing six 90° LR butt-weld elbows and two full-port gate valves.",
      designConditions: [
        { label: "Nominal Pipe Size", value: "NPS 6 (DN 150) Schedule 40 (ID = 154.06 mm / 0.15406 m)" },
        { label: "Volumetric Flow Rate (Q)", value: "120.0 m³/h (0.03333 m³/s / 528.3 gpm)" },
        { label: "Fluid Properties", value: "Water @ 20 °C (ρ = 998 kg/m³, μ = 1.002 × 10⁻³ Pa·s)" },
        { label: "Straight Pipe Length", value: "150.0 meters (492.1 ft)" },
        { label: "In-Line Fittings", value: "Six 90° LR Elbows (L/D = 30) + Two Gate Valves (L/D = 8)" },
        { label: "Pipe Roughness (ε)", value: "0.045 mm (45 μm, Commercial Carbon Steel)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Calculate Pipe Internal Flow Area & Mean Velocity (v)",
          formula: "A = \\frac{\\pi}{4} D^2,\\quad v = \\frac{Q}{A}",
          calculation: "Flow area A = (π/4) × (0.15406 m)² = 0.018641 m². Flow rate Q = 120.0 / 3,600 = 0.033333 m³/s. Velocity v = 0.033333 m³/s / 0.018641 m² = 1.788 m/s (5.87 ft/s).",
          result: "A = 0.01864\\text{ m}^2,\\quad v = 1.788\\text{ m/s}",
          note: "Velocity is well within the recommended 1.5 ~ 3.0 m/s range for liquid distribution headers.",
        },
        {
          step: "Step 2",
          name: "Calculate Reynolds Number (Re) & Determine Flow Regime",
          formula: "Re = \\frac{\\rho · v · D}{\\mu}",
          calculation: "Re = (998 kg/m³ × 1.788 m/s × 0.15406 m) / (1.002 × 10⁻³ Pa·s) = 274.92 / 0.001002 = 274,370.",
          result: "Re = 274,370\\text{ (Fully Turbulent Flow, } Re > 4,000\\text{)}",
          note: "High Reynolds number places the flow deep into the turbulent regime.",
        },
        {
          step: "Step 3",
          name: "Calculate Darcy Friction Factor (f) via Haaland Equation",
          formula: "\\frac{1}{\\sqrt{f}} = -1.8 \\log_{10} \\left[ \\left(\\frac{\\varepsilon/D}{3.7}\\right)^{1.11} + \\frac{6.9}{Re} \\right]",
          calculation: "Relative roughness ε/D = 0.045 mm / 154.06 mm = 0.0002921. (ε/D / 3.7)^1.11 = (0.00007894)^1.11 = 0.00002812. 6.9 / 274,370 = 0.00002515. Sum inside log = 0.00005327. log10(0.00005327) = -4.2735. 1/√f = -1.8 × (-4.2735) = 7.6923 → f = (1 / 7.6923)² = 0.01690.",
          result: "f = 0.01690",
          note: "Haaland explicit factor matches iterative Colebrook-White equation within 0.2%.",
        },
        {
          step: "Step 4",
          name: "Calculate Total Equivalent Length with Crane TP-410 Fittings",
          formula: "L_{\\text{eq}} = \\sum (L/D) · D,\\quad L_{\\text{total}} = L_{\\text{pipe}} + L_{\\text{eq}}",
          calculation: "Six 90° LR elbows: 6 × 30 × 0.15406 m = 27.73 m. Two gate valves: 2 × 8 × 0.15406 m = 2.46 m. Total equivalent length of fittings Leq = 27.73 + 2.46 = 30.19 m. Total hydraulic length L_total = 150.0 m + 30.19 m = 180.19 meters.",
          result: "L_{\\text{eq}} = 30.19\\text{ m},\\quad L_{\\text{total}} = 180.19\\text{ meters}",
          note: "Fittings add 20.1% additional equivalent length to the straight piping run.",
        },
        {
          step: "Step 5",
          name: "Compute Total Pressure Drop (ΔP) & Frictional Head Loss (h_f)",
          formula: "\\Delta P = f · \\left(\\frac{L_{\\text{total}}}{D}\\right) · \\left(\\frac{1}{2}\\rho v^2\\right),\\quad h_f = \\frac{\\Delta P}{\\rho · g}",
          calculation: "Dynamic pressure q = 0.5 × 998 kg/m³ × (1.788 m/s)² = 0.5 × 998 × 3.197 = 1,595.3 Pa. Length-to-diameter ratio L/D = 180.19 / 0.15406 = 1,169.6. ΔP = 0.01690 × 1,169.6 × 1,595.3 Pa = 31,533 Pa = 0.3153 bar (4.57 psi). Frictional head loss hf = 31,533 / (998 × 9.81) = 31,533 / 9,790.38 = 3.22 meters of water.",
          result: "\\Delta P = 0.315\\text{ bar} (4.57\\text{ psi}),\\quad h_f = 3.22\\text{ m of water}",
          note: "Friction gradient = 0.175 bar / 100 m, perfectly within the recommended 0.10 ~ 0.20 bar/100 m design guideline.",
        },
      ],
      conclusion:
        "For 120.0 m³/h cooling water flowing through the 150-meter NPS 6 Sch 40 line with fittings, the fluid velocity is 1.788 m/s, yielding a total friction pressure drop of 0.315 bar (4.57 psi) and a head loss of 3.22 meters. The line satisfies all hydraulic velocity and economic pressure drop criteria.",
    },
    ...howTo("How to estimate pipe pressure drop", [
      { name: "1. Select fluid, NPS, and schedule", text: "ID comes from B36.10M. Water/steam/air/crude use fixed screening densities." },
      { name: "2. Input flow and length", text: "m³/h, GPM, or kg/h. Length in metres (or feet in imperial)." },
      { name: "3. Add fitting counts", text: "Elbows, gates, and globes convert to equivalent length." },
      { name: "4. Verify output and export PDF", text: "If ΔP is large, raise NPS or cut globe valves, then export." },
    ]),
    faq: [
      {
        question: "Why is the Haaland equation used instead of the Colebrook-White equation?",
        answer:
          "The classic **Colebrook-White equation is implicit** (\\(1/\\sqrt{f}\\) appears on both sides), requiring iterative numerical convergence loops that can slow down real-time calculation. The **Haaland equation (1983)** is an explicit analytical formula that predicts the Darcy friction factor \\(f\\) within **less than 1.5% of Colebrook-White**, which is well within the natural ±10% physical uncertainty of commercial pipe roughness.",
      },
      {
        question: "What is the difference between the Darcy friction factor (f) and Fanning friction factor (f_F)?",
        answer:
          "The **Darcy friction factor (\\(f\\))** (used in the Darcy-Weisbach equation \\(\\Delta P = f \\frac{L}{D} \\frac{\\rho v^2}{2}\\)) is **exactly four times the Fanning friction factor (\\(f_F\\))** (\\(f = 4 f_F\\)). Chemical engineering literature frequently uses Fanning friction factor \\(f_F\\), while mechanical and civil piping engineering standards (ASME, ISO, Crane TP-410) universally use the Darcy friction factor \\(f\\).",
      },
      {
        question: "How does internal pipe corrosion and aging affect pressure drop over time?",
        answer:
          "New commercial steel has an absolute roughness of **\\(\\varepsilon \\approx 0.045\\text{ mm}\\)**. Over 10 to 20 years in untreated water service, internal rust tubercles, scaling, and biofouling increase equivalent roughness to **\\(\\varepsilon \\approx 0.15 \\sim 0.30\\text{ mm}\\)**. This roughness increase raises the friction factor by **20% to 35%**, requiring higher pump discharge head and increasing electrical operating costs.",
      },
      {
        question: "How do Crane TP-410 equivalent length factors (L/D) work?",
        answer:
          "Every pipe fitting introduces turbulent eddy losses and direction changes. Crane TP-410 models these resistance losses as equivalent lengths of straight pipe with ratio **\\(L/D\\)**. For example, a **90° LR elbow has \\(L/D = 30\\)**; in an NPS 6 pipe (\\(D = 0.154\\text{ m}\\)), one elbow contributes \\(30 \\times 0.154 = 4.62\\text{ meters}\\) of equivalent straight pipe friction.",
      },
    ],
  },

  "flow-velocity-erosion": {
    slug: "flow-velocity-erosion",
    formulaTitle: "Core Formula & Variable Definitions",
    formulaHtml:
      '<p class="eng-eq"><i>v</i> = <span class="eng-frac"><span class="eng-num"><i>Q</i></span><span class="eng-den"><i>A</i></span></span> &nbsp;·&nbsp; <i>v</i><sub>e</sub> = <span class="eng-frac"><span class="eng-num"><i>C</i></span><span class="eng-den">√ρ<sub>m</sub></span></span> &nbsp;[API RP 14E] &nbsp;·&nbsp; <i>v</i><sub>max, liquid</sub> ≤ 3.5 m/s</p>' +
      '<p class="eng-eq">ρ<sub>m</sub> = <span class="eng-frac"><span class="eng-num">12409 · <i>S</i><sub>L</sub> · <i>P</i> + 2.7 · <i>R</i> · <i>S</i><sub>g</sub> · <i>P</i></span><span class="eng-den">198.7 · <i>P</i> + <i>R</i> · <i>T</i> · <i>Z</i></span></span> &nbsp;·&nbsp; <i>Ratio</i> = <span class="eng-frac"><span class="eng-num"><i>v</i></span><span class="eng-den"><i>v</i><sub>e</sub></span></span></p>' +
      '<p class="eng-plain">API Recommended Practice 14E &amp; Norsok P-002 Fluid Erosional Velocity Sizing</p>',
    formulaLatex: "v = \\frac{Q}{A},\\quad v_e = \\frac{C}{\\sqrt{\\rho_m}},\\quad \\text{Status} = f(v / v_e)",
    formulaNotes:
      "API Recommended Practice 14E (Design and Installation of Offshore Production Platform Piping Systems) Section 2.4 establishes the industry standard for erosional velocity limits in single-phase gas, liquid, and multiphase two-phase flow. The empirical constant C accounts for solid sand content, continuous vs intermittent flow regime, and metallurgy. Continuous liquid services are subject to an additional hydraulic limit of 3.5 m/s to prevent passive film stripping and acoustic noise.",
    formulaBadges: [
      { label: "API RP 14E", value: "v_e = C / √ρ" },
      { label: "C (Continuous)", value: "100 (Solid-Free)" },
      { label: "C (Intermittent)", value: "125 ~ 150" },
      { label: "C (Corrosion Inhibited)", value: "150 ~ 200 (SS/Duplex)" },
    ],
    variables: [
      { symbol: "v", name: "Mean Fluid Velocity", definition: "Actual operating fluid velocity through the internal pipe bore: v = Q / A (m/s or ft/s)." },
      { symbol: "v_e (v_c)", name: "Erosional Velocity Limit", definition: "Maximum allowable threshold velocity above which erosive wear occurs per API RP 14E (m/s or ft/s)." },
      { symbol: "C", name: "Empirical Velocity Factor", definition: "Empirical factor: C = 100 for continuous solid-free carbon steel; C = 125–150 for intermittent service; C = 150–200 for corrosion-resistant alloys (CRAs)." },
      { symbol: "ρ_m", name: "Fluid / Mixture Density", definition: "Operating density of the single-phase fluid or two-phase gas-liquid mixture (kg/m³ or lb/ft³)." },
      { symbol: "Q", name: "Volumetric Flow Rate", definition: "Actual volumetric flow rate at flowing pressure and temperature (m³/h, m³/s, or gpm)." },
      { symbol: "A", name: "Pipe Cross-Sectional Area", definition: "Internal cross-sectional flow area based on ASME B36.10M / B36.19M pipe ID (m² or in²)." },
      { symbol: "v / v_e", name: "Erosion Velocity Ratio", definition: "Screening ratio: Safe (< 80%), Warning (80% ~ 100%), Erosion Risk (> 100%)." },
    ],
    standards: [
      "API Recommended Practice 14E (Design and Installation of Offshore Production Platform Piping Systems)",
      "Norsok Standard P-002 (Process System Design - Section 6 Sizing of Lines)",
      "ASME B36.10M / B36.19M (Pipe Internal Cross-Section Geometry)",
      "ISO 13703 (Petroleum and Natural Gas Industries - Design and Installation of Piping Systems)",
    ],
    allowancesAndTolerances: {
      title: "API RP 14E Factor Selection, Sand Limits & Sizing Margins",
      summary:
        "Erosional velocity limits depend heavily on solid particle loading (sand), fluid corrosiveness, and pipe metallurgy. Exceeding threshold limits causes rapid wall thinning and fitting failure.",
      items: [
        {
          label: "Empirical C-Factor Selection Criteria",
          value: "C = 100 (CS Continuous) / C = 160 (CRA/Duplex)",
          description:
            "Use C = 100 for continuous carbon steel in solid-free service. For corrosion-resistant alloys (Stainless 316, Duplex 2205, Inconel) or inhibited lines with zero sand, Norsok P-002 and modern API guidelines permit C = 150 ~ 200.",
        },
        {
          label: "Solid Sand Particle Limit",
          value: "Max 1.0 lb/1000 bbl (< 5 ppm by volume)",
          description:
            "The API RP 14E equation assumes solid particle-free fluids. If entrained sand exceeds 1.0 lb/1,000 bbl, standard C-factors become invalid, and velocity must be severely restricted to prevent mechanical impingement erosion.",
        },
        {
          label: "Status Screening Thresholds",
          value: "Safe: < 80% v_e, Warning: 80% ~ 100%, Erosion Risk: > 100%",
          description:
            "When v exceeds 80% of ve (or liquid velocity exceeds 3.5 m/s), the screening engine flags a Warning status, advising the piping engineer to consider increasing pipe schedule or nominal size.",
        },
        {
          label: "Fitting Impingement Vulnerability",
          value: "Elbows & Tees Thin 3× Faster than Straight Pipe",
          description:
            "Centrifugal forces fling dense droplets and sand particles against outer elbow extrados curves. High-velocity lines should replace short-radius elbows with 5D/3D induction bends or blinded tee wash-pipes.",
        },
      ],
    },
    tableCaption: "NPS 4 Sch 40 (ID 102.26 mm) — velocity vs API RP 14E vc at ρ = 998 kg/m³, C = 100 (vc ≈ 3.86 m/s)",
    tableHeaders: ["Q (m³/h)", "v (m/s)", "v / vc", "Status"],
    tableRows: [
      ["20", "0.68", "18%", "Safe"],
      ["40", "1.35", "35%", "Safe"],
      ["50", "1.69", "44%", "Safe"],
      ["80", "2.71", "70%", "Safe"],
      ["100", "3.38", "88%", "Warning"],
      ["130", "4.40", "114%", "Erosion Risk"],
    ],
    tableFootnote: "Warning if v ≥ 0.8 vc or liquid v > 3.5 m/s. Erosion Risk if v ≥ vc.",
    materialLimitations: {
      title: "Flow Velocity Thresholds & Metallurgy Guidelines",
      summary:
        "Allowable velocities vary widely across liquid, gas, and multiphase regimes. Corrosion-resistant alloys tolerate significantly higher velocities than carbon steel.",
      items: [
        {
          materialGroup: "Carbon Steel (Single-Phase Liquid)",
          temperatureLimit: "Max Velocity: 3.5 m/s (Continuous) / 5.0 m/s (Intermittent)",
          stressLimit: "Protective Iron Carbonate / Oxide Scale Preservation",
          notes: "Velocities > 3.5 m/s scour away the protective FeCO3 scale in CO2-containing systems, causing catastrophic flow-induced localized corrosion.",
        },
        {
          materialGroup: "Austenitic Stainless Steel (316L / 304L)",
          temperatureLimit: "Max Liquid: 5.0 ~ 7.0 m/s; Max Gas: 30 ~ 40 m/s",
          stressLimit: "Stable Passive Chromium Oxide (Cr2O3) Film",
          notes: "Tough passive film resists flow shearing; permits higher velocities and smaller line diameters (C = 150 ~ 175).",
        },
        {
          materialGroup: "Duplex 2205 / Super Duplex 2507",
          temperatureLimit: "Max Liquid: 7.0 ~ 10.0 m/s; Max Gas: 40 ~ 50 m/s",
          stressLimit: "Exceptional Erosion-Corrosion Resistance (C = 175 ~ 200)",
          notes: "Standard material for offshore production flowlines, topside manifold piping, and seawater cooling loops.",
        },
        {
          materialGroup: "Two-Phase Wet Gas / Oil-Gas Mixtures",
          temperatureLimit: "Governed strictly by API RP 14E Mixture Density",
          stressLimit: "High Momentum Droplet Impingement Risk",
          notes: "Mixture density is dominated by liquid slugs; velocity limits typically range between 8.0 and 18.0 m/s.",
        },
      ],
      codeRestrictions: [
        "Prohibition of RP 14E for Slurry / Sand Slugs: API RP 14E is an empirical screening model for clean hydrocarbons. Systems carrying abrasive particulate slurries (tailings, frac sand, catalyst fines) must use dedicated particulate erosion models (e.g. Tulsa University / DNV-RP-O501).",
        "Minimum Velocity for Solids Transport: Lines carrying entrained sand or heavy waxy crudes require a minimum transport velocity (typically > 1.0 m/s) to prevent particle settling, bottom pitting, and wax deposition.",
        "Noise and Vibration Limits: High-velocity gas lines (v > 20 m/s) must be evaluated for acoustic-induced vibration (AIV) and flow-induced vibration (FIV) per Energy Institute guidelines to prevent fatigue cracking at branch connections.",
      ],
    },
    workedExample: {
      title: "Step-by-Step Worked Example: Hydrocarbon Liquid Line Flow Velocity & API RP 14E Verification",
      scenario:
        "Evaluate the mean fluid velocity, API RP 14E erosional threshold velocity (v_e), and operational safety status for an NPS 4 (DN 100) Schedule 40 carbon steel crude oil transfer line (ID = 102.26 mm, fluid density ρ = 850.0 kg/m³ / 53.06 lb/ft³) operating at continuous flow rate Q = 75.0 m³/h (330.2 gpm) with API empirical constant C = 100.",
      designConditions: [
        { label: "Nominal Pipe Size", value: "NPS 4 (DN 100) Schedule 40" },
        { label: "Inside Diameter (ID)", value: "102.26 mm (0.10226 m / 4.026 in)" },
        { label: "Volumetric Flow Rate (Q)", value: "75.0 m³/h (0.020833 m³/s / 330.2 gpm)" },
        { label: "Fluid Density (ρ)", value: "850.0 kg/m³ (53.064 lb/ft³ / SG = 0.85)" },
        { label: "Service Regime", value: "Continuous Hydrocarbon Transfer (API Factor C = 100)" },
      ],
      steps: [
        {
          step: "Step 1",
          name: "Calculate Pipe Internal Flow Cross-Sectional Area (A)",
          formula: "A = \\frac{\\pi}{4} D^2",
          calculation: "A = (π/4) × (0.10226 m)² = 0.785398 × 0.0104571 = 0.0082129 m² (12.73 in²).",
          result: "A = 0.008213\\text{ m}^2 (12.73\\text{ in}^2)",
          note: "Internal flow area derived from ASME B36.10M Schedule 40 dimensions.",
        },
        {
          step: "Step 2",
          name: "Calculate Actual Mean Flow Velocity (v)",
          formula: "v = \\frac{Q}{A}",
          calculation: "Flow rate Q = 75.0 / 3,600 = 0.020833 m³/s. Velocity v = 0.020833 m³/s / 0.0082129 m² = 2.5367 m/s (8.32 ft/s).",
          result: "v = 2.54\\text{ m/s} (8.32\\text{ ft/s})",
          note: "Mean fluid velocity in metric and US Customary units.",
        },
        {
          step: "Step 3",
          name: "Calculate API RP 14E Erosional Velocity Limit (v_e)",
          formula: "v_e = \\frac{C}{\\sqrt{\\rho_{\\text{lb/ft}^3}}} \\text{ (in ft/s)},\\quad v_{e, \\text{m/s}} = v_e · 0.3048",
          calculation: "Density in lb/ft³ = 850.0 kg/m³ × 0.06242796 = 53.064 lb/ft³. √53.064 = 7.2845. ve = 100 / 7.2845 = 13.728 ft/s. In metric: 13.728 ft/s × 0.3048 m/ft = 4.184 m/s.",
          result: "v_e = 4.18\\text{ m/s} (13.73\\text{ ft/s})",
          note: "API RP 14E erosional limit for continuous solid-free carbon steel service.",
        },
        {
          step: "Step 4",
          name: "Evaluate Velocity Ratio & Continuous Liquid Cap",
          formula: "\\text{Ratio} = \\frac{v}{v_e},\\quad \\text{Liquid Cap Check: } v \\le 3.5\\text{ m/s}",
          calculation: "Ratio = 2.537 m/s / 4.184 m/s = 0.6063 (60.6%). Checking continuous liquid limit: actual v = 2.54 m/s < 3.50 m/s ceiling.",
          result: "v / v_e = 60.6\\%\\text{ (Safe, } < 80\\%\\text{)},\\quad v < 3.5\\text{ m/s}",
          note: "Ample margin against both API erosional wear and hydraulic flow noise.",
        },
        {
          step: "Step 5",
          name: "Determine Operational Status and Recommendations",
          calculation: "Since v/ve (60.6%) < 80% and v (2.54 m/s) < 3.5 m/s, the operating condition is classified as 'Safe'. No wall erosion or flow-induced vibration is expected throughout the 25-year design life.",
          result: "Status: SAFE (Optimal Operating Regime)",
          note: "Ideal velocity band (1.5 ~ 3.0 m/s) for economic pipe sizing and low pumping power.",
        },
      ],
      conclusion:
        "For an NPS 4 Sch 40 line carrying 75.0 m³/h of crude oil, the actual fluid velocity is 2.54 m/s, which represents 60.6% of the API RP 14E erosional velocity limit (4.18 m/s). The system operates within the Safe hydrodynamic band with zero erosion risk.",
    },
    ...howTo("How to check flow velocity and erosion", [
      { name: "1. Select NPS and schedule", text: "ID determines area. Sch 80 raises velocity for the same Q." },
      { name: "2. Input flow and density", text: "m³/h or GPM; liquid ~998 kg/m³, gas much lower." },
      { name: "3. Set RP 14E C factor", text: "100 is conservative continuous service." },
      { name: "4. Verify output and export PDF", text: "If status is Warning or Erosion Risk, increase NPS or cut flow, then export." },
    ]),
    faq: [
      {
        question: "What is the physical basis of the API RP 14E erosional velocity formula?",
        answer:
          "The **API RP 14E formula (\\(v_e = C / \\sqrt{\\rho}\\))** is an empirical equation based on kinetic energy and momentum transfer. It establishes the velocity threshold where fluid turbulence and boundary layer shear forces begin to **mechanically strip away protective corrosion product films (such as iron carbonate \\(\\text{FeCO}_3\\))** on the inner pipe wall. Once stripped, bare metal is continuously exposed to fresh corrosive attack, accelerating localized erosion-corrosion.",
      },
      {
        question: "When should the empirical factor C be increased from 100 to 150 or 200?",
        answer:
          "**C = 100** is standard for continuous service in **carbon steel** with solid-free fluids. **C = 125 ~ 150** is used for **intermittent operations** (such as relief lines or blowdown systems). For **Corrosion Resistant Alloys (CRAs)** such as 316L Stainless Steel, Duplex 2205, or Inconel 625, **C can be safely increased to 150 ~ 200** per Norsok P-002 and ISO 13703 because their tough passive chromium oxide film does not suffer flow-induced stripping.",
      },
      {
        question: "Why is there a practical 3.5 m/s velocity cap for liquids even if API RP 14E allows higher?",
        answer:
          "While the API formula might calculate an erosional limit \\(v_e\\) of 4.0 to 5.0 m/s for heavy liquids, general process plant design guidelines (such as Shell DEP, ExxonMobil, and Norsok) impose a **practical cap of 3.0 ~ 3.5 m/s for continuous carbon steel liquid transfer**. Exceeding 3.5 m/s dramatically increases **frictional pressure drop (\\(\\Delta P \\propto v^2\\)), pumping electrical power consumption, water hammer surge pressures, and acoustic noise**.",
      },
      {
        question: "Does API RP 14E apply to slurry systems with high entrained sand content?",
        answer:
          "**No**. API RP 14E assumes clean, particle-free fluids (sand < 1.0 lb/1,000 bbl). In severe sand-producing wells or mining slurry pipelines, abrasive solid sand grains impact the pipe wall with high momentum, cutting the metal mechanically. Slurry lines must use dedicated sand erosion models (e.g. **DNV-RP-O501 or Tulsa University Erosion Model**) with specialized ceramic-lined or hardened alloy pipe.",
      },
    ],
  },
};

export function getCalculatorSeo(slug: string): CalculatorSeoEntry | undefined {
  return CALCULATOR_SEO[slug];
}
