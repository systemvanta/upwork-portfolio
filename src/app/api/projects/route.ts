import { NextResponse } from "next/server";
import { isCategorySlug } from "@/data/categories";
import { listPublishedProjects, PAGE_SIZE } from "@/lib/projects";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawCategory = searchParams.get("category") ?? "";
  const category = isCategorySlug(rawCategory) ? rawCategory : undefined;
  const cursor = searchParams.get("cursor") ?? undefined;
  const takeRaw = Number(searchParams.get("take") ?? PAGE_SIZE);
  const take = Number.isFinite(takeRaw)
    ? Math.min(48, Math.max(1, takeRaw))
    : PAGE_SIZE;

  const { projects, nextCursor } = await listPublishedProjects({
    category,
    cursor,
    take,
  });

  return NextResponse.json({ projects, nextCursor });
}
