/** Compact engineering reference for the flange dimension calculator UI. */

export const FLANGE_TOLERANCE_NOTES = [
  {
    label: "Raised face height",
    value: "1/16\" (Cl 150/300) · 1/4\" (Cl ≥ 600)",
  },
  {
    label: "Bolt circle tolerance",
    value: "±1.5 mm (±0.06 in)",
  },
  {
    label: "Hub bore tolerance",
    value: "+0.8 mm / −0.0 mm (NPS ≤ 10)",
  },
] as const;

export const FLANGE_MATERIAL_GROUPS = [
  {
    group: "Group 1.1 — A105",
    rating: "Cl 150: 19.6 bar @ 38 °C → 6.5 bar @ 300 °C",
  },
  {
    group: "Group 2.1 — 304L",
    rating: "Cl 150: 15.9 bar @ 38 °C → 8.4 bar @ 200 °C",
  },
  {
    group: "Group 2.2 — 316L",
    rating: "Cl 150: 15.9 bar @ 38 °C → 8.9 bar @ 200 °C",
  },
  {
    group: "Group 2.8 — Duplex F51",
    rating: "Cl 150: 20.0 bar @ 38 °C → 14.8 bar @ 200 °C",
  },
] as const;

export const FLANGE_INLINE_FAQ = [
  {
    question: "Does Class 150 mean 150 psi?",
    answer:
      "No — class is a dimensionless rating designator. MAWP depends on material group and temperature per ASME B16.5 Table 2 (e.g. A105 Cl 150 = 19.6 bar @ 38 °C, derating to 6.5 bar @ 300 °C).",
  },
  {
    question: "When is ASME B16.47 required?",
    answer:
      "B16.5 covers NPS 1/2–24. For NPS 26–60 use B16.47 Series A (MSS SP-44) or Series B (API 605) — bolt patterns are not interchangeable.",
  },
  {
    question: "RF vs FF mating precautions?",
    answer:
      "Never bolt a cast-iron or bronze FF flange to a carbon-steel RF flange without removing the raised face or using a full-face gasket — bending moments can crack brittle flanges.",
  },
] as const;
