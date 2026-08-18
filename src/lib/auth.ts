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

function hostnameAllowed(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".vercel.app") ||
    hostname === "nicholasworks.dev" ||
    hostname.endsWith(".nicholasworks.dev") ||
    hostname === "nicholasworkds.dev" ||
    hostname.endsWith(".nicholasworkds.dev")
  );
}

function staticTrustedOrigins() {
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
        "https://nicholasworks.dev",
        "https://www.nicholasworks.dev",
        "https://nicholasworkds.dev",
        "https://www.nicholasworkds.dev",
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

async function trustedOrigins(request?: Request) {
  const origins = staticTrustedOrigins();
  const header = request?.headers.get("origin") ?? request?.headers.get("referer");
  if (!header) return origins;
  try {
    const url = new URL(header);
    if (hostnameAllowed(url.hostname)) {
      origins.push(url.origin);
    }
  } catch {
    // Ignore malformed origin headers.
  }
  return [...new Set(origins)];
}

const baseURL =
  originFromHost(process.env.BETTER_AUTH_URL) ||
  originFromHost(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  originFromHost(process.env.VERCEL_URL) ||
  "http://localhost:3000";

export const auth = betterAuth({
  baseURL,
  basePath: "/api/auth",
  trustedOrigins,
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  advanced: {
    skipTrailingSlashes: true,
    trustedProxyHeaders: true,
  },
  plugins: [nextCookies()],
});
