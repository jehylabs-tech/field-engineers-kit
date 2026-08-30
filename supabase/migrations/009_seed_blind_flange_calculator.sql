-- Blind Flange Thickness calculator seed
-- Run after 008_seed_hydro_test_calculator.sql

insert into public.calculators (
  category,
  title,
  slug,
  meta_description,
  formula_json,
  is_published
) values
(
  'mechanical',
  'Blind Flange Thickness',
  'blind-flange-thickness',
  'Calculate ASME B31.3 / VIII-1 UG-34 flat blind thickness t = d × √(0.3P / SE) + c from diameter, design pressure, and corrosion allowance.',
  '{
    "type": "blind-flange",
    "standard": "ASME B31.3",
    "subtitle": "t = d × √(0.3P / SE) + c using attachment factor C = 0.30 (B31.3 304.4.1 / VIII-1 UG-34).",
    "formulaBasis": "Required thickness uses t = d × √(0.3P / SE) + c. C = 0.30 is the ASME Section VIII Division 1 UG-34 / B31.3 para. 304.4.1 bolted flat-cover factor. d is inside or gasket contact diameter; P and S share stress units; c is corrosion allowance.",
    "faq": [
      {
        "q": "Which diameter should I use for d?",
        "a": "Use the gasket contact diameter when known. For screening, pipe inside diameter may be used as a conservative starting point."
      },
      {
        "q": "Are material presets final?",
        "a": "Presets provide typical allowable stress values. Confirm against the applicable code edition and design temperature."
      }
    ],
    "related": [
      {
        "slug": "hydro-test-pressure",
        "title": "Hydro/Pneumatic Test Pressure",
        "carry": "Test pressure apply →"
      },
      {
        "slug": "flange-dimension-weight",
        "title": "Flange Dimension & Weight",
        "carry": "Flange comparison →"
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
