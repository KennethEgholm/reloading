import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Increased from default 1MB to allow larger target photos in Range Sessions
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
