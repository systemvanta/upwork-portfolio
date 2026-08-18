import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { saveBufferUpload } from "../src/lib/media-store";
import { captureSiteDemo } from "./capture-site-demo";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    const category = process.argv.find((arg) => arg.startsWith("--category="))
      ?.slice("--category=".length);

    const projects = await prisma.project.findMany({
      where: category ? { category } : undefined,
      include: { media: true },
      orderBy: { createdAt: "asc" },
    });

    let added = 0;
    let skipped = 0;
    let failed = 0;

    for (const project of projects) {
      if (project.media.length > 0) {
        skipped += 1;
        continue;
      }
      if (!project.liveUrl) {
        console.warn(`No live URL for ${project.slug}, skipped.`);
        failed += 1;
        continue;
      }

      process.stdout.write(`Capturing ${project.title}… `);
      const demo = await captureSiteDemo(project.liveUrl);
      if (!demo) {
        console.log("failed");
        failed += 1;
        continue;
      }

      const saved = await saveBufferUpload(project.id, demo.buffer, demo.ext, demo.kind);
      await prisma.projectMedia.create({
        data: {
          projectId: project.id,
          kind: saved.kind,
          src: saved.src,
          caption: "Live site demo",
          sortOrder: 0,
        },
      });
      console.log("ok");
      added += 1;
    }

    console.log(
      `Demo media: ${added} added, ${skipped} already had demos, ${failed} failed.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
