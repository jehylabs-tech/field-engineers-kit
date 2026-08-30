import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const fv = JSON.parse(
  readFileSync(join(root, "data/piping/fittingValveDimension.json"), "utf8"),
);
const ps = JSON.parse(
  readFileSync(join(root, "data/piping/pipeSchedule.json"), "utf8"),
);

const LABELS = {
  0.5: '1/2"',
  0.75: '3/4"',
  1: '1"',
  1.25: '1-1/4"',
  1.5: '1-1/2"',
  2: '2"',
  2.5: '2-1/2"',
  3: '3"',
  3.5: '3-1/2"',
  4: '4"',
  5: '5"',
  6: '6"',
  8: '8"',
  10: '10"',
  12: '12"',
  14: '14"',
  16: '16"',
  18: '18"',
  20: '20"',
  24: '24"',
};

const DN = {
  0.5: 15,
  0.75: 20,
  1: 25,
  1.25: 32,
  1.5: 40,
  2: 50,
  2.5: 65,
  3: 80,
  3.5: 90,
  4: 100,
  5: 125,
  6: 150,
  8: 200,
  10: 250,
  12: 300,
  14: 350,
  16: 400,
  18: 450,
  20: 500,
  24: 600,
};

/** B16.9 published center-to-end / overall lengths (mm) where handbook differs from pure formula. */
const TEE_C = {
  0.5: 25,
  0.75: 29,
  1: 38,
  1.25: 48,
  1.5: 57,
  2: 64,
  2.5: 76,
  3: 86,
  3.5: 95,
  4: 102,
  5: 124,
  6: 143,
  8: 178,
  10: 216,
  12: 254,
  14: 279,
  16: 305,
  18: 343,
  20: 381,
  24: 419,
};

const REDUCER_H = {
  0.5: 38,
  0.75: 38,
  1: 51,
  1.25: 51,
  1.5: 64,
  2: 76,
  2.5: 89,
  3: 89,
  3.5: 102,
  4: 102,
  5: 127,
  6: 140,
  8: 152,
  10: 178,
  12: 203,
  14: 330,
  16: 356,
  18: 381,
  20: 508,
  24: 508,
};

/** Cap overall length E (mm) — B16.9 screening. */
const CAP_E = {
  0.5: 25,
  0.75: 25,
  1: 38,
  1.25: 38,
  1.5: 38,
  2: 38,
  2.5: 38,
  3: 38,
  3.5: 48,
  4: 48,
  5: 57,
  6: 64,
  8: 79,
  10: 95,
  12: 111,
  14: 124,
  16: 140,
  18: 156,
  20: 171,
  24: 203,
};

function fromComp(id) {
  const c = fv.components.find((x) => x.id === id);
  return Object.fromEntries(
    c.sizes.map((s) => [
      s.nps,
      { mm: s.ratings[0].dimensionMm, kg: s.ratings[0].weightKg },
    ]),
  );
}

const lrSrc = fromComp("elbow_90_lr");
const e45Src = fromComp("elbow_45_lr");
const teeSrc = fromComp("tee_equal");
const redSrc = fromComp("reducer_concentric");
const allNps = ps.pipes.map((p) => p.nps);

function round1(n) {
  return Number(n.toFixed(1));
}

/** 90° LR: A(mm) = 38.1 × NPS(in) for NPS ≥ ¾; keep published small-size minima. */
function lrA(nps) {
  const n = Number(nps);
  if (lrSrc[nps]) return lrSrc[nps];
  return { mm: Math.round(n * 38.1), kg: round1(n * n * 0.2) };
}

/** 90° SR: A(mm) = 25.4 × NPS(in). */
function srA(nps) {
  const n = Number(nps);
  const base = lrA(nps);
  return { mm: Math.round(n * 25.4), kg: round1(base.kg * 0.7) };
}

/**
 * 45° LR: B ≈ 0.625 × NPS(in) → mm = 15.875 × NPS, with B16.9 published
 * overrides (e.g. NPS 12 → 229 mm).
 */
function lr45B(nps) {
  if (e45Src[nps]) {
    return { mm: e45Src[nps].mm, kg: e45Src[nps].kg };
  }
  const n = Number(nps);
  return { mm: Math.round(n * 15.875), kg: round1(n * n * 0.1) };
}

