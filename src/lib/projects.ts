import { prisma } from "@/lib/prisma";

export const projectInclude = {
  skills: { orderBy: { skill: "asc" as const } },
  media: { orderBy: { sortOrder: "asc" as const } },
};

export type ProjectWithSkills = Awaited<
  ReturnType<typeof getPublishedProjects>
>[number];

export async function getPublishedProjects() {
  return prisma.project.findMany({
    where: { status: "published" },
    include: projectInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectBySlug(slug: string) {
  return prisma.project.findUnique({
    where: { slug },
    include: projectInclude,
  });
}

export function filterByCategory<T extends { category: string }>(
  projects: T[],
  category?: string,
) {
  if (!category) return projects;
  return projects.filter((project) => project.category === category);
}
