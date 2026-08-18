import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = toNextJsHandler(auth);

function withForwardedUrl(request: Request) {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (!host) return request;
  const current = new URL(request.url);
  const next = new URL(`${proto}://${host}${current.pathname}${current.search}`);
  return new Request(next, request);
}

export const GET = (request: Request) => handlers.GET(withForwardedUrl(request));
export const POST = (request: Request) => handlers.POST(withForwardedUrl(request));