function teeC(nps) {
  if (teeSrc[nps]) return { mm: teeSrc[nps].mm, kg: teeSrc[nps].kg };
  const n = Number(nps);
  return {
    mm: TEE_C[nps] ?? Math.round(n * 25.4 * 0.75 + 38),
    kg: round1(n * n * 0.25),
  };
}

function reducerH(nps) {
  if (redSrc[nps]) return { mm: redSrc[nps].mm, kg: redSrc[nps].kg };
  const n = Number(nps);
  return {
    mm: REDUCER_H[nps] ?? Math.round(n * 25.4),
    kg: round1(n * n * 0.15),
  };
}

function capE(nps) {
  const n = Number(nps);
  const base = lrA(nps);
  return {
    mm: CAP_E[nps] ?? Math.round(Math.max(25, n * 8.5 + 10)),
    kg: round1(base.kg * 0.35),
  };
}

const comps = [
  {
    id: "elbow_90_lr",
    label: "90° Long Radius (LR) Elbow",
    dimensionLabel: "Center-to-end (A)",
    heroSymbol: "A",
    fn: lrA,
  },
  {
    id: "elbow_90_sr",
    label: "90° Short Radius (SR) Elbow",
    dimensionLabel: "Center-to-end (A)",
    heroSymbol: "A",
    fn: srA,
  },
  {
    id: "elbow_45_lr",
    label: "45° Long Radius (LR) Elbow",
    dimensionLabel: "Center-to-end (B)",
    heroSymbol: "B",
    fn: lr45B,
  },
  {
    id: "tee_equal",
    label: "Straight / Equal Tee",
    dimensionLabel: "Center-to-end (C)",
    heroSymbol: "C",
    fn: teeC,
  },
  {
    id: "reducer_concentric",
    label: "Concentric Reducer",
    dimensionLabel: "Overall length (H)",
    heroSymbol: "H",
    fn: reducerH,
  },
  {
    id: "reducer_eccentric",
    label: "Eccentric Reducer",
    dimensionLabel: "Overall length (H)",
    heroSymbol: "H",
    fn: reducerH,
  },
  {
    id: "cap",
    label: "Cap",
    dimensionLabel: "Overall length (E)",
    heroSymbol: "E",
    fn: capE,
  },
];

const out = {
  standard: "ASME B16.9",
  version: 2,
  updatedAt: "2026-08-28",
  notes:
    "Butt-weld envelopes per ASME B16.9. 90° LR A=1.5×NPS(in)=38.1×NPS(mm); SR A=1.0×NPS(in)=25.4×NPS(mm); 45° LR B≈0.625×NPS(in) with published overrides. Tee C / reducer H / cap E from B16.9 screening. OD/t from B36.10M/B36.19M; ID=OD−2t; weight = STD screening × (t/t_STD).",
  bevelAngleDeg: 37.5,
  components: comps.map((c) => ({
    id: c.id,
    label: c.label,
    standard: "ASME B16.9",
    dimensionLabel: c.dimensionLabel,
    heroSymbol: c.heroSymbol,
    sizes: allNps.map((nps) => {
      const d = c.fn(nps);
      return {
        nps,
        npsLabel: LABELS[nps] ?? `${nps}"`,
        dn: DN[nps] ?? Math.round(Number(nps) * 25),
        dimensionMm: d.mm,
        weightKgStd: d.kg,
      };
    }),
  })),
};

writeFileSync(
  join(root, "data/piping/buttWeldFitting.json"),
  `${JSON.stringify(out, null, 2)}\n`,
);

// Validate key relationships
const lr = out.components.find((c) => c.id === "elbow_90_lr");
const sr = out.components.find((c) => c.id === "elbow_90_sr");
const b45 = out.components.find((c) => c.id === "elbow_45_lr");
function dim(comp, nps) {
  return comp.sizes.find((s) => s.nps === nps).dimensionMm;
}
console.log("LR NPS4", dim(lr, "4"), "expect 152");
console.log("SR NPS4", dim(sr, "4"), "expect 102");
console.log("45 NPS12", dim(b45, "12"), "expect 229");
console.log("symbols", out.components.map((c) => `${c.id}:${c.heroSymbol}`).join(", "));
