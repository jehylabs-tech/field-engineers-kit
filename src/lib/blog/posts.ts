import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { extractTableOfContents } from "@/lib/blog/toc";
import type {
  BlogCategory,
  BlogPost,
  BlogPostMeta,
} from "@/lib/blog/types";
import { BLOG_CATEGORIES } from "@/lib/blog/types";

const BLOG_CONTENT_DIR = path.join(process.cwd(), "content", "blog");

function isBlogCategory(value: string): value is BlogCategory {
  return (BLOG_CATEGORIES as readonly string[]).includes(value);
}

function parseFrontmatter(
  slug: string,
  data: Record<string, unknown>,
): BlogPostMeta {
  const title = String(data.title ?? slug);
  const description = String(data.description ?? "");
  const date = String(data.date ?? "");
  const categoryRaw = String(data.category ?? "Piping Engineering");
  const category = isBlogCategory(categoryRaw)
    ? categoryRaw
    : "Piping Engineering";
  const tags = Array.isArray(data.tags)
    ? data.tags.map((tag) => String(tag))
    : [];
  const relatedCalculatorUrl =
    data.relatedCalculatorUrl != null
      ? String(data.relatedCalculatorUrl)
      : undefined;
  const relatedCalculatorName =
    data.relatedCalculatorName != null
      ? String(data.relatedCalculatorName)
      : undefined;

  return {
    slug,
    title,
    description,
    date,
    category,
    tags,
    relatedCalculatorUrl,
    relatedCalculatorName,
  };
}

function readPostFile(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_CONTENT_DIR, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { content, data } = matter(raw);
  const meta = parseFrontmatter(slug, data);

  return {
    ...meta,
    content,
    toc: extractTableOfContents(content),
  };
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_CONTENT_DIR)) {
    return [];
  }

  return fs
    .readdirSync(BLOG_CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getAllPosts(): BlogPostMeta[] {
  return getAllPostSlugs()
    .map((slug) => readPostFile(slug))
    .filter((post): post is BlogPost => post !== null)
    .map(({ slug, title, description, date, category, tags, relatedCalculatorUrl, relatedCalculatorName }) => ({
      slug,
      title,
      description,
      date,
      category,
      tags,
      relatedCalculatorUrl,
      relatedCalculatorName,
    }))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function getPostBySlug(slug: string): BlogPost | null {
  return readPostFile(slug);
}
