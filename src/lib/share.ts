import { createHash } from "crypto";
import { normalizeSkills } from "@/data/skill-aliases";
import { matchProjects } from "@/lib/match";
import { prisma } from "@/lib/prisma";

const MIN_LIMIT = 1;
const MAX_LIMIT = 48;

function parseSkills(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function clampShareLimit(value: number) {
  if (!Number.isFinite(value)) return 8;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.round(value)));
}

export function shareKeyFor(skills: string[], limit: number) {
  const key = `${normalizeSkills(skills).join(",")}|${limit}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 24);
}

export async function upsertShareLink(skills: string[], rawLimit: number) {
  const requested = normalizeSkills(skills);
  if (requested.length === 0) {
    throw new Error("Add a skill first.");
  }
  const limit = clampShareLimit(rawLimit);
  const id = shareKeyFor(requested, limit);
  await prisma.shareLink.upsert({
    where: { id },
    create: { id, skills: requested.join(","), limit },
    update: { skills: requested.join(","), limit },
  });
  return { id, path: `/v/${id}`, skills: requested, limit };
}

export async function getShareLink(id: string) {
  const link = await prisma.shareLink.findUnique({ where: { id } });
  if (!link) return null;
  return {
    id: link.id,
    skills: parseSkills(link.skills),
    limit: clampShareLimit(link.limit),
  };
}

export async function projectsForShare(share: {
  skills: string[];
  limit: number;
}) {
  const { projects } = await matchProjects(share.skills, share.limit);
  return projects;
}