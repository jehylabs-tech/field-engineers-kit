import { compile, run } from "@mdx-js/mdx";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Fragment, type ComponentType } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { blogMdxComponents } from "@/lib/blog/mdx";

type MdxModule = {
  default: ComponentType<{ components?: typeof blogMdxComponents }>;
};

export async function compileBlogMdx(source: string) {
  // Server MDX always uses production JSX runtime — avoids _jsxDEV mismatch in Turbopack/RSC.
  const compiled = String(
    await compile(source, {
      outputFormat: "function-body",
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
      development: false,
    }),
  );

  const { default: Content } = (await run(compiled, {
    Fragment,
    jsx,
    jsxs,
    development: false,
  })) as MdxModule;

  return Content;
}

export function renderBlogMdx(
  Content: ComponentType<{ components?: typeof blogMdxComponents }>,
) {
  return <Content components={blogMdxComponents} />;
}
