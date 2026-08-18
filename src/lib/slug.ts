import { prisma } from "@/lib/prisma";

export function slugify(title: string) {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "project";
}

export async function uniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title);
  let slug = base;
  let n = 2;

  while (true) {
    const existing = await prisma.project.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}
