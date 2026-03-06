import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-cron", "better-sqlite3"],
};

export default nextConfig;
