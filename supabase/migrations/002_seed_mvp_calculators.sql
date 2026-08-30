-- MVP seed data for 3 public calculators
-- Run after 001_calculators.sql

insert into public.calculators (
  category,
  title,
  slug,
  meta_description,
  formula_json,
  is_published
) values
(
  'piping',
  'ASME B31.3 Pipe Thickness Calculator',
  'pipe-wall-thickness',
  'Calculate minimum required pipe wall thickness per ASME B31.3 for process piping maintenance and inspection planning.',
  '{
    "type": "pipe-thickness",
    "standard": "ASME B31.3",
    "subtitle": "Compute required minimum wall thickness for internal pressure design and compare against actual thickness.",
    "formulaBasis": "Required wall thickness is calculated using t = PD / (2SE - 0.2P) + CA, where P is design pressure, D is outside diameter, S is allowable stress, E is weld joint efficiency, and CA is corrosion allowance.",
    "faq": [
      {
        "q": "When should corrosion allowance be added?",
        "a": "Corrosion allowance should reflect expected metal loss over the service life of the line and is added to the pressure-design thickness."
      },
      {
        "q": "What weld joint efficiency should I use?",
        "a": "Use the value permitted by the applicable code edition and joint category. Seamless pipe often uses E = 1.0."
      }
    ],
    "related": [
      {
        "slug": "valve-cv-sizing",
        "title": "Valve Cv Sizing Calculator",
        "carry": "Pressure, flow carry-over →"
      },
      {
        "slug": "metal-weight-cost",
        "title": "Metal Weight & Cost Estimator",
        "carry": "Pipe OD auto apply →"
      }
    ],
    "sponsor": {
      "title": "Piping spool material stock check",
      "description": "Authorized distributor — verify stock for the entered pipe size and schedule in real time."
    }
  }'::jsonb,
  true
),
(
  'mechanical',
  'Valve Cv Sizing Calculator',
  'valve-cv-sizing',
  'Size control valves for liquid and gas service by calculating required flow coefficient (Cv) from process conditions.',
  '{
    "type": "valve-cv",
    "standard": "ISA / IEC 60534",
    "subtitle": "Liquid and gas tabs for quick control valve sizing during turnaround and troubleshooting.",
    "formulaBasis": "Liquid service uses Cv = Q * sqrt(SG / ΔP). Gas service applies compressible flow correction using inlet/outlet pressure, specific gravity, and temperature.",
    "faq": [
      {
        "q": "Why is my calculated Cv higher than the selected valve?",
        "a": "The selected valve is undersized for the entered flow and pressure drop. Increase Cv or reduce pressure drop assumptions."
      },
      {
        "q": "Can I use this for critical gas applications?",
        "a": "This MVP tool is for screening only. Final valve selection should follow vendor methods and applicable standards."
      }
    ],
    "related": [
      {
        "slug": "pipe-wall-thickness",
        "title": "ASME B31.3 Pipe Thickness Calculator",
        "carry": "Line size carry-over →"
      },
      {
        "slug": "metal-weight-cost",
        "title": "Metal Weight & Cost Estimator",
        "carry": "Material cost apply →"
      }
    ],
    "sponsor": {
      "title": "Control valve trim availability",
      "description": "Valve partner — check trim and actuator availability for the calculated Cv range."
    }
  }'::jsonb,
  true
),
(
  'procurement',
  'Metal Weight & Cost Estimator',
  'metal-weight-cost',
  'Estimate metal weight and procurement cost for plate, pipe, and bar shapes using material density and unit price.',
  '{
    "type": "metal-weight",
    "standard": "Procurement Estimate",
    "subtitle": "Quick material take-off for maintenance planners and buyers using density-based weight and unit cost.",
    "formulaBasis": "Weight is calculated from volume multiplied by material density. Total cost equals weight multiplied by unit price in $/kg.",
    "faq": [
      {
        "q": "Which density values are used?",
        "a": "Built-in densities include carbon steel, stainless 304, aluminum, and copper at standard room-temperature values."
      },
      {
        "q": "Does this include fabrication or freight?",
        "a": "No. The result is a material-only estimate for early planning and RFQ comparison."
      }
    ],
    "related": [
      {
        "slug": "pipe-wall-thickness",
        "title": "ASME B31.3 Pipe Thickness Calculator",
        "carry": "Pipe OD carry-over →"
      },
      {
        "slug": "valve-cv-sizing",
        "title": "Valve Cv Sizing Calculator",
        "carry": "Flow data apply →"
      }
    ],
    "sponsor": {
      "title": "Mill lead time and bundle pricing",
      "description": "Steel service center — request live bundle pricing for the calculated weight."
    }
  }'::jsonb,
  true
)
on conflict (slug) do update set
  category = excluded.category,
  title = excluded.title,
  meta_description = excluded.meta_description,
  formula_json = excluded.formula_json,
  is_published = excluded.is_published;
