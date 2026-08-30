-- Expansion calculators: thermal growth, pressure drop, velocity, material codes, unit converter
-- Run after 009_seed_blind_flange_calculator.sql

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
  'Thermal Expansion & Loop Sizing',
  'thermal-expansion-loop',
  'Calculate ASME B31.3 thermal growth and screen L-shape / U-loop leg length from material, T1/T2, and straight-run length.',
  '{"type":"thermal-expansion","standard":"ASME B31.3"}'::jsonb,
  true
),
(
  'piping',
  'Pressure Drop & Friction Loss',
  'pressure-drop-friction',
  'Darcy–Weisbach pressure drop with NPS/schedule ID, fittings as equivalent length, and ΔP in bar and psi.',
  '{"type":"pressure-drop","standard":"Darcy–Weisbach"}'::jsonb,
  true
),
(
  'piping',
  'Flow Rate & Velocity',
  'flow-velocity-erosion',
  'Compute pipe velocity v = Q/A and flag API RP 14E erosion velocity limit vc = c / √ρ.',
  '{"type":"flow-velocity","standard":"API RP 14E"}'::jsonb,
  true
),
(
  'procurement',
  'Material Equivalent Code Finder',
  'material-equivalent-finder',
  'Search ASTM, ASME, EN, DIN, JIS, and KS equivalents for piping, plate, fittings, and fasteners.',
  '{"type":"material-equivalent","standard":"Cross-reference table"}'::jsonb,
  true
),
(
  'procurement',
  'Quick Engineering Unit Converter',
  'unit-converter',
  'Convert plant units: bar/MPa/psi/kgf/cm², m³/h/GPM/kg/h, mm/in/ft, and °C/°F/K.',
  '{"type":"unit-converter","standard":"SI conversion"}'::jsonb,
  true
)
on conflict (slug) do update set
  category = excluded.category,
  title = excluded.title,
  meta_description = excluded.meta_description,
  formula_json = excluded.formula_json,
  is_published = excluded.is_published;
