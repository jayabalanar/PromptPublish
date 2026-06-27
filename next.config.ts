import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.vercel.app" },
    ],
  },
  turbopack: {
    root: "E:/projects/ByClarity/PromptsApp",
  },
};

export default nextConfig;
