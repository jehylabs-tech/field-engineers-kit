import katex from "katex";

/** Server-safe KaTeX HTML for SEO formula / result strings. */
export function renderKatexHtml(
  latex: string,
  displayMode = false,
): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
      strict: "ignore",
      output: "html",
    });
  } catch {
    return `<span style="color: red; font-family: monospace;">${latex}</span>`;
  }
}

/** True when string looks like TeX (has backslash commands or ^/_ groups). */
export function looksLikeLatex(value: string): boolean {
  return /\\[a-zA-Z]+|[_^]\{|\\frac|\\sqrt|\\Delta|\\text\{/.test(value);
}
