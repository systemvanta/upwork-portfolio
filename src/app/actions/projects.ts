"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isCategorySlug } from "@/data/categories";
import { normalizeSkills } from "@/data/skill-aliases";
import {
  parseDemoFiles,
  parseDemoUrls,
  parseKeepMediaIds,
} from "@/lib/media";
import { removeStoredUpload, saveUploadFile } from "@/lib/media-store";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { uniqueSlug } from "@/lib/slug";

const projectSchema = z.object({
  title: z.string().trim().min(1),
  tagline: z.string().trim().min(1).max(180),
  category: z.string().refine(isCategorySlug, "Unknown category"),
  skills: z.string().trim().min(1),
  liveUrl: z.string().trim().optional(),
  outcome: z.string().trim().optional(),
  problem: z.string().trim().min(1),
  constraints: z.string().trim().min(1),
  decision: z.string().trim().min(1),
  tradeoff: z.string().trim().min(1),
  method: z.string().trim().optional(),
  writeup: z.string().trim().optional(),
});

function optionalUrl(value?: string) {
  if (!value) return null;
  return value;
}

function parseForm(formData: FormData) {
  return projectSchema.parse({
    title: formData.get("title"),
    tagline: formData.get("tagline"),
    category: formData.get("category"),
    skills: formData.get("skills"),
    liveUrl: String(formData.get("liveUrl") ?? ""),
    outcome: formData.get("outcome"),
    problem: formData.get("problem"),
    constraints: formData.get("constraints"),
    decision: formData.get("decision"),
    tradeoff: formData.get("tradeoff"),
    method: formData.get("method"),
    writeup: String(formData.get("writeup") ?? ""),
  });
}

async function syncProjectMedia(
  projectId: string,
  formData: FormData,
  existing: { id: string; src: string; sortOrder: number }[],
) {
  const keepOrder = parseKeepMediaIds(formData);
  const keepIds = new Set(keepOrder);
  const files = parseDemoFiles(formData);
  const urls = parseDemoUrls(formData);
  const kept = keepOrder
    .map((id) => existing.find((item) => item.id === id))
    .filter((item): item is { id: string; src: string; sortOrder: number } => Boolean(item));

  if (kept.length + files.length + urls.length < 1) {
    const liveUrl = String(formData.get("liveUrl") ?? "").trim();
    if (!liveUrl) {
      throw new Error("Add at least one demo picture or video.");
    }
  }

  const removed = existing.filter((item) => !keepIds.has(item.id));
  for (const item of removed) {
    await removeStoredUpload(item.src);
  }
  if (removed.length > 0) {
    await prisma.projectMedia.deleteMany({
      where: { id: { in: removed.map((item) => item.id) } },
    });
  }

  await Promise.all(
    kept.map((item, index) =>
      prisma.projectMedia.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  let sortOrder = kept.length - 1;
  const rows: { kind: string; src: string; sortOrder: number }[] = [];

  for (const file of files) {
    const saved = await saveUploadFile(projectId, file);
    sortOrder += 1;
    rows.push({ ...saved, sortOrder });
  }
  for (const url of urls) {
    sortOrder += 1;
    rows.push({ ...url, sortOrder });
  }

  if (rows.length > 0) {
    await prisma.projectMedia.createMany({
      data: rows.map((row) => ({ ...row, projectId })),
    });
  }
}

export async function createProject(formData: FormData) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const data = parseForm(formData);
  const skills = normalizeSkills(data.skills.split(","));
  if (skills.length === 0) {
    throw new Error("Add at least one skill");
  }

  const slug = await uniqueSlug(data.title);
  const project = await prisma.project.create({
    data: {
      slug,
      title: data.title,
      tagline: data.tagline,
      category: data.category,
      status: "published",
      liveUrl: optionalUrl(data.liveUrl),
      outcome: data.outcome ?? "",
      problem: data.problem,
      constraints: data.constraints,
      decision: data.decision,
      tradeoff: data.tradeoff,
      method: data.method ?? "",
      writeup: data.writeup ?? "",
      ownerId: session.user.id,
      skills: { create: skills.map((skill) => ({ skill })) },
    },
  });

  try {
    await syncProjectMedia(project.id, formData, []);
  } catch (error) {
    await prisma.project.delete({ where: { id: project.id } });
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/s");
  redirect(`/projects/${slug}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    include: { media: { orderBy: { sortOrder: "asc" } } },
  });
  if (!existing || existing.ownerId !== session.user.id) {
    throw new Error("Not allowed");
  }

  const data = parseForm(formData);
  const skills = normalizeSkills(data.skills.split(","));
  if (skills.length === 0) {
    throw new Error("Add at least one skill");
  }

  await syncProjectMedia(projectId, formData, existing.media);

  const slug = await uniqueSlug(data.title, existing.id);
  await prisma.project.update({
    where: { id: projectId },
    data: {
      slug,
      title: data.title,
      tagline: data.tagline,
      category: data.category,
      status: "published",
      liveUrl: optionalUrl(data.liveUrl),
      outcome: data.outcome ?? "",
      problem: data.problem,
      constraints: data.constraints,
      decision: data.decision,
      tradeoff: data.tradeoff,
      method: data.method ?? "",
      writeup: data.writeup ?? "",
      skills: {
        deleteMany: {},
        create: skills.map((skill) => ({ skill })),
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/s");
  revalidatePath(`/projects/${existing.slug}`);
  revalidatePath(`/projects/${slug}`);
  redirect(`/projects/${slug}`);
}

export async function deleteProject(projectId: string) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    include: { media: true },
  });
  if (!existing || existing.ownerId !== session.user.id) {
    throw new Error("Not allowed");
  }

  for (const item of existing.media) {
    await removeStoredUpload(item.src);
  }

  await prisma.project.delete({ where: { id: projectId } });

  revalidatePath("/");
  revalidatePath("/s");
  revalidatePath("/projects");
  revalidatePath(`/projects/${existing.slug}`);
  redirect("/projects");
}
