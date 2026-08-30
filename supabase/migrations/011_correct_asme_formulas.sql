-- Correct calculator standards and formula copy after QA:
-- bolt torque ASME PCC-1, blind C = 0.30, hydro always applies St/S.

update public.calculators
set
  meta_description = 'Look up ASME PCC-1 recommended flange joint assembly torque, stud size, bolt count, and star tightening sequence.',
  formula_json = jsonb_set(
    jsonb_set(
      jsonb_set(formula_json, '{standard}', '"ASME PCC-1"'),
      '{subtitle}',
      '"ASME PCC-1 Guidelines for Pressure Boundary Bolted Flange Joint Assembly."'
    ),
    '{formulaBasis}',
    '"Assembly torque, stud size, and star-pattern tightening follow ASME PCC-1. NPS and class nominators come from the ASME B16.5 flange geometry used with the joint."'
  )
where slug = 'bolt-torque-tensioning';

update public.calculators
set
  meta_description = 'Calculate ASME B31.3 hydrostatic and pneumatic test pressures with St/S temperature correction and yield-limit screening.',
  formula_json = jsonb_set(
    jsonb_set(
      jsonb_set(formula_json, '{standard}', '"ASME B31.3"'),
      '{subtitle}',
      '"ASME B31.3 St/S stress ratio & yield limit check"'
    ),
    '{formulaBasis}',
    '"Hydrostatic test pressure Pt = 1.5 × P × (St/S). Pneumatic Pt = 1.1 × P × (St/S) per ASME B31.3 para. 345.4.2. Default St/S = 1.0; field guide cap is 6.5. Confirm that test hoop stress stays below yield."'
  )
where slug = 'hydro-test-pressure';

update public.calculators
set
  meta_description = 'Calculate ASME B31.3 / VIII-1 UG-34 flat blind thickness t = d × √(0.3P / SE) + c from diameter, design pressure, and corrosion allowance.',
  formula_json = jsonb_set(
    jsonb_set(
      formula_json,
      '{subtitle}',
      '"t = d × √(0.3P / SE) + c using attachment factor C = 0.30 (B31.3 304.4.1 / VIII-1 UG-34)."'
    ),
    '{formulaBasis}',
    '"Required thickness uses t = d × √(0.3P / SE) + c. C = 0.30 is the ASME Section VIII Division 1 UG-34 / B31.3 para. 304.4.1 bolted flat-cover factor."'
  )
where slug = 'blind-flange-thickness';
