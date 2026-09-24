/**
 * ASME B16.34-2020 Standard Class — P-T curves + Appendix VI / Table 3 wall basis.
 */

import ratingsRaw from "../../../../data/piping/asme-b16-34-pt-ratings.json";

export type B1634RatingGroupId = "1.1" | "1.2" | "2.2" | "1.9";
export type B1634ClassId =
  | "150"
  | "300"
  | "600"
  | "900"
  | "1500"
  | "2500";

export type B1634MaterialId =
  | "group-1.1-A105-WCB"
  | "group-1.2-A216-WCC"
  | "group-2.2-A351-CF8M-316"
  | "group-1.9-A217-WC6";

type PtNode = { tC: number; pBar: number };
type Table3Row = { dMm: number; tMm: number };

type GroupTable = {
  id: string;
  label: string;
  shortLabel: string;
  examples: string[];
  ratingSource: "table" | "proxy-1.1" | "unavailable";
  classes: Record<string, PtNode[]>;
};

type RatingsFile = {
  appendixVi: { S_psi: number; A_in: number; A_mm: number };
  classPcPsi: Record<string, number>;
  table3ByClass: Record<string, Table3Row[]>;
  groups: Record<string, GroupTable>;
};

const F = ratingsRaw as RatingsFile;

export const B1634_MATERIAL_OPTIONS: {
  value: B1634MaterialId;
  label: string;
  groupId: B1634RatingGroupId;
}[] = [
  {
    value: "group-1.1-A105-WCB",
    label: "Group 1.1 — A105 / A216 WCB",
    groupId: "1.1",
  },
  {
    value: "group-1.2-A216-WCC",
    label: "Group 1.2 — A216 WCC",
    groupId: "1.2",
  },
  {
    value: "group-2.2-A351-CF8M-316",
    label: "Group 2.2 — A351 CF8M / 316",
    groupId: "2.2",
  },
  {
    value: "group-1.9-A217-WC6",
    label: "Group 1.9 — A217 WC6",
    groupId: "1.9",
  },
];

export const B1634_CLASS_OPTIONS: { value: B1634ClassId; label: string }[] = [
  { value: "150", label: "Class 150" },
  { value: "300", label: "Class 300" },
  { value: "600", label: "Class 600" },
  { value: "900", label: "Class 900" },
  { value: "1500", label: "Class 1500" },
  { value: "2500", label: "Class 2500" },
];

export const B1634_NPS_OPTIONS = [
  "0.5",
  "0.75",
  "1",
  "1.5",
  "2",
  "3",
  "4",
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "18",
  "20",
  "24",
  "30",
  "36",
].map((nps) => ({ value: nps, label: `NPS ${nps}` }));

export function materialMeta(id: B1634MaterialId) {
  return B1634_MATERIAL_OPTIONS.find((o) => o.value === id)!;
}

export function resolveGroup(groupId: B1634RatingGroupId): GroupTable {
  return F.groups[groupId] ?? F.groups["1.1"];
}

export function classPcPsi(classId: B1634ClassId): number {
  return F.classPcPsi[classId] ?? Number(classId);
}

export function appendixViConstants() {
  return F.appendixVi;
}

export function getRatingCurve(
  groupId: B1634RatingGroupId,
  classId: B1634ClassId,
): PtNode[] | null {
  const group = resolveGroup(groupId);
  if (group.ratingSource === "unavailable") return null;
  const nodes = group.classes?.[classId];
  return nodes?.length ? nodes : null;
}

export function getTable3Rows(classId: B1634ClassId): Table3Row[] {
  return F.table3ByClass[classId] ?? [];
}

/** Linear interpolate Table 3 t_m (mm) vs inside diameter (mm). */
export function interpolateTable3Mm(
  classId: B1634ClassId,
  dMm: number,
): number | null {
  const rows = [...getTable3Rows(classId)].sort((a, b) => a.dMm - b.dMm);
  if (!rows.length) return null;
  if (dMm <= rows[0].dMm) return rows[0].tMm;
  if (dMm >= rows[rows.length - 1].dMm) return rows[rows.length - 1].tMm;
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    if (dMm >= a.dMm && dMm <= b.dMm) {
      if (b.dMm === a.dMm) return a.tMm;
      const frac = (dMm - a.dMm) / (b.dMm - a.dMm);
      return a.tMm + frac * (b.tMm - a.tMm);
    }
  }
  return rows[rows.length - 1].tMm;
}

export function interpolatePressureBar(
  nodes: PtNode[],
  tC: number,
): { pBar: number; clamped: boolean; tMin: number; tMax: number } {
  const sorted = [...nodes].sort((a, b) => a.tC - b.tC);
  const tMin = sorted[0].tC;
  const tMax = sorted[sorted.length - 1].tC;
  if (tC <= tMin) {
    return { pBar: sorted[0].pBar, clamped: tC < tMin, tMin, tMax };
  }
  if (tC >= tMax) {
    return {
      pBar: sorted[sorted.length - 1].pBar,
      clamped: tC > tMax,
      tMin,
      tMax,
    };
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (tC >= a.tC && tC <= b.tC) {
      if (b.tC === a.tC) {
        return { pBar: a.pBar, clamped: false, tMin, tMax };
      }
      const frac = (tC - a.tC) / (b.tC - a.tC);
      return {
        pBar: a.pBar + frac * (b.pBar - a.pBar),
        clamped: false,
        tMin,
        tMax,
      };
    }
  }
  return {
    pBar: sorted[sorted.length - 1].pBar,
    clamped: true,
    tMin,
    tMax,
  };
}

export function ambientRatingBar(
  groupId: B1634RatingGroupId,
  classId: B1634ClassId,
): number | null {
  const nodes = getRatingCurve(groupId, classId);
  if (!nodes?.length) return null;
  const at38 = nodes.find((n) => n.tC === 38) ?? nodes[0];
  return at38.pBar;
}
