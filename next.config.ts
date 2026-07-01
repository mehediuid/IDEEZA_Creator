import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Move the Next.js dev/build status indicator out of the bottom-left
  // corner so it doesn't overlap the dashboard sidebar's profile row.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
