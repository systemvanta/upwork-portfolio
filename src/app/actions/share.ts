"use server";

import { upsertShareLink } from "@/lib/share";
import { getSession } from "@/lib/session";

export async function createShareLink(skills: string[], limit: number) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Sign in first.");
  }
  return upsertShareLink(skills, limit);
}