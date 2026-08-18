import { createHash } from "crypto";
import { generateObject } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeSkills } from "@/data/skill-aliases";
import { getPublishedProjects, type ProjectWithSkills } from "@/lib/projects";

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

function catalogHash(projects: ProjectWithSkills[]) {
  const raw = projects
    .map((project) => `${project.id}:${project.updatedAt.toISOString()}`)
    .sort()
    .join("|");
  return createHash("sha256").update(raw).digest("hex");
}

function skillKey(skills: string[]) {
  return normalizeSkills(skills).join(",");
}

function projectSkillSet(project: ProjectWithSkills) {
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

function orMatch(projects: ProjectWithSkills[], requested: string[]) {
  const needed = expandRequested(requested);
  if (needed.size === 0) return [];
  return projects.filter((project) => {
    const have = projectSkillSet(project);
    return [...needed].some((skill) => have.has(skill));
  });
}

export async function matchProjectsBySkills(rawSkills: string[]) {
  const requested = normalizeSkills(rawSkills);
  if (requested.length === 0) return [];
  return orMatch(await getPublishedProjects(), requested);
}

function compactCatalog(projects: ProjectWithSkills[]) {
  return projects.map((project) => ({
    slug: project.slug,
    title: project.title,
    category: project.category,
    skills: project.skills.map((row) => row.skill),
  }));
}

async function groqPick(
  candidates: ProjectWithSkills[],
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
  const slugs = result.object.slugs.filter((slug) => allowed.has(slug));
  const picked = slugs
    .map((slug) => sample.find((project) => project.slug === slug))
    .filter((project): project is ProjectWithSkills => Boolean(project));
  return picked.slice(0, limit);
}

export async function matchProjects(rawSkills: string[], limit?: number) {
  const requested = normalizeSkills(rawSkills);
  const published = await getPublishedProjects();
  if (requested.length === 0) return { projects: [], source: "empty" as const };

  const cap = limit && limit > 0 ? limit : undefined;
  const key = `${skillKey(requested)}|${cap ?? "all"}`;
  const hash = catalogHash(published);
  const cached = await prisma.matchCache.findUnique({ where: { skillKey: key } });
  if (cached && cached.catalogHash === hash) {
    const slugs = JSON.parse(cached.slugsJson) as string[];
    const bySlug = new Map(published.map((project) => [project.slug, project]));
    const projects = slugs
      .map((slug) => bySlug.get(slug))
      .filter((project): project is ProjectWithSkills => Boolean(project));
    if (projects.length > 0) {
      return {
        projects: cap ? projects.slice(0, cap) : projects,
        source: "cache" as const,
      };
    }
  }

  const matched = orMatch(published, requested);
  let projects = matched;
  let source: "groq" | "or" = "or";

  if (cap) {
    try {
      const picked = await groqPick(matched, requested, cap);
      if (picked.length > 0) {
        projects = picked;
        source = "groq";
      } else {
        projects = matched.slice(0, cap);
      }
    } catch {
      projects = matched.slice(0, cap);
    }
  }

  await prisma.matchCache.upsert({
    where: { skillKey: key },
    create: {
      skillKey: key,
      catalogHash: hash,
      slugsJson: JSON.stringify(projects.map((project) => project.slug)),
    },
    update: {
      catalogHash: hash,
      slugsJson: JSON.stringify(projects.map((project) => project.slug)),
      createdAt: new Date(),
    },
  });

  return { projects, source };
}

export function parseSkillQuery(value?: string | string[]) {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
