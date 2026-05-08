import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["@mysten/sui", "@mysten/enoki"],
  },
};

export default nextConfig;
