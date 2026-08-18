import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = toNextJsHandler(auth);

type RouteContext = { params: Promise<{ all?: string[] }> };

async function toAuthRequest(request: Request, context: RouteContext) {
  const { all = [] } = await context.params;
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    "nicholasworks.dev";
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const suffix = all.length > 0 ? `/${all.join("/")}` : "";
  const search = new URL(request.url).search;
  const url = new URL(`${proto}://${host}/api/auth${suffix}${search}`);
  return new Request(url, request);
}

export async function GET(request: Request, context: RouteContext) {
  return handlers.GET(await toAuthRequest(request, context));
}

export async function POST(request: Request, context: RouteContext) {
  return handlers.POST(await toAuthRequest(request, context));
}
