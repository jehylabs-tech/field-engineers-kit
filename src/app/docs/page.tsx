import type { Metadata } from "next";
import { Suspense } from "react";
import BlogIndexClient from "@/components/blog/BlogIndexClient";
import { getAllPosts } from "@/lib/blog/posts";
import {
  DOCS_INDEX_DESCRIPTION,
  DOCS_INDEX_TITLE,
} from "@/lib/docs/constants";
import { buildSiteMetadata } from "@/lib/metadata/site-metadata";

export const metadata: Metadata = buildSiteMetadata({
  canonicalPath: "/docs",
  title: DOCS_INDEX_TITLE,
  description: DOCS_INDEX_DESCRIPTION,
});

export default function DocsIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
      <header className="mb-10 border-b border-slate-200 pb-6 dark:border-slate-800">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
          Engineering Docs
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300 md:text-lg">
          Code-verified technical guides connecting ASME, API, and ISO standards
          to live FieldEngineersKit calculators for piping, mechanical, and
          procurement workflows.
        </p>
      </header>

      <Suspense fallback={<div>Loading articles...</div>}>
        <BlogIndexClient posts={posts} />
      </Suspense>
    </div>
  );
}
