/** Public URL segment for engineering articles (canonical; /blog redirects here). */
export const DOCS_BASE_PATH = "/docs";

/** Short GNB label — matches Advertise tone and E-E-A-T positioning. */
export const DOCS_NAV_LABEL = "Docs";

export const DOCS_INDEX_TITLE = "Engineering Docs & Technical Guides";
export const DOCS_INDEX_DESCRIPTION =
  "ASME B31.3 piping guides, code-aligned reference articles, and field engineering knowledge for plant maintenance and procurement teams.";

export const DOCS_HOME_FILTER_LABEL = "Engineering Guides";

export function docsPath(slug?: string): string {
  if (!slug) {
    return DOCS_BASE_PATH;
  }
  return `${DOCS_BASE_PATH}/${slug}`;
}

export function isDocsPath(pathname: string): boolean {
  return (
    pathname === DOCS_BASE_PATH ||
    pathname.startsWith(`${DOCS_BASE_PATH}/`)
  );
}
