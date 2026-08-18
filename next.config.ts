import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "48mb",
    },
  },
};

export default nextConfig;
