import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = toNextJsHandler(auth);

async function toAuthRequest(request: NextRequest, context: RouteContext<"/api/auth/[...all]">) {
  const params = await context.params;
  const segments = Array.isArray(params.all)
    ? params.all
    : params.all
      ? [params.all]
      : [];
  const fromNext = request.nextUrl?.pathname ?? "";
  const fromUrl = new URL(request.url).pathname;
  const fromParams = segments.length > 0 ? `/api/auth/${segments.join("/")}` : "";
  const pathname = [fromNext, fromUrl, fromParams]
    .map((value) => value.replace(/\/+$/, ""))
    .find((value) => value.startsWith("/api/auth/") && !value.includes("[...")) ?? "/api/auth";
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    request.nextUrl?.host ||
    "nicholasworks.dev";
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl?.protocol.replace(":", "") ||
    "https";
  const search = request.nextUrl?.search ?? new URL(request.url).search;
  const url = `${proto}://${host}${pathname}${search}`;
  const init: RequestInit = {
    method: request.method,
    headers: request.headers,
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    (init as RequestInit & { duplex: "half" }).duplex = "half";
  }
  const forwarded = new Request(url, init);
  return { forwarded, debug: { fromNext, fromUrl, fromParams, pathname, url } };
}

async function handle(
  request: NextRequest,
  context: RouteContext<"/api/auth/[...all]">,
  method: "GET" | "POST",
) {
  const { forwarded, debug } = await toAuthRequest(request, context);
  const response = await handlers[method](forwarded);
  const headers = new Headers(response.headers);
  headers.set("x-auth-from-next", debug.fromNext);
  headers.set("x-auth-from-url", debug.fromUrl);
  headers.set("x-auth-from-params", debug.fromParams);
  headers.set("x-auth-path", debug.pathname);
  headers.set("x-auth-out", debug.url);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/auth/[...all]">,
) {
  return handle(request, context, "GET");
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/auth/[...all]">,
) {
  return handle(request, context, "POST");
}
