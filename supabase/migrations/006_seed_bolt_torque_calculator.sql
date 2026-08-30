-- Bolt Torque & Tensioning calculator seed
-- Run after 005_seed_fitting_valve_calculator.sql

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
  'Bolt Torque & Tensioning',
  'bolt-torque-tensioning',
  'Look up ASME PCC-1 recommended flange joint assembly torque, stud size, bolt count, and star tightening sequence.',
  '{
    "type": "bolt-torque",
    "standard": "ASME PCC-1",
    "subtitle": "ASME PCC-1 Guidelines for Pressure Boundary Bolted Flange Joint Assembly.",
    "formulaBasis": "Assembly torque, stud size, and star-pattern tightening follow ASME PCC-1. NPS and class nominators come from the ASME B16.5 flange geometry used with the joint.",
    "faq": [
      {
        "q": "Does this include tensioning tool settings?",
        "a": "The MVP table provides recommended assembly torque for manual or calibrated wrench make-up. Hydraulic tensioner loads should follow vendor methods."
      },
      {
        "q": "Which lubrication is assumed?",
        "a": "Values assume moly-based anti-seize unless your project specification requires dry or alternative lubricants."
      }
    ],
    "related": [
      {
        "slug": "flange-dimension-weight",
        "title": "Flange Dimension & Weight",
        "carry": "Match flange class →"
      },
      {
        "slug": "gasket-dimension-selection",
        "title": "Gasket Dimension & Selection",
        "carry": "Gasket fit check →"
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
