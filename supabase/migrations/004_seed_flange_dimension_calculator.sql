-- Flange Dimension & Weight calculator seed
-- Run after 003_seed_pipe_schedule_calculator.sql

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
  'Flange Dimension & Weight',
  'flange-dimension-weight',
  'Look up ASME B16.5 weld neck RF flange dimensions, bolt circle, and approximate weight for Class 150, 300, and 600.',
  '{
    "type": "flange-dimension",
    "standard": "ASME B16.5",
    "subtitle": "Reference flange OD, thickness, raised face, bolt circle, and weight from the admin-managed dimension table.",
    "formulaBasis": "Dimensions are sourced from data/piping/flangeDimension.json. Select NPS and pressure class to retrieve weld neck raised-face flange dimensions and approximate weight.",
    "faq": [
      {
        "q": "Which flange type is included?",
        "a": "The MVP table covers weld neck raised-face (WN RF) flanges per ASME B16.5 for Class 150, 300, and 600."
      },
      {
        "q": "Where does the weight data come from?",
        "a": "Approximate weights are stored in data/piping/flangeDimension.json and can be updated by admins without code changes."
      }
    ],
    "related": [
      {
        "slug": "pipe-schedule-dimension",
        "title": "Pipe Schedule & Dimension",
        "carry": "Match pipe NPS →"
      },
      {
        "slug": "fitting-valve-dimension",
        "title": "Fitting & Valve Face-to-Face",
        "carry": "Spool length planning →"
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
