import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.vercel.app" },
    ],
  },
  turbopack: {
    resolveAlias: {
      "@payload-config": "./src/payload/payload.config.ts",
    },
  },
};

export default nextConfig;
