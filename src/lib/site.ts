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
 * Local preview may use localhost. A Vercel deploy never falls back to localhost.
 */
export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

  if (isDeployed()) {
    if (explicit && !isLocalhostUrl(explicit)) {
      return explicit;
    }
    const host = vercelHost();
    if (host) {
      return `https://${host}`;
    }
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be a public https origin on Vercel. Localhost is not allowed in a deployed build.",
    );
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
