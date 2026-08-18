import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const synthetic = new Request("https://nicholasworks.dev/api/auth/ok", {
    method: "GET",
    headers: request.headers,
  });
  const response = await auth.handler(synthetic);
  const body = await response.text();
  const ctx = await auth.$context;
  return Response.json({
    incomingUrl: request.url,
    nextUrl: request.nextUrl.href,
    betterAuthBaseURL: ctx.baseURL,
    betterAuthBasePath: ctx.options.basePath,
    envAuthUrl: process.env.BETTER_AUTH_URL ?? null,
    vercelUrl: process.env.VERCEL_URL ?? null,
    syntheticStatus: response.status,
    syntheticBody: body.slice(0, 200),
  });
}
