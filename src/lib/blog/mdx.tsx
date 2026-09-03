import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import { slugifyHeading } from "@/lib/blog/slugify";
import Callout from "@/components/blog/mdx/Callout";

export type BlogMdxComponents = Record<string, ComponentType<Record<string, unknown>>>;

function getTextContent(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(getTextContent).join("");
  }

  if (children && typeof children === "object" && "props" in children) {
    const props = (children as { props?: { children?: ReactNode } }).props;
    return getTextContent(props?.children);
  }

  return "";
}

function createHeading(level: 2 | 3) {
  const Tag = level === 2 ? "h2" : "h3";
  const className =
    level === 2
      ? "scroll-mt-24 text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-10 mb-4 border-b border-slate-200 pb-2 dark:border-slate-700"
      : "scroll-mt-24 text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3";

  return function Heading({ children }: { children?: ReactNode }) {
    const text = getTextContent(children);
    const id = slugifyHeading(text);
    return (
      <Tag id={id} className={className}>
        {children}
      </Tag>
    );
  };
}

type CodeProps = HTMLAttributes<HTMLElement> & { children?: ReactNode };

export const blogMdxComponents: BlogMdxComponents = {
  h2: createHeading(2),
  h3: createHeading(3),
  h4: (props) => (
    <h4
      className="mt-4 mb-2 text-base font-semibold text-slate-900 dark:text-white"
      {...props}
    />
  ),
  p: (props) => (
    <p
      className="mb-4 text-base leading-relaxed text-slate-700 dark:text-slate-300"
      {...props}
    />
  ),
  ul: (props) => (
    <ul
      className="mb-4 list-disc space-y-2 pl-6 text-slate-700 dark:text-slate-300"
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className="mb-4 list-decimal space-y-2 pl-6 text-slate-700 dark:text-slate-300"
      {...props}
    />
  ),
  li: (props) => <li className="leading-relaxed" {...props} />,
  strong: (props) => (
    <strong className="font-semibold text-slate-900 dark:text-white" {...props} />
  ),
  a: (props) => (
    <a
      className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:decoration-blue-700"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className="my-6 border-l-4 border-blue-500 bg-blue-50/60 py-3 pl-4 text-slate-700 dark:border-blue-400 dark:bg-blue-950/30 dark:text-slate-300"
      {...props}
    />
  ),
  hr: () => <hr className="my-8 border-slate-200 dark:border-slate-700" />,
  table: (props) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table
        className="w-full min-w-[48rem] border-separate border-spacing-0 text-sm dark:divide-slate-700"
        {...props}
      />
    </div>
  ),
  thead: (props) => (
    <thead className="bg-slate-100 dark:bg-slate-800/80" {...props} />
  ),
  th: (props) => (
    <th
      className="px-5 py-3.5 text-left font-semibold tracking-wide text-slate-900 first:pl-6 last:pr-6 dark:text-white sm:px-6 sm:first:pl-7 sm:last:pr-7"
      {...props}
    />
  ),
  td: (props) => (
    <td
      className="border-t border-slate-200 px-5 py-3.5 align-top leading-relaxed text-slate-700 first:pl-6 last:pr-6 dark:border-slate-700 dark:text-slate-300 sm:px-6 sm:first:pl-7 sm:last:pr-7"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="my-6 overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-4 text-sm text-slate-100 dark:border-slate-700"
      {...props}
    />
  ),
  code: (props: CodeProps) => {
    const className = props.className ?? "";
    const isBlock = className.includes("language-");
    if (isBlock) {
      return <code {...props} />;
    }
    return (
      <code
        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200"
        {...props}
      />
    );
  },
  Callout: Callout as ComponentType<Record<string, unknown>>,
};
