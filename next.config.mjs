/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 20,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async redirects() {
    return [
      {
        source: "/blog",
        destination: "/docs",
        permanent: true,
      },
      {
        source: "/blog/:slug",
        destination: "/docs/:slug",
        permanent: true,
      },
      {
        source: "/calculators/pipe-schedule-dimensions",
        destination: "/calculator/pipe-schedule-dimension",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
