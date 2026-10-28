import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl request config (server-side message loading + locale negotiation).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Core behaviour defaults; hardening flags land in Phase 11 (docs/PROJECT_PLAN.md).
  images: {
    // Product imagery comes from object storage once CFG-05 is resolved.
    remotePatterns: [],
  },
};

export default withNextIntl(nextConfig);
