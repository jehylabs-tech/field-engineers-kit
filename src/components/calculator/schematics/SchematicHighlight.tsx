"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SchematicHighlightContextValue = {
  active: string | null;
  setActive: (key: string | null) => void;
};

const SchematicHighlightContext =
  createContext<SchematicHighlightContextValue | null>(null);

export function SchematicHighlightProvider({ children }: { children: ReactNode }) {
  const [active, setActiveState] = useState<string | null>(null);
  const setActive = useCallback((key: string | null) => {
    setActiveState(key);
  }, []);
  const value = useMemo(() => ({ active, setActive }), [active, setActive]);
  return (
    <SchematicHighlightContext.Provider value={value}>
      {children}
    </SchematicHighlightContext.Provider>
  );
}

export function useSchematicHighlight() {
  return useContext(SchematicHighlightContext);
}

export function schematicStroke(active: string | null, key: string) {
  return active === key ? "var(--spec-accent)" : "var(--spec-text3)";
}

export function schematicText(active: string | null, key: string) {
  return active === key ? "var(--spec-spon-text)" : "var(--spec-text2)";
}

export function schematicWidth(active: string | null, key: string) {
  return active === key ? 2.4 : 1.25;
}

export function schematicClass(active: string | null, key: string) {
  return active === key ? "schematic-hot" : undefined;
}

export function schematicKeyFromLabel(label: string, explicit?: string): string | null {
  if (explicit) return explicit;
  const text = label.toLowerCase();
  const tagged = label.match(/\(([LAMEDtdPc])\)/);
  if (tagged) return tagged[1];
  if (text.includes("face-to-face") || text.startsWith("l ")) return "L";
  if (text.includes("center-to-end") && text.includes("a")) return "A";
  if (text.includes("end-to-end")) return "E";
  if (text.includes("flange od") || text.includes("outside diameter (od)") || text === "outside diameter") {
    return "od";
  }
  if (text.includes("outside diameter (d)")) return "D";
  if (text.includes("inside diameter")) return "id";
  if (text.includes("wall thickness") || text.includes("thickness (t)") && !text.includes("flange")) {
    return "t";
  }
  if (text.includes("flange thickness")) return "T";
  if (text.includes("bolt circle") || text.includes("pcd")) return "pcd";
  if (text.includes("bolt hole")) return "hole";
  if (text.includes("hub bore") || text === "bore") return "bore";
  if (text.includes("design pressure")) return "P";
  if (text.includes("corrosion allowance")) return "c";
  if (text.includes("actual thickness")) return "tact";
  return null;
}
