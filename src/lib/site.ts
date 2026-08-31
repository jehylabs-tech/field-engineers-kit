export const PRODUCTION_SITE_URL = "https://www.fieldengineerskit.com";

function isLocalhostUrl(url: string) {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function vercelHost(): string | undefined {
  const raw =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "";
  const host = raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return host || undefined;
}

function isDeployed() {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

/**
 * Public origin for canonical, sitemap, robots, and Open Graph.
 * Defaults to https://www.fieldengineerskit.com.
 * Local development falls back to localhost if not explicitly set.
 */
export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

  if (explicit && !isLocalhostUrl(explicit)) {
    return explicit;
  }

  if (isDeployed()) {
    return PRODUCTION_SITE_URL;
  }

  if (explicit) {
    return explicit;
  }

  return "http://localhost:3000";
}

export function canonicalUrl(path = "/"): string {
  const origin = getSiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") {
    return origin;
  }
  return `${origin}${normalized.replace(/\/$/, "")}`;
}
