-- Gasket Dimension & Selection calculator seed
-- Run after 006_seed_bolt_torque_calculator.sql

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
  'Gasket Dimension & Selection',
  'gasket-dimension-selection',
  'Look up ASME B16.20 spiral wound and RTJ ring gasket dimensions by NPS and pressure class for procurement and field selection.',
  '{
    "type": "gasket-dimension",
    "standard": "ASME B16.20",
    "subtitle": "Reference spiral wound and RTJ ring gasket dimensions from the admin-managed gasket table.",
    "formulaBasis": "Dimensions are sourced from data/piping/gasketDimension.json. Select gasket type, NPS, and class to retrieve inner/outer ring, sealing element, or RTJ pitch dimensions.",
    "faq": [
      {
        "q": "Which gasket types are included?",
        "a": "The MVP table includes spiral wound gaskets and RTJ ring gaskets for NPS 2\", 4\", and 8\" at Class 150, 300, and 600."
      },
      {
        "q": "Can I use this for final procurement?",
        "a": "Use as a field screening reference. Confirm final gasket selection against vendor datasheets and project specifications."
      }
    ],
    "related": [
      {
        "slug": "flange-dimension-weight",
        "title": "Flange Dimension & Weight",
        "carry": "Flange PCD match →"
      },
      {
        "slug": "bolt-torque-tensioning",
        "title": "Bolt Torque & Tensioning",
        "carry": "Joint make-up →"
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
