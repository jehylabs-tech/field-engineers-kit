-- Fitting & Valve Face-to-Face calculator seed
-- Run after 004_seed_flange_dimension_calculator.sql

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
  'Fitting & Valve Face-to-Face',
  'fitting-valve-dimension',
  'Look up ASME B16.10 valve face-to-face and ASME B16.9 fitting center-to-end dimensions by NPS and pressure class.',
  '{
    "type": "fitting-valve-dimension",
    "standard": "ASME B16.9 / B16.10",
    "subtitle": "Reference valve face-to-face and fitting center-to-end dimensions from the admin-managed table.",
    "formulaBasis": "Dimensions are sourced from data/piping/fittingValveDimension.json. Select component type, NPS, and pressure class to retrieve face-to-face or center-to-end dimensions and approximate weight.",
    "faq": [
      {
        "q": "Which components are included?",
        "a": "The MVP table includes gate, globe, and swing check valves (B16.10) plus 90° LR elbows and equal tees (B16.9)."
      },
      {
        "q": "Do fittings use pressure classes?",
        "a": "Fittings use a standard (STD) rating in the reference table. Valves support Class 150 and 300."
      }
    ],
    "related": [
      {
        "slug": "flange-dimension-weight",
        "title": "Flange Dimension & Weight",
        "carry": "Flange spool layout →"
      },
      {
        "slug": "pipe-schedule-dimension",
        "title": "Pipe Schedule & Dimension",
        "carry": "Pipe size match →"
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
