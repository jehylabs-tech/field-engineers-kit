import { cache } from "react";
import { compile, run } from "@mdx-js/mdx";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "server-only";
import { Fragment, type ComponentType } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { blogMdxComponents, type BlogMdxComponents } from "@/lib/blog/mdx";

type MdxModule = {
  default: ComponentType<{ components?: BlogMdxComponents }>;
};

export const compileBlogMdx = cache(async (source: string) => {
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
  })) as MdxModule;

  return Content;
});
