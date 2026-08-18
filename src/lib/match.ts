import { createHash } from "crypto";
import { generateObject } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeSkills } from "@/data/skill-aliases";
import {
  getProjectsBySlugs,
  getPublishedCatalog,
  type CatalogProject,
  type ProjectCardData,
} from "@/lib/projects";

const relatedSkills: Record<string, string[]> = {
  ai: ["ai", "ai-automation", "ai-agents", "openai", "langchain", "voiceflow"],
  "ai-automation": ["ai", "ai-automation", "ai-agents", "openai"],
  "ai-agents": ["ai", "ai-agents", "openai", "langchain", "voiceflow"],
  openai: ["openai", "ai", "ai-agents"],
  langchain: ["langchain", "ai-agents"],
  voiceflow: ["voiceflow", "ai-agents"],
  react: ["react", "nextjs", "react-native"],
  nextjs: ["nextjs", "react"],
  java: ["java", "spring"],
  spring: ["spring", "java"],
};

function catalogHash(projects: CatalogProject[]) {
  const raw = projects
    .map((project) => `${project.id}:${project.updatedAt.toISOString()}`)
    .sort()
    .join("|");
  return createHash("sha256").update(raw).digest("hex");
}

function skillKey(skills: string[]) {
  return normalizeSkills(skills).join(",");
}

function projectSkillSet(project: CatalogProject) {
  return new Set(
    normalizeSkills([
      project.category,
      ...project.skills.map((row) => row.skill),
    ]),
  );
}

function expandRequested(requested: string[]) {
  return new Set(
    normalizeSkills(requested).flatMap(
      (skill) => relatedSkills[skill] ?? [skill],
    ),
  );
}

function orMatch(projects: CatalogProject[], requested: string[]) {
  const needed = expandRequested(requested);
  if (needed.size === 0) return [];
  return projects.filter((project) => {
    const have = projectSkillSet(project);
    return [...needed].some((skill) => have.has(skill));
  });
}

function compactCatalog(projects: CatalogProject[]) {
  return projects.map((project) => ({
    slug: project.slug,
    title: project.title,
    category: project.category,
    skills: project.skills.map((row) => row.skill),
  }));
}

async function groqPick(
  candidates: CatalogProject[],
  requested: string[],
  limit: number,
) {
  if (!process.env.GROQ_API_KEY || candidates.length === 0) return [];

  const sample = candidates.slice(0, 120);
  const result = await generateObject({
    model: groq("llama-3.1-8b-instant"),
    schema: z.object({
      slugs: z.array(z.string()),
    }),
    prompt: `Pick the strongest project portfolios for these skills: ${requested.join(", ")}.

Include a project if it fits ANY of the skills. Do not require every skill on one project.
Return at most ${limit} slugs, strongest first. Only use slugs from this catalog.

Catalog (JSON):
${JSON.stringify(compactCatalog(sample))}`,
  });

  const allowed = new Set(sample.map((project) => project.slug));
  return result.object.slugs.filter((slug) => allowed.has(slug)).slice(0, limit);
}

export async function matchProjects(rawSkills: string[], limit?: number) {
  const requested = normalizeSkills(rawSkills);
  if (requested.length === 0) return { projects: [] as ProjectCardData[], source: "empty" as const };

  const catalog = await getPublishedCatalog();
  const cap = limit && limit > 0 ? limit : undefined;
  const key = `${skillKey(requested)}|${cap ?? "all"}`;
  const hash = catalogHash(catalog);
  const cached = await prisma.matchCache.findUnique({ where: { skillKey: key } });
  if (cached && cached.catalogHash === hash) {
    const slugs = JSON.parse(cached.slugsJson) as string[];
    const projects = await getProjectsBySlugs(cap ? slugs.slice(0, cap) : slugs);
    if (projects.length > 0) {
      return { projects, source: "cache" as const };
    }
  }

  const matched = orMatch(catalog, requested);
  let slugs = matched.map((project) => project.slug);
  let source: "groq" | "or" = "or";

  if (cap) {
    try {
      const picked = await groqPick(matched, requested, cap);
      if (picked.length > 0) {
        slugs = picked;
        source = "groq";
      } else {
        slugs = slugs.slice(0, cap);
      }
    } catch {
      slugs = slugs.slice(0, cap);
    }
  }

  await prisma.matchCache.upsert({
    where: { skillKey: key },
    create: {
      skillKey: key,
      catalogHash: hash,
      slugsJson: JSON.stringify(slugs),
    },
    update: {
      catalogHash: hash,
      slugsJson: JSON.stringify(slugs),
      createdAt: new Date(),
    },
  });

  return { projects: await getProjectsBySlugs(slugs), source };
}

export function parseSkillQuery(value?: string | string[]) {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
