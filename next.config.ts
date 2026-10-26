import type { NextConfig } from "next";
import path from "node:path";

// A tester's PostHog data goes through this app (components/research/trackers.ts), so an ad
// blocker that blocks PostHog's own address doesn't lose it. The region's host comes from
// NEXT_PUBLIC_POSTHOG_HOST (US by default); its scripts live on the matching assets host.
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const posthogAssets = posthogHost.replace("://us.i.", "://us-assets.i.").replace("://eu.i.", "://eu-assets.i.");

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Move the Next.js dev/build status indicator out of the bottom-left
  // corner so it doesn't overlap the dashboard sidebar's profile row.
  devIndicators: {
    position: "bottom-right",
  },
  async rewrites() {
    return [
      { source: "/ixp/static/:path*", destination: `${posthogAssets}/static/:path*` },
      { source: "/ixp/array/:path*", destination: `${posthogAssets}/array/:path*` },
      { source: "/ixp/:path*", destination: `${posthogHost}/:path*` },
    ];
  },
  // PostHog's endpoints end in a slash (`/e/`); the default redirect that strips it would break them.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
