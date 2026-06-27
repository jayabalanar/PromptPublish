import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

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

export default withPayload(nextConfig);
