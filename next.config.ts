import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.65.1'],
  experimental: {
    serverActions: {
      // Increased from default 1MB to allow larger target photos in Range Sessions
      bodySizeLimit: '10mb',
    },
  },
};

export default withNextIntl(nextConfig);
