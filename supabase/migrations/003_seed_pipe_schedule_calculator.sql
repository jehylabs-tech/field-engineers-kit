-- Pipe Schedule & Dimension calculator seed
-- Run after 002_seed_mvp_calculators.sql

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
  'Pipe Schedule & Dimension',
  'pipe-schedule-dimension',
  'Look up ASME B36.10M pipe outside diameter, inside diameter, wall thickness, and unit weight by NPS and schedule.',
  '{
    "type": "pipe-schedule",
    "standard": "ASME B36.10M",
    "subtitle": "Reference pipe dimensions and unit weight from the admin-managed schedule table.",
    "formulaBasis": "Dimensions are sourced from data/piping/pipeSchedule.json. Select nominal pipe size (NPS) and schedule to retrieve outside diameter, inside diameter, wall thickness, and unit weight.",
    "faq": [
      {
        "q": "Where does the schedule data come from?",
        "a": "Reference dimensions are stored in data/piping/pipeSchedule.json and loaded at runtime. Admins can update this file or future API endpoints without changing calculator code."
      },
      {
        "q": "Which pipe sizes are available in the MVP table?",
        "a": "The initial table includes 2\", 4\", and 8\" NPS with schedules 10, 40, 80, and 160."
      }
    ],
    "related": [
      {
        "slug": "pipe-wall-thickness",
        "title": "ASME B31.3 Pipe Thickness Calculator",
        "carry": "Use OD from schedule →"
      },
      {
        "slug": "metal-weight-cost",
        "title": "Metal Weight & Cost Estimator",
        "carry": "Weight carry-over →"
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
