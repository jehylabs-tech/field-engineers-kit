import { writeFileSync } from "fs";

const NM = 1.35582;
const studMm = {
  "1/2": 12.7,
  "5/8": 15.9,
  "3/4": 19.1,
  "7/8": 22.2,
  "1": 25.4,
  "1-1/8": 28.6,
  "1-1/4": 31.8,
  "1-1/2": 38.1,
};
const metric = {
  "1/2": "M12",
  "5/8": "M16",
  "3/4": "M20",
  "7/8": "M22",
  "1": "M24",
  "1-1/8": "M27",
  "1-1/4": "M30",
  "1-1/2": "M36",
};

function studLabel(frac) {
  return `${frac}" (${metric[frac]})`;
}

function pattern(n) {
  const rounds =
    "Apply Round 1-4 (30% -> 60% -> 100% -> circular 100%).";
  if (n <= 4) return `4-bolt cross: 1 -> 3 -> 2 -> 4. ${rounds}`;
  if (n === 8) return `8-bolt star: 1 -> 5 -> 3 -> 7 -> 2 -> 6 -> 4 -> 8. ${rounds}`;
  if (n === 12)
    return `12-bolt star: 1 -> 7 -> 4 -> 10 -> 2 -> 8 -> 5 -> 11 -> 3 -> 9 -> 6 -> 12. ${rounds}`;
  if (n === 16) return `16-bolt star pattern. ${rounds}`;
  if (n === 20) return `20-bolt star pattern. ${rounds}`;
  if (n === 24) return `24-bolt star pattern. ${rounds}`;
  return `${n}-bolt star pattern. ${rounds}`;
}

const baseFtLb = {
  "1/2": 60,
  "5/8": 100,
  "3/4": 200,
  "7/8": 320,
  "1": 450,
  "1-1/8": 600,
  "1-1/4": 750,
  "1-1/2": 1100,
};

function torque(stud, cls) {
  let ft = baseFtLb[stud];
  if (cls === "300") ft = Math.round(ft * 1.35);
  if (cls === "600") ft = Math.round(ft * 1.7);
  return { torqueFtLb: ft, torqueNm: Math.round(ft * NM) };
}

// [nps, label, dn, {150:[count,stud], 300, 600}] — ASME B16.5 WN RF typical
const matrix = [
  ["0.5", '1/2"', 15, { 150: [4, "1/2"], 300: [4, "1/2"], 600: [4, "1/2"] }],
  ["0.75", '3/4"', 20, { 150: [4, "1/2"], 300: [4, "5/8"], 600: [4, "5/8"] }],
  ["1", '1"', 25, { 150: [4, "1/2"], 300: [4, "5/8"], 600: [4, "5/8"] }],
  ["1.5", '1-1/2"', 40, { 150: [4, "1/2"], 300: [4, "3/4"], 600: [4, "3/4"] }],
  ["2", '2"', 50, { 150: [4, "5/8"], 300: [8, "5/8"], 600: [8, "5/8"] }],
  ["2.5", '2-1/2"', 65, { 150: [4, "5/8"], 300: [8, "3/4"], 600: [8, "3/4"] }],
  ["3", '3"', 80, { 150: [4, "5/8"], 300: [8, "3/4"], 600: [8, "3/4"] }],
  ["4", '4"', 100, { 150: [8, "5/8"], 300: [8, "3/4"], 600: [8, "3/4"] }],
  ["5", '5"', 125, { 150: [8, "3/4"], 300: [8, "3/4"], 600: [8, "1"] }],
  ["6", '6"', 150, { 150: [8, "3/4"], 300: [12, "3/4"], 600: [12, "1"] }],
  ["8", '8"', 200, { 150: [8, "3/4"], 300: [12, "7/8"], 600: [12, "1"] }],
  ["10", '10"', 250, { 150: [12, "7/8"], 300: [16, "1"], 600: [16, "1-1/8"] }],
  ["12", '12"', 300, { 150: [12, "7/8"], 300: [16, "1-1/8"], 600: [20, "1-1/4"] }],
  ["14", '14"', 350, { 150: [12, "1"], 300: [20, "1-1/8"], 600: [20, "1-1/4"] }],
  ["16", '16"', 400, { 150: [16, "1"], 300: [20, "1-1/4"], 600: [20, "1-1/2"] }],
  ["18", '18"', 450, { 150: [16, "1-1/8"], 300: [24, "1-1/4"], 600: [24, "1-1/2"] }],
  ["20", '20"', 500, { 150: [20, "1-1/8"], 300: [24, "1-1/4"], 600: [24, "1-1/2"] }],
  ["24", '24"', 600, { 150: [20, "1-1/4"], 300: [24, "1-1/2"], 600: [24, "1-1/2"] }],
];

const override = {
  "2|150": { torqueNm: 135, torqueFtLb: 100 },
  "2|300": { torqueNm: 190, torqueFtLb: 140 },
  "2|600": { torqueNm: 340, torqueFtLb: 250 },
  "4|150": { torqueNm: 190, torqueFtLb: 140 },
  "4|300": { torqueNm: 340, torqueFtLb: 250 },
  "4|600": { torqueNm: 475, torqueFtLb: 350 },
  "8|150": { torqueNm: 340, torqueFtLb: 250 },
  "8|300": { torqueNm: 475, torqueFtLb: 350 },
  "8|600": { torqueNm: 680, torqueFtLb: 500 },
};

const entries = matrix.map(([nps, npsLabel, dn, classes]) => {
  const ratings = ["150", "300", "600"].map((cls) => {
    const [count, stud] = classes[cls];
    const t = override[`${nps}|${cls}`] || torque(stud, cls);
    return {
      class: cls,
      studSize: studLabel(stud),
      studSizeMm: studMm[stud],
      boltCount: count,
      torqueNm: t.torqueNm,
      torqueFtLb: t.torqueFtLb,
      tighteningPattern: pattern(count),
    };
  });
  return { nps, npsLabel, dn, ratings };
});

const data = {
  standard: "ASME PCC-1",
  version: 3,
  updatedAt: "2026-08-25",
  lubrication: "Moly-based anti-seize K = 0.13 (field maintenance default)",
  notes:
    "Bolt counts and stud sizes follow ASME B16.5 WN RF. Assembly torques are PCC-1 style moly screening values; rescale by K and bolt grade in the calculator.",
  entries,
};

writeFileSync(
  "data/mechanical/boltTorque.json",
  JSON.stringify(data, null, 2) + "\n",
);
console.log("Wrote", entries.length, "NPS sizes");
