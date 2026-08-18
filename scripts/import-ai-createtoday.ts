import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeSkills } from "../src/data/skill-aliases";
import { saveBufferUpload } from "../src/lib/media-store";
import {
  downloadDemoImage,
  loadCreateTodayGalleryPages,
} from "./createtoday-demos";

const GALLERY = "https://createtoday.io/examples?category=ai";

type AiKind = {
  category: string;
  skills: string[];
  label: string;
};

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function slugFromUrl(liveUrl: string, title: string) {
  try {
    const url = new URL(liveUrl);
    const host = url.hostname.replace(/^www\./, "").replace(/\./g, "-");
    return host.toLowerCase() || slugify(title);
  } catch {
    return slugify(title);
  }
}

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "ai-project"
  );
}

function categorizeAi(text: string): AiKind {
  const hay = text.toLowerCase();
  if (/\bvoiceflow\b/.test(hay)) {
    return {
      category: "voiceflow",
      label: "Voiceflow",
      skills: ["voiceflow", "ai-agents", "chatbot"],
    };
  }
  if (/\blangchain\b|\blanggraph\b|\blangsmith\b/.test(hay)) {
    return {
      category: "langchain",
      label: "LangChain",
      skills: ["langchain", "ai-agents", "ai-automation"],
    };
  }
  if (
    /\bai agents?\b|\bmulti-agent\b|\bautonomous agent\b|\bagentic\b|\bcopilot agent\b/.test(
      hay,
    )
  ) {
    return {
      category: "ai-agents",
      label: "AI Agents",
      skills: ["ai-agents", "ai-automation"],
    };
  }
  if (/\bopenai\b|\bchatgpt\b|\bgpt-?4\b|\bgpt-?3/.test(hay)) {
    return {
      category: "openai",
      label: "OpenAI",
      skills: ["openai", "ai-automation"],
    };
  }
  return {
    category: "ai-automation",
    label: "AI Automation",
    skills: ["ai-automation", "ai"],
  };
}

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    const email = process.env.ADMIN_EMAIL;
    const owner =
      (email
        ? await prisma.user.findUnique({ where: { email } })
        : null) ?? (await prisma.user.findFirst());
    if (!owner) {
      throw new Error("No user in the database. Run prisma db seed first.");
    }

    const examples = await loadCreateTodayGalleryPages(GALLERY);
    if (examples.length === 0) {
      throw new Error("Create Today AI gallery had no examples.");
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const counts = new Map<string, number>();

    for (const example of examples) {
      const kind = categorizeAi(`${example.title} ${example.description}`);
      counts.set(kind.label, (counts.get(kind.label) ?? 0) + 1);
      const extra = example.liveUrl.includes("lovable.app") ? ["lovable"] : [];
      const skills = normalizeSkills([...kind.skills, ...extra]);
      const slug = slugFromUrl(example.liveUrl, example.title);

      process.stdout.write(`${example.title} → ${kind.label}… `);

      const existing =
        (await prisma.project.findFirst({
          where: { liveUrl: example.liveUrl },
        })) ??
        (await prisma.project.findUnique({ where: { slug } })) ??
        (await prisma.project.findFirst({ where: { title: example.title } }));

      if (existing) {
        const mediaCount = await prisma.projectMedia.count({
          where: { projectId: existing.id },
        });
        if (mediaCount === 0) {
          const demo = await downloadDemoImage(example.imageUrl);
          if (!demo) {
            console.log("already listed, screenshot failed, skipped");
            skipped += 1;
            continue;
          }
          const saved = await saveBufferUpload(
            existing.id,
            demo.buffer,
            demo.ext,
            demo.kind,
          );
          await prisma.projectMedia.create({
            data: {
              projectId: existing.id,
              kind: saved.kind,
              src: saved.src,
              caption: "",
              sortOrder: 0,
            },
          });
        }
        console.log("already listed, skipped");
        skipped += 1;
        continue;
      }

      const demo = await downloadDemoImage(example.imageUrl);
      if (!demo) {
        console.log("screenshot failed, skipped");
        skipped += 1;
        continue;
      }

      const payload = {
        title: example.title,
        tagline: clip(example.description, 180),
        category: kind.category,
        status: "published" as const,
        liveUrl: example.liveUrl,
        outcome: "",
        problem:
          "The team needed a public site that could explain an AI product people cannot see on a shelf.",
        constraints:
          "Headline-first layout, product mockup or demo, and a short proof point.",
        decision: example.description,
        tradeoff:
          "The page leads with the claim and a screenshot rather than lifestyle photography.",
        method: "",
        writeup: example.description,
      };

      const project = await prisma.project.create({
        data: {
          slug,
          ownerId: owner.id,
          ...payload,
          skills: { create: skills.map((skill) => ({ skill })) },
        },
      });

      const saved = await saveBufferUpload(
        project.id,
        demo.buffer,
        demo.ext,
        demo.kind,
      );
      await prisma.projectMedia.create({
        data: {
          projectId: project.id,
          kind: saved.kind,
          src: saved.src,
          caption: "",
          sortOrder: 0,
        },
      });

      created += 1;
      console.log("ok");
    }

    console.log(
      `AI projects: ${created} created, ${updated} updated, ${skipped} skipped, ${examples.length} in the Create Today AI gallery.`,
    );
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
