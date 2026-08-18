import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeSkills } from "../src/data/skill-aliases";
import { saveBufferUpload } from "../src/lib/media-store";
import { categorizePortfolio } from "./categorize-portfolio";
import {
  downloadDemoImage,
  loadCreateTodayGallery,
} from "./createtoday-demos";

const GALLERY = "https://createtoday.io/examples?category=portfolio";

function slugFromUrl(liveUrl: string) {
  try {
    const url = new URL(liveUrl);
    const host = url.hostname.replace(/^www\./, "").replace(/\./g, "-");
    const path = url.pathname.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
    return [host, path].filter(Boolean).join("-").toLowerCase() || "portfolio";
  } catch {
    return "portfolio";
  }
}

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

async function ensureDemo(
  prisma: PrismaClient,
  projectId: string,
  imageUrl: string,
  caption: string,
) {
  const count = await prisma.projectMedia.count({ where: { projectId } });
  if (count > 0) return true;
  const demo = await downloadDemoImage(imageUrl);
  if (!demo) return false;
  const saved = await saveBufferUpload(projectId, demo.buffer, demo.ext, demo.kind);
  await prisma.projectMedia.create({
    data: {
      projectId,
      kind: saved.kind,
      src: saved.src,
      caption,
      sortOrder: 0,
    },
  });
  return true;
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("ADMIN_EMAIL is required");

  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    const owner = await prisma.user.findUnique({ where: { email } });
    if (!owner) {
      throw new Error(`No user for ${email}. Run prisma db seed first.`);
    }

    const examples = await loadCreateTodayGallery(GALLERY);
    const counts = new Map<string, number>();
    let created = 0;
    let updated = 0;
    let demos = 0;

    for (const example of examples) {
      const kind = categorizePortfolio(
        `${example.title} ${example.description}`,
      );
      counts.set(kind.label, (counts.get(kind.label) ?? 0) + 1);

      const extraSkills = example.liveUrl.includes("lovable.app")
        ? ["lovable"]
        : [];
      const skills = normalizeSkills([...kind.skills, ...extraSkills]);
      const slug = slugFromUrl(example.liveUrl);
      const payload = {
        title: example.title,
        tagline: clip(example.description, 180),
        category: kind.category,
        status: "published" as const,
        liveUrl: example.liveUrl,
        outcome: "",
        problem:
          "A creative needed a personal site that shows the work first instead of competing with it.",
        constraints:
          "Portfolio layout, hero photography or mockups, and a short positioning line.",
        decision: example.description,
        tradeoff:
          "The page stays quiet so the work, not the chrome, carries attention.",
        method: "",
        writeup: example.description,
      };

      process.stdout.write(`${example.title} → ${kind.label}… `);

      const existing = await prisma.project.findUnique({ where: { slug } });
      const project = existing
        ? await prisma.project.update({
            where: { id: existing.id },
            data: {
              ...payload,
              skills: {
                deleteMany: {},
                create: skills.map((skill) => ({ skill })),
              },
            },
          })
        : await prisma.project.create({
            data: {
              slug,
              ownerId: owner.id,
              ...payload,
              skills: { create: skills.map((skill) => ({ skill })) },
            },
          });

      if (existing) updated += 1;
      else created += 1;

      const attached = await ensureDemo(
        prisma,
        project.id,
        example.imageUrl,
        "",
      );
      if (attached) demos += 1;
      console.log(attached ? "ok" : "saved without screenshot");
    }

    console.log(
      `Portfolio examples: ${created} created, ${updated} updated, ${demos} demos, ${examples.length} on the gallery page.`,
    );
    console.log("Categories:");
    for (const [label, count] of [...counts.entries()].sort()) {
      console.log(`  ${label}: ${count}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
