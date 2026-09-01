export const BLOG_CATEGORIES = [
  "Piping Engineering",
  "ASME Standards",
  "Cryogenic",
  "Equipment",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export type BlogPostFrontmatter = {
  title: string;
  description: string;
  date: string;
  category: BlogCategory;
  tags: string[];
  relatedCalculatorUrl?: string;
  relatedCalculatorName?: string;
};

export type BlogPostMeta = BlogPostFrontmatter & {
  slug: string;
};

export type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

export type BlogPost = BlogPostMeta & {
  content: string;
  toc: TocItem[];
};
