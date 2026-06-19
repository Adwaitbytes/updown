import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Appends ?dpl=<id> to every static asset URL so a new deploy busts
  // client/CDN caches even when Turbopack reuses chunk filenames.
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || "v20260619-11-register",
  experimental: {
    optimizePackageImports: ["@mysten/sui", "@mysten/enoki"],
  },
  async headers() {
    return [
      {
        // Allow the marketing site's LiveStatus probe to read non-API
        // routes from the browser. Static onboard pages carry no user
        // data so wildcard CORS is safe.
        source: "/((?!api/).*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
