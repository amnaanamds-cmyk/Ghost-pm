import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Screenshots are sent to server actions as base64 (downscaled client-side first).
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
