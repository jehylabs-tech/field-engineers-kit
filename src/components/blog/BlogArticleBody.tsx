import { compileBlogMdx } from "@/lib/blog/compile-mdx";
import { blogMdxComponents } from "@/lib/blog/mdx";

export default async function BlogArticleBody({ source }: { source: string }) {
  const Content = await compileBlogMdx(source);

  return (
    <div className="blog-mdx-content">
      <Content components={blogMdxComponents} />
    </div>
  );
}
