import { prisma } from "@/lib/prisma";

export const PAGE_SIZE = 24;

export const cardInclude = {
  skills: { orderBy: { skill: "asc" as const } },
  media: { orderBy: { sortOrder: "asc" as const }, take: 1 },
};

export const projectInclude = {
  skills: { orderBy: { skill: "asc" as const } },
  media: { orderBy: { sortOrder: "asc" as const } },
};

export type ProjectWithSkills = NonNullable<
  Awaited<ReturnType<typeof getProjectBySlug>>
>;

export type ProjectCardData = Awaited<
  ReturnType<typeof listPublishedProjects>
>["projects"][number];

export type CatalogProject = Awaited<
  ReturnType<typeof getPublishedCatalog>
>[number];

function publishedWhere(category?: string) {
  return {
    status: "published" as const,
    ...(category ? { category } : {}),
  };
}

export async function getPublishedCount() {
  return prisma.project.count({ where: { status: "published" } });
}

export async function getProjectBySlug(slug: string) {
  return prisma.project.findUnique({
    where: { slug },
    include: projectInclude,
  });
}

export async function listPublishedProjects(options?: {
  category?: string;
  cursor?: string;
  take?: number;
}) {
  const take = options?.take ?? PAGE_SIZE;
  const projects = await prisma.project.findMany({
    where: publishedWhere(options?.category),
    include: cardInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(options?.cursor
      ? { cursor: { id: options.cursor }, skip: 1 }
      : {}),
  });
  const hasMore = projects.length > take;
  const page = hasMore ? projects.slice(0, take) : projects;
  return {
    projects: page,
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
}

export async function getPublishedCatalog() {
  return prisma.project.findMany({
    where: { status: "published" },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      updatedAt: true,
      skills: { select: { skill: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectsBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  const projects = await prisma.project.findMany({
    where: { slug: { in: slugs }, status: "published" },
    include: cardInclude,
  });
  const bySlug = new Map(projects.map((project) => [project.slug, project]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((project): project is NonNullable<typeof project> => Boolean(project));
}

export async function getRelatedProjectTitles(slug: string, take = 8) {
  return prisma.project.findMany({
    where: { status: "published", slug: { not: slug } },
    select: { id: true, slug: true, title: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function filterByCategory<T extends { category: string }>(
  projects: T[],
  category?: string,
) {
  if (!category) return projects;
  return projects.filter((project) => project.category === category);
}
