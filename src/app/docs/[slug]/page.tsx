import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RelatedCalculatorCTA from "@/components/blog/RelatedCalculatorCTA";
import TableOfContents from "@/components/blog/TableOfContents";
import Link from "@/components/ui/AppLink";
import { compileBlogMdx, renderBlogMdx } from "@/lib/blog/compile-mdx";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog/posts";
import { docsPath } from "@/lib/docs/constants";
import { buildSiteMetadata } from "@/lib/metadata/site-metadata";
import { canonicalUrl } from "@/lib/site";

type DocsArticlePageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: DocsArticlePageProps): Promise<Metadata> {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return buildSiteMetadata({ title: "Article Not Found" });
  }

  const articlePath = docsPath(post.slug);
  const articleUrl = canonicalUrl(articlePath);

  return buildSiteMetadata({
    canonicalPath: articlePath,
    title: post.title,
    description: post.description,
    openGraph: {
      type: "article",
      url: articleUrl,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  });
}

export default async function DocsArticlePage({ params }: DocsArticlePageProps) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const articlePath = docsPath(post.slug);
  const articleUrl = canonicalUrl(articlePath);
  const calculatorUrl = post.relatedCalculatorUrl ?? "/calculators";
  const calculatorName =
    post.relatedCalculatorName ?? "FieldEngineersKit Calculator";

  const MdxContent = await compileBlogMdx(post.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    url: articleUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    author: {
      "@type": "Organization",
      name: "Field Engineer's Kit (FEK)",
    },
    publisher: {
      "@type": "Organization",
      name: "FEK",
      url: "https://www.fieldengineerskit.com",
    },
    keywords: post.tags.join(", "),
    articleSection: post.category,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-8">
          <Link
            href={docsPath()}
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to Engineering Docs
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="min-w-0">
            <header className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  {post.category}
                </span>
                <time
                  dateTime={post.date}
                  className="text-sm text-slate-500 dark:text-slate-400"
                >
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
                {post.title}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                {post.description}
              </p>
              {post.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </header>

            <div className="blog-mdx-content">
              {renderBlogMdx(MdxContent)}
            </div>

            {post.relatedCalculatorUrl ? (
              <RelatedCalculatorCTA
                calculatorUrl={calculatorUrl}
                calculatorName={calculatorName}
                variant="embedded"
              />
            ) : null}
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {post.relatedCalculatorUrl ? (
                <RelatedCalculatorCTA
                  calculatorUrl={calculatorUrl}
                  calculatorName={calculatorName}
                  variant="sidebar"
                />
              ) : null}
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <TableOfContents items={post.toc} />
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-10 lg:hidden">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <TableOfContents items={post.toc} />
          </div>
        </div>
      </div>
    </>
  );
}
