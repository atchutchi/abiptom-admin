import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    staleTimes: {
      dynamic: 120,
      static: 300,
    },
  },
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
