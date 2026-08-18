import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

function originFromHost(host?: string | null) {
  if (!host) return "";
  const trimmed = host.replace(/\/$/, "");
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function trustedOrigins() {
  const extra = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((value) => originFromHost(value.trim()))
    .filter(Boolean);

  return [
    ...new Set(
      [
        originFromHost(process.env.BETTER_AUTH_URL),
        originFromHost(process.env.VERCEL_PROJECT_PRODUCTION_URL),
        originFromHost(process.env.VERCEL_URL),
        ...extra,
        "https://upwork-portfolio-three.vercel.app",
        "https://*.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:*",
        "http://127.0.0.1:*",
      ].filter(Boolean),
    ),
  ];
}

const baseURL =
  originFromHost(process.env.BETTER_AUTH_URL) ||
  originFromHost(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  originFromHost(process.env.VERCEL_URL) ||
  "http://localhost:3000";

export const auth = betterAuth({
  baseURL,
  trustedOrigins: trustedOrigins(),
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  plugins: [nextCookies()],
});
