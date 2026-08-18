import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { removeStoredUpload, saveBufferUpload } from "../src/lib/media-store";
import {
  downloadDemoImage,
  loadCreateTodayShopifyDemos,
  normalizeKey,
} from "./createtoday-demos";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    const demos = await loadCreateTodayShopifyDemos();
    const projects = await prisma.project.findMany({ include: { media: true } });
    const byUrl = new Map(
      projects.map((project) => [normalizeKey(project.liveUrl ?? ""), project]),
    );
    const byTitle = new Map(
      projects.map((project) => [normalizeKey(project.title), project]),
    );

    let attached = 0;
    let missing = 0;
    let failed = 0;

    for (const demo of demos) {
      const project =
        byUrl.get(normalizeKey(demo.liveUrl)) ??
        byTitle.get(normalizeKey(demo.title));
      if (!project) {
        console.warn(`No hub project for ${demo.title}`);
        missing += 1;
        continue;
      }

      process.stdout.write(`${project.title}… `);
      const image = await downloadDemoImage(demo.imageUrl);
      if (!image) {
        console.log("download failed");
        failed += 1;
        continue;
      }

      for (const item of project.media) {
        await removeStoredUpload(item.src);
      }
      await prisma.projectMedia.deleteMany({ where: { projectId: project.id } });

      const saved = await saveBufferUpload(
        project.id,
        image.buffer,
        image.ext,
        image.kind,
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
      console.log("ok");
      attached += 1;
    }

    console.log(
      `Create Today demos: ${attached} attached, ${missing} unmatched, ${failed} failed, ${demos.length} on the gallery page.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
