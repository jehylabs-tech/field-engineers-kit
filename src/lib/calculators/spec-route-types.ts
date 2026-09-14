/** Shared Pattern B SpecRoute shape (kept free of the pSEO registry). */
export type SpecRoute = {
  slug: string;
  spec: string;
  query: Record<string, string>;
  label: string;
};
