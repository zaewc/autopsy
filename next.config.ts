import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Keep browser-test builds separate from a developer's running server.
  distDir: process.env.AUTOPSY_E2E === "1" ? ".next-e2e" : ".next",
};
export default nextConfig;
