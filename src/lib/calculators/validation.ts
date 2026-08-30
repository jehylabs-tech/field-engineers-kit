import { getAllCategories } from "@/lib/menu/config";
import type { CalculatorFormInput } from "./types";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const VALID_CATEGORY_IDS = new Set(getAllCategories().map((c) => c.id));

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseCalculatorForm(
  input: CalculatorFormInput,
): { data: Omit<CalculatorFormInput, "formula_json"> & { formula_json: Record<string, unknown> }; error?: string } {
  const category = input.category.trim();
  const title = input.title.trim();
  const slug = input.slug.trim().toLowerCase();
  const meta_description = input.meta_description.trim();

  if (!category) {
    return { data: input as never, error: "Category is required." };
  }

  if (!VALID_CATEGORY_IDS.has(category)) {
    return { data: input as never, error: "Invalid category selected." };
  }

  if (!title) {
    return { data: input as never, error: "Title is required." };
  }

  if (!slug) {
    return { data: input as never, error: "Slug is required." };
  }

  if (!SLUG_PATTERN.test(slug)) {
    return {
      data: input as never,
      error: "Slug must use lowercase letters, numbers, and hyphens only.",
    };
  }

  let formula_json: Record<string, unknown>;

  try {
    const parsed = JSON.parse(input.formula_json || "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { data: input as never, error: "Formula JSON must be a valid JSON object." };
    }
    formula_json = parsed as Record<string, unknown>;
  } catch {
    return { data: input as never, error: "Formula JSON is not valid JSON." };
  }

  return {
    data: {
      category,
      title,
      slug,
      meta_description,
      formula_json,
      is_published: input.is_published,
    },
  };
}

export function formatFormulaJson(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

export const DEFAULT_FORMULA_JSON = `{
  "inputs": [],
  "formula": "",
  "output": {
    "label": "",
    "unit": ""
  }
}`;
