import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Increased from default 1MB to allow larger target photos in Range Sessions
      bodySizeLimit: '10mb',
    },
  },
};

export default withNextIntl(nextConfig);
