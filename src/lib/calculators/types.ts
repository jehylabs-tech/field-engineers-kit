export type Calculator = {
  id: string;
  category: string;
  title: string;
  slug: string;
  meta_description: string | null;
  formula_json: Record<string, unknown>;
  is_published: boolean;
  created_at: string;
};

export type CalculatorFormInput = {
  category: string;
  title: string;
  slug: string;
  meta_description: string;
  formula_json: string;
  is_published: boolean;
};

export type ActionResult = {
  error?: string;
  success?: boolean;
};
