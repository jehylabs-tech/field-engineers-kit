-- Hydro/Pneumatic Test Pressure calculator seed
-- Run after 007_seed_gasket_dimension_calculator.sql

insert into public.calculators (
  category,
  title,
  slug,
  meta_description,
  formula_json,
  is_published
) values
(
  'inspection',
  'Hydro/Pneumatic Test Pressure',
  'hydro-test-pressure',
  'Calculate ASME B31.3 hydrostatic and pneumatic test pressures with St/S temperature correction and yield-limit screening.',
  '{
    "type": "hydro-test",
    "standard": "ASME B31.3",
    "subtitle": "ASME B31.3 St/S stress ratio & yield limit check",
    "formulaBasis": "Hydrostatic test pressure Pt = 1.5 × P × (St/S). Pneumatic Pt = 1.1 × P × (St/S) per ASME B31.3 para. 345.4.2. Default St/S = 1.0; field guide cap is 6.5. Confirm that test hoop stress stays below yield.",
    "faq": [
      {
        "q": "When is temperature correction required?",
        "a": "Apply St/S when test temperature differs from design temperature and the code requires allowable stress adjustment at test conditions."
      },
      {
        "q": "Can pneumatic testing be used without approval?",
        "a": "No. Pneumatic testing typically requires written authorization and enhanced safety controls per ASME B31.3 and site rules."
      }
    ],
    "related": [
      {
        "slug": "pipe-wall-thickness",
        "title": "ASME B31.3 Pipe Thickness Calculator",
        "carry": "Design basis →"
      },
      {
        "slug": "blind-flange-thickness",
        "title": "Blind Flange Thickness",
        "carry": "Test blind sizing →"
      }
    ]
  }'::jsonb,
  true
)
on conflict (slug) do update set
  category = excluded.category,
  title = excluded.title,
  meta_description = excluded.meta_description,
  formula_json = excluded.formula_json,
  is_published = excluded.is_published;
